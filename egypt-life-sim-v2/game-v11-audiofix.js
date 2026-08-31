(() => {
  'use strict';

  function loadV119Sfx(){
    if(document.querySelector('script[data-egypt-v119-sfx],script[data-egypt-v118-sfx]'))return;
    const s=document.createElement('script');s.src='game-v11-8-sfx.js?v=11.9';s.dataset.egyptV119Sfx='true';s.async=false;s.onerror=()=>console.error('V11.9 quality SFX failed to load');document.body.appendChild(s);
  }

  function loadV119Fallback(){
    if(document.querySelector('script[data-egypt-v119-runtime],script[data-egypt-v116-runtime]')){loadV119Sfx();return;}
    const s=document.createElement('script');s.src='game-v11-6-runtime.js?v=11.9';s.dataset.egyptV119Runtime='true';s.async=false;s.onload=loadV119Sfx;s.onerror=()=>{console.error('V11.9 runtime failed to load');loadV119Sfx();};document.body.appendChild(s);
  }

  document.getElementById('v113-startup-style')?.remove();document.body.classList.remove('v113-menu-open');document.getElementById('v115SoundTest')?.remove();

  window.__V11_AUDIOFIX={version:12,release:'11.9',singleAudioEngine:true,startupGuard:false,legacyExtraLayersDisabled:true,v119QualitySfx:true,legacyGameplaySfxMuted:true,qualityFoleyBank:true,webAudioOnly:true,htmlFallback:false};
  if(window.__egyptDebug)window.__egyptDebug.v11AudioFixState=()=>({...window.__V11_AUDIOFIX});
  loadV119Fallback();
})();