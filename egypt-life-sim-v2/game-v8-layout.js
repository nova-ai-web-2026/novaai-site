(() => {
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const fail=(msg,err)=>{console.error(msg,err||'');const e=document.getElementById('errorBox');if(e){e.style.display='block';e.textContent=msg+(err?.message?': '+err.message:'');}};

  // V11.6: capture the real browser AudioContext before later polish scripts can
  // wrap it, and arm audio before the player can press Start. Also keep the HUD
  // hidden and block game entry until the full patch chain is ready.
  const NativeAudioContext=window.AudioContext||window.webkitAudioContext;
  let v116Ctx=null,v116Master=null,v116Analyser=null,v116Road=null,v116Timer=null,v116Starting=false,v116Last=null,v116Step=0;
  function v116Noise(seconds=.5){
    const b=v116Ctx.createBuffer(1,Math.max(1,Math.floor(v116Ctx.sampleRate*seconds)),v116Ctx.sampleRate),d=b.getChannelData(0);let brown=0;
    for(let i=0;i<d.length;i++){const w=Math.random()*2-1;brown=brown*.991+w*.009;d[i]=brown*.82+w*.07;}return b;
  }
  function v116Foley(freq=480,vol=.07,dur=.075){
    if(!v116Ctx||!v116Master)return;const s=v116Ctx.createBufferSource(),f=v116Ctx.createBiquadFilter(),g=v116Ctx.createGain(),t=v116Ctx.currentTime;
    s.buffer=v116Noise(.11);f.type='bandpass';f.frequency.value=freq;f.Q.value=.72;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(v116Master);s.start(t);s.stop(t+dur+.03);
  }
  function silenceOldAudio(){
    for(const key of ['__V11_LEGACY_MASTER','__V11_OWN_MASTER','__V111_SUPERSEDED_MASTER','__V112_MASTER']){
      const g=window[key];if(!g||g===v116Master||g.__v116Muted)continue;try{g.gain?.setTargetAtTime?.(0,g.context?.currentTime||v116Ctx?.currentTime||0,.01);}catch(_){}try{g.disconnect();g.__v116Muted=true;}catch(_){}
    }
  }
  async function startV116Audio(){
    if(v116Starting)return;v116Starting=true;
    try{
      if(!NativeAudioContext)throw new Error('Web Audio unavailable');
      if(!v116Ctx){
        v116Ctx=new NativeAudioContext({latencyHint:'interactive'});v116Master=v116Ctx.createGain();v116Master.gain.value=.72;v116Analyser=v116Ctx.createAnalyser();v116Analyser.fftSize=512;v116Master.connect(v116Analyser);v116Analyser.connect(v116Ctx.destination);
        const road=v116Ctx.createBufferSource(),lp=v116Ctx.createBiquadFilter(),rg=v116Ctx.createGain();road.buffer=v116Noise(7);road.loop=true;lp.type='lowpass';lp.frequency.value=330;rg.gain.value=.13;road.connect(lp);lp.connect(rg);rg.connect(v116Master);road.start();v116Road=rg;
        const air=v116Ctx.createBufferSource(),bp=v116Ctx.createBiquadFilter(),ag=v116Ctx.createGain();air.buffer=v116Noise(8);air.loop=true;bp.type='bandpass';bp.frequency.value=780;bp.Q.value=.38;ag.gain.value=.013;air.connect(bp);bp.connect(ag);ag.connect(v116Master);air.start();
        window.__V116_CONTEXT=v116Ctx;window.__V116_MASTER=v116Master;window.__V116_ANALYSER=v116Analyser;
        v116Timer=setInterval(()=>{
          silenceOldAudio();if(v116Ctx?.state==='suspended')v116Ctx.resume().catch(()=>{});
          const cam=window.__egyptDebug?.getCamera?.();if(!cam||!v116Road)return;const d=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));v116Road.gain.setTargetAtTime(d<10?.16:.095,v116Ctx.currentTime,.4);
          if(v116Last){v116Step+=Math.hypot(cam.x-v116Last.x,cam.z-v116Last.z);if(v116Step>.78){v116Foley(d>4.8&&d<8.1?700:420,.052,.065);v116Step=0;}}v116Last={x:cam.x,z:cam.z};
        },80);
      }
      if(v116Ctx.state!=='running')await v116Ctx.resume();
      v116Foley(360,.13,.1);setTimeout(()=>v116Foley(650,.075,.065),115);silenceOldAudio();
      window.__V116_AUDIO={version:'11.6',engine:'early-native-audiocontext',armed:true,started:true,contextState:v116Ctx.state,masterGain:.72,lateGestureRequired:false,hornEvents:false,oscillatorTones:false};
    }catch(err){console.error('V11.6 early audio failed',err);window.__V116_AUDIO={version:'11.6',engine:'early-native-audiocontext',armed:true,started:false,error:String(err)};}
    finally{v116Starting=false;}
  }
  function installV116StartGate(){
    if(document.getElementById('v116-startup-style'))return;
    const style=document.createElement('style');style.id='v116-startup-style';style.textContent='body.v116-menu-open #hud{visibility:hidden!important}body.v116-menu-open #menu{opacity:1!important;visibility:visible!important;transition:none!important}body.v116-menu-open #newGameBtn,body.v116-menu-open #continueBtn{transition:none!important}';document.head.appendChild(style);document.body.classList.add('v116-menu-open');
    window.__V116_READY=false;window.__V116_AUDIO={version:'11.6',engine:'early-native-audiocontext',armed:true,started:false,contextState:null,masterGain:.72,lateGestureRequired:false,hornEvents:false,oscillatorTones:false};
    const status=document.getElementById('menuStatus');if(status)status.textContent='جاري تجهيز اللعبة…';
    for(const id of ['newGameBtn','continueBtn']){
      const el=document.getElementById(id);if(!el)continue;
      el.addEventListener('pointerdown',()=>startV116Audio(),{capture:true});
      el.addEventListener('touchstart',()=>startV116Audio(),{capture:true,passive:true});
      el.addEventListener('click',()=>startV116Audio(),{capture:true});
      el.addEventListener('click',e=>{if(window.__V116_READY)return;e.preventDefault();e.stopImmediatePropagation();if(status)status.textContent='ثانية واحدة… بنجهز الشارع والصوت.';},{capture:true});
      el.addEventListener('click',()=>{if(window.__V116_READY)document.body.classList.remove('v116-menu-open');},{capture:true});
    }
    const toggle=document.getElementById('soundToggle');toggle?.addEventListener('click',()=>setTimeout(()=>{if(!v116Master||!v116Ctx)return;const muted=toggle.textContent.includes('مكتوم');v116Master.gain.setTargetAtTime(muted?0:.72,v116Ctx.currentTime,.05);},0));
    window.__V116_AUDIO_START=startV116Audio;
  }
  function markV116Ready(){
    window.__V116_READY=true;const status=document.getElementById('menuStatus');if(status&&/جاري تجهيز|ثانية واحدة/.test(status.textContent))status.textContent='جاهز — ابدأ يوم جديد.';
    const kicker=document.querySelector('.kicker');if(kicker)kicker.textContent='HAYAT MASR • V11.6';const foot=document.querySelector('.menuFoot');if(foot)foot.textContent='V11.6 — stable startup + early native audio';
    window.__V116_STARTUP={version:'11.6',earlyGate:true,ready:true,hudHiddenUntilStart:true,audioArmedBeforePatches:true};
  }
  installV116StartGate();

  async function waitForV8(){
    for(let i=0;i<180;i++){
      const scene=window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0];
      if(scene&&window.__V8_PATCH?.version===8)return scene;
      await sleep(50);
    }
    throw new Error('V8 core did not finish booting');
  }

  const oldAnchors=[[-86,-18.05],[-73,-18.05],[-59,-18.05],[-44,-18.05],[-28,-18.05],[-10,-18.05],[10,-18.05],[28,-18.05],[46,-18.05],[64,-18.05],[82,-18.05],[-72,17.62],[-50,17.62],[-26,17.62],[4,17.62],[34,17.62]];
  const movablePrefixes=['v8_shopSign_','v8_rollingShutter','v8_shutterSlat','v8_awning','v8_awningStripe','v8_grocerySnackBox','v8_stationeryStack','v8_bakeryRack','v8_baladiLoaf','v8_spiceSack','v8_attarJar','v8_sugarCane','v8_juiceMachine','v8_juiceCup','v8_tyreStack','v8_workBench','v8_oilCan','v8_fabricRoll','v8_smallSign_','v8_kosharyPot','v8_ahwaTable','v8_plasticChair','v8_teaGlass','v8_dominoBoard','v8_produceCrate','v8_produce','v8_hangingBulb','v8_bulbWire'];
  const isMovable=name=>movablePrefixes.some(p=>name.startsWith(p));

  function frontSlots(scene,rowZ,count){
    const buildings=scene.meshes.filter(m=>m.name==='building'&&Math.abs(m.position.z-rowZ)<2);
    buildings.sort((a,b)=>Math.abs(a.position.x)-Math.abs(b.position.x)||a.position.x-b.position.x);
    const selected=buildings.slice(0,Math.ceil(count/2)),slots=[];
    for(const b of selected){
      b.computeWorldMatrix(true);const bb=b.getBoundingInfo().boundingBox,min=bb.minimumWorld,max=bb.maximumWorld;
      const width=max.x-min.x,front=min.z-.11,offset=Math.min(5.4,width*.235);
      slots.push({x:b.position.x-offset,z:front,building:b.name,buildingX:b.position.x,rowZ});
      slots.push({x:b.position.x+offset,z:front,building:b.name,buildingX:b.position.x,rowZ});
    }
    return slots.slice(0,count);
  }
  function nearestRoadDistance(z){return Math.min(...[-72,-24,24,72].map(r=>Math.abs(z-r)));}

  function loadV11AudioFix(){
    if(document.querySelector('script[data-egypt-v11-audiofix]')){markV116Ready();return;}
    const s=document.createElement('script');s.src='game-v11-audiofix.js?v=11.6';s.dataset.egyptV11Audiofix='true';s.async=false;s.onload=markV116Ready;s.onerror=()=>fail('V11 audio fix failed to load');document.body.appendChild(s);
  }
  function loadV111(){
    if(document.querySelector('script[data-egypt-v111]')){if(window.__V111_PATCH?.version==='11.1')loadV11AudioFix();return;}
    const s=document.createElement('script');s.src='game-v11-1.js?v=11.1';s.dataset.egyptV111='true';s.async=false;s.onload=loadV11AudioFix;s.onerror=()=>fail('V11.1 script failed to load');document.body.appendChild(s);
  }
  function loadV11(){
    if(document.querySelector('script[data-egypt-v11]')){if(window.__V11_PATCH?.version===11)loadV111();return;}
    const s=document.createElement('script');s.src='game-v11.js?v=11';s.dataset.egyptV11='true';s.async=false;s.onload=loadV111;s.onerror=()=>fail('V11 script failed to load');document.body.appendChild(s);
  }
  function loadV10(){
    if(document.querySelector('script[data-egypt-v10]')){loadV11();return;}
    const s=document.createElement('script');s.src='game-v10.js?v=10';s.dataset.egyptV10='true';s.async=false;s.onload=loadV11;s.onerror=()=>fail('V10 script failed to load');document.body.appendChild(s);
  }
  function loadV9Facades(){
    if(document.querySelector('script[data-egypt-v9-facades]'))return;
    const s=document.createElement('script');s.src='game-v9-facades.js?v=9';s.dataset.egyptV9Facades='true';s.async=false;s.onerror=()=>fail('V9 facade script failed to load');document.body.appendChild(s);
  }
  function afterCharacterPolish(){loadV10();loadV9Facades();}
  function loadV9CharacterPolish(){
    if(document.querySelector('script[data-egypt-v9-character-polish]')){
      if(window.__V9_POLISH?.silhouette==='capsule-human')afterCharacterPolish();
      return;
    }
    const s=document.createElement('script');s.src='game-v9-character-polish.js?v=9';s.dataset.egyptV9CharacterPolish='true';s.async=false;s.onload=afterCharacterPolish;s.onerror=()=>fail('V9 character polish script failed to load');document.body.appendChild(s);
  }
  function loadV9GaitFix(){
    if(document.querySelector('script[data-egypt-v9-gaitfix]')){if(window.__V9_GAITFIX?.naturalAnkleRange)loadV9CharacterPolish();return;}
    const s=document.createElement('script');s.src='game-v9-gaitfix.js?v=9';s.dataset.egyptV9Gaitfix='true';s.async=false;s.onload=loadV9CharacterPolish;s.onerror=()=>fail('V9 gait fix script failed to load');document.body.appendChild(s);
  }
  function loadV9(){
    if(document.querySelector('script[data-egypt-v9]')){if(window.__V9_PATCH?.version===9)loadV9GaitFix();return;}
    const script=document.createElement('script');script.src='game-v9.js?v=9';script.dataset.egyptV9='true';script.async=false;script.onload=loadV9GaitFix;script.onerror=()=>fail('V9 script failed to load');document.body.appendChild(script);
  }

  async function boot(){
    try{
      const scene=await waitForV8();const slots=[...frontSlots(scene,0,8),...frontSlots(scene,48,8)];
      if(slots.length!==16)throw new Error('Not enough real facade slots: '+slots.length);
      const moved=new Set(),clusters=[];
      for(let i=0;i<oldAnchors.length;i++){
        const [ox,oz]=oldAnchors[i],slot=slots[i],dx=slot.x-ox,dz=slot.z-oz,cluster=[];
        for(const mesh of scene.meshes){
          if(moved.has(mesh)||!isMovable(mesh.name)||mesh.position.y>4.2)continue;
          if(Math.hypot(mesh.position.x-ox,mesh.position.z-oz)<=3.45){mesh.position.x+=dx;mesh.position.z+=dz;moved.add(mesh);cluster.push(mesh.name);}
        }
        clusters.push({index:i,from:{x:ox,z:oz},to:{x:slot.x,z:slot.z},moved:cluster.length,roadDistance:nearestRoadDistance(slot.z)});
      }
      const shopSigns=scene.meshes.filter(m=>m.name.startsWith('v8_shopSign_')),roadDistances=shopSigns.map(m=>nearestRoadDistance(m.position.z));
      const minRoadDistance=Math.min(...roadDistances),orphanSigns=shopSigns.filter(s=>nearestRoadDistance(s.position.z)<7.15).length;
      window.__V8_LAYOUT={version:1,facadeAnchored:true,movedMeshes:moved.size,clusters,minRoadDistance,orphanSigns};window.__V8_PATCH.layout='building-facade-anchored';
      if(window.__egyptDebug)window.__egyptDebug.v8LayoutState=()=>({...window.__V8_LAYOUT,clusters:clusters.map(c=>({...c}))});
      loadV9();
    }catch(err){fail('V8 facade layout failed',err);}
  }
  boot();
})();