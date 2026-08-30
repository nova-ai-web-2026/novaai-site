(() => {
  'use strict';
  let ctx=null, master=null, analyser=null, road=null, timer=null, last=null, step=0, starting=false;

  function nativeCtor(){
    try{
      const frame=document.createElement('iframe');
      frame.style.display='none';frame.setAttribute('aria-hidden','true');document.body.appendChild(frame);
      const C=frame.contentWindow?.AudioContext||frame.contentWindow?.webkitAudioContext;
      if(C){window.__V115_NATIVE_FRAME=frame;return C;}
      frame.remove();
    }catch(_){}
    return window.AudioContext||window.webkitAudioContext;
  }

  function noise(seconds=.5){const b=ctx.createBuffer(1,Math.max(1,Math.floor(ctx.sampleRate*seconds)),ctx.sampleRate),d=b.getChannelData(0);let brown=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;brown=brown*.988+w*.012;d[i]=brown*.78+w*.12;}return b;}
  function foley(freq=520,vol=.11,dur=.1){if(!ctx||!master)return;const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),t=ctx.currentTime;s.buffer=noise(.14);f.type='bandpass';f.frequency.value=freq;f.Q.value=.75;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(master);s.start(t);s.stop(t+dur+.04);}

  async function ensureAudio(forceCue=false){
    if(starting)return;starting=true;
    try{
      if(!ctx){
        const C=nativeCtor();if(!C)throw new Error('Web Audio unavailable');
        ctx=new C({latencyHint:'interactive'});
        window.__V115_CONTEXT=ctx;
        master=ctx.createGain();master.gain.value=.82;
        analyser=ctx.createAnalyser();analyser.fftSize=512;
        master.connect(analyser);analyser.connect(ctx.destination);
        window.__V115_MASTER=master;window.__V115_ANALYSER=analyser;
        const src=ctx.createBufferSource(),lp=ctx.createBiquadFilter(),g=ctx.createGain();
        src.buffer=noise(6);src.loop=true;lp.type='lowpass';lp.frequency.value=390;g.gain.value=.17;src.connect(lp);lp.connect(g);g.connect(master);src.start();road=g;
        timer=setInterval(()=>{
          if(ctx.state==='suspended')ctx.resume().catch(()=>{});
          const cam=window.__egyptDebug?.getCamera?.();if(!cam)return;const d=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));
          road.gain.setTargetAtTime(d<10?.19:.11,ctx.currentTime,.3);
          if(last){step+=Math.hypot(cam.x-last.x,cam.z-last.z);if(step>.72){foley(d>4.8&&d<8.1?760:430,.085,.07);step=0;}}last={x:cam.x,z:cam.z};
        },140);
      }
      if(ctx.state!=='running')await ctx.resume();
      try{window.__V11_OWN_MASTER?.disconnect();}catch(_){}try{window.__V111_SUPERSEDED_MASTER?.disconnect();}catch(_){}try{window.__V112_MASTER?.disconnect();}catch(_){}
      if(forceCue||!window.__V115_AUDIO?.started){foley(360,.19,.13);setTimeout(()=>foley(690,.13,.09),135);}
      window.__V115_AUDIO={version:'11.5',engine:'isolated-native-audiocontext',started:true,contextState:ctx.state,masterGain:.82,hornEvents:false,oscillatorTones:false,gesture:'pointerdown-touchstart-click',testButton:true};
      const b=document.getElementById('v115SoundTest');if(b)b.textContent='🔊 الصوت شغال';
    }catch(err){console.error('V11.5 audio failed',err);window.__V115_AUDIO={version:'11.5',started:false,error:String(err)};const b=document.getElementById('v115SoundTest');if(b)b.textContent='⚠️ تعذر تشغيل الصوت';}
    finally{starting=false;}
  }

  const startGesture=()=>ensureAudio(false);
  for(const id of ['newGameBtn','continueBtn']){
    const el=document.getElementById(id);if(!el)continue;
    el.addEventListener('pointerdown',startGesture,{capture:true});
    el.addEventListener('touchstart',startGesture,{capture:true,passive:true});
    el.addEventListener('click',startGesture,{capture:true});
  }

  const buttons=document.querySelector('.menuButtons');
  if(buttons&&!document.getElementById('v115SoundTest')){
    const b=document.createElement('button');b.id='v115SoundTest';b.className='menuBtn';b.type='button';b.textContent='🔊 اختبار الصوت';
    b.addEventListener('pointerdown',()=>ensureAudio(true),{capture:true});
    b.addEventListener('touchstart',()=>ensureAudio(true),{capture:true,passive:true});
    b.addEventListener('click',()=>ensureAudio(true),{capture:true});buttons.appendChild(b);
  }

  const toggle=document.getElementById('soundToggle');toggle?.addEventListener('click',()=>{if(!master||!ctx)return;const muted=toggle.textContent.includes('مكتوم');master.gain.setTargetAtTime(muted?0:.82,ctx.currentTime,.04);},false);
  window.__V115_AUDIO={version:'11.5',engine:'isolated-native-audiocontext',started:false,contextState:null,masterGain:.82,hornEvents:false,oscillatorTones:false,gesture:'pointerdown-touchstart-click',testButton:true};
  window.__V114_AUDIO=window.__V115_AUDIO;
  window.__egyptDebug=window.__egyptDebug||{};window.__egyptDebug.v115AudioState=()=>({...window.__V115_AUDIO,ctxState:ctx?.state||null,masterValue:master?.gain?.value??null});
  window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer);try{ctx?.close();}catch(_){}try{window.__V115_NATIVE_FRAME?.remove();}catch(_){}},{once:true});
})();