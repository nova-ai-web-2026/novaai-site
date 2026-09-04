(() => {
  'use strict';

  const menu=document.getElementById('menu');
  const soundToggle=document.getElementById('soundToggle');
  let previewScene=null,previewCamera=null,gameCamera=null,previewHandle=null,previewTimer=null,menuObserver=null,previewActive=false;

  function installStyle(){
    if(document.getElementById('v1116-ui-style'))return;
    document.getElementById('v1112-ui-style')?.remove();
    const style=document.createElement('style');
    style.id='v1116-ui-style';
    style.textContent=`
      #game{position:fixed!important;inset:0!important;z-index:0!important;opacity:1!important;visibility:visible!important}
      #menu{background:linear-gradient(90deg,rgba(8,8,7,.025) 0%,rgba(8,8,7,.11) 38%,rgba(8,8,7,.50) 72%,rgba(8,8,7,.80) 100%)!important}
      #menu:before{background:linear-gradient(0deg,rgba(7,7,6,.48),transparent 50%),radial-gradient(circle at 24% 28%,rgba(236,177,72,.065),transparent 34%)!important}
      #menuScene{z-index:0!important;background:transparent!important;box-shadow:inset 0 0 68px rgba(0,0,0,.18)!important}
      #menuScene:after{opacity:.025!important}
      #menuContent{z-index:2!important}
      @media(max-width:760px){
        #top{top:max(7px,env(safe-area-inset-top))!important;left:8px!important;right:8px!important;gap:6px!important}
        #stats{grid-template-columns:repeat(2,minmax(0,1fr))!important;width:46vw!important;min-width:0!important;gap:3px!important;padding:4px!important;border-radius:11px!important}
        .stat{padding:3px 5px!important;border-radius:8px!important}.lab{font-size:8px!important}.val{font-size:11px!important;margin-top:1px!important}.meter{height:2px!important;margin-top:2px!important}
        #clock{min-width:78px!important;padding:5px 7px!important;border-radius:11px!important}.clockMain{font-size:14px!important}.clockSub{font-size:8px!important;margin-top:1px!important}
        #soundToggle{top:63px!important;left:8px!important;width:36px!important;height:36px!important;padding:0!important;border-radius:50%!important;font-size:0!important;display:grid!important;place-items:center!important}
        #soundToggle:before{content:attr(data-v1112-icon);font-size:16px!important;line-height:1}
        #mission{right:8px!important;top:82px!important;width:min(46vw,190px)!important;padding:6px 8px!important;border-radius:10px!important;line-height:1.25!important}
        .mTitle{font-size:10px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.mText{font-size:9px!important;margin-top:2px!important;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden!important}
        #mapWrap{width:82px!important;height:82px!important;left:8px!important;bottom:146px!important;padding:4px!important;border-radius:13px!important}
        #joy{left:14px!important;bottom:20px!important;width:104px!important;height:104px!important}#knob{left:34px!important;top:34px!important;width:36px!important;height:36px!important}
        #act{right:16px!important;bottom:28px!important;width:62px!important;height:62px!important;font-size:12px!important}#run{right:27px!important;bottom:100px!important;width:44px!important;height:44px!important;font-size:9px!important}
        #toast{top:86px!important;font-size:10px!important;padding:7px 9px!important;max-width:58vw!important}#prompt{font-size:10px!important;padding:7px 9px!important}
        #menu{background:linear-gradient(0deg,rgba(7,7,6,.78) 0%,rgba(7,7,6,.46) 37%,rgba(7,7,6,.08) 68%,rgba(7,7,6,0) 100%)!important;overflow:hidden!important}
        #menu:before{background:linear-gradient(0deg,rgba(7,7,6,.40),transparent 56%)!important}
        #menuContent{width:100%!important;min-height:100%!important;padding:49vh 14px 16px!important;justify-content:flex-end!important}
        .menuTopline{margin-bottom:7px!important}.kicker,.menuLocation{font-size:9px!important}.logo{font-size:42px!important;letter-spacing:-1px!important}
        .tagline{font-size:11px!important;line-height:1.45!important;margin:7px 0 0!important;max-width:92%!important;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden!important}
        .menuRule{width:46px!important;height:2px!important;margin:10px 0!important}.menuButtons{gap:6px!important;width:100%!important}.menuBtn{padding:10px 12px!important;border-radius:9px!important;font-size:12px!important}.menuMeta{display:none!important}
        #menuStatus{font-size:9px!important;margin-top:6px!important;min-height:12px!important}.menuFoot{display:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function syncMenuCopy(){
    const kicker=document.querySelector('.kicker'),tagline=document.querySelector('.tagline'),foot=document.querySelector('.menuFoot');
    if(kicker)kicker.textContent='HAYAT MASR • V11.16';
    if(tagline)tagline.textContent='حياة مصر — الشارع شغال قدامك من أول شاشة، وبعدها ادخل وكمل يومك.';
    if(foot)foot.textContent='V11.16 — dedicated live start camera + V11.15 sampled SFX';
  }

  function syncSoundIcon(){
    if(!soundToggle)return;
    const text=soundToggle.textContent||'';
    soundToggle.dataset.v1112Icon=(text.includes('مكتوم')||text.includes('🔇'))?'🔇':'🔊';
  }

  function publish(extra={}){
    const canvas=document.getElementById('game');
    window.__V1112_UI={
      version:'11.12',hardeningVersion:'11.16',liveStartScene:true,dedicatedPreviewCamera:true,compactMobileHud:true,
      previewActive,mobileStatsWidthVw:46,mobileMissionWidthVw:46,
      sceneMeshes:previewScene?.meshes?.length||0,
      previewCamera:previewCamera?{x:+previewCamera.position.x.toFixed(2),y:+previewCamera.position.y.toFixed(2),z:+previewCamera.position.z.toFixed(2)}:null,
      canvasVisible:canvas?getComputedStyle(canvas).visibility!=='hidden'&&getComputedStyle(canvas).display!=='none':false,
      ...extra
    };
    window.__V1116_START_SCENE=window.__V1112_UI;
  }

  function stopPreview(){
    if(previewScene&&previewHandle){try{previewScene.onBeforeRenderObservable.remove(previewHandle);}catch(_){}}
    if(previewScene&&gameCamera&&previewScene.activeCamera===previewCamera){try{previewScene.activeCamera=gameCamera;}catch(_){}}
    try{previewCamera?.dispose();}catch(_){}
    previewHandle=null;previewCamera=null;gameCamera=null;previewScene=null;previewActive=false;publish({stopped:true});
  }

  function menuVisible(){
    if(!menu)return false;
    const s=getComputedStyle(menu);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0';
  }

  function tryInstallPreview(){
    if(previewActive)return true;
    if(document.body.classList.contains('game-started')||!menuVisible())return false;
    const scene=window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0];
    const active=scene?.activeCamera;
    if(!scene||!active||!window.BABYLON?.UniversalCamera||!window.BABYLON?.Vector3||scene.meshes.length<40)return false;

    previewScene=scene;gameCamera=active;
    previewCamera=new BABYLON.UniversalCamera('v1116PreviewCamera',new BABYLON.Vector3(-24,2.55,-7),scene);
    previewCamera.minZ=.05;previewCamera.fov=.84;previewCamera.inertia=0;
    scene.activeCamera=previewCamera;

    previewHandle=scene.onBeforeRenderObservable.add(()=>{
      if(document.body.classList.contains('game-started')||!menuVisible()){stopPreview();return;}
      const t=performance.now()*.00018;
      previewCamera.position.x=-24+Math.sin(t)*1.25;
      previewCamera.position.z=-7+Math.cos(t*.72)*1.55;
      previewCamera.position.y=2.52+Math.sin(t*.45)*.10;
      previewCamera.setTarget(new BABYLON.Vector3(-24+Math.sin(t*.38)*1.1,1.42,-31));
      if(scene.activeCamera!==previewCamera)scene.activeCamera=previewCamera;
      publish({previewTarget:'street--24',cameraMoving:true});
    });

    previewActive=true;publish({previewTarget:'street--24',cameraMoving:true});
    return true;
  }

  installStyle();syncMenuCopy();syncSoundIcon();publish();
  if(soundToggle)new MutationObserver(syncSoundIcon).observe(soundToggle,{childList:true,subtree:true,characterData:true});
  if(menu){
    menuObserver=new MutationObserver(()=>{if(!menuVisible())stopPreview();});
    menuObserver.observe(menu,{attributes:true,attributeFilter:['style','class','hidden']});
  }
  for(const id of ['newGameBtn','continueBtn']){
    const el=document.getElementById(id);if(!el)continue;
    el.addEventListener('pointerdown',stopPreview,{capture:true});
    el.addEventListener('touchstart',stopPreview,{capture:true,passive:true});
    el.addEventListener('click',stopPreview,{capture:true});
  }

  previewTimer=setInterval(()=>{if(tryInstallPreview()&&previewTimer){clearInterval(previewTimer);previewTimer=null;}},100);
  tryInstallPreview();
  window.__egyptDebug=window.__egyptDebug||{};
  window.__egyptDebug.v1116StartSceneState=()=>({...window.__V1116_START_SCENE});
  window.addEventListener('beforeunload',()=>{if(previewTimer)clearInterval(previewTimer);menuObserver?.disconnect();stopPreview();},{once:true});
})();