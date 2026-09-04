(() => {
  'use strict';

  const VERSION='11.15';
  const SOURCE_COMMIT='45df48c4d45f8716216b1a9e22df0b69cd9f5932';
  const CDN=`https://cdn.jsdelivr.net/gh/ETdoFresh/kenney.nl@${SOURCE_COMMIT}/`;
  const RAW=`https://raw.githubusercontent.com/ETdoFresh/kenney.nl/${SOURCE_COMMIT}/`;
  const RPG='kenney_rpgaudio/Audio/';
  const UI='kenney_interfacesounds/Audio/';

  const variants={
    step_pavement:[RPG+'footstep04.ogg',RPG+'footstep05.ogg',RPG+'footstep06.ogg',RPG+'footstep07.ogg'],
    step_asphalt:[RPG+'footstep00.ogg',RPG+'footstep01.ogg',RPG+'footstep02.ogg',RPG+'footstep03.ogg'],
    interact:[UI+'click_001.ogg',UI+'click_003.ogg'],
    buy:[RPG+'handleCoins.ogg',RPG+'handleCoins2.ogg'],
    door:[RPG+'doorClose_1.ogg',RPG+'doorClose_3.ogg'],
    reward:[UI+'confirmation_001.ogg',UI+'confirmation_003.ogg'],
    deny:[UI+'error_001.ogg']
  };
  const localFallback={
    step_pavement:'audio/v11-8/step_pavement.wav',
    step_asphalt:'audio/v11-8/step_asphalt.wav',
    interact:'audio/v11-8/interact.wav',
    buy:'audio/v11-8/buy_coin.wav',
    door:'audio/v11-8/door.wav',
    reward:'audio/v11-8/reward.wav',
    deny:'audio/v11-8/interact.wav'
  };

  const banks={},lastVariant={},events={step:0,interact:0,buy:0,reward:0,door:0,open:0,close:0,deny:0,start:0,ui:0};
  const lastEventAt={};
  let bus=null,highpass=null,lowpass=null,compressor=null,analyser=null,preloadPromise=null,bankReady=false,unlocked=false;
  let remoteLoaded=0,remoteFailed=0,localLoaded=0,localFailed=0,playCalls=0,playResolved=0,lastPlayed=null;
  let stepTimer=null,lastCam=null,stepTravel=0,leftFoot=false,lastStepAt=0,lastToast='',lastToastAt=0,muteTimer=null;

  const getContext=()=>window.__V119_CONTEXT||window.__V118_CONTEXT||window.__V117_CONTEXT||window.__V116_CONTEXT||null;
  const getMaster=()=>window.__V119_MASTER||window.__V118_MASTER||window.__V117_MASTER||window.__V116_MASTER||null;
  const isMuted=()=>document.getElementById('soundToggle')?.textContent.includes('مكتوم')===true;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const now=()=>performance.now();

  function muteOlderSfx(){
    for(const old of [window.__V1114_SFX_BUS,window.__V1110_SFX_BUS,window.__V119_SFX_BUS,window.__V118_SFX_BUS]){
      if(!old||old===bus)continue;
      try{old.gain.setTargetAtTime(0,getContext()?.currentTime||0,.02);}catch(_){try{old.gain.value=0;}catch(__){}}
    }
  }

  function ensureBus(){
    const ctx=getContext(),master=getMaster();
    if(!ctx||!master)return false;
    if(bus)return true;
    bus=ctx.createGain();bus.gain.value=.76;
    highpass=ctx.createBiquadFilter();highpass.type='highpass';highpass.frequency.value=52;highpass.Q.value=.25;
    lowpass=ctx.createBiquadFilter();lowpass.type='lowpass';lowpass.frequency.value=10800;lowpass.Q.value=.2;
    compressor=ctx.createDynamicsCompressor();
    compressor.threshold.value=-8;compressor.knee.value=18;compressor.ratio.value=1.45;compressor.attack.value=.007;compressor.release.value=.18;
    analyser=ctx.createAnalyser();analyser.fftSize=1024;
    bus.connect(highpass);highpass.connect(lowpass);lowpass.connect(compressor);compressor.connect(analyser);analyser.connect(master);
    window.__V1115_SFX_BUS=bus;window.__V1115_SFX_ANALYSER=analyser;
    muteOlderSfx();publish();return true;
  }

  async function decodeUrl(url){
    const ctx=getContext();if(!ctx)throw new Error('AudioContext unavailable');
    const r=await fetch(url,{mode:'cors',cache:'force-cache'});if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const bytes=await r.arrayBuffer();const buffer=await ctx.decodeAudioData(bytes.slice(0));
    if(!buffer||buffer.duration<=0)throw new Error('empty audio');return buffer;
  }

  async function loadRemote(path){
    const urls=[CDN+path,RAW+path];let lastErr=null;
    for(const url of urls){
      try{return {buffer:await decodeUrl(url),url,transport:url.startsWith(CDN)?'kenney-jsdelivr-cc0':'kenney-github-cc0'};}
      catch(err){lastErr=err;}
    }
    throw lastErr||new Error('remote sample failed');
  }

  async function loadLocal(key){
    const url=localFallback[key];
    try{return {buffer:await decodeUrl(url),url,transport:'same-origin-fallback'};}
    catch(err){localFailed++;publish();throw err;}
  }

  function preload(){
    if(preloadPromise)return preloadPromise;
    preloadPromise=(async()=>{
      if(!ensureBus())throw new Error('V11.15 SFX bus unavailable');
      for(const [key,paths] of Object.entries(variants)){
        banks[key]=[];
        const jobs=paths.map(path=>loadRemote(path).then(item=>{banks[key].push(item);remoteLoaded++;publish();}).catch(()=>{remoteFailed++;publish();}));
        await Promise.all(jobs);
        if(!banks[key].length){
          try{banks[key].push(await loadLocal(key));localLoaded++;publish();}catch(_){}
        }
      }
      bankReady=true;publish();return Object.values(banks).some(x=>x.length);
    })().catch(err=>{bankReady=true;console.error('V11.15 SFX preload failed',err);publish();return false;});
    return preloadPromise;
  }

  async function unlock(){
    try{await (window.__V119_AUDIO_START||window.__V118_AUDIO_START||window.__V117_AUDIO_START)?.();}catch(_){}
    const ctx=getContext();if(!ctx)return false;
    if(ctx.state!=='running'){try{await ctx.resume();}catch(_){}}
    if(ctx.state!=='running')return false;
    ensureBus();muteOlderSfx();
    if(!muteTimer)muteTimer=setInterval(muteOlderSfx,220);
    await preload();unlocked=true;publish();return true;
  }

  function pick(key){
    const list=banks[key];if(!list?.length)return null;
    let i=Math.floor(Math.random()*list.length);
    if(list.length>1&&i===lastVariant[key])i=(i+1)%list.length;
    lastVariant[key]=i;return {item:list[i],variant:i};
  }

  function allowed(name,gap){const t=now(),p=lastEventAt[name]||0;if(t-p<gap)return false;lastEventAt[name]=t;return true;}

  function playKey(key,volume=.5,rate=1,pan=0,eventName=key){
    if(isMuted())return false;
    const ctx=getContext();
    if(!ctx||ctx.state!=='running'||!ensureBus()){unlock().then(()=>playKey(key,volume,rate,pan,eventName));return true;}
    if(!bankReady){preload().then(()=>playKey(key,volume,rate,pan,eventName));return true;}
    const chosen=pick(key);if(!chosen)return false;
    playCalls++;
    try{
      const src=ctx.createBufferSource(),gain=ctx.createGain();
      src.buffer=chosen.item.buffer;src.playbackRate.value=rate;gain.gain.value=clamp(volume,0,.9);
      src.connect(gain);
      if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=clamp(pan,-1,1);gain.connect(p);p.connect(bus);}else gain.connect(bus);
      src.start();playResolved++;
      lastPlayed={event:eventName,key,variant:chosen.variant,transport:chosen.item.transport,url:chosen.item.url,rate,volume,pan,at:now()};
      publish();return true;
    }catch(err){lastPlayed={event:eventName,key,transport:'play-failed',error:String(err),at:now()};publish();return false;}
  }

  function step(kind='pavement'){
    const t=now();if(t-lastStepAt<165)return;lastStepAt=t;leftFoot=!leftFoot;events.step++;
    const asphalt=kind==='asphalt';
    playKey(asphalt?'step_asphalt':'step_pavement',asphalt?.50:.46,(leftFoot?.99:1.01)*(.988+Math.random()*.024),leftFoot?-.025:.025,'step');publish();
  }
  function interact(){if(!allowed('interact',115))return;events.interact++;playKey('interact',.34,.99+Math.random()*.018,0,'interact');publish();}
  function shopOpen(){if(!allowed('open',180))return;events.open++;playKey('interact',.26,.97+Math.random()*.015,0,'open');publish();}
  function close(){if(!allowed('close',180))return;events.close++;playKey('door',.46,.995+Math.random()*.018,0,'close');publish();}
  function buy(){if(!allowed('buy',190))return;events.buy++;playKey('buy',.56,.995+Math.random()*.015,0,'buy');publish();}
  function reward(){if(!allowed('reward',260))return;events.reward++;playKey('reward',.42,.995+Math.random()*.014,0,'reward');publish();}
  function door(){if(!allowed('door',210))return;events.door++;playKey('door',.49,.995+Math.random()*.015,0,'door');publish();}
  function deny(){if(!allowed('deny',220))return;events.deny++;playKey('deny',.31,1,0,'deny');publish();}
  function startCue(){if(!allowed('start',500))return;events.start++;playKey('interact',.20,1,0,'start');publish();}
  function uiTap(){if(!allowed('ui',85))return;events.ui++;playKey('interact',.22,1.015,0,'ui');publish();}
  function play(name){const map={step:()=>step('pavement'),asphalt:()=>step('asphalt'),interact,buy,reward,door,open:shopOpen,close,deny,start:startCue,ui:uiTap};if(!map[name])return false;map[name]();return true;}

  function hookUnlock(){const fire=()=>unlock();for(const id of ['newGameBtn','continueBtn']){const el=document.getElementById(id);if(!el)continue;el.addEventListener('pointerdown',fire,{capture:true});el.addEventListener('touchstart',fire,{capture:true,passive:true});}}
  function hookControls(){document.addEventListener('pointerdown',e=>{const t=e.target instanceof Element?e.target:null;if(!t)return;if(t.closest('#shopClose,#dialogClose'))close();else if(t.closest('#resetBtn'))uiTap();},true);}
  function hookModals(){for(const [id,fn] of [['shop',shopOpen],['dialog',interact]]){const el=document.getElementById(id);if(!el)continue;let visible=getComputedStyle(el).display!=='none';new MutationObserver(()=>{const shown=getComputedStyle(el).display!=='none';if(shown&&!visible)fn();visible=shown;}).observe(el,{attributes:true,attributeFilter:['style','class']});}}
  function hookToast(){const toast=document.getElementById('toast');if(!toast)return;new MutationObserver(()=>{const text=(toast.textContent||'').trim(),t=now();if(!text||(text===lastToast&&t-lastToastAt<700))return;lastToast=text;lastToastAt=t;if(text.startsWith('اشتريت '))buy();else if(text.includes('خلصت طلبية')&&text.includes('كسبت'))reward();else if(text.includes('رجعت بيت العيلة'))door();else if(text.includes('الفلوس مش مكفية'))deny();else if(text.includes('لفّيت في سوق الحارة'))interact();}).observe(toast,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});}
  function hookFootsteps(){stepTimer=setInterval(()=>{const ctx=getContext();if(ctx?.state!=='running'||!document.body.classList.contains('game-started')){lastCam=null;stepTravel=0;return;}const cam=window.__egyptDebug?.getCamera?.();if(!cam)return;if(lastCam){const delta=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);if(delta<2.5){stepTravel+=delta;if(stepTravel>.76){const road=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));step(road<4.8?'asphalt':'pavement');stepTravel=stepTravel%.76;}}else stepTravel=0;}lastCam={x:cam.x,z:cam.z};},70);}

  function state(){return {version:VERSION,engine:'kenney-cc0-multivariant-sfx',installed:true,actualSamples:true,primary:'jsdelivr-pinned-kenney-cc0',rawFallback:true,localEmergencyFallback:true,sourceCommit:SOURCE_COMMIT,bankReady,unlocked,remoteTotal:Object.values(variants).reduce((n,a)=>n+a.length,0),remoteLoaded,remoteFailed,localLoaded,localFailed,playCalls,playResolved,lastPlayed:lastPlayed?{...lastPlayed}:null,variations:Object.fromEntries(Object.entries(banks).map(([k,v])=>[k,v.length])),eventCount:Object.values(events).reduce((a,b)=>a+b,0),events:{...events},busGain:bus?.gain?.value??null,olderSfxMuted:[window.__V1114_SFX_BUS,window.__V1110_SFX_BUS,window.__V119_SFX_BUS,window.__V118_SFX_BUS].filter(Boolean).every(x=>(x.gain?.value??0)<.02)};}
  function publish(){window.__V1115_SFX=state();}

  hookUnlock();hookControls();hookModals();hookToast();hookFootsteps();publish();
  window.__V1115_SFX_API={play,unlock,state,playKey,preload,ensureBus,variants,localFallback};
  window.addEventListener('beforeunload',()=>{if(stepTimer)clearInterval(stepTimer);if(muteTimer)clearInterval(muteTimer);},{once:true});
})();