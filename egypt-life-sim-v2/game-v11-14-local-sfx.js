(() => {
  'use strict';

  const VERSION='11.14';
  const localSources={
    step_pavement:'audio/v11-8/step_pavement.wav',
    step_asphalt:'audio/v11-8/step_asphalt.wav',
    interact:'audio/v11-8/interact.wav',
    buy:'audio/v11-8/buy_coin.wav',
    door:'audio/v11-8/door.wav',
    reward:'audio/v11-8/reward.wav',
    deny:'audio/v11-8/interact.wav'
  };

  const buffers={};
  const events={step:0,interact:0,buy:0,reward:0,door:0,open:0,close:0,deny:0,start:0,ui:0};
  let bus=null,compressor=null,analyser=null,preloadPromise=null,bankReady=false,unlocked=false;
  let loaded=0,failed=0,playCalls=0,playResolved=0,lastPlayed=null;
  let lastCam=null,stepTravel=0,leftFoot=false,stepTimer=null,lastToast='',lastToastAt=0,muteTimer=null;

  const getContext=()=>window.__V119_CONTEXT||window.__V118_CONTEXT||window.__V117_CONTEXT||window.__V116_CONTEXT||null;
  const getMaster=()=>window.__V119_MASTER||window.__V118_MASTER||window.__V117_MASTER||window.__V116_MASTER||null;
  const isMuted=()=>document.getElementById('soundToggle')?.textContent.includes('مكتوم')===true;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function muteOlderSfx(){
    for(const old of [window.__V1110_SFX_BUS,window.__V119_SFX_BUS,window.__V118_SFX_BUS]){
      if(!old||old===bus)continue;
      try{old.gain.setTargetAtTime(0,getContext()?.currentTime||0,.008);}catch(_){try{old.gain.value=0;}catch(__){}}
    }
  }

  function ensureBus(){
    const ctx=getContext(),master=getMaster();
    if(!ctx||!master)return false;
    if(bus)return true;
    bus=ctx.createGain();bus.gain.value=1.18;
    compressor=ctx.createDynamicsCompressor();
    compressor.threshold.value=-18;compressor.knee.value=8;compressor.ratio.value=2.5;compressor.attack.value=.002;compressor.release.value=.09;
    analyser=ctx.createAnalyser();analyser.fftSize=1024;
    bus.connect(compressor);compressor.connect(analyser);analyser.connect(master);
    window.__V1114_SFX_BUS=bus;window.__V1114_SFX_ANALYSER=analyser;
    muteOlderSfx();publish();return true;
  }

  async function loadLocal(key,url){
    const ctx=getContext();if(!ctx)throw new Error('AudioContext unavailable');
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP ${response.status} ${url}`);
    const bytes=await response.arrayBuffer();
    const buffer=await ctx.decodeAudioData(bytes.slice(0));
    if(!buffer||buffer.duration<=0)throw new Error('Decoded empty local SFX '+url);
    buffers[key]={buffer,url};loaded++;publish();return buffer;
  }

  function preload(){
    if(preloadPromise)return preloadPromise;
    preloadPromise=(async()=>{
      if(!ensureBus())throw new Error('Local SFX bus unavailable');
      const jobs=Object.entries(localSources).map(([key,url])=>loadLocal(key,url).catch(err=>{failed++;console.warn('V11.14 local SFX failed',key,url,err);publish();}));
      await Promise.all(jobs);bankReady=true;publish();return loaded>0;
    })().catch(err=>{bankReady=true;console.error('V11.14 local SFX preload failed',err);publish();return false;});
    return preloadPromise;
  }

  async function unlock(){
    try{await (window.__V119_AUDIO_START||window.__V118_AUDIO_START||window.__V117_AUDIO_START)?.();}catch(_){}
    const ctx=getContext();if(!ctx)return false;
    if(ctx.state!=='running'){try{await ctx.resume();}catch(_){}}
    if(ctx.state!=='running')return false;
    ensureBus();muteOlderSfx();
    if(!muteTimer)muteTimer=setInterval(muteOlderSfx,180);
    await preload();unlocked=true;publish();return true;
  }

  function playKey(key,volume=.9,rate=1,pan=0){
    if(isMuted())return false;
    const ctx=getContext();
    if(!ctx||ctx.state!=='running'||!ensureBus()){unlock().then(()=>playKey(key,volume,rate,pan));return true;}
    if(!bankReady){preload().then(()=>playKey(key,volume,rate,pan));return true;}
    const item=buffers[key];if(!item)return false;
    playCalls++;
    try{
      const src=ctx.createBufferSource(),gain=ctx.createGain();
      src.buffer=item.buffer;src.playbackRate.value=rate;gain.gain.value=clamp(volume,0,1.25);
      src.connect(gain);
      if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=clamp(pan,-1,1);gain.connect(p);p.connect(bus);}else gain.connect(bus);
      src.start();playResolved++;
      lastPlayed={key,transport:'same-origin-local-sample',url:item.url,rate,volume,pan,at:performance.now()};
      publish();return true;
    }catch(err){lastPlayed={key,transport:'local-play-failed',error:String(err),at:performance.now()};publish();return false;}
  }

  function step(kind='pavement'){leftFoot=!leftFoot;events.step++;playKey(kind==='asphalt'?'step_asphalt':'step_pavement',kind==='asphalt'?1.02:.98,(leftFoot?.985:1.015)*(0.985+Math.random()*.025),leftFoot?-.06:.06);publish();}
  function interact(){events.interact++;playKey('interact',1.04,.98+Math.random()*.025);publish();}
  function shopOpen(){events.open++;playKey('interact',.88,.95+Math.random()*.02);publish();}
  function close(){events.close++;playKey('door',1.03,1.01+Math.random()*.025);publish();}
  function buy(){events.buy++;playKey('buy',1.08,.985+Math.random()*.025);publish();}
  function reward(){events.reward++;playKey('reward',.98,.99+Math.random()*.018);publish();}
  function door(){events.door++;playKey('door',1.08,.99+Math.random()*.02);publish();}
  function deny(){events.deny++;playKey('deny',.92,.72);publish();}
  function startCue(){events.start++;playKey('interact',.72,.9);publish();}
  function uiTap(){events.ui++;playKey('interact',.66,1.08);publish();}
  function play(name){const map={step:()=>step('pavement'),asphalt:()=>step('asphalt'),interact,buy,reward,door,open:shopOpen,close,deny,start:startCue,ui:uiTap};if(!map[name])return false;map[name]();return true;}

  function hookUnlock(){const fire=()=>unlock();for(const id of ['newGameBtn','continueBtn']){const el=document.getElementById(id);if(!el)continue;el.addEventListener('pointerdown',fire,{capture:true});el.addEventListener('touchstart',fire,{capture:true,passive:true});}}
  function hookControls(){document.addEventListener('pointerdown',e=>{const t=e.target instanceof Element?e.target:null;if(!t)return;if(t.closest('#shopClose,#dialogClose'))close();else if(t.closest('#resetBtn'))uiTap();},true);}
  function hookModals(){for(const [id,fn] of [['shop',shopOpen],['dialog',interact]]){const el=document.getElementById(id);if(!el)continue;let visible=getComputedStyle(el).display!=='none';new MutationObserver(()=>{const now=getComputedStyle(el).display!=='none';if(now&&!visible)fn();visible=now;}).observe(el,{attributes:true,attributeFilter:['style','class']});}}
  function hookToast(){const toast=document.getElementById('toast');if(!toast)return;new MutationObserver(()=>{const text=(toast.textContent||'').trim(),now=performance.now();if(!text||(text===lastToast&&now-lastToastAt<650))return;lastToast=text;lastToastAt=now;if(text.startsWith('اشتريت '))buy();else if(text.includes('خلصت طلبية')&&text.includes('كسبت'))reward();else if(text.includes('رجعت بيت العيلة'))door();else if(text.includes('الفلوس مش مكفية'))deny();else if(text.includes('لفّيت في سوق الحارة'))interact();}).observe(toast,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});}
  function hookFootsteps(){stepTimer=setInterval(()=>{const ctx=getContext();if(ctx?.state!=='running'||!document.body.classList.contains('game-started')){lastCam=null;stepTravel=0;return;}const cam=window.__egyptDebug?.getCamera?.();if(!cam)return;if(lastCam){const delta=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);if(delta<2.5){stepTravel+=delta;while(stepTravel>.66){const road=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));step(road<4.8?'asphalt':'pavement');stepTravel-=.66;}}else stepTravel=0;}lastCam={x:cam.x,z:cam.z};},75);}

  function state(){return {version:VERSION,engine:'same-origin-local-sfx',installed:true,sameOriginPrimary:true,remoteRequired:false,bankReady,unlocked,localTotal:Object.keys(localSources).length,localLoaded:loaded,localFailed:failed,playCalls,playResolved,lastPlayed:lastPlayed?{...lastPlayed}:null,eventCount:Object.values(events).reduce((a,b)=>a+b,0),events:{...events},qualityBus:!!bus,olderSfxMuted:[window.__V1110_SFX_BUS,window.__V119_SFX_BUS,window.__V118_SFX_BUS].filter(Boolean).every(x=>(x.gain?.value??0)<.01)};}
  function publish(){window.__V1114_SFX=state();}

  hookUnlock();hookControls();hookModals();hookToast();hookFootsteps();publish();
  window.__V1114_SFX_API={play,unlock,state,playKey,preload,ensureBus,localSources};
  window.addEventListener('beforeunload',()=>{if(stepTimer)clearInterval(stepTimer);if(muteTimer)clearInterval(muteTimer);},{once:true});
})();