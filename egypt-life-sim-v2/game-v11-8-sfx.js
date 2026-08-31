(() => {
  'use strict';

  const VERSION='11.9';
  const banks={},lastVariant={},events={step:0,interact:0,buy:0,reward:0,door:0,open:0,close:0,deny:0,start:0,ui:0};
  let sfxBus=null,eqLow=null,eqHigh=null,compressor=null,analyser=null,bankReady=false,unlockAttempted=false,unlocked=false;
  let playCalls=0,playResolved=0,playRejected=0,lastPlayed=null,stepTimer=null,lastCam=null,stepTravel=0,leftFoot=false,lastToast='',lastToastAt=0;

  const getContext=()=>window.__V119_CONTEXT||window.__V118_CONTEXT||window.__V117_CONTEXT||window.__V116_CONTEXT||null;
  const getMaster=()=>window.__V119_MASTER||window.__V118_MASTER||window.__V117_MASTER||window.__V116_MASTER||null;
  const isMuted=()=>document.getElementById('soundToggle')?.textContent.includes('مكتوم')===true;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const makeRng=seed=>()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);

  function onePoleLow(data,cutoff,sr){
    const out=new Float32Array(data.length),a=1-Math.exp(-2*Math.PI*cutoff/sr);let y=0;
    for(let i=0;i<data.length;i++){y+=a*(data[i]-y);out[i]=y;}return out;
  }
  function bandNoise(rng,n,low,high,sr){
    const white=new Float32Array(n);for(let i=0;i<n;i++)white[i]=rng()*2-1;
    const hi=onePoleLow(white,high,sr),lo=onePoleLow(white,low,sr),out=new Float32Array(n);
    let sum=0;for(let i=0;i<n;i++){out[i]=hi[i]-lo[i];sum+=out[i]*out[i];}
    const rms=Math.sqrt(sum/Math.max(1,n))||1;for(let i=0;i<n;i++)out[i]/=rms;return out;
  }
  function env(t,tau,attack=.002){return (1-Math.exp(-t/Math.max(.0001,attack)))*Math.exp(-t/tau);}
  function add(target,startSec,source,sr,gain=1){const start=Math.floor(startSec*sr);for(let i=0;i<source.length&&start+i<target.length;i++)target[start+i]+=source[i]*gain;}
  function normalize(data,target=.72){let peak=0;for(let i=0;i<data.length;i++){data[i]=Math.tanh(data[i]*1.12);peak=Math.max(peak,Math.abs(data[i]));}const g=peak?target/peak:1;for(let i=0;i<data.length;i++)data[i]*=g;return data;}
  function audioBuffer(data){const ctx=getContext(),b=ctx.createBuffer(1,data.length,ctx.sampleRate);b.copyToChannel(data,0);return b;}

  function makeFoot(seed,surface){
    const ctx=getContext(),sr=ctx.sampleRate,rng=makeRng(seed),dur=.19+rng()*.032,n=Math.floor(sr*dur),out=new Float32Array(n);
    const tex=bandNoise(rng,n,90,surface==='asphalt'?1450:980,sr),f0=(surface==='asphalt'?108:94)*(.96+rng()*.08);
    for(let i=0;i<n;i++){
      const t=i/sr,phase=2*Math.PI*(f0*t+17*t*t),body=Math.sin(phase)*env(t,.044,.0024)*(surface==='asphalt'?.43:.52);
      out[i]+=body+tex[i]*env(t,.052,.0014)*(surface==='asphalt'?.34:.28);
    }
    const m=Math.floor(sr*.095),toe=bandNoise(rng,m,240,surface==='asphalt'?2800:1900,sr),toeData=new Float32Array(m);
    for(let i=0;i<m;i++){const t=i/sr;toeData[i]=toe[i]*env(t,.031,.0012)*(surface==='asphalt'?.22:.16)+Math.sin(2*Math.PI*(140+rng()*18)*t)*env(t,.024,.002)*.14;}
    add(out,.052+rng()*.012,toeData,sr,1);
    const sm=Math.floor(sr*.10),scr=bandNoise(rng,sm,surface==='asphalt'?1750:1250,6500,sr),scrape=new Float32Array(sm);
    for(let i=0;i<sm;i++)scrape[i]=scr[i]*Math.exp(-(i/sr)/.055)*(surface==='asphalt'?.042:.026);
    add(out,.073,scrape,sr,1);return audioBuffer(normalize(out,surface==='asphalt'?.72:.69));
  }

  function makeClick(seed){
    const ctx=getContext(),sr=ctx.sampleRate,rng=makeRng(seed),n=Math.floor(sr*.115),out=new Float32Array(n),m=Math.floor(sr*.05),noise=bandNoise(rng,m,650,4300,sr);
    for(let i=0;i<m;i++){const t=i/sr;out[i]+=noise[i]*env(t,.011,.00065)*.33+Math.sin(2*Math.PI*(1180+rng()*330)*t)*env(t,.013,.0008)*.18;}
    const m2=Math.floor(sr*.032),snap=bandNoise(rng,m2,1200,5600,sr),p=new Float32Array(m2);for(let i=0;i<m2;i++)p[i]=snap[i]*env(i/sr,.008,.0005)*.12;add(out,.028+rng()*.005,p,sr);return audioBuffer(normalize(out,.54));
  }

  function makeBuy(seed){
    const ctx=getContext(),sr=ctx.sampleRate,rng=makeRng(seed),n=Math.floor(sr*.24),out=new Float32Array(n),freqs=[1030,1580,2260,3090],amps=[.20,.15,.09,.055],taus=[.068,.054,.043,.032];
    for(let i=0;i<n;i++){const t=i/sr;for(let k=0;k<freqs.length;k++)out[i]+=Math.sin(2*Math.PI*freqs[k]*(.985+rng()*.025)*t+rng()*6.28)*env(t,taus[k],.00065)*amps[k];}
    const hit=bandNoise(rng,n,1350,6900,sr);for(let i=0;i<n;i++)out[i]+=hit[i]*env(i/sr,.016,.00035)*.075;
    const m=Math.floor(sr*.105),rust=bandNoise(rng,m,850,5200,sr),r=new Float32Array(m);for(let i=0;i<m;i++)r[i]=rust[i]*env(i/sr,.04,.005)*.038;add(out,.082,r,sr);return audioBuffer(normalize(out,.51));
  }

  function makeDoor(seed){
    const ctx=getContext(),sr=ctx.sampleRate,rng=makeRng(seed),n=Math.floor(sr*.30),out=new Float32Array(n),click=makeClickData(seed+91,sr);
    add(out,0,click,sr,.48);const m=Math.floor(sr*.20),thudNoise=bandNoise(rng,m,110,1050,sr),thud=new Float32Array(m),f=88+rng()*18;
    for(let i=0;i<m;i++){const t=i/sr;thud[i]=Math.sin(2*Math.PI*f*t)*env(t,.064,.002)*.45+thudNoise[i]*env(t,.052,.0014)*.16;}add(out,.054,thud,sr);
    for(let i=Math.floor(sr*.105);i<n;i++){const t=(i/sr-.105);out[i]+=Math.sin(2*Math.PI*(255+28*Math.sin(2*Math.PI*3.6*t))*t)*Math.exp(-t/.075)*.022;}
    return audioBuffer(normalize(out,.60));
  }
  function makeClickData(seed,sr){const rng=makeRng(seed),n=Math.floor(sr*.07),out=new Float32Array(n),noise=bandNoise(rng,n,700,4600,sr);for(let i=0;i<n;i++){const t=i/sr;out[i]=noise[i]*env(t,.012,.0006)*.30+Math.sin(2*Math.PI*(1250+rng()*240)*t)*env(t,.012,.0007)*.15;}return normalize(out,.50);}

  function makeReward(seed){
    const ctx=getContext(),sr=ctx.sampleRate,rng=makeRng(seed),n=Math.floor(sr*.235),out=new Float32Array(n);
    for(const [start,f,a] of [[0,790,.18],[.083,1010,.14]]){const m=Math.floor(sr*.085),noise=bandNoise(rng,m,750,3900,sr),tap=new Float32Array(m);for(let i=0;i<m;i++){const t=i/sr;tap[i]=Math.sin(2*Math.PI*f*(.985+rng()*.02)*t)*env(t,.024,.0007)*a+noise[i]*env(t,.014,.00055)*.065;}add(out,start,tap,sr);}
    return audioBuffer(normalize(out,.47));
  }
  function makeDeny(seed){
    const ctx=getContext(),sr=ctx.sampleRate,rng=makeRng(seed),n=Math.floor(sr*.155),out=new Float32Array(n),noise=bandNoise(rng,n,170,1350,sr),f=145+rng()*25;
    for(let i=0;i<n;i++){const t=i/sr;out[i]=Math.sin(2*Math.PI*f*t)*env(t,.042,.0014)*.36+noise[i]*env(t,.032,.001)*.12;}return audioBuffer(normalize(out,.45));
  }

  function buildBank(){
    if(bankReady)return true;const ctx=getContext();if(!ctx)return false;
    banks.step_pavement=[makeFoot(101,'pavement'),makeFoot(102,'pavement'),makeFoot(103,'pavement')];
    banks.step_asphalt=[makeFoot(201,'asphalt'),makeFoot(202,'asphalt'),makeFoot(203,'asphalt')];
    banks.interact=[makeClick(301),makeClick(302)];banks.buy=[makeBuy(401),makeBuy(402)];banks.door=[makeDoor(501),makeDoor(502)];banks.reward=[makeReward(601),makeReward(602)];banks.deny=[makeDeny(701),makeDeny(702)];
    bankReady=true;publish();return true;
  }

  function ensureBus(){
    const ctx=getContext(),master=getMaster();if(!ctx||!master)return false;if(sfxBus)return true;
    sfxBus=ctx.createGain();sfxBus.gain.value=.92;eqLow=ctx.createBiquadFilter();eqLow.type='highpass';eqLow.frequency.value=52;eqLow.Q.value=.35;
    eqHigh=ctx.createBiquadFilter();eqHigh.type='lowpass';eqHigh.frequency.value=9200;eqHigh.Q.value=.25;
    compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-19;compressor.knee.value=14;compressor.ratio.value=2.2;compressor.attack.value=.004;compressor.release.value=.12;
    analyser=ctx.createAnalyser();analyser.fftSize=512;sfxBus.connect(eqLow);eqLow.connect(eqHigh);eqHigh.connect(compressor);compressor.connect(analyser);analyser.connect(master);
    window.__V119_SFX_BUS=sfxBus;window.__V119_SFX_ANALYSER=analyser;window.__V118_SFX_BUS=sfxBus;window.__V118_SFX_ANALYSER=analyser;publish();return true;
  }

  async function unlock(){
    unlockAttempted=true;try{await (window.__V119_AUDIO_START||window.__V118_AUDIO_START)?.(false);}catch(_){}
    const ctx=getContext();if(!ctx)return false;if(ctx.state!=='running'){try{await ctx.resume();}catch(_){}}
    unlocked=ctx.state==='running'&&ensureBus()&&buildBank();publish();return unlocked;
  }

  function pick(key){const list=banks[key];if(!list?.length)return null;let i=Math.floor(Math.random()*list.length);if(list.length>1&&i===lastVariant[key])i=(i+1)%list.length;lastVariant[key]=i;return {buffer:list[i],variant:i};}
  function playKey(key,volume=.85,rate=1,pan=0){
    if(isMuted())return false;const ctx=getContext();if(!ctx||ctx.state!=='running'||!ensureBus()||!buildBank()){unlock().then(ok=>{if(ok)playKey(key,volume,rate,pan);});return true;}
    const chosen=pick(key);if(!chosen)return false;playCalls++;try{
      const src=ctx.createBufferSource(),gain=ctx.createGain();src.buffer=chosen.buffer;src.playbackRate.value=rate;gain.gain.value=clamp(volume,0,1);
      src.connect(gain);if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=clamp(pan,-1,1);gain.connect(p);p.connect(sfxBus);}else gain.connect(sfxBus);src.start();playResolved++;
      lastPlayed={key,variant:chosen.variant,rate,volume,pan,at:performance.now()};publish();return true;
    }catch(err){playRejected++;lastPlayed={key,error:String(err),at:performance.now()};publish();return false;}
  }

  function step(kind='pavement'){leftFoot=!leftFoot;events.step++;const key=kind==='asphalt'?'step_asphalt':'step_pavement',base=kind==='asphalt'?.78:.74;playKey(key,base,(leftFoot?.985:1.015)*(0.985+Math.random()*.03),leftFoot?-.045:.045);publish();}
  function interact(){events.interact++;playKey('interact',.63,.98+Math.random()*.035,0);publish();}
  function shopOpen(){events.open++;playKey('interact',.48,.90+Math.random()*.025,0);publish();}
  function close(){events.close++;playKey('door',.62,1.07+Math.random()*.03,0);publish();}
  function buy(){events.buy++;playKey('buy',.72,.985+Math.random()*.025,0);publish();}
  function reward(){events.reward++;playKey('reward',.60,.99+Math.random()*.02,0);publish();}
  function door(){events.door++;playKey('door',.70,.99+Math.random()*.025,0);publish();}
  function deny(){events.deny++;playKey('deny',.58,.98+Math.random()*.02,0);publish();}
  function startCue(){events.start++;publish();}
  function uiTap(){events.ui++;playKey('interact',.36,1.08+Math.random()*.025,0);publish();}
  function play(name){const map={step:()=>step('pavement'),asphalt:()=>step('asphalt'),interact,buy,reward,door,open:shopOpen,close,deny,start:startCue,ui:uiTap};if(!map[name])return false;map[name]();return true;}

  function hookUnlock(){const fire=()=>unlock();for(const id of ['newGameBtn','continueBtn']){const el=document.getElementById(id);if(!el)continue;el.addEventListener('pointerdown',fire,{capture:true});el.addEventListener('touchstart',fire,{capture:true,passive:true});}}
  function hookControls(){document.addEventListener('pointerdown',e=>{const t=e.target instanceof Element?e.target:null;if(!t)return;if(t.closest('#shopClose,#dialogClose'))close();else if(t.closest('#resetBtn'))uiTap();},true);}
  function hookModals(){for(const [id,fn] of [['shop',shopOpen],['dialog',interact]]){const el=document.getElementById(id);if(!el)continue;let visible=getComputedStyle(el).display!=='none';new MutationObserver(()=>{const now=getComputedStyle(el).display!=='none';if(now&&!visible)fn();visible=now;}).observe(el,{attributes:true,attributeFilter:['style','class']});}}
  function hookToast(){const toast=document.getElementById('toast');if(!toast)return;new MutationObserver(()=>{const text=(toast.textContent||'').trim(),now=performance.now();if(!text||(text===lastToast&&now-lastToastAt<650))return;lastToast=text;lastToastAt=now;if(text.startsWith('اشتريت '))buy();else if(text.includes('خلصت طلبية')&&text.includes('كسبت'))reward();else if(text.includes('رجعت بيت العيلة'))door();else if(text.includes('الفلوس مش مكفية'))deny();else if(text.includes('لفّيت في سوق الحارة'))interact();}).observe(toast,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});}
  function hookFootsteps(){stepTimer=setInterval(()=>{const ctx=getContext();if(ctx?.state!=='running'||!document.body.classList.contains('game-started')){lastCam=null;stepTravel=0;return;}const cam=window.__egyptDebug?.getCamera?.();if(!cam)return;if(lastCam){const delta=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);if(delta<2.5){stepTravel+=delta;while(stepTravel>.72){const road=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));step(road<4.8?'asphalt':'pavement');stepTravel-=.72;}}else stepTravel=0;}lastCam={x:cam.x,z:cam.z};},85);}

  function bankMetrics(){const out={};for(const [key,list] of Object.entries(banks))out[key]=list.map(b=>{const d=b.getChannelData(0);let sum=0,peak=0;for(const v of d){sum+=v*v;peak=Math.max(peak,Math.abs(v));}return {rms:Math.sqrt(sum/Math.max(1,d.length)),peak,duration:b.duration};});return out;}
  function state(){return {version:VERSION,engine:'quality-foley-buffer-bank',installed:true,bankReady,unlockAttempted,unlocked,playCalls,playResolved,playRejected,lastPlayed:lastPlayed?{...lastPlayed}:null,eventCount:Object.values(events).reduce((a,b)=>a+b,0),events:{...events},variations:Object.fromEntries(Object.entries(banks).map(([k,v])=>[k,v.length])),footsteps:true,interaction:true,purchase:true,doors:true,rewards:true,legacyHum:false,legacyHorns:false,legacyGameSfx:false,webAudioOnly:true,htmlFallback:false,proceduralBeeps:false,qualityBus:!!sfxBus};}
  function publish(){const s=state();window.__V119_SFX=s;window.__V118_SFX=s;}

  hookUnlock();hookControls();hookModals();hookToast();hookFootsteps();publish();
  window.__V119_SFX_API={play,unlock,state,playKey,buildBank,ensureBus,bankMetrics};window.__V118_SFX_API=window.__V119_SFX_API;
  window.addEventListener('beforeunload',()=>{if(stepTimer)clearInterval(stepTimer);},{once:true});
})();