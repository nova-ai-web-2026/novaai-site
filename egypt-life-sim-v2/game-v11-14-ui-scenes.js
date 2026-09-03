(() => {
  'use strict';

  const MOBILE='(max-width: 760px)';
  const HOME={x:-150,z:-150};
  let locationChip=null,lastLocation='';

  function installStyles(){
    if(document.getElementById('v1114-ui-style'))return;
    const style=document.createElement('style');
    style.id='v1114-ui-style';
    style.textContent=`
      #v1114Location{font-size:10px;font-weight:800;color:#f0d28c;opacity:.92;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #mission{transition:width .16s ease,transform .16s ease,background .16s ease}
      @media(max-width:760px){
        #top{top:max(7px,env(safe-area-inset-top));left:7px;right:7px;display:grid;grid-template-columns:minmax(0,1fr) 76px;gap:5px;align-items:start;direction:rtl}
        #stats{grid-template-columns:repeat(4,minmax(0,1fr));width:auto;min-width:0;max-width:none;gap:2px;padding:3px;border-radius:10px;direction:rtl}
        .stat{min-width:0;padding:3px 2px;border-radius:7px;text-align:center;overflow:hidden}
        .lab{font-size:7px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .val{font-size:10px;line-height:1.15;margin-top:2px;white-space:nowrap}
        .meter{height:2px;margin-top:2px}
        #clock{min-width:0;width:76px;padding:5px 4px;border-radius:10px}
        .clockMain{font-size:13px;line-height:1.1}.clockSub{font-size:7px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #mission{right:7px;top:56px;width:min(68vw,255px);max-width:calc(100vw - 58px);padding:6px 8px;border-radius:10px;line-height:1.3;pointer-events:auto;cursor:pointer}
        #mission.v1114-expanded{width:min(86vw,330px);background:rgba(19,18,16,.92)}
        .mTitle{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mText{font-size:9px;margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        #mission.v1114-expanded .mText{-webkit-line-clamp:unset;display:block;overflow:visible}
        #soundToggle{top:56px;left:7px;width:38px;height:38px;padding:0;border-radius:50%;font-size:0}
        #soundToggle:before{content:'🔊';font-size:16px}
        #toast{top:118px;max-width:76vw;padding:7px 10px;font-size:10px;border-radius:9px}
        #mapWrap{width:78px;height:78px;left:7px;bottom:142px;padding:4px;border-radius:12px}
        #joy{left:13px;bottom:18px;width:102px;height:102px}#knob{left:34px;top:34px;width:34px;height:34px}
        #act{right:15px;bottom:26px;width:60px;height:60px;font-size:11px}#run{right:25px;bottom:96px;width:42px;height:42px;font-size:9px}
        #prompt{bottom:20%;font-size:10px;padding:7px 10px}
        #v12DoorPrompt{bottom:20%!important;font-size:10px!important;padding:7px 10px!important;max-width:76vw;text-align:center}
        .modal{width:min(94vw,520px);max-height:72dvh;padding:14px;border-radius:15px}.modal h2{font-size:18px}.desc{font-size:12px}.item{padding:8px;font-size:12px}.item button,.closeBtn{padding:8px 10px;font-size:11px}
        .v12copy{right:18px!important;left:18px!important;bottom:9vh!important;max-width:none!important}.v12place{font-size:10px!important}.v12title{font-size:38px!important;margin-top:4px!important}.v12line{font-size:12px!important;line-height:1.55!important;margin-top:5px!important}
      }
      @media(max-width:390px){
        #top{grid-template-columns:minmax(0,1fr) 70px}
        #clock{width:70px}.val{font-size:9px}.lab{font-size:6.5px}
        #mission{top:54px;width:min(70vw,245px)}#soundToggle{top:54px}
      }
      @media(max-height:700px) and (max-width:760px){
        #mission{top:52px}.mText{-webkit-line-clamp:1}#toast{top:100px}#mapWrap{bottom:126px;width:70px;height:70px}
        #joy{width:92px;height:92px}#knob{left:30px;top:30px;width:32px;height:32px}
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

  function stabilizeSceneUI(){
    installStyles();ensureLocationChip();
    const kicker=document.querySelector('.kicker');if(kicker)kicker.textContent='HAYAT MASR • V12.1';
    const foot=document.querySelector('.menuFoot');if(foot)foot.textContent='V12.1 — Mobile HUD + scene UI polish';
    const timer=setInterval(updateLocation,180);updateLocation();
    window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
    window.__V1114_UI={version:'11.14',release:'12.1',ready:true,mobileHud:'single-row-stats',missionNoOverlap:true,locationAware:true,scenes:['المقدمة','البيت','الحارة','منطقة المحطة','منطقة السوق'],audioTouched:false};
    window.__egyptDebug=window.__egyptDebug||{};
    window.__egyptDebug.v1114UiState=()=>({...window.__V1114_UI,location:lastLocation,mobile:matchMedia(MOBILE).matches});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',stabilizeSceneUI,{once:true});else stabilizeSceneUI();
})();
