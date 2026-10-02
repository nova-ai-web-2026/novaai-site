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
  scene.background = new THREE.Color(0x07111f);
  scene.fog = new THREE.FogExp2(0x07111f, 0.0065);

  camera = new THREE.PerspectiveCamera(68, innerWidth/innerHeight, 0.1, 650);
  renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:"high-performance"});
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  gameEl.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0x8fc6ff, 0x101018, 1.35);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9be, 2.2);
  sun.position.set(-70,110,35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048);
  sun.shadow.camera.left = -180;
  sun.shadow.camera.right = 180;
  sun.shadow.camera.top = 180;
  sun.shadow.camera.bottom = -180;
  scene.add(sun);

  createGround();
  createCity();
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
    new THREE.PlaneGeometry(500,500),
    new THREE.MeshStandardMaterial({color:0x10151e, roughness:0.92, metalness:0.02})
  );
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  scene.add(ground);

  const gridMat = new THREE.LineBasicMaterial({color:0x28313f, transparent:true, opacity:.26});
  const grid = new THREE.GridHelper(480,48,0x39495d,0x222b36);
  grid.material = gridMat;
  grid.position.y = .02;
  scene.add(grid);

  for(let i=-6;i<=6;i++){
    const roadA = new THREE.Mesh(new THREE.PlaneGeometry(10,480),new THREE.MeshStandardMaterial({color:0x080b11,roughness:1}));
    roadA.rotation.x=-Math.PI/2; roadA.position.set(i*32+16,.035,0); scene.add(roadA);
    const roadB = roadA.clone(); roadB.geometry = new THREE.PlaneGeometry(480,10); roadB.position.set(0,.036,i*32+16); scene.add(roadB);
  }
}

function buildingMaterial(h){
  const palette = [0x172332,0x243146,0x30384a,0x1d2b3f,0x3b3440,0x2b3841];
  const c = palette[Math.floor(Math.random()*palette.length)];
  return new THREE.MeshStandardMaterial({color:c,roughness:.74,metalness:.12,emissive:new THREE.Color(0x020304)});
}

function addWindows(mesh,w,h,d){
  const count = Math.max(2,Math.floor(h/5));
  const mat = new THREE.MeshBasicMaterial({color:0x9bc7ff,transparent:true,opacity:rand(.16,.42)});
  for(let i=0;i<count;i++){
    if(Math.random()<.24) continue;
    const y=2.5+i*5;
    const a = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(3,w*.55),1.05),mat);
    a.position.set(0,y,h/2*0 + d/2+.012); a.rotation.y=0; mesh.add(a);
    const b = a.clone(); b.position.z = -d/2-.012; b.rotation.y=Math.PI; mesh.add(b);
  }
}

function createCity(){
  const boxGeoCache = new Map();
  for(let ix=-6;ix<=6;ix++){
    for(let iz=-6;iz<=6;iz++){
      if(Math.abs(ix)<=0 && Math.abs(iz)<=0) continue;
      const x=ix*32, z=iz*32;
      const w=rand(17,23.5), d=rand(17,23.5);
      let h=rand(18,72);
      if(Math.abs(ix)+Math.abs(iz)>8) h*=.72;
      if(Math.random()<.08) h=rand(80,112);
      const geo = new THREE.BoxGeometry(w,h,d);
      const mesh = new THREE.Mesh(geo,buildingMaterial(h));
      mesh.position.set(x,h/2,z);
      mesh.castShadow=true; mesh.receiveShadow=true;
      addWindows(mesh,w,h,d);
      scene.add(mesh);
      city.push({mesh,x,z,w,d,h});
      if(Math.random()<.2){
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w*.38,1.4,d*.35),new THREE.MeshStandardMaterial({color:0x0d1118,roughness:.9}));
        roof.position.set(x,h+.7,z); roof.castShadow=true; scene.add(roof);
      }
    }
  }
  const tower = city.reduce((a,b)=>a.h>b.h?a:b);
  tower.h += 18;
  tower.mesh.scale.y = tower.h / tower.mesh.geometry.parameters.height;
  tower.mesh.position.y = tower.h/2;
}

function limb(color, r, len){
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r,len,5,8),new THREE.MeshStandardMaterial({color,roughness:.52,metalness:.03}));
  m.castShadow=true; return m;
}

function createPlayer(){
  player = {
    pos:new THREE.Vector3(0,2,0),
    vel:new THREE.Vector3(),
    grounded:false,
    facing:new THREE.Vector3(0,0,-1)
  };
  playerMesh = new THREE.Group();
  const red = 0xd31131, blue=0x153d8b, dark=0x080b12;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.55,.95,7,12),new THREE.MeshStandardMaterial({color:red,roughness:.45}));
  torso.position.y=.2; torso.castShadow=true; playerMesh.add(torso);
  const hips = new THREE.Mesh(new THREE.BoxGeometry(.85,.55,.52),new THREE.MeshStandardMaterial({color:blue,roughness:.5}));
  hips.position.y=-.72; hips.castShadow=true; playerMesh.add(hips);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.43,20,14),new THREE.MeshStandardMaterial({color:red,roughness:.42}));
  head.position.y=1.4; head.scale.set(.85,1.08,.9); head.castShadow=true; playerMesh.add(head);

  const eyeMat = new THREE.MeshBasicMaterial({color:0xffffff});
  for(const sx of [-1,1]){
    const eye = new THREE.Mesh(new THREE.PlaneGeometry(.14,.28),eyeMat);
    eye.position.set(sx*.19,1.46,-.37); eye.rotation.y = sx*.22; playerMesh.add(eye);
  }

  const armL=limb(red,.18,.75), armR=limb(red,.18,.75);
  armL.position.set(-.72,.25,0); armR.position.set(.72,.25,0);
  armL.rotation.z=-.18; armR.rotation.z=.18; playerMesh.add(armL,armR);
  const legL=limb(blue,.22,.85), legR=limb(blue,.22,.85);
  legL.position.set(-.27,-1.35,0); legR.position.set(.27,-1.35,0); playerMesh.add(legL,legR);

  const spider = new THREE.Mesh(new THREE.BoxGeometry(.16,.48,.08),new THREE.MeshBasicMaterial({color:dark}));
  spider.position.set(0,.35,-.52); playerMesh.add(spider);
  playerMesh.scale.set(.95,.95,.95);
  scene.add(playerMesh);

  const webGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
  webLine = new THREE.Line(webGeo,new THREE.LineBasicMaterial({color:0xeaf7ff,transparent:true,opacity:.92}));
  webLine.visible=false; scene.add(webLine);
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

  playerMesh.position.copy(player.pos);
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
  for(const b of city){
    if(b.mesh.children.length)for(const ch of b.mesh.children)ch.material.opacity=.18+.18*(.5+.5*Math.sin(t*.35+b.x*.03+b.z*.02));
  }
  playerMesh.children.forEach((m,i)=>{
    if(i>=3&&i<=6)m.rotation.x=Math.sin(t*8+i)*(player.grounded?Math.min(.5,player.vel.length()*.03):.18);
  });
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
  if(started&&!won){
    updatePlayer(dt);updateEnemies(dt);updateProjectiles(dt);updateMission(dt,t);updateCollectibles(dt);updateCamera(dt);animateScene(dt,t);updateHUD();drawMap();
  }else if(player){animateScene(dt,t);updateCamera(dt);}
  renderer.render(scene,camera);
}

el("startBtn").addEventListener("click",startGame);
el("restartBtn").addEventListener("click",()=>{mobileUI.classList.toggle("hidden",!isTouch);startGame();});

init();