(() => {
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const fail=(msg,err)=>{console.error(msg,err||'');const e=document.getElementById('errorBox');if(e){e.style.display='block';e.textContent=msg+(err?.message?': '+err.message:'');}};

  async function waitForV8(){
    for(let i=0;i<180;i++){
      const scene=window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0];
      if(scene&&window.__V8_PATCH?.version===8)return scene;
      await sleep(50);
    }
    throw new Error('V8 core did not finish booting');
  }

  const oldAnchors=[
    [-86,-18.05],[-73,-18.05],[-59,-18.05],[-44,-18.05],[-28,-18.05],[-10,-18.05],[10,-18.05],[28,-18.05],
    [46,-18.05],[64,-18.05],[82,-18.05],[-72,17.62],[-50,17.62],[-26,17.62],[4,17.62],[34,17.62]
  ];
  const movablePrefixes=[
    'v8_shopSign_','v8_rollingShutter','v8_shutterSlat','v8_awning','v8_awningStripe',
    'v8_grocerySnackBox','v8_stationeryStack','v8_bakeryRack','v8_baladiLoaf','v8_spiceSack','v8_attarJar',
    'v8_sugarCane','v8_juiceMachine','v8_juiceCup','v8_tyreStack','v8_workBench','v8_oilCan','v8_fabricRoll',
    'v8_smallSign_','v8_kosharyPot','v8_ahwaTable','v8_plasticChair','v8_teaGlass','v8_dominoBoard',
    'v8_produceCrate','v8_produce','v8_hangingBulb','v8_bulbWire'
  ];
  const isMovable=name=>movablePrefixes.some(p=>name.startsWith(p));

  function frontSlots(scene,rowZ,count){
    const buildings=scene.meshes.filter(m=>m.name==='building'&&Math.abs(m.position.z-rowZ)<2);
    buildings.sort((a,b)=>Math.abs(a.position.x)-Math.abs(b.position.x)||a.position.x-b.position.x);
    const selected=buildings.slice(0,Math.ceil(count/2));
    const slots=[];
    for(const b of selected){
      b.computeWorldMatrix(true);
      const bb=b.getBoundingInfo().boundingBox,min=bb.minimumWorld,max=bb.maximumWorld;
      const width=max.x-min.x,front=min.z-.11,offset=Math.min(5.4,width*.235);
      slots.push({x:b.position.x-offset,z:front,building:b.name,buildingX:b.position.x,rowZ});
      slots.push({x:b.position.x+offset,z:front,building:b.name,buildingX:b.position.x,rowZ});
    }
    return slots.slice(0,count);
  }

  function nearestRoadDistance(z){
    return Math.min(...[-72,-24,24,72].map(r=>Math.abs(z-r)));
  }

  function loadV10(){
    if(document.querySelector('script[data-egypt-v10]'))return;
    const s=document.createElement('script');
    s.src='game-v10.js?v=10';
    s.dataset.egyptV10='true';
    s.async=false;
    s.onerror=()=>fail('V10 script failed to load');
    document.body.appendChild(s);
  }

  function loadV9Facades(){
    if(document.querySelector('script[data-egypt-v9-facades]')){
      if(window.__V9_FACADES?.blankSidesFilled)loadV10();
      return;
    }
    const s=document.createElement('script');
    s.src='game-v9-facades.js?v=9';
    s.dataset.egyptV9Facades='true';
    s.async=false;
    s.onload=loadV10;
    s.onerror=()=>fail('V9 facade script failed to load');
    document.body.appendChild(s);
  }

  function loadV9CharacterPolish(){
    if(document.querySelector('script[data-egypt-v9-character-polish]')){
      if(window.__V9_POLISH?.silhouette==='capsule-human')loadV9Facades();
      return;
    }
    const s=document.createElement('script');
    s.src='game-v9-character-polish.js?v=9';
    s.dataset.egyptV9CharacterPolish='true';
    s.async=false;
    s.onload=loadV9Facades;
    s.onerror=()=>fail('V9 character polish script failed to load');
    document.body.appendChild(s);
  }

  function loadV9GaitFix(){
    if(document.querySelector('script[data-egypt-v9-gaitfix]')){
      if(window.__V9_GAITFIX?.naturalAnkleRange)loadV9CharacterPolish();
      return;
    }
    const s=document.createElement('script');
    s.src='game-v9-gaitfix.js?v=9';
    s.dataset.egyptV9Gaitfix='true';
    s.async=false;
    s.onload=loadV9CharacterPolish;
    s.onerror=()=>fail('V9 gait fix script failed to load');
    document.body.appendChild(s);
  }

  function loadV9(){
    if(document.querySelector('script[data-egypt-v9]')){
      if(window.__V9_PATCH?.version===9)loadV9GaitFix();
      return;
    }
    const script=document.createElement('script');
    script.src='game-v9.js?v=9';
    script.dataset.egyptV9='true';
    script.async=false;
    script.onload=loadV9GaitFix;
    script.onerror=()=>fail('V9 script failed to load');
    document.body.appendChild(script);
  }

  async function boot(){
    try{
      const scene=await waitForV8();
      const slots=[...frontSlots(scene,0,8),...frontSlots(scene,48,8)];
      if(slots.length!==16)throw new Error('Not enough real facade slots: '+slots.length);
      const moved=new Set();
      const clusters=[];
      for(let i=0;i<oldAnchors.length;i++){
        const [ox,oz]=oldAnchors[i],slot=slots[i],dx=slot.x-ox,dz=slot.z-oz;
        const cluster=[];
        for(const mesh of scene.meshes){
          if(moved.has(mesh)||!isMovable(mesh.name)||mesh.position.y>4.2)continue;
          const dist=Math.hypot(mesh.position.x-ox,mesh.position.z-oz);
          if(dist<=3.45){mesh.position.x+=dx;mesh.position.z+=dz;moved.add(mesh);cluster.push(mesh.name);}
        }
        clusters.push({index:i,from:{x:ox,z:oz},to:{x:slot.x,z:slot.z},moved:cluster.length,roadDistance:nearestRoadDistance(slot.z)});
      }

      const shopSigns=scene.meshes.filter(m=>m.name.startsWith('v8_shopSign_'));
      const roadDistances=shopSigns.map(m=>nearestRoadDistance(m.position.z));
      const minRoadDistance=Math.min(...roadDistances);
      const orphanSigns=shopSigns.filter(s=>nearestRoadDistance(s.position.z)<7.15).length;
      window.__V8_LAYOUT={version:1,facadeAnchored:true,movedMeshes:moved.size,clusters,minRoadDistance,orphanSigns};
      window.__V8_PATCH.layout='building-facade-anchored';
      if(window.__egyptDebug){
        window.__egyptDebug.v8LayoutState=()=>({...window.__V8_LAYOUT,clusters:clusters.map(c=>({...c}))});
      }
      loadV9();
    }catch(err){fail('V8 facade layout failed',err);}
  }
  boot();
})();