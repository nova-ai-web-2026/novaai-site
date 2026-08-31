(() => {
  'use strict';

  const VERSION='11.10';
  const SAMPLE_RATE=24000;
  const BANK_URL='audio/v11-10/foley-bank.pcm.gz?v=11.10';
  const EXPECTED_BYTES=167278;
  const MANIFEST={
    step_pavement_1:{offset:0,bytes:11280,frames:5640},
    step_asphalt_1:{offset:11280,bytes:10320,frames:5160},
    step_pavement_2:{offset:21600,bytes:11280,frames:5640},
    step_asphalt_2:{offset:32880,bytes:10320,frames:5160},
    step_pavement_3:{offset:43200,bytes:11280,frames:5640},
    step_asphalt_3:{offset:54480,bytes:10320,frames:5160},
    interact_1:{offset:64800,bytes:6720,frames:3360},
    buy_1:{offset:71520,bytes:15360,frames:7680},
    door_1:{offset:86880,bytes:19200,frames:9600},
    interact_2:{offset:106080,bytes:6720,frames:3360},
    buy_2:{offset:112800,bytes:15360,frames:7680},
    door_2:{offset:128160,bytes:19200,frames:9600},
    reward_1:{offset:147360,bytes:12960,frames:6480},
    deny_1:{offset:160320,bytes:6958,frames:3479}
  };
  const GROUPS={
    step_pavement:['step_pavement_1','step_pavement_2','step_pavement_3'],
    step_asphalt:['step_asphalt_1','step_asphalt_2','step_asphalt_3'],
    interact:['interact_1','interact_2'],
    buy:['buy_1','buy_2'],
    door:['door_1','door_2'],
    reward:['reward_1'],deny:['deny_1']
  };

  const buffers={},lastVariant={},history=[],lastAt={};
  const events={step:0,interact:0,buy:0,reward:0,door:0,open:0,close:0,deny:0,ui:0};
  let sfxBus=null,highpass=null,lowpass=null,limiter=null,analyser=null;
  let bankReady=false,bankLoading=null,bankError=null,unlocked=false,playCalls=0,playResolved=0,playRejected=0,noRepeatViolations=0;
  let stepTimer=null,lastCam=null,stepTravel=0,leftFoot=false,lastToast='',lastToastAt=0,lastPlayed=null;

  const getContext=()=>window.__V119_CONTEXT||window.__V118_CONTEXT||window.__V117_CONTEXT||window.__V116_CONTEXT||null;
  const getMaster=()=>window.__V119_MASTER||window.__V118_MASTER||window.__V117_MASTER||window.__V116_MASTER||null;
  const isMuted=()=>document.getElementById('soundToggle')?.textContent.includes('مكتوم')===true;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function state(){return {
    version:VERSION,engine:'decoded-natural-foley-bank',sampleRate:SAMPLE_RATE,bankUrl:BANK_URL,bankReady,bankError,assetBytes:EXPECTED_BYTES,
    sampleCount:Object.keys(MANIFEST).length,groups:Object.fromEntries(Object.entries(GROUPS).map(([k,v])=>[k,v.length])),
    unlocked,playCalls,playResolved,playRejected,noRepeatViolations,lastPlayed,lastVariant:{...lastVariant},events:{...events},history:history.slice(-12),
    legacyGameplaySfxMuted:true,proceduralGameplayFoley:false,oscillatorGameplaySfx:false,limiterCeilingDb:-2
  };}
  function publish(){window.__V1110_SFX=state();window.__V119_SFX=window.__V1110_SFX;}

  function ensureBus(){
    const ctx=getContext(),master=getMaster();if(!ctx||!master)return false;if(sfxBus)return true;
    sfxBus=ctx.createGain();sfxBus.gain.value=.94;
    highpass=ctx.createBiquadFilter();highpass.type='highpass';highpass.frequency.value=40;highpass.Q.value=.25;
    lowpass=ctx.createBiquadFilter();lowpass.type='lowpass';lowpass.frequency.value=10000;lowpass.Q.value=.18;
    limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-2;limiter.knee.value=0;limiter.ratio.value=12;limiter.attack.value=.001;limiter.release.value=.06;
    analyser=ctx.createAnalyser();analyser.fftSize=1024;
    sfxBus.connect(highpass);highpass.connect(lowpass);lowpass.connect(limiter);limiter.connect(analyser);analyser.connect(master);
    window.__V1110_SFX_BUS=sfxBus;window.__V1110_SFX_ANALYSER=analyser;window.__V119_SFX_BUS=sfxBus;window.__V119_SFX_ANALYSER=analyser;publish();return true;
  }

  async function gunzip(arrayBuffer){
    if(typeof DecompressionStream!=='function')throw new Error('gzip decompression unavailable');
    const stream=new Blob([arrayBuffer]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).arrayBuffer();
  }

  function buildBuffers(raw){
    const ctx=getContext();if(!ctx)throw new Error('AudioContext missing while building Foley bank');
    if(raw.byteLength!==EXPECTED_BYTES)throw new Error(`Foley bank size ${raw.byteLength}, expected ${EXPECTED_BYTES}`);
    for(const [name,m] of Object.entries(MANIFEST)){
      const view=new DataView(raw,m.offset,m.bytes),samples=new Float32Array(m.frames);
      let peak=0,sum=0;
      for(let i=0;i<m.frames;i++){const v=view.getInt16(i*2,true)/32768;samples[i]=v;peak=Math.max(peak,Math.abs(v));sum+=v*v;}
      const b=ctx.createBuffer(1,m.frames,SAMPLE_RATE);b.copyToChannel(samples,0);b.__v1110Peak=peak;b.__v1110Rms=Math.sqrt(sum/m.frames);buffers[name]=b;
    }
    bankReady=true;bankError=null;publish();return true;
  }

  async function loadBank(){
    if(bankReady)return true;if(bankLoading)return bankLoading;
    bankLoading=(async()=>{
      try{
        const r=await fetch(BANK_URL,{cache:'force-cache'});if(!r.ok)throw new Error(`Foley bank HTTP ${r.status}`);
        const compressed=await r.arrayBuffer();if(compressed.byteLength<50000)throw new Error('Foley bank unexpectedly small');
        const raw=await gunzip(compressed);return buildBuffers(raw);
      }catch(err){bankError=String(err);console.error('V11.10 Foley bank failed',err);publish();return false;}
      finally{bankLoading=null;}
    })();return bankLoading;
  }

  async function unlock(){
    try{await (window.__V119_AUDIO_START||window.__V118_AUDIO_START||window.__V117_AUDIO_START)?.();}catch(_){}
    const ctx=getContext();if(!ctx)return false;if(ctx.state!=='running'){try{await ctx.resume();}catch(_){}}
    unlocked=ctx.state==='running'&&ensureBus();if(unlocked)await loadBank();publish();return unlocked&&bankReady;
  }

  function pick(group){
    const list=GROUPS[group];if(!list?.length)return null;
    let idx=Math.floor(Math.random()*list.length);const prev=lastVariant[group];
    if(list.length>1&&idx===prev)idx=(idx+1+Math.floor(Math.random()*(list.length-1)))%list.length;
    if(list.length>1&&idx===prev)noRepeatViolations++;
    lastVariant[group]=idx;return {name:list[idx],variant:idx,buffer:buffers[list[idx]]};
  }

  function playGroup(group,volume=.8,rate=1,pan=0,cooldown=40){
    const now=performance.now();if(isMuted()||now-(lastAt[group]||0)<cooldown)return false;
    const ctx=getContext();if(!ctx||ctx.state!=='running'||!bankReady||!ensureBus()){
      unlock().then(ok=>{if(ok)playGroup(group,volume,rate,pan,cooldown);});return true;
    }
    const chosen=pick(group);if(!chosen?.buffer)return false;lastAt[group]=now;playCalls++;
    try{
      const src=ctx.createBufferSource(),gain=ctx.createGain();src.buffer=chosen.buffer;src.playbackRate.value=rate;gain.gain.value=clamp(volume,0,1);
      src.connect(gain);
      if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=clamp(pan,-1,1);gain.connect(p);p.connect(sfxBus);}else gain.connect(sfxBus);
      src.start();playResolved++;
      lastPlayed={group,sample:chosen.name,variant:chosen.variant,rate:+rate.toFixed(3),volume:+volume.toFixed(3),at:now,peak:chosen.buffer.__v1110Peak,rms:chosen.buffer.__v1110Rms};
      history.push(lastPlayed);if(history.length>60)history.shift();publish();return true;
    }catch(err){playRejected++;lastPlayed={group,error:String(err),at:now};publish();return false;}
  }

  function step(surface='pavement'){
    leftFoot=!leftFoot;events.step++;const group=surface==='asphalt'?'step_asphalt':'step_pavement';
    playGroup(group,surface==='asphalt'?.84:.80,(leftFoot?.993:1.007)*(0.993+Math.random()*.014),leftFoot?-.03:.03,65);publish();
  }
  function interact(){events.interact++;playGroup('interact',.72,.995+Math.random()*.012,0,95);publish();}
  function shopOpen(){events.open++;playGroup('interact',.56,.965+Math.random()*.01,0,120);publish();}
  function close(){events.close++;playGroup('door',.72,1.015+Math.random()*.012,0,120);publish();}
  function buy(){events.buy++;playGroup('buy',.79,.994+Math.random()*.012,0,130);publish();}
  function reward(){events.reward++;playGroup('reward',.66,1,0,180);publish();}
  function door(){events.door++;playGroup('door',.82,.995+Math.random()*.01,0,150);publish();}
  function deny(){events.deny++;playGroup('deny',.62,1,0,160);publish();}
  function ui(){events.ui++;playGroup('interact',.44,1.025,0,80);publish();}
  function play(name){const map={step:()=>step('pavement'),asphalt:()=>step('asphalt'),interact,buy,reward,door,open:shopOpen,close,deny,ui};if(!map[name])return false;map[name]();return true;}

  function hookUnlock(){const fire=()=>unlock();for(const id of ['newGameBtn','continueBtn']){const el=document.getElementById(id);if(!el)continue;el.addEventListener('pointerdown',fire,{capture:true});el.addEventListener('touchstart',fire,{capture:true,passive:true});}}
  function hookControls(){
    document.addEventListener('pointerdown',e=>{const t=e.target instanceof Element?e.target:null;if(!t)return;if(t.closest('#act'))interact();else if(t.closest('#shopClose,#dialogClose'))close();else if(t.closest('#resetBtn'))ui();},true);
    document.addEventListener('keydown',e=>{if(e.repeat||e.code!=='KeyE')return;const menu=document.getElementById('menu');if(menu&&getComputedStyle(menu).display!=='none')return;interact();},true);
  }
  function hookModals(){for(const [id,fn] of [['shop',shopOpen],['dialog',interact]]){const el=document.getElementById(id);if(!el)continue;let visible=getComputedStyle(el).display!=='none';new MutationObserver(()=>{const now=getComputedStyle(el).display!=='none';if(now&&!visible)fn();visible=now;}).observe(el,{attributes:true,attributeFilter:['style','class']});}}
  function hookToast(){
    const toast=document.getElementById('toast');if(!toast)return;
    new MutationObserver(()=>{const text=(toast.textContent||'').trim(),now=performance.now();if(!text||(text===lastToast&&now-lastToastAt<650))return;lastToast=text;lastToastAt=now;
      if(text.startsWith('اشتريت '))buy();else if(text.includes('خلصت طلبية')&&text.includes('كسبت'))reward();else if(text.includes('رجعت بيت العيلة'))door();else if(text.includes('الفلوس مش مكفية'))deny();
    }).observe(toast,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  }
  function hookFootsteps(){
    stepTimer=setInterval(()=>{
      if(!unlocked||!bankReady||!document.body.classList.contains('game-started')){lastCam=null;stepTravel=0;return;}
      const cam=window.__egyptDebug?.getCamera?.();if(!cam)return;
      if(lastCam){const delta=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);if(delta<2.5){stepTravel+=delta;while(stepTravel>.70){const road=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));step(road<4.8?'asphalt':'pavement');stepTravel-=.70;}}else stepTravel=0;}
      lastCam={x:cam.x,z:cam.z};
    },90);
  }

  function metrics(){return Object.fromEntries(Object.entries(buffers).map(([name,b])=>[name,{duration:+b.duration.toFixed(4),peak:b.__v1110Peak,rms:b.__v1110Rms,crestDb:20*Math.log10((b.__v1110Peak+1e-9)/(b.__v1110Rms+1e-9))}]));}

  hookUnlock();hookControls();hookModals();hookToast();hookFootsteps();publish();
  window.__V1110_SFX_API={play,unlock,loadBank,state,metrics,playGroup};window.__V119_SFX_API=window.__V1110_SFX_API;
  window.addEventListener('beforeunload',()=>{if(stepTimer)clearInterval(stepTimer);},{once:true});
})();