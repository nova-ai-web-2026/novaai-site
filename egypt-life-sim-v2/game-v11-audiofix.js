(() => {
  'use strict';

  function loadV1111Details(){
    if(document.querySelector('script[data-egypt-v1111-details]'))return;
    const s=document.createElement('script');s.src='game-v11-11-egypt-details.js?v=11.11';s.dataset.egyptV1111Details='true';s.async=false;s.onerror=()=>console.error('V11.11 Egyptian details failed to load');document.body.appendChild(s);
  }

  function loadV1116Sfx(){
    if(document.querySelector('script[data-egypt-v1116-sfx]'))return;
    const s=document.createElement('script');s.src='game-v11-15-real-sfx.js?v=11.16';s.dataset.egyptV1116Sfx='true';s.async=false;s.onerror=()=>console.error('V11.16 local SFX failed to load');document.body.appendChild(s);
  }

  function loadRuntime(){
    if(document.querySelector('script[data-egypt-v119-runtime],script[data-egypt-v116-runtime]')){loadV1116Sfx();return;}
    const s=document.createElement('script');s.src='game-v11-6-runtime.js?v=11.10';s.dataset.egyptV119Runtime='true';s.async=false;s.onload=loadV1116Sfx;s.onerror=()=>{console.error('V11.10 runtime failed to load');loadV1116Sfx();};document.body.appendChild(s);
  }

  document.getElementById('v113-startup-style')?.remove();document.body.classList.remove('v113-menu-open');document.getElementById('v115SoundTest')?.remove();

  window.__V11_AUDIOFIX={
    version:17,release:'11.16',visualRelease:'11.13',singleAudioEngine:true,startupGuard:false,
    oneGameplaySfxLayer:true,v1116LocalPrimary:true,sameOriginPrimary:true,networkIndependentSfx:true,
    olderSfxLayersSkipped:true,gameMasterMuted:true,v1111EgyptDetails:true,additiveVisualLayer:true
  };
  if(window.__egyptDebug)window.__egyptDebug.v11AudioFixState=()=>({...window.__V11_AUDIOFIX});
  loadV1111Details();
  loadRuntime();
})();