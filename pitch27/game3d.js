const PREVIOUS_AI_URL='https://raw.githubusercontent.com/nova-ai-web-2026/novaai-site/390b10bf2febd8b1c597059408664468f45740c0/pitch27/game3d.js';
try{
  const res=await fetch(PREVIOUS_AI_URL,{cache:'no-store'});
  if(!res.ok) throw new Error(`Previous AI HTTP ${res.status}`);
  let src=await res.text();
  const swap=(from,to,label)=>{if(!src.includes(from))throw new Error(`AI patch missing: ${label}`);src=src.replace(from,to)};

  swap(
"    if(plans[p.team].cover===i){\\n      const depth=ballOwner.x*dir<-18?.48:.57;\\n      const tx=ballOwner.x*depth+ownGoal*(1-depth);\\n      const goalSide=(ballOwner.z>=0?1:-1)*1.8;\\n      const tz=THREE.MathUtils.clamp(ballOwner.z*.62-goalSide,-19,19);\\n      steerPlayer(p,tx,tz,dt,20.1,13.8);return;\\n    }",
"    if(plans[p.team].cover===i){\\n      const roleZ=p.i===1?-13:p.i===2?13:0;\\n      const roleDepth=p.i<=2?14:p.i===3?27:35;\\n      const baseX=THREE.MathUtils.clamp(ownGoal+dir*(roleDepth+THREE.MathUtils.clamp(bx*dir*.08,-4,4)),-42,42);\\n      const baseZ=THREE.MathUtils.clamp(roleZ+THREE.MathUtils.clamp(bz*.08,-2.5,2.5),-23,23);\\n      const gx=ownGoal-ballOwner.x,gz=-ballOwner.z,gl=Math.hypot(gx,gz)||1;\\n      const betweenX=ballOwner.x+gx/gl*8.5,betweenZ=ballOwner.z+gz/gl*8.5;\\n      const tx=THREE.MathUtils.clamp(baseX*.72+betweenX*.28,baseX-5,baseX+5);\\n      const tz=THREE.MathUtils.clamp(baseZ*.72+betweenZ*.28,baseZ-5,baseZ+5);\\n      steerPlayer(p,tx,tz,dt,19.8,13.4);return;\\n    }",
'zonal cover');

  swap(
"    const markIdx=plans[p.team].marks.get(i);\\n    const mark=markIdx!==undefined?state.players[markIdx]:null;\\n    if(mark){\\n      const goalDx=ownGoal-mark.x,goalDz=-mark.z,gl=Math.hypot(goalDx,goalDz)||1;\\n      const tight=mark.i===4?2.2:2.8;\\n      const tx=THREE.MathUtils.clamp(mark.x+goalDx/gl*tight,-43,43);\\n      const tz=THREE.MathUtils.clamp(mark.z+goalDz/gl*tight,-25,25);\\n      steerPlayer(p,tx,tz,dt,19.4,13.0);return;\\n    }\\n\\n    const side=p.i===1?-1:p.i===2?1:0;\\n    const tx=ownGoal+dir*(p.i<=2?18:27);\\n    const tz=side*15;\\n    steerPlayer(p,tx,tz,dt,18.1,12.3);",
"    const roleZ=p.i===1?-13:p.i===2?13:0;\\n    const roleDepth=p.i<=2?14:p.i===3?27:35;\\n    const shiftX=THREE.MathUtils.clamp(bx*dir*.08,-4,4);\\n    const shiftZ=THREE.MathUtils.clamp(bz*.08,-2.5,2.5);\\n    const zoneX=THREE.MathUtils.clamp(ownGoal+dir*(roleDepth+shiftX),-42,42);\\n    const zoneZ=THREE.MathUtils.clamp(roleZ+shiftZ,-23,23);\\n    let threat=null,threatScore=1e9;\\n    state.players.forEach((q,qi)=>{\\n      if(q.team===p.team||q.i===0||qi===owner)return;\\n      const zoneDist=Math.hypot(q.x-zoneX,(q.z-zoneZ)*1.15);\\n      const goalDanger=Math.hypot(q.x-ownGoal,q.z)*.08;\\n      const score=zoneDist+goalDanger;\\n      if(zoneDist<10.5&&score<threatScore){threatScore=score;threat=q}\\n    });\\n    if(threat){\\n      const gx=ownGoal-threat.x,gz=-threat.z,gl=Math.hypot(gx,gz)||1;\\n      const shadeX=threat.x+gx/gl*2.8,shadeZ=threat.z+gz/gl*2.8;\\n      const tx=THREE.MathUtils.clamp(zoneX*.76+shadeX*.24,zoneX-4,zoneX+4);\\n      const tz=THREE.MathUtils.clamp(zoneZ*.76+shadeZ*.24,zoneZ-4,zoneZ+4);\\n      steerPlayer(p,tx,tz,dt,18.8,12.7);return;\\n    }\\n    steerPlayer(p,zoneX,zoneZ,dt,18.2,12.3);",
'zonal shape');

  swap(
"    const press=own[0]?.idx??-1,cover=own[1]?.idx??-1;",
"    const ranked=own.map(v=>({...v,shape:Math.hypot(v.q.x-(-dir*46+dir*(v.q.i<=2?14:v.q.i===3?27:35)),v.q.z-(v.q.i===1?-13:v.q.i===2?13:0))})).sort((a,b)=>(a.ballD+a.shape*5)-(b.ballD+b.shape*5));\\n    const press=ranked[0]?.idx??-1,cover=ranked[1]?.idx??-1;",
'press respects shape');

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
