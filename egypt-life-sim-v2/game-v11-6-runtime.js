(() => {
  'use strict';

  const VERSION='11.10';
  const NativeAC=window.AudioContext||window.webkitAudioContext;
  let ctx=null,master=null,analyser=null,roadBed=null,timer=null,starting=false,ready=false,queuedStart=null,menuObserver=null;
  let originalCreateGain=null,gameMaster=null,legacyBusCount=0;

  const audioState=()=>({...window.__V1110_AUDIO,version:VERSION,ctxState:ctx?.state||null,masterValue:master?.gain?.value??null,gameMasterValue:gameMaster?.gain?.value??null,gameMasterConnected:!!gameMaster,legacyBusCount,ready,queuedStart});
  const attachDebug=()=>{
    window.__V1110_AUDIO_STATE=audioState;window.__V119_AUDIO_STATE=audioState;window.__V118_AUDIO_STATE=audioState;
    window.__egyptDebug=window.__egyptDebug||{};
    window.__egyptDebug.v1110AudioState=audioState;window.__egyptDebug.v119AudioState=audioState;window.__egyptDebug.v118AudioState=audioState;window.__egyptDebug.v117AudioState=audioState;window.__egyptDebug.v116AudioState=audioState;
  };

  const stableMenu=()=>{
    const kicker=document.querySelector('.kicker'),tagline=document.querySelector('.tagline'),foot=document.querySelector('.menuFoot'),status=document.getElementById('menuStatus');
    if(kicker&&kicker.textContent!=='HAYAT MASR • V11.10')kicker.textContent='HAYAT MASR • V11.10';
    const t='حياة مصر — بنك Foley مسجّل مسبقًا ومتعدد النسخ للخطوات والتفاعل والشراء والأبواب، من غير نغمات لعبة صناعية.';
    if(tagline&&tagline.textContent!==t)tagline.textContent=t;
    if(foot&&foot.textContent!=='V11.10 — natural sampled Foley SFX')foot.textContent='V11.10 — natural sampled Foley SFX';
    if(status&&!ready&&!/ثانية واحدة/.test(status.textContent)&&status.textContent!=='جاري تجهيز اللعبة…')status.textContent='جاري تجهيز اللعبة…';
  };

  function fail(msg,err){
    console.error(msg,err||'');
    window.__V1110_AUDIO={version:VERSION,started:false,error:String(err||msg)};
    window.__V119_AUDIO=window.__V1110_AUDIO;window.__V118_AUDIO=window.__V1110_AUDIO;window.__V117_AUDIO=window.__V1110_AUDIO;window.__V116_AUDIO=window.__V1110_AUDIO;attachDebug();
  }

  function makeNoise(seconds=.5,brightness=.07){
    if(!ctx)return null;const len=Math.max(1,Math.floor(ctx.sampleRate*seconds)),b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);let brown=0;
    for(let i=0;i<len;i++){const white=Math.random()*2-1;brown=brown*.992+white*.008;d[i]=brown*.84+white*brightness;}return b;
  }

  function installSharedContextConstructor(){
    if(!NativeAC)return false;
    function SharedAudioContext(...args){if(!ctx)createContext(args);return ctx;}
    SharedAudioContext.prototype=NativeAC.prototype;
    try{window.AudioContext=SharedAudioContext;if(window.webkitAudioContext)window.webkitAudioContext=SharedAudioContext;window.__V11_AUDIO_WRAPPED=true;return true;}
    catch(err){fail('V11.10 could not install shared AudioContext',err);return false;}
  }

  function createContext(args=[]){
    if(ctx)return ctx;ctx=new NativeAC(...(args.length?args:[{latencyHint:'interactive'}]));
    window.__V1110_CONTEXT=ctx;window.__V119_CONTEXT=ctx;window.__V118_CONTEXT=ctx;window.__V117_CONTEXT=ctx;window.__V116_CONTEXT=ctx;window.__V11_AUDIO_CONTEXT=ctx;
    originalCreateGain=ctx.createGain.bind(ctx);
    ctx.createGain=()=>{
      const g=originalCreateGain(),connect=g.connect.bind(g);
      g.connect=(dest,...rest)=>{
        if(dest===ctx.destination&&g!==master){
          if(!gameMaster){
            gameMaster=g;g.__v1110GameMaster=true;
            window.__V1110_GAME_MASTER=g;window.__V119_GAME_MASTER=g;window.__V118_GAME_MASTER=g;window.__V117_GAME_MASTER=g;window.__V116_GAME_MASTER=g;
            try{g.gain.setTargetAtTime(0,ctx.currentTime,.015);}catch(_){}
            attachDebug();return master?connect(master,...rest):connect(dest,...rest);
          }
          legacyBusCount++;g.__v1110LegacyExtraBus=true;try{g.gain.setValueAtTime(0,ctx.currentTime);}catch(_){}
          return master?connect(master,...rest):connect(dest,...rest);
        }
        return connect(dest,...rest);
      };
      return g;
    };
    attachDebug();return ctx;
  }

  function buildMix(){
    if(master)return;master=originalCreateGain();master.gain.value=.72;
    analyser=ctx.createAnalyser();analyser.fftSize=512;master.connect(analyser);analyser.connect(ctx.destination);
    window.__V1110_MASTER=master;window.__V1110_ANALYSER=analyser;window.__V119_MASTER=master;window.__V119_ANALYSER=analyser;window.__V118_MASTER=master;window.__V118_ANALYSER=analyser;window.__V117_MASTER=master;window.__V117_ANALYSER=analyser;window.__V116_MASTER=master;window.__V116_ANALYSER=analyser;

    const src=ctx.createBufferSource(),lp=ctx.createBiquadFilter(),gain=originalCreateGain();src.buffer=makeNoise(7,.035);src.loop=true;lp.type='lowpass';lp.frequency.value=330;gain.gain.value=.065;src.connect(lp);lp.connect(gain);gain.connect(master);src.start();roadBed=gain;
    const air=ctx.createBufferSource(),bp=ctx.createBiquadFilter(),airGain=originalCreateGain();air.buffer=makeNoise(8,.055);air.loop=true;bp.type='bandpass';bp.frequency.value=760;bp.Q.value=.35;airGain.gain.value=.007;air.connect(bp);bp.connect(airGain);airGain.connect(master);air.start();

    timer=setInterval(()=>{
      if(ctx?.state==='suspended')ctx.resume().catch(()=>{});const cam=window.__egyptDebug?.getCamera?.();if(!cam||!roadBed)return;
      const d=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));roadBed.gain.setTargetAtTime(d<10?.085:.048,ctx.currentTime,.35);
    },160);
  }

  async function startAudio(){
    if(starting)return;starting=true;
    try{
      if(!NativeAC)throw new Error('Web Audio unavailable');createContext();buildMix();if(ctx.state!=='running')await ctx.resume();if(ctx.state!=='running')throw new Error('AudioContext stayed '+ctx.state);
      window.__V1110_AUDIO={version:VERSION,engine:'shared-native-audiocontext-plus-natural-sampled-sfx',armedBeforeCore:true,started:true,contextState:ctx.state,masterGain:.72,gameMasterMuted:true,legacyExtraBusesMuted:true,legacyBusCount,proceduralGameplayFoley:false,hornEvents:false,oscillatorTones:false};
      window.__V119_AUDIO=window.__V1110_AUDIO;window.__V118_AUDIO=window.__V1110_AUDIO;window.__V117_AUDIO=window.__V1110_AUDIO;window.__V116_AUDIO=window.__V1110_AUDIO;attachDebug();
    }catch(err){fail('V11.10 audio start failed',err);}finally{starting=false;}
  }

  function handleStartCapture(id,e){startAudio();if(ready){document.body.classList.add('game-started');return;}queuedStart=id;e.preventDefault();e.stopImmediatePropagation();const status=document.getElementById('menuStatus');if(status)status.textContent='ثانية واحدة… بنجهز الشارع والصوت.';}

  function installStartGate(){
    window.__V1110_READY=false;window.__V119_READY=false;window.__V118_READY=false;window.__V117_READY=false;document.body.classList.remove('game-started');stableMenu();
    for(const id of ['newGameBtn','continueBtn']){const el=document.getElementById(id);if(!el)continue;el.addEventListener('pointerdown',()=>startAudio(),{capture:true});el.addEventListener('touchstart',()=>startAudio(),{capture:true,passive:true});el.addEventListener('click',e=>handleStartCapture(id,e),{capture:true});}
    const toggle=document.getElementById('soundToggle');if(toggle)new MutationObserver(()=>{if(!master||!ctx)return;const muted=toggle.textContent.includes('مكتوم');master.gain.setTargetAtTime(muted?0:.72,ctx.currentTime,.05);}).observe(toggle,{childList:true,subtree:true,characterData:true});
    const menu=document.getElementById('menu');if(menu)menuObserver=new MutationObserver(()=>{if(!ready)stableMenu();});menuObserver?.observe(menu,{childList:true,subtree:true,characterData:true});
  }

  function markReady(){
    if(ready)return;ready=true;window.__V1110_READY=true;window.__V119_READY=true;window.__V118_READY=true;window.__V117_READY=true;window.__V116_READY=true;menuObserver?.disconnect();stableMenu();attachDebug();setTimeout(attachDebug,0);setTimeout(attachDebug,500);
    const status=document.getElementById('menuStatus');if(status)status.textContent='جاهز — ابدأ يوم جديد.';
    window.__V1110_STARTUP={version:VERSION,ready:true,queuedStartSupported:true,audioArmedBeforeCore:true,stableMenu:true};window.__V119_STARTUP=window.__V1110_STARTUP;window.__V118_STARTUP=window.__V1110_STARTUP;window.__V117_STARTUP=window.__V1110_STARTUP;window.__V116_STARTUP=window.__V1110_STARTUP;
    if(queuedStart){const id=queuedStart;queuedStart=null;setTimeout(()=>document.getElementById(id)?.click(),0);}
  }

  if(installSharedContextConstructor()){
    window.__V1110_AUDIO={version:VERSION,engine:'shared-native-audiocontext-plus-natural-sampled-sfx',armedBeforeCore:true,started:false,contextState:null,masterGain:.72,gameMasterMuted:true,legacyExtraBusesMuted:true,proceduralGameplayFoley:false,hornEvents:false,oscillatorTones:false};
    window.__V119_AUDIO=window.__V1110_AUDIO;window.__V118_AUDIO=window.__V1110_AUDIO;window.__V117_AUDIO=window.__V1110_AUDIO;window.__V116_AUDIO=window.__V1110_AUDIO;
  }
  installStartGate();attachDebug();window.__V1110_MARK_READY=markReady;window.__V119_MARK_READY=markReady;window.__V118_MARK_READY=markReady;window.__V117_MARK_READY=markReady;window.__V1110_AUDIO_START=startAudio;window.__V119_AUDIO_START=startAudio;window.__V118_AUDIO_START=startAudio;window.__V117_AUDIO_START=startAudio;
  window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer);menuObserver?.disconnect();},{once:true});
})();