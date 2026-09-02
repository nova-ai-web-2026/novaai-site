// PITCH 27 gameplay hotfix layer.
// Loads the stable core, applies verified camera/physics/visual changes, then runs it as a module.
const response = await fetch('./game3d.js');
if (!response.ok) throw new Error(`Could not load 3D core (${response.status})`);
let code = await response.text();

function patch(from, to, label) {
  if (!code.includes(from)) throw new Error(`PITCH 27 patch target missing: ${label}`);
  code = code.replace(from, to);
}

// Wider elevated broadcast camera: keeps the ball and a large section of the pitch visible,
// and prevents the camera from travelling through player models.
patch(
  "camera=new THREE.PerspectiveCamera(54,innerWidth/innerHeight,.1,230);camera.position.set(-15,13,20);",
  "camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,260);camera.position.set(0,35,47);",
  'camera setup'
);

// More football-like player silhouette: tapered shirt, shorts, sleeves, arms, legs, socks and boots.
patch(
  "function createPlayerVisual(teamIdx){const t=teams[teamIdx],g=new THREE.Group();const skin=mat(0xd69a70,.78),shirt=mat(t.a,.57),sock=mat(t.a,.66),boot=mat(0x101817,.48,.08);const torso=mesh(new THREE.CapsuleGeometry(.56,1.05,4,8),shirt);torso.position.y=2.05;g.add(torso);const head=mesh(new THREE.SphereGeometry(.39,14,10),skin);head.position.y=3.12;g.add(head);const hair=mesh(new THREE.SphereGeometry(.405,12,8,0,Math.PI*2,0,Math.PI*.48),mat(0x201713,.88));hair.position.y=3.18;g.add(hair);g.userData.legs=[];[-.28,.28].forEach(z=>{const pivot=new THREE.Group();pivot.position.set(0,1.23,z);const leg=mesh(new THREE.CapsuleGeometry(.17,.72,3,6),sock);leg.position.y=-.45;pivot.add(leg);const foot=mesh(new THREE.BoxGeometry(.52,.22,.32),boot);foot.position.set(.15,-.93,0);pivot.add(foot);g.add(pivot);g.userData.legs.push(pivot)});return g}",
  "function createPlayerVisual(teamIdx){const t=teams[teamIdx],g=new THREE.Group();const skin=mat(0xd69a70,.8),shirt=mat(t.a,.52),shorts=mat(t.b,.62),sock=mat(t.a,.7),boot=mat(0x0b1110,.42,.12);const torso=mesh(new THREE.CylinderGeometry(.49,.62,1.12,8),shirt);torso.position.y=2.13;g.add(torso);const chest=mesh(new THREE.BoxGeometry(.82,.16,1.12),shirt);chest.position.y=2.56;g.add(chest);const waist=mesh(new THREE.BoxGeometry(.68,.48,.92),shorts);waist.position.y=1.47;g.add(waist);const neck=mesh(new THREE.CylinderGeometry(.16,.17,.18,8),skin);neck.position.y=2.78;g.add(neck);const head=mesh(new THREE.SphereGeometry(.36,14,10),skin);head.scale.set(.9,1.06,.92);head.position.y=3.15;g.add(head);const hair=mesh(new THREE.SphereGeometry(.365,12,8,0,Math.PI*2,0,Math.PI*.46),mat(0x201713,.88));hair.scale.set(.9,1,.92);hair.position.y=3.21;g.add(hair);g.userData.arms=[];[-1,1].forEach(side=>{const armPivot=new THREE.Group();armPivot.position.set(0,2.45,side*.69);const sleeve=mesh(new THREE.CylinderGeometry(.17,.2,.4,7),shirt);sleeve.position.y=-.16;armPivot.add(sleeve);const arm=mesh(new THREE.CapsuleGeometry(.105,.54,3,6),skin);arm.position.y=-.57;armPivot.add(arm);armPivot.rotation.x=side*.06;g.add(armPivot);g.userData.arms.push(armPivot)});g.userData.legs=[];[-.27,.27].forEach(z=>{const pivot=new THREE.Group();pivot.position.set(0,1.26,z);const thigh=mesh(new THREE.CapsuleGeometry(.17,.52,3,6),skin);thigh.position.y=-.32;pivot.add(thigh);const sockLeg=mesh(new THREE.CapsuleGeometry(.145,.48,3,6),sock);sockLeg.position.y=-.83;pivot.add(sockLeg);const foot=mesh(new THREE.BoxGeometry(.5,.2,.29),boot);foot.position.set(.15,-1.17,0);pivot.add(foot);g.add(pivot);g.userData.legs.push(pivot)});return g}",
  'player model'
);

// Ball scale corrected relative to the player model.
patch("ballMesh=mesh(new THREE.SphereGeometry(.62,20,14)", "ballMesh=mesh(new THREE.SphereGeometry(.44,20,14)", 'ball visual size');
patch("state.ball={x:0,y:.62,z:0", "state.ball={x:0,y:.44,z:0", 'ball kickoff height');
patch("state.ball.x=p.x+dir*1.35;state.ball.z=p.z;state.ball.y=.64", "state.ball.x=p.x+dir*1.03;state.ball.z=p.z;state.ball.y=.46", 'dribble spacing');
patch("if(state.ball.y<.62){state.ball.y=.62", "if(state.ball.y<.44){state.ball.y=.44", 'ball ground height');
patch("Object.assign(state.ball,{x:0,y:.62,z:0", "Object.assign(state.ball,{x:0,y:.44,z:0", 'reset ball height');

// Reduce arcade-like speed and excessive sliding.
patch("const speed=state.sprint?14.5:10.6;cp.vx+=(mx*speed-cp.vx)*Math.min(1,dt*8);cp.vz+=(mz*speed-cp.vz)*Math.min(1,dt*8);",
      "const speed=state.sprint?11.7:8.7;cp.vx+=(mx*speed-cp.vx)*Math.min(1,dt*12);cp.vz+=(mz*speed-cp.vz)*Math.min(1,dt*12);",
      'controlled movement');
patch("s=p.i===0?8.4:10.5;p.vx+=(dx/l*s-p.vx)*Math.min(1,dt*4);p.vz+=(dz/l*s-p.vz)*Math.min(1,dt*4)",
      "s=p.i===0?6.8:8.4;p.vx+=(dx/l*s-p.vx)*Math.min(1,dt*7);p.vz+=(dz/l*s-p.vz)*Math.min(1,dt*7)",
      'AI movement');
patch("p.vx*=Math.pow(.86,dt*8);p.vz*=Math.pow(.86,dt*8);",
      "p.vx*=Math.pow(.72,dt*8);p.vz*=Math.pow(.72,dt*8);",
      'player ground friction');

// Less pinball-like football physics: lower kick velocity, stronger gravity, softer bounce and more roll resistance.
patch("const power=kind==='shot'?35:24;state.ball.vx=dx*power;state.ball.vz=dz*power;state.ball.vy=kind==='shot'?4.8:1.1;",
      "const power=kind==='shot'?29:18.5;state.ball.vx=dx*power;state.ball.vz=dz*power;state.ball.vy=kind==='shot'?3.9:.7;",
      'user kick physics');
patch("state.ball.vy-=15.5*dt;", "state.ball.vy-=18.5*dt;", 'gravity');
patch("state.ball.vy*=-.38", "state.ball.vy*=-.22", 'ball bounce');
patch("state.ball.vx*=Math.pow(.985,dt*60);state.ball.vz*=Math.pow(.985,dt*60)",
      "state.ball.vx*=Math.pow(.972,dt*60);state.ball.vz*=Math.pow(.972,dt*60)",
      'ball roll friction');
patch("state.ball.vz*=-.55", "state.ball.vz*=-.32", 'sideline rebound');
patch("if(d<1.7&&Math.hypot(state.ball.vx,state.ball.vz)<25)",
      "if(d<1.28&&Math.hypot(state.ball.vx,state.ball.vz)<18)",
      'ball control radius');
patch("if(Math.hypot(p.x-o.x,p.z-o.z)<1.55&&Math.random()<dt*.75)",
      "if(Math.hypot(p.x-o.x,p.z-o.z)<1.24&&Math.random()<dt*.55)",
      'steal radius');

// AI shots receive the same calmer ball behaviour.
patch("state.ball.vx=(gx-p.x)/l*30;state.ball.vz=(gz-p.z)/l*30;state.ball.vy=3.8;",
      "state.ball.vx=(gx-p.x)/l*27;state.ball.vz=(gz-p.z)/l*27;state.ball.vy=3.5;",
      'AI shot physics');

// Animate arms opposite the legs and replace close follow-cam with a stable broadcast camera.
patch("v.userData.legs[0].rotation.z=swing;v.userData.legs[1].rotation.z=-swing;",
      "v.userData.legs[0].rotation.z=swing;v.userData.legs[1].rotation.z=-swing;if(v.userData.arms){v.userData.arms[0].rotation.z=-swing*.58;v.userData.arms[1].rotation.z=swing*.58;}",
      'limb animation');
patch(
  "const p=state.players[state.controlled],speed=Math.hypot(p.vx,p.vz),zoom=state.sprint?1.7:0;const desired=new THREE.Vector3(p.x-14-zoom,12.2+zoom*.35,p.z+17.2);const look=new THREE.Vector3(p.x+8+speed*.16,1.15,p.z+state.joy.y*3.6);camera.position.lerp(desired,1-Math.pow(.002,dt));const currentTarget=camera.userData.target||look.clone();currentTarget.lerp(look,1-Math.pow(.003,dt));camera.userData.target=currentTarget;camera.lookAt(currentTarget)",
  "const p=state.players[state.controlled];const focusX=state.ball.x*.72+p.x*.28,focusZ=state.ball.z*.48+p.z*.12;const camX=Math.max(-35,Math.min(35,focusX*.58));const desired=new THREE.Vector3(camX,35,47);const look=new THREE.Vector3(Math.max(-45,Math.min(45,focusX)),.45,Math.max(-17,Math.min(17,focusZ)));camera.position.lerp(desired,1-Math.pow(.018,dt));const currentTarget=camera.userData.target||look.clone();currentTarget.lerp(look,1-Math.pow(.025,dt));camera.userData.target=currentTarget;camera.lookAt(currentTarget)",
  'broadcast camera'
);

const moduleUrl = URL.createObjectURL(new Blob([code], {type:'text/javascript'}));
try {
  await import(moduleUrl);
  console.info('PITCH27_GAMEPLAY_FIX_READY');
} finally {
  URL.revokeObjectURL(moduleUrl);
}
