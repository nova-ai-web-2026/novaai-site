const ZONAL_RELEASE_URL='https://raw.githubusercontent.com/nova-ai-web-2026/novaai-site/d3f9e57915cdf31a9b8f83e9fdeec20e06972652/pitch27/game3d.js';
try{
  const res=await fetch(ZONAL_RELEASE_URL,{cache:'no-store'});
  if(!res.ok) throw new Error(`Zonal AI HTTP ${res.status}`);
  let src=await res.text();
  const marker="  const url=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));";
  if(!src.includes(marker)) throw new Error('Zonal press patch point not found');

  const pressPatch=String.raw`
  swap(
"    const ranked=own.map(v=>({...v,shape:Math.hypot(v.q.x-(-dir*46+dir*(v.q.i<=2?14:v.q.i===3?27:35)),v.q.z-(v.q.i===1?-13:v.q.i===2?13:0))})).sort((a,b)=>(a.ballD+a.shape*5)-(b.ballD+b.shape*5));\\n    const press=ranked[0]?.idx??-1,cover=ranked[1]?.idx??-1;",
"    const ranked=own.map(v=>{const homeX=-dir*46+dir*(v.q.i<=2?14:v.q.i===3?27:35),homeZ=v.q.i===1?-13:v.q.i===2?13:0;const shape=Math.hypot(v.q.x-homeX,v.q.z-homeZ),ballZone=Math.hypot(bx-homeX,(bz-homeZ)*1.05);return {...v,shape,ballZone}}).filter(v=>v.ballZone<18).sort((a,b)=>(a.ballD+a.shape*6+a.ballZone*9)-(b.ballD+b.shape*6+b.ballZone*9));\\n    const press=ranked[0]?.idx??-1;\\n    const cover=own.filter(v=>v.idx!==press).sort((a,b)=>a.ballD-b.ballD)[0]?.idx??-1;",
'press handoff by zone');

  swap(
"    if(owner<0){\\n      if(plans[p.team].press===i){\\n        steerPlayer(p,bx,bz,dt,justTransition?22.6:21.2,justTransition?16.4:14.8);return;\\n      }",
"    if(owner<0){\\n      if(plans[p.team].press===i){\\n        const roleZ=p.i===1?-13:p.i===2?13:0,roleDepth=p.i<=2?14:p.i===3?27:35;\\n        const homeX=ownGoal+dir*roleDepth,homeZ=roleZ;\\n        const dx=bx-homeX,dz=bz-homeZ,d=Math.hypot(dx,dz)||1,roam=10.5;\\n        const k=Math.min(1,roam/d),tx=homeX+dx*k,tz=homeZ+dz*k;\\n        steerPlayer(p,tx,tz,dt,justTransition?21.8:20.6,justTransition?15.6:14.2);return;\\n      }",
'bounded loose-ball press');

  swap(
"    const ballOwner=state.players[owner];\\n    if(plans[p.team].press===i){\\n      const predict=.24+(justTransition?.12:0);\\n      const px=ballOwner.x+ballOwner.vx*predict,pz=ballOwner.z+ballOwner.vz*predict;\\n      steerPlayer(p,px,pz,dt,justTransition?22.9:21.8,justTransition?16.8:15.2);return;\\n    }",
"    const ballOwner=state.players[owner];\\n    if(plans[p.team].press===i){\\n      const roleZ=p.i===1?-13:p.i===2?13:0,roleDepth=p.i<=2?14:p.i===3?27:35;\\n      const homeX=ownGoal+dir*roleDepth,homeZ=roleZ;\\n      const predict=.20+(justTransition?.08:0);\\n      const rawX=ballOwner.x+ballOwner.vx*predict,rawZ=ballOwner.z+ballOwner.vz*predict;\\n      const dx=rawX-homeX,dz=rawZ-homeZ,d=Math.hypot(dx,dz)||1,roam=11;\\n      const k=Math.min(1,roam/d),px=homeX+dx*k,pz=homeZ+dz*k;\\n      steerPlayer(p,px,pz,dt,justTransition?22.1:20.9,justTransition?16.0:14.4);return;\\n    }",
'bounded carrier press');
`;

  src=src.replace(marker,pressPatch+'\n'+marker);
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
