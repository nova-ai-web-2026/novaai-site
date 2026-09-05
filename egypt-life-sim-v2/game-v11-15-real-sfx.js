(() => {
  'use strict';
  // Old entry wrappers can request this file a second time.
  if (window.__V1116_SFX_API) return;

  const VERSION='11.16', REVISION='11.16.2';
  const localFiles={
    step_pavement:'audio/v11-8/step_pavement.wav?v=11.16.2',
    step_asphalt:'audio/v11-8/step_asphalt.wav?v=11.16.2',
    interact:'audio/v11-8/interact.wav?v=11.16.2',
    buy:'audio/v11-8/buy_coin.wav?v=11.16.2',
    door:'audio/v11-8/door.wav?v=11.16.2',
    reward:'audio/v11-8/reward.wav?v=11.16.2',
    deny:'audio/v11-8/deny.wav?v=11.16.2'
  };
  const events={step:0,interact:0,buy:0,reward:0,door:0,open:0,close:0,deny:0,start:0,ui:0};
  const pools={},lastEventAt={};
  let preloadPromise=null,localReady=false,unlocked=false,localLoaded=0,localFailed=0;
  let playCalls=0,playResolved=0,playRejected=0,lastPlayed=null,lastVoice=null;
  let lastCam=null,stepTravel=0,leftFoot=false,lastStepAt=-Infinity,lastPrimeAt=-Infinity;
  let muteTimer=null,muteObserver=null,muted=false;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const now=()=>performance.now();
  const voices=()=>Object.values(pools).flat();
  const isMuted=()=>document.getElementById('soundToggle')?.textContent.includes('مكتوم')===true;
  const gameActive=()=>document.body.classList.contains('game-started')&&!document.hidden
    &&!document.getElementById('v12Prologue')?.classList.contains('active');

  function muteOlderSfx(){
    const ctx=window.__V119_CONTEXT||window.__V118_CONTEXT;
    for(const old of [window.__V119_GAME_MASTER,window.__V1114_SFX_BUS,window.__V1110_SFX_BUS,window.__V119_SFX_BUS,window.__V118_SFX_BUS]){
      if(!old)continue;
      try{old.gain.setTargetAtTime(0,ctx?.currentTime||0,.02);}catch(_){try{old.gain.value=0;}catch(__){}}
    }
  }
  function stopAll(){
    for(const voice of voices()){
      voice._egyptPlayId++;voice._egyptPriming=false;voice.pause();
      try{voice.currentTime=0;}catch(_){}
    }
    lastCam=null;stepTravel=0;publish();
  }
  function syncMute(){
    const next=isMuted();if(next===muted)return;muted=next;
    if(muted)stopAll();
    for(const voice of voices())voice.muted=muted||voice._egyptPriming;
    muteOlderSfx();
    publish();
  }
  function makeVoice(url,key,index){
    const voice=new Audio();
    voice.preload='auto';voice.setAttribute('playsinline','');
    voice.dataset.v1116Sfx=key;voice.dataset.v1116Voice=String(index);
    voice.volume=.75;voice._egyptPlayId=0;voice._egyptPriming=false;voice.src=url;
    return voice;
  }
  function preloadLocal(){
    if(preloadPromise)return preloadPromise;
    // Readiness means decoded media, not just a successful HTTP request.
    preloadPromise=Promise.all(Object.keys(localFiles).map(key=>new Promise(resolve=>{
      const voice=pools[key][0];let finished=false;
      const done=ok=>{
        if(finished)return;finished=true;clearTimeout(timeout);
        voice.removeEventListener('loadeddata',loaded);voice.removeEventListener('error',failed);
        if(ok)localLoaded++;else localFailed++;
        publish();resolve(ok);
      };
      const loaded=()=>done(true),failed=()=>done(false);
      const timeout=setTimeout(failed,12000);
      voice.addEventListener('loadeddata',loaded,{once:true});
      voice.addEventListener('error',failed,{once:true});
      if(voice.readyState>=2)done(true);else if(voice.error)done(false);else voice.load();
    }))).then(results=>{localReady=results.every(Boolean);publish();return localReady;});
    return preloadPromise;
  }
  function chooseVoice(key){
    const list=pools[key];if(!list)return null;
    return list.find(voice=>voice.paused||voice.ended)||list[0];
  }
  function directPlay(key,volume=.75,rate=1,eventName=key){
    if(isMuted()||document.hidden)return false;
    const voice=chooseVoice(key);if(!voice)return false;
    const playbackId=++voice._egyptPlayId;voice._egyptPriming=false;
    playCalls++;lastVoice=voice;
    const record={event:eventName,key,transport:'html-audio-same-origin',url:localFiles[key],rate,volume,at:now(),voice:+voice.dataset.v1116Voice};
    lastPlayed=record;
    try{
      voice.pause();voice.currentTime=0;voice.muted=false;
      voice.volume=clamp(volume,0,1);voice.playbackRate=clamp(rate,.8,1.2);
      const result=voice.play();
      Promise.resolve(result).then(()=>{playResolved++;unlocked=true;publish();}).catch(err=>{
        // Muting or reusing a voice legitimately aborts its earlier play promise.
        if(voice._egyptPlayId!==playbackId)return;
        playRejected++;record.error=String(err);publish();
      });
      publish();return true;
    }catch(err){playRejected++;record.error=String(err);publish();return false;}
  }
  function primeMedia(){
    const t=now();if(t-lastPrimeAt<300)return unlocked;lastPrimeAt=t;
    muteOlderSfx();if(!muteTimer)muteTimer=setInterval(muteOlderSfx,350);
    // Prime every pooled element inside the gesture for mobile autoplay rules.
    for(const voice of voices()){
      if(!voice.paused)continue;
      const playbackId=++voice._egyptPlayId;voice._egyptPriming=true;voice.muted=true;
      try{Promise.resolve(voice.play()).then(()=>{
        if(voice._egyptPlayId!==playbackId)return;
        voice._egyptPriming=false;voice.pause();voice.currentTime=0;voice.muted=isMuted();unlocked=true;publish();
      }).catch(()=>{});}catch(_){}
    }
    preloadLocal();return unlocked;
  }
  async function unlock(){primeMedia();await preloadLocal();return unlocked;}
  function play(name){
    const spec={interact:['interact',.72],buy:['buy',.82],reward:['reward',.78],door:['door',.75],
      open:['interact',.60],deny:['deny',.60],start:['interact',.60],ui:['interact',.55]};
    if(name==='step'||name==='asphalt')return step(name==='asphalt'?'asphalt':'pavement');
    if(!spec[name])return false;
    const t=now();if(t-(lastEventAt[name]??-Infinity)<80)return false;
    lastEventAt[name]=t;events[name]++;
    return directPlay(spec[name][0],spec[name][1],1,name);
  }
  function step(kind){
    const t=now();if(t-lastStepAt<170)return false;
    lastStepAt=t;leftFoot=!leftFoot;events.step++;
    return directPlay(kind==='asphalt'?'step_asphalt':'step_pavement',.67,leftFoot?.985:1.015,'step');
  }
  function probe(key){
    const map={step:'step_pavement',asphalt:'step_asphalt'};
    return directPlay(map[key]||key,.75,1,'probe-'+key);
  }
  function footsteps(){
    const modal=['shop','dialog'].some(id=>{
      const el=document.getElementById(id);return el&&getComputedStyle(el).display!=='none';
    });
    if(!gameActive()||modal){lastCam=null;stepTravel=0;return;}
    let cam;try{cam=window.__egyptDebug?.getCamera?.();}catch(_){lastCam=null;stepTravel=0;return;}
    if(!cam||!Number.isFinite(cam.x)||!Number.isFinite(cam.z))return;
    if(lastCam){
      const delta=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);
      if(delta<2.5){
        stepTravel+=delta;
        if(stepTravel>=1.8){
          const road=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));
          step(road<4.8?'asphalt':'pavement');stepTravel%=1.8;
        }
      }else stepTravel=0;
    }
    lastCam={x:cam.x,z:cam.z};
  }
  function mediaSnapshot(){
    return {lastTime:lastVoice?.currentTime||0,lastDuration:Number.isFinite(lastVoice?.duration)?lastVoice.duration:0,
      lastPaused:lastVoice?.paused??true,lastReadyState:lastVoice?.readyState??0,lastError:lastVoice?.error?.message||null,
      voices:voices().length,playing:voices().filter(voice=>!voice.paused&&!voice.ended&&!voice.muted).length};
  }
  function state(){
    return {version:VERSION,revision:REVISION,engine:'direct-same-origin-html-audio',installed:true,actualSamples:true,
      primary:'html-audio-same-origin',networkIndependent:true,webAudioBypassedForSfx:true,gameplayEvents:true,
      localReady,unlocked,localTotal:Object.keys(localFiles).length,localLoaded,localFailed,muted:isMuted(),
      playCalls,playResolved,playRejected,lastPlayed:lastPlayed?{...lastPlayed}:null,media:mediaSnapshot(),
      events:{...events},eventCount:Object.values(events).reduce((a,b)=>a+b,0),olderSfxMuted:true};
  }
  function publish(){window.__V1116_SFX=state();window.__V1115_SFX=window.__V1116_SFX;}

  for(const [key,url] of Object.entries(localFiles))pools[key]=[0,1,2].map(i=>makeVoice(url,key,i));
  window.__V1116_SFX_API={play,probe,unlock,state,preload:preloadLocal,localFiles,mediaSnapshot,primeMedia};
  window.__V1115_SFX_API=window.__V1116_SFX_API;
  const gesture=window.PointerEvent?'pointerdown':'touchstart';
  for(const id of ['newGameBtn','continueBtn','soundToggle']){
    const el=document.getElementById(id);if(!el)continue;
    el.addEventListener(gesture,primeMedia,{capture:true,passive:true});
    el.addEventListener('click',()=>{if(now()-lastPrimeAt>=300)primeMedia();},{capture:true});
  }
  window.addEventListener('egypt-sfx',event=>{if(gameActive())play(event.detail?.name);});
  const toggle=document.getElementById('soundToggle');
  if(toggle){muteObserver=new MutationObserver(syncMute);muteObserver.observe(toggle,{childList:true,subtree:true,characterData:true});}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAll();});
  window.addEventListener('pagehide',stopAll);
  const stepTimer=setInterval(footsteps,65);
  window.addEventListener('beforeunload',()=>{clearInterval(stepTimer);clearInterval(muteTimer);muteObserver?.disconnect();stopAll();},{once:true});
  syncMute();preloadLocal();publish();
})();
