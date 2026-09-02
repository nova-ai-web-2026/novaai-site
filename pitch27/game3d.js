import { pressRoleForBall, boundedContainTarget } from './ai-pressure-policy.mjs';
globalThis.__P27PressPolicy = { pressRoleForBall, boundedContainTarget };

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
"    const desiredRole=globalThis.__P27PressPolicy.pressRoleForBall(bx,bz,dir);\\n    const press=own.find(v=>v.q.i===desiredRole)?.idx??-1;\\n    const cover=own.filter(v=>v.idx!==press).sort((a,b)=>a.ballD-b.ballD)[0]?.idx??-1;",
'third based pressure handoff');

  swap(
"    if(owner<0){\\n      if(plans[p.team].press===i){\\n        steerPlayer(p,bx,bz,dt,justTransition?22.6:21.2,justTransition?16.4:14.8);return;\\n      }",
"    if(owner<0){\\n      if(plans[p.team].press===i){\\n        const t=globalThis.__P27PressPolicy.boundedContainTarget(bx,bz,state.ball.vx||0,state.ball.vz||0,dir,p.i,justTransition);\\n        steerPlayer(p,t.x,t.z,dt,justTransition?21.4:20.2,justTransition?15.0:13.8);return;\\n      }",
'bounded loose ball contain');

  swap(
"    const ballOwner=state.players[owner];\\n    if(plans[p.team].press===i){\\n      const predict=.24+(justTransition?.12:0);\\n      const px=ballOwner.x+ballOwner.vx*predict,pz=ballOwner.z+ballOwner.vz*predict;\\n      steerPlayer(p,px,pz,dt,justTransition?22.9:21.8,justTransition?16.8:15.2);return;\\n    }",
"    const ballOwner=state.players[owner];\\n    if(plans[p.team].press===i){\\n      const t=globalThis.__P27PressPolicy.boundedContainTarget(ballOwner.x,ballOwner.z,ballOwner.vx,ballOwner.vz,dir,p.i,justTransition);\\n      steerPlayer(p,t.x,t.z,dt,justTransition?21.6:20.4,justTransition?15.2:14.0);return;\\n    }",
'bounded carrier contain');
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
