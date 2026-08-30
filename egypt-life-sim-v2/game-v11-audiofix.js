(() => {
  'use strict';

  function loadV116(){
    if(document.querySelector('script[data-egypt-v116-runtime]'))return;
    const s=document.createElement('script');
    s.src='game-v11-6-runtime.js?v=11.6';
    s.dataset.egyptV116Runtime='true';
    s.async=false;
    s.onerror=()=>console.error('V11.6 runtime failed to load');
    document.body.appendChild(s);
  }

  document.getElementById('v113-startup-style')?.remove();
  document.body.classList.remove('v113-menu-open');
  document.getElementById('v115SoundTest')?.remove();

  window.__V11_AUDIOFIX={
    version:7,
    singleAudioEngine:true,
    startupGuard:false,
    legacyExtraLayersDisabled:true,
    v116Runtime:true
  };
  if(window.__egyptDebug)window.__egyptDebug.v11AudioFixState=()=>({...window.__V11_AUDIOFIX});
  loadV116();
})();
