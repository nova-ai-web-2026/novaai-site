(() => {
  'use strict';

  const NativeAC=window.AudioContext||window.webkitAudioContext;
  let ctx=null,master=null,analyser=null,roadBed=null,timer=null,lastCam=null,stepDistance=0,starting=false,ready=false,queuedStart=null,menuObserver=null;
  let originalCreateGain=null,gameMaster=null,legacyBuses=0;
  const sfxCounts={step:0,interact:0,buy:0,ui:0,start:0};

  const stableMenu=()=>{
    const kicker=document.querySelector('.kicker'),tagline=document.querySelector('.tagline'),foot=document.querySelector('.menuFoot'),status=document.getElementById('menuStatus');
    if(kicker&&kicker.textContent!=='HAYAT MASR • V11.8')kicker.textContent='HAYAT MASR • V11.8';
    const t='حياة مصر — مؤثرات صوتية حقيقية للأحداث مع بداية ثابتة وصوت واحد بدون تعارض.';
    if(tagline&&tagline.textContent!==t)tagline.textContent=t;
    if(foot&&foot.textContent!=='V11.8 — dedicated SFX + single audio runtime')foot.textContent='V11.8 — dedicated SFX + single audio runtime';
    if(status&&!ready&&!/ثانية واحدة/.test(status.textContent)&&status.textContent!=='جاري تجهيز اللعبة…')status.textContent='جاري تجهيز اللعبة…';
  };

  function fail(msg,err){
    console.error(msg,err||'');
    window.__V118_AUDIO={version:'11.8',started:false,error:String(err||msg)};
  }

  function makeNoise(seconds=.5,brightness=.07){
    if(!ctx)return null;
    const len=Math.max(1,Math.floor(ctx.sampleRate*seconds)),b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);let brown=0;
    for(let i=0;i<len;i++){const white=Math.random()*2-1;brown=brown*.992+white*.008;d[i]=brown*.84+white*brightness;}
    return b;
  }

  function burst(center=470,vol=.065,dur=.08,brightness=.14,q=.7,delay=0){
    if(!ctx||!master||master.gain.value<.001)return;
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=originalCreateGain(),now=ctx.currentTime+delay;
    src.buffer=makeNoise(Math.max(.13,dur+.05),brightness);filter.type='bandpass';filter.frequency.value=center;filter.Q.value=q;
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(vol,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+dur);
    src.connect(filter);filter.connect(gain);gain.connect(master);src.start(now);src.stop(now+dur+.04);
  }

  function sfxStep(){
    if(!ctx||!master)return;sfxCounts.step++;
    burst(285,.105,.055,.22,.72);burst(690,.045,.038,.18,.8,.018);
  }
  function sfxInteract(){
    if(!ctx||!master)return;sfxCounts.interact++;
    burst(920,.12,.055,.2,.95);burst(470,.07,.045,.18,.75,.045);
  }
  function sfxBuy(){
    if(!ctx||!master)return;sfxCounts.buy++;
    burst(1350,.105,.045,.24,1.1);burst(2100,.075,.04,.25,1.2,.055);burst(780,.065,.05,.18,.8,.105);
  }
  function sfxUI(){
    if(!ctx||!master)return;sfxCounts.ui++;
    burst(760,.085,.04,.18,.9);burst(410,.04,.035,.16,.75,.035);
  }
  function sfxStart(){
    if(!ctx||!master)return;sfxCounts.start++;
    burst(365,.13,.10,.18,.7);burst(650,.08,.065,.18,.8,.11);
  }

  function installSharedContextConstructor(){
    if(!NativeAC)return false;
    function SharedAudioContext(...args){
      if(!ctx)createContext(args);
      return ctx;
    }
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
      const g=originalCreateGain(),nativeConnect=g.connect.bind(g);
      g.connect=(dest,...rest)=>{
        if(dest===ctx.destination&&g!==master){
          if(!gameMaster){
            gameMaster=g;window.__V118_GAME_MASTER=g;window.__V117_GAME_MASTER=g;window.__V116_GAME_MASTER=g;
            g.__v118GameBus=true;
            const target=master||ctx.destination;
            const out=nativeConnect(target,...rest);
            try{g.gain.setTargetAtTime(.62,ctx.currentTime,.025);}catch(_){}
            return out;
          }
          legacyBuses++;
          g.__v118SuppressedLegacyBus=true;
          try{g.gain.setValueAtTime(0,ctx.currentTime);}catch(_){}
          return dest;
        }
        return nativeConnect(dest,...rest);
      };
      return g;
    };
    return ctx;
  }

  function buildMix(){
    if(master)return;
    master=originalCreateGain();master.gain.value=.8;
    analyser=ctx.createAnalyser();analyser.fftSize=512;master.connect(analyser);analyser.connect(ctx.destination);
    window.__V118_MASTER=master;window.__V118_ANALYSER=analyser;window.__V117_MASTER=master;window.__V117_ANALYSER=analyser;window.__V116_MASTER=master;window.__V116_ANALYSER=analyser;

    const src=ctx.createBufferSource(),lp=ctx.createBiquadFilter(),gain=originalCreateGain();
    src.buffer=makeNoise(7,.035);src.loop=true;lp.type='lowpass';lp.frequency.value=330;gain.gain.value=.085;
    src.connect(lp);lp.connect(gain);gain.connect(master);src.start();roadBed=gain;

    const air=ctx.createBufferSource(),bp=ctx.createBiquadFilter(),airGain=originalCreateGain();
    air.buffer=makeNoise(8,.055);air.loop=true;bp.type='bandpass';bp.frequency.value=760;bp.Q.value=.35;airGain.gain.value=.009;
    air.connect(bp);bp.connect(airGain);airGain.connect(master);air.start();

    timer=setInterval(()=>{
      if(ctx?.state==='suspended')ctx.resume().catch(()=>{});
      const cam=window.__egyptDebug?.getCamera?.();if(!cam||!roadBed)return;
      const d=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));
      roadBed.gain.setTargetAtTime(d<10?.115:.065,ctx.currentTime,.35);
      if(lastCam){stepDistance+=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);if(stepDistance>.72){sfxStep();stepDistance=0;}}
      lastCam={x:cam.x,z:cam.z};
    },100);
  }

  async function startAudio(cue=true){
    if(starting)return;starting=true;
    try{
      if(!NativeAC)throw new Error('Web Audio unavailable');
      createContext();buildMix();
      if(ctx.state!=='running')await ctx.resume();
      if(ctx.state!=='running')throw new Error('AudioContext stayed '+ctx.state);
      if(cue)sfxStart();
      const state={version:'11.8',engine:'single-native-context-with-dedicated-sfx',armedBeforeCore:true,started:true,contextState:ctx.state,masterGain:.8,gameSfxBusRouted:true,dedicatedSfx:true,legacyExtraBusesSuppressed:true,hornEvents:false,oscillatorTones:false};
      window.__V118_AUDIO=state;window.__V117_AUDIO=state;window.__V116_AUDIO=state;
    }catch(err){fail('V11.8 audio start failed',err);}finally{starting=false;}
  }

  function handleStartCapture(id,e){
    startAudio(true);
    if(ready){document.body.classList.add('game-started');return;}
    queuedStart=id;e.preventDefault();e.stopImmediatePropagation();
    const status=document.getElementById('menuStatus');if(status)status.textContent='ثانية واحدة… بنجهز الشارع والصوت.';
  }

  function installSfxBindings(){
    const act=document.getElementById('act');
    act?.addEventListener('pointerdown',()=>{if(document.body.classList.contains('game-started'))sfxInteract();},{capture:true});
    act?.addEventListener('click',e=>{if(e.detail===0&&document.body.classList.contains('game-started'))sfxInteract();},{capture:true});
    document.addEventListener('keydown',e=>{if((e.key==='e'||e.key==='E')&&!e.repeat&&document.body.classList.contains('game-started'))sfxInteract();},true);
    const shopItems=document.getElementById('shopItems');
    shopItems?.addEventListener('pointerdown',e=>{if(e.target.closest('button'))sfxBuy();},{capture:true});
    shopItems?.addEventListener('click',e=>{if(e.detail===0&&e.target.closest('button'))sfxBuy();},{capture:true});
    for(const id of ['shopClose','dialogClose','resetBtn'])document.getElementById(id)?.addEventListener('pointerdown',()=>sfxUI(),{capture:true});
  }

  function installStartGate(){
    window.__V118_READY=false;window.__V117_READY=false;document.body.classList.remove('game-started');stableMenu();
    for(const id of ['newGameBtn','continueBtn']){
      const el=document.getElementById(id);if(!el)continue;
      el.addEventListener('pointerdown',()=>startAudio(false),{capture:true});
      el.addEventListener('touchstart',()=>startAudio(false),{capture:true,passive:true});
      el.addEventListener('click',e=>handleStartCapture(id,e),{capture:true});
    }
    const toggle=document.getElementById('soundToggle');
    if(toggle)new MutationObserver(()=>{if(!master||!ctx)return;const muted=toggle.textContent.includes('مكتوم');master.gain.setTargetAtTime(muted?0:.8,ctx.currentTime,.05);}).observe(toggle,{childList:true,subtree:true,characterData:true});
    const menu=document.getElementById('menu');
    if(menu)menuObserver=new MutationObserver(()=>{if(!ready)stableMenu();});
    menuObserver?.observe(menu,{childList:true,subtree:true,characterData:true});
    installSfxBindings();
  }

  function markReady(){
    if(ready)return;ready=true;window.__V118_READY=true;window.__V117_READY=true;window.__V116_READY=true;
    menuObserver?.disconnect();stableMenu();
    const status=document.getElementById('menuStatus');if(status)status.textContent='جاهز — ابدأ يوم جديد.';
    const startup={version:'11.8',ready:true,queuedStartSupported:true,audioArmedBeforeCore:true,stableMenu:true,dedicatedSfx:true};
    window.__V118_STARTUP=startup;window.__V117_STARTUP=startup;window.__V116_STARTUP=startup;
    if(queuedStart){const id=queuedStart;queuedStart=null;setTimeout(()=>document.getElementById(id)?.click(),0);}
  }

  const initial={version:'11.8',engine:'single-native-context-with-dedicated-sfx',armedBeforeCore:true,started:false,contextState:null,masterGain:.8,gameSfxBusRouted:true,dedicatedSfx:true,legacyExtraBusesSuppressed:true,hornEvents:false,oscillatorTones:false};
  if(installSharedContextConstructor()){
    window.__V118_AUDIO=initial;window.__V117_AUDIO=initial;window.__V116_AUDIO=initial;
  }
  installStartGate();
  window.__V118_MARK_READY=markReady;window.__V117_MARK_READY=markReady;
  window.__V118_AUDIO_START=startAudio;window.__V117_AUDIO_START=startAudio;
  window.__V118_SFX={version:'11.8',counts:sfxCounts,playStep:sfxStep,playInteract:sfxInteract,playBuy:sfxBuy,playUI:sfxUI};
  window.__egyptDebug=window.__egyptDebug||{};
  window.__egyptDebug.v118AudioState=()=>({...window.__V118_AUDIO,ctxState:ctx?.state||null,masterValue:master?.gain?.value??null,gameMasterValue:gameMaster?.gain?.value??null,legacyBuses,ready,queuedStart,sfx:{...sfxCounts}});
  window.__egyptDebug.v117AudioState=window.__egyptDebug.v118AudioState;window.__egyptDebug.v116AudioState=window.__egyptDebug.v118AudioState;
  window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer);menuObserver?.disconnect();},{once:true});
})();
