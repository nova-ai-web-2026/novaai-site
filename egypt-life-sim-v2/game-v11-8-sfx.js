(() => {
  'use strict';

  let ctx=null, parentMaster=null, bus=null, analyser=null, stepTimer=null, lastCam=null, stepTravel=0, leftFoot=false;
  let lastToast='', lastToastAt=0;
  const events={step:0,interact:0,buy:0,reward:0,door:0,open:0,close:0,deny:0,start:0,ui:0};

  const state=()=>({
    version:'11.8',engine:'event-sfx-on-shared-audiocontext',installed:true,started:!!ctx,contextState:ctx?.state||null,
    busGain:bus?.gain?.value??null,eventCount:Object.values(events).reduce((a,b)=>a+b,0),events:{...events},
    footsteps:true,interaction:true,purchase:true,doors:true,rewards:true,legacyHum:false,legacyHorns:false
  });

  function refreshRefs(){
    ctx=window.__V117_CONTEXT||window.__V116_CONTEXT||ctx;
    parentMaster=window.__V117_MASTER||window.__V116_MASTER||parentMaster;
    if(ctx&&parentMaster&&!bus){
      bus=ctx.createGain();bus.gain.value=1.28;
      analyser=ctx.createAnalyser();analyser.fftSize=512;
      bus.connect(analyser);analyser.connect(parentMaster);
      window.__V118_SFX_BUS=bus;window.__V118_SFX_ANALYSER=analyser;
    }
    window.__V118_SFX=state();return !!(ctx&&parentMaster&&bus&&analyser);
  }

  async function ensureAudio(){
    window.__V117_AUDIO_START?.(false);refreshRefs();if(!ctx)return false;
    if(ctx.state!=='running'){try{await ctx.resume();}catch(_){}}
    refreshRefs();return ctx.state==='running'&&!!bus;
  }

  function noiseBuffer(seconds=.1,decay=4,brown=.14){
    const len=Math.max(1,Math.floor(ctx.sampleRate*seconds)),b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);let low=0;
    for(let i=0;i<len;i++){const white=Math.random()*2-1;low=low*(1-brown)+white*brown;const env=Math.pow(1-i/len,decay);d[i]=(low*.62+white*.38)*env;}return b;
  }

  function burst({freq=500,q=.8,vol=.15,dur=.1,type='bandpass',delay=0,highpass=0}={}){
    if(!refreshRefs())return;
    const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),t=ctx.currentTime+delay;
    src.buffer=noiseBuffer(Math.max(.06,dur*1.75),3.0,.12);f.type=type;f.frequency.value=freq;f.Q.value=q;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    src.connect(f);
    if(highpass>0){const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=highpass;f.connect(hp);hp.connect(g);}else f.connect(g);
    g.connect(bus);src.start(t);src.stop(t+dur+.06);
  }

  function step(kind='pavement'){
    if(!refreshRefs())return;leftFoot=!leftFoot;events.step++;const asphalt=kind==='asphalt';
    burst({freq:asphalt?(leftFoot?235:275):(leftFoot?320:370),q:.68,vol:asphalt?.24:.22,dur:.105,type:'lowpass'});
    burst({freq:asphalt?930:1220,q:.82,vol:.10,dur:.075,type:'bandpass',delay:.012,highpass:480});window.__V118_SFX=state();
  }
  function interact(){events.interact++;burst({freq:500,q:1.0,vol:.27,dur:.13});burst({freq:1080,q:1.55,vol:.12,dur:.09,delay:.055});window.__V118_SFX=state();}
  function shopOpen(){events.open++;burst({freq:285,q:.62,vol:.23,dur:.14,type:'lowpass'});burst({freq:1380,q:2.0,vol:.10,dur:.085,delay:.055});window.__V118_SFX=state();}
  function close(){events.close++;burst({freq:245,q:.62,vol:.22,dur:.13,type:'lowpass'});burst({freq:860,q:1.45,vol:.09,dur:.08,delay:.04});window.__V118_SFX=state();}
  function buy(){events.buy++;burst({freq:1780,q:4.0,vol:.29,dur:.075,highpass:800});burst({freq:2350,q:4.6,vol:.23,dur:.07,delay:.085,highpass:1050});burst({freq:1240,q:3.1,vol:.17,dur:.065,delay:.165,highpass:650});window.__V118_SFX=state();}
  function reward(){events.reward++;buy();setTimeout(()=>{burst({freq:2950,q:4.8,vol:.19,dur:.065,highpass:1300});burst({freq:1960,q:3.8,vol:.17,dur:.07,delay:.08,highpass:850});},190);window.__V118_SFX=state();}
  function door(){events.door++;burst({freq:170,q:.65,vol:.31,dur:.18,type:'lowpass'});burst({freq:1480,q:2.15,vol:.16,dur:.085,delay:.045,highpass:650});burst({freq:590,q:1.0,vol:.13,dur:.10,delay:.13});window.__V118_SFX=state();}
  function deny(){events.deny++;burst({freq:225,q:1.15,vol:.18,dur:.12});burst({freq:175,q:1.05,vol:.16,dur:.11,delay:.12});window.__V118_SFX=state();}
  function startCue(){events.start++;burst({freq:345,q:.75,vol:.23,dur:.14,type:'lowpass'});burst({freq:940,q:1.55,vol:.12,dur:.09,delay:.10});window.__V118_SFX=state();}
  function uiTap(){events.ui++;burst({freq:730,q:1.55,vol:.12,dur:.075});window.__V118_SFX=state();}

  function play(name){
    if(!refreshRefs())return false;const map={step:()=>step('pavement'),asphalt:()=>step('asphalt'),interact,buy,reward,door,open:shopOpen,close,deny,start:startCue,ui:uiTap};
    if(!map[name])return false;map[name]();return true;
  }

  function hookControls(){
    document.getElementById('act')?.addEventListener('pointerdown',()=>ensureAudio().then(ok=>ok&&interact()),{capture:true});
    document.addEventListener('keydown',e=>{if(e.repeat)return;const menu=document.getElementById('menu');if(menu&&getComputedStyle(menu).display!=='none')return;if(e.code==='KeyE')ensureAudio().then(ok=>ok&&interact());},true);
    document.addEventListener('pointerdown',e=>{const target=e.target instanceof Element?e.target:null;if(!target)return;if(target.closest('#shopItems button'))ensureAudio().then(ok=>ok&&uiTap());else if(target.closest('#shopClose,#dialogClose'))ensureAudio().then(ok=>ok&&close());},true);
    for(const id of ['newGameBtn','continueBtn'])document.getElementById(id)?.addEventListener('pointerdown',()=>ensureAudio().then(ok=>ok&&startCue()),{capture:true});
  }

  function hookModals(){
    for(const [id,fn] of [['shop',shopOpen],['dialog',shopOpen]]){const el=document.getElementById(id);if(!el)continue;let visible=getComputedStyle(el).display!=='none';new MutationObserver(()=>{const now=getComputedStyle(el).display!=='none';if(now&&!visible)ensureAudio().then(ok=>ok&&fn());visible=now;}).observe(el,{attributes:true,attributeFilter:['style','class']});}
  }

  function hookToast(){
    const toast=document.getElementById('toast');if(!toast)return;
    new MutationObserver(()=>{const text=(toast.textContent||'').trim(),now=performance.now();if(!text||(text===lastToast&&now-lastToastAt<700))return;lastToast=text;lastToastAt=now;ensureAudio().then(ok=>{if(!ok)return;if(text.startsWith('اشتريت '))buy();else if(text.includes('خلصت طلبية')&&text.includes('كسبت'))reward();else if(text.includes('رجعت بيت العيلة'))door();else if(text.includes('الفلوس مش مكفية'))deny();else if(text.includes('بدأت يوم جديد')||text.includes('رجعت لآخر مكان محفوظ'))startCue();else if(text.includes('لفّيت في سوق الحارة')){burst({freq:700,q:.7,vol:.16,dur:.15});burst({freq:1200,q:.78,vol:.11,dur:.11,delay:.09});}});}).observe(toast,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  }

  function hookFootsteps(){
    stepTimer=setInterval(()=>{if(!refreshRefs()||ctx.state!=='running'||!document.body.classList.contains('game-started')){lastCam=null;stepTravel=0;return;}const cam=window.__egyptDebug?.getCamera?.();if(!cam)return;if(lastCam){const delta=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);if(delta<2.5){stepTravel+=delta;while(stepTravel>.62){const road=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));step(road<4.8?'asphalt':'pavement');stepTravel-=.62;}}else stepTravel=0;}lastCam={x:cam.x,z:cam.z};},90);
  }

  hookControls();hookModals();hookToast();hookFootsteps();refreshRefs();
  window.__V118_SFX_API={play,ensureAudio,state};window.__V118_SFX=state();window.__egyptDebug=window.__egyptDebug||{};window.__egyptDebug.v118SfxState=state;
  window.addEventListener('beforeunload',()=>{if(stepTimer)clearInterval(stepTimer);},{once:true});
})();
