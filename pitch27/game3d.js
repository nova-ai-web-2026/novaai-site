const CORE_URL='https://raw.githubusercontent.com/nova-ai-web-2026/novaai-site/7a816f38058a90e3822f3befc5d92286060df082/pitch27/game3d.js';
try{
  const res=await fetch(CORE_URL,{cache:'no-store'});
  if(!res.ok) throw new Error(`Core engine HTTP ${res.status}`);
  let src=await res.text();
  src=src.replace("  const side=b.z>=0?1:-1;camDesired.set(THREE.MathUtils.clamp(targetX-4,-42,42),31,side*46);","  camDesired.set(THREE.MathUtils.clamp(targetX-4,-42,42),31,46);");
  src=src.replace("$('#resume').onclick=()=>{state.paused=false;$('#pauseOverlay').classList.remove('show');last=performance.now();raf=requestAnimationFrame(loop)};","$('#resume').onclick=()=>{state.paused=false;$('#pauseOverlay').classList.remove('show');last=performance.now()};");
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
