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

  const banks={},events={step:0,interact:0,buy:0,reward:0,door:0,open:0,close:0,deny:0,start:0,ui:0};
  const lastEventAt={};
  let bus=null,highpass=null,compressor=null,analyser=null,preloadPromise=null,localReady=false,unlocked=false;
  let localLoaded=0,localFailed=0,playCalls=0,playResolved=0,playRejected=0,lastPlayed=null;
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
    bus=ctx.createGain();bus.gain.value=1.0;
    highpass=ctx.createBiquadFilter();highpass.type='highpass';highpass.frequency.value=38;highpass.Q.value=.2;
    compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-14;compressor.knee.value=10;compressor.ratio.value=1.7;compressor.attack.value=.003;compressor.release.value=.10;
    analyser=ctx.createAnalyser();analyser.fftSize=1024;
    bus.connect(highpass);highpass.connect(compressor);compressor.connect(analyser);analyser.connect(master);
    window.__V1116_SFX_BUS=bus;window.__V1116_SFX_ANALYSER=analyser;window.__V1115_SFX_BUS=bus;window.__V1115_SFX_ANALYSER=analyser;
    muteOlderSfx();publish();return true;
  }

  async function decodeLocal(url){
    const ctx=getContext();if(!ctx)throw new Error('AudioContext unavailable');
    const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`${url} HTTP ${r.status}`);
    const bytes=await r.arrayBuffer();const decoded=await ctx.decodeAudioData(bytes.slice(0));
    if(!decoded||decoded.duration<=0)throw new Error(`${url} empty audio`);return decoded;
  }

  function preloadLocal(){
    if(preloadPromise)return preloadPromise;
    preloadPromise=(async()=>{
      if(!ensureBus())throw new Error('V11.16 SFX bus unavailable');
      const entries=Object.entries(localFiles);
      await Promise.all(entries.map(async([key,url])=>{
        try{const buffer=await decodeLocal(url);banks[key]=[{buffer,url,transport:'same-origin-primary'}];localLoaded++;}
        catch(err){banks[key]=[];localFailed++;console.error('V11.16 local SFX failed',key,err);}
        publish();
      }));
      localReady=localLoaded>0;publish();return localReady;
    })().catch(err=>{console.error('V11.16 local SFX preload failed',err);publish();return false;});
    return preloadPromise;
  }

  async function unlock(){
    try{await (window.__V119_AUDIO_START||window.__V118_AUDIO_START||window.__V117_AUDIO_START)?.();}catch(_){}
    const ctx=getContext();if(!ctx)return false;
    if(ctx.state!=='running'){try{await ctx.resume();}catch(_){}}
    if(ctx.state!=='running')return false;
    ensureBus();muteOlderSfx();
    if(!muteTimer)muteTimer=setInterval(muteOlderSfx,300);
    await preloadLocal();unlocked=ctx.state==='running'&&localReady;publish();return unlocked;
  }

  function pick(key){const list=banks[key];if(!list?.length)return null;return {item:list[0],variant:0};}
  function allowed(name,gap){const t=now(),p=lastEventAt[name]||0;if(t-p<gap)return false;lastEventAt[name]=t;return true;}

  function playKey(key,volume=.7,rate=1,pan=0,eventName=key){
    if(isMuted())return false;
    const ctx=getContext();
    if(!ctx||ctx.state!=='running'||!ensureBus()){
      unlock().then(ok=>{if(ok)playKey(key,volume,rate,pan,eventName);});return true;
    }
    if(!localReady){preloadLocal().then(ok=>{if(ok)playKey(key,volume,rate,pan,eventName);});return true;}
    const chosen=pick(key);if(!chosen)return false;
    playCalls++;
    try{
      const src=ctx.createBufferSource(),gain=ctx.createGain();src.buffer=chosen.item.buffer;src.playbackRate.value=rate;gain.gain.value=clamp(volume,0,1.15);
      src.connect(gain);
      if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=clamp(pan,-1,1);gain.connect(p);p.connect(bus);}else gain.connect(bus);
      src.start();playResolved++;
      lastPlayed={event:eventName,key,variant:0,transport:'same-origin-primary',url:chosen.item.url,rate,volume,pan,at:now()};publish();return true;
    }catch(err){playRejected++;lastPlayed={event:eventName,key,transport:'play-failed',error:String(err),at:now()};publish();return false;}
  }

  function step(kind='pavement'){
    const t=now();if(t-lastStepAt<145)return;lastStepAt=t;leftFoot=!leftFoot;events.step++;
    const asphalt=kind==='asphalt';playKey(asphalt?'step_asphalt':'step_pavement',asphalt?.78:.74,(leftFoot?.985:1.015),leftFoot?-.035:.035,'step');publish();
  }
  function interact(){if(!allowed('interact',100))return;events.interact++;playKey('interact',.82,1,0,'interact');publish();}
  function shopOpen(){if(!allowed('open',150))return;events.open++;playKey('interact',.62,.96,0,'open');publish();}
  function close(){if(!allowed('close',160))return;events.close++;playKey('door',.86,1,0,'close');publish();}
  function buy(){if(!allowed('buy',170))return;events.buy++;playKey('buy',.94,1,0,'buy');publish();}
  function reward(){if(!allowed('reward',220))return;events.reward++;playKey('reward',.84,1,0,'reward');publish();}
  function door(){if(!allowed('door',180))return;events.door++;playKey('door',.90,1,0,'door');publish();}
  function deny(){if(!allowed('deny',180))return;events.deny++;playKey('deny',.72,.92,0,'deny');publish();}
  function startCue(){if(!allowed('start',450))return;events.start++;playKey('interact',.70,.96,0,'start');publish();}
  function uiTap(){if(!allowed('ui',75))return;events.ui++;playKey('interact',.58,1.04,0,'ui');publish();}
  function play(name){const map={step:()=>step('pavement'),asphalt:()=>step('asphalt'),interact,buy,reward,door,open:shopOpen,close,deny,start:startCue,ui:uiTap};if(!map[name])return false;map[name]();return true;}

  function hookUnlock(){
    const fire=()=>{unlock().then(ok=>{if(ok)startCue();});};
    for(const id of ['newGameBtn','continueBtn']){const el=document.getElementById(id);if(!el)continue;el.addEventListener('pointerdown',fire,{capture:true});el.addEventListener('touchstart',fire,{capture:true,passive:true});}
  }
  function hookControls(){
    document.addEventListener('pointerdown',e=>{const t=e.target instanceof Element?e.target:null;if(!t)return;if(t.closest('#shopClose,#dialogClose'))close();else if(t.closest('#resetBtn'))uiTap();},true);
    document.addEventListener('keydown',e=>{if(e.code==='KeyE')interact();},true);
    document.getElementById('act')?.addEventListener('pointerdown',interact,{capture:true});
  }
  function hookModals(){for(const [id,fn] of [['shop',shopOpen],['dialog',interact]]){const el=document.getElementById(id);if(!el)continue;let visible=getComputedStyle(el).display!=='none';new MutationObserver(()=>{const shown=getComputedStyle(el).display!=='none';if(shown&&!visible)fn();visible=shown;}).observe(el,{attributes:true,attributeFilter:['style','class']});}}
  function hookToast(){const toast=document.getElementById('toast');if(!toast)return;new MutationObserver(()=>{const text=(toast.textContent||'').trim(),t=now();if(!text||(text===lastToast&&t-lastToastAt<600))return;lastToast=text;lastToastAt=t;if(text.startsWith('اشتريت '))buy();else if(text.includes('خلصت طلبية')&&text.includes('كسبت'))reward();else if(text.includes('رجعت بيت العيلة'))door();else if(text.includes('الفلوس مش مكفية'))deny();else if(text.includes('لفّيت في سوق الحارة'))interact();}).observe(toast,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});}
  function hookFootsteps(){stepTimer=setInterval(()=>{const ctx=getContext();if(ctx?.state!=='running'||!document.body.classList.contains('game-started')){lastCam=null;stepTravel=0;return;}const cam=window.__egyptDebug?.getCamera?.();if(!cam)return;if(lastCam){const delta=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);if(delta<2.5){stepTravel+=delta;while(stepTravel>.68){const road=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));step(road<4.8?'asphalt':'pavement');stepTravel-=.68;}}else stepTravel=0;}lastCam={x:cam.x,z:cam.z};},65);}

  function measure(){if(!analyser)return {rms:0,peak:0};const data=new Uint8Array(analyser.fftSize);analyser.getByteTimeDomainData(data);let sum=0,peak=0;for(const v of data){const x=(v-128)/128;sum+=x*x;peak=Math.max(peak,Math.abs(x));}return {rms:Math.sqrt(sum/data.length),peak};}
  function state(){return {version:VERSION,engine:'same-origin-local-sfx-primary',installed:true,actualSamples:true,primary:'same-origin-wav',networkIndependent:true,localReady,unlocked,localTotal:Object.keys(localFiles).length,localLoaded,localFailed,playCalls,playResolved,playRejected,lastPlayed:lastPlayed?{...lastPlayed}:null,events:{...events},eventCount:Object.values(events).reduce((a,b)=>a+b,0),busGain:bus?.gain?.value??null,output:measure(),olderSfxMuted:[window.__V1114_SFX_BUS,window.__V1110_SFX_BUS,window.__V119_SFX_BUS,window.__V118_SFX_BUS].filter(Boolean).every(x=>(x.gain?.value??0)<.02)};}
  function publish(){window.__V1116_SFX=state();window.__V1115_SFX=window.__V1116_SFX;}

  hookUnlock();hookControls();hookModals();hookToast();hookFootsteps();publish();
  window.__V1116_SFX_API={play,unlock,state,playKey,preload:preloadLocal,ensureBus,localFiles,measure};window.__V1115_SFX_API=window.__V1116_SFX_API;
  window.addEventListener('beforeunload',()=>{if(stepTimer)clearInterval(stepTimer);if(muteTimer)clearInterval(muteTimer);},{once:true});
})();