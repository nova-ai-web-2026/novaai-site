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
  const pools={};
  const cursors={};
  const events={step:0,interact:0,buy:0,reward:0,door:0,open:0,close:0,deny:0,start:0,ui:0};
  let mediaUnlocked=false, unlockAttempted=false, unlockFailures=0, playCalls=0, playResolved=0, playRejected=0;
  let lastPlayed=null, stepTimer=null, lastCam=null, stepTravel=0, leftFoot=false, lastToast='', lastToastAt=0;

  function makePool(key,size=4){
    const list=[];
    for(let i=0;i<size;i++){
      const a=new Audio(files[key]);
      a.preload='auto';
      a.playsInline=true;
      a.setAttribute('playsinline','');
      a.setAttribute('webkit-playsinline','');
      a.load();
      list.push(a);
    }
    pools[key]=list;cursors[key]=0;
  }
  Object.keys(files).forEach(k=>makePool(k,k.startsWith('step_')?5:4));

  const state=()=>({
    version:'11.8',engine:'sampled-media-sfx',installed:true,mediaUnlocked,unlockAttempted,unlockFailures,
    sampleFiles:Object.keys(files).length,playCalls,playResolved,playRejected,lastPlayed:lastPlayed?{...lastPlayed}:null,
    eventCount:Object.values(events).reduce((a,b)=>a+b,0),events:{...events},
    footsteps:true,interaction:true,purchase:true,doors:true,rewards:true,legacyHum:false,legacyHorns:false,
    ready:Object.fromEntries(Object.entries(pools).map(([k,v])=>[k,Math.max(...v.map(a=>a.readyState||0))]))
  });
  function publish(){window.__V118_SFX=state();}

  async function primeElement(a){
    const oldVolume=a.volume,oldMuted=a.muted;
    try{
      a.muted=false;a.volume=0;a.currentTime=0;
      const p=a.play();if(p&&typeof p.then==='function')await p;
      a.pause();a.currentTime=0;a.volume=oldVolume;a.muted=oldMuted;return true;
    }catch(_){
      try{a.pause();a.currentTime=0;a.volume=oldVolume;a.muted=oldMuted;}catch(__){}
      return false;
    }
  }

  async function unlockMedia(){
    if(mediaUnlocked)return true;
    unlockAttempted=true;
    const first=Object.values(pools).map(v=>v[0]);
    const results=await Promise.all(first.map(primeElement));
    unlockFailures=results.filter(v=>!v).length;
    mediaUnlocked=results.some(Boolean);
    publish();
    return mediaUnlocked;
  }

  function pick(key){
    const pool=pools[key];if(!pool?.length)return null;
    const i=cursors[key]++%pool.length;return pool[i];
  }

  function playSample(key,volume=.75,rate=1){
    const a=pick(key);if(!a)return false;
    try{
      a.pause();a.currentTime=0;a.muted=false;a.volume=Math.max(0,Math.min(1,volume));a.playbackRate=rate;
      playCalls++;
      lastPlayed={key,at:performance.now(),playCalls,promiseResolved:false,readyState:a.readyState,currentTime:a.currentTime,volume:a.volume,rate};
      publish();
      const p=a.play();
      if(p&&typeof p.then==='function')p.then(()=>{playResolved++;if(lastPlayed?.playCalls===playCalls){lastPlayed.promiseResolved=true;lastPlayed.currentTime=a.currentTime;lastPlayed.readyState=a.readyState;}publish();}).catch(err=>{playRejected++;if(lastPlayed?.playCalls===playCalls)lastPlayed.error=String(err);publish();});
      return true;
    }catch(err){playRejected++;lastPlayed={key,at:performance.now(),playCalls,error:String(err)};publish();return false;}
  }

  function step(kind='pavement'){
    leftFoot=!leftFoot;events.step++;
    playSample(kind==='asphalt'?'step_asphalt':'step_pavement',kind==='asphalt'?.78:.72,leftFoot?.97:1.03);publish();
  }
  function interact(){events.interact++;playSample('interact',.82,1);publish();}
  function shopOpen(){events.open++;playSample('interact',.58,.88);publish();}
  function close(){events.close++;playSample('door',.46,1.18);publish();}
  function buy(){events.buy++;playSample('buy',.90,1);publish();}
  function reward(){events.reward++;playSample('reward',.94,1);publish();}
  function door(){events.door++;playSample('door',.92,1);publish();}
  function deny(){events.deny++;playSample('interact',.55,.72);publish();}
  function startCue(){events.start++;playSample('interact',.48,.92);publish();}
  function uiTap(){events.ui++;playSample('interact',.38,1.12);publish();}

  function play(name){
    const map={step:()=>step('pavement'),asphalt:()=>step('asphalt'),interact,buy,reward,door,open:shopOpen,close,deny,start:startCue,ui:uiTap};
    if(!map[name])return false;map[name]();return true;
  }

  function hookUnlock(){
    const fire=()=>{unlockMedia().then(ok=>{if(ok)startCue();});};
    for(const id of ['newGameBtn','continueBtn']){
      const el=document.getElementById(id);if(!el)continue;
      el.addEventListener('pointerdown',fire,{capture:true});
      el.addEventListener('touchstart',fire,{capture:true,passive:true});
      el.addEventListener('click',()=>{if(!mediaUnlocked)fire();},{capture:true});
    }
  }

  function hookControls(){
    document.getElementById('act')?.addEventListener('pointerdown',()=>{unlockMedia().then(()=>interact());},{capture:true});
    document.addEventListener('keydown',e=>{
      if(e.repeat)return;const menu=document.getElementById('menu');if(menu&&getComputedStyle(menu).display!=='none')return;
      if(e.code==='KeyE')unlockMedia().then(()=>interact());
    },true);
    document.addEventListener('pointerdown',e=>{
      const target=e.target instanceof Element?e.target:null;if(!target)return;
      if(target.closest('#shopItems button'))uiTap();
      else if(target.closest('#shopClose,#dialogClose'))close();
    },true);
  }

  function hookModals(){
    for(const [id,fn] of [['shop',shopOpen],['dialog',shopOpen]]){
      const el=document.getElementById(id);if(!el)continue;let visible=getComputedStyle(el).display!=='none';
      new MutationObserver(()=>{const now=getComputedStyle(el).display!=='none';if(now&&!visible)fn();visible=now;}).observe(el,{attributes:true,attributeFilter:['style','class']});
    }
  }

  function hookToast(){
    const toast=document.getElementById('toast');if(!toast)return;
    new MutationObserver(()=>{
      const text=(toast.textContent||'').trim(),now=performance.now();if(!text||(text===lastToast&&now-lastToastAt<700))return;lastToast=text;lastToastAt=now;
      if(text.startsWith('اشتريت '))buy();
      else if(text.includes('خلصت طلبية')&&text.includes('كسبت'))reward();
      else if(text.includes('رجعت بيت العيلة'))door();
      else if(text.includes('الفلوس مش مكفية'))deny();
      else if(text.includes('بدأت يوم جديد')||text.includes('رجعت لآخر مكان محفوظ')){if(mediaUnlocked)startCue();}
      else if(text.includes('لفّيت في سوق الحارة'))playSample('interact',.46,.82);
    }).observe(toast,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  }

  function hookFootsteps(){
    stepTimer=setInterval(()=>{
      if(!mediaUnlocked||!document.body.classList.contains('game-started')){lastCam=null;stepTravel=0;return;}
      const cam=window.__egyptDebug?.getCamera?.();if(!cam)return;
      if(lastCam){
        const delta=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);
        if(delta<2.5){
          stepTravel+=delta;
          while(stepTravel>.68){const road=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));step(road<4.8?'asphalt':'pavement');stepTravel-=.68;}
        }else stepTravel=0;
      }
      lastCam={x:cam.x,z:cam.z};
    },90);
  }

  hookUnlock();hookControls();hookModals();hookToast();hookFootsteps();publish();
  window.__V118_MEDIA_POOLS=pools;
  window.__V118_SFX_API={play,unlockMedia,state,playSample};
  window.addEventListener('beforeunload',()=>{if(stepTimer)clearInterval(stepTimer);for(const p of Object.values(pools))for(const a of p){try{a.pause();a.src='';}catch(_){}}},{once:true});
})();
