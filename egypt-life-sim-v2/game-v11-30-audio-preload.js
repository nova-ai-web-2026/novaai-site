(() => {
  'use strict';

  const NEW_KEY='hayatMasr.menuAudio.v1130';
  const PRIOR=['hayatMasr.menuAudio.v1129','hayatMasr.menuAudio.v1127','hayatMasr.menuAudio.v1126','hayatMasr.menuAudio.v1125'];
  try {
    if(!localStorage.getItem(NEW_KEY)){
      let prior=null;
      for(const k of PRIOR){
        try{prior=JSON.parse(localStorage.getItem(k)||'null');}catch(_){prior=null;}
        if(prior&&typeof prior==='object')break;
      }
      localStorage.setItem(NEW_KEY,JSON.stringify({
        enabled:prior?.enabled!==false,
        mode:prior?.mode==='continuous'?'continuous':'interaction',
        volume:Number.isFinite(+prior?.volume)?Math.max(.2,Math.min(1,+prior.volume)):.78
      }));
    }
    localStorage.setItem('hayatMasr.menuAudio.v1126',JSON.stringify({enabled:false,mode:'interaction',volume:.2}));
  } catch (_) {}

  window.__EGYPT_MENU_AUDIO_EXTERNAL=true;
  window.__EGYPT_MENU_AUDIO_OWNER='11.30';

  for(const key of ['__V1129_AUDIO_SINGLETON','__V1127_AUDIO_SINGLETON']){
    try{
      const old=window[key];
      old?.stop?.(); old?.music?.pause?.(); old?.buttonAudio?.pause?.();
      if(old)old.active=false;
    }catch(_){}
  }

  const nativeAudioContext=window.AudioContext;
  const nativeWebkitAudioContext=window.webkitAudioContext;
  let restored=false;
  window.__EGYPT_MENU_AUDIO_RESTORE_CONTEXT=()=>{
    if(restored)return;
    restored=true;
    try{if(nativeAudioContext)window.AudioContext=nativeAudioContext;}catch(_){}
    try{if(nativeWebkitAudioContext)window.webkitAudioContext=nativeWebkitAudioContext;}catch(_){}
    window.__EGYPT_MENU_AUDIO_CONTEXT_RESTORED=true;
  };
  try{if(nativeAudioContext)window.AudioContext=undefined;}catch(_){}
  try{if(nativeWebkitAudioContext)window.webkitAudioContext=undefined;}catch(_){}

  const restoreWhenGameplayStarts=()=>{
    if(document.body?.classList?.contains('game-started')){
      window.__EGYPT_MENU_AUDIO_RESTORE_CONTEXT?.();
      return true;
    }
    return false;
  };
  if(!restoreWhenGameplayStarts()){
    const mo=new MutationObserver(()=>{if(restoreWhenGameplayStarts())mo.disconnect();});
    const begin=()=>{if(document.body)mo.observe(document.body,{attributes:true,attributeFilter:['class']});};
    if(document.body)begin(); else document.addEventListener('DOMContentLoaded',begin,{once:true});
  }

  if(!document.querySelector('script[data-egypt-v1128-performance]')){
    const perf=document.createElement('script');
    perf.src='game-v11-28-performance.js?v=11.28.0';
    perf.async=false;
    perf.dataset.egyptV1128Performance='true';
    document.head.appendChild(perf);
  }
})();
