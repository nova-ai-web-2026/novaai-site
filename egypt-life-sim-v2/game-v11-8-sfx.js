(() => {
  'use strict';

  let ctx=null, parentMaster=null, bus=null, stepTimer=null, lastCam=null, stepTravel=0, leftFoot=false;
  let lastToast='', lastToastAt=0;
  const events={step:0,interact:0,buy:0,reward:0,door:0,open:0,close:0,deny:0,start:0,ui:0};

  const state=()=>({
    version:'11.8',
    engine:'event-sfx-on-shared-audiocontext',
    installed:true,
    started:!!ctx,
    contextState:ctx?.state||null,
    busGain:bus?.gain?.value??null,
    eventCount:Object.values(events).reduce((a,b)=>a+b,0),
    events:{...events},
    footsteps:true,
    interaction:true,
    purchase:true,
    doors:true,
    rewards:true,
    legacyHum:false,
    legacyHorns:false
  });

  function refreshRefs(){
    ctx=window.__V117_CONTEXT||window.__V116_CONTEXT||ctx;
    parentMaster=window.__V117_MASTER||window.__V116_MASTER||parentMaster;
    if(ctx&&parentMaster&&!bus){
      bus=ctx.createGain();
      bus.gain.value=1;
      bus.connect(parentMaster);
      window.__V118_SFX_BUS=bus;
    }
    window.__V118_SFX=state();
    return !!(ctx&&parentMaster&&bus);
  }

  async function ensureAudio(){
    window.__V117_AUDIO_START?.(false);
    refreshRefs();
    if(!ctx)return false;
    if(ctx.state!=='running'){
      try{await ctx.resume();}catch(_){}
    }
    refreshRefs();
    return ctx.state==='running'&&!!bus;
  }

  function noiseBuffer(seconds=.1, decay=4, brown=.14){
    const len=Math.max(1,Math.floor(ctx.sampleRate*seconds));
    const b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);let low=0;
    for(let i=0;i<len;i++){
      const white=Math.random()*2-1;low=low*(1-brown)+white*brown;
      const env=Math.pow(1-i/len,decay);
      d[i]=(low*.62+white*.38)*env;
    }
    return b;
  }

  function burst({freq=500,q=.8,vol=.15,dur=.08,type='bandpass',delay=0,highpass=0}={}){
    if(!refreshRefs())return;
    const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),t=ctx.currentTime+delay;
    src.buffer=noiseBuffer(Math.max(.045,dur*1.7),3.3,.11);
    f.type=type;f.frequency.value=freq;f.Q.value=q;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    src.connect(f);
    if(highpass>0){const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=highpass;f.connect(hp);hp.connect(g);}else f.connect(g);
    g.connect(bus);src.start(t);src.stop(t+dur+.05);
  }

  function step(kind='pavement'){
    if(!refreshRefs())return;
    leftFoot=!leftFoot;events.step++;
    const asphalt=kind==='asphalt';
    burst({freq:asphalt?(leftFoot?245:285):(leftFoot?330:380),q:.72,vol:asphalt?.19:.17,dur:.075,type:'lowpass'});
    burst({freq:asphalt?980:1280,q:.9,vol:.07,dur:.045,type:'bandpass',delay:.008,highpass:500});
    window.__V118_SFX=state();
  }

  function interact(){events.interact++;burst({freq:520,q:1.1,vol:.17,dur:.055});burst({freq:1120,q:1.7,vol:.07,dur:.035,delay:.035});window.__V118_SFX=state();}
  function shopOpen(){events.open++;burst({freq:300,q:.65,vol:.14,dur:.075,type:'lowpass'});burst({freq:1450,q:2.2,vol:.055,dur:.035,delay:.04});window.__V118_SFX=state();}
  function close(){events.close++;burst({freq:260,q:.65,vol:.13,dur:.07,type:'lowpass'});burst({freq:900,q:1.6,vol:.05,dur:.035,delay:.025});window.__V118_SFX=state();}
  function buy(){events.buy++;burst({freq:1850,q:4.6,vol:.20,dur:.045,highpass:850});burst({freq:2450,q:5.2,vol:.15,dur:.04,delay:.065,highpass:1100});burst({freq:1280,q:3.6,vol:.11,dur:.035,delay:.12,highpass:700});window.__V118_SFX=state();}
  function reward(){events.reward++;buy();setTimeout(()=>{burst({freq:3100,q:5.5,vol:.12,dur:.035,highpass:1400});burst({freq:2050,q:4.2,vol:.11,dur:.04,delay:.05,highpass:900});},120);window.__V118_SFX=state();}
  function door(){events.door++;burst({freq:180,q:.7,vol:.21,dur:.11,type:'lowpass'});burst({freq:1550,q:2.5,vol:.10,dur:.045,delay:.03,highpass:700});burst({freq:620,q:1.1,vol:.08,dur:.055,delay:.095});window.__V118_SFX=state();}
  function deny(){events.deny++;burst({freq:230,q:1.25,vol:.12,dur:.075,type:'bandpass'});burst({freq:180,q:1.1,vol:.10,dur:.07,delay:.08,type:'bandpass'});window.__V118_SFX=state();}
  function startCue(){events.start++;burst({freq:360,q:.8,vol:.16,dur:.08,type:'lowpass'});burst({freq:980,q:1.8,vol:.08,dur:.04,delay:.08});window.__V118_SFX=state();}
  function uiTap(){events.ui++;burst({freq:760,q:1.8,vol:.07,dur:.035});window.__V118_SFX=state();}

  function play(name){
    if(!refreshRefs())return false;
    const map={step:()=>step('pavement'),asphalt:()=>step('asphalt'),interact,buy,reward,door,open:shopOpen,close,deny,start:startCue,ui:uiTap};
    if(!map[name])return false;map[name]();return true;
  }

  function hookControls(){
    const act=document.getElementById('act');
    act?.addEventListener('pointerdown',()=>ensureAudio().then(ok=>ok&&interact()),{capture:true});
    document.addEventListener('keydown',e=>{
      if(e.repeat)return;
      const menu=document.getElementById('menu');
      if(menu&&getComputedStyle(menu).display!=='none')return;
      if(e.code==='KeyE')ensureAudio().then(ok=>ok&&interact());
    },true);

    document.addEventListener('pointerdown',e=>{
      const target=e.target instanceof Element?e.target:null;if(!target)return;
      if(target.closest('#shopItems button'))ensureAudio().then(ok=>ok&&uiTap());
      else if(target.closest('#shopClose,#dialogClose'))ensureAudio().then(ok=>ok&&close());
    },true);

    for(const id of ['newGameBtn','continueBtn']){
      document.getElementById(id)?.addEventListener('pointerdown',()=>ensureAudio().then(ok=>ok&&startCue()),{capture:true});
    }
  }

  function hookModals(){
    for(const [id,fn] of [['shop',shopOpen],['dialog',shopOpen]]){
      const el=document.getElementById(id);if(!el)continue;let visible=getComputedStyle(el).display!=='none';
      new MutationObserver(()=>{
        const now=getComputedStyle(el).display!=='none';
        if(now&&!visible)ensureAudio().then(ok=>ok&&fn());
        visible=now;
      }).observe(el,{attributes:true,attributeFilter:['style','class']});
    }
  }

  function hookToast(){
    const toast=document.getElementById('toast');if(!toast)return;
    new MutationObserver(()=>{
      const text=(toast.textContent||'').trim();const now=performance.now();
      if(!text||(text===lastToast&&now-lastToastAt<700))return;lastToast=text;lastToastAt=now;
      ensureAudio().then(ok=>{
        if(!ok)return;
        if(text.startsWith('اشتريت '))buy();
        else if(text.includes('خلصت طلبية')&&text.includes('كسبت'))reward();
        else if(text.includes('رجعت بيت العيلة'))door();
        else if(text.includes('الفلوس مش مكفية'))deny();
        else if(text.includes('بدأت يوم جديد')||text.includes('رجعت لآخر مكان محفوظ'))startCue();
        else if(text.includes('لفّيت في سوق الحارة')){burst({freq:720,q:.7,vol:.11,dur:.10});burst({freq:1250,q:.8,vol:.07,dur:.07,delay:.07});}
      });
    }).observe(toast,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  }

  function hookFootsteps(){
    stepTimer=setInterval(()=>{
      if(!refreshRefs()||ctx.state!=='running'||!document.body.classList.contains('game-started')){lastCam=null;stepTravel=0;return;}
      const cam=window.__egyptDebug?.getCamera?.();if(!cam)return;
      if(lastCam){
        const delta=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);
        if(delta<2.5){stepTravel+=delta;while(stepTravel>.62){const road=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));step(road<4.8?'asphalt':'pavement');stepTravel-=.62;}}
        else stepTravel=0;
      }
      lastCam={x:cam.x,z:cam.z};
    },90);
  }

  hookControls();hookModals();hookToast();hookFootsteps();refreshRefs();
  window.__V118_SFX_API={play,ensureAudio,state};
  window.__V118_SFX=state();
  window.__egyptDebug=window.__egyptDebug||{};
  window.__egyptDebug.v118SfxState=state;
  window.addEventListener('beforeunload',()=>{if(stepTimer)clearInterval(stepTimer);},{once:true});
})();
