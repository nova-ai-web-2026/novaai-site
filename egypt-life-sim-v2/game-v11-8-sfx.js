(() => {
  'use strict';

  const VERSION='11.8.1',BASE='audio/v11-8/';
  const files={
    step_pavement:BASE+'step_pavement.wav?v=11.8.1',
    step_asphalt:BASE+'step_asphalt.wav?v=11.8.1',
    interact:BASE+'interact.wav?v=11.8.1',
    buy:BASE+'buy_coin.wav?v=11.8.1',
    door:BASE+'door.wav?v=11.8.1',
    reward:BASE+'reward.wav?v=11.8.1'
  };
  const pools={},cursors={},playsByKey={},resolvedByKey={},rejectedByKey={},decoded={},decoding={};
  const events={step:0,interact:0,buy:0,reward:0,door:0,open:0,close:0,deny:0,start:0,ui:0};
  let mediaUnlocked=false,webAudioUnlocked=false,htmlMediaUnlocked=false,unlockAttempted=false,unlockFailures=0,unlockPromise=null,startCuePlayed=false;
  let playCalls=0,playResolved=0,playRejected=0,webAudioCalls=0,webAudioResolved=0,webAudioRejected=0,htmlCalls=0,htmlResolved=0,htmlRejected=0,lastPlayed=null;
  let sfxBus=null,sfxAnalyser=null,stepTimer=null,lastCam=null,stepTravel=0,leftFoot=false,lastToast='',lastToastAt=0;

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
  const getContext=()=>window.__V118_CONTEXT||window.__V117_CONTEXT||window.__V116_CONTEXT||null;
  const getMaster=()=>window.__V118_MASTER||window.__V117_MASTER||window.__V116_MASTER||null;
  const state=()=>({
    version:VERSION,engine:'webaudio-sampled-sfx-with-html-fallback',installed:true,mediaUnlocked,webAudioUnlocked,htmlMediaUnlocked,unlockAttempted,unlockFailures,startCuePlayed,
    sampleFiles:Object.keys(files).length,playCalls,playResolved,playRejected,webAudioCalls,webAudioResolved,webAudioRejected,htmlCalls,htmlResolved,htmlRejected,
    playsByKey:{...playsByKey},resolvedByKey:{...resolvedByKey},rejectedByKey:{...rejectedByKey},lastPlayed:lastPlayed?{...lastPlayed}:null,
    eventCount:Object.values(events).reduce((a,b)=>a+b,0),events:{...events},footsteps:true,interaction:true,purchase:true,doors:true,rewards:true,
    legacyHum:false,legacyHorns:false,webAudioPrimary:true,htmlFallback:true,sfxAnalyser:!!sfxAnalyser,
    ready:Object.fromEntries(Object.entries(pools).map(([k,v])=>[k,Math.max(...v.map(a=>a.readyState||0))]))
  });
  function publish(){window.__V118_SFX=state();}

  function ensureSfxBus(){
    const ctx=getContext(),master=getMaster();if(!ctx||!master)return false;
    if(sfxBus)return true;
    sfxBus=ctx.createGain();sfxBus.gain.value=1;
    sfxAnalyser=ctx.createAnalyser();sfxAnalyser.fftSize=512;
    sfxBus.connect(sfxAnalyser);sfxAnalyser.connect(master);
    window.__V118_SFX_BUS=sfxBus;window.__V118_SFX_ANALYSER=sfxAnalyser;publish();return true;
  }

  async function decodeSample(key){
    if(decoded[key])return decoded[key];if(decoding[key])return decoding[key];
    const ctx=getContext();if(!ctx)return null;
    decoding[key]=(async()=>{
      const response=await fetch(files[key],{cache:'force-cache'});if(!response.ok)throw new Error('SFX fetch '+key+' '+response.status);
      const bytes=await response.arrayBuffer();const buffer=await ctx.decodeAudioData(bytes.slice(0));decoded[key]=buffer;return buffer;
    })().catch(err=>{console.warn('V11.8.1 SFX decode failed',key,err);return null;}).finally(()=>{delete decoding[key];});
    return decoding[key];
  }

  async function primeElement(a){
    const oldVolume=a.volume,oldMuted=a.muted;
    try{a.muted=false;a.volume=0;a.currentTime=0;const p=a.play();if(p&&typeof p.then==='function')await p;a.pause();a.currentTime=0;a.volume=oldVolume;a.muted=oldMuted;return true;}
    catch(_){try{a.pause();a.currentTime=0;a.volume=oldVolume;a.muted=oldMuted;}catch(__){}return false;}
  }

  async function unlockMedia(){
    if(mediaUnlocked&&webAudioUnlocked)return true;if(unlockPromise)return unlockPromise;
    unlockAttempted=true;publish();
    unlockPromise=(async()=>{
      try{await window.__V118_AUDIO_START?.(false);}catch(_){}
      const ctx=getContext();
      if(ctx&&ctx.state!=='running'){try{await ctx.resume();}catch(_){}}
      webAudioUnlocked=!!ctx&&ctx.state==='running'&&ensureSfxBus();
      if(webAudioUnlocked)await Promise.all(Object.keys(files).map(decodeSample));
      const first=Object.values(pools).map(v=>v[0]),results=await Promise.all(first.map(primeElement));
      unlockFailures=results.filter(v=>!v).length;htmlMediaUnlocked=results.some(Boolean);
      mediaUnlocked=webAudioUnlocked||htmlMediaUnlocked;publish();return mediaUnlocked;
    })().finally(()=>{unlockPromise=null;});
    return unlockPromise;
  }

  function pick(key){const pool=pools[key];if(!pool?.length)return null;return pool[cursors[key]++%pool.length];}

  async function playWebAudio(key,volume=.9,rate=1,callId=0){
    if(isMuted())return false;
    try{
      let ctx=getContext();if(!ctx){await window.__V118_AUDIO_START?.(false);ctx=getContext();}
      if(!ctx)return false;if(ctx.state!=='running'){try{await ctx.resume();}catch(_){}}
      if(ctx.state!=='running'||!ensureSfxBus())return false;
      webAudioUnlocked=true;mediaUnlocked=true;webAudioCalls++;
      const buffer=await decodeSample(key);if(!buffer)throw new Error('decode failed');
      const src=ctx.createBufferSource(),gain=ctx.createGain();src.buffer=buffer;src.playbackRate.value=rate;gain.gain.value=Math.max(0,Math.min(1,volume));src.connect(gain);gain.connect(sfxBus);src.start();
      webAudioResolved++;playResolved++;resolvedByKey[key]=(resolvedByKey[key]||0)+1;
      if(lastPlayed?.playCalls===callId){lastPlayed.promiseResolved=true;lastPlayed.transport='webaudio';lastPlayed.contextState=ctx.state;}
      publish();return true;
    }catch(err){webAudioRejected++;if(lastPlayed?.playCalls===callId)lastPlayed.webAudioError=String(err);publish();return false;}
  }

  async function playHtml(key,volume=.82,rate=1,callId=0){
    if(isMuted())return false;const a=pick(key);if(!a)return false;htmlCalls++;
    try{
      a.pause();a.currentTime=0;a.muted=false;a.volume=Math.max(0,Math.min(1,volume));a.playbackRate=rate;
      const p=a.play();if(p&&typeof p.then==='function')await p;
      htmlResolved++;playResolved++;resolvedByKey[key]=(resolvedByKey[key]||0)+1;htmlMediaUnlocked=true;mediaUnlocked=true;
      if(lastPlayed?.playCalls===callId){lastPlayed.promiseResolved=true;lastPlayed.transport='html-audio';lastPlayed.currentTime=a.currentTime;lastPlayed.readyState=a.readyState;}
      publish();return true;
    }catch(err){htmlRejected++;if(lastPlayed?.playCalls===callId)lastPlayed.htmlError=String(err);publish();return false;}
  }

  function playSample(key,volume=.9,rate=1){
    if(isMuted())return false;playCalls++;playsByKey[key]=(playsByKey[key]||0)+1;
    const callId=playCalls;lastPlayed={key,at:performance.now(),playCalls:callId,promiseResolved:false,volume,rate,transport:'pending'};publish();
    (async()=>{
      const webOk=await playWebAudio(key,volume,rate,callId);if(webOk)return;
      const htmlOk=await playHtml(key,volume,rate,callId);if(htmlOk)return;
      playRejected++;rejectedByKey[key]=(rejectedByKey[key]||0)+1;if(lastPlayed?.playCalls===callId)lastPlayed.transport='failed';publish();
    })();
    return true;
  }

  function step(kind='pavement'){leftFoot=!leftFoot;events.step++;playSample(kind==='asphalt'?'step_asphalt':'step_pavement',kind==='asphalt'?.95:.91,leftFoot?.97:1.03);publish();}
  function interact(){events.interact++;playSample('interact',1,1);publish();}
  function shopOpen(){events.open++;playSample('interact',.76,.88);publish();}
  function close(){events.close++;playSample('door',.78,1.12);publish();}
  function buy(){events.buy++;playSample('buy',1,1);publish();}
  function reward(){events.reward++;playSample('reward',1,1);publish();}
  function door(){events.door++;playSample('door',1,1);publish();}
  function deny(){events.deny++;playSample('interact',.72,.72);publish();}
  function startCue(){events.start++;playSample('interact',.64,.92);publish();}
  function uiTap(){events.ui++;playSample('interact',.55,1.12);publish();}
  function play(name){const map={step:()=>step('pavement'),asphalt:()=>step('asphalt'),interact,buy,reward,door,open:shopOpen,close,deny,start:startCue,ui:uiTap};if(!map[name])return false;map[name]();return true;}

  function hookUnlock(){
    const fire=()=>unlockMedia().then(ok=>{if(ok&&!startCuePlayed){startCuePlayed=true;startCue();publish();}});
    for(const id of ['newGameBtn','continueBtn']){
      const el=document.getElementById(id);if(!el)continue;
      el.addEventListener('pointerdown',fire,{capture:true});el.addEventListener('touchstart',fire,{capture:true,passive:true});el.addEventListener('click',()=>{if(!unlockAttempted)fire();},{capture:true});
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
      if(text.startsWith('اشتريت '))buy();else if(text.includes('خلصت طلبية')&&text.includes('كسبت'))reward();else if(text.includes('رجعت بيت العيلة'))door();else if(text.includes('الفلوس مش مكفية'))deny();else if(text.includes('لفّيت في سوق الحارة'))playSample('interact',.6,.82);
    }).observe(toast,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  }

  function hookFootsteps(){
    stepTimer=setInterval(()=>{
      const ctx=getContext();const playable=mediaUnlocked||(ctx?.state==='running');
      if(!playable||!document.body.classList.contains('game-started')){lastCam=null;stepTravel=0;return;}
      const cam=window.__egyptDebug?.getCamera?.();if(!cam)return;
      if(lastCam){const delta=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);if(delta<2.5){stepTravel+=delta;while(stepTravel>.68){const road=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));step(road<4.8?'asphalt':'pavement');stepTravel-=.68;}}else stepTravel=0;}
      lastCam={x:cam.x,z:cam.z};
    },90);
  }

  hookUnlock();hookControls();hookModals();hookToast();hookFootsteps();publish();
  window.__V118_MEDIA_POOLS=pools;window.__V118_SFX_API={play,unlockMedia,state,playSample,playWebAudio,playHtml,decodeSample,ensureSfxBus};
  window.addEventListener('beforeunload',()=>{if(stepTimer)clearInterval(stepTimer);for(const p of Object.values(pools))for(const a of p){try{a.pause();a.src='';}catch(_){}}},{once:true});
})();
