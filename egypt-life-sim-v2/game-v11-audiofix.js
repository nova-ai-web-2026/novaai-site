(() => {
  'use strict';

  function loadV117(){
    if(document.querySelector('script[data-egypt-v117-sfx]'))return;
    const s=document.createElement('script');
    s.src='game-v11-7-sfx.js?v=11.7';
    s.dataset.egyptV117Sfx='true';
    s.async=false;
    s.onerror=()=>console.error('V11.7 SFX failed to load');
    document.body.appendChild(s);
  }

  function loadV116(){
    if(document.querySelector('script[data-egypt-v116-runtime]')){loadV117();return;}
    const s=document.createElement('script');
    s.src='game-v11-6-runtime.js?v=11.7';
    s.dataset.egyptV116Runtime='true';
    s.async=false;
    s.onload=loadV117;
    s.onerror=()=>console.error('V11.6 runtime failed to load');
    document.body.appendChild(s);
  }

  document.getElementById('v113-startup-style')?.remove();
  document.body.classList.remove('v113-menu-open');
  document.getElementById('v115SoundTest')?.remove();

  window.__V11_AUDIOFIX={
    version:8,
    singleAudioEngine:true,
    startupGuard:false,
    legacyExtraLayersDisabled:true,
    v116Runtime:true,
    v117Sfx:true
  };
  if(window.__egyptDebug)window.__egyptDebug.v11AudioFixState=()=>({...window.__V11_AUDIOFIX});
  loadV116();
})();
