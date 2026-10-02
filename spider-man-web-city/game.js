import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { createCityWorld } from "./world-v2.js?v=2.0";

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
let worldVisuals;
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
  camera = new THREE.PerspectiveCamera(68, innerWidth/innerHeight, 0.1, 900);
  renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:"high-performance"});
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch?1.35:1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  gameEl.appendChild(renderer.domElement);

  worldVisuals = createCityWorld(THREE, scene, renderer, isTouch);
  city = worldVisuals.city;
  createPlayer();
  createCollectibles();
  setupMission0();
  setupInput();
  clock = new THREE.Clock();
  window.addEventListener("resize", onResize);
  renderer.setAnimationLoop(loop);
}

function updateWorld(dt,t){
  worldVisuals.update(dt,t,player && player.pos);
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