(() => {
  'use strict';

  let ctx=null, gameMaster=null, master=null, analyser=null, roadBed=null, timer=null, lastCam=null, stepDistance=0;
  const Wrapped=window.AudioContext||window.webkitAudioContext;
  let NativeAC=Wrapped;
  try{
    const ctor=Wrapped?.prototype?.constructor;
    if(ctor&&ctor!==Wrapped)NativeAC=ctor;
  }catch(_){}

  function fail(msg,err){
    console.error(msg,err||'');
    window.__V116_AUDIO={version:'11.6',started:false,error:String(err||msg)};
  }

  function makeNoise(seconds=.5,brightness=.08){
    if(!ctx)return null;
    const len=Math.max(1,Math.floor(ctx.sampleRate*seconds));
    const b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);
    let brown=0;
    for(let i=0;i<len;i++){
      const white=Math.random()*2-1;
      brown=brown*.992+white*.008;
      d[i]=brown*.82+white*brightness;
    }
    return b;
  }

  function foley(center=470,vol=.075,dur=.085){
    if(!ctx||!master)return;
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),now=ctx.currentTime;
    src.buffer=makeNoise(.13,.16);
    filter.type='bandpass';filter.frequency.value=center;filter.Q.value=.72;
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(vol,now+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,now+dur);
    src.connect(filter);filter.connect(gain);gain.connect(master);src.start(now);src.stop(now+dur+.04);
  }

  function installCleanConstructor(){
    if(!NativeAC)return false;
    function CleanAudioContext(...args){
      const created=new NativeAC(...args);
      ctx=created;window.__V116_CONTEXT=created;
      const originalCreateGain=created.createGain.bind(created);let gainIndex=0;
      created.createGain=()=>{
        const g=originalCreateGain();
        if(gainIndex++===0){gameMaster=g;window.__V116_GAME_MASTER=g;}
        return g;
      };
      return created;
    }
    CleanAudioContext.prototype=NativeAC.prototype;
    try{
      window.AudioContext=CleanAudioContext;
      if(window.webkitAudioContext)window.webkitAudioContext=CleanAudioContext;
      window.__V11_AUDIO_WRAPPED=true;
      window.__V11_AUDIO_CONTEXT=null;
      return true;
    }catch(err){fail('V11.6 could not restore the page AudioContext',err);return false;}
  }

  async function startSingleMix(){
    try{
      ctx=ctx||window.__V116_CONTEXT;
      if(!ctx)return false;
      if(ctx.state!=='running')await ctx.resume();
      if(ctx.state!=='running')throw new Error('AudioContext stayed '+ctx.state);
      if(master)return true;

      if(gameMaster)gameMaster.gain.setTargetAtTime(.18,ctx.currentTime,.035);
      try{window.__V11_OWN_MASTER?.disconnect();}catch(_){}
      try{window.__V111_SUPERSEDED_MASTER?.disconnect();}catch(_){}
      try{window.__V112_MASTER?.disconnect();}catch(_){}
      try{window.__V115_MASTER?.disconnect();}catch(_){}

      master=ctx.createGain();master.__v116Own=true;master.gain.value=.78;
      analyser=ctx.createAnalyser();analyser.fftSize=512;
      master.connect(analyser);analyser.connect(ctx.destination);
      window.__V116_MASTER=master;window.__V116_ANALYSER=analyser;

      const src=ctx.createBufferSource(),lp=ctx.createBiquadFilter(),gain=ctx.createGain();
      src.buffer=makeNoise(6,.045);src.loop=true;lp.type='lowpass';lp.frequency.value=360;gain.gain.value=.105;
      src.connect(lp);lp.connect(gain);gain.connect(master);src.start();roadBed=gain;

      foley(390,.12,.12);setTimeout(()=>foley(720,.075,.075),125);
      timer=setInterval(()=>{
        const cam=window.__egyptDebug?.getCamera?.();if(!cam||!roadBed)return;
        const d=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));
        roadBed.gain.setTargetAtTime(d<10?.13:.075,ctx.currentTime,.32);
        if(lastCam){
          stepDistance+=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);
          if(stepDistance>.76){foley(d>4.8&&d<8.1?720:420,.055,.065);stepDistance=0;}
        }
        lastCam={x:cam.x,z:cam.z};
      },150);

      window.__V116_AUDIO={version:'11.6',engine:'single-top-level-audiocontext',started:true,contextState:ctx.state,gameMasterReduced:true,masterGain:.78,legacyLayersDisabled:true,hornEvents:false,oscillatorTones:false};
      const foot=document.querySelector('.menuFoot');if(foot)foot.textContent='V11.6 — stable startup + single audio engine';
      return true;
    }catch(err){fail('V11.6 audio start failed',err);return false;}
  }

  function afterGameStart(){setTimeout(()=>startSingleMix(),0);}
  for(const id of ['newGameBtn','continueBtn'])document.getElementById(id)?.addEventListener('click',afterGameStart,false);

  const toggle=document.getElementById('soundToggle');
  if(toggle)new MutationObserver(()=>{
    if(!master||!ctx)return;
    const muted=toggle.textContent.includes('مكتوم');
    master.gain.setTargetAtTime(muted?0:.78,ctx.currentTime,.05);
  }).observe(toggle,{childList:true,subtree:true,characterData:true});

  document.getElementById('v113-startup-style')?.remove();
  document.body.classList.remove('v113-menu-open');
  document.getElementById('v115SoundTest')?.remove();

  if(installCleanConstructor()){
    window.__V116_AUDIO={version:'11.6',engine:'single-top-level-audiocontext',started:false,contextState:null,legacyLayersDisabled:true,hornEvents:false,oscillatorTones:false};
  }
  window.__egyptDebug=window.__egyptDebug||{};
  window.__egyptDebug.v116AudioState=()=>({...window.__V116_AUDIO,ctxState:ctx?.state||null,masterValue:master?.gain?.value??null,gameMasterValue:gameMaster?.gain?.value??null});
  window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer);},{once:true});
})();
