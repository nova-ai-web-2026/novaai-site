const BASE_WRAPPER_URL='https://raw.githubusercontent.com/nova-ai-web-2026/novaai-site/c331c076c4216f759ca505c087ce889964b32e9e/pitch27/game3d.js';
try{
  const res=await fetch(BASE_WRAPPER_URL,{cache:'no-store'});
  if(!res.ok) throw new Error(`Base gameplay wrapper HTTP ${res.status}`);
  let src=await res.text();
  const must=(from,to,label)=>{if(!src.includes(from))throw new Error(`Hotfix patch missing: ${label}`);src=src.replace(from,to)};

  // Aggressively closer broadcast camera for phone screens.
  must("camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.1,240);","camera=new THREE.PerspectiveCamera(39,innerWidth/innerHeight,.1,220);",'camera FOV');
  must("camera.position.set(-4,23,36);","camera.position.set(-3,16.5,27.5);",'camera start');
  must("camDesired.set(THREE.MathUtils.clamp(targetX-2,-43,43),23,36);","camDesired.set(THREE.MathUtils.clamp(targetX-1,-45,45),17,28);",'close broadcast camera');
  must("g.scale.setScalar(.82)","g.scale.setScalar(.88)",'player screen size');

  // Fast match tempo: much higher running speed, acceleration and less artificial drag.
  must("const maxSpeed=state.sprint?16.2:12.4,accel=state.sprint?14.0:15.2;","const maxSpeed=state.sprint?24:18.2,accel=state.sprint?25:26;",'user speed');
  must("const drag=Math.exp(-.72*dt);","const drag=Math.exp(-.22*dt);",'movement drag');
  must("limit=(p===cp&&state.sprint)?16.2:(p.team===1?14.6:13.6)","limit=(p===cp&&state.sprint)?24:(p.team===1?21.5:20.5)",'movement cap');
  must("const minDist=1.05;","const minDist=.92;",'collision spacing');
  src=src.replaceAll("a.vx*=.90;a.vz*=.90;b.vx*=.90;b.vz*=.90;","a.vx*=.97;a.vz*=.97;b.vx*=.97;b.vz*=.97;");

  // Make every AI role move at a genuinely match-like tempo instead of jogging.
  src=src.replaceAll("p.i===0?10.2:14.1,9.0","p.i===0?11.5:20.5,13.5");
  src=src.replaceAll("p.i===0?10.0:14.8,10.2","p.i===0?11.0:22.0,15.0");
  src=src.replaceAll("p.i===0?9.8:(teamOwns?13.8:13.1),8.0","p.i===0?11.0:(teamOwns?20.8:19.6),13.0");

  // Replace the primitive goal/net with round posts and a dense 3D square mesh net.
  const oldGoal=`function buildGoal(x,rot){
  const g=new THREE.Group();g.position.x=x;g.rotation.y=rot;
  const white=mat(0xf8fff9,.35,.08);const bar=(sx,sy,sz,px,py,pz)=>{const b=mesh(new THREE.BoxGeometry(sx,sy,sz),white);b.position.set(px,py,pz);g.add(b)};
  bar(.16,2.7,.16,0,1.35,-7.3);bar(.16,2.7,.16,0,1.35,7.3);bar(.16,.16,14.7,0,2.7,0);
  bar(2.5,.10,.10,-1.25,.10,-7.3);bar(2.5,.10,.10,-1.25,.10,7.3);
  const netMat=new THREE.LineBasicMaterial({color:0xd9ffe7,transparent:true,opacity:.24});
  for(let z=-7.3;z<=7.31;z+=1.22){const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,.15,z),new THREE.Vector3(-2.4,.15,z),new THREE.Vector3(-2.4,2.5,z)]);g.add(new THREE.Line(geo,netMat))}
  world.add(g);
}`;
  const newGoal=`function buildGoal(x,rot){
  const g=new THREE.Group();g.position.x=x;g.rotation.y=rot;
  const white=mat(0xffffff,.28,.12);
  const pole=(r,len,px,py,pz,rx=0,ry=0,rz=0)=>{const p=mesh(new THREE.CylinderGeometry(r,r,len,16),white);p.position.set(px,py,pz);p.rotation.set(rx,ry,rz);g.add(p)};
  pole(.11,2.7,0,1.35,-7.3);pole(.11,2.7,0,1.35,7.3);
  pole(.11,14.6,0,2.7,0,Math.PI/2,0,0);
  pole(.075,2.45,-2.35,1.22,-7.3);pole(.075,2.45,-2.35,1.22,7.3);
  pole(.075,14.6,-2.35,2.45,0,Math.PI/2,0,0);
  const pts=[];const seg=(ax,ay,az,bx,by,bz)=>{pts.push(new THREE.Vector3(ax,ay,az),new THREE.Vector3(bx,by,bz))};
  for(let z=-7.3;z<=7.301;z+=.73){seg(-2.35,.05,z,-2.35,2.45,z);seg(0,2.7,z,-2.35,2.45,z)}
  for(let y=.05;y<=2.451;y+=.35)seg(-2.35,y,-7.3,-2.35,y,7.3);
  for(let d=0;d<=2.351;d+=.39)seg(-d,2.7-d*.105,-7.3,-d,2.7-d*.105,7.3);
  for(const z of [-7.3,7.3]){
    for(let y=.05;y<=2.451;y+=.35)seg(0,y,z,-2.35,Math.min(2.45,y),z);
    for(let d=0;d<=2.351;d+=.39)seg(-d,.05,z,-d,2.7-d*.105,z);
  }
  const netGeo=new THREE.BufferGeometry().setFromPoints(pts);
  const netMat=new THREE.LineBasicMaterial({color:0xf7fff9,transparent:true,opacity:.52});
  const net=new THREE.LineSegments(netGeo,netMat);net.renderOrder=2;g.add(net);
  world.add(g);
}`;
  const marker="  // Keep improved player proportions and readable football-style arm motion.";
  if(!src.includes(marker))throw new Error('Hotfix patch missing: goal insertion point');
  src=src.replace(marker,`  swap(${JSON.stringify(oldGoal)},${JSON.stringify(newGoal)},'3D goal net');\n\n${marker}`);

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
