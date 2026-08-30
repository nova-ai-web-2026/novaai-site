(() => {
  'use strict';

  function loadV118Sfx(){
    if(document.querySelector('script[data-egypt-v118-sfx]'))return;
    const s=document.createElement('script');
    s.src='game-v11-8-sfx.js?v=11.8';
    s.dataset.egyptV118Sfx='true';
    s.async=false;
    s.onerror=()=>console.error('V11.8 event SFX failed to load');
    document.body.appendChild(s);
  }

  function loadV118Fallback(){
    if(document.querySelector('script[data-egypt-v116-runtime]')){loadV118Sfx();return;}
    const s=document.createElement('script');
    s.src='game-v11-6-runtime.js?v=11.8';
    s.dataset.egyptV116Runtime='true';
    s.async=false;
    s.onload=loadV118Sfx;
    s.onerror=()=>{console.error('V11.8 runtime failed to load');loadV118Sfx();};
    document.body.appendChild(s);
  }

  document.getElementById('v113-startup-style')?.remove();
  document.body.classList.remove('v113-menu-open');
  document.getElementById('v115SoundTest')?.remove();

  window.__V11_AUDIOFIX={
    version:10,
    singleAudioEngine:true,
    startupGuard:false,
    legacyExtraLayersDisabled:true,
    v116Runtime:true,
    v117EarlyRuntime:true,
    v118EventSfx:true,
    gameplayMasterPreserved:true
  };
  if(window.__egyptDebug)window.__egyptDebug.v11AudioFixState=()=>({...window.__V11_AUDIOFIX});
  loadV118Fallback();
})();
