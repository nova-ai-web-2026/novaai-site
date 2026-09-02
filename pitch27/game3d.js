const CORE_URL='https://raw.githubusercontent.com/nova-ai-web-2026/novaai-site/7a816f38058a90e3822f3befc5d92286060df082/pitch27/game3d.js';
try{
  const res=await fetch(CORE_URL,{cache:'no-store'});
  if(!res.ok) throw new Error(`Core engine HTTP ${res.status}`);
  let src=await res.text();
  const swap=(from,to,label)=>{if(!src.includes(from))throw new Error(`Gameplay patch missing: ${label}`);src=src.replace(from,to)};

  // Closer TV-style camera: still sees the play, but the pitch and players no longer feel tiny.
  swap("camera=new THREE.PerspectiveCamera(46,innerWidth/innerHeight,.1,260);","camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,260);",'camera FOV');
  swap("camera.position.set(-8,30,44);","camera.position.set(-6,28,43);",'camera start');
  swap("  const side=b.z>=0?1:-1;camDesired.set(THREE.MathUtils.clamp(targetX-4,-42,42),31,side*46);","  camDesired.set(THREE.MathUtils.clamp(targetX-3,-42,42),28,43);",'broadcast camera');

  // Keep the improved procedural player proportions and arm motion.
  swap("pivot.position.set(0,2.62,z);pivot.rotation.z=Math.PI/2;","pivot.position.set(0,2.62,z);",'arm pose');
  swap("if(m.userData.arms){m.userData.arms[0].rotation.x=-swing*.55;m.userData.arms[1].rotation.x=swing*.55}","if(m.userData.arms){m.userData.arms[0].rotation.z=-swing*.42;m.userData.arms[1].rotation.z=swing*.42}",'arm animation');
  swap("  return g;\n}\n\nfunction rebuildActors()","  g.scale.setScalar(.80);return g;\n}\n\nfunction rebuildActors()",'player proportions');

  // Faster, more responsive player movement.
  swap("const maxSpeed=state.sprint?12.8:9.5,accel=state.sprint?7.2:8.7;","const maxSpeed=state.sprint?14.2:10.8,accel=state.sprint?10.2:11.4;",'player speed');
  swap("limit=(p===cp&&state.sprint)?12.8:10.5","limit=(p===cp&&state.sprint)?14.2:(p.team===1?12.6:11.8)",'speed cap');

  // Replace the simple chase-only AI with pressure, passing, off-ball runs, support and quicker shooting.
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
      const ahead=mates.filter(q=>(q.x-p.x)*dir>2.5).sort((a,b)=>{
        const sa=(a.x-p.x)*dir*1.7-Math.abs(a.z-p.z)*.22-Math.hypot(a.x-p.x,a.z-p.z)*.08;
        const sb=(b.x-p.x)*dir*1.7-Math.abs(b.z-p.z)*.22-Math.hypot(b.x-p.x,b.z-p.z)*.08;
        return sb-sa;
      });
      const target=ahead[0]||mates.sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
      const shooting=p.team?p.x<-32:p.x>32;

      if(p.i!==0&&shooting&&p.think<=0){
        const gx=p.team?-51.5:51.5,gz=THREE.MathUtils.clamp((Math.random()-.5)*8,-5.8,5.8),l=Math.hypot(gx-p.x,gz-p.z)||1;
        detachBall(p,(gx-p.x)/l,(gz-p.z)/l,29,5.8);p.think=.55;return;
      }
      if(target&&p.think<=0&&(p.i===0||pressure<6.5||Math.random()<dt*.75)){
        let dx=target.x-p.x,dz=target.z-p.z,l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
        detachBall(p,dx,dz,p.i===0?20.5:19.2,1.2);p.think=.65;return;
      }
      const lane=THREE.MathUtils.clamp(p.z*.42+Math.sin(state.time*.9+i)*3.2,-23,23);
      steerPlayer(p,dir*46,lane,dt,p.i===0?9.4:12.4,6.4);
      return;
    }

    const teamOwns=owner>=0&&state.players[owner]?.team===p.team;
    const chase=!teamOwns&&nearest(p.team,state.ball.x,state.ball.z)===i;
    if(chase){
      steerPlayer(p,state.ball.x,state.ball.z,dt,p.i===0?9.2:12.6,7.2);
      return;
    }

    const base=[-40,-22,-22,-7,-7][p.i]*dir;
    const baseZ=[0,-17,17,-9,9][p.i];
    const attackBoost=teamOwns?(p.i===0?0:dir*(p.i>=3?10:6)):dir*-2;
    const bx=THREE.MathUtils.clamp(base+state.ball.x*(p.i===0?.05:.30)+attackBoost,-45,45);
    const width=p.i===0?.06:(p.i<=2?.16:.24);
    const bz=THREE.MathUtils.clamp(baseZ+state.ball.z*width+(teamOwns&&p.i>=3?Math.sin(state.time+i)*2.6:0),-27,27);
    steerPlayer(p,bx,bz,dt,p.i===0?8.8:(teamOwns?11.9:11.4),5.4);
  });
}`,'match AI');

  // Ball should keep enough pace for quicker passing while avoiding arcade pinball rebounds.
  swap("state.ball.vy*=-.42","state.ball.vy*=-.30",'ball bounce');
  swap("const roll=Math.exp(-2.05*dt);","const roll=Math.exp(-2.20*dt);",'ball roll');
  src=src.replaceAll("*=-.48","*=-.36");

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
