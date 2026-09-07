(() => {
  'use strict';

  const menu=document.getElementById('menu');
  const soundToggle=document.getElementById('soundToggle');
  let previewScene=null,previewCamera=null,gameCamera=null,previewHandle=null,previewTimer=null,menuObserver=null,previewActive=false;

  // Original, synthesized Egyptian shaabi-inspired menu loop.
  // It only runs while the start menu is visible and stops before gameplay.
  let menuMusicCtx=null,menuMusicMaster=null,menuMusicTimer=null,menuMusicNoise=null;
  let menuMusicNextTime=0,menuMusicStep=0,menuMusicUnlocked=false,menuMusicPlaying=false;
  const MENU_MUSIC_BPM=112;
  const MENU_MUSIC_STEP_SECONDS=(60/MENU_MUSIC_BPM)/4;

  function menuMusicMuted(){
    const text=soundToggle?.textContent||'';
    return text.includes('مكتوم')||text.includes('🔇');
  }

  function ensureMenuMusicContext(){
    if(menuMusicCtx)return menuMusicCtx;
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)return null;
    menuMusicCtx=new Ctx();
    menuMusicMaster=menuMusicCtx.createGain();
    menuMusicMaster.gain.value=.0001;
    menuMusicMaster.connect(menuMusicCtx.destination);
    const length=Math.max(1,Math.floor(menuMusicCtx.sampleRate*.12));
    menuMusicNoise=menuMusicCtx.createBuffer(1,length,menuMusicCtx.sampleRate);
    const data=menuMusicNoise.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
    return menuMusicCtx;
  }

  function menuMusicTone(freq,start,duration,volume=.025,type='sawtooth',filterHz=1300){
    const ctx=menuMusicCtx;if(!ctx||!menuMusicMaster)return;
    const osc=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,start);
    filter.type='lowpass';filter.frequency.setValueAtTime(filterHz,start);filter.Q.value=2.2;
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),start+.018);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    osc.connect(filter);filter.connect(gain);gain.connect(menuMusicMaster);
    osc.start(start);osc.stop(start+duration+.03);
  }

  function menuMusicLead(freq,start,duration=.22,volume=.018){
    const ctx=menuMusicCtx;if(!ctx||!menuMusicMaster)return;
    for(const detune of [-5,5]){
      const osc=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
      osc.type='square';osc.frequency.setValueAtTime(freq,start);osc.detune.value=detune;
      filter.type='bandpass';filter.frequency.setValueAtTime(1180,start);filter.Q.value=1.8;
      gain.gain.setValueAtTime(.0001,start);
      gain.gain.exponentialRampToValueAtTime(volume/2,start+.014);
      gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
      osc.connect(filter);filter.connect(gain);gain.connect(menuMusicMaster);
      osc.start(start);osc.stop(start+duration+.025);
    }
  }

  function menuMusicKick(start,volume=.09){
    const ctx=menuMusicCtx;if(!ctx||!menuMusicMaster)return;
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type='sine';osc.frequency.setValueAtTime(105,start);osc.frequency.exponentialRampToValueAtTime(42,start+.13);
    gain.gain.setValueAtTime(volume,start);gain.gain.exponentialRampToValueAtTime(.0001,start+.16);
    osc.connect(gain);gain.connect(menuMusicMaster);osc.start(start);osc.stop(start+.18);
  }

  function menuMusicClap(start,volume=.027){
    const ctx=menuMusicCtx;if(!ctx||!menuMusicMaster||!menuMusicNoise)return;
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    src.buffer=menuMusicNoise;filter.type='highpass';filter.frequency.setValueAtTime(1200,start);
    gain.gain.setValueAtTime(volume,start);gain.gain.exponentialRampToValueAtTime(.0001,start+.075);
    src.connect(filter);filter.connect(gain);gain.connect(menuMusicMaster);src.start(start);src.stop(start+.09);
  }

  function menuMusicTabla(start,high=false){
    const ctx=menuMusicCtx;if(!ctx||!menuMusicMaster)return;
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type='sine';osc.frequency.setValueAtTime(high?310:190,start);osc.frequency.exponentialRampToValueAtTime(high?190:125,start+.07);
    gain.gain.setValueAtTime(high?.024:.032,start);gain.gain.exponentialRampToValueAtTime(.0001,start+.09);
    osc.connect(gain);gain.connect(menuMusicMaster);osc.start(start);osc.stop(start+.1);
  }

  function scheduleMenuMusicStep(step,start){
    const s=step%32;
    if([0,6,8,11,16,22,24,27].includes(s))menuMusicKick(start,s===0||s===16?.1:.073);
    if([4,12,20,28].includes(s))menuMusicClap(start,.026);
    if([2,3,7,10,14,15,18,19,23,26,30,31].includes(s))menuMusicTabla(start,[3,7,15,19,23,31].includes(s));

    const bass=[73.42,73.42,65.41,69.30,73.42,73.42,58.27,65.41];
    if(s%4===0)menuMusicTone(bass[(s/4)%bass.length],start,.31,.027,'triangle',360);

    const hijaz=[293.66,311.13,369.99,392.00,440.00,392.00,369.99,311.13,
                 293.66,369.99,392.00,440.00,466.16,440.00,392.00,369.99];
    if(s%2===0){
      const note=hijaz[(s/2)%hijaz.length];
      menuMusicLead(note,start,s===14||s===30?.30:.20,s===0||s===16?.022:.017);
    }
  }

  function menuMusicScheduler(){
    const ctx=menuMusicCtx;if(!ctx||!menuMusicPlaying)return;
    while(menuMusicNextTime<ctx.currentTime+.55){
      scheduleMenuMusicStep(menuMusicStep,menuMusicNextTime);
      menuMusicNextTime+=MENU_MUSIC_STEP_SECONDS;
      menuMusicStep=(menuMusicStep+1)%32;
    }
  }

  function stopMenuMusic(fade=.28){
    if(!menuMusicCtx||!menuMusicMaster){menuMusicPlaying=false;return;}
    menuMusicPlaying=false;
    if(menuMusicTimer){clearInterval(menuMusicTimer);menuMusicTimer=null;}
    const t=menuMusicCtx.currentTime;
    try{
      menuMusicMaster.gain.cancelScheduledValues(t);
      menuMusicMaster.gain.setValueAtTime(Math.max(.0001,menuMusicMaster.gain.value),t);
      menuMusicMaster.gain.exponentialRampToValueAtTime(.0001,t+fade);
    }catch(_){}
    publish({menuMusicPlaying:false});
  }

  async function startMenuMusic(){
    if(document.body.classList.contains('game-started')||!menuVisible()||menuMusicMuted())return false;
    const ctx=ensureMenuMusicContext();if(!ctx)return false;
    try{if(ctx.state==='suspended')await ctx.resume();}catch(_){}
    if(ctx.state!=='running')return false;
    menuMusicUnlocked=true;
    if(menuMusicPlaying)return true;
    menuMusicPlaying=true;menuMusicStep=0;menuMusicNextTime=ctx.currentTime+.035;
    const t=ctx.currentTime;
    menuMusicMaster.gain.cancelScheduledValues(t);menuMusicMaster.gain.setValueAtTime(.0001,t);menuMusicMaster.gain.exponentialRampToValueAtTime(.24,t+.55);
    menuMusicScheduler();menuMusicTimer=setInterval(menuMusicScheduler,90);
    publish({menuMusicPlaying:true,menuMusicUnlocked:true});
    return true;
  }

  function syncMenuMusic(){
    if(document.hidden||document.body.classList.contains('game-started')||!menuVisible()||menuMusicMuted())stopMenuMusic(.18);
    else if(menuMusicUnlocked)startMenuMusic();
  }

  function unlockMenuMusic(){
    startMenuMusic().finally(()=>publish({menuMusicUnlocked:menuMusicUnlocked||menuMusicCtx?.state==='running'}));
  }

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
    syncMenuMusic();
  }

  function publish(extra={}){
    const canvas=document.getElementById('game');
    window.__V1112_UI={
      version:'11.12',hardeningVersion:'11.16',liveStartScene:true,dedicatedPreviewCamera:true,compactMobileHud:true,
      previewActive,mobileStatsWidthVw:46,mobileMissionWidthVw:46,
      sceneMeshes:previewScene?.meshes?.length||0,
      previewCamera:previewCamera?{x:+previewCamera.position.x.toFixed(2),y:+previewCamera.position.y.toFixed(2),z:+previewCamera.position.z.toFixed(2)}:null,
      canvasVisible:canvas?getComputedStyle(canvas).visibility!=='hidden'&&getComputedStyle(canvas).display!=='none':false,
      menuMusic:{style:'original-egyptian-shaabi-inspired',bpm:MENU_MUSIC_BPM,playing:menuMusicPlaying,unlocked:menuMusicUnlocked,menuOnly:true},
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
    previewCamera=new BABYLON.UniversalCamera('v1116PreviewCamera',new BABYLON.Vector3(-24,2.1,-29),scene);
    previewCamera.minZ=.05;previewCamera.fov=.84;previewCamera.inertia=0;
    previewCamera.setTarget(new BABYLON.Vector3(-12,1.55,-16));previewCamera.inputs.clear();
    scene.activeCamera=previewCamera;

    previewHandle=scene.onBeforeRenderObservable.add(()=>{
      if(document.body.classList.contains('game-started')||!menuVisible()){stopPreview();stopMenuMusic(.22);return;}
      previewCamera.position.set(-24,2.1,-29);
      previewCamera.setTarget(new BABYLON.Vector3(-12,1.55,-16));
      if(scene.activeCamera!==previewCamera)scene.activeCamera=previewCamera;
      publish({previewTarget:'street--24',cameraMoving:false,stablePreview:true});
    });

    previewActive=true;publish({previewTarget:'street--24',cameraMoving:false,stablePreview:true});
    return true;
  }

  installStyle();syncMenuCopy();syncSoundIcon();publish();
  if(soundToggle)new MutationObserver(syncSoundIcon).observe(soundToggle,{childList:true,subtree:true,characterData:true});
  if(menu){
    menuObserver=new MutationObserver(()=>{if(!menuVisible()){stopPreview();stopMenuMusic(.22);}else syncMenuMusic();});
    menuObserver.observe(menu,{attributes:true,attributeFilter:['style','class','hidden']});
  }
  new MutationObserver(syncMenuMusic).observe(document.body,{attributes:true,attributeFilter:['class']});

  const firstGesture=window.PointerEvent?'pointerdown':'touchstart';
  window.addEventListener(firstGesture,unlockMenuMusic,{capture:true,passive:true});
  window.addEventListener('keydown',unlockMenuMusic,{capture:true,once:false});
  // Try immediately too. Browsers that allow startup audio will begin without a tap;
  // browsers with autoplay protection will begin on the first user interaction.
  startMenuMusic();

  for(const id of ['newGameBtn','continueBtn']){
    const el=document.getElementById(id);if(!el)continue;
    el.addEventListener('pointerdown',()=>{stopPreview();stopMenuMusic(.5);},{capture:true});
    el.addEventListener('touchstart',()=>{stopPreview();stopMenuMusic(.5);},{capture:true,passive:true});
    el.addEventListener('click',()=>{stopPreview();stopMenuMusic(.5);},{capture:true});
  }

  previewTimer=setInterval(()=>{if(tryInstallPreview()&&previewTimer){clearInterval(previewTimer);previewTimer=null;}},100);
  tryInstallPreview();
  document.addEventListener('visibilitychange',syncMenuMusic);
  window.__egyptDebug=window.__egyptDebug||{};
  window.__egyptDebug.v1116StartSceneState=()=>({...window.__V1116_START_SCENE});
  window.addEventListener('pagehide',()=>stopMenuMusic(.05));
  window.addEventListener('beforeunload',()=>{if(previewTimer)clearInterval(previewTimer);menuObserver?.disconnect();stopMenuMusic(.05);stopPreview();},{once:true});
})();