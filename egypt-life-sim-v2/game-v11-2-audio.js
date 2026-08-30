(() => {
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let ctx=null, master=null, roadBed=null, marketBed=null, ahwaBed=null, timer=null, lastCam=null, stepDistance=0;

  async function waitReady(){
    for(let i=0;i<300;i++){
      if(window.__V111_PATCH?.version==='11.1')return;
      await sleep(50);
    }
    throw new Error('V11.1 did not finish before V11.2 audio');
  }

  function makeNoise(seconds=5,brightness=.025){
    const len=Math.max(1,Math.floor(ctx.sampleRate*seconds));
    const b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);
    let brown=0;
    for(let i=0;i<len;i++){
      const white=Math.random()*2-1;
      brown=brown*.996+white*.004;
      d[i]=brown*.86+white*brightness;
    }
    return b;
  }

  function makeBed(filterType,freq,q,vol,brightness=.02){
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    src.buffer=makeNoise(6,brightness);src.loop=true;
    filter.type=filterType;filter.frequency.value=freq;filter.Q.value=q;
    gain.gain.value=vol;
    src.connect(filter);filter.connect(gain);gain.connect(master);src.start();
    return gain;
  }

  function softFoley(center=520,dur=.055,vol=.004,q=.7){
    if(!master||!ctx)return;
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),now=ctx.currentTime;
    src.buffer=makeNoise(.12,.08);
    filter.type='bandpass';filter.frequency.value=center;filter.Q.value=q;
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(vol,now+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,now+dur);
    src.connect(filter);filter.connect(gain);gain.connect(master);src.start(now);src.stop(now+dur+.04);
  }

  function hookAndSilenceSupersededMix(){
    ctx=window.__V11_AUDIO_CONTEXT;
    if(!ctx||ctx.__v112GainHooked)return !!ctx;
    ctx.__v112GainHooked=true;
    const originalCreateGain=ctx.createGain.bind(ctx);
    ctx.createGain=()=>{
      const gain=originalCreateGain();
      const originalConnect=gain.connect.bind(gain);
      gain.connect=(dest,...args)=>{
        const out=originalConnect(dest,...args);
        if(dest===ctx.destination && !gain.__v112Own && gain!==window.__V11_LEGACY_MASTER && gain!==window.__V11_OWN_MASTER){
          gain.__v112Superseded=true;
          setTimeout(()=>{
            try{gain.gain.setTargetAtTime(0,ctx.currentTime,.008);}catch(_){}
            try{gain.disconnect();}catch(_){}
            window.__V111_SUPERSEDED_MASTER=gain;
          },0);
        }
        return out;
      };
      return gain;
    };
    return true;
  }

  function startCalmMix(){
    if(master||!ctx)return;
    try{window.__V11_OWN_MASTER?.disconnect();}catch(_){}
    try{window.__V111_SUPERSEDED_MASTER?.disconnect();}catch(_){}
    try{window.__V11_LEGACY_MASTER?.gain.setTargetAtTime(0,ctx.currentTime,.02);}catch(_){}

    master=ctx.createGain();master.__v112Own=true;master.gain.value=.17;master.connect(ctx.destination);
    window.__V112_MASTER=master;

    roadBed=makeBed('lowpass',220,.45,.010,.012);
    marketBed=makeBed('bandpass',430,.55,0,.018);
    ahwaBed=makeBed('bandpass',340,.5,0,.012);

    timer=setInterval(()=>{
      const cam=window.__egyptDebug?.getCamera?.();if(!cam)return;
      const now=ctx.currentTime;
      const road=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));
      const dMarket=Math.hypot(cam.x-48,cam.z+48),dAhwa=Math.hypot(cam.x+48,cam.z-48);
      roadBed.gain.setTargetAtTime(road<10?.013:.006,now,.55);
      marketBed.gain.setTargetAtTime(clamp((24-dMarket)/24,0,1)*.0055,now,.65);
      ahwaBed.gain.setTargetAtTime(clamp((19-dAhwa)/19,0,1)*.0045,now,.65);

      if(lastCam){
        stepDistance+=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);
        if(stepDistance>.82){
          const pavement=road>4.8&&road<8.1;
          softFoley(pavement?680:390,.048,pavement?.0035:.0042,pavement?.9:.6);
          stepDistance=0;
        }
      }
      lastCam={x:cam.x,z:cam.z};

      // Sparse, soft physical foley only — no oscillator horns, whistles or electronic tones.
      if(dAhwa<17&&Math.random()<.0035)softFoley(980,.035,.0027,1.5);
      if(dMarket<20&&Math.random()<.0025)softFoley(720,.045,.0023,1.1);
    },160);
  }

  function arm(){
    let tries=0;
    const t=setInterval(()=>{
      tries++;
      if(!ctx)ctx=window.__V11_AUDIO_CONTEXT;
      if(ctx&&hookAndSilenceSupersededMix()){
        clearInterval(t);
        setTimeout(startCalmMix,190);
      }else if(tries>80)clearInterval(t);
    },20);
  }

  function onStart(){arm();}
  document.getElementById('newGameBtn')?.addEventListener('click',onStart,true);
  document.getElementById('continueBtn')?.addEventListener('click',onStart,true);

  const toggle=document.getElementById('soundToggle');
  if(toggle)new MutationObserver(()=>{
    if(!master||!ctx)return;
    const muted=toggle.textContent.includes('مكتوم');
    master.gain.setTargetAtTime(muted?0:.17,ctx.currentTime,.08);
  }).observe(toggle,{childList:true,subtree:true,characterData:true});

  waitReady().then(()=>{
    window.__V112_AUDIO={
      version:'11.2',
      engine:'calm-cairo-foley-v3',
      oscillatorTones:false,
      hornEvents:false,
      sharpChimes:false,
      masterGain:.17,
      footsteps:'soft-surface-foley',
      ambience:'low-volume-distance-aware'
    };
    if(window.__egyptDebug)window.__egyptDebug.v112AudioState=()=>({...window.__V112_AUDIO,started:!!master,supersededDisconnected:!!window.__V111_SUPERSEDED_MASTER?.__v112Superseded});
    const foot=document.querySelector('.menuFoot');if(foot)foot.textContent='V11.2 — calm Cairo ambience + soft physical foley';
  }).catch(err=>console.error('V11.2 audio failed',err));

  window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer);},{once:true});
})();
