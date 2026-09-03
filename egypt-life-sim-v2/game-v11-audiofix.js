(() => {
  'use strict';

  function loadV1111Details(){
    if(document.querySelector('script[data-egypt-v1111-details]'))return;
    const s=document.createElement('script');s.src='game-v11-11-egypt-details.js?v=11.11';s.dataset.egyptV1111Details='true';s.async=false;s.onerror=()=>console.error('V11.11 Egyptian details failed to load');document.body.appendChild(s);
  }

  function loadV1114Local(){
    if(document.querySelector('script[data-egypt-v1114-sfx]'))return;
    const s=document.createElement('script');s.src='game-v11-14-local-sfx.js?v=11.14';s.dataset.egyptV1114Sfx='true';s.async=false;s.onerror=()=>console.error('V11.14 local SFX failed to load');document.body.appendChild(s);
  }

  function loadV1110Actual(){
    if(document.querySelector('script[data-egypt-v1110-sfx]')){loadV1114Local();return;}
    const s=document.createElement('script');s.src='game-v11-10-actual-sfx.js?v=11.10';s.dataset.egyptV1110Sfx='true';s.async=false;s.onload=loadV1114Local;s.onerror=()=>{console.error('V11.10 actual SFX failed to load');loadV1114Local();};document.body.appendChild(s);
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

  window.__V11_AUDIOFIX={version:15,release:'11.14',visualRelease:'11.13',singleAudioEngine:true,startupGuard:false,legacyExtraLayersDisabled:true,v1110ActualSfx:true,v1114LocalSfx:true,sameOriginSfxPrimary:true,remoteRequired:false,proceduralFallback:true,v1111EgyptDetails:true,additiveVisualLayer:true};
  if(window.__egyptDebug)window.__egyptDebug.v11AudioFixState=()=>({...window.__V11_AUDIOFIX});
  loadV1111Details();
  loadRuntime();
})();