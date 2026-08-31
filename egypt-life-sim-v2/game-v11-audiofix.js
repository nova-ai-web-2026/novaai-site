(() => {
  'use strict';

  function loadV1110Sfx(){
    if(document.querySelector('script[data-egypt-v1110-sfx],script[data-egypt-v119-sfx],script[data-egypt-v118-sfx]'))return;
    const s=document.createElement('script');s.src='game-v11-8-sfx.js?v=11.10';s.dataset.egyptV1110Sfx='true';s.async=false;s.onerror=()=>console.error('V11.10 natural SFX failed to load');document.body.appendChild(s);
  }

  function loadV1110Fallback(){
    if(document.querySelector('script[data-egypt-v1110-runtime],script[data-egypt-v119-runtime],script[data-egypt-v116-runtime]')){loadV1110Sfx();return;}
    const s=document.createElement('script');s.src='game-v11-6-runtime.js?v=11.10';s.dataset.egyptV1110Runtime='true';s.async=false;s.onload=loadV1110Sfx;s.onerror=()=>{console.error('V11.10 runtime failed to load');loadV1110Sfx();};document.body.appendChild(s);
  }

  document.getElementById('v113-startup-style')?.remove();document.body.classList.remove('v113-menu-open');document.getElementById('v115SoundTest')?.remove();

  window.__V11_AUDIOFIX={version:13,release:'11.10',singleAudioEngine:true,startupGuard:false,legacyExtraLayersDisabled:true,v1110NaturalSfx:true,v119QualitySfx:false,legacyGameplaySfxMuted:true,naturalSampleBank:true,proceduralGameplayFoley:false,webAudioOnly:true,htmlFallback:false};
  if(window.__egyptDebug)window.__egyptDebug.v11AudioFixState=()=>({...window.__V11_AUDIOFIX});
  loadV1110Fallback();
})();