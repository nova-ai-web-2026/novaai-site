(() => {
  'use strict';
  let ctx=null, master=null, analyser=null, road=null, timer=null, last=null, step=0;
  const AC=window.AudioContext||window.webkitAudioContext;
  const noise=(seconds=.5)=>{const b=ctx.createBuffer(1,Math.floor(ctx.sampleRate*seconds),ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.5;return b;};
  const foley=(freq=520,vol=.06,dur=.08)=>{if(!ctx||!master)return;const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),t=ctx.currentTime;s.buffer=noise(.12);f.type='bandpass';f.frequency.value=freq;f.Q.value=.8;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(master);s.start(t);s.stop(t+dur+.03);};
  async function start(){
    if(ctx||!AC)return;
    ctx=new AC();
    // Wrapped legacy constructor treats first gain as its own legacy bus; keep that dummy disconnected.
    try{ctx.createGain();}catch(_){}
    try{if(ctx.state!=='running')await ctx.resume();}catch(_){}
    master=ctx.createGain();master.gain.value=.72;
    analyser=ctx.createAnalyser();analyser.fftSize=512;
    master.connect(analyser);analyser.connect(ctx.destination);
    window.__V114_CONTEXT=ctx;window.__V114_MASTER=master;window.__V114_ANALYSER=analyser;
    const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=noise(5);src.loop=true;f.type='lowpass';f.frequency.value=340;g.gain.value=.11;src.connect(f);f.connect(g);g.connect(master);src.start();road=g;
    // Clearly audible but soft startup cue: filtered physical thump, no oscillator.
    foley(420,.095,.11);setTimeout(()=>foley(760,.055,.07),120);
    timer=setInterval(()=>{const cam=window.__egyptDebug?.getCamera?.();if(!cam)return;const t=ctx.currentTime,d=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));road.gain.setTargetAtTime(d<10?.14:.075,t,.35);if(last){step+=Math.hypot(cam.x-last.x,cam.z-last.z);if(step>.72){foley(d>4.8&&d<8.1?760:430,.055,.065);step=0;}}last={x:cam.x,z:cam.z};},150);
    window.__V114_AUDIO.started=true;window.__V114_AUDIO.contextState=ctx.state;
  }
  const click=()=>start();
  document.getElementById('newGameBtn')?.addEventListener('click',click,true);
  document.getElementById('continueBtn')?.addEventListener('click',click,true);
  document.getElementById('soundToggle')?.addEventListener('click',()=>{if(!master||!ctx)return;const muted=document.getElementById('soundToggle')?.textContent?.includes('مكتوم');master.gain.setTargetAtTime(muted?0:.72,ctx.currentTime,.05);},false);
  window.__V114_AUDIO={version:'11.4',engine:'dedicated-audio-context',started:false,contextState:null,masterGain:.72,oscillatorTones:false,hornEvents:false,outputProbe:true};
  window.__egyptDebug=window.__egyptDebug||{};window.__egyptDebug.v114AudioState=()=>({...window.__V114_AUDIO,ctxState:ctx?.state||null,masterValue:master?.gain?.value??null});
  window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer);try{ctx?.close();}catch(_){}},{once:true});
})();