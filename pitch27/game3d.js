const CORE_URL='https://raw.githubusercontent.com/nova-ai-web-2026/novaai-site/7a816f38058a90e3822f3befc5d92286060df082/pitch27/game3d.js';
try{
  const res=await fetch(CORE_URL,{cache:'no-store'});
  if(!res.ok) throw new Error(`Core engine HTTP ${res.status}`);
  let src=await res.text();
  const swap=(from,to,label)=>{if(!src.includes(from))throw new Error(`Gameplay patch missing: ${label}`);src=src.replace(from,to)};

  // Wider, higher fixed-side broadcast view: more pitch on screen and no camera crossing through players.
  swap("camera=new THREE.PerspectiveCamera(46,innerWidth/innerHeight,.1,260);","camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,280);",'camera FOV');
  swap("camera.position.set(-8,30,44);","camera.position.set(-8,34,52);",'camera start');
  swap("  const side=b.z>=0?1:-1;camDesired.set(THREE.MathUtils.clamp(targetX-4,-42,42),31,side*46);","  camDesired.set(THREE.MathUtils.clamp(targetX-4,-42,42),34,52);",'broadcast camera');

  // Make the procedural players less oversized and fix the arm pose/swing so they read more like footballers.
  swap("pivot.position.set(0,2.62,z);pivot.rotation.z=Math.PI/2;","pivot.position.set(0,2.62,z);",'arm pose');
  swap("if(m.userData.arms){m.userData.arms[0].rotation.x=-swing*.55;m.userData.arms[1].rotation.x=swing*.55}","if(m.userData.arms){m.userData.arms[0].rotation.z=-swing*.42;m.userData.arms[1].rotation.z=swing*.42}",'arm animation');
  swap("  return g;\n}\n\nfunction rebuildActors()","  g.scale.setScalar(.76);return g;\n}\n\nfunction rebuildActors()",'player proportions');

  // Calmer movement and ball response: less sliding, less pinball bounce, easier reading on mobile.
  swap("const maxSpeed=state.sprint?12.8:9.5,accel=state.sprint?7.2:8.7;","const maxSpeed=state.sprint?11.8:8.9,accel=state.sprint?7.5:9.2;",'player speed');
  swap("limit=(p===cp&&state.sprint)?12.8:10.5","limit=(p===cp&&state.sprint)?11.8:9.8",'speed cap');
  swap("state.ball.vy*=-.42","state.ball.vy*=-.28",'ball bounce');
  swap("const roll=Math.exp(-2.05*dt);","const roll=Math.exp(-2.45*dt);",'ball roll');
  src=src.replaceAll("*=-.48","*=-.35");

  // The main loop already keeps rendering while paused, so resuming must not start a second RAF loop.
  swap("$('#resume').onclick=()=>{state.paused=false;$('#pauseOverlay').classList.remove('show');last=performance.now();raf=requestAnimationFrame(loop)};","$('#resume').onclick=()=>{state.paused=false;$('#pauseOverlay').classList.remove('show');last=performance.now()};",'resume loop');

  const url=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));
  await import(url);
  URL.revokeObjectURL(url);
}catch(err){
  console.error(err);
  const reason=document.querySelector('#bootReason');
  const overlay=document.querySelector('#bootError');
  if(reason) reason.textContent=String(err?.message||err);
  if(overlay) overlay.style.display='grid';
}
