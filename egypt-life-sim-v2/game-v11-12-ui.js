(() => {
  'use strict';

  const menu=document.getElementById('menu');
  const soundToggle=document.getElementById('soundToggle');
  let previewScene=null,previewHandle=null,previewTimer=null,previewActive=false;

  function installStyle(){
    if(document.getElementById('v1112-ui-style'))return;
    const style=document.createElement('style');
    style.id='v1112-ui-style';
    style.textContent=`
      #menu{background:linear-gradient(90deg,rgba(8,8,7,.04) 0%,rgba(8,8,7,.16) 38%,rgba(8,8,7,.58) 72%,rgba(8,8,7,.84) 100%)!important}
      #menu:before{background:linear-gradient(0deg,rgba(7,7,6,.56),transparent 48%),radial-gradient(circle at 24% 28%,rgba(236,177,72,.08),transparent 34%)!important}
      #menuScene{background:transparent!important;box-shadow:inset 0 0 90px rgba(0,0,0,.24)!important}
      #menuScene:after{opacity:.045!important}
      @media(max-width:760px){
        #top{top:max(7px,env(safe-area-inset-top))!important;left:8px!important;right:8px!important;gap:6px!important}
        #stats{grid-template-columns:repeat(2,minmax(0,1fr))!important;width:46vw!important;min-width:0!important;gap:3px!important;padding:4px!important;border-radius:11px!important}
        .stat{padding:3px 5px!important;border-radius:8px!important}
        .lab{font-size:8px!important}.val{font-size:11px!important;margin-top:1px!important}.meter{height:2px!important;margin-top:2px!important}
        #clock{min-width:78px!important;padding:5px 7px!important;border-radius:11px!important}.clockMain{font-size:14px!important}.clockSub{font-size:8px!important;margin-top:1px!important}
        #soundToggle{top:63px!important;left:8px!important;width:36px!important;height:36px!important;padding:0!important;border-radius:50%!important;font-size:0!important;display:grid!important;place-items:center!important}
        #soundToggle:before{content:attr(data-v1112-icon);font-size:16px!important;line-height:1}
        #mission{right:8px!important;top:82px!important;width:min(46vw,190px)!important;padding:6px 8px!important;border-radius:10px!important;line-height:1.25!important}
        .mTitle{font-size:10px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.mText{font-size:9px!important;margin-top:2px!important;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden!important}
        #mapWrap{width:82px!important;height:82px!important;left:8px!important;bottom:146px!important;padding:4px!important;border-radius:13px!important}
        #joy{left:14px!important;bottom:20px!important;width:104px!important;height:104px!important}#knob{left:34px!important;top:34px!important;width:36px!important;height:36px!important}
        #act{right:16px!important;bottom:28px!important;width:62px!important;height:62px!important;font-size:12px!important}#run{right:27px!important;bottom:100px!important;width:44px!important;height:44px!important;font-size:9px!important}
        #toast{top:86px!important;font-size:10px!important;padding:7px 9px!important;max-width:58vw!important}
        #prompt{font-size:10px!important;padding:7px 9px!important}
        #menu{background:linear-gradient(0deg,rgba(7,7,6,.84) 0%,rgba(7,7,6,.56) 39%,rgba(7,7,6,.14) 68%,rgba(7,7,6,.015) 100%)!important;overflow:hidden!important}
        #menu:before{background:linear-gradient(0deg,rgba(7,7,6,.48),transparent 55%)!important}
        #menuContent{width:100%!important;min-height:100%!important;padding:47vh 14px 16px!important;justify-content:flex-end!important}
        .menuTopline{margin-bottom:7px!important}.kicker,.menuLocation{font-size:9px!important}
        .logo{font-size:42px!important;letter-spacing:-1px!important}.tagline{font-size:11px!important;line-height:1.45!important;margin:7px 0 0!important;max-width:92%!important;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden!important}
        .menuRule{width:46px!important;height:2px!important;margin:10px 0!important}.menuButtons{gap:6px!important;width:100%!important}.menuBtn{padding:10px 12px!important;border-radius:9px!important;font-size:12px!important}.menuMeta{display:none!important}
        #menuStatus{font-size:9px!important;margin-top:6px!important;min-height:12px!important}.menuFoot{display:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function syncMenuCopy(){
    const kicker=document.querySelector('.kicker');
    const tagline=document.querySelector('.tagline');
    const foot=document.querySelector('.menuFoot');
    if(kicker)kicker.textContent='HAYAT MASR • V11.12';
    if(tagline)tagline.textContent='حياة مصر — شوف الشارع قدامك واختار تبدأ يوم جديد أو تكمل حفظك.';
    if(foot)foot.textContent='V11.12 — live start scene + compact mobile HUD';
  }

  function syncSoundIcon(){
    if(!soundToggle)return;
    const text=soundToggle.textContent||'';
    soundToggle.dataset.v1112Icon=(text.includes('مكتوم')||text.includes('🔇'))?'🔇':'🔊';
  }

  function stopPreview(){
    if(previewScene&&previewHandle){try{previewScene.onBeforeRenderObservable.remove(previewHandle);}catch(_){}}
    previewHandle=null;previewScene=null;previewActive=false;
    window.__V1112_UI={...window.__V1112_UI,previewActive:false};
  }

  function tryInstallPreview(){
    if(previewActive)return true;
    const scene=window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0];
    const cam=scene?.activeCamera;
    if(!scene||!cam||!window.BABYLON?.Vector3)return false;
    const target=new BABYLON.Vector3(-24,1.45,-24);
    previewScene=scene;
    previewHandle=scene.onBeforeRenderObservable.add(()=>{
      if(document.body.classList.contains('game-started')||!menu||getComputedStyle(menu).display==='none'){stopPreview();return;}
      const active=scene.activeCamera;if(!active)return;
      const wave=performance.now()*.00010;
      const angle=.72+Math.sin(wave)*.18;
      const radius=15.5;
      active.position.x=-24+Math.cos(angle)*radius;
      active.position.z=-24+Math.sin(angle)*radius;
      active.position.y=2.35+Math.sin(wave*.7)*.08;
      if(typeof active.setTarget==='function')active.setTarget(target);
    });
    previewActive=true;
    window.__V1112_UI={...window.__V1112_UI,previewActive:true,previewTarget:'intersection--24--24'};
    return true;
  }

  installStyle();syncMenuCopy();syncSoundIcon();
  if(soundToggle)new MutationObserver(syncSoundIcon).observe(soundToggle,{childList:true,subtree:true,characterData:true});
  for(const id of ['newGameBtn','continueBtn']){
    const el=document.getElementById(id);if(!el)continue;
    el.addEventListener('pointerdown',stopPreview,{capture:true});
    el.addEventListener('touchstart',stopPreview,{capture:true,passive:true});
    el.addEventListener('click',stopPreview,{capture:true});
  }

  window.__V1112_UI={version:'11.12',liveStartScene:true,compactMobileHud:true,previewActive:false,mobileStatsWidthVw:46,mobileMissionWidthVw:46};
  previewTimer=setInterval(()=>{if(tryInstallPreview()&&previewTimer){clearInterval(previewTimer);previewTimer=null;}},120);
  tryInstallPreview();
  window.addEventListener('beforeunload',()=>{if(previewTimer)clearInterval(previewTimer);stopPreview();},{once:true});
})();