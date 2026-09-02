import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.min.js';

const $ = (s) => document.querySelector(s);
const screens = { menu: $('#menu'), select: $('#select'), game: $('#game') };
const teams = [
  {name:'Nova City',short:'NOVA',a:0xb8ff38,b:0x2ce5b1,rating:84},
  {name:'Orbit United',short:'ORBT',a:0x36e8ff,b:0x7057ff,rating:82},
  {name:'Metro Athletic',short:'MTRA',a:0xff5b68,b:0xffb25b,rating:83},
  {name:'Harbour FC',short:'HBR',a:0x6fa8ff,b:0xd6e7ff,rating:80},
  {name:'Royal Vale',short:'VALE',a:0xffd166,b:0xfff0aa,rating:85},
  {name:'Pulse 04',short:'PLS',a:0xec5cff,b:0xff9eea,rating:81},
  {name:'Northstar',short:'NSTR',a:0xf1f5f9,b:0x86efac,rating:79},
  {name:'Redline SC',short:'RDLN',a:0xff365d,b:0x8b1735,rating:84},
];

let mode='quick', selected=0, cupStage=Number(localStorage.pitch27CupStage||0), raf=0, last=0;
let renderer, scene, camera, world, ballMesh, indicator, quality='high';
const playerMeshes=[];
const FIELD={halfL:50,halfW:32,goalHalf:7.3,goalH:2.7};
const state={running:false,paused:false,time:0,duration:180,score:[0,0],players:[],ball:null,controlled:3,joy:{x:0,y:0},sprint:false,homeTeam:0,awayTeam:1};

function show(name){Object.values(screens).forEach(s=>s.classList.remove('active'));screens[name].classList.add('active')}
function buildTeams(){
  $('#teams').innerHTML=teams.map((t,i)=>`<button class="team ${i===selected?'selected':''}" data-i="${i}" style="--team1:#${t.a.toString(16).padStart(6,'0')};--team2:#${t.b.toString(16).padStart(6,'0')}"><div class="crest">${t.short.slice(0,2)}</div><b>${t.name}</b><span>OVR ${t.rating}</span></button>`).join('');
  document.querySelectorAll('.team').forEach(el=>el.onclick=()=>{selected=+el.dataset.i;buildTeams()});
}

document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;buildTeams();show('select')});
$('#backMenu').onclick=()=>show('menu');
$('#randomTeam').onclick=()=>{selected=Math.floor(Math.random()*teams.length);buildTeams()};
$('#kickoff').onclick=()=>startMatch();

function mat(color,rough=.72,metal=.02){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal})}
function mesh(geo,material,cast=true,receive=true){const m=new THREE.Mesh(geo,material);m.castShadow=cast;m.receiveShadow=receive;return m}

function init3D(){
  const canvas=$('#stage');
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  quality=(navigator.deviceMemory&&navigator.deviceMemory<=4)?'balanced':'high';
  renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='high'?1.45:1.1));
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x07100d);
  scene.fog=new THREE.Fog(0x07100d,95,180);
  camera=new THREE.PerspectiveCamera(46,innerWidth/innerHeight,.1,260);
  camera.position.set(-8,30,44);
  scene.add(new THREE.HemisphereLight(0xcde8ff,0x173324,1.75));
  const sun=new THREE.DirectionalLight(0xffffff,2.15);sun.position.set(-30,55,26);sun.castShadow=true;
  sun.shadow.mapSize.set(quality==='high'?2048:1024,quality==='high'?2048:1024);
  sun.shadow.camera.left=-80;sun.shadow.camera.right=80;sun.shadow.camera.top=60;sun.shadow.camera.bottom=-60;scene.add(sun);
  buildWorld();resize3D();addEventListener('resize',resize3D);
}

function buildWorld(){
  world=new THREE.Group();scene.add(world);
  const outer=mesh(new THREE.PlaneGeometry(160,118),mat(0x14271d,.98),false,true);outer.rotation.x=-Math.PI/2;outer.position.y=-.06;world.add(outer);
  const pitch=mesh(new THREE.PlaneGeometry(104,68),mat(0x146b40,.93),false,true);pitch.rotation.x=-Math.PI/2;world.add(pitch);
  for(let i=0;i<13;i++){const stripe=mesh(new THREE.PlaneGeometry(8,67.8),new THREE.MeshBasicMaterial({color:i%2?0x176e42:0x115f38,transparent:true,opacity:.28}),false,false);stripe.rotation.x=-Math.PI/2;stripe.position.set(-48+i*8,.012,0);world.add(stripe)}
  const lineMat=new THREE.LineBasicMaterial({color:0xf2fff6,transparent:true,opacity:.95});
  const line=(pts)=>{const g=new THREE.BufferGeometry().setFromPoints(pts.map(([x,z])=>new THREE.Vector3(x,.035,z)));world.add(new THREE.Line(g,lineMat))};
  line([[-50,-32],[50,-32],[50,32],[-50,32],[-50,-32]]);line([[0,-32],[0,32]]);
  line([[-50,-19],[-38,-19],[-38,19],[-50,19]]);line([[50,-19],[38,-19],[38,19],[50,19]]);
  line([[-50,-9],[-44,-9],[-44,9],[-50,9]]);line([[50,-9],[44,-9],[44,9],[50,9]]);
  const circle=[];for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;circle.push([Math.cos(a)*9.15,Math.sin(a)*9.15])}line(circle);
  const spot=mesh(new THREE.CircleGeometry(.25,16),new THREE.MeshBasicMaterial({color:0xffffff}),false,false);spot.rotation.x=-Math.PI/2;spot.position.y=.04;world.add(spot);
  buildGoal(-51.1,Math.PI/2);buildGoal(51.1,-Math.PI/2);buildStands();buildLights();
}

function buildGoal(x,rot){
  const g=new THREE.Group();g.position.x=x;g.rotation.y=rot;
  const white=mat(0xf8fff9,.35,.08);const bar=(sx,sy,sz,px,py,pz)=>{const b=mesh(new THREE.BoxGeometry(sx,sy,sz),white);b.position.set(px,py,pz);g.add(b)};
  bar(.16,2.7,.16,0,1.35,-7.3);bar(.16,2.7,.16,0,1.35,7.3);bar(.16,.16,14.7,0,2.7,0);
  bar(2.5,.10,.10,-1.25,.10,-7.3);bar(2.5,.10,.10,-1.25,.10,7.3);
  const netMat=new THREE.LineBasicMaterial({color:0xd9ffe7,transparent:true,opacity:.24});
  for(let z=-7.3;z<=7.31;z+=1.22){const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,.15,z),new THREE.Vector3(-2.4,.15,z),new THREE.Vector3(-2.4,2.5,z)]);g.add(new THREE.Line(geo,netMat))}
  world.add(g);
}

function buildStands(){
  const seat1=mat(0x27372f,.92),seat2=mat(0x31483c,.92),baseMat=mat(0x17241e,.96);
  const addStand=(w,d,x,z,ry=0)=>{const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;for(let i=0;i<5;i++){const tier=mesh(new THREE.BoxGeometry(w,1.65,d),i%2?seat1:seat2,false,true);tier.position.set(0,.82+i*1.3,-i*1.05);g.add(tier)}const base=mesh(new THREE.BoxGeometry(w,1,d+6),baseMat,false,true);base.position.y=.5;g.add(base);world.add(g)};
  addStand(114,6,0,-41);addStand(114,6,0,41,Math.PI);addStand(70,6,-61,0,Math.PI/2);addStand(70,6,61,0,-Math.PI/2);
}
function buildLights(){const poleMat=mat(0x65766d,.55,.35);[[-56,-39],[-56,39],[56,-39],[56,39]].forEach(([x,z])=>{const p=mesh(new THREE.CylinderGeometry(.16,.26,17,8),poleMat,false,true);p.position.set(x,8.5,z);world.add(p);const rig=mesh(new THREE.BoxGeometry(4.4,.45,.7),mat(0xeafff3,.28,.16),false,false);rig.position.set(x,17,z);world.add(rig);const glow=new THREE.PointLight(0xeafff5,.45,70,2);glow.position.set(x,16,z);scene.add(glow)})}

function limb(radius,length,material){return mesh(new THREE.CapsuleGeometry(radius,length,4,8),material)}
function createPlayerVisual(teamIdx){
  const t=teams[teamIdx],g=new THREE.Group();
  const skin=mat(0xd99f76,.78),shirt=mat(t.a,.55),shorts=mat(t.b,.65),sock=mat(t.a,.7),boot=mat(0x111718,.42,.08),hairMat=mat(0x201713,.9);
  const hips=mesh(new THREE.BoxGeometry(.86,.56,.74),shorts);hips.position.y=1.5;g.add(hips);
  const torso=mesh(new THREE.CapsuleGeometry(.52,.92,5,10),shirt);torso.scale.set(1.05,1.02,.83);torso.position.y=2.25;g.add(torso);
  const neck=mesh(new THREE.CylinderGeometry(.18,.2,.22,10),skin);neck.position.y=2.98;g.add(neck);
  const head=mesh(new THREE.SphereGeometry(.39,16,12),skin);head.position.y=3.34;g.add(head);
  const hair=mesh(new THREE.SphereGeometry(.405,16,10,0,Math.PI*2,0,Math.PI*.5),hairMat);hair.position.y=3.43;g.add(hair);
  g.userData.legs=[];g.userData.arms=[];
  [-.25,.25].forEach((z)=>{const pivot=new THREE.Group();pivot.position.set(0,1.3,z);const thigh=limb(.17,.55,skin);thigh.position.y=-.28;pivot.add(thigh);const shin=limb(.15,.54,sock);shin.position.y=-.82;pivot.add(shin);const foot=mesh(new THREE.BoxGeometry(.48,.2,.28),boot);foot.position.set(.15,-1.12,0);pivot.add(foot);g.add(pivot);g.userData.legs.push(pivot)});
  [-.66,.66].forEach((z)=>{const pivot=new THREE.Group();pivot.position.set(0,2.62,z);pivot.rotation.z=Math.PI/2;const upper=limb(.13,.52,shirt);upper.position.y=-.22;pivot.add(upper);const fore=limb(.12,.48,skin);fore.position.y=-.7;pivot.add(fore);g.add(pivot);g.userData.arms.push(pivot)});
  return g;
}

function rebuildActors(){
  playerMeshes.forEach(m=>scene.remove(m));playerMeshes.length=0;
  state.players.forEach(p=>{const v=createPlayerVisual(p.team?state.awayTeam:state.homeTeam);scene.add(v);playerMeshes.push(v)});
  if(ballMesh)scene.remove(ballMesh);ballMesh=mesh(new THREE.SphereGeometry(.45,24,18),mat(0xffffff,.42,.02));scene.add(ballMesh);
  if(indicator)scene.remove(indicator);indicator=mesh(new THREE.RingGeometry(.72,.96,40),new THREE.MeshBasicMaterial({color:0xb8ff38,side:THREE.DoubleSide,transparent:true,opacity:.9}),false,false);indicator.rotation.x=-Math.PI/2;scene.add(indicator);
}
function resize3D(){if(!renderer||!camera)return;const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
function randOpponent(){let n;do n=Math.floor(Math.random()*teams.length);while(n===selected);return n}

function setupMatch(){
  state.players=[];const form=[[-40,0],[-22,-17],[-22,17],[-7,-9],[-7,9]];
  for(let team=0;team<2;team++)for(let i=0;i<5;i++){const [x,z]=form[i];state.players.push({team,i,x:team?-x:x,z,vx:0,vz:0,has:false,cool:0,face:team?Math.PI:0,anim:Math.random()*6.2})}
  state.ball={x:-3,y:.45,z:-4,vx:0,vy:0,vz:0,owner:3,lastTeam:0,lastTouch:0};state.controlled=3;state.players[3].has=true;
}
function startMatch(){cancelAnimationFrame(raf);show('game');state.homeTeam=selected;state.awayTeam=randOpponent();state.duration=mode==='training'?Infinity:mode==='tournament'?150:180;state.time=0;state.score=[0,0];state.running=true;state.paused=false;state.sprint=false;setupMatch();rebuildActors();updateHud();$('#pauseOverlay').classList.remove('show');$('#resultOverlay').classList.remove('show');$('#modeChip').textContent=mode==='tournament'?`CUP • ROUND ${cupStage+1}/3`:mode==='training'?'TRAINING':'QUICK MATCH';last=performance.now();raf=requestAnimationFrame(loop)}
function nearest(team,x=state.ball.x,z=state.ball.z){let best=-1,bd=1e9;state.players.forEach((p,i)=>{if(p.team!==team)return;const d=(p.x-x)**2+(p.z-z)**2;if(d<bd){bd=d;best=i}});return best}
function switchPlayer(){const n=nearest(0);if(n>=0)state.controlled=n}

function detachBall(p,dx,dz,power,lift){state.ball.owner=-1;p.has=false;state.ball.x=p.x+dx*.9;state.ball.z=p.z+dz*.9;state.ball.y=.46;state.ball.vx=dx*power+p.vx*.35;state.ball.vz=dz*power+p.vz*.35;state.ball.vy=lift;state.ball.lastTeam=p.team;state.ball.lastTouch=.18;p.cool=.16}
function kick(kind){
  const p=state.players[state.controlled];if(!p||state.ball.owner!==state.controlled)return;
  let tx,tz;
  if(kind==='shot'){tx=51.5;tz=THREE.MathUtils.clamp(p.z*.08,-5.4,5.4)}
  else{const mates=state.players.filter(q=>q.team===0&&q!==p).sort((a,b)=>((b.x-p.x)*1.9-Math.abs(b.z-p.z))-((a.x-p.x)*1.9-Math.abs(a.z-p.z)));const target=mates[0];tx=target?target.x:Math.min(47,p.x+18);tz=target?target.z:p.z}
  let dx=tx-p.x,dz=tz-p.z,l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;detachBall(p,dx,dz,kind==='shot'?28.5:18.5,kind==='shot'?6.3:1.4);if(navigator.vibrate)navigator.vibrate(kind==='shot'?18:8);
}

function steerPlayer(p,tx,tz,dt,maxSpeed,accel){
  const dx=tx-p.x,dz=tz-p.z,l=Math.hypot(dx,dz)||1;const desX=dx/l*maxSpeed,desZ=dz/l*maxSpeed;
  const blend=1-Math.exp(-accel*dt);p.vx+= (desX-p.vx)*blend;p.vz+=(desZ-p.vz)*blend;
}
function ai(dt){
  state.players.forEach((p,i)=>{p.cool=Math.max(0,p.cool-dt);if(i===state.controlled&&p.team===0)return;
    if(state.ball.owner===i){const dir=p.team?-1:1;const goalX=dir*46;steerPlayer(p,goalX,p.z*.7,dt,p.i===0?8.2:10.4,3.8);if((p.team===1&&p.x<-34)||(p.team===0&&p.x>34)){if(Math.random()<dt*.65){const gx=p.team?-51.5:51.5,gz=(Math.random()-.5)*9,l=Math.hypot(gx-p.x,gz-p.z)||1;detachBall(p,(gx-p.x)/l,(gz-p.z)/l,27,5.4)}}
    }else{const chase=nearest(p.team)===i;if(chase){steerPlayer(p,state.ball.x,state.ball.z,dt,p.i===0?8.1:10.1,3.2)}else{const base=[-40,-22,-22,-7,-7][p.i]*(p.team?-1:1),bz=[0,-17,17,-9,9][p.i];const bx=base+state.ball.x*(p.i===0?.06:.24),bz2=bz+state.ball.z*.12;steerPlayer(p,bx,bz2,dt,p.i===0?7.8:9.1,2.5)}}
  });
}

function resolvePlayerCollisions(){
  const minDist=1.2;
  for(let i=0;i<state.players.length;i++)for(let j=i+1;j<state.players.length;j++){
    const a=state.players[i],b=state.players[j];let dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(!d||d>=minDist)continue;dx/=d;dz/=d;const push=(minDist-d)*.5;a.x-=dx*push;a.z-=dz*push;b.x+=dx*push;b.z+=dz*push;a.vx*=.72;a.vz*=.72;b.vx*=.72;b.vz*=.72;
  }
}
function tryPossession(){
  if(state.ball.owner>=0||state.ball.y>.82||state.ball.lastTouch>0)return;
  let best=-1,bd=1e9;state.players.forEach((p,i)=>{if(p.cool>0)return;const d=(p.x-state.ball.x)**2+(p.z-state.ball.z)**2;if(d<bd){bd=d;best=i}});
  if(best>=0&&bd<1.35*1.35){const p=state.players[best];state.ball.owner=best;p.has=true;state.ball.vx=state.ball.vz=state.ball.vy=0;state.ball.lastTeam=p.team;if(p.team===0)state.controlled=best}
}
function trySteal(){
  if(state.ball.owner<0)return;const owner=state.players[state.ball.owner];if(owner.cool>0)return;for(let i=0;i<state.players.length;i++){const p=state.players[i];if(p.team===owner.team||p.cool>0)continue;const d=(p.x-owner.x)**2+(p.z-owner.z)**2;if(d<.95*.95){owner.has=false;owner.cool=.4;p.cool=.28;state.ball.owner=i;p.has=true;state.ball.lastTeam=p.team;if(p.team===0)state.controlled=i;break}}
}
function goalOrBounds(){
  const b=state.ball;
  if(Math.abs(b.x)>FIELD.halfL+.25){
    if(Math.abs(b.z)<=FIELD.goalHalf&&b.y<=FIELD.goalH){const scoring=b.x>0?0:1;state.score[scoring]++;toast(scoring===0?'GOAL!':'Opponent scores');kickoffReset();updateHud();return}
    b.x=THREE.MathUtils.clamp(b.x,-FIELD.halfL+.15,FIELD.halfL-.15);b.vx*=-.48;
  }
  if(Math.abs(b.z)>FIELD.halfW){b.z=THREE.MathUtils.clamp(b.z,-FIELD.halfW+.1,FIELD.halfW-.1);b.vz*=-.48}
}
function kickoffReset(){state.players.forEach(p=>{p.has=false;p.vx=p.vz=0});const form=[[-40,0],[-22,-17],[-22,17],[-7,-9],[-7,9]];state.players.forEach(p=>{const [x,z]=form[p.i];p.x=p.team?-x:x;p.z=z});state.controlled=3;state.players[3].has=true;state.ball={x:-3,y:.45,z:-4,vx:0,vy:0,vz:0,owner:3,lastTeam:0,lastTouch:.25}}

function update(dt){
  if(!state.running||state.paused)return;
  if(mode!=='training'){state.time+=dt;if(state.time>=state.duration){state.time=state.duration;finishMatch();return}}else state.time+=dt;
  if(state.ball.lastTouch>0)state.ball.lastTouch=Math.max(0,state.ball.lastTouch-dt);
  const cp=state.players[state.controlled];let mx=state.joy.x,mz=state.joy.y,ml=Math.hypot(mx,mz);if(ml>1){mx/=ml;mz/=ml}
  const maxSpeed=state.sprint?12.8:9.5,accel=state.sprint?7.2:8.7;const desiredX=mx*maxSpeed,desiredZ=mz*maxSpeed;const blend=1-Math.exp(-accel*dt);cp.vx+=(desiredX-cp.vx)*blend;cp.vz+=(desiredZ-cp.vz)*blend;if(ml<.05){const damp=Math.exp(-6.2*dt);cp.vx*=damp;cp.vz*=damp}
  ai(dt);
  state.players.forEach(p=>{const drag=Math.exp(-1.15*dt);p.vx*=drag;p.vz*=drag;const sp=Math.hypot(p.vx,p.vz),limit=(p===cp&&state.sprint)?12.8:10.5;if(sp>limit){p.vx=p.vx/sp*limit;p.vz=p.vz/sp*limit}p.x+=p.vx*dt;p.z+=p.vz*dt;p.x=THREE.MathUtils.clamp(p.x,-49,49);p.z=THREE.MathUtils.clamp(p.z,-31,31);if(sp>.35)p.face=Math.atan2(p.vz,p.vx);p.anim+=sp*dt*1.25});
  resolvePlayerCollisions();
  if(state.ball.owner>=0){const op=state.players[state.ball.owner];const fx=Math.cos(op.face),fz=Math.sin(op.face);state.ball.x=op.x+fx*.82;state.ball.z=op.z+fz*.82;state.ball.y=.46}
  else{state.ball.vy-=14.4*dt;state.ball.x+=state.ball.vx*dt;state.ball.z+=state.ball.vz*dt;state.ball.y+=state.ball.vy*dt;if(state.ball.y<.45){state.ball.y=.45;if(Math.abs(state.ball.vy)>.8)state.ball.vy*=-.42;else state.ball.vy=0;const roll=Math.exp(-2.05*dt);state.ball.vx*=roll;state.ball.vz*=roll}}
  goalOrBounds();tryPossession();trySteal();
  if(mode!=='training')updateHud();
}

const camTarget=new THREE.Vector3();const camDesired=new THREE.Vector3();
function updateCamera(dt){
  const b=state.ball,cp=state.players[state.controlled];if(!b||!cp)return;
  const targetX=THREE.MathUtils.lerp(cp.x,b.x,.62),targetZ=THREE.MathUtils.lerp(cp.z,b.z,.62);
  camTarget.set(THREE.MathUtils.clamp(targetX,-38,38),1.1,THREE.MathUtils.clamp(targetZ,-20,20));
  const side=b.z>=0?1:-1;camDesired.set(THREE.MathUtils.clamp(targetX-4,-42,42),31,side*46);
  const posBlend=1-Math.exp(-2.1*dt);camera.position.lerp(camDesired,posBlend);
  const look=new THREE.Vector3(camTarget.x+7,camTarget.y,camTarget.z);camera.lookAt(look);
}

function syncVisuals(dt){
  state.players.forEach((p,i)=>{const m=playerMeshes[i];m.position.set(p.x,0,p.z);m.rotation.y=-p.face;const speed=Math.hypot(p.vx,p.vz);const swing=Math.sin(p.anim)*(Math.min(1,speed/8)*.55);if(m.userData.legs){m.userData.legs[0].rotation.z=swing;m.userData.legs[1].rotation.z=-swing}if(m.userData.arms){m.userData.arms[0].rotation.x=-swing*.55;m.userData.arms[1].rotation.x=swing*.55}});
  if(ballMesh){ballMesh.position.set(state.ball.x,state.ball.y,state.ball.z);const rollSpeed=Math.hypot(state.ball.vx,state.ball.vz);ballMesh.rotation.z+=rollSpeed*dt*1.7;ballMesh.rotation.x+=state.ball.vz*dt*1.15}
  if(indicator){const p=state.players[state.controlled];indicator.position.set(p.x,.035,p.z);indicator.scale.setScalar(1+Math.sin(performance.now()*.006)*.05)}
}

function updateHud(){const rem=mode==='training'?state.time:Math.max(0,state.duration-state.time),m=Math.floor(rem/60),s=Math.floor(rem%60);$('#time').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;$('#score').textContent=`${state.score[0]} — ${state.score[1]}`;$('#homeName').textContent=teams[state.homeTeam].short;$('#awayName').textContent=teams[state.awayTeam].short}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1100)}
function finishMatch(){state.running=false;cancelAnimationFrame(raf);const a=state.score[0],b=state.score[1];let title=a>b?'YOU WIN':a<b?'DEFEAT':'DRAW';$('#resultTitle').textContent=title;$('#resultText').textContent=`${teams[state.homeTeam].name} ${a} — ${b} ${teams[state.awayTeam].name}`;$('#nextCup').style.display='none';if(mode==='tournament'&&a>b){cupStage++;if(cupStage>=3){localStorage.pitch27CupStage='0';cupStage=0;$('#resultTitle').textContent='CUP CHAMPIONS';}else{localStorage.pitch27CupStage=String(cupStage);$('#nextCup').style.display='block'}}$('#resultOverlay').classList.add('show')}

function loop(now){const dt=Math.min(.033,Math.max(.001,(now-last)/1000||.016));last=now;update(dt);syncVisuals(dt);updateCamera(dt);renderer.render(scene,camera);if(state.running)raf=requestAnimationFrame(loop)}

function bindHold(id,key){const el=$(id);const down=()=>{el.classList.add('down');if(key==='sprint')state.sprint=true};const up=()=>{el.classList.remove('down');if(key==='sprint')state.sprint=false};el.addEventListener('pointerdown',e=>{e.preventDefault();down()});['pointerup','pointercancel','pointerleave'].forEach(ev=>el.addEventListener(ev,up))}
bindHold('#sprint','sprint');$('#shoot').addEventListener('pointerdown',e=>{e.preventDefault();$('#shoot').classList.add('down');kick('shot')});$('#shoot').addEventListener('pointerup',()=>$('#shoot').classList.remove('down'));$('#pass').addEventListener('pointerdown',e=>{e.preventDefault();$('#pass').classList.add('down');kick('pass')});$('#pass').addEventListener('pointerup',()=>$('#pass').classList.remove('down'));$('#switch').addEventListener('pointerdown',e=>{e.preventDefault();switchPlayer()});

const joy=$('#joy'),knob=joy.querySelector('.joy-knob');let joyPid=null;
function setJoy(e){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;const max=r.width*.34,l=Math.hypot(dx,dy);if(l>max){dx=dx/l*max;dy=dy/l*max}state.joy.x=dx/max;state.joy.y=dy/max;knob.style.transform=`translate(${dx}px,${dy}px)`}
joy.addEventListener('pointerdown',e=>{joyPid=e.pointerId;joy.setPointerCapture(e.pointerId);setJoy(e)});joy.addEventListener('pointermove',e=>{if(e.pointerId===joyPid)setJoy(e)});function clearJoy(e){if(joyPid!==null&&(!e||e.pointerId===joyPid)){joyPid=null;state.joy.x=state.joy.y=0;knob.style.transform='translate(0,0)'}}joy.addEventListener('pointerup',clearJoy);joy.addEventListener('pointercancel',clearJoy);

$('#pause').onclick=()=>{if(!state.running)return;state.paused=true;$('#pauseOverlay').classList.add('show')};$('#resume').onclick=()=>{state.paused=false;$('#pauseOverlay').classList.remove('show');last=performance.now();raf=requestAnimationFrame(loop)};$('#restart').onclick=startMatch;$('#quit').onclick=()=>{state.running=false;cancelAnimationFrame(raf);show('menu')};$('#again').onclick=startMatch;$('#nextCup').onclick=startMatch;$('#resultMenu').onclick=()=>{state.running=false;show('menu')};

addEventListener('keydown',e=>{if(!state.running)return;const k=e.key.toLowerCase();if(k==='q')switchPlayer();if(k==='x')kick('pass');if(e.code==='Space'){e.preventDefault();kick('shot')}if(k==='shift')state.sprint=true});addEventListener('keyup',e=>{if(e.key.toLowerCase()==='shift')state.sprint=false});

try{init3D();buildTeams();if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{})}catch(err){console.error(err);$('#bootReason').textContent=String(err?.message||err);$('#bootError').style.display='grid'}
