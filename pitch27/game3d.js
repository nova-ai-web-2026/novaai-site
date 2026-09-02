const CORE_URL='https://raw.githubusercontent.com/nova-ai-web-2026/novaai-site/7a816f38058a90e3822f3befc5d92286060df082/pitch27/game3d.js';
try{
  const res=await fetch(CORE_URL,{cache:'no-store'});
  if(!res.ok) throw new Error(`Core engine HTTP ${res.status}`);
  let src=await res.text();
  const swap=(from,to,label)=>{if(!src.includes(from))throw new Error(`Gameplay patch missing: ${label}`);src=src.replace(from,to)};

  // Much closer broadcast camera so players and the active area fill more of a phone screen.
  swap("camera=new THREE.PerspectiveCamera(46,innerWidth/innerHeight,.1,260);","camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.1,240);",'camera FOV');
  swap("camera.position.set(-8,30,44);","camera.position.set(-4,23,36);",'camera start');
  swap("  const side=b.z>=0?1:-1;camDesired.set(THREE.MathUtils.clamp(targetX-4,-42,42),31,side*46);","  camDesired.set(THREE.MathUtils.clamp(targetX-2,-43,43),23,36);",'broadcast camera');

  // Keep improved player proportions and readable football-style arm motion.
  swap("pivot.position.set(0,2.62,z);pivot.rotation.z=Math.PI/2;","pivot.position.set(0,2.62,z);",'arm pose');
  swap("if(m.userData.arms){m.userData.arms[0].rotation.x=-swing*.55;m.userData.arms[1].rotation.x=swing*.55}","if(m.userData.arms){m.userData.arms[0].rotation.z=-swing*.42;m.userData.arms[1].rotation.z=swing*.42}",'arm animation');
  swap("  return g;\n}\n\nfunction rebuildActors()","  g.scale.setScalar(.82);return g;\n}\n\nfunction rebuildActors()",'player proportions');

  // Faster, sharper player response. Reduce the heavy damping that made players feel sluggish.
  swap("const maxSpeed=state.sprint?12.8:9.5,accel=state.sprint?7.2:8.7;","const maxSpeed=state.sprint?16.2:12.4,accel=state.sprint?14.0:15.2;",'player speed');
  swap("const drag=Math.exp(-1.15*dt);","const drag=Math.exp(-.72*dt);",'movement drag');
  swap("limit=(p===cp&&state.sprint)?12.8:10.5","limit=(p===cp&&state.sprint)?16.2:(p.team===1?14.6:13.6)",'speed cap');

  // Crowded areas should not kill momentum every frame.
  swap("const minDist=1.2;","const minDist=1.05;",'collision spacing');
  src=src.replaceAll("a.vx*=.72;a.vz*=.72;b.vx*=.72;b.vz*=.72;","a.vx*=.90;a.vz*=.90;b.vx*=.90;b.vz*=.90;");

  // Quicker passing/reception and a short secure-possession window to stop instant ping-pong steals.
  swap("state.ball.lastTouch=.18;p.cool=.16","state.ball.lastTouch=.08;p.cool=.10",'ball release timing');
  swap("state.ball={x:-3,y:.45,z:-4,vx:0,vy:0,vz:0,owner:3,lastTeam:0,lastTouch:0};","state.ball={x:-3,y:.45,z:-4,vx:0,vy:0,vz:0,owner:3,lastTeam:0,lastTouch:0,secure:.35};",'kickoff possession');
  swap("state.ball={x:-3,y:.45,z:-4,vx:0,vy:0,vz:0,owner:3,lastTeam:0,lastTouch:.25}","state.ball={x:-3,y:.45,z:-4,vx:0,vy:0,vz:0,owner:3,lastTeam:0,lastTouch:.12,secure:.35}",'reset possession');

  swap(`function tryPossession(){
  if(state.ball.owner>=0||state.ball.y>.82||state.ball.lastTouch>0)return;
  let best=-1,bd=1e9;state.players.forEach((p,i)=>{if(p.cool>0)return;const d=(p.x-state.ball.x)**2+(p.z-state.ball.z)**2;if(d<bd){bd=d;best=i}});
  if(best>=0&&bd<1.35*1.35){const p=state.players[best];state.ball.owner=best;p.has=true;state.ball.vx=state.ball.vz=state.ball.vy=0;state.ball.lastTeam=p.team;if(p.team===0)state.controlled=best}
}`,
`function tryPossession(){
  if(state.ball.owner>=0||state.ball.y>.98||state.ball.lastTouch>0)return;
  let best=-1,bd=1e9;
  state.players.forEach((p,i)=>{if(p.cool>0)return;const d=(p.x-state.ball.x)**2+(p.z-state.ball.z)**2;if(d<bd){bd=d;best=i}});
  if(best>=0&&bd<1.62*1.62){
    const p=state.players[best];state.players.forEach(q=>{q.has=false;q.tackleMeter=0});
    state.ball.owner=best;p.has=true;state.ball.vx=state.ball.vz=state.ball.vy=0;state.ball.lastTeam=p.team;state.ball.secure=.32;
    if(p.team===0)state.controlled=best;
  }
}`,'possession pickup');

  swap(`function trySteal(){
  if(state.ball.owner<0)return;const owner=state.players[state.ball.owner];if(owner.cool>0)return;for(let i=0;i<state.players.length;i++){const p=state.players[i];if(p.team===owner.team||p.cool>0)continue;const d=(p.x-owner.x)**2+(p.z-owner.z)**2;if(d<.95*.95){owner.has=false;owner.cool=.4;p.cool=.28;state.ball.owner=i;p.has=true;state.ball.lastTeam=p.team;if(p.team===0)state.controlled=i;break}}
}`,
`function trySteal(dt){
  if(state.ball.owner<0||state.ball.secure>0)return;
  const owner=state.players[state.ball.owner];if(!owner||owner.cool>0)return;
  let winner=-1,best=1e9;
  for(let i=0;i<state.players.length;i++){
    const p=state.players[i];
    if(p.team===owner.team||p.cool>0){p.tackleMeter=0;continue}
    const d2=(p.x-owner.x)**2+(p.z-owner.z)**2;
    if(d2<.72*.72){p.tackleMeter=(p.tackleMeter||0)+dt;if(p.tackleMeter>.16&&d2<best){best=d2;winner=i}}
    else p.tackleMeter=Math.max(0,(p.tackleMeter||0)-dt*2.5);
  }
  if(winner>=0){
    const p=state.players[winner];owner.has=false;owner.cool=.28;p.cool=.18;p.tackleMeter=0;
    state.ball.owner=winner;p.has=true;state.ball.lastTeam=p.team;state.ball.secure=.34;
    if(p.team===0)state.controlled=winner;
  }
}`,'protected tackling');

  swap("if(state.ball.lastTouch>0)state.ball.lastTouch=Math.max(0,state.ball.lastTouch-dt);","if(state.ball.lastTouch>0)state.ball.lastTouch=Math.max(0,state.ball.lastTouch-dt);if(state.ball.secure>0)state.ball.secure=Math.max(0,state.ball.secure-dt);",'possession timer');
  swap("state.ball.x=op.x+fx*.82;state.ball.z=op.z+fz*.82;state.ball.y=.46","state.ball.x=op.x+fx*.70;state.ball.z=op.z+fz*.70;state.ball.y=.46",'dribble control');
  swap("goalOrBounds();tryPossession();trySteal();","goalOrBounds();tryPossession();trySteal(dt);",'tackle update');

  // More active AI: faster pressure, forward runs, support, passing under pressure and quicker shooting.
  swap(`function ai(dt){
  state.players.forEach((p,i)=>{p.cool=Math.max(0,p.cool-dt);if(i===state.controlled&&p.team===0)return;
    if(state.ball.owner===i){const dir=p.team?-1:1;const goalX=dir*46;steerPlayer(p,goalX,p.z*.7,dt,p.i===0?8.2:10.4,3.8);if((p.team===1&&p.x<-34)||(p.team===0&&p.x>34)){if(Math.random()<dt*.65){const gx=p.team?-51.5:51.5,gz=(Math.random()-.5)*9,l=Math.hypot(gx-p.x,gz-p.z)||1;detachBall(p,(gx-p.x)/l,(gz-p.z)/l,27,5.4)}}
    }else{const chase=nearest(p.team)===i;if(chase){steerPlayer(p,state.ball.x,state.ball.z,dt,p.i===0?8.1:10.1,3.2)}else{const base=[-40,-22,-22,-7,-7][p.i]*(p.team?-1:1),bz=[0,-17,17,-9,9][p.i];const bx=base+state.ball.x*(p.i===0?.06:.24),bz2=bz+state.ball.z*.12;steerPlayer(p,bx,bz2,dt,p.i===0?7.8:9.1,2.5)}}
  });
}`,
`function ai(dt){
  const owner=state.ball.owner;
  state.players.forEach((p,i)=>{
    p.cool=Math.max(0,p.cool-dt);p.think=(p.think||0)-dt;
    if(i===state.controlled&&p.team===0)return;
    const dir=p.team?-1:1;

    if(owner===i){
      const oppIdx=nearest(1-p.team,p.x,p.z),opp=oppIdx>=0?state.players[oppIdx]:null;
      const pressure=opp?Math.hypot(opp.x-p.x,opp.z-p.z):99;
      const mates=state.players.filter(q=>q.team===p.team&&q!==p);
      const ahead=mates.filter(q=>(q.x-p.x)*dir>2).sort((a,b)=>((b.x-p.x)*dir*1.9-Math.abs(b.z-p.z)*.18)-((a.x-p.x)*dir*1.9-Math.abs(a.z-p.z)*.18));
      const target=ahead[0]||mates.sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
      const shooting=p.team?p.x<-31:p.x>31;
      if(p.i!==0&&shooting&&p.think<=0){
        const gx=p.team?-51.5:51.5,gz=THREE.MathUtils.clamp((Math.random()-.5)*8,-5.6,5.6),l=Math.hypot(gx-p.x,gz-p.z)||1;
        detachBall(p,(gx-p.x)/l,(gz-p.z)/l,30.5,5.7);p.think=.42;return;
      }
      if(target&&p.think<=0&&(p.i===0||pressure<5.4||Math.random()<dt*1.05)){
        let dx=target.x-p.x,dz=target.z-p.z,l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
        detachBall(p,dx,dz,p.i===0?22:21.5,1.05);p.think=.46;return;
      }
      const lane=THREE.MathUtils.clamp(p.z*.36+Math.sin(state.time*1.05+i)*3.8,-24,24);
      steerPlayer(p,dir*47,lane,dt,p.i===0?10.2:14.1,9.0);return;
    }

    const teamOwns=owner>=0&&state.players[owner]?.team===p.team;
    const chase=!teamOwns&&nearest(p.team,state.ball.x,state.ball.z)===i;
    if(chase){steerPlayer(p,state.ball.x,state.ball.z,dt,p.i===0?10.0:14.8,10.2);return}

    const base=[-40,-22,-22,-7,-7][p.i]*dir,baseZ=[0,-17,17,-9,9][p.i];
    const run=teamOwns?(p.i===0?0:dir*(p.i>=3?13:7)):dir*-3;
    const bx=THREE.MathUtils.clamp(base+state.ball.x*(p.i===0?.05:.34)+run,-46,46);
    const width=p.i===0?.05:(p.i<=2?.18:.28);
    const bz=THREE.MathUtils.clamp(baseZ+state.ball.z*width+(teamOwns&&p.i>=3?Math.sin(state.time*1.2+i)*3.4:0),-28,28);
    steerPlayer(p,bx,bz,dt,p.i===0?9.8:(teamOwns?13.8:13.1),8.0);
  });
}`,'match AI');

  // Quicker ball tempo without arcade rebounds.
  swap("detachBall(p,dx,dz,kind==='shot'?28.5:18.5,kind==='shot'?6.3:1.4)","detachBall(p,dx,dz,kind==='shot'?30.5:21.5,kind==='shot'?6.0:1.15)",'user passing');
  swap("state.ball.vy*=-.42","state.ball.vy*=-.28",'ball bounce');
  swap("const roll=Math.exp(-2.05*dt);","const roll=Math.exp(-1.85*dt);",'ball roll');
  src=src.replaceAll("*=-.48","*=-.34");

  // The main loop already renders while paused; resuming must not spawn a second RAF loop.
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
