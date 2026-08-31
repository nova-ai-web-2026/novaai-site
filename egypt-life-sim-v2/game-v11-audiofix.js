(() => {
  'use strict';

  function loadV1110Actual(){
    if(document.querySelector('script[data-egypt-v1110-sfx]'))return;
    const s=document.createElement('script');s.src='game-v11-10-actual-sfx.js?v=11.10';s.dataset.egyptV1110Sfx='true';s.async=false;s.onerror=()=>console.error('V11.10 actual SFX failed to load');document.body.appendChild(s);
  }

  function loadV119Sfx(){
    if(document.querySelector('script[data-egypt-v119-sfx],script[data-egypt-v118-sfx]')){loadV1110Actual();return;}
    const s=document.createElement('script');s.src='game-v11-8-sfx.js?v=11.10';s.dataset.egyptV119Sfx='true';s.async=false;s.onload=loadV1110Actual;s.onerror=()=>{console.error('V11.9 fallback SFX failed to load');loadV1110Actual();};document.body.appendChild(s);
  }

  function loadRuntime(){
    if(document.querySelector('script[data-egypt-v119-runtime],script[data-egypt-v116-runtime]')){loadV119Sfx();return;}
    const s=document.createElement('script');s.src='game-v11-6-runtime.js?v=11.10';s.dataset.egyptV119Runtime='true';s.async=false;s.onload=loadV119Sfx;s.onerror=()=>{console.error('V11.10 runtime failed to load');loadV119Sfx();};document.body.appendChild(s);
  }

  document.getElementById('v113-startup-style')?.remove();document.body.classList.remove('v113-menu-open');document.getElementById('v115SoundTest')?.remove();

  window.__V11_AUDIOFIX={version:13,release:'11.10',singleAudioEngine:true,startupGuard:false,legacyExtraLayersDisabled:true,v1110ActualSfx:true,actualSamples:true,remoteSamplePrimary:true,proceduralFallback:true};
  if(window.__egyptDebug)window.__egyptDebug.v11AudioFixState=()=>({...window.__V11_AUDIOFIX});
  loadRuntime();
})();