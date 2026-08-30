(() => {
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function boot(){
    for(let i=0;i<260;i++){if(window.__V111_PATCH?.version==='11.1')break;await sleep(50);}
    const enforce=()=>{
      const ctx=window.__V116_CONTEXT||window.__V11_AUDIO_CONTEXT;
      for(const key of ['__V11_LEGACY_MASTER','__V11_OWN_MASTER','__V111_SUPERSEDED_MASTER','__V112_MASTER','__V115_MASTER']){
        const g=window[key];if(!g||g===window.__V116_MASTER||g.__v116Muted)continue;
        try{g.gain?.setTargetAtTime?.(0,g.context?.currentTime||ctx?.currentTime||0,.01);}catch(_){}
        try{g.disconnect();g.__v116Muted=true;}catch(_){}
      }
    };
    const timer=setInterval(enforce,80);enforce();
    window.__V11_AUDIOFIX={version:7,legacyLocked:true,v11BusDisconnected:true,legacyCoreMuted:true,startupGuard:false,delegatedToV116:true,lateAudioLayers:false,intervalMs:80};
    if(window.__egyptDebug)window.__egyptDebug.v11AudioFixState=()=>({...window.__V11_AUDIOFIX,earlyAudio:window.__V116_AUDIO||null});
    window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
  }
  boot().catch(err=>console.error('V11.6 audio lock failed',err));
})();