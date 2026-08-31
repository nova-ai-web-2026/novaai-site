(() => {
  'use strict';

  const VERSION='11.10';
  const banks={},lastVariant={},history=[],lastAt={};
  const events={step:0,interact:0,buy:0,reward:0,door:0,open:0,close:0,deny:0,ui:0};
  let sfxBus=null,highpass=null,lowpass=null,limiter=null,analyser=null,bankReady=false,unlocked=false;
  let playCalls=0,playResolved=0,playRejected=0,noRepeatViolations=0,lastPlayed=null;
  let stepTimer=null,lastCam=null,stepTravel=0,leftFoot=false,lastToast='',lastToastAt=0;

  const getContext=()=>window.__V1110_CONTEXT||window.__V119_CONTEXT||window.__V118_CONTEXT||window.__V117_CONTEXT||window.__V116_CONTEXT||null;
  const getMaster=()=>window.__V1110_MASTER||window.__V119_MASTER||window.__V118_MASTER||window.__V117_MASTER||window.__V116_MASTER||null;
  const isMuted=()=>document.getElementById('soundToggle')?.textContent.includes('مكتوم')===true;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rngFor=seed=>()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);

  function white(n,rng){const a=new Float32Array(n);for(let i=0;i<n;i++)a[i]=rng()*2-1;return a;}
  function lp(src,cut,sr){const out=new Float32Array(src.length),a=1-Math.exp(-2*Math.PI*cut/sr);let y=0;for(let i=0;i<src.length;i++){y+=a*(src[i]-y);out[i]=y;}return out;}
  function band(src,lo,hi,sr){const h=lp(src,hi,sr),l=lp(src,lo,sr),o=new Float32Array(src.length);for(let i=0;i<o.length;i++)o[i]=h[i]-l[i];return o;}
  function transient(t,tau,attack=.0015){return (1-Math.exp(-t/Math.max(.0001,attack)))*Math.exp(-t/Math.max(.001,tau));}
  function add(dst,src,startSec,sr,gain=1){const start=Math.floor(startSec*sr);for(let i=0;i<src.length&&start+i<dst.length;i++)dst[start+i]+=src[i]*gain;}
  function removeDc(a){let mean=0;for(const v of a)mean+=v;mean/=Math.max(1,a.length);for(let i=0;i<a.length;i++)a[i]-=mean;return a;}
  function finish(a,target=.46){removeDc(a);let peak=0;for(let i=0;i<a.length;i++){a[i]=a[i]/(1+.22*Math.abs(a[i]));peak=Math.max(peak,Math.abs(a[i]));}const g=peak?target/peak:1;for(let i=0;i<a.length;i++)a[i]*=g;return a;}
  function room(a,sr,amount=.08){const dry=a.slice();for(const [ms,g] of [[7,.10],[13,-.055],[21,.04]]){const d=Math.floor(sr*ms/1000);for(let i=d;i<a.length;i++)a[i]+=dry[i-d]*g*amount/.10;}return a;}
  function bufferFrom(a){const ctx=getContext(),b=ctx.createBuffer(1,a.length,ctx.sampleRate);b.copyToChannel(a,0);let p=0,s=0;for(const v of a){p=Math.max(p,Math.abs(v));s+=v*v;}b.__sfxPeak=p;b.__sfxRms=Math.sqrt(s/a.length);return b;}

  function noiseBurst(rng,sr,dur,lo,hi,tau,attack=.0015,gain=1){
    const n=Math.max(1,Math.floor(sr*dur)),src=band(white(n,rng),lo,hi,sr),out=new Float32Array(n);
    let rms=0;for(const v of src)rms+=v*v;rms=Math.sqrt(rms/n)||1;
    for(let i=0;i<n;i++)out[i]=src[i]/rms*transient(i/sr,tau,attack)*gain;return out;
  }
  function lowBody(rng,sr,dur,tau,gain=1){
    const n=Math.floor(sr*dur),src=lp(white(n,rng),180+rng()*70,sr),out=new Float32Array(n);let rms=0;for(const v of src)rms+=v*v;rms=Math.sqrt(rms/n)||1;
    for(let i=0;i<n;i++)out[i]=src[i]/rms*transient(i/sr,tau,.003)*gain;return out;
  }

  function makeFoot(seed,surface){
    const ctx=getContext(),sr=ctx.sampleRate,rng=rngFor(seed),dur=surface==='asphalt'?.235:.25,out=new Float32Array(Math.floor(sr*dur));
    add(out,lowBody(rng,sr,.12,.033,surface==='asphalt'?.54:.62),0,sr);
    add(out,noiseBurst(rng,sr,.12,90,surface==='asphalt'?2100:1450,.043,.0013,surface==='asphalt'?.55:.43),0,sr);
    add(out,lowBody(rng,sr,.09,.025,.30),.052+rng()*.010,sr);
    add(out,noiseBurst(rng,sr,.11,350,surface==='asphalt'?4200:2600,.034,.001,surface==='asphalt'?.30:.22),.054+rng()*.009,sr);
    const scrape=noiseBurst(rng,sr,.105,surface==='asphalt'?1200:850,surface==='asphalt'?7200:5200,.047,.008,surface==='asphalt'?.13:.085);
    add(out,scrape,.078+rng()*.012,sr);room(out,sr,.045);return bufferFrom(finish(out,surface==='asphalt'?.49:.46));
  }

  function makeInteract(seed){
    const ctx=getContext(),sr=ctx.sampleRate,rng=rngFor(seed),out=new Float32Array(Math.floor(sr*.145));
    add(out,noiseBurst(rng,sr,.055,420,4200,.010,.0005,.58),0,sr);
    add(out,lowBody(rng,sr,.065,.018,.22),0,sr);
    add(out,noiseBurst(rng,sr,.038,900,6000,.007,.00045,.18),.021+rng()*.006,sr);
    room(out,sr,.035);return bufferFrom(finish(out,.39));
  }

  function makeBuy(seed){
    const ctx=getContext(),sr=ctx.sampleRate,rng=rngFor(seed),out=new Float32Array(Math.floor(sr*.34));
    // Coin-like impacts made from broadband metal transients, not pitched oscillators.
    for(const t of [0,.038+rng()*.012,.082+rng()*.018]){
      add(out,noiseBurst(rng,sr,.065,1450,9000,.018,.00035,.29),t,sr);
      add(out,noiseBurst(rng,sr,.075,500,2900,.028,.0005,.14),t,sr);
    }
    // Cash/paper rustle tail.
    for(let k=0;k<5;k++)add(out,noiseBurst(rng,sr,.085,850,6400,.036,.005,.075),.115+k*.032+rng()*.012,sr);
    room(out,sr,.07);return bufferFrom(finish(out,.43));
  }

  function makeDoor(seed){
    const ctx=getContext(),sr=ctx.sampleRate,rng=rngFor(seed),out=new Float32Array(Math.floor(sr*.42));
    add(out,noiseBurst(rng,sr,.055,650,5200,.010,.00045,.42),0,sr); // latch
    add(out,lowBody(rng,sr,.18,.055,.76),.045+rng()*.010,sr);      // wood thud
    add(out,noiseBurst(rng,sr,.16,90,1250,.052,.0015,.25),.047,sr);
    // soft hinge scrape: wide-band filtered noise with slow irregular envelope.
    const scrape=band(white(Math.floor(sr*.20),rng),180,2600,sr);let smooth=0;
    for(let i=0;i<scrape.length;i++){smooth+=.018*((rng()*2-1)-smooth);scrape[i]*=(.035+.025*Math.abs(smooth))*Math.exp(-(i/sr)/.15);}
    add(out,scrape,.12+rng()*.025,sr);room(out,sr,.09);return bufferFrom(finish(out,.49));
  }

  function makeReward(seed){
    const ctx=getContext(),sr=ctx.sampleRate,rng=rngFor(seed),out=new Float32Array(Math.floor(sr*.30));
    for(let k=0;k<6;k++)add(out,noiseBurst(rng,sr,.075,700,6500,.026,.004,.12),.018+k*.032+rng()*.010,sr);
    add(out,noiseBurst(rng,sr,.045,900,7200,.008,.0005,.20),.012,sr);room(out,sr,.035);return bufferFrom(finish(out,.36));
  }

  function makeDeny(seed){
    const ctx=getContext(),sr=ctx.sampleRate,rng=rngFor(seed),out=new Float32Array(Math.floor(sr*.19));
    for(const t of [0,.068]){add(out,lowBody(rng,sr,.08,.022,.44),t,sr);add(out,noiseBurst(rng,sr,.055,180,1600,.016,.0008,.17),t,sr);}
    return bufferFrom(finish(out,.34));
  }

  function buildBank(){
    if(bankReady)return true;if(!getContext())return false;
    banks.step_pavement=[101,102,103,104].map(s=>makeFoot(s,'pavement'));
    banks.step_asphalt=[201,202,203,204].map(s=>makeFoot(s,'asphalt'));
    banks.interact=[301,302,303].map(makeInteract);
    banks.buy=[401,402,403].map(makeBuy);
    banks.door=[501,502,503].map(makeDoor);
    banks.reward=[601,602].map(makeReward);
    banks.deny=[701,702].map(makeDeny);
    bankReady=true;publish();return true;
  }

  function ensureBus(){
    const ctx=getContext(),master=getMaster();if(!ctx||!master)return false;if(sfxBus)return true;
    sfxBus=ctx.createGain();sfxBus.gain.value=.96;
    highpass=ctx.createBiquadFilter();highpass.type='highpass';highpass.frequency.value=38;highpass.Q.value=.2;
    lowpass=ctx.createBiquadFilter();lowpass.type='lowpass';lowpass.frequency.value=10500;lowpass.Q.value=.18;
    limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-2.2;limiter.knee.value=0;limiter.ratio.value=14;limiter.attack.value=.001;limiter.release.value=.07;
    analyser=ctx.createAnalyser();analyser.fftSize=1024;
    sfxBus.connect(highpass);highpass.connect(lowpass);lowpass.connect(limiter);limiter.connect(analyser);analyser.connect(master);
    window.__V1110_SFX_BUS=sfxBus;window.__V1110_SFX_ANALYSER=analyser;window.__V119_SFX_BUS=sfxBus;window.__V119_SFX_ANALYSER=analyser;return true;
  }

  function metrics(){
    const out={};for(const [group,list] of Object.entries(banks))out[group]=list.map((b,i)=>({variant:i,duration:+b.duration.toFixed(4),peak:+b.__sfxPeak.toFixed(5),rms:+b.__sfxRms.toFixed(5),crestDb:+(20*Math.log10((b.__sfxPeak+1e-9)/(b.__sfxRms+1e-9))).toFixed(2)}));return out;
  }
  function state(){return {version:VERSION,engine:'pre-rendered-natural-noise-foley',bankReady,unlocked,sampleCount:Object.values(banks).reduce((n,a)=>n+a.length,0),groups:Object.fromEntries(Object.entries(banks).map(([k,v])=>[k,v.length])),playCalls,playResolved,playRejected,noRepeatViolations,lastPlayed,events:{...events},history:history.slice(-14),legacyGameplaySfxMuted:true,proceduralPerEvent:false,oscillatorGameplaySfx:false,tonalSynthesis:false,limiterCeilingDb:-2.2};}
  function publish(){window.__V1110_SFX=state();window.__V119_SFX=window.__V1110_SFX;}

  async function unlock(){
    try{await (window.__V1110_AUDIO_START||window.__V119_AUDIO_START||window.__V118_AUDIO_START||window.__V117_AUDIO_START)?.();}catch(_){}
    const ctx=getContext();if(!ctx)return false;if(ctx.state!=='running'){try{await ctx.resume();}catch(_){}}
    unlocked=ctx.state==='running'&&ensureBus()&&buildBank();publish();return unlocked;
  }
  function pick(group){const list=banks[group];if(!list?.length)return null;let idx=Math.floor(Math.random()*list.length),prev=lastVariant[group];if(list.length>1&&idx===prev)idx=(idx+1+Math.floor(Math.random()*(list.length-1)))%list.length;if(list.length>1&&idx===prev)noRepeatViolations++;lastVariant[group]=idx;return {buffer:list[idx],variant:idx};}
  function playGroup(group,volume=.8,rate=1,pan=0,cooldown=45){
    const now=performance.now();if(isMuted()||now-(lastAt[group]||0)<cooldown)return false;const ctx=getContext();
    if(!ctx||ctx.state!=='running'||!bankReady||!ensureBus()){unlock().then(ok=>{if(ok)playGroup(group,volume,rate,pan,cooldown);});return true;}
    const p=pick(group);if(!p)return false;lastAt[group]=now;playCalls++;
    try{const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=p.buffer;src.playbackRate.value=rate;g.gain.value=clamp(volume,0,1);src.connect(g);
      if(ctx.createStereoPanner){const sp=ctx.createStereoPanner();sp.pan.value=clamp(pan,-1,1);g.connect(sp);sp.connect(sfxBus);}else g.connect(sfxBus);src.start();playResolved++;
      lastPlayed={group,variant:p.variant,rate:+rate.toFixed(3),volume:+volume.toFixed(3),at:now,peak:p.buffer.__sfxPeak,rms:p.buffer.__sfxRms};history.push(lastPlayed);if(history.length>60)history.shift();publish();return true;
    }catch(err){playRejected++;lastPlayed={group,error:String(err),at:now};publish();return false;}
  }

  function step(surface='pavement'){leftFoot=!leftFoot;events.step++;const group=surface==='asphalt'?'step_asphalt':'step_pavement';playGroup(group,surface==='asphalt'?.84:.80,(leftFoot?.996:1.004)*(0.996+Math.random()*.008),leftFoot?-.025:.025,68);publish();}
  function interact(){events.interact++;playGroup('interact',.74,.997+Math.random()*.008,0,95);publish();}
  function shopOpen(){events.open++;playGroup('interact',.56,.98+Math.random()*.006,0,125);publish();}
  function close(){events.close++;playGroup('door',.72,1.008+Math.random()*.008,0,140);publish();}
  function buy(){events.buy++;playGroup('buy',.78,.997+Math.random()*.007,0,145);publish();}
  function reward(){events.reward++;playGroup('reward',.68,1,0,180);publish();}
  function door(){events.door++;playGroup('door',.82,.997+Math.random()*.006,0,160);publish();}
  function deny(){events.deny++;playGroup('deny',.64,1,0,170);publish();}
  function ui(){events.ui++;playGroup('interact',.43,1.012,0,90);publish();}
  function play(name){const map={step:()=>step('pavement'),asphalt:()=>step('asphalt'),interact,buy,reward,door,open:shopOpen,close,deny,ui};if(!map[name])return false;map[name]();return true;}

  function hookUnlock(){const fire=()=>unlock();for(const id of ['newGameBtn','continueBtn']){const el=document.getElementById(id);if(!el)continue;el.addEventListener('pointerdown',fire,{capture:true});el.addEventListener('touchstart',fire,{capture:true,passive:true});}}
  function hookControls(){document.addEventListener('pointerdown',e=>{const t=e.target instanceof Element?e.target:null;if(!t)return;if(t.closest('#act'))interact();else if(t.closest('#shopClose,#dialogClose'))close();else if(t.closest('#resetBtn'))ui();},true);document.addEventListener('keydown',e=>{if(e.repeat||e.code!=='KeyE')return;const m=document.getElementById('menu');if(m&&getComputedStyle(m).display!=='none')return;interact();},true);}
  function hookModals(){for(const [id,fn] of [['shop',shopOpen],['dialog',interact]]){const el=document.getElementById(id);if(!el)continue;let vis=getComputedStyle(el).display!=='none';new MutationObserver(()=>{const now=getComputedStyle(el).display!=='none';if(now&&!vis)fn();vis=now;}).observe(el,{attributes:true,attributeFilter:['style','class']});}}
  function hookToast(){const t=document.getElementById('toast');if(!t)return;new MutationObserver(()=>{const text=(t.textContent||'').trim(),now=performance.now();if(!text||(text===lastToast&&now-lastToastAt<650))return;lastToast=text;lastToastAt=now;if(text.startsWith('اشتريت '))buy();else if(text.includes('خلصت طلبية')&&text.includes('كسبت'))reward();else if(text.includes('رجعت بيت العيلة'))door();else if(text.includes('الفلوس مش مكفية'))deny();}).observe(t,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});}
  function hookFootsteps(){stepTimer=setInterval(()=>{if(!unlocked||!bankReady||!document.body.classList.contains('game-started')){lastCam=null;stepTravel=0;return;}const cam=window.__egyptDebug?.getCamera?.();if(!cam)return;if(lastCam){const d=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);if(d<2.5){stepTravel+=d;while(stepTravel>.70){const road=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));step(road<4.8?'asphalt':'pavement');stepTravel-=.70;}}else stepTravel=0;}lastCam={x:cam.x,z:cam.z};},90);}

  hookUnlock();hookControls();hookModals();hookToast();hookFootsteps();publish();
  window.__V1110_SFX_API={play,unlock,state,metrics,playGroup};window.__V119_SFX_API=window.__V1110_SFX_API;
  window.addEventListener('beforeunload',()=>{if(stepTimer)clearInterval(stepTimer);},{once:true});
})();