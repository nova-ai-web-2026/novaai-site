(() => {
  'use strict';
  let routed=false,timer=null,observer=null;

  const context=()=>window.__V119_CONTEXT||window.__V118_CONTEXT||window.__V117_CONTEXT||window.__V116_CONTEXT||null;
  const bus=()=>window.__V1112_SFX_BUS||window.__V1110_SFX_BUS||null;
  const analyser=()=>window.__V1112_SFX_ANALYSER||window.__V1110_SFX_ANALYSER||null;
  const muted=()=>document.getElementById('soundToggle')?.textContent.includes('مكتوم')===true;

  function syncMute(){
    const b=bus(),ctx=context();if(!b||!ctx)return;
    try{b.gain.cancelScheduledValues(ctx.currentTime);b.gain.setTargetAtTime(muted()?0:1,ctx.currentTime,.018);}catch(_){try{b.gain.value=muted()?0:1;}catch(__){}}
  }

  function ensureDirectOutput(){
    const ctx=context(),a=analyser(),b=bus();if(!ctx||!a||!b)return false;
    if(!a.__v1112DirectDestination){
      try{a.disconnect();}catch(_){}
      a.connect(ctx.destination);
      a.__v1112DirectDestination=true;
      routed=true;
    }
    syncMute();
    window.__V1112_OUTPUT={version:'11.12',directDestination:routed,contextState:ctx.state,sfxGain:b.gain.value,independentFromAmbientMaster:true,toggleSynced:true};
    return routed;
  }

  const originalApi=()=>window.__V1112_SFX_API;
  function wrapApi(){
    const api=originalApi();if(!api||api.__v1112OutputWrapped)return false;
    for(const name of ['unlock','play','playKey']){
      const fn=api[name];if(typeof fn!=='function')continue;
      api[name]=function(...args){
        const out=fn.apply(this,args);
        if(out&&typeof out.then==='function')return out.finally(()=>{ensureDirectOutput();setTimeout(ensureDirectOutput,0);});
        ensureDirectOutput();setTimeout(ensureDirectOutput,0);return out;
      };
    }
    api.__v1112OutputWrapped=true;return true;
  }

  function tick(){wrapApi();ensureDirectOutput();}
  timer=setInterval(tick,40);tick();
  const toggle=document.getElementById('soundToggle');if(toggle){observer=new MutationObserver(syncMute);observer.observe(toggle,{childList:true,subtree:true,characterData:true});}
  for(const id of ['newGameBtn','continueBtn'])document.getElementById(id)?.addEventListener('pointerdown',()=>{tick();setTimeout(tick,30);setTimeout(tick,120);},{capture:true});
  window.__V1112_OUTPUT={version:'11.12',directDestination:false,contextState:null,sfxGain:null,independentFromAmbientMaster:true,toggleSynced:true};
  window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer);observer?.disconnect();},{once:true});
})();