(() => {
  'use strict';

  const KEY='hayatMasr.menuAudio.v1129';
  const PRIOR=['hayatMasr.menuAudio.v1127','hayatMasr.menuAudio.v1126','hayatMasr.menuAudio.v1125'];
  try {
    if(!localStorage.getItem(KEY)){
      let prior=null;
      for(const k of PRIOR){
        try{prior=JSON.parse(localStorage.getItem(k)||'null');}catch(_){prior=null;}
        if(prior&&typeof prior==='object')break;
      }
      const migrated={
        enabled:prior?.enabled!==false,
        mode:prior?.mode==='continuous'?'continuous':'interaction',
        volume:Number.isFinite(+prior?.volume)?Math.max(.2,Math.min(1,+prior.volume)):.78
      };
      localStorage.setItem(KEY,JSON.stringify(migrated));
    }
    // The V11.26 synthesizer remains in the UI file for backwards compatibility,
    // but V11.29 gives menu-audio ownership exclusively to the sampled player.
    localStorage.setItem('hayatMasr.menuAudio.v1126',JSON.stringify({enabled:false,mode:'interaction',volume:.2}));
  } catch (_) {}

  window.__EGYPT_MENU_AUDIO_EXTERNAL=true;

  // Prevent the legacy V11.26 UI from creating its WebAudio synthesizer while it boots.
  // V11.29 restores the native constructors immediately in the next script.
  const nativeAudioContext=window.AudioContext;
  const nativeWebkitAudioContext=window.webkitAudioContext;
  window.__EGYPT_MENU_AUDIO_RESTORE_CONTEXT=()=>{
    try{if(nativeAudioContext)window.AudioContext=nativeAudioContext;}catch(_){}
    try{if(nativeWebkitAudioContext)window.webkitAudioContext=nativeWebkitAudioContext;}catch(_){}
    window.__EGYPT_MENU_AUDIO_CONTEXT_RESTORED=true;
  };
  try{if(nativeAudioContext)window.AudioContext=undefined;}catch(_){}
  try{if(nativeWebkitAudioContext)window.webkitAudioContext=undefined;}catch(_){}

  // Keep the V11.28 performance/stability layer loaded before the scene grows.
  if(!document.querySelector('script[data-egypt-v1128-performance]')){
    const perf=document.createElement('script');
    perf.src='game-v11-28-performance.js?v=11.28.0';
    perf.async=false;
    perf.dataset.egyptV1128Performance='true';
    document.head.appendChild(perf);
  }
})();
