(() => {
  'use strict';

  let ctx=null,bus=null,analyser=null,lastCam=null,travel=0,timer=null,lastUi=0;
  const counts={step:0,runStep:0,interact:0,open:0,buy:0,ui:0,close:0,work:0};
  const rand=(a,b)=>a+Math.random()*(b-a);

  function ensure(){
    ctx=window.__V116_CONTEXT||ctx;
    if(!ctx||ctx.state!=='running')return false;
    if(bus)return true;
    bus=ctx.createGain();bus.gain.value=.92;
    analyser=ctx.createAnalyser();analyser.fftSize=512;
    bus.connect(analyser);analyser.connect(ctx.destination);
    window.__V117_SFX_BUS=bus;window.__V117_SFX_ANALYSER=analyser;
    return true;
  }

  function noiseBuffer(seconds=.12,decay=1){
    const n=Math.max(1,Math.floor(ctx.sampleRate*seconds)),b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);
    let brown=0;
    for(let i=0;i<n;i++){
      const white=Math.random()*2-1;brown=brown*.975+white*.025;
      const env=Math.pow(1-i/n,decay);d[i]=(brown*.72+white*.28)*env;
    }
    return b;
  }

  function burst({freq=500,q=.8,vol=.15,dur=.08,type='bandpass',delay=0,brightness=.2}={}){
    if(!ensure())return;
    const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),t=ctx.currentTime+delay;
    src.buffer=noiseBuffer(Math.max(.05,dur+.05),1.2);f.type=type;f.frequency.value=freq;f.Q.value=q;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    src.connect(f);f.connect(g);g.connect(bus);src.start(t);src.stop(t+dur+.05);
  }

  function thump(vol=.18,delay=0){burst({freq:170,q:.65,vol,dur:.095,type:'lowpass',delay});}
  function click(vol=.08,delay=0){burst({freq:1350,q:1.25,vol,dur:.035,type:'bandpass',delay});}
  function metal(vol=.09,delay=0){burst({freq:1900,q:2.1,vol,dur:.045,type:'bandpass',delay});}

  function step(surface='dust',running=false){
    if(!ensure())return;
    const asphalt=surface==='road';
    thump(running?.18:.135,0);
    burst({freq:asphalt?720:430,q:.7,vol:running?.14:.095,dur:running?.055:.07,type:'bandpass',delay:.018});
    if(running)burst({freq:asphalt?980:610,q:.8,vol:.07,dur:.035,type:'bandpass',delay:.052});
    counts[running?'runStep':'step']++;
  }

  function interact(){if(!ensure())return;thump(.14);click(.075,.045);counts.interact++;}
  function open(){if(!ensure())return;thump(.12);burst({freq:840,q:.9,vol:.09,dur:.055,type:'bandpass',delay:.05});counts.open++;}
  function close(){if(!ensure())return;burst({freq:310,q:.7,vol:.13,dur:.075,type:'bandpass'});click(.055,.035);counts.close++;}
  function buy(){if(!ensure())return;click(.11);metal(.105,.045);metal(.075,.095);thump(.075,.13);counts.buy++;}
  function work(){if(!ensure())return;thump(.12);click(.08,.04);burst({freq:980,q:1.1,vol:.07,dur:.05,type:'bandpass',delay:.09});counts.work++;}
  function ui(){if(!ensure())return;const now=performance.now();if(now-lastUi<45)return;lastUi=now;click(.055);counts.ui++;}

  function surfaceFor(cam){
    const road=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));
    return road<4.9?'road':'dust';
  }

  function startMovementSfx(){
    if(timer)return;
    timer=setInterval(()=>{
      if(!ensure())return;
      const cam=window.__egyptDebug?.getCamera?.();if(!cam)return;
      if(lastCam){
        const d=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);travel+=d;
        const running=d>.42;const threshold=running?.92:.72;
        if(travel>=threshold){step(surfaceFor(cam),running);travel=0;}
      }
      lastCam={x:cam.x,z:cam.z};
    },120);
  }

  function toastEffect(text){
    text=String(text||'').trim();if(!text)return;
    if(text.startsWith('اشتريت'))buy();
    else if(text.includes('كسبت'))work();
    else if(text.includes('رجعت بيت'))close();
  }

  const toast=document.getElementById('toast');
  if(toast)new MutationObserver(()=>toastEffect(toast.textContent)).observe(toast,{childList:true,subtree:true,characterData:true});

  document.addEventListener('pointerdown',e=>{
    const t=e.target?.closest?.('button');if(!t)return;
    if(t.id==='act'){if(document.getElementById('prompt')?.classList.contains('show'))interact();return;}
    if(t.id==='shopClose'||t.id==='dialogClose'){close();return;}
    if(t.closest('#shopItems'))return;
    ui();
  },true);

  document.addEventListener('keydown',e=>{
    if((e.key==='e'||e.key==='E')&&document.getElementById('prompt')?.classList.contains('show'))interact();
  },true);

  for(const id of ['shop','dialog']){
    const el=document.getElementById(id);if(!el)continue;
    let was=false;
    new MutationObserver(()=>{const now=getComputedStyle(el).display!=='none';if(now&&!was)open();was=now;}).observe(el,{attributes:true,attributeFilter:['style','class']});
  }

  for(const id of ['newGameBtn','continueBtn'])document.getElementById(id)?.addEventListener('click',()=>setTimeout(()=>{ensure();startMovementSfx();},0),false);

  const toggle=document.getElementById('soundToggle');
  if(toggle)new MutationObserver(()=>{if(!bus||!ctx)return;const muted=toggle.textContent.includes('مكتوم');bus.gain.setTargetAtTime(muted?0:.92,ctx.currentTime,.04);}).observe(toggle,{childList:true,subtree:true,characterData:true});

  window.__V117_SFX={version:'11.7',engine:'gameplay-foley-sfx',types:['step','runStep','interact','open','buy','ui','close','work'],counts};
  window.__egyptDebug=window.__egyptDebug||{};
  window.__egyptDebug.v117SfxState=()=>({version:'11.7',ctx:ctx?.state||null,bus:bus?.gain?.value??null,counts:{...counts},types:[...window.__V117_SFX.types]});
  window.__egyptDebug.playV117Sfx=name=>({step:()=>step('road',false),runStep:()=>step('dust',true),interact,open,buy,ui,close,work}[name]?.());

  window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer);},{once:true});
})();
