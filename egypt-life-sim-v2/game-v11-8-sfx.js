(() => {
  'use strict';

  const BASE='audio/v11-8/';
  const files={
    step_pavement:BASE+'step_pavement.wav?v=11.8',
    step_asphalt:BASE+'step_asphalt.wav?v=11.8',
    interact:BASE+'interact.wav?v=11.8',
    buy:BASE+'buy_coin.wav?v=11.8',
    door:BASE+'door.wav?v=11.8',
    reward:BASE+'reward.wav?v=11.8'
  };
  const pools={},cursors={},playsByKey={},resolvedByKey={},rejectedByKey={},decoded={},decoding={};
  const events={step:0,interact:0,buy:0,reward:0,door:0,open:0,close:0,deny:0,start:0,ui:0};
  let mediaUnlocked=false,unlockAttempted=false,unlockFailures=0,unlockPromise=null,startCuePlayed=false;
  let playCalls=0,playResolved=0,playRejected=0,htmlRejected=0,fallbackCalls=0,fallbackResolved=0,fallbackRejected=0,lastPlayed=null,stepTimer=null,lastCam=null,stepTravel=0,leftFoot=false,lastToast='',lastToastAt=0;

  function makePool(key,size=4){
    playsByKey[key]=0;resolvedByKey[key]=0;rejectedByKey[key]=0;
    const list=[];
    for(let i=0;i<size;i++){
      const a=new Audio(files[key]);a.preload='auto';a.playsInline=true;a.setAttribute('playsinline','');a.setAttribute('webkit-playsinline','');a.load();list.push(a);
    }
    pools[key]=list;cursors[key]=0;
  }
  Object.keys(files).forEach(k=>makePool(k,k.startsWith('step_')?5:4));

  const isMuted=()=>document.getElementById('soundToggle')?.textContent.includes('مكتوم')===true;
  const state=()=>({
    version:'11.8',engine:'sampled-media-sfx-with-webaudio-fallback',installed:true,mediaUnlocked,unlockAttempted,unlockFailures,startCuePlayed,
    sampleFiles:Object.keys(files).length,playCalls,playResolved,playRejected,htmlRejected,fallbackCalls,fallbackResolved,fallbackRejected,
    playsByKey:{...playsByKey},resolvedByKey:{...resolvedByKey},rejectedByKey:{...rejectedByKey},
    lastPlayed:lastPlayed?{...lastPlayed}:null,eventCount:Object.values(events).reduce((a,b)=>a+b,0),events:{...events},
    footsteps:true,interaction:true,purchase:true,doors:true,rewards:true,legacyHum:false,legacyHorns:false,webAudioFallback:true,
    ready:Object.fromEntries(Object.entries(pools).map(([k,v])=>[k,Math.max(...v.map(a=>a.readyState||0))]))
  });
  function publish(){window.__V118_SFX=state();}

  async function primeElement(a){
    const oldVolume=a.volume,oldMuted=a.muted;
    try{a.muted=false;a.volume=0;a.currentTime=0;const p=a.play();if(p&&typeof p.then==='function')await p;a.pause();a.currentTime=0;a.volume=oldVolume;a.muted=oldMuted;return true;}
    catch(_){try{a.pause();a.currentTime=0;a.volume=oldVolume;a.muted=oldMuted;}catch(__){}return false;}
  }

  function unlockMedia(){
    if(mediaUnlocked)return Promise.resolve(true);
    if(unlockPromise)return unlockPromise;
    unlockAttempted=true;publish();
    unlockPromise=(async()=>{
      const first=Object.values(pools).map(v=>v[0]);const results=await Promise.all(first.map(primeElement));
      unlockFailures=results.filter(v=>!v).length;mediaUnlocked=results.every(Boolean);publish();return mediaUnlocked;
    })().finally(()=>{unlockPromise=null;});
    return unlockPromise;
  }

  function pick(key){const pool=pools[key];if(!pool?.length)return null;return pool[cursors[key]++%pool.length];}

  async function decodeSample(key){
    if(decoded[key])return decoded[key];
    if(decoding[key])return decoding[key];
    const context=window.__V118_CONTEXT||window.__V117_CONTEXT||window.__V116_CONTEXT;
    if(!context)return null;
    decoding[key]=(async()=>{
      const response=await fetch(files[key],{cache:'force-cache'});if(!response.ok)throw new Error('SFX fetch '+key+' '+response.status);
      const bytes=await response.arrayBuffer();const buffer=await context.decodeAudioData(bytes.slice(0));decoded[key]=buffer;return buffer;
    })().catch(()=>null).finally(()=>{delete decoding[key];});
    return decoding[key];
  }

  async function playFallback(key,volume=.9,rate=1){
    const context=window.__V118_CONTEXT||window.__V117_CONTEXT||window.__V116_CONTEXT,output=window.__V118_MASTER||window.__V117_MASTER||window.__V116_MASTER;
    if(!context||!output||isMuted())return false;
    fallbackCalls++;publish();
    try{
      if(context.state!=='running')await context.resume();
      const buffer=await decodeSample(key);if(!buffer)throw new Error('decode failed');
      const src=context.createBufferSource(),gain=context.createGain();src.buffer=buffer;src.playbackRate.value=rate;gain.gain.value=Math.max(0,Math.min(1,volume));src.connect(gain);gain.connect(output);src.start();
      fallbackResolved++;resolvedByKey[key]=(resolvedByKey[key]||0)+1;publish();return true;
    }catch(_){fallbackRejected++;playRejected++;rejectedByKey[key]=(rejectedByKey[key]||0)+1;publish();return false;}
  }

  function playSample(key,volume=.82,rate=1){
    if(isMuted())return false;
    const a=pick(key);if(!a){playFallback(key,volume,rate);return false;}
    try{
      a.pause();a.currentTime=0;a.muted=false;a.volume=Math.max(0,Math.min(1,volume));a.playbackRate=rate;
      playCalls++;playsByKey[key]=(playsByKey[key]||0)+1;
      const callId=playCalls;lastPlayed={key,at:performance.now(),playCalls:callId,promiseResolved:false,readyState:a.readyState,currentTime:a.currentTime,volume:a.volume,rate,transport:'html-audio'};publish();
      const p=a.play();
      if(p&&typeof p.then==='function')p.then(()=>{
        playResolved++;resolvedByKey[key]=(resolvedByKey[key]||0)+1;
        if(lastPlayed?.playCalls===callId){lastPlayed.promiseResolved=true;lastPlayed.currentTime=a.currentTime;lastPlayed.readyState=a.readyState;}publish();
      }).catch(err=>{
        htmlRejected++;
        if(lastPlayed?.playCalls===callId){lastPlayed.error=String(err);lastPlayed.transport='webaudio-fallback';}publish();
        playFallback(key,volume,rate);
      });
      return true;
    }catch(err){htmlRejected++;lastPlayed={key,at:performance.now(),playCalls,error:String(err),transport:'webaudio-fallback'};publish();playFallback(key,volume,rate);return false;}
  }

  function step(kind='pavement'){leftFoot=!leftFoot;events.step++;playSample(kind==='asphalt'?'step_asphalt':'step_pavement',kind==='asphalt'?.92:.88,leftFoot?.97:1.03);publish();}
  function interact(){events.interact++;playSample('interact',.98,1);publish();}
  function shopOpen(){events.open++;playSample('interact',.72,.88);publish();}
  function close(){events.close++;playSample('door',.72,1.12);publish();}
  function buy(){events.buy++;playSample('buy',1,1);publish();}
  function reward(){events.reward++;playSample('reward',1,1);publish();}
  function door(){events.door++;playSample('door',.96,1);publish();}
  function deny(){events.deny++;playSample('interact',.7,.72);publish();}
  function startCue(){events.start++;playSample('interact',.62,.92);publish();}
  function uiTap(){events.ui++;playSample('interact',.52,1.12);publish();}

  function play(name){const map={step:()=>step('pavement'),asphalt:()=>step('asphalt'),interact,buy,reward,door,open:shopOpen,close,deny,start:startCue,ui:uiTap};if(!map[name])return false;map[name]();return true;}

  function hookUnlock(){
    const fire=()=>unlockMedia().then(ok=>{if(ok&&!startCuePlayed){startCuePlayed=true;startCue();publish();}});
    for(const id of ['newGameBtn','continueBtn']){
      const el=document.getElementById(id);if(!el)continue;
      el.addEventListener('pointerdown',fire,{capture:true});
      el.addEventListener('touchstart',fire,{capture:true,passive:true});
      el.addEventListener('click',()=>{if(!unlockAttempted)fire();},{capture:true});
    }
  }

  function hookControls(){
    document.getElementById('act')?.addEventListener('pointerdown',()=>unlockMedia().then(()=>interact()),{capture:true});
    document.addEventListener('keydown',e=>{if(e.repeat)return;const menu=document.getElementById('menu');if(menu&&getComputedStyle(menu).display!=='none')return;if(e.code==='KeyE')unlockMedia().then(()=>interact());},true);
    document.addEventListener('pointerdown',e=>{const target=e.target instanceof Element?e.target:null;if(!target)return;if(target.closest('#shopItems button'))uiTap();else if(target.closest('#shopClose,#dialogClose'))close();},true);
  }

  function hookModals(){
    for(const [id,fn] of [['shop',shopOpen],['dialog',shopOpen]]){const el=document.getElementById(id);if(!el)continue;let visible=getComputedStyle(el).display!=='none';new MutationObserver(()=>{const now=getComputedStyle(el).display!=='none';if(now&&!visible)fn();visible=now;}).observe(el,{attributes:true,attributeFilter:['style','class']});}
  }

  function hookToast(){
    const toast=document.getElementById('toast');if(!toast)return;
    new MutationObserver(()=>{
      const text=(toast.textContent||'').trim(),now=performance.now();if(!text||(text===lastToast&&now-lastToastAt<700))return;lastToast=text;lastToastAt=now;
      if(text.startsWith('اشتريت '))buy();
      else if(text.includes('خلصت طلبية')&&text.includes('كسبت'))reward();
      else if(text.includes('رجعت بيت العيلة'))door();
      else if(text.includes('الفلوس مش مكفية'))deny();
      else if(text.includes('لفّيت في سوق الحارة'))playSample('interact',.58,.82);
    }).observe(toast,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  }

  function hookFootsteps(){
    stepTimer=setInterval(()=>{
      if(!mediaUnlocked||!document.body.classList.contains('game-started')){lastCam=null;stepTravel=0;return;}
      const cam=window.__egyptDebug?.getCamera?.();if(!cam)return;
      if(lastCam){const delta=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);if(delta<2.5){stepTravel+=delta;while(stepTravel>.68){const road=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));step(road<4.8?'asphalt':'pavement');stepTravel-=.68;}}else stepTravel=0;}
      lastCam={x:cam.x,z:cam.z};
    },90);
  }

  hookUnlock();hookControls();hookModals();hookToast();hookFootsteps();publish();
  window.__V118_MEDIA_POOLS=pools;window.__V118_SFX_API={play,unlockMedia,state,playSample,playFallback,decodeSample};
  window.addEventListener('beforeunload',()=>{if(stepTimer)clearInterval(stepTimer);for(const p of Object.values(pools))for(const a of p){try{a.pause();a.src='';}catch(_){}}},{once:true});
})();
