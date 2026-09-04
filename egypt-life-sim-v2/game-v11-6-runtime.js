(() => {
  'use strict';

  const NativeAC=window.AudioContext||window.webkitAudioContext;
  let ctx=null,master=null,analyser=null,roadBed=null,timer=null,lastCam=null,stepDistance=0,starting=false,ready=false,menuObserver=null,corePoll=null;
  let originalCreateGain=null,gameMaster=null,legacyBusCount=0,coreClickPending=null,coreRescueUsed=0,lastStartId=null;

  const menuVisible=()=>{const m=document.getElementById('menu');return !!m&&getComputedStyle(m).display!=='none';};
  const sceneState=()=>{
    const engine=window.BABYLON?.Engine?.LastCreatedEngine||null,scene=engine?.scenes?.[0]||null,canvas=document.getElementById('game');
    return {
      version:'11.8',menuVisible:menuVisible(),gameStarted:document.body.classList.contains('game-started'),
      engine:!!engine,scene:!!scene,sceneReady:!!scene?.isReady?.(),meshes:scene?.meshes?.length||0,
      cameras:scene?.cameras?.length||0,activeCamera:!!scene?.activeCamera,
      renderWidth:engine?.getRenderWidth?.()||0,renderHeight:engine?.getRenderHeight?.()||0,
      canvasWidth:canvas?.width||0,canvasHeight:canvas?.height||0,
      coreClickPending,coreRescueUsed,lastStartId
    };
  };

  const stableMenu=()=>{
    if(!menuVisible())return;
    const kicker=document.querySelector('.kicker'),tagline=document.querySelector('.tagline'),foot=document.querySelector('.menuFoot'),status=document.getElementById('menuStatus');
    if(kicker&&kicker.textContent!=='HAYAT MASR • V11.8')kicker.textContent='HAYAT MASR • V11.8';
    const t='حياة مصر — مؤثرات لعب أوضح، مع بداية مباشرة للمشهد من غير ما الصوت يعطل الدخول.';
    if(tagline&&tagline.textContent!==t)tagline.textContent=t;
    if(foot&&foot.textContent!=='V11.8 — direct scene start + gameplay SFX')foot.textContent='V11.8 — direct scene start + gameplay SFX';
    if(status&&!ready&&!coreClickPending&&status.textContent!=='جاري تجهيز التفاصيل…')status.textContent='جاري تجهيز التفاصيل…';
  };

  function fail(msg,err){
    console.error(msg,err||'');
    window.__V118_AUDIO={version:'11.8',started:false,error:String(err||msg)};
    window.__V117_AUDIO=window.__V118_AUDIO;
  }

  function makeNoise(seconds=.5,brightness=.07){
    if(!ctx)return null;
    const len=Math.max(1,Math.floor(ctx.sampleRate*seconds)),b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);let brown=0;
    for(let i=0;i<len;i++){const white=Math.random()*2-1;brown=brown*.992+white*.008;d[i]=brown*.84+white*brightness;}
    return b;
  }

  function foley(center=470,vol=.065,dur=.08){
    if(!ctx||!master||!originalCreateGain)return;
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=originalCreateGain(),now=ctx.currentTime;
    src.buffer=makeNoise(.13,.14);filter.type='bandpass';filter.frequency.value=center;filter.Q.value=.7;
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(vol,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+dur);
    src.connect(filter);filter.connect(gain);gain.connect(master);src.start(now);src.stop(now+dur+.04);
  }

  function installSharedContextConstructor(){
    if(!NativeAC)return false;
    function SharedAudioContext(...args){if(!ctx)createContext(args);return ctx;}
    SharedAudioContext.prototype=NativeAC.prototype;
    try{
      window.AudioContext=SharedAudioContext;
      if(window.webkitAudioContext)window.webkitAudioContext=SharedAudioContext;
      window.__V11_AUDIO_WRAPPED=true;
      return true;
    }catch(err){fail('V11.8 could not install shared AudioContext',err);return false;}
  }

  function createContext(args=[]){
    if(ctx)return ctx;
    ctx=new NativeAC(...(args.length?args:[{latencyHint:'interactive'}]));
    window.__V118_CONTEXT=ctx;window.__V117_CONTEXT=ctx;window.__V116_CONTEXT=ctx;window.__V11_AUDIO_CONTEXT=ctx;
    originalCreateGain=ctx.createGain.bind(ctx);
    ctx.createGain=()=>{
      const g=originalCreateGain(),connect=g.connect.bind(g);
      g.connect=(dest,...rest)=>{
        if(dest===ctx.destination&&g!==master){
          if(!gameMaster){
            gameMaster=g;g.__v118GameMaster=true;
            window.__V118_GAME_MASTER=g;window.__V117_GAME_MASTER=g;window.__V116_GAME_MASTER=g;
            try{g.gain.setTargetAtTime(.24,ctx.currentTime,.03);}catch(_){}
            return master?connect(master,...rest):connect(dest,...rest);
          }
          legacyBusCount++;g.__v118LegacyExtraBus=true;
          try{g.gain.setValueAtTime(0,ctx.currentTime);}catch(_){}
          return master?connect(master,...rest):connect(dest,...rest);
        }
        return connect(dest,...rest);
      };
      return g;
    };
    return ctx;
  }

  function buildMix(){
    if(master)return;
    master=originalCreateGain();master.gain.value=.72;
    analyser=ctx.createAnalyser();analyser.fftSize=512;master.connect(analyser);analyser.connect(ctx.destination);
    window.__V118_MASTER=master;window.__V118_ANALYSER=analyser;window.__V117_MASTER=master;window.__V117_ANALYSER=analyser;window.__V116_MASTER=master;window.__V116_ANALYSER=analyser;

    const src=ctx.createBufferSource(),lp=ctx.createBiquadFilter(),gain=originalCreateGain();
    src.buffer=makeNoise(7,.035);src.loop=true;lp.type='lowpass';lp.frequency.value=330;gain.gain.value=.075;
    src.connect(lp);lp.connect(gain);gain.connect(master);src.start();roadBed=gain;

    const air=ctx.createBufferSource(),bp=ctx.createBiquadFilter(),airGain=originalCreateGain();
    air.buffer=makeNoise(8,.055);air.loop=true;bp.type='bandpass';bp.frequency.value=760;bp.Q.value=.35;airGain.gain.value=.008;
    air.connect(bp);bp.connect(airGain);airGain.connect(master);air.start();

    timer=setInterval(()=>{
      if(ctx?.state==='suspended')ctx.resume().catch(()=>{});
      const cam=window.__egyptDebug?.getCamera?.();if(!cam||!roadBed)return;
      const d=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));
      roadBed.gain.setTargetAtTime(d<10?.095:.055,ctx.currentTime,.35);
      if(lastCam){stepDistance+=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);if(stepDistance>.78){foley(d>4.8&&d<8.1?700:420,.028,.06);stepDistance=0;}}
      lastCam={x:cam.x,z:cam.z};
    },120);
  }

  async function startAudio(cue=true){
    if(starting)return;starting=true;
    try{
      if(!NativeAC)throw new Error('Web Audio unavailable');
      createContext();buildMix();
      if(ctx.state!=='running')await ctx.resume();
      if(ctx.state!=='running')throw new Error('AudioContext stayed '+ctx.state);
      if(cue){foley(365,.075,.09);setTimeout(()=>foley(650,.045,.06),105);}
      window.__V118_AUDIO={version:'11.8',engine:'shared-native-audiocontext-plus-sampled-sfx',armedBeforeCore:true,started:true,contextState:ctx.state,masterGain:.72,gameMasterPreserved:true,gameMasterGain:gameMaster?.gain?.value??null,legacyExtraBusesMuted:true,legacyBusCount,hornEvents:false,oscillatorTones:false};
      window.__V117_AUDIO=window.__V118_AUDIO;window.__V116_AUDIO=window.__V118_AUDIO;
    }catch(err){fail('V11.8 audio start failed',err);}finally{starting=false;}
  }

  function coreHandlerReady(el){return !!el&&typeof el.onclick==='function';}

  function ensureSceneAfterStart(el,id){
    lastStartId=id;document.body.classList.add('game-started');
    const repair=()=>{
      try{
        const engine=window.BABYLON?.Engine?.LastCreatedEngine,scene=engine?.scenes?.[0];
        engine?.resize?.();
        if(scene&&!scene.activeCamera&&scene.cameras?.[0])scene.activeCamera=scene.cameras[0];
      }catch(err){console.warn('V11.8 scene resize repair skipped',err);}
    };
    setTimeout(repair,40);
    setTimeout(()=>{
      const menu=document.getElementById('menu');
      const stillVisible=!!menu&&getComputedStyle(menu).display!=='none';
      if(stillVisible&&coreHandlerReady(el)&&!el.__v118SceneRescue){
        el.__v118SceneRescue=true;coreRescueUsed++;
        try{el.onclick.call(el);}catch(err){fail('V11.8 core scene rescue failed',err);}
        document.body.classList.add('game-started');repair();
        setTimeout(()=>{el.__v118SceneRescue=false;},500);
      }
      window.__V118_SCENE_START=sceneState();
    },180);
  }

  function handleStartCapture(id,e){
    startAudio(true);
    const el=e.currentTarget;
    if(coreHandlerReady(el)){
      coreClickPending=null;
      ensureSceneAfterStart(el,id);
      return;
    }
    // Only queue when the base game's own handler is not installed yet. Never wait
    // for V9/V10/V11 patches or audio/SFX readiness before allowing the core scene.
    coreClickPending=id;
    e.preventDefault();e.stopImmediatePropagation();
    const status=document.getElementById('menuStatus');if(status)status.textContent='بنجهز المشهد الأساسي…';
  }

  function installStartBridge(){
    window.__V118_READY=false;window.__V117_READY=false;document.body.classList.remove('game-started');stableMenu();
    for(const id of ['newGameBtn','continueBtn']){
      const el=document.getElementById(id);if(!el)continue;
      el.addEventListener('pointerdown',()=>startAudio(false),{capture:true});
      el.addEventListener('touchstart',()=>startAudio(false),{capture:true,passive:true});
      el.addEventListener('click',e=>handleStartCapture(id,e),{capture:true});
    }
    corePoll=setInterval(()=>{
      if(!coreClickPending)return;
      const id=coreClickPending,el=document.getElementById(id);
      if(!coreHandlerReady(el))return;
      coreClickPending=null;
      setTimeout(()=>el.click(),0);
    },25);
    const toggle=document.getElementById('soundToggle');
    if(toggle)new MutationObserver(()=>{if(!master||!ctx)return;const muted=toggle.textContent.includes('مكتوم');master.gain.setTargetAtTime(muted?0:.72,ctx.currentTime,.05);}).observe(toggle,{childList:true,subtree:true,characterData:true});
    const menu=document.getElementById('menu');
    if(menu)menuObserver=new MutationObserver(()=>{if(!ready&&menuVisible())stableMenu();});
    menuObserver?.observe(menu,{childList:true,subtree:true,characterData:true});
  }

  function markReady(){
    if(ready)return;ready=true;window.__V118_READY=true;window.__V117_READY=true;window.__V116_READY=true;
    menuObserver?.disconnect();
    if(menuVisible()){
      stableMenu();
      const status=document.getElementById('menuStatus');if(status&&!coreClickPending)status.textContent='جاهز — ابدأ يوم جديد.';
    }
    window.__V118_STARTUP={version:'11.8',ready:true,coreStartIndependent:true,audioArmedBeforeCore:true,stableMenu:true,sceneRescue:true};
    window.__V117_STARTUP=window.__V118_STARTUP;window.__V116_STARTUP=window.__V118_STARTUP;
  }

  if(installSharedContextConstructor()){
    window.__V118_AUDIO={version:'11.8',engine:'shared-native-audiocontext-plus-sampled-sfx',armedBeforeCore:true,started:false,contextState:null,masterGain:.72,gameMasterPreserved:true,legacyExtraBusesMuted:true,hornEvents:false,oscillatorTones:false};
    window.__V117_AUDIO=window.__V118_AUDIO;window.__V116_AUDIO=window.__V118_AUDIO;
  }
  installStartBridge();
  window.__V118_MARK_READY=markReady;window.__V117_MARK_READY=markReady;
  window.__V118_AUDIO_START=startAudio;window.__V117_AUDIO_START=startAudio;
  window.__egyptDebug=window.__egyptDebug||{};
  window.__egyptDebug.v118AudioState=()=>({...window.__V118_AUDIO,ctxState:ctx?.state||null,masterValue:master?.gain?.value??null,gameMasterValue:gameMaster?.gain?.value??null,gameMasterConnected:!!gameMaster,legacyBusCount,ready,coreClickPending,coreRescueUsed});
  window.__egyptDebug.v118SceneState=sceneState;
  window.__egyptDebug.v117AudioState=window.__egyptDebug.v118AudioState;window.__egyptDebug.v116AudioState=window.__egyptDebug.v118AudioState;
  window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer);if(corePoll)clearInterval(corePoll);menuObserver?.disconnect();},{once:true});
})();
