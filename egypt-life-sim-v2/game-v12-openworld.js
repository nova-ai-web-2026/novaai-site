(() => {
  'use strict';

  const VERSION='12.0';
  const scene=window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0];
  const player=scene?.getCameraByName?.('player') || scene?.activeCamera;
  if(!scene||!player){
    console.error('V12 world could not start: scene/player missing');
    window.__V12_WORLD={version:VERSION,ready:false,error:'scene/player missing'};
    return;
  }

  const B=window.BABYLON;
  const meshes=[];
  const mats=new Map();
  const movers=[];
  const HOME={x:-164,z:-164,spawnX:-164,spawnZ:-158.8};
  let worldReady=false, queuedButton=null, bypassStart=false, introRunning=false;

  const mat=(name,hex,emit='')=>{
    const key=name+hex+emit;
    if(mats.has(key))return mats.get(key);
    const m=new B.StandardMaterial('v12_mat_'+name+'_'+mats.size,scene);
    m.diffuseColor=B.Color3.FromHexString(hex);
    m.specularColor=new B.Color3(.025,.025,.025);
    if(emit)m.emissiveColor=B.Color3.FromHexString(emit);
    mats.set(key,m);return m;
  };
  const box=(name,w,h,d,x,y,z,material,collision=false,rot=0)=>{
    const m=B.MeshBuilder.CreateBox('v12_'+name,{width:w,height:h,depth:d},scene);
    m.position.set(x,y,z);m.rotation.y=rot;m.material=material;m.checkCollisions=collision;m.isPickable=false;meshes.push(m);return m;
  };
  const cyl=(name,dia,h,x,y,z,material,tess=12,collision=false)=>{
    const m=B.MeshBuilder.CreateCylinder('v12_'+name,{diameter:dia,height:h,tessellation:tess},scene);
    m.position.set(x,y,z);m.material=material;m.checkCollisions=collision;m.isPickable=false;meshes.push(m);return m;
  };
  const plane=(name,w,h,x,y,z,material,rotY=0)=>{
    const m=B.MeshBuilder.CreatePlane('v12_'+name,{width:w,height:h},scene);m.position.set(x,y,z);m.rotation.y=rotY;m.material=material;m.isPickable=false;meshes.push(m);return m;
  };
  function sign(name,text,x,y,z,w=5,h=.72,bg='#315d48',rot=Math.PI){
    const tex=new B.DynamicTexture('v12_tex_'+name,{width:1024,height:180},scene,false),c=tex.getContext();
    c.clearRect(0,0,1024,180);c.fillStyle=bg;c.fillRect(0,0,1024,180);c.fillStyle='#fff3dc';c.font='700 66px Tahoma, Arial, sans-serif';c.textAlign='center';c.textBaseline='middle';c.direction='rtl';c.fillText(text,512,92);tex.update();
    const sm=new B.StandardMaterial('v12_signmat_'+name,scene);sm.diffuseTexture=tex;sm.emissiveColor=new B.Color3(.045,.04,.032);sm.backFaceCulling=false;
    return plane('sign_'+name,w,h,x,y,z,sm,rot);
  }
  const torus=(name,dia,thick,x,y,z,material)=>{
    const t=B.MeshBuilder.CreateTorus('v12_'+name,{diameter:dia,thickness:thick,tessellation:14},scene);t.position.set(x,y,z);t.rotation.x=Math.PI/2;t.material=material;t.isPickable=false;meshes.push(t);return t;
  };

  function addWorldGroundAndRoads(){
    const dust=mat('outerGround','#9f9277'),road=mat('road','#454644'),walk=mat('walk','#a79e91'),curb=mat('curb','#c8c0b5'),stripe=mat('stripe','#ded9cc');
    const ground=B.MeshBuilder.CreateGround('v12_openWorldGround',{width:390,height:390},scene);ground.position.y=-.035;ground.material=dust;ground.checkCollisions=false;ground.isPickable=false;meshes.push(ground);

    const roadH=(z,x,w)=>{box('roadH',w,.06,9.5,x,.025,z,road,false);box('walkH1',w,.14,2.15,x,.07,z-5.85,walk);box('walkH2',w,.14,2.15,x,.07,z+5.85,walk);box('curbH1',w,.18,.16,x,.09,z-4.82,curb);box('curbH2',w,.18,.16,x,.09,z+4.82,curb);for(let dx=-w/2+5;dx<w/2;dx+=10)box('dashH',3.2,.02,.1,x+dx,.066,z,stripe);};
    const roadV=(x,z,d)=>{box('roadV',9.5,.06,d,x,.026,z,road,false);box('walkV1',2.15,.14,d,x-5.85,.07,z,walk);box('walkV2',2.15,.14,d,x+5.85,.07,z,walk);box('curbV1',.16,.18,d,x-4.82,.09,z,curb);box('curbV2',.16,.18,d,x+4.82,.09,z,curb);for(let dz=-d/2+5;dz<d/2;dz+=10)box('dashV',.1,.02,3.2,x,.066,z+dz,stripe);};

    for(const z of [-72,-24,24,72]){roadH(z,-149,82);roadH(z,149,82);}
    for(const x of [-72,-24,24,72]){roadV(x,-149,82);roadV(x,149,82);}
    roadV(-144,0,380);roadV(144,0,380);roadH(-144,0,380);roadH(144,0,380);
    box('alleyHome',7,.045,78,-168,.026,-145,mat('alley','#575551'));
    box('alleyWest',88,.045,7,-145,.027,-112,mat('alley2','#585651'));
    box('alleyEast',84,.045,7,145,.027,112,mat('alley3','#585651'));
  }

  function addRoofLife(x,z,w,d,h,seed){
    const tank=mat('tank','#bab5a6'),metal=mat('dish','#777772'),brick=mat('brick','#aa765b');
    if(seed%2===0)cyl('waterTank',1.55,1.25,x+w*.18,h+.72,z+d*.12,tank,14);
    const pole=cyl('dishPole',.06,1.1,x-w*.22,h+.55,z-d*.14,metal,8);pole.rotation.z=.05;
    const dish=B.MeshBuilder.CreateDisc('v12_satDish',{radius:.62,tessellation:20},scene);dish.position.set(x-w*.22,h+1.05,z-d*.14);dish.rotation.x=Math.PI/2.35;dish.rotation.z=(seed%3-.8)*.18;dish.material=metal;dish.isPickable=false;meshes.push(dish);
    if(seed%3===0){for(let i=0;i<4;i++)box('unfinishedBrick',.42,.65,.24,x-w*.35+i*.48,h+.34,z+d*.28,brick);}
  }

  function addApartment(x,z,w,d,floors,seed,shop=false){
    const palette=['#c4a98a','#baa080','#d0b99a','#b9987b','#c7b6a0','#b9a58d'];
    const wall=mat('apt'+seed,palette[seed%palette.length]),dark=mat('window','#26343b','#091014'),rail=mat('rail','#575651');
    const h=floors*3.0;box('apartment',w,h,d,x,h/2,z,wall,true);
    for(let f=1;f<floors;f++){
      const y=f*3-1.2;
      for(const sx of [-.28,.28]){
        const wx=x+sx*w,front=z-d/2-.04;box('window',1.45,1.25,.06,wx,y,front,dark);box('balconySlab',3,.12,1.05,wx,y-.82,front-.48,wall);box('balconyRail',3,.58,.05,wx,y-.51,front-.98,rail);
        if((f+seed+(sx>0?1:0))%3===0){box('laundryLine',2.6,.025,.025,wx,y-.18,front-1.01,rail);for(let c=0;c<3;c++){const cloth=box('laundryCloth',.56,.63,.03,wx-.75+c*.75,y-.53,front-1.02,mat('cloth'+c,['#c86d5f','#4f7296','#d7c46c'][c]));cloth.rotation.z=(c-1)*.03;}}
      }
    }
    for(let f=1;f<Math.min(floors,5);f+=2){box('acUnit',.86,.48,.36,x+w*.35,f*3-.72,z-d/2-.22,mat('ac','#d0cfc7'));}
    addRoofLife(x,z,w,d,h,seed);
    if(shop){
      const names=['بقالة المدينة','مخبز بلدي','موبايلات الحارة','مغسلة وكي','أدوات منزلية','عصير وقصب','ورشة كهرباء','سوبر ماركت'];
      const shopName=names[seed%names.length];
      box('shopFront',Math.min(5.8,w*.52),2.35,.16,x,1.2,z-d/2-.12,mat('shopfront'+seed,['#4e6c55','#81513b','#3f6477','#6c5546'][seed%4]));
      sign('districtShop'+seed,shopName,x,2.7,z-d/2-.23,Math.min(5.4,w*.48),.62,['#315d48','#80503a','#315f78','#684a38'][seed%4],Math.PI);
      const aw=box('awning',Math.min(5.6,w*.5),.12,1.15,x,2.35,z-d/2-.82,mat('awning'+seed,seed%2?'#8f4939':'#43674e'));aw.rotation.x=-.1;
      for(let i=0;i<3;i++)box('streetCrate',.75,.28,.55,x-1+i*.95,.18,z-d/2-1.35,mat('crate','#77553c'));
    }
  }

  function addDistricts(){
    const west=[[-170,-72,15,20,6],[-144,-72,16,20,7],[-118,-72,15,20,5],[-170,-24,15,22,6],[-144,-24,16,22,6],[-118,-24,15,22,5],[-170,24,15,22,7],[-118,24,15,22,6]];
    west.forEach((p,i)=>addApartment(...p,30+i,i%2===0));
    sign('westDistrict','الحي السكني',-144,4.2,-98,7,.8,'#315f78',0);

    const east=[[118,-72,15,20,5],[144,-72,16,20,6],[170,-72,15,20,6],[118,-24,15,20,5],[170,-24,15,20,7],[118,24,15,20,6],[144,24,16,20,5],[170,24,15,20,6]];
    east.forEach((p,i)=>addApartment(...p,60+i,true));
    sign('eastDistrict','الميدان',144,4.25,-98,6.5,.8,'#7b4d31',0);
    addMarketSquare();

    [[-72,170,18,15,5],[-24,170,18,15,6],[24,170,18,15,5],[72,170,18,15,6],[-72,118,18,15,5],[-24,118,18,15,5],[24,118,18,15,6],[72,118,18,15,5]].forEach((p,i)=>addApartment(...p,90+i,i%2===1));
    addWorkshopStrip();
  }

  function addMarketSquare(){
    const wood=mat('marketWood','#75523a'),produce=['#b6503e','#6d9457','#d7b54f','#8d5a43'];
    for(let r=0;r<2;r++)for(let c=0;c<6;c++){box('marketCrate',1.0,.3,.75,127+c*1.2,.18,62+r*.95,wood);for(let j=0;j<6;j++){const f=B.MeshBuilder.CreateSphere('v12_marketProduce',{diameter:.18,segments:6},scene);f.position.set(126.65+c*1.2+(j%3)*.25,.38,61.72+r*.95+Math.floor(j/3)*.28);f.material=mat('produce'+((r+c+j)%4),produce[(r+c+j)%4]);f.isPickable=false;meshes.push(f);}}
    const chairCols=['#3d75a5','#8e443a','#4e865b','#d1b64a'];
    for(let i=0;i<5;i++){box('ahwaTable',.72,.08,.72,154+i*1.45,.64,61,mat('table','#664b37'));for(let s=-1;s<=1;s+=2){box('plasticChair',.5,.78,.5,154+i*1.45+s*.7,.4,61.1,mat('chair'+i+s,chairCols[(i+(s>0?1:0))%4]));}}
    sign('market','سوق الميدان',137,3.1,58,5.8,.72,'#874f31',0);
    addVehicle('microbus',148,78,0,'#e7e4d9');
    addVehicle('tuktuk',130,82,Math.PI/2,'#2b6f86');
  }

  function addWorkshopStrip(){
    const dark=mat('workshop','#444744'),metal=mat('metal','#737773'),tyre=mat('tyre','#242524');
    const xs=[-60,-20,20,60];
    xs.forEach((x,i)=>{box('workshopBay',12,3.3,6,x,1.65,119,dark,true);sign('workshop'+i,['ميكانيكي','كاوتش وبنشر','نجار','كهربائي سيارات'][i],x,3.15,115.9,5.8,.62,['#5b4b39','#3b5562','#74533a','#405e6c'][i],0);box('workBench',3,.72,.7,x-2,.38,115.1,metal);for(let t=0;t<3;t++)torus('tyre',.9,.2,x+1+t*.42,.25+t*.1,115.15,tyre);});
  }

  function addVehicle(type,x,z,rot,color){
    const root=new B.TransformNode('v12_'+type+'_root',scene);root.position.set(x,0,z);root.rotation.y=rot;
    const body=box(type+'Body',type==='microbus'?4.2:2.25,type==='microbus'?2.25:1.55,type==='microbus'?1.85:1.25,0,type==='microbus'?1.15:.82,0,mat(type+color,color));body.parent=root;body.position.set(0,type==='microbus'?1.15:.82,0);
    const glass=mat(type+'Glass','#26363d','#091014');const win=box(type+'Glass',type==='microbus'?2.3:1.05,.55,.08,0,type==='microbus'?1.55:1.05,type==='microbus'?-.97:-.67,glass);win.parent=root;win.position.set(0,type==='microbus'?1.55:1.05,type==='microbus'?-.97:-.67);
    const wheel=mat('wheel','#242424');for(const sx of [-1,1])for(const sz of [-1,1]){const w=torus(type+'Wheel',.55,.15,0,0,0,wheel);w.parent=root;w.position.set(sx*(type==='microbus'?1.45:.68),.36,sz*(type==='microbus'?.72:.48));w.rotation.z=Math.PI/2;}
    movers.push({root,type,baseX:x,baseZ:z,phase:Math.random()*10});return root;
  }

  function addFamilyHome(){
    const x=HOME.x,z=HOME.z;const wall=mat('homeWall','#d9c9b5'),floor=mat('homeFloor','#b8aa94'),wood=mat('wood','#654a36'),dark=mat('tv','#171b1e','#050607'),sofa=mat('sofa','#8a7768'),cream=mat('cream','#d7c7ae'),metal=mat('homeMetal','#777874');
    box('homeFloor',22,.14,18,x,.07,z,floor);
    box('homeWallW',.25,3.1,18,x-11,1.55,z,wall,true);box('homeWallE',.25,3.1,18,x+11,1.55,z,wall,true);box('homeWallS',22,3.1,.25,x,1.55,z-9,wall,true);
    box('homeWallN1',8.9,3.1,.25,x-6.55,1.55,z+9,wall,true);box('homeWallN2',8.9,3.1,.25,x+6.55,1.55,z+9,wall,true);
    box('homeDoorSideL',.3,3.1,.3,x-2.0,1.55,z+8.9,wood,true);box('homeDoorSideR',.3,3.1,.3,x+2.0,1.55,z+8.9,wood,true);
    box('homeInner1',.2,3,7.2,x+2.4,1.5,z-5.3,wall,true);box('homeInner2',.2,3,4.0,x+2.4,1.5,z+5.1,wall,true);
    box('homeInner3',8.5,3,.2,x+6.7,1.5,z-1.8,wall,true);
    box('homeCeiling',22,.14,18,x,3.1,z,mat('ceiling','#e9e1d7'));
    box('homeRug',6,.035,4,x-4.4,.16,z-1.2,mat('rug','#735a4d'));
    box('homeSofaSeat',4.8,.48,1.2,x-6.2,.48,z-3.7,sofa);box('homeSofaBack',4.8,1.0,.34,x-6.2,1.03,z-4.15,sofa);box('homeSofaArm',.35,.72,1.2,x-8.55,.68,z-3.7,sofa);box('homeSofaArm',.35,.72,1.2,x-3.85,.68,z-3.7,sofa);
    box('homeCoffeeTable',2.7,.18,1.35,x-5.5,.48,z-1.2,wood);for(const dx of [-1.05,1.05])for(const dz of [-.45,.45])box('homeTableLeg',.12,.45,.12,x-5.5+dx,.25,z-1.2+dz,wood);
    box('homeTvUnit',3.4,.55,.55,x-5.5,.3,z+2.9,wood);box('homeTV',3.1,1.65,.12,x-5.5,1.45,z+3.16,dark);
    box('homeDiningTable',3.1,.18,1.8,x-.3,.82,z+4.5,wood);for(const sx of [-1,1])for(const sz of [-1,1])box('homeDiningChair',.65,.85,.65,x-.3+sx*1.75,.46,z+4.5+sz*.72,cream);
    box('homeBedBase',4.8,.48,5.5,x+6.8,.38,z-5.3,wood);box('homeMattress',4.55,.42,5.15,x+6.8,.78,z-5.3,cream);box('homePillow',1.45,.28,.8,x+5.5,1.05,z-7.05,mat('pillow','#ede5d8'));box('homePillow',1.45,.28,.8,x+8.1,1.05,z-7.05,mat('pillow2','#ede5d8'));box('homeWardrobe',3.2,2.5,.75,x+9.0,1.25,z-2.55,wood,true);
    box('homeCounter',5.2,.92,.72,x+7.1,.48,z+6.9,mat('counter','#b7a58f'));box('homeUpperCabinet',4.9,1.05,.48,x+7.1,2.23,z+7.02,cream);box('homeFridge',1.45,2.25,1.25,x+9.2,1.12,z+2.6,mat('fridge','#d7d6cf'));box('homeStove',1.45,.92,1.25,x+6.8,.47,z+2.6,metal);box('homeWasher',1.45,.92,1.25,x+4.9,.47,z+2.6,mat('washer','#e2e0d8'));
    const washerDoor=B.MeshBuilder.CreateDisc('v12_homeWasherDoor',{radius:.43,tessellation:24},scene);washerDoor.position.set(x+4.9,.48,z+1.96);washerDoor.rotation.x=Math.PI/2;washerDoor.material=dark;washerDoor.isPickable=false;meshes.push(washerDoor);
    box('homeBalconyRail',7,.75,.08,x-5.5,.78,z+9.85,metal);box('homeBalconySlab',7,.14,1.8,x-5.5,.1,z+9.6,floor);box('homeLaundryLine',5.2,.025,.025,x-5.5,2.2,z+9.78,metal);for(let i=0;i<4;i++){const cloth=box('homeLaundry',.72,.82,.035,x-7.3+i*1.2,1.78,z+9.8,mat('homecloth'+i,['#b94f48','#547aa0','#d6c05d','#e8e3d8'][i]));cloth.rotation.z=(i%2?.035:-.025);}
    box('homeACOutdoor',1.05,.55,.45,x+9.4,2.25,z+9.25,mat('acOutdoor','#cecdc5'));
    sign('familyHome','بيت العيلة',x,3.4,z+9.2,4.5,.65,'#65452f',Math.PI);
    for(const [lx,lz] of [[x-5,z-1],[x+7,z-5],[x+7,z+4]]){const l=new B.PointLight('v12_homeLight',new B.Vector3(lx,2.55,lz),scene);l.diffuse=new B.Color3(1,.82,.62);l.intensity=.42;l.range=11;}
  }

  function installIntroUI(){
    const style=document.createElement('style');style.id='v12-intro-style';style.textContent=`body.v12-intro #hud{visibility:hidden!important}body.v12-intro #menu{display:none!important}#v12IntroCard{position:fixed;inset:0;z-index:55;pointer-events:none;display:none;align-items:flex-end;justify-content:flex-start;padding:clamp(24px,6vw,70px);background:linear-gradient(0deg,rgba(7,7,6,.78),transparent 48%)}body.v12-intro #v12IntroCard{display:flex}#v12IntroText{max-width:620px;text-align:right;color:#fff;text-shadow:0 3px 18px #000}#v12IntroKicker{font-size:12px;letter-spacing:1.4px;color:#e9b84b;font-weight:900}#v12IntroTitle{font-size:clamp(34px,7vw,72px);font-weight:950;margin-top:8px}#v12IntroSub{margin-top:9px;font-size:14px;opacity:.82}`;document.head.appendChild(style);
    const card=document.createElement('div');card.id='v12IntroCard';card.innerHTML='<div id="v12IntroText"><div id="v12IntroKicker">القاهرة • 08:20 صباحًا</div><div id="v12IntroTitle">يوم جديد في حياة مصر</div><div id="v12IntroSub">من بيت العيلة للشارع والميدان والسوق — العالم مفتوح قدامك.</div></div>';document.body.appendChild(card);
  }

  function tweenCamera(cam,from,to,t){
    const e=t*t*(3-2*t);cam.position=B.Vector3.Lerp(from.pos,to.pos,e);const target=B.Vector3.Lerp(from.target,to.target,e);cam.setTarget(target);
  }

  function runIntro(buttonId){
    if(introRunning)return;introRunning=true;
    const menu=document.getElementById('menu');document.body.classList.add('v12-intro');
    const intro=new B.FreeCamera('v12_intro_camera',new B.Vector3(172,24,172),scene);intro.minZ=.1;intro.fov=.82;scene.activeCamera=intro;
    const pts=[
      {pos:new B.Vector3(178,28,175),target:new B.Vector3(105,0,60),dur:1500},
      {pos:new B.Vector3(132,5,79),target:new B.Vector3(144,2,15),dur:1500},
      {pos:new B.Vector3(-126,7,-116),target:new B.Vector3(-164,2,-164),dur:1600},
      {pos:new B.Vector3(-164,2.25,-154),target:new B.Vector3(-164,1.4,-165),dur:1300}
    ];
    let index=0,start=performance.now();
    const tick=now=>{
      const a=pts[index],b=pts[Math.min(index+1,pts.length-1)],p=Math.min(1,(now-start)/a.dur);tweenCamera(intro,a,b,p);
      if(p>=1&&index<pts.length-2){index++;start=now;requestAnimationFrame(tick);return;}
      if(p<1){requestAnimationFrame(tick);return;}
      scene.activeCamera=player;intro.dispose();document.body.classList.remove('v12-intro');if(menu)menu.style.display='';introRunning=false;bypassStart=true;
      const btn=document.getElementById(buttonId);btn?.click();
      setTimeout(()=>{
        bypassStart=false;
        if(buttonId==='newGameBtn'){
          player.position.set(HOME.spawnX,1.72,HOME.spawnZ);player.rotation.set(0,Math.PI,0);
          const mission=document.getElementById('taskText');if(mission)mission.textContent='اخرج من بيت العيلة، لف الحي والميدان، واكتشف الشوارع.';
          const toast=document.getElementById('toast');if(toast){toast.textContent='صباح الخير 🇪🇬 — ابدأ يومك من بيت العيلة';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2600);}
        }
      },90);
    };
    requestAnimationFrame(tick);
  }

  function installStartInterception(){
    for(const id of ['newGameBtn','continueBtn']){
      const b=document.getElementById(id);if(!b)continue;
      b.addEventListener('click',e=>{
        if(bypassStart)return;
        e.preventDefault();e.stopImmediatePropagation();
        if(!worldReady){queuedButton=id;const status=document.getElementById('menuStatus');if(status)status.textContent='بنبني العالم والبيت… لحظة واحدة.';return;}
        runIntro(id);
      },true);
    }
  }

  function animateWorld(){
    const start=performance.now();
    scene.onBeforeRenderObservable.add(()=>{
      const t=(performance.now()-start)/1000;
      for(const m of movers){
        if(m.type==='microbus'){m.root.position.x=m.baseX+Math.sin(t*.12+m.phase)*17;m.root.position.z=m.baseZ;}
        else{m.root.position.z=m.baseZ+Math.sin(t*.18+m.phase)*13;m.root.position.x=m.baseX;}
      }
    });
  }

  function authenticityAudit(){
    const count=p=>scene.meshes.filter(m=>m.name.startsWith('v12_'+p)).length;
    const features={
      arabicSignage:count('sign_')>=8,
      mixedUseGroundFloors:count('shopFront')>=8,
      balconiesAndLaundry:count('laundryCloth')>=12,
      rooftopUtilities:count('waterTank')>=5&&count('satDish')>=8,
      streetCommerce:count('streetCrate')>=12&&count('marketCrate')>=8,
      localTransport:!!scene.getTransformNodeByName('v12_microbus_root')&&!!scene.getTransformNodeByName('v12_tuktuk_root'),
      socialStreetSpace:count('ahwaTable')>=4,
      narrowResidentialLanes:count('alley')>=3,
      denseApartments:count('apartment')>=20,
      livedInHome:count('home')>=30
    };
    const passed=Object.values(features).filter(Boolean).length,score=Math.round(passed/Object.keys(features).length*100);
    return {score,features,passed,total:Object.keys(features).length,profile:'dense-Cairo-residential-mixed-use',scopeNote:'يمثل حيًا قاهريًا سكنيًا/شعبيًا مختلط الاستخدام، وليس كل أشكال العمران في مصر.'};
  }

  function exposeDebug(audit){
    window.__V12_WORLD={version:VERSION,ready:true,openWorld:true,walkableExtentMeters:390,districts:['الحارة الأصلية','الحي السكني','الميدان والسوق','منطقة الورش','بيت العيلة'],homeInterior:true,introCinematic:true,meshCount:meshes.length,authenticity:audit};
    window.__egyptDebug=window.__egyptDebug||{};
    window.__egyptDebug.v12WorldState=()=>({...window.__V12_WORLD,camera:{x:player.position.x,y:player.position.y,z:player.position.z},home:{...HOME},activeCamera:scene.activeCamera?.name||null});
    window.__egyptDebug.v12Teleport=(x,z)=>{player.position.set(x,1.72,z);return {x:player.position.x,z:player.position.z};};
  }

  try{
    installIntroUI();installStartInterception();
    addWorldGroundAndRoads();addDistricts();addFamilyHome();animateWorld();
    const audit=authenticityAudit();worldReady=true;exposeDebug(audit);
    const kicker=document.querySelector('.kicker'),tag=document.querySelector('.tagline'),foot=document.querySelector('.menuFoot'),status=document.getElementById('menuStatus');
    if(kicker)kicker.textContent='HAYAT MASR • V12';
    if(tag)tag.textContent='حياة مصر V12 — بداية سينمائية، بيت عيلة قابل للاستكشاف، ومناطق متصلة توسّع الحارة لعالم شبه مفتوح بطابع قاهري يومي.';
    if(foot)foot.textContent='V12 — intro + explorable home + connected Cairo districts';
    if(status)status.textContent=`العالم جاهز — تقييم الهوية المصرية ${audit.score}%`;
    if(queuedButton){const q=queuedButton;queuedButton=null;setTimeout(()=>document.getElementById(q)?.click(),0);}
  }catch(err){
    console.error('V12 world build failed',err);window.__V12_WORLD={version:VERSION,ready:false,error:String(err)};
    const box=document.getElementById('errorBox');if(box){box.style.display='block';box.textContent='V12 world build failed: '+err.message;}
  }
})();