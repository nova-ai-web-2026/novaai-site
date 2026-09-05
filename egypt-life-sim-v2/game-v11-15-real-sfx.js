(() => {
  'use strict';

  const VERSION='11.16';
  const localFiles={
    step_pavement:'audio/v11-8/step_pavement.wav',
    step_asphalt:'audio/v11-8/step_asphalt.wav',
    interact:'audio/v11-8/interact.wav',
    buy:'audio/v11-8/buy_coin.wav',
    door:'audio/v11-8/door.wav',
    reward:'audio/v11-8/reward.wav',
    deny:'audio/v11-8/interact.wav'
  };
  const events={step:0,interact:0,buy:0,reward:0,door:0,open:0,close:0,deny:0,start:0,ui:0};
  const lastEventAt={},pools={},poolCursor={};
  let preloadPromise=null,localReady=false,unlocked=false,localLoaded=0,localFailed=0;
  let playCalls=0,playResolved=0,playRejected=0,lastPlayed=null,lastVoice=null;
  let stepTimer=null,lastCam=null,stepTravel=0,leftFoot=false,lastStepAt=0,lastToast='',lastToastAt=0,muteTimer=null;

  const isMuted=()=>document.getElementById('soundToggle')?.textContent.includes('مكتوم')===true;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const now=()=>performance.now();

  function muteOlderSfx(){
    const ctx=window.__V119_CONTEXT||window.__V118_CONTEXT||window.__V117_CONTEXT||window.__V116_CONTEXT;
    for(const old of [window.__V1114_SFX_BUS,window.__V1110_SFX_BUS,window.__V119_SFX_BUS,window.__V118_SFX_BUS]){
      if(!old)continue;
      try{old.gain.setTargetAtTime(0,ctx?.currentTime||0,.02);}catch(_){try{old.gain.value=0;}catch(__){}}
    }
  }

  function makeVoice(url,key,index){
    const a=new Audio();a.src=url;a.preload='auto';a.setAttribute('playsinline','');a.dataset.v1116Sfx=key;a.dataset.v1116Voice=String(index);a.volume=.75;
    a.addEventListener('error',()=>{publish();});
    try{a.load();}catch(_){}
    return a;
  }
  function buildPools(){
    if(Object.keys(pools).length)return;
    for(const [key,url] of Object.entries(localFiles))pools[key]=[0,1,2].map(i=>makeVoice(url,key,i));
    publish();
  }

  function preloadLocal(){
    if(preloadPromise)return preloadPromise;buildPools();
    preloadPromise=Promise.all(Object.entries(localFiles).map(async([key,url])=>{
      try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`${url} HTTP ${r.status}`);const bytes=await r.arrayBuffer();if(bytes.byteLength<200)throw new Error(`${url} too small`);localLoaded++;return true;}
      catch(err){localFailed++;console.warn('V11.16 SFX preload failed',key,String(err));return false;}
      finally{publish();}
    })).then(()=>{localReady=localLoaded>0;publish();return localReady;});
    return preloadPromise;
  }

  function chooseVoice(key){
    const list=pools[key];if(!list?.length)return null;
    const free=list.find(a=>a.paused||a.ended);if(free)return free;
    const i=poolCursor[key]||0;poolCursor[key]=(i+1)%list.length;return list[i];
  }

  function directPlay(key,volume=.8,rate=1,eventName=key){
    if(isMuted())return false;buildPools();const voice=chooseVoice(key);if(!voice)return false;
    playCalls++;lastVoice=voice;
    try{
      voice.pause();voice.currentTime=0;voice.volume=clamp(volume,0,1);voice.playbackRate=clamp(rate,.75,1.3);
      const p=voice.play();
      lastPlayed={event:eventName,key,transport:'html-audio-same-origin',url:localFiles[key],rate:voice.playbackRate,volume:voice.volume,at:now(),voice:+voice.dataset.v1116Voice};publish();
      if(p&&typeof p.then==='function')p.then(()=>{playResolved++;unlocked=true;publish();}).catch(err=>{playRejected++;lastPlayed={...lastPlayed,error:String(err)};publish();});
      else{playResolved++;unlocked=true;publish();}
      return true;
    }catch(err){playRejected++;lastPlayed={event:eventName,key,transport:'html-audio-failed',error:String(err),at:now()};publish();return false;}
  }

  // Called synchronously from pointer/touch user activation. No await before play().
  function primeMedia(){
    buildPools();muteOlderSfx();if(!muteTimer)muteTimer=setInterval(muteOlderSfx,350);
    try{(window.__V119_AUDIO_START||window.__V118_AUDIO_START||window.__V117_AUDIO_START)?.();}catch(_){}
    preloadLocal();
    if(!isMuted())directPlay('interact',.72,.96,'start');
    unlocked=true;publish();return true;
  }
  async function unlock(){primeMedia();await preloadLocal();return unlocked;}

  function allowed(name,gap){const t=now(),p=lastEventAt[name]||0;if(t-p<gap)return false;lastEventAt[name]=t;return true;}
  function step(kind='pavement'){
    const t=now();if(t-lastStepAt<135)return;lastStepAt=t;leftFoot=!leftFoot;events.step++;
    const asphalt=kind==='asphalt';directPlay(asphalt?'step_asphalt':'step_pavement',asphalt?.88:.84,leftFoot?.985:1.015,'step');publish();
  }
  function interact(){if(!allowed('interact',90))return;events.interact++;directPlay('interact',.90,1,'interact');publish();}
  function shopOpen(){if(!allowed('open',140))return;events.open++;directPlay('interact',.72,.96,'open');publish();}
  function close(){if(!allowed('close',150))return;events.close++;directPlay('door',.94,1,'close');publish();}
  function buy(){if(!allowed('buy',150))return;events.buy++;directPlay('buy',1,1,'buy');publish();}
  function reward(){if(!allowed('reward',200))return;events.reward++;directPlay('reward',.94,1,'reward');publish();}
  function door(){if(!allowed('door',160))return;events.door++;directPlay('door',.98,1,'door');publish();}
  function deny(){if(!allowed('deny',160))return;events.deny++;directPlay('deny',.78,.92,'deny');publish();}
  function startCue(){events.start++;directPlay('interact',.72,.96,'start');publish();}
  function uiTap(){if(!allowed('ui',70))return;events.ui++;directPlay('interact',.64,1.04,'ui');publish();}
  function play(name){const map={step:()=>step('pavement'),asphalt:()=>step('asphalt'),interact,buy,reward,door,open:shopOpen,close,deny,start:startCue,ui:uiTap};if(!map[name])return false;map[name]();return true;}
  function probe(key){const map={step:'step_pavement',asphalt:'step_asphalt',interact:'interact',buy:'buy',door:'door',reward:'reward',deny:'deny'};const k=map[key]||key;return directPlay(k,.92,1,'probe-'+key);}

  function hookUnlock(){for(const id of ['newGameBtn','continueBtn']){const el=document.getElementById(id);if(!el)continue;el.addEventListener('pointerdown',primeMedia,{capture:true});el.addEventListener('touchstart',primeMedia,{capture:true,passive:true});}}
  function hookControls(){
    document.addEventListener('pointerdown',e=>{const t=e.target instanceof Element?e.target:null;if(!t)return;if(t.closest('#shopClose,#dialogClose'))close();else if(t.closest('#resetBtn'))uiTap();},true);
    document.addEventListener('keydown',e=>{if(e.code==='KeyE')interact();},true);document.getElementById('act')?.addEventListener('pointerdown',interact,{capture:true});
  }
  function hookModals(){for(const [id,fn] of [['shop',shopOpen],['dialog',interact]]){const el=document.getElementById(id);if(!el)continue;let visible=getComputedStyle(el).display!=='none';new MutationObserver(()=>{const shown=getComputedStyle(el).display!=='none';if(shown&&!visible)fn();visible=shown;}).observe(el,{attributes:true,attributeFilter:['style','class']});}}
  function hookToast(){const toast=document.getElementById('toast');if(!toast)return;new MutationObserver(()=>{const text=(toast.textContent||'').trim(),t=now();if(!text||(text===lastToast&&t-lastToastAt<600))return;lastToast=text;lastToastAt=t;if(text.startsWith('اشتريت '))buy();else if(text.includes('خلصت طلبية')&&text.includes('كسبت'))reward();else if(text.includes('رجعت بيت العيلة'))door();else if(text.includes('الفلوس مش مكفية'))deny();else if(text.includes('لفّيت في سوق الحارة'))interact();}).observe(toast,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});}
  function hookFootsteps(){stepTimer=setInterval(()=>{if(!document.body.classList.contains('game-started')){lastCam=null;stepTravel=0;return;}const cam=window.__egyptDebug?.getCamera?.();if(!cam)return;if(lastCam){const delta=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);if(delta<2.5){stepTravel+=delta;while(stepTravel>.68){const road=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));step(road<4.8?'asphalt':'pavement');stepTravel-=.68;}}else stepTravel=0;}lastCam={x:cam.x,z:cam.z};},65);}

  function mediaSnapshot(){return {lastTime:lastVoice?.currentTime||0,lastDuration:Number.isFinite(lastVoice?.duration)?lastVoice.duration:0,lastPaused:lastVoice?.paused??true,lastReadyState:lastVoice?.readyState??0,lastNetworkState:lastVoice?.networkState??0,lastError:lastVoice?.error?.message||null,voices:Object.values(pools).flat().length};}
  function state(){return {version:VERSION,engine:'direct-same-origin-html-audio',installed:true,actualSamples:true,primary:'html-audio-same-origin',networkIndependent:true,webAudioBypassedForSfx:true,localReady,unlocked,localTotal:Object.keys(localFiles).length,localLoaded,localFailed,playCalls,playResolved,playRejected,lastPlayed:lastPlayed?{...lastPlayed}:null,media:mediaSnapshot(),events:{...events},eventCount:Object.values(events).reduce((a,b)=>a+b,0),olderSfxMuted:true};}
  function publish(){window.__V1116_SFX=state();window.__V1115_SFX=window.__V1116_SFX;}

  buildPools();preloadLocal();hookUnlock();hookControls();hookModals();hookToast();hookFootsteps();publish();
  window.__V1116_SFX_API={play,probe,unlock,state,preload:preloadLocal,localFiles,mediaSnapshot,primeMedia};window.__V1115_SFX_API=window.__V1116_SFX_API;
  window.addEventListener('beforeunload',()=>{if(stepTimer)clearInterval(stepTimer);if(muteTimer)clearInterval(muteTimer);for(const a of Object.values(pools).flat()){try{a.pause();}catch(_){}}},{once:true});
})();