(() => {
  'use strict';

  const VERSION='11.12';
  const SOURCE_COMMIT='45df48c4d45f8716216b1a9e22df0b69cd9f5932';
  const RAW=`https://raw.githubusercontent.com/ETdoFresh/kenney.nl/${SOURCE_COMMIT}/`;
  const RPG=RAW+'kenney_rpgaudio/Audio/';
  const UI=RAW+'kenney_interfacesounds/Audio/';
  const sources={
    step_pavement:[RPG+'footstep04.ogg',RPG+'footstep05.ogg',RPG+'footstep06.ogg',RPG+'footstep07.ogg'],
    step_asphalt:[RPG+'footstep00.ogg',RPG+'footstep01.ogg',RPG+'footstep02.ogg',RPG+'footstep03.ogg'],
    interact:[UI+'click_001.ogg',UI+'click_003.ogg'],
    buy:[RPG+'handleCoins.ogg',RPG+'handleCoins2.ogg'],
    door:[RPG+'doorClose_1.ogg',RPG+'doorClose_3.ogg'],
    reward:[UI+'confirmation_001.ogg',UI+'confirmation_003.ogg'],
    deny:[UI+'error_001.ogg']
  };
  const localSources={
    step_pavement:['audio/v11-8/step_pavement.wav'],
    step_asphalt:['audio/v11-8/step_asphalt.wav'],
    interact:['audio/v11-8/interact.wav'],
    buy:['audio/v11-8/buy_coin.wav'],
    door:['audio/v11-8/door.wav'],
    reward:['audio/v11-8/reward.wav'],
    deny:['audio/v11-8/interact.wav']
  };

  const banks={},localBanks={},lastVariant={},localLastVariant={},events={step:0,interact:0,buy:0,reward:0,door:0,open:0,close:0,deny:0,start:0,ui:0};
  let bus=null,low=null,high=null,compressor=null,analyser=null,preloadPromise=null,localPreloadPromise=null,bankReady=false,localReady=false,unlocked=false;
  let sampleLoaded=0,sampleFailed=0,localLoaded=0,localFailed=0,playCalls=0,playResolved=0,playRejected=0,lastPlayed=null;
  let stepTimer=null,lastCam=null,stepTravel=0,leftFoot=false,lastToast='',lastToastAt=0,proceduralMuteTimer=null;

  const getContext=()=>window.__V119_CONTEXT||window.__V118_CONTEXT||window.__V117_CONTEXT||window.__V116_CONTEXT||null;
  const getMaster=()=>window.__V119_MASTER||window.__V118_MASTER||window.__V117_MASTER||window.__V116_MASTER||null;
  const isMuted=()=>document.getElementById('soundToggle')?.textContent.includes('مكتوم')===true;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const totalSamples=Object.values(sources).reduce((n,list)=>n+list.length,0);
  const totalLocalSamples=Object.values(localSources).reduce((n,list)=>n+list.length,0);

  function muteProceduralBus(){
    const old=window.__V119_SFX_BUS||window.__V118_SFX_BUS;
    if(old&&old!==bus){try{old.gain.setTargetAtTime(0,getContext()?.currentTime||0,.01);}catch(_){try{old.gain.value=0;}catch(__){}}}
  }

  function ensureBus(){
    const ctx=getContext(),master=getMaster();if(!ctx||!master)return false;if(bus)return true;
    bus=ctx.createGain();bus.gain.value=1;
    low=ctx.createBiquadFilter();low.type='highpass';low.frequency.value=38;low.Q.value=.25;
    high=ctx.createBiquadFilter();high.type='lowpass';high.frequency.value=14000;high.Q.value=.15;
    compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-19;compressor.knee.value=10;compressor.ratio.value=2;compressor.attack.value=.002;compressor.release.value=.10;
    analyser=ctx.createAnalyser();analyser.fftSize=512;
    bus.connect(low);low.connect(high);high.connect(compressor);compressor.connect(analyser);analyser.connect(master);
    window.__V1112_SFX_BUS=bus;window.__V1112_SFX_ANALYSER=analyser;window.__V1110_SFX_BUS=bus;window.__V1110_SFX_ANALYSER=analyser;
    muteProceduralBus();publish();return true;
  }

  async function loadSample(url,local=false){
    const ctx=getContext();if(!ctx)throw new Error('AudioContext unavailable');
    const response=await fetch(url,{mode:local?'same-origin':'cors',cache:local?'no-cache':'force-cache'});if(!response.ok)throw new Error(`HTTP ${response.status} ${url}`);
    const bytes=await response.arrayBuffer();const buffer=await ctx.decodeAudioData(bytes.slice(0));
    if(!buffer||buffer.duration<=0)throw new Error('Decoded empty audio '+url);return buffer;
  }

  function preloadLocal(){
    if(localPreloadPromise)return localPreloadPromise;
    localPreloadPromise=(async()=>{
      if(!ensureBus())throw new Error('SFX bus unavailable');
      const jobs=[];
      for(const [key,urls] of Object.entries(localSources)){
        localBanks[key]=[];
        for(const url of urls)jobs.push(loadSample(url,true).then(buffer=>{localBanks[key].push({buffer,url});localLoaded++;publish();}).catch(err=>{localFailed++;console.warn('V11.12 local sample failed',url,err);publish();}));
      }
      await Promise.all(jobs);localReady=true;publish();return localLoaded>0;
    })().catch(err=>{console.error('V11.12 local preload failed',err);localReady=true;publish();return false;});
    return localPreloadPromise;
  }

  function preloadBank(){
    if(preloadPromise)return preloadPromise;
    preloadPromise=(async()=>{
      if(!ensureBus())throw new Error('SFX bus unavailable');
      const jobs=[];
      for(const [key,urls] of Object.entries(sources)){
        banks[key]=[];
        for(const url of urls)jobs.push(loadSample(url,false).then(buffer=>{banks[key].push({buffer,url});sampleLoaded++;publish();}).catch(err=>{sampleFailed++;console.warn('V11.12 remote sample failed',url,err);publish();}));
      }
      await Promise.all(jobs);bankReady=true;publish();return sampleLoaded>0;
    })().catch(err=>{console.error('V11.12 remote preload failed',err);bankReady=true;publish();return false;});
    return preloadPromise;
  }

  async function unlock(){
    try{await (window.__V119_AUDIO_START||window.__V118_AUDIO_START||window.__V117_AUDIO_START)?.();}catch(_){}
    const ctx=getContext();if(!ctx)return false;if(ctx.state!=='running'){try{await ctx.resume();}catch(_){}}
    if(ctx.state!=='running')return false;
    try{await window.__V119_SFX_API?.unlock?.();}catch(_){}
    ensureBus();muteProceduralBus();
    if(!proceduralMuteTimer)proceduralMuteTimer=setInterval(muteProceduralBus,300);
    await preloadLocal();
    preloadBank();
    unlocked=true;publish();return localLoaded>0||sampleLoaded>0;
  }

  function pickFrom(bank,last,key){
    const list=bank[key];if(!list?.length)return null;let i=Math.floor(Math.random()*list.length);
    if(list.length>1&&i===last[key])i=(i+1)%list.length;last[key]=i;return {item:list[i],variant:i};
  }

  function fallback(name){
    const old=window.__V119_SFX_API||window.__V118_SFX_API,oldBus=window.__V119_SFX_BUS||window.__V118_SFX_BUS,ctx=getContext();
    if(!old?.play||!oldBus||!ctx)return false;
    try{oldBus.gain.setValueAtTime(.82,ctx.currentTime);old.play(name);setTimeout(muteProceduralBus,360);return true;}catch(_){muteProceduralBus();return false;}
  }

  function playChosen(chosen,key,volume,rate,pan,transport){
    const ctx=getContext();playCalls++;
    try{
      const src=ctx.createBufferSource(),gain=ctx.createGain();src.buffer=chosen.item.buffer;src.playbackRate.value=rate;gain.gain.value=clamp(volume,0,1);
      src.connect(gain);
      if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=clamp(pan,-1,1);gain.connect(p);p.connect(bus);}else gain.connect(bus);
      src.start();playResolved++;lastPlayed={key,variant:chosen.variant,transport,url:chosen.item.url,rate,volume,pan,at:performance.now()};publish();return true;
    }catch(err){playRejected++;lastPlayed={key,transport:'procedural-fallback',error:String(err),at:performance.now()};publish();return false;}
  }

  function playKey(key,volume=.85,rate=1,pan=0,fallbackName=key){
    if(isMuted())return false;const ctx=getContext();
    if(!ctx||ctx.state!=='running'||!ensureBus()){unlock().then(()=>playKey(key,volume,rate,pan,fallbackName));return true;}
    const remote=pickFrom(banks,lastVariant,key);
    if(remote)return playChosen(remote,key,volume,rate,pan,'actual-sample');
    const local=pickFrom(localBanks,localLastVariant,key);
    if(local)return playChosen(local,key,Math.min(1,volume*1.08),rate,pan,'same-origin-local-sample');
    if(!localReady){preloadLocal().then(()=>playKey(key,volume,rate,pan,fallbackName));preloadBank();return true;}
    preloadBank();lastPlayed={key,transport:'procedural-fallback',at:performance.now()};publish();return fallback(fallbackName);
  }

  function step(kind='pavement'){leftFoot=!leftFoot;events.step++;const key=kind==='asphalt'?'step_asphalt':'step_pavement';playKey(key,kind==='asphalt'?.98:.94,(leftFoot?.985:1.015)*(0.985+Math.random()*.025),leftFoot?-.05:.05,kind==='asphalt'?'asphalt':'step');publish();}
  function interact(){events.interact++;playKey('interact',.96,.98+Math.random()*.025,0,'interact');publish();}
  function shopOpen(){events.open++;playKey('interact',.82,.94+Math.random()*.02,0,'open');publish();}
  function close(){events.close++;playKey('door',.98,1.02+Math.random()*.025,0,'close');publish();}
  function buy(){events.buy++;playKey('buy',1,.98+Math.random()*.02,0,'buy');publish();}
  function reward(){events.reward++;playKey('reward',.94,.99+Math.random()*.018,0,'reward');publish();}
  function door(){events.door++;playKey('door',1,.99+Math.random()*.02,0,'door');publish();}
  function deny(){events.deny++;playKey('deny',.86,.99,0,'deny');publish();}
  function startCue(){events.start++;playKey('interact',.72,.94,0,'start');publish();}
  function uiTap(){events.ui++;playKey('interact',.68,1.04,0,'ui');publish();}
  function play(name){const map={step:()=>step('pavement'),asphalt:()=>step('asphalt'),interact,buy,reward,door,open:shopOpen,close,deny,start:startCue,ui:uiTap};if(!map[name])return false;map[name]();return true;}

  function hookUnlock(){const fire=()=>unlock();for(const id of ['newGameBtn','continueBtn']){const el=document.getElementById(id);if(!el)continue;el.addEventListener('pointerdown',fire,{capture:true});el.addEventListener('touchstart',fire,{capture:true,passive:true});}}
  function hookControls(){document.addEventListener('pointerdown',e=>{const t=e.target instanceof Element?e.target:null;if(!t)return;if(t.closest('#shopClose,#dialogClose'))close();else if(t.closest('#resetBtn'))uiTap();},true);}
  function hookModals(){for(const [id,fn] of [['shop',shopOpen],['dialog',interact]]){const el=document.getElementById(id);if(!el)continue;let visible=getComputedStyle(el).display!=='none';new MutationObserver(()=>{const now=getComputedStyle(el).display!=='none';if(now&&!visible)fn();visible=now;}).observe(el,{attributes:true,attributeFilter:['style','class']});}}
  function hookToast(){const toast=document.getElementById('toast');if(!toast)return;new MutationObserver(()=>{const text=(toast.textContent||'').trim(),now=performance.now();if(!text||(text===lastToast&&now-lastToastAt<650))return;lastToast=text;lastToastAt=now;if(text.startsWith('اشتريت '))buy();else if(text.includes('خلصت طلبية')&&text.includes('كسبت'))reward();else if(text.includes('رجعت بيت العيلة'))door();else if(text.includes('الفلوس مش مكفية'))deny();else if(text.includes('لفّيت في سوق الحارة'))interact();}).observe(toast,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});}
  function hookFootsteps(){stepTimer=setInterval(()=>{const ctx=getContext();if(ctx?.state!=='running'||!document.body.classList.contains('game-started')){lastCam=null;stepTravel=0;return;}const cam=window.__egyptDebug?.getCamera?.();if(!cam)return;if(lastCam){const delta=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);if(delta<2.5){stepTravel+=delta;while(stepTravel>.68){const road=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));step(road<4.8?'asphalt':'pavement');stepTravel-=.68;}}else stepTravel=0;}lastCam={x:cam.x,z:cam.z};},80);}

  function metricsFor(bank){const out={};for(const [key,list] of Object.entries(bank))out[key]=list.map(({buffer,url})=>{let sum=0,peak=0,n=0;for(let c=0;c<buffer.numberOfChannels;c++){const d=buffer.getChannelData(c);n+=d.length;for(const v of d){sum+=v*v;peak=Math.max(peak,Math.abs(v));}}return {url,duration:buffer.duration,rms:Math.sqrt(sum/Math.max(1,n)),peak};});return out;}
  function bufferMetrics(){return metricsFor(banks);}
  function localBufferMetrics(){return metricsFor(localBanks);}
  function state(){
    const activeTransport=sampleLoaded>0?'actual-sample':localLoaded>0?'same-origin-local-sample':'procedural-fallback';
    return {version:VERSION,engine:'mobile-hardened-actual-sfx',installed:true,actualSamples:true,remoteSamplePrimary:true,sameOriginFallback:true,localWavFallback:true,proceduralFallback:true,source:'Kenney CC0 via ETdoFresh/kenney.nl mirror',sourceCommit:SOURCE_COMMIT,bankReady,localReady,unlocked,sampleTotal:totalSamples,sampleLoaded,sampleFailed,localSampleTotal:totalLocalSamples,localLoaded,localFailed,activeTransport,playCalls,playResolved,playRejected,lastPlayed:lastPlayed?{...lastPlayed}:null,eventCount:Object.values(events).reduce((a,b)=>a+b,0),events:{...events},variations:Object.fromEntries(Object.entries(banks).map(([k,v])=>[k,v.length])),localVariations:Object.fromEntries(Object.entries(localBanks).map(([k,v])=>[k,v.length])),qualityBus:!!bus,proceduralBusMuted:(window.__V119_SFX_BUS?.gain?.value??0)<.01};
  }
  function publish(){window.__V1112_SFX=state();window.__V1110_SFX=window.__V1112_SFX;}

  hookUnlock();hookControls();hookModals();hookToast();hookFootsteps();publish();
  window.__V1112_SFX_API={play,unlock,state,playKey,preloadBank,preloadLocal,ensureBus,bufferMetrics,localBufferMetrics,sources,localSources};
  window.__V1110_SFX_API=window.__V1112_SFX_API;
  window.addEventListener('beforeunload',()=>{if(stepTimer)clearInterval(stepTimer);if(proceduralMuteTimer)clearInterval(proceduralMuteTimer);},{once:true});
})();