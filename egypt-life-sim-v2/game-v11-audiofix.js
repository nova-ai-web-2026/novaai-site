(() => {
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  function loadV112(){
    if(document.querySelector('script[data-egypt-v112-audio]'))return;
    const s=document.createElement('script');
    s.src='game-v11-2-audio.js?v=11.2';
    s.dataset.egyptV112Audio='true';
    s.async=false;
    s.onerror=()=>console.error('V11.2 calm audio failed to load');
    document.body.appendChild(s);
  }
  async function boot(){
    for(let i=0;i<260;i++){
      if(window.__V111_PATCH?.version==='11.1')break;
      await sleep(50);
    }
    const toggle=document.getElementById('soundToggle');
    const enforce=()=>{
      const ctx=window.__V11_AUDIO_CONTEXT;if(!ctx)return;
      const muted=toggle?.textContent?.includes('مكتوم');
      const oldV11=window.__V11_OWN_MASTER;
      if(oldV11&&!oldV11.__v111Disconnected){
        try{oldV11.disconnect();oldV11.__v111Disconnected=true;}catch(_){}
      }
      try{if(oldV11)oldV11.gain.setTargetAtTime(0,ctx.currentTime,.02);}catch(_){}
      try{if(window.__V11_LEGACY_MASTER)window.__V11_LEGACY_MASTER.gain.setTargetAtTime(0,ctx.currentTime,.025);}catch(_){}
    };
    const timer=setInterval(enforce,80);enforce();
    window.__V11_AUDIOFIX={version:3,legacyLocked:true,v11BusDisconnected:true,legacyCoreMuted:true,intervalMs:80};
    if(window.__egyptDebug)window.__egyptDebug.v11AudioFixState=()=>({...window.__V11_AUDIOFIX,disconnected:!!window.__V11_OWN_MASTER?.__v111Disconnected});
    loadV112();
    window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
  }
  boot().catch(err=>console.error('V11 audio lock failed',err));
})();