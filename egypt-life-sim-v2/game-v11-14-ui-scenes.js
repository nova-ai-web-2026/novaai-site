(() => {
  'use strict';
  if(window.__V1114_BOOTED)return;window.__V1114_BOOTED=true;

  const MOBILE='(max-width: 760px)';
  const HOME={x:-150,z:-150};
  const HOME_DOOR={x:-150,z:-143.15};
  const STREET_DOOR={x:-96,z:-82.2};
  let locationChip=null,lastLocation='',safeStreetDoor=null;

  function installStyles(){
    if(document.getElementById('v1114-ui-style'))return;
    const style=document.createElement('style');
    style.id='v1114-ui-style';
    style.textContent=`
      #v1114Location{font-size:10px;font-weight:800;color:#f0d28c;opacity:.92;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #mission{transition:width .16s ease,transform .16s ease,background .16s ease}
      @media(max-width:760px){
        body #top{top:max(7px,env(safe-area-inset-top))!important;left:7px!important;right:7px!important;display:grid!important;grid-template-columns:minmax(0,1fr) 76px!important;gap:5px!important;align-items:start!important;direction:rtl!important}
        body #stats{grid-template-columns:repeat(4,minmax(0,1fr))!important;width:auto!important;min-width:0!important;max-width:none!important;gap:2px!important;padding:3px!important;border-radius:10px!important;direction:rtl!important}
        body .stat{min-width:0!important;padding:3px 2px!important;border-radius:7px!important;text-align:center!important;overflow:hidden!important}
        body .lab{font-size:7px!important;line-height:1.1!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
        body .val{font-size:10px!important;line-height:1.15!important;margin-top:2px!important;white-space:nowrap!important}
        body .meter{height:2px!important;margin-top:2px!important}
        body #clock{min-width:0!important;width:76px!important;padding:5px 4px!important;border-radius:10px!important}
        body .clockMain{font-size:13px!important;line-height:1.1!important}body .clockSub{font-size:7px!important;margin-top:2px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
        body #mission{right:7px!important;top:56px!important;width:min(68vw,255px)!important;max-width:calc(100vw - 58px)!important;padding:6px 8px!important;border-radius:10px!important;line-height:1.3!important;pointer-events:auto!important;cursor:pointer!important}
        body #mission.v1114-expanded{width:min(86vw,330px)!important;background:rgba(19,18,16,.92)!important}
        body .mTitle{font-size:10px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
        body .mText{font-size:9px!important;margin-top:2px!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
        body #mission.v1114-expanded .mText{-webkit-line-clamp:unset!important;display:block!important;overflow:visible!important}
        body #soundToggle{top:56px!important;left:7px!important;width:38px!important;height:38px!important;padding:0!important;border-radius:50%!important;font-size:0!important;display:grid!important;place-items:center!important}
        body #soundToggle:before{content:attr(data-v1112-icon);font-size:16px!important;line-height:1!important}
        body #toast{top:118px!important;max-width:76vw!important;padding:7px 10px!important;font-size:10px!important;border-radius:9px!important}
        body #mapWrap{width:78px!important;height:78px!important;left:7px!important;bottom:142px!important;padding:4px!important;border-radius:12px!important}
        body #joy{left:13px!important;bottom:18px!important;width:102px!important;height:102px!important}body #knob{left:34px!important;top:34px!important;width:34px!important;height:34px!important}
        body #act{right:15px!important;bottom:26px!important;width:60px!important;height:60px!important;font-size:11px!important}body #run{right:25px!important;bottom:96px!important;width:42px!important;height:42px!important;font-size:9px!important}
        body #prompt{bottom:20%!important;font-size:10px!important;padding:7px 10px!important}
        body #v12DoorPrompt{bottom:20%!important;font-size:10px!important;padding:7px 10px!important;max-width:76vw!important;text-align:center!important}
        body .modal{width:min(94vw,520px)!important;max-height:72dvh!important;padding:14px!important;border-radius:15px!important}body .modal h2{font-size:18px!important}body .desc{font-size:12px!important}body .item{padding:8px!important;font-size:12px!important}body .item button,body .closeBtn{padding:8px 10px!important;font-size:11px!important}
        body .v12copy{right:18px!important;left:18px!important;bottom:9vh!important;max-width:none!important}body .v12place{font-size:10px!important}body .v12title{font-size:38px!important;margin-top:4px!important}body .v12line{font-size:12px!important;line-height:1.55!important;margin-top:5px!important}
      }
      @media(max-width:390px){
        body #top{grid-template-columns:minmax(0,1fr) 70px!important}
        body #clock{width:70px!important}body .val{font-size:9px!important}body .lab{font-size:6.5px!important}
        body #mission{top:54px!important;width:min(70vw,245px)!important}body #soundToggle{top:54px!important}
      }
      @media(max-height:700px) and (max-width:760px){
        body #mission{top:52px!important}body .mText{-webkit-line-clamp:1!important}body #toast{top:100px!important}body #mapWrap{bottom:126px!important;width:70px!important;height:70px!important}
        body #joy{width:92px!important;height:92px!important}body #knob{left:30px!important;top:30px!important;width:32px!important;height:32px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureLocationChip(){
    const mission=document.getElementById('mission');
    if(!mission)return null;
    let chip=document.getElementById('v1114Location');
    if(!chip){
      chip=document.createElement('div');chip.id='v1114Location';chip.textContent='📍 الحارة';
      mission.insertBefore(chip,mission.firstChild);
      mission.title='اضغط لعرض المهمة كاملة';
      mission.addEventListener('click',()=>{if(matchMedia(MOBILE).matches)mission.classList.toggle('v1114-expanded');});
    }
    locationChip=chip;return chip;
  }

  function cameraPoint(){
    try{return window.__egyptDebug?.getCamera?.()||null;}catch(_){return null;}
  }
  const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):999;
  function locationFor(cam){
    if(!cam)return 'الحارة';
    if(Math.hypot(cam.x-HOME.x,cam.z-HOME.z)<18)return 'البيت';
    if(cam.z>108&&cam.x<108)return 'منطقة المحطة';
    if(cam.x>108&&cam.z<108)return 'منطقة السوق';
    return 'الحارة';
  }
  function updateLocation(){
    const chip=ensureLocationChip(),cam=cameraPoint();if(!chip||!cam)return;
    const name=locationFor(cam);if(name===lastLocation)return;lastLocation=name;chip.textContent='📍 '+name;
  }

  function activeScene(){return window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0]||null;}
  function pointBlocked(scene,x,z,r=.44){
    for(const mesh of scene?.meshes||[]){
      if(!mesh?.checkCollisions||mesh.isEnabled?.()===false||!mesh.getBoundingInfo)continue;
      try{
        mesh.computeWorldMatrix(true);const bb=mesh.getBoundingInfo().boundingBox,min=bb.minimumWorld,max=bb.maximumWorld;
        if(max.y<.12||min.y>2.45)continue;
        if(x+r>min.x&&x-r<max.x&&z+r>min.z&&z-r<max.z)return mesh.name||'collision';
      }catch(_){}
    }
    return null;
  }
  function nearestBaseBuilding(scene,x,z){
    let best=Infinity;
    for(const mesh of scene?.meshes||[]){
      if(mesh?.name!=='building'||!mesh.getBoundingInfo)continue;
      try{
        mesh.computeWorldMatrix(true);const bb=mesh.getBoundingInfo().boundingBox,min=bb.minimumWorld,max=bb.maximumWorld;
        const dx=Math.max(min.x-x,0,x-max.x),dz=Math.max(min.z-z,0,z-max.z);best=Math.min(best,Math.hypot(dx,dz));
      }catch(_){}
    }
    return Number.isFinite(best)?best:99;
  }
  function resolveSafeStreetDoor(){
    const scene=activeScene();if(!scene)return null;
    const candidates=[[0,2.45],[0,2.2],[0,-2.45],[2.2,0],[-2.2,0],[1.55,1.55],[-1.55,1.55],[1.55,-1.55],[-1.55,-1.55],[0,1.8]];
    for(const [dx,dz] of candidates){
      const x=STREET_DOOR.x+dx,z=STREET_DOOR.z+dz;
      if(!pointBlocked(scene,x,z)&&nearestBaseBuilding(scene,x,z)>.45)return {x,z};
    }
    return null;
  }
  function rewriteToast(text){
    const t=document.getElementById('toast');if(!t)return;t.textContent=text;t.classList.add('show');
  }
  function normalizeDoorExit(){
    const cam=cameraPoint();if(!cam||distance(cam,STREET_DOOR)>1.15)return false;
    const safe=safeStreetDoor||resolveSafeStreetDoor();if(!safe)return false;safeStreetDoor=safe;
    try{
      window.__egyptDebug?.v12Teleport?.(safe.x,safe.z);rewriteToast('نزلت للشارع 🇪🇬');
      window.__V1114_UI={...window.__V1114_UI,safeStreetDoor:{x:+safe.x.toFixed(2),z:+safe.z.toFixed(2)},doorTransitionRepaired:true};
      return true;
    }catch(_){return false;}
  }
  function installDoorRepair(){
    if(window.__V1114_DOOR_REPAIR)return;
    const original=window.__V12_INTERACT_DOOR;if(typeof original!=='function')return;
    safeStreetDoor=resolveSafeStreetDoor();
    window.__V12_INTERACT_DOOR=()=>{const result=original();normalizeDoorExit();return result;};
    const afterInput=()=>setTimeout(normalizeDoorExit,0);
    window.addEventListener('keydown',e=>{if(e.key==='e'||e.key==='E')afterInput();});
    document.getElementById('act')?.addEventListener('click',afterInput);
    window.__V1114_DOOR_REPAIR=true;
  }

  function stabilizeSceneUI(){
    installStyles();ensureLocationChip();installDoorRepair();
    const kicker=document.querySelector('.kicker');if(kicker)kicker.textContent='HAYAT MASR • V12.1';
    const foot=document.querySelector('.menuFoot');if(foot)foot.textContent='V12.1 — Mobile HUD + scene UI polish';
    const timer=setInterval(()=>{updateLocation();if(!window.__V1114_DOOR_REPAIR)installDoorRepair();},180);updateLocation();
    window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
    window.__V1114_UI={version:'11.14',release:'12.1',ready:true,mobileHud:'single-row-stats',missionNoOverlap:true,locationAware:true,scenes:['المقدمة','البيت','الحارة','منطقة المحطة','منطقة السوق'],audioTouched:false,doorTransitionRepaired:!!window.__V1114_DOOR_REPAIR,safeStreetDoor:safeStreetDoor?{x:+safeStreetDoor.x.toFixed(2),z:+safeStreetDoor.z.toFixed(2)}:null};
    window.__egyptDebug=window.__egyptDebug||{};
    window.__egyptDebug.v1114UiState=()=>({...window.__V1114_UI,location:lastLocation,mobile:matchMedia(MOBILE).matches});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',stabilizeSceneUI,{once:true});else stabilizeSceneUI();
})();
