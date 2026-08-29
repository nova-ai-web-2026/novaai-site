(() => {
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function boot(){
    for(let i=0;i<260;i++){
      if(window.__V111_PATCH?.version==='11.1')break;
      await sleep(50);
    }
    const toggle=document.getElementById('soundToggle');
    const enforce=()=>{
      const ctx=window.__V11_AUDIO_CONTEXT;if(!ctx)return;
      const muted=toggle?.textContent?.includes('مكتوم');
      try{if(window.__V11_OWN_MASTER)window.__V11_OWN_MASTER.gain.setTargetAtTime(0,ctx.currentTime,.025);}catch(_){}
      try{if(window.__V11_LEGACY_MASTER)window.__V11_LEGACY_MASTER.gain.setTargetAtTime(muted?0:.004,ctx.currentTime,.025);}catch(_){}
    };
    const timer=setInterval(enforce,80);enforce();
    window.__V11_AUDIOFIX={version:1,legacyLocked:true,v11BusLocked:true,intervalMs:80};
    if(window.__egyptDebug)window.__egyptDebug.v11AudioFixState=()=>({...window.__V11_AUDIOFIX});
    window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
  }
  boot().catch(err=>console.error('V11 audio lock failed',err));
})();