import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const el = id => document.getElementById(id);
const gameEl = el("game");
const startScreen = el("startScreen");
const winScreen = el("winScreen");
const hud = el("hud");
const mobileUI = el("mobile");
const missionEl = el("mission");
const healthBar = el("healthBar");
const webBar = el("webBar");
const scoreEl = el("score");
const comboEl = el("combo");
const speedEl = el("speed");
const tipEl = el("tip");
const motionLines = el("motionLines");
const toastEl = el("toast");
const minimap = el("minimap");
const mapCtx = minimap.getContext("2d");

let scene, camera, renderer, clock, player, playerMesh, webLine;
let city = [], enemies = [], beacons = [], collectibles = [], projectiles = [];
let traffic = [], worldPulse = [];
let drone = null, boss = null;
let started = false, won = false;
let yaw = 0, pitch = -0.16;
let swingHeld = false, swingAnchor = null, ropeLength = 0, zipTarget = null;
let attackCooldown = 0, comboTimer = 0, lastTime = 0, missionIndex = 0, beaconCount = 0;
let score = 0, combo = 1, web = 100, health = 100, wallTouch = false;
let toastTimer = 0;
let audioCtx = null;
const keys = {};
const mobileAxes = {x:0,y:0};
const isTouch = matchMedia("(pointer:coarse)").matches || navigator.maxTouchPoints > 0;

const state = {
  groundY: 1.25,
  worldHalf: 205,
  gravity: 24,
  baseSpeed: 12,
  sprintSpeed: 20,
  jump: 10.5
};

function rand(a,b){ return a + Math.random() * (b-a); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function flatDist(a,b){ const dx=a.x-b.x,dz=a.z-b.z; return Math.hypot(dx,dz); }

function init(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x081a2d);
  scene.fog = new THREE.FogExp2(0x0a1726, 0.0049);

  camera = new THREE.PerspectiveCamera(68, innerWidth/innerHeight, 0.1, 720);
  renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:"high-performance"});
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  gameEl.appendChild(renderer.domElement);

  createAtmosphere();

  const hemi = new THREE.HemisphereLight(0xa8d7ff, 0x15131c, 1.42);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffcfab, 2.45);
  sun.position.set(-85,125,45);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048);
  sun.shadow.camera.left = -190;
  sun.shadow.camera.right = 190;
  sun.shadow.camera.top = 190;
  sun.shadow.camera.bottom = -190;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 360;
  scene.add(sun);

  const coolFill = new THREE.DirectionalLight(0x5f85ff, .68);
  coolFill.position.set(100,52,-95);
  scene.add(coolFill);

  const horizonFill = new THREE.PointLight(0xff805b, 16, 190, 2);
  horizonFill.position.set(-45,32,85);
  scene.add(horizonFill);

  createGround();
  createCity();
  createDistantSkyline();
  createStreetLife();
  createTraffic();
  createPlayer();
  createCollectibles();
  setupMission0();
  setupInput();
  clock = new THREE.Clock();
  window.addEventListener("resize", onResize);
  renderer.setAnimationLoop(loop);
}
function createGround(){
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(570,570),
    new THREE.MeshStandardMaterial({color:0x101720, roughness:0.96, metalness:0.015})
  );
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  scene.add(ground);

  const roadMat = new THREE.MeshStandardMaterial({color:0x070a10,roughness:.98});
  const curbMat = new THREE.MeshStandardMaterial({color:0x333b44,roughness:.92});
  const laneMat = new THREE.MeshBasicMaterial({color:0xc9aa69,transparent:true,opacity:.62});

  const roadPositions=[];
  for(let i=-6;i<=6;i++){
    const p=i*32+16;
    roadPositions.push(p);

    const roadA = new THREE.Mesh(new THREE.PlaneGeometry(10.5,500),roadMat);
    roadA.rotation.x=-Math.PI/2;
    roadA.position.set(p,.032,0);
    roadA.receiveShadow=true;
    scene.add(roadA);

    const roadB = new THREE.Mesh(new THREE.PlaneGeometry(500,10.5),roadMat);
    roadB.rotation.x=-Math.PI/2;
    roadB.position.set(0,.034,p);
    roadB.receiveShadow=true;
    scene.add(roadB);
  }

  const dashGeo=new THREE.BoxGeometry(.12,.014,3.3);
  const dashCount=roadPositions.length*56*2;
  const dashes=new THREE.InstancedMesh(dashGeo,laneMat,dashCount);
  const dummy=new THREE.Object3D();
  let di=0;
  for(const p of roadPositions){
    for(let q=-220;q<=220;q+=16){
      dummy.position.set(p,.052,q);
      dummy.rotation.set(0,0,0);
      dummy.updateMatrix();
      dashes.setMatrixAt(di++,dummy.matrix);

      dummy.position.set(q,.053,p);
      dummy.rotation.set(0,Math.PI/2,0);
      dummy.updateMatrix();
      dashes.setMatrixAt(di++,dummy.matrix);
    }
  }
  dashes.count=di;
  scene.add(dashes);

  const crossMat=new THREE.MeshBasicMaterial({color:0xe7e1d6,transparent:true,opacity:.52});
  const crossGeo=new THREE.BoxGeometry(3.8,.012,.28);
  const crosswalks=new THREE.InstancedMesh(crossGeo,crossMat,420);
  let ci=0;
  for(let ix=-4;ix<=4;ix+=2){
    for(let iz=-4;iz<=4;iz+=2){
      const x=ix*32+16, z=iz*32+16;
      for(let s=-2;s<=2;s++){
        dummy.position.set(x+s*.82,.057,z-4.2);
        dummy.rotation.set(0,0,0);
        dummy.updateMatrix();
        crosswalks.setMatrixAt(ci++,dummy.matrix);

        dummy.position.set(x-4.2,.058,z+s*.82);
        dummy.rotation.set(0,Math.PI/2,0);
        dummy.updateMatrix();
        crosswalks.setMatrixAt(ci++,dummy.matrix);
      }
    }
  }
  crosswalks.count=ci;
  scene.add(crosswalks);

  const plazaBase = new THREE.Mesh(
    new THREE.CylinderGeometry(15.9,16.2,.34,64),
    new THREE.MeshStandardMaterial({color:0x252e38,roughness:.78,metalness:.06})
  );
  plazaBase.position.y=.17;
  plazaBase.receiveShadow=true;
  scene.add(plazaBase);

  const plazaRing = new THREE.Mesh(
    new THREE.TorusGeometry(12.7,.12,8,72),
    new THREE.MeshStandardMaterial({color:0x5a6269,roughness:.72,metalness:.18})
  );
  plazaRing.rotation.x=Math.PI/2;
  plazaRing.position.y=.37;
  scene.add(plazaRing);

  const fountainBase=new THREE.Mesh(
    new THREE.CylinderGeometry(4.2,4.7,.75,48),
    new THREE.MeshStandardMaterial({color:0x3d4750,roughness:.55,metalness:.16})
  );
  fountainBase.position.y=.55;
  fountainBase.receiveShadow=true;
  scene.add(fountainBase);

  const waterMat=new THREE.MeshStandardMaterial({
    color:0x4ab7dc,
    emissive:0x0a2633,
    transparent:true,
    opacity:.72,
    roughness:.18,
    metalness:.08
  });
  const water=new THREE.Mesh(new THREE.CylinderGeometry(3.7,3.7,.08,48),waterMat);
  water.position.y=.98;
  scene.add(water);
  worldPulse.push({mesh:water,baseY:.98,type:"water"});

  const fountainCore=new THREE.Mesh(
    new THREE.CylinderGeometry(.34,.52,3.2,12),
    new THREE.MeshStandardMaterial({color:0x59636c,roughness:.48,metalness:.22})
  );
  fountainCore.position.y=2.1;
  fountainCore.castShadow=true;
  scene.add(fountainCore);

  const curbGeo=new THREE.BoxGeometry(22.8,.22,.45);
  const curbs=new THREE.InstancedMesh(curbGeo,curbMat,260);
  let cbi=0;
  for(let ix=-6;ix<=6;ix++){
    for(let iz=-6;iz<=6;iz++){
      if(ix===0&&iz===0)continue;
      if((ix+iz)%2!==0)continue;
      const x=ix*32,z=iz*32;
      dummy.position.set(x,.12,z-12.1);
      dummy.rotation.set(0,0,0);
      dummy.updateMatrix();
      curbs.setMatrixAt(cbi++,dummy.matrix);
      dummy.position.set(x-12.1,.12,z);
      dummy.rotation.set(0,Math.PI/2,0);
      dummy.updateMatrix();
      curbs.setMatrixAt(cbi++,dummy.matrix);
    }
  }
  curbs.count=cbi;
  scene.add(curbs);
}
function buildingMaterial(h,style=0){
  const palettes = [
    [0x1b2b3a,0x26374b,0x344051],
    [0x362f35,0x433840,0x4b4246],
    [0x182a34,0x203744,0x2c4651],
    [0x2c333d,0x343d48,0x414a54],
    [0x1b2535,0x223047,0x2b3a52]
  ];
  const palette=palettes[style%palettes.length];
  const c=palette[Math.floor(Math.random()*palette.length)];
  const glassy=style===2 || style===4;
  return new THREE.MeshStandardMaterial({
    color:c,
    roughness:glassy?rand(.28,.46):rand(.58,.82),
    metalness:glassy?rand(.28,.48):rand(.04,.16),
    emissive:new THREE.Color(glassy?0x03080d:0x020407)
  });
}
function addWindows(mesh,w,h,d,style=0){
  const count = Math.max(2,Math.floor(h/(style===1?5.2:6.2)));
  const warmChance=style===1?.62:style===2?.18:.36;
  const warm = Math.random()<warmChance;
  const color=warm?0xffd29b:(style===2?0x87d6ff:0x9bc7ff);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent:true,
    opacity:style===2?rand(.23,.46):rand(.16,.36),
    side:THREE.DoubleSide
  });

  for(let i=0;i<count;i++){
    if(Math.random()<.13) continue;
    const y=2.8+i*(h/(count+1));
    const widthScale=style===3?.72:style===2?.82:.60;

    const front = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(3,w*widthScale),style===1?.70:.88),mat);
    front.position.set(0,y,d/2+.014);
    mesh.add(front);

    const back = front.clone();
    back.position.z=-d/2-.014;
    mesh.add(back);

    if(i%2===0 || style===2 || h>62){
      const sideA = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(3,d*widthScale),style===1?.70:.82),mat);
      sideA.position.set(w/2+.014,y,0);
      sideA.rotation.y=Math.PI/2;
      mesh.add(sideA);

      const sideB = sideA.clone();
      sideB.position.x=-w/2-.014;
      mesh.add(sideB);
    }
  }
}
function createCity(){
  const sidewalkMat = new THREE.MeshStandardMaterial({color:0x29313a,roughness:.91});
  const roofMat = new THREE.MeshStandardMaterial({color:0x111923,roughness:.82,metalness:.10});
  const metalMat = new THREE.MeshStandardMaterial({color:0x394550,roughness:.48,metalness:.62});
  const trimMat = new THREE.MeshStandardMaterial({color:0x55606a,roughness:.68,metalness:.22});

  for(let ix=-6;ix<=6;ix++){
    for(let iz=-6;iz<=6;iz++){
      if(ix===0 && iz===0) continue;

      const x=ix*32, z=iz*32;
      const dist=Math.hypot(ix,iz);
      const style=Math.abs((ix*3+iz*5+13))%5;
      const w=rand(17.5,23.2), d=rand(17.5,23.2);

      let h=rand(22,74);
      if(dist<3.5)h*=rand(1.05,1.28);
      if(dist>7.4)h*=rand(.62,.83);
      if(Math.random()<.075)h=rand(84,116);

      const slab = new THREE.Mesh(new THREE.BoxGeometry(w+2.7,.30,d+2.7),sidewalkMat);
      slab.position.set(x,.15,z);
      slab.receiveShadow=true;
      scene.add(slab);

      const podiumH=style===1?rand(2.1,4.0):rand(1.0,2.4);
      const podium=new THREE.Mesh(
        new THREE.BoxGeometry(w+rand(.2,.9),podiumH,d+rand(.2,.9)),
        buildingMaterial(podiumH,(style+1)%5)
      );
      podium.position.set(x,podiumH/2+.29,z);
      podium.castShadow=true;
      podium.receiveShadow=true;
      scene.add(podium);

      const geo = new THREE.BoxGeometry(w,h,d);
      const mesh = new THREE.Mesh(geo,buildingMaterial(h,style));
      mesh.position.set(x,h/2+.29,z);
      mesh.castShadow=true;
      mesh.receiveShadow=true;
      addWindows(mesh,w,h,d,style);
      scene.add(mesh);
      city.push({mesh,x,z,w,d,h:h+.29,style});

      const topTrim=new THREE.Mesh(new THREE.BoxGeometry(w+.24,.38,d+.24),trimMat);
      topTrim.position.set(x,h+.12,z);
      topTrim.castShadow=true;
      scene.add(topTrim);

      if(style===2 && h>45){
        const crownH=rand(2.4,5.2);
        const crown=new THREE.Mesh(
          new THREE.BoxGeometry(w*.68,crownH,d*.68),
          new THREE.MeshStandardMaterial({color:0x233b4a,roughness:.31,metalness:.38})
        );
        crown.position.set(x,h-crownH*.26,z);
        crown.castShadow=true;
        scene.add(crown);
      }

      if(style===3 && Math.random()<.62){
        const bandMat=new THREE.MeshStandardMaterial({color:0x69717a,roughness:.66,metalness:.16});
        const bandCount=Math.min(4,Math.max(1,Math.floor(h/24)));
        for(let b=1;b<=bandCount;b++){
          const band=new THREE.Mesh(new THREE.BoxGeometry(w+.16,.24,d+.16),bandMat);
          band.position.set(x,(h/(bandCount+1))*b,z);
          scene.add(band);
        }
      }

      if(Math.random()<.57){
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(rand(w*.20,w*.44),rand(.8,1.9),rand(d*.20,d*.42)),
          roofMat
        );
        roof.position.set(x+rand(-w*.18,w*.18),h+.75,z+rand(-d*.18,d*.18));
        roof.castShadow=true;
        scene.add(roof);
      }

      if(Math.random()<.17){
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.16,1.9,12),metalMat);
        tank.position.set(x+rand(-w*.25,w*.25),h+1.3,z+rand(-d*.25,d*.25));
        tank.castShadow=true;
        scene.add(tank);

        const tankCap=new THREE.Mesh(new THREE.CylinderGeometry(1.08,1.08,.12,12),trimMat);
        tankCap.position.set(tank.position.x,tank.position.y+1.0,tank.position.z);
        scene.add(tankCap);
      }

      if(Math.random()<.22 || h>84){
        const mastH=rand(3.5,7.5);
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(.035,.055,mastH,6),metalMat);
        mast.position.set(x+rand(-2.5,2.5),h+mastH/2+.7,z+rand(-2.5,2.5));
        scene.add(mast);

        const light = new THREE.Mesh(new THREE.SphereGeometry(.10,6,4),new THREE.MeshBasicMaterial({color:0xff5964}));
        light.position.set(mast.position.x,h+mastH+.7,mast.position.z);
        scene.add(light);
        worldPulse.push({mesh:light,type:"beacon",seed:rand(0,10)});
      }

      if(h>50 && Math.random()<.11){
        const signMat=new THREE.MeshBasicMaterial({
          color:Math.random()<.5?0x42dfff:0xff4f87,
          transparent:true,
          opacity:.82
        });
        const sign=new THREE.Mesh(new THREE.PlaneGeometry(rand(3.5,6.5),rand(1.0,1.7)),signMat);
        sign.position.set(x,h*.64,d/2+.035+z);
        scene.add(sign);
        worldPulse.push({mesh:sign,type:"sign",seed:rand(0,10)});
      }
    }
  }

  const tower = city.reduce((a,b)=>a.h>b.h?a:b);
  const oldH=tower.h;
  tower.h += 17;
  tower.mesh.scale.y = tower.h / oldH;
  tower.mesh.position.y = tower.h/2+.14;
}
function createAtmosphere(){
  const skyMat=new THREE.ShaderMaterial({
    side:THREE.BackSide,
    depthWrite:false,
    uniforms:{
      topColor:{value:new THREE.Color(0x07162b)},
      horizonColor:{value:new THREE.Color(0x234b69)},
      warmColor:{value:new THREE.Color(0x8e4d46)}
    },
    vertexShader:`
      varying float vY;
      varying vec3 vPos;
      void main(){
        vY=normalize(position).y;
        vPos=position;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader:`
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 warmColor;
      varying float vY;
      varying vec3 vPos;
      void main(){
        float h=smoothstep(-0.18,0.75,vY);
        vec3 col=mix(horizonColor,topColor,h);
        float glow=pow(max(0.0,1.0-abs(vY+0.02)*5.0),3.0);
        col=mix(col,warmColor,glow*.22);
        gl_FragColor=vec4(col,1.0);
      }`
  });

  const sky=new THREE.Mesh(new THREE.SphereGeometry(430,32,18),skyMat);
  scene.add(sky);

  const sunDisc=new THREE.Mesh(
    new THREE.SphereGeometry(11,20,14),
    new THREE.MeshBasicMaterial({color:0xffd7b8})
  );
  sunDisc.position.set(-205,145,-255);
  scene.add(sunDisc);

  const hazeMat=new THREE.MeshBasicMaterial({color:0x6b7f8c,transparent:true,opacity:.05,side:THREE.DoubleSide});
  for(let i=0;i<8;i++){
    const haze=new THREE.Mesh(new THREE.PlaneGeometry(rand(70,120),rand(8,16)),hazeMat);
    haze.position.set(rand(-190,190),rand(72,115),rand(-190,190));
    haze.rotation.x=-Math.PI/2+rand(-.08,.08);
    haze.rotation.z=rand(0,Math.PI);
    scene.add(haze);
  }
}

function createDistantSkyline(){
  const geo=new THREE.BoxGeometry(1,1,1);
  const mat=new THREE.MeshStandardMaterial({color:0x152330,roughness:.82,metalness:.08});
  const skyline=new THREE.InstancedMesh(geo,mat,110);
  const dummy=new THREE.Object3D();

  for(let i=0;i<110;i++){
    const side=i%4;
    const along=rand(-265,265);
    const edge=(Math.random()<.5?-1:1)*rand(226,268);
    const h=rand(18,96);
    const w=rand(8,22);
    const d=rand(8,22);

    let x=0,z=0;
    if(side<2){x=edge;z=along;}else{x=along;z=edge;}

    dummy.position.set(x,h/2-.5,z);
    dummy.scale.set(w,h,d);
    dummy.rotation.y=rand(-.06,.06);
    dummy.updateMatrix();
    skyline.setMatrixAt(i,dummy.matrix);
  }

  skyline.receiveShadow=false;
  skyline.castShadow=false;
  scene.add(skyline);
}

function createStreetLife(){
  const poleMat=new THREE.MeshStandardMaterial({color:0x26303a,metalness:.58,roughness:.42});
  const bulbMat=new THREE.MeshBasicMaterial({color:0xffd49a});
  const poleGeo=new THREE.CylinderGeometry(.055,.085,4.4,7);
  const bulbGeo=new THREE.SphereGeometry(.12,7,5);
  const poleMesh=new THREE.InstancedMesh(poleGeo,poleMat,180);
  const bulbMesh=new THREE.InstancedMesh(bulbGeo,bulbMat,180);
  const dummy=new THREE.Object3D();
  let li=0;

  for(let ix=-5;ix<=5;ix++){
    for(let iz=-5;iz<=5;iz++){
      if((ix+iz)%2!==0)continue;
      const x=ix*32+13.1;
      const z=iz*32+13.1;

      dummy.position.set(x,2.2,z);
      dummy.scale.set(1,1,1);
      dummy.rotation.set(0,0,0);
      dummy.updateMatrix();
      poleMesh.setMatrixAt(li,dummy.matrix);

      dummy.position.set(x,4.42,z);
      dummy.updateMatrix();
      bulbMesh.setMatrixAt(li,dummy.matrix);
      li++;
    }
  }

  poleMesh.count=li;
  bulbMesh.count=li;
  scene.add(poleMesh,bulbMesh);

  const trunkMat=new THREE.MeshStandardMaterial({color:0x4a3324,roughness:.96});
  const leafMat=new THREE.MeshStandardMaterial({color:0x1b4936,roughness:.88});
  const trunkGeo=new THREE.CylinderGeometry(.13,.18,2.3,7);
  const leafGeo=new THREE.IcosahedronGeometry(1.0,1);
  const trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,90);
  const leaves=new THREE.InstancedMesh(leafGeo,leafMat,90);
  let ti=0;

  for(let i=0;i<24;i++){
    const a=i/24*Math.PI*2;
    const r=i%2===0?20.5:23.5;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;

    dummy.position.set(x,1.35,z);
    dummy.scale.set(1,1,1);
    dummy.updateMatrix();
    trunks.setMatrixAt(ti,dummy.matrix);

    dummy.position.set(x,3.25,z);
    dummy.scale.set(rand(.85,1.25),rand(.9,1.35),rand(.85,1.25));
    dummy.updateMatrix();
    leaves.setMatrixAt(ti,dummy.matrix);
    ti++;
  }

  for(let i=0;i<38;i++){
    const axis=Math.random()<.5?"x":"z";
    const lane=(Math.floor(rand(-4,5))*32);
    const along=rand(-150,150);
    const x=axis==="x"?along:lane+12.5;
    const z=axis==="x"?lane+12.5:along;

    dummy.position.set(x,1.35,z);
    dummy.scale.set(1,1,1);
    dummy.updateMatrix();
    trunks.setMatrixAt(ti,dummy.matrix);

    dummy.position.set(x,3.2,z);
    dummy.scale.set(rand(.75,1.15),rand(.85,1.25),rand(.75,1.15));
    dummy.updateMatrix();
    leaves.setMatrixAt(ti,dummy.matrix);
    ti++;
  }

  trunks.count=ti;
  leaves.count=ti;
  scene.add(trunks,leaves);
}

function createTraffic(){
  const roadChoices=[-112,-80,-48,-16,16,48,80,112,144];
  const carColors=[0x8f1525,0x174b7a,0xd4d6d8,0x262a30,0x8b7428,0x4d5f61];

  for(let i=0;i<22;i++){
    const g=new THREE.Group();
    const color=carColors[i%carColors.length];
    const bodyMat=new THREE.MeshStandardMaterial({color,roughness:.42,metalness:.24});
    const glassMat=new THREE.MeshStandardMaterial({color:0x132536,roughness:.18,metalness:.46});

    const body=new THREE.Mesh(new THREE.BoxGeometry(1.75,.52,3.85),bodyMat);
    body.position.y=.55;
    body.castShadow=true;
    g.add(body);

    const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.48,.48,1.85),glassMat);
    cabin.position.set(0,.98,-.18);
    cabin.castShadow=true;
    g.add(cabin);

    const lights=new THREE.Mesh(new THREE.BoxGeometry(1.18,.10,.04),new THREE.MeshBasicMaterial({color:0xffe6be}));
    lights.position.set(0,.57,-1.945);
    g.add(lights);

    const axis=Math.random()<.5?"z":"x";
    const dir=Math.random()<.5?-1:1;
    const road=roadChoices[Math.floor(Math.random()*roadChoices.length)];
    const laneOffset=dir>0?2.15:-2.15;

    if(axis==="z"){
      g.position.set(road+laneOffset,.02,rand(-190,190));
      g.rotation.y=dir>0?Math.PI:0;
    }else{
      g.position.set(rand(-190,190),.02,road-laneOffset);
      g.rotation.y=dir>0?-Math.PI/2:Math.PI/2;
    }

    g.userData.axis=axis;
    g.userData.dir=dir;
    g.userData.speed=rand(8,15);
    scene.add(g);
    traffic.push(g);
  }
}

function updateWorld(dt,t){
  for(const car of traffic){
    const move=car.userData.speed*car.userData.dir*dt;
    if(car.userData.axis==="z"){
      car.position.z+=move;
      if(car.position.z>220)car.position.z=-220;
      if(car.position.z<-220)car.position.z=220;
    }else{
      car.position.x+=move;
      if(car.position.x>220)car.position.x=-220;
      if(car.position.x<-220)car.position.x=220;
    }
  }

  for(const item of worldPulse){
    if(item.type==="water"){
      item.mesh.position.y=item.baseY+Math.sin(t*2.2)*.018;
      item.mesh.material.opacity=.68+Math.sin(t*1.6)*.04;
    }else if(item.type==="beacon"){
      item.mesh.material.color.setHex(Math.sin(t*2.5+item.seed)>0?0xff5964:0x6d151d);
    }else if(item.type==="sign"){
      item.mesh.material.opacity=.67+.18*(.5+.5*Math.sin(t*1.9+item.seed));
    }
  }
}

function limb(material, r, len){
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r,len,6,10),material);
  m.castShadow=true;
  return m;
}

function createPlayer(){
  player = {
    pos:new THREE.Vector3(0,2,0),
    vel:new THREE.Vector3(),
    grounded:false,
    facing:new THREE.Vector3(0,0,-1)
  };

  playerMesh = new THREE.Group();
  playerMesh.userData.visualOffset=.56;

  const redMat = new THREE.MeshStandardMaterial({color:0xc90f31,roughness:.34,metalness:.035});
  const redDarkMat = new THREE.MeshStandardMaterial({color:0x941027,roughness:.42,metalness:.04});
  const blueMat = new THREE.MeshStandardMaterial({color:0x123d87,roughness:.41,metalness:.07});
  const blueDarkMat = new THREE.MeshStandardMaterial({color:0x0b2a63,roughness:.48,metalness:.05});
  const seamMat = new THREE.MeshBasicMaterial({color:0x090b10,side:THREE.DoubleSide});
  const eyeMat = new THREE.MeshBasicMaterial({color:0xf7fbff,side:THREE.DoubleSide});
  const eyeTrimMat = new THREE.MeshBasicMaterial({color:0x07090d,side:THREE.DoubleSide});

  const chest = new THREE.Mesh(new THREE.CylinderGeometry(.43,.36,1.08,18,1),redMat);
  chest.position.y=.28;
  chest.scale.set(1.10,1,.78);
  chest.castShadow=true;
  playerMesh.add(chest);

  const upperBack = new THREE.Mesh(new THREE.SphereGeometry(.45,18,12),redMat);
  upperBack.position.set(0,.56,.015);
  upperBack.scale.set(1.12,.58,.74);
  upperBack.castShadow=true;
  playerMesh.add(upperBack);

  const abdomen = new THREE.Mesh(new THREE.CylinderGeometry(.34,.31,.62,16,1),blueMat);
  abdomen.position.y=-.49;
  abdomen.scale.z=.78;
  abdomen.castShadow=true;
  playerMesh.add(abdomen);

  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(.36,16,10),blueDarkMat);
  pelvis.position.y=-.82;
  pelvis.scale.set(1.05,.58,.78);
  pelvis.castShadow=true;
  playerMesh.add(pelvis);

  for(const sx of [-1,1]){
    const sidePanel = new THREE.Mesh(new THREE.CapsuleGeometry(.12,.66,5,8),blueMat);
    sidePanel.position.set(sx*.405,.13,.015);
    sidePanel.rotation.z=sx*.10;
    sidePanel.scale.set(.75,1,.74);
    sidePanel.castShadow=true;
    playerMesh.add(sidePanel);
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.22,.24,.28,14),redDarkMat);
  neck.position.y=1.02;
  neck.castShadow=true;
  playerMesh.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(.43,28,22),redMat);
  head.position.y=1.45;
  head.scale.set(.82,1.10,.86);
  head.castShadow=true;
  playerMesh.add(head);

  const webLineMat = new THREE.MeshBasicMaterial({color:0x1a1015});
  for(const y of [1.29,1.43,1.57,1.70]){
    const r=.31-Math.abs(y-1.49)*.18;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.006,4,28),webLineMat);
    ring.position.y=y;
    ring.rotation.x=Math.PI/2;
    ring.scale.z=.86;
    playerMesh.add(ring);
  }
  for(const a of [-1.05,-.52,0,.52,1.05]){
    const pts=[];
    for(let i=0;i<=8;i++){
      const v=i/8;
      const yy=1.10+v*.76;
      const rr=.16+Math.sin(v*Math.PI)*.22;
      pts.push(new THREE.Vector3(Math.sin(a)*rr,yy,-Math.cos(a)*rr*.86));
    }
    const curve=new THREE.CatmullRomCurve3(pts);
    const strand=new THREE.Mesh(new THREE.TubeGeometry(curve,18,.005,4,false),webLineMat);
    playerMesh.add(strand);
  }

  const eyeShape = new THREE.Shape();
  eyeShape.moveTo(-.11,.18);
  eyeShape.lineTo(.12,.13);
  eyeShape.lineTo(.075,-.16);
  eyeShape.lineTo(-.055,-.10);
  eyeShape.closePath();
  const eyeGeo = new THREE.ShapeGeometry(eyeShape);

  for(const sx of [-1,1]){
    const trim = new THREE.Mesh(eyeGeo,eyeTrimMat);
    trim.position.set(sx*.185,1.49,-.382);
    trim.scale.set(sx*1.34,1.27,1);
    playerMesh.add(trim);

    const eye = new THREE.Mesh(eyeGeo,eyeMat);
    eye.position.set(sx*.185,1.49,-.392);
    eye.scale.set(sx*.99,.94,1);
    playerMesh.add(eye);
  }

  for(const sx of [-1,1]){
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(.235,14,10),redMat);
    shoulder.position.set(sx*.59,.52,.005);
    shoulder.scale.set(1,.92,.86);
    shoulder.castShadow=true;
    playerMesh.add(shoulder);

    const arm = new THREE.Group();
    arm.position.set(sx*.61,.48,0);
    arm.userData.kind="arm";
    arm.userData.side=sx;

    const upper = limb(redMat,.17,.49);
    upper.position.y=-.35;
    upper.scale.set(.96,1,.91);
    arm.add(upper);

    const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(.165,10,8),redDarkMat);
    elbowJoint.position.y=-.69;
    elbowJoint.castShadow=true;
    arm.add(elbowJoint);

    const elbow = new THREE.Group();
    elbow.position.y=-.70;
    const fore = limb(redMat,.145,.43);
    fore.position.y=-.29;
    fore.scale.set(.92,1,.88);
    elbow.add(fore);

    const wristBand = new THREE.Mesh(new THREE.CylinderGeometry(.148,.148,.06,10),seamMat);
    wristBand.position.y=-.53;
    elbow.add(wristBand);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(.145,12,9),redMat);
    hand.position.set(0,-.64,-.015);
    hand.scale.set(.86,1.10,.82);
    hand.castShadow=true;
    elbow.add(hand);

    arm.userData.elbow=elbow;
    arm.add(elbow);
    arm.rotation.z=sx*.085;
    playerMesh.add(arm);
  }

  for(const sx of [-1,1]){
    const hipJoint=new THREE.Mesh(new THREE.SphereGeometry(.21,12,9),blueDarkMat);
    hipJoint.position.set(sx*.255,-.86,0);
    hipJoint.scale.set(.9,1,.86);
    hipJoint.castShadow=true;
    playerMesh.add(hipJoint);

    const leg = new THREE.Group();
    leg.position.set(sx*.255,-.83,0);
    leg.userData.kind="leg";
    leg.userData.side=sx;

    const thigh = limb(blueMat,.19,.56);
    thigh.position.y=-.38;
    thigh.scale.set(.96,1,.90);
    leg.add(thigh);

    const kneeJoint = new THREE.Mesh(new THREE.SphereGeometry(.18,10,8),blueDarkMat);
    kneeJoint.position.y=-.71;
    kneeJoint.castShadow=true;
    leg.add(kneeJoint);

    const knee = new THREE.Group();
    knee.position.y=-.72;

    const shin = limb(blueMat,.162,.48);
    shin.position.y=-.32;
    shin.scale.set(.92,1,.88);
    knee.add(shin);

    const boot = limb(redMat,.166,.28);
    boot.position.y=-.72;
    boot.scale.set(.94,1,.90);
    knee.add(boot);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(.28,.18,.50),redMat);
    foot.position.set(0,-.96,-.13);
    foot.rotation.x=-.08;
    foot.castShadow=true;
    knee.add(foot);

    leg.userData.knee=knee;
    leg.add(knee);
    playerMesh.add(leg);
  }

  const makeEmblem=(z,flip,scale,mat)=>{
    const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.055,.24,4,8),mat);
    g.add(body);
    for(const sy of [-1,1]){
      for(const sx of [-1,1]){
        const legA=new THREE.Mesh(new THREE.BoxGeometry(.035,.23,.028),mat);
        legA.position.set(sx*.105,sy*.07,0);
        legA.rotation.z=sx*sy*.72;
        g.add(legA);
        const legB=new THREE.Mesh(new THREE.BoxGeometry(.03,.18,.028),mat);
        legB.position.set(sx*.17,sy*.16,0);
        legB.rotation.z=sx*sy*.98;
        g.add(legB);
      }
    }
    g.position.set(0,.39,z);
    g.scale.set(scale,scale,scale);
    if(flip)g.rotation.y=Math.PI;
    playerMesh.add(g);
  };

  makeEmblem(-.382,false,.90,seamMat);
  makeEmblem(.382,true,.72,seamMat);

  playerMesh.scale.set(.96,.96,.96);
  scene.add(playerMesh);

  const webGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
  webLine = new THREE.Line(webGeo,new THREE.LineBasicMaterial({color:0xeaf7ff,transparent:true,opacity:.92}));
  webLine.visible=false;
  scene.add(webLine);
}
function createBeacon(b,index){
  const g=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.55,.13,10,34),new THREE.MeshBasicMaterial({color:0x43dfff}));
  ring.rotation.x=Math.PI/2; g.add(ring);
  const core=new THREE.Mesh(new THREE.OctahedronGeometry(.36),new THREE.MeshBasicMaterial({color:0xffffff}));
  g.add(core);
  g.position.set(b.x,b.h+3.3,b.z);
  g.userData.index=index;
  scene.add(g);
  beacons.push(g);
}

function setupMission0(){
  missionIndex=0; beaconCount=0; beacons.forEach(b=>scene.remove(b)); beacons=[];
  const tall=[...city].sort((a,b)=>b.h-a.h).slice(3,20);
  createBeacon(tall[2],0); createBeacon(tall[8],1); createBeacon(tall[14],2);
  missionEl.textContent="المهمة 1/4 • فعّل 3 إشارات على الأسطح — 0/3";
  toast("ابدأ بالأسطح: اتأرجح ناحية العلامات الزرقا.");
}

function createCollectibles(){
  const picks=[...city].sort(()=>Math.random()-.5).slice(0,18);
  picks.forEach((b,i)=>{
    const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.34,1),new THREE.MeshBasicMaterial({color:0xfff2a5}));
    m.position.set(b.x+rand(-3,3),b.h+2,b.z+rand(-3,3));
    m.userData.baseY=m.position.y; m.userData.t=rand(0,10);
    scene.add(m); collectibles.push(m);
  });
}

function spawnEnemies(count){
  enemies.forEach(e=>scene.remove(e.group)); enemies=[];
  for(let i=0;i<count;i++){
    const angle=i/count*Math.PI*2;
    const p=new THREE.Vector3(Math.cos(angle)*22,1.2,Math.sin(angle)*22);
    enemies.push(makeEnemy(p,false));
  }
}

function makeEnemy(pos,isBoss){
  const g=new THREE.Group();
  const color=isBoss?0xff9d22:0x222831;
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(isBoss?.72:.48,isBoss?1.4:.85,5,8),new THREE.MeshStandardMaterial({color,roughness:.48,metalness:.18}));
  body.position.y=.6; body.castShadow=true; g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(isBoss?.5:.35,14,10),new THREE.MeshStandardMaterial({color:isBoss?0x30180a:0xb8a18c,roughness:.7}));
  head.position.y=isBoss?2.1:1.65; head.castShadow=true; g.add(head);
  g.position.copy(pos); scene.add(g);
  return {group:g,hp:isBoss?260:80,maxHp:isBoss?260:80,boss:isBoss,cooldown:rand(.2,1.1),alive:true,speed:isBoss?5.5:4.2};
}

function spawnBoss(){
  const roof=[...city].sort((a,b)=>b.h-a.h)[0];
  boss=makeEnemy(new THREE.Vector3(roof.x,roof.h+1.2,roof.z),true);
  enemies.push(boss);
  missionEl.textContent="المهمة 4/4 • اهزم الـTech Boss على أعلى سطح";
  toast("Boss fight! وصل لأعلى مبنى وخليه ينزل.");
}

function spawnDrone(){
  const mesh=new THREE.Group();
  const core=new THREE.Mesh(new THREE.OctahedronGeometry(.8,1),new THREE.MeshStandardMaterial({color:0x902cff,emissive:0x28004f,metalness:.5,roughness:.25}));
  mesh.add(core);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.25,.08,8,26),new THREE.MeshBasicMaterial({color:0xd7b0ff}));
  ring.rotation.x=Math.PI/2; mesh.add(ring);
  mesh.position.set(65,44,0);
  scene.add(mesh);
  drone={mesh,t:0};
  missionEl.textContent="المهمة 3/4 • طارد الدرون البنفسجي والمسُه";
  toast("الدرون هرب فوق المدينة — استخدم Swing + Web Zip.");
}

function setupInput(){
  addEventListener("keydown",e=>{
    keys[e.code]=true;
    if(e.code==="Space") tryJump();
    if(e.code==="KeyE") webZip();
    if(e.code==="KeyF") performAttack(false);
    if(e.code==="KeyR") performAttack(true);
    if(e.code==="KeyQ") swingHeld=true;
  });
  addEventListener("keyup",e=>{
    keys[e.code]=false;
    if(e.code==="KeyQ"){swingHeld=false;releaseSwing();}
  });
  renderer.domElement.addEventListener("mousedown",e=>{
    if(!started)return;
    if(e.button===0){swingHeld=true;}
    if(e.button===2){performAttack(false);}
  });
  addEventListener("mouseup",e=>{if(e.button===0){swingHeld=false;releaseSwing();}});
  addEventListener("contextmenu",e=>e.preventDefault());
  addEventListener("mousemove",e=>{
    if(!started || document.pointerLockElement!==renderer.domElement || isTouch)return;
    yaw -= e.movementX*.0023;
    pitch = clamp(pitch-e.movementY*.0017,-.82,.35);
  });
  renderer.domElement.addEventListener("click",()=>{if(started&&!isTouch)renderer.domElement.requestPointerLock();});

  if(isTouch){
    mobileUI.classList.remove("hidden");
    const stick=el("stick"), knob=el("stickKnob");
    let sid=null, origin=null;
    stick.addEventListener("pointerdown",e=>{sid=e.pointerId;origin={x:e.clientX,y:e.clientY};stick.setPointerCapture(sid);});
    stick.addEventListener("pointermove",e=>{
      if(e.pointerId!==sid||!origin)return;
      let dx=e.clientX-origin.x,dy=e.clientY-origin.y;
      const l=Math.hypot(dx,dy)||1, max=38;
      if(l>max){dx*=max/l;dy*=max/l;}
      mobileAxes.x=dx/max;mobileAxes.y=-dy/max;
      knob.style.transform="translate("+dx+"px,"+dy+"px)";
    });
    const resetStick=()=>{sid=null;origin=null;mobileAxes.x=mobileAxes.y=0;knob.style.transform="";};
    stick.addEventListener("pointerup",resetStick);stick.addEventListener("pointercancel",resetStick);
    document.querySelectorAll(".mobile-actions button").forEach(btn=>{
      const a=btn.dataset.act;
      btn.addEventListener("pointerdown",e=>{
        e.preventDefault();
        if(a==="swing")swingHeld=true;
        if(a==="jump")tryJump();
        if(a==="zip")webZip();
        if(a==="attack")performAttack(false);
      });
      btn.addEventListener("pointerup",()=>{if(a==="swing"){swingHeld=false;releaseSwing();}});
      btn.addEventListener("pointercancel",()=>{if(a==="swing"){swingHeld=false;releaseSwing();}});
    });
    let lookId=null, lx=0,ly=0;
    renderer.domElement.addEventListener("pointerdown",e=>{if(e.clientX>innerWidth*.32){lookId=e.pointerId;lx=e.clientX;ly=e.clientY;}});
    renderer.domElement.addEventListener("pointermove",e=>{
      if(e.pointerId!==lookId)return;
      const dx=e.clientX-lx,dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;
      yaw-=dx*.006;pitch=clamp(pitch-dy*.004,-.82,.35);
    });
    renderer.domElement.addEventListener("pointerup",e=>{if(e.pointerId===lookId)lookId=null;});
  }
}

function startGame(){
  started=true;won=false;
  startScreen.classList.add("hidden");winScreen.classList.add("hidden");hud.classList.remove("hidden");
  if(!isTouch){renderer.domElement.requestPointerLock().catch(()=>{});}
  if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();}
  resetAll();
}

function resetAll(){
  score=0;combo=1;comboTimer=0;health=100;web=100;missionIndex=0;zipTarget=null;releaseSwing();
  enemies.forEach(e=>scene.remove(e.group));enemies=[]; if(drone){scene.remove(drone.mesh);drone=null;}
  player.pos.set(0,3,0);player.vel.set(0,0,0);yaw=0;pitch=-.16;
  setupMission0();
}

function tryJump(){
  if(!started)return;
  if(player.grounded){player.vel.y=state.jump;player.grounded=false;beep(320,.06);}
  else if(wallTouch){player.vel.y=9;player.vel.addScaledVector(player.facing,-5);beep(420,.07);}
}

function findWebAnchor(){
  const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)).normalize();
  let best=null,bestScore=1e9;
  for(const b of city){
    const a=new THREE.Vector3(b.x,b.h+2.4,b.z);
    const d=a.distanceTo(player.pos);
    if(d<12||d>95||a.y<player.pos.y+3)continue;
    const dir=a.clone().sub(player.pos).normalize();
    const dot=dir.dot(forward);
    if(dot<-.15)continue;
    const s=d-dot*30;
    if(s<bestScore){bestScore=s;best=a;}
  }
  return best;
}

function beginSwing(){
  if(web<5)return;
  const a=findWebAnchor();
  if(!a)return;
  swingAnchor=a;ropeLength=Math.max(8,player.pos.distanceTo(a)*.77);
  webLine.visible=true;beep(760,.04);
}

function releaseSwing(){
  swingAnchor=null;if(webLine)webLine.visible=false;
}

function webZip(){
  if(!started||web<12)return;
  const a=findWebAnchor();
  if(!a)return toast("مفيش نقطة Web Zip مناسبة قدامك.");
  zipTarget=a.clone();web-=10;beep(900,.05);
}

function performAttack(heavy){
  if(!started||attackCooldown>0)return;
  attackCooldown=heavy?.55:.28;
  const range=heavy?5.1:3.7, damage=heavy?55:32;
  let hit=false;
  const f=player.facing.clone().normalize();
  for(const e of enemies){
    if(!e.alive)continue;
    const v=e.group.position.clone().sub(player.pos);
    const d=v.length();
    if(d<range && v.normalize().dot(f)>.05){
      e.hp-=damage*combo;
      e.group.position.addScaledVector(f,heavy?2.2:1.1);
      hit=true;score+=heavy?90:55;combo=Math.min(5,combo+1);comboTimer=2.2;
      flashEnemy(e);
      if(e.hp<=0)killEnemy(e);
    }
  }
  if(hit){beep(150,heavy?.12:.07);player.vel.addScaledVector(f,heavy?1.5:.7);}
  else combo=Math.max(1,combo-1);
}

function flashEnemy(e){
  e.group.scale.set(1.14,1.14,1.14);
  setTimeout(()=>{if(e.alive)e.group.scale.set(1,1,1);},90);
}

function killEnemy(e){
  e.alive=false;scene.remove(e.group);score+=e.boss?2500:300;beep(e.boss?70:95,.18);
  if(e.boss){
    missionIndex=4;won=true;setTimeout(showWin,700);
  }
}

function damagePlayer(amount){
  health=clamp(health-amount,0,100);combo=1;
  beep(85,.11);
  if(health<=0){
    health=100;player.pos.set(0,5,0);player.vel.set(0,0,0);score=Math.max(0,score-500);
    toast("اتوقعت! رجعتك لنقطة آمنة وخسرت 500 نقطة.");
  }
}

function updatePlayer(dt){
  attackCooldown=Math.max(0,attackCooldown-dt);
  comboTimer-=dt;if(comboTimer<=0){combo=1;}
  web=Math.min(100,web+dt*7);

  const mx=(keys.KeyD?1:0)-(keys.KeyA?1:0)+mobileAxes.x;
  const mz=(keys.KeyW?1:0)-(keys.KeyS?1:0)+mobileAxes.y;
  const len=Math.hypot(mx,mz);
  const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
  const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const wish=new THREE.Vector3();
  if(len>.05){
    wish.addScaledVector(forward,mz/Math.max(1,len));
    wish.addScaledVector(right,mx/Math.max(1,len)).normalize();
    player.facing.lerp(wish,.18).normalize();
  }

  if(swingHeld && !swingAnchor)beginSwing();
  if(swingAnchor){
    web=Math.max(0,web-dt*4);
    if(web<=0){releaseSwing();}
    else{
      const r=player.pos.clone().sub(swingAnchor);
      const dist=r.length();
      if(dist>ropeLength){
        const stretch=dist-ropeLength;
        player.vel.addScaledVector(r.normalize(),-(stretch*18+Math.max(0,player.vel.dot(r.normalize()))*5)*dt);
      }
      player.vel.addScaledVector(forward,(keys.ShiftLeft||keys.ShiftRight?16:10)*dt);
      if(keys.KeyW)ropeLength=Math.max(7,ropeLength-dt*5);
      if(keys.KeyS)ropeLength=Math.min(85,ropeLength+dt*5);
      updateWebLine();
    }
  }

  if(zipTarget){
    const dir=zipTarget.clone().sub(player.pos);
    const d=dir.length();
    if(d<3.8){zipTarget=null;player.vel.y=Math.max(player.vel.y,4);}
    else{player.vel.addScaledVector(dir.normalize(),42*dt);webLine.visible=true;drawWeb(player.pos,zipTarget);}
  }else if(!swingAnchor && webLine)webLine.visible=false;

  const sprint=keys.ShiftLeft||keys.ShiftRight;
  const targetSpeed=sprint?state.sprintSpeed:state.baseSpeed;
  if(player.grounded){
    const target=wish.multiplyScalar(len>.05?targetSpeed:0);
    player.vel.x=THREE.MathUtils.damp(player.vel.x,target.x,8,dt);
    player.vel.z=THREE.MathUtils.damp(player.vel.z,target.z,8,dt);
  }else if(len>.05){
    player.vel.addScaledVector(wish,(swingAnchor?4.5:9)*dt);
  }

  if(!player.grounded)player.vel.y-=state.gravity*dt;
  player.vel.multiplyScalar(Math.pow(.998,dt*60));
  player.pos.addScaledVector(player.vel,dt);

  resolveCollisions(dt,mz);

  if(player.pos.y<-12){
    damagePlayer(20);player.pos.set(0,6,0);player.vel.set(0,0,0);
  }
  if(Math.abs(player.pos.x)>state.worldHalf){player.pos.x=clamp(player.pos.x,-state.worldHalf,state.worldHalf);player.vel.x*=-.25;}
  if(Math.abs(player.pos.z)>state.worldHalf){player.pos.z=clamp(player.pos.z,-state.worldHalf,state.worldHalf);player.vel.z*=-.25;}

  playerMesh.position.set(player.pos.x,player.pos.y+(playerMesh.userData.visualOffset||0),player.pos.z);
  const faceYaw=Math.atan2(-player.facing.x,-player.facing.z);
  playerMesh.rotation.y=THREE.MathUtils.lerp(playerMesh.rotation.y,faceYaw,.18);
  const sp=player.vel.length();
  playerMesh.rotation.z=THREE.MathUtils.damp(playerMesh.rotation.z,clamp(-player.vel.x*.015,-.18,.18),5,dt);
  motionLines.style.opacity=String(clamp((sp-20)/24,0,.42));
}

function resolveCollisions(dt,forwardInput){
  player.grounded=false;wallTouch=false;
  let bestGround=state.groundY;
  if(player.pos.y<=bestGround+1 && player.vel.y<=0){
    player.pos.y=bestGround;player.vel.y=0;player.grounded=true;
  }
  for(const b of city){
    const hx=b.w/2+.55,hz=b.d/2+.55;
    const dx=player.pos.x-b.x,dz=player.pos.z-b.z;
    if(Math.abs(dx)<hx && Math.abs(dz)<hz){
      const roofY=b.h+1.15;
      if(player.pos.y>=b.h-.8 && player.pos.y<=roofY+1.1 && player.vel.y<=1.5){
        player.pos.y=roofY;player.vel.y=Math.max(0,player.vel.y);player.grounded=true;
      }else if(player.pos.y<b.h-.5){
        wallTouch=true;
        const penX=hx-Math.abs(dx),penZ=hz-Math.abs(dz);
        if(penX<penZ){
          player.pos.x=b.x+Math.sign(dx||1)*hx;player.vel.x*=.05;
        }else{
          player.pos.z=b.z+Math.sign(dz||1)*hz;player.vel.z*=.05;
        }
        if(forwardInput>.15 || keys.KeyW){
          player.vel.y=Math.max(player.vel.y,5.2);
          player.grounded=false;
        }
      }
    }
  }
}

function drawWeb(a,b){
  const arr=webLine.geometry.attributes.position.array;
  arr[0]=a.x;arr[1]=a.y+.7;arr[2]=a.z;
  arr[3]=b.x;arr[4]=b.y;arr[5]=b.z;
  webLine.geometry.attributes.position.needsUpdate=true;
}
function updateWebLine(){if(swingAnchor)drawWeb(player.pos,swingAnchor);}

function updateCamera(dt){
  const cp=Math.cos(pitch),sp=Math.sin(pitch);
  const back=new THREE.Vector3(Math.sin(yaw)*cp,sp,Math.cos(yaw)*cp);
  const speed=player.vel.length();
  const distance=8.5+clamp(speed*.065,0,4.2);
  const target=player.pos.clone().add(new THREE.Vector3(0,1.15,0));
  const desired=target.clone().addScaledVector(back,distance);
  desired.y+=2.1;
  camera.position.lerp(desired,1-Math.pow(.001,dt));
  const look=target.clone().addScaledVector(player.vel,.07);
  camera.lookAt(look);
  camera.fov=THREE.MathUtils.damp(camera.fov,68+clamp((speed-12)*.45,0,12),4,dt);
  camera.updateProjectionMatrix();
}

function updateEnemies(dt){
  let alive=0;
  for(const e of enemies){
    if(!e.alive)continue;alive++;
    e.cooldown-=dt;
    const pos=e.group.position;
    const to=player.pos.clone().sub(pos);
    const dist=to.length();
    if(dist<46){
      const dir=to.clone();dir.y=0;
      if(dir.lengthSq()>.01)dir.normalize();
      if(dist>2.1){
        pos.addScaledVector(dir,e.speed*dt);
        e.group.rotation.y=Math.atan2(dir.x,dir.z);
      }else if(e.cooldown<=0){
        e.cooldown=e.boss?.72:1.15;
        damagePlayer(e.boss?14:7);
      }
      if(e.boss && e.cooldown<.12 && Math.random()<dt*1.4)shootBossBolt(e);
    }
    const ground=groundHeightAt(pos.x,pos.z);
    pos.y=THREE.MathUtils.damp(pos.y,ground,9,dt);
  }
  if(missionIndex===1 && alive===0){
    missionIndex=2;score+=800;spawnDrone();
  }
}

function groundHeightAt(x,z){
  let y=1.2;
  for(const b of city){
    if(Math.abs(x-b.x)<b.w/2 && Math.abs(z-b.z)<b.d/2)y=Math.max(y,b.h+1.2);
  }
  return y;
}

function shootBossBolt(e){
  const m=new THREE.Mesh(new THREE.SphereGeometry(.18,8,8),new THREE.MeshBasicMaterial({color:0xffa629}));
  m.position.copy(e.group.position).add(new THREE.Vector3(0,1.7,0));
  const v=player.pos.clone().sub(m.position).normalize().multiplyScalar(18);
  scene.add(m);projectiles.push({mesh:m,vel:v,life:3});
}

function updateProjectiles(dt){
  for(let i=projectiles.length-1;i>=0;i--){
    const p=projectiles[i];p.life-=dt;p.mesh.position.addScaledVector(p.vel,dt);
    if(p.mesh.position.distanceTo(player.pos)<1.2){damagePlayer(9);p.life=0;}
    if(p.life<=0){scene.remove(p.mesh);projectiles.splice(i,1);}
  }
}

function updateMission(dt,t){
  if(missionIndex===0){
    for(let i=beacons.length-1;i>=0;i--){
      const b=beacons[i];b.rotation.y+=dt*1.8;b.children[0].rotation.z+=dt*.8;
      if(b.position.distanceTo(player.pos)<3.4){
        scene.remove(b);beacons.splice(i,1);beaconCount++;score+=400;beep(1120,.1);
        missionEl.textContent="المهمة 1/4 • فعّل 3 إشارات على الأسطح — "+beaconCount+"/3";
        toast("إشارة اتفعلت! "+beaconCount+"/3");
      }
    }
    if(beaconCount>=3){
      missionIndex=1;spawnEnemies(6);missionEl.textContent="المهمة 2/4 • اهزم العصابة في الساحة — 6 خصوم";
      toast("العصابة ظهرت في الساحة — انزل قاتلهم.");
    }
  }else if(missionIndex===1){
    const a=enemies.filter(e=>e.alive).length;
    missionEl.textContent="المهمة 2/4 • اهزم العصابة — باقي "+a;
  }else if(missionIndex===2 && drone){
    drone.t+=dt*.35;
    const r=72+Math.sin(drone.t*1.9)*12;
    drone.mesh.position.set(Math.cos(drone.t)*r,42+Math.sin(drone.t*2.2)*12,Math.sin(drone.t)*r);
    drone.mesh.rotation.y+=dt*2.3;drone.mesh.rotation.x+=dt*.9;
    if(drone.mesh.position.distanceTo(player.pos)<4.2){
      scene.remove(drone.mesh);drone=null;score+=1400;missionIndex=3;spawnBoss();
    }
  }
}

function updateCollectibles(dt){
  for(let i=collectibles.length-1;i>=0;i--){
    const c=collectibles[i];c.userData.t+=dt;c.rotation.x+=dt;c.rotation.y+=dt*1.5;c.position.y=c.userData.baseY+Math.sin(c.userData.t*2)*.35;
    if(c.position.distanceTo(player.pos)<2){
      scene.remove(c);collectibles.splice(i,1);score+=150;web=Math.min(100,web+15);beep(1300,.04);
    }
  }
}

function updateHUD(){
  healthBar.style.width=health+"%";webBar.style.width=web+"%";
  scoreEl.textContent=String(Math.floor(score));comboEl.textContent="x"+combo;
  speedEl.textContent=String(Math.floor(player.vel.length()*4));
  if(toastTimer>0){toastTimer-=1/60;if(toastTimer<=0)toastEl.classList.remove("show");}
}

function drawMap(){
  const c=mapCtx,w=minimap.width,h=minimap.height;c.clearRect(0,0,w,h);
  c.save();c.translate(w/2,h/2);
  c.fillStyle="rgba(5,10,20,.86)";c.beginPath();c.arc(0,0,w/2-2,0,Math.PI*2);c.fill();
  const s=.34;
  c.strokeStyle="rgba(150,180,210,.13)";c.lineWidth=1;
  for(let i=-192;i<=192;i+=32){c.beginPath();c.moveTo(i*s,-90);c.lineTo(i*s,90);c.stroke();c.beginPath();c.moveTo(-90,i*s);c.lineTo(90,i*s);c.stroke();}
  c.fillStyle="#ff3c5e";c.beginPath();c.arc(player.pos.x*s,player.pos.z*s,4,0,Math.PI*2);c.fill();
  c.strokeStyle="#fff";c.beginPath();c.moveTo(player.pos.x*s,player.pos.z*s);c.lineTo((player.pos.x+player.facing.x*10)*s,(player.pos.z+player.facing.z*10)*s);c.stroke();
  c.fillStyle="#2fe8ff";beacons.forEach(b=>{c.beginPath();c.arc(b.position.x*s,b.position.z*s,3,0,Math.PI*2);c.fill();});
  c.fillStyle="#ff9b2f";enemies.filter(e=>e.alive).forEach(e=>{c.beginPath();c.arc(e.group.position.x*s,e.group.position.z*s,e.boss?5:2.5,0,Math.PI*2);c.fill();});
  if(drone){c.fillStyle="#b15cff";c.beginPath();c.arc(drone.mesh.position.x*s,drone.mesh.position.z*s,4,0,Math.PI*2);c.fill();}
  c.restore();
}

function animateScene(dt,t){
  if(!playerMesh)return;

  const speed=player.vel.length();
  const runAmount=player.grounded?clamp(speed/14,0,1):0;
  const swingPose=!!swingAnchor;
  const airborne=!player.grounded;
  const phase=t*(6.8+runAmount*1.9);
  let activeSwingSide=1;

  if(swingAnchor){
    const toAnchor=swingAnchor.clone().sub(player.pos);
    const right=new THREE.Vector3(-player.facing.z,0,player.facing.x).normalize();
    activeSwingSide=toAnchor.dot(right)>=0?1:-1;
  }

  for(const part of playerMesh.children){
    if(part.userData.kind==="arm"){
      const side=part.userData.side;
      const elbow=part.userData.elbow;

      let shoulderX=0;
      let shoulderZ=side*.075;
      let elbowX=-.22;

      if(swingPose){
        const active=side===activeSwingSide;
        shoulderX=active?2.28:-.72;
        shoulderZ=side*(active?.17:.14);
        elbowX=active?-.34:-.58;
      }else if(airborne){
        shoulderX=side*.16+clamp(-player.vel.y*.014,-.24,.24);
        shoulderZ=side*.10;
        elbowX=-.58;
      }else{
        const armCycle=Math.sin(phase+side*1.57);
        shoulderX=armCycle*.52*runAmount;
        shoulderZ=side*(.075+.022*runAmount);
        elbowX=-.20-Math.max(0,armCycle)*.40*runAmount;
      }

      part.rotation.x=THREE.MathUtils.damp(part.rotation.x,shoulderX,8.5,dt);
      part.rotation.z=THREE.MathUtils.damp(part.rotation.z,shoulderZ,8.5,dt);
      if(elbow)elbow.rotation.x=THREE.MathUtils.damp(elbow.rotation.x,elbowX,9.5,dt);
    }

    if(part.userData.kind==="leg"){
      const side=part.userData.side;
      const knee=part.userData.knee;

      let hipX=0;
      let kneeX=.06;

      if(swingPose){
        hipX=side===activeSwingSide?.24:-.30;
        kneeX=side===activeSwingSide?-.62:-.30;
      }else if(airborne){
        hipX=side*.18+clamp(-player.vel.y*.010,-.13,.15);
        kneeX=side>0?-.48:-.24;
      }else{
        const stride=Math.sin(phase-side*1.57);
        hipX=stride*.54*runAmount;
        kneeX=-Math.max(0,-stride)*.56*runAmount-.04;
      }

      part.rotation.x=THREE.MathUtils.damp(part.rotation.x,hipX,8.2,dt);
      part.rotation.z=THREE.MathUtils.damp(part.rotation.z,side*.012*runAmount,8.2,dt);
      if(knee)knee.rotation.x=THREE.MathUtils.damp(knee.rotation.x,kneeX,9,dt);
    }
  }

  const bodyPitch = swingPose
    ? -.12
    : player.grounded
      ? clamp(-speed*.0055,-.075,0)
      : clamp(-player.vel.y*.011,-.18,.18);

  playerMesh.rotation.x=THREE.MathUtils.damp(playerMesh.rotation.x,bodyPitch,5.5,dt);

  if(player.grounded && runAmount>.05){
    playerMesh.position.y+=Math.abs(Math.sin(phase*2))*.016*runAmount;
  }
}
function showWin(){
  started=false;hud.classList.add("hidden");mobileUI.classList.add("hidden");winScreen.classList.remove("hidden");
  el("finalScore").textContent=String(Math.floor(score));
  if(document.pointerLockElement)document.exitPointerLock();
}

function toast(msg){
  toastEl.textContent=msg;toastEl.classList.add("show");toastTimer=3.2;
}
function beep(freq,dur){
  if(!audioCtx)return;
  try{
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type="sine";o.frequency.value=freq;g.gain.setValueAtTime(.035,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);
    o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur);
  }catch(_){}
}
function onResize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
function loop(){
  const dt=Math.min(.033,clock.getDelta()||.016),t=clock.elapsedTime;
  updateWorld(dt,t);
  if(started&&!won){
    updatePlayer(dt);updateEnemies(dt);updateProjectiles(dt);updateMission(dt,t);updateCollectibles(dt);updateCamera(dt);animateScene(dt,t);updateHUD();drawMap();
  }else if(player){animateScene(dt,t);updateCamera(dt);}
  renderer.render(scene,camera);
}

el("startBtn").addEventListener("click",startGame);
el("restartBtn").addEventListener("click",()=>{mobileUI.classList.toggle("hidden",!isTouch);startGame();});

init();