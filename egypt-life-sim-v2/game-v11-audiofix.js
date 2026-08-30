(() => {
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  function installStartupGuard(){
    if(document.getElementById('v113-startup-style'))return;
    const style=document.createElement('style');style.id='v113-startup-style';style.textContent='body.v113-menu-open #hud{visibility:hidden!important}body.v113-menu-open #game{filter:brightness(.72)}body.v113-menu-open #menu{opacity:1!important;visibility:visible!important;transition:none!important;background:linear-gradient(90deg,rgba(8,8,7,.72) 0%,rgba(8,8,7,.84) 42%,rgba(8,8,7,.97) 100%)!important}';document.head.appendChild(style);
    document.body.classList.add('v113-menu-open');
    const release=()=>document.body.classList.remove('v113-menu-open');
    document.getElementById('newGameBtn')?.addEventListener('click',release,true);
    document.getElementById('continueBtn')?.addEventListener('click',release,true);
    window.__V113_STARTUP={version:'11.3',menuGuard:true,hudHiddenUntilStart:true};
  }
  function loadV114(){
    if(document.querySelector('script[data-egypt-v114-audio]'))return;
    const s=document.createElement('script');s.src='game-v11-4-audio.js?v=11.4';s.dataset.egyptV114Audio='true';s.async=false;s.onerror=()=>console.error('V11.4 dedicated audio failed to load');document.body.appendChild(s);
  }
  function loadV112(){
    if(document.querySelector('script[data-egypt-v112-audio]')){loadV114();return;}
    const s=document.createElement('script');s.src='game-v11-2-audio.js?v=11.3';s.dataset.egyptV112Audio='true';s.async=false;s.onload=loadV114;s.onerror=()=>console.error('V11.3 calm audio failed to load');document.body.appendChild(s);
  }
  async function boot(){
    installStartupGuard();
    for(let i=0;i<260;i++){if(window.__V111_PATCH?.version==='11.1')break;await sleep(50);}
    const enforce=()=>{const ctx=window.__V11_AUDIO_CONTEXT;if(!ctx)return;const oldV11=window.__V11_OWN_MASTER;if(oldV11&&!oldV11.__v111Disconnected){try{oldV11.disconnect();oldV11.__v111Disconnected=true;}catch(_){}}try{if(oldV11)oldV11.gain.setTargetAtTime(0,ctx.currentTime,.02);}catch(_){}try{if(window.__V11_LEGACY_MASTER)window.__V11_LEGACY_MASTER.gain.setTargetAtTime(0,ctx.currentTime,.025);}catch(_){}};
    const timer=setInterval(enforce,80);enforce();
    window.__V11_AUDIOFIX={version:5,legacyLocked:true,v11BusDisconnected:true,legacyCoreMuted:true,startupGuard:true,dedicatedV114:true,intervalMs:80};
    if(window.__egyptDebug)window.__egyptDebug.v11AudioFixState=()=>({...window.__V11_AUDIOFIX,disconnected:!!window.__V11_OWN_MASTER?.__v111Disconnected});
    loadV112();window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
  }
  boot().catch(err=>console.error('V11 audio lock failed',err));
})();