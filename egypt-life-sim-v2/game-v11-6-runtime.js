(() => {
  'use strict';

  const NativeAC=window.AudioContext||window.webkitAudioContext;
  let ctx=null,master=null,analyser=null,roadBed=null,timer=null,lastCam=null,stepDistance=0,starting=false,ready=false,queuedStart=null,menuObserver=null;
  let originalCreateGain=null,gameMaster=null;

  const stableMenu=()=>{
    const kicker=document.querySelector('.kicker'),tagline=document.querySelector('.tagline'),foot=document.querySelector('.menuFoot'),status=document.getElementById('menuStatus');
    if(kicker&&kicker.textContent!=='HAYAT MASR • V11.7')kicker.textContent='HAYAT MASR • V11.7';
    const t='حياة مصر — بنجهز الشارع والصوت بالكامل قبل الدخول علشان البداية تبقى ثابتة من أول ضغطة.';
    if(tagline&&tagline.textContent!==t)tagline.textContent=t;
    if(foot&&foot.textContent!=='V11.7 — early audio + stable queued start')foot.textContent='V11.7 — early audio + stable queued start';
    if(status&&!ready&&!/ثانية واحدة/.test(status.textContent)&&status.textContent!=='جاري تجهيز اللعبة…')status.textContent='جاري تجهيز اللعبة…';
  };

  function fail(msg,err){
    console.error(msg,err||'');
    window.__V117_AUDIO={version:'11.7',started:false,error:String(err||msg)};
  }

  function makeNoise(seconds=.5,brightness=.07){
    if(!ctx)return null;
    const len=Math.max(1,Math.floor(ctx.sampleRate*seconds)),b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);let brown=0;
    for(let i=0;i<len;i++){const white=Math.random()*2-1;brown=brown*.992+white*.008;d[i]=brown*.84+white*brightness;}
    return b;
  }

  function foley(center=470,vol=.065,dur=.08){
    if(!ctx||!master)return;
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=originalCreateGain(),now=ctx.currentTime;
    src.buffer=makeNoise(.13,.14);filter.type='bandpass';filter.frequency.value=center;filter.Q.value=.7;
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(vol,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+dur);
    src.connect(filter);filter.connect(gain);gain.connect(master);src.start(now);src.stop(now+dur+.04);
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
      // Prevent V11 from wrapping the constructor again later in the patch chain.
      window.__V11_AUDIO_WRAPPED=true;
      return true;
    }catch(err){fail('V11.7 could not install shared AudioContext',err);return false;}
  }

  function createContext(args=[]){
    if(ctx)return ctx;
    ctx=new NativeAC(...(args.length?args:[{latencyHint:'interactive'}]));
    window.__V117_CONTEXT=ctx;window.__V116_CONTEXT=ctx;window.__V11_AUDIO_CONTEXT=ctx;
    originalCreateGain=ctx.createGain.bind(ctx);
    ctx.createGain=()=>{
      const g=originalCreateGain(),connect=g.connect.bind(g);
      g.connect=(dest,...rest)=>{
        const out=connect(dest,...rest);
        if(dest===ctx.destination&&g!==master){
          if(!gameMaster){gameMaster=g;window.__V117_GAME_MASTER=g;window.__V116_GAME_MASTER=g;}
          g.__v117LegacyBus=true;
          setTimeout(()=>{try{g.gain.setTargetAtTime(0,ctx.currentTime,.01);}catch(_){}try{g.disconnect();}catch(_){}},0);
        }
        return out;
      };
      return g;
    };
    return ctx;
  }

  function buildMix(){
    if(master)return;
    master=originalCreateGain();master.gain.value=.74;
    analyser=ctx.createAnalyser();analyser.fftSize=512;master.connect(analyser);analyser.connect(ctx.destination);
    window.__V117_MASTER=master;window.__V117_ANALYSER=analyser;window.__V116_MASTER=master;window.__V116_ANALYSER=analyser;

    const src=ctx.createBufferSource(),lp=ctx.createBiquadFilter(),gain=originalCreateGain();
    src.buffer=makeNoise(7,.035);src.loop=true;lp.type='lowpass';lp.frequency.value=330;gain.gain.value=.12;
    src.connect(lp);lp.connect(gain);gain.connect(master);src.start();roadBed=gain;

    const air=ctx.createBufferSource(),bp=ctx.createBiquadFilter(),airGain=originalCreateGain();
    air.buffer=makeNoise(8,.055);air.loop=true;bp.type='bandpass';bp.frequency.value=760;bp.Q.value=.35;airGain.gain.value=.012;
    air.connect(bp);bp.connect(airGain);airGain.connect(master);air.start();

    timer=setInterval(()=>{
      if(ctx?.state==='suspended')ctx.resume().catch(()=>{});
      const cam=window.__egyptDebug?.getCamera?.();if(!cam||!roadBed)return;
      const d=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));
      roadBed.gain.setTargetAtTime(d<10?.155:.09,ctx.currentTime,.35);
      if(lastCam){stepDistance+=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);if(stepDistance>.78){foley(d>4.8&&d<8.1?700:420,.052,.065);stepDistance=0;}}
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
      if(cue){foley(365,.12,.10);setTimeout(()=>foley(650,.07,.065),110);}
      window.__V117_AUDIO={version:'11.7',engine:'early-shared-native-audiocontext',armedBeforeCore:true,started:true,contextState:ctx.state,masterGain:.74,legacyBusesAutoDisconnected:true,hornEvents:false,oscillatorTones:false};
      window.__V116_AUDIO=window.__V117_AUDIO;
    }catch(err){fail('V11.7 audio start failed',err);}finally{starting=false;}
  }

  function handleStartCapture(id,e){
    startAudio(true);
    if(ready){document.body.classList.add('game-started');return;}
    queuedStart=id;e.preventDefault();e.stopImmediatePropagation();
    const status=document.getElementById('menuStatus');if(status)status.textContent='ثانية واحدة… بنجهز الشارع والصوت.';
  }

  function installStartGate(){
    window.__V117_READY=false;document.body.classList.remove('game-started');stableMenu();
    for(const id of ['newGameBtn','continueBtn']){
      const el=document.getElementById(id);if(!el)continue;
      el.addEventListener('pointerdown',()=>startAudio(false),{capture:true});
      el.addEventListener('touchstart',()=>startAudio(false),{capture:true,passive:true});
      el.addEventListener('click',e=>handleStartCapture(id,e),{capture:true});
    }
    const toggle=document.getElementById('soundToggle');
    if(toggle)new MutationObserver(()=>{if(!master||!ctx)return;const muted=toggle.textContent.includes('مكتوم');master.gain.setTargetAtTime(muted?0:.74,ctx.currentTime,.05);}).observe(toggle,{childList:true,subtree:true,characterData:true});
    const menu=document.getElementById('menu');
    if(menu)menuObserver=new MutationObserver(()=>{if(!ready)stableMenu();});
    menuObserver?.observe(menu,{childList:true,subtree:true,characterData:true});
  }

  function markReady(){
    if(ready)return;ready=true;window.__V117_READY=true;window.__V116_READY=true;
    menuObserver?.disconnect();stableMenu();
    const status=document.getElementById('menuStatus');if(status)status.textContent='جاهز — ابدأ يوم جديد.';
    window.__V117_STARTUP={version:'11.7',ready:true,queuedStartSupported:true,audioArmedBeforeCore:true,stableMenu:true};
    window.__V116_STARTUP=window.__V117_STARTUP;
    if(queuedStart){const id=queuedStart;queuedStart=null;setTimeout(()=>document.getElementById(id)?.click(),0);}
  }

  if(installSharedContextConstructor()){
    window.__V117_AUDIO={version:'11.7',engine:'early-shared-native-audiocontext',armedBeforeCore:true,started:false,contextState:null,masterGain:.74,legacyBusesAutoDisconnected:true,hornEvents:false,oscillatorTones:false};
    window.__V116_AUDIO=window.__V117_AUDIO;
  }
  installStartGate();
  window.__V117_MARK_READY=markReady;
  window.__V117_AUDIO_START=startAudio;
  window.__egyptDebug=window.__egyptDebug||{};
  window.__egyptDebug.v117AudioState=()=>({...window.__V117_AUDIO,ctxState:ctx?.state||null,masterValue:master?.gain?.value??null,gameMasterValue:gameMaster?.gain?.value??null,ready,queuedStart});
  window.__egyptDebug.v116AudioState=window.__egyptDebug.v117AudioState;
  window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer);menuObserver?.disconnect();},{once:true});
})();
