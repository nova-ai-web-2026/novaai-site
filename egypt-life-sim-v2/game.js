(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const $ = id => document.getElementById(id);
  const ui = {
    money:$('money'), hungerTxt:$('hungerTxt'), hungerBar:$('hungerBar'), energyTxt:$('energyTxt'), energyBar:$('energyBar'), moodTxt:$('moodTxt'), moodBar:$('moodBar'),
    time:$('time'), day:$('day'), taskTitle:$('taskTitle'), taskText:$('taskText'), prompt:$('prompt'), toast:$('toast'), map:$('minimap'),
    menu:$('menu'), newGame:$('newGameBtn'), cont:$('continueBtn'), reset:$('resetBtn'), menuStatus:$('menuStatus'),
    shop:$('shop'), shopTitle:$('shopTitle'), shopDesc:$('shopDesc'), shopItems:$('shopItems'), shopClose:$('shopClose'),
    dialog:$('dialog'), dialogWho:$('dialogWho'), dialogText:$('dialogText'), dialogClose:$('dialogClose'), error:$('errorBox'),
    joy:$('joy'), knob:$('knob'), act:$('act'), run:$('run'), sound:$('soundToggle')
  };

  if (!window.BABYLON) {
    ui.error.style.display = 'block';
    ui.error.textContent = 'تعذر تحميل محرك اللعبة. تأكد من اتصال الإنترنت ثم أعد تحميل الصفحة.';
    return;
  }

  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const SAVE_KEY = 'hayat-masr-v4';
  const PLAYER_EYE = 1.72;
  const DEFAULT_STATE = {money:300,hunger:84,energy:92,mood:76,minute:8*60+20,day:1,task:0,worked:0,savedX:-10,savedZ:12};
  const weekdays = ['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];
  const shops = [
    {name:'فول وطعمية أبو علي',type:'ful',sign:'#7f3522',desc:'فول وطعمية وعيش بلدي سخن.',items:[['ساندوتش فول',14,22,3],['ساندوتش طعمية',12,18,4],['طبق فول',25,34,4]]},
    {name:'كشري التحرير',type:'koshary',sign:'#a83d2e',desc:'كشري مصري وصلصة ودقة وبصل.',items:[['كشري صغير',35,32,5],['كشري كبير',52,48,8],['رز بلبن',24,15,8]]},
    {name:'قهوة المعلم',type:'ahwa',sign:'#5b3b25',desc:'شاي وقهوة وقعدة على الرصيف.',items:[['شاي كشري',10,1,7],['شاي بالنعناع',13,1,9],['قهوة سادة',18,0,12]]},
    {name:'فرن العيش البلدي',type:'bakery',sign:'#8d6235',desc:'عيش بلدي وفطير وقرص سخنة.',items:[['رغيف عيش',3,7,1],['فطيرة جبنة',30,24,4],['قرص سادة',14,10,2]]},
    {name:'عصير قصب ولاد البلد',type:'juice',sign:'#286a49',desc:'قصب وبرتقال ومانجا ساقعين.',items:[['قصب',18,0,12],['برتقال',25,1,11],['مانجا',32,3,14]]},
    {name:'كشك عم صابر',type:'kiosk',sign:'#275b86',desc:'مياه وسناكس ومناديل وحاجات سريعة.',items:[['مياه',7,0,3],['بسكوت',10,7,2],['عصير',15,2,7]]},
    {name:'بقالة الأمانة',type:'grocery',sign:'#456b36',desc:'احتياجات البيت اليومية.',items:[['جبنة وعيش',30,22,3],['زبادي',12,9,3],['حلاوة',18,14,4]]},
    {name:'خضار وفاكهة البركة',type:'produce',sign:'#35703a',desc:'خضار وفاكهة من السوق.',items:[['موز',25,12,5],['برتقال',22,8,5],['طماطم وخيار',28,10,3]]},
    {name:'كبدة وسجق إسكندراني',type:'kebda',sign:'#8e3e28',desc:'ساندوتشات كبدة وسجق سريعة.',items:[['ساندوتش كبدة',32,26,7],['ساندوتش سجق',35,27,7]]}
  ];
  const sayings = [
    ['عم سيد','صباح الفل يا ابني، الحق الفول قبل الزحمة.'],['أم محمود','خد بالك وإنت معدّي الشارع.'],['الحاج رضا','الحر النهارده محتاج قصب ساقع.'],
    ['مينا','الماتش بالليل على القهوة.'],['عم رجب','العيش لسه طالع سخن من الفرن.'],['سارة','لو رايح السوق هات طماطم وخيار.'],
    ['المعلم شوقي','الشغل عايز حركة يا نجم.'],['نجلاء','بليل الشارع بيهدى بس القهوة بتفضل منورة.']
  ];

  let state = loadState();
  let engine, scene, camera, sun, hemi, sky;
  let current = null, modal = false, running = false, lastSave = 0, toastTimer = 0;
  let joyX = 0, joyY = 0, joyPointer = null, lookPointer = null, lastPX = 0, lastPY = 0;
  let yaw = 0, pitch = 0, stepClock = 0, nextHorn = 0;
  const keys = new Set();
  const mats = new Map();
  const world = {size:216,roads:[-72,-24,24,72],interactables:[],people:[],vehicles:[],lights:[],market:{x:70,z:-65},home:null,job:null};
  const audio = {ctx:null,master:null,ambient:null,enabled:true,noise:null,hum:null};

  function loadState(){try{return Object.assign({},DEFAULT_STATE,JSON.parse(localStorage.getItem(SAVE_KEY)||'{}'));}catch{return {...DEFAULT_STATE};}}
  function saveState(){if(!camera)return;state.savedX=+camera.position.x.toFixed(2);state.savedZ=+camera.position.z.toFixed(2);localStorage.setItem(SAVE_KEY,JSON.stringify(state));}
  function hasSave(){return !!localStorage.getItem(SAVE_KEY);}
  function clamp(v,a=0,b=100){return Math.max(a,Math.min(b,v));}
  function seeded(n){const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x);}

  function mat(name,hex,emit=''){
    const key=name+hex+emit;
    if(mats.has(key)) return mats.get(key);
    const m=new BABYLON.StandardMaterial(key,scene);
    m.diffuseColor=BABYLON.Color3.FromHexString(hex);
    m.specularColor=new BABYLON.Color3(.025,.025,.025);
    if(emit) m.emissiveColor=BABYLON.Color3.FromHexString(emit);
    mats.set(key,m);return m;
  }
  function plasterMat(name,base,seed){
    const key='plaster-'+name+'-'+seed;
    if(mats.has(key)) return mats.get(key);
    const tex=new BABYLON.DynamicTexture(key+'Tex',{width:256,height:256},scene,false);
    const c=tex.getContext();c.fillStyle=base;c.fillRect(0,0,256,256);
    for(let i=0;i<850;i++){const v=seeded(seed+i),a=.025+seeded(seed+i*3)*.06;c.fillStyle=v>.5?`rgba(255,255,255,${a})`:`rgba(55,35,20,${a})`;c.fillRect(seeded(seed+i*7)*256,seeded(seed+i*11)*256,1+seeded(seed+i*13)*2,1+seeded(seed+i*17)*2);}
    for(let i=0;i<6;i++){c.strokeStyle='rgba(70,48,34,.13)';c.lineWidth=1;c.beginPath();const sx=seeded(seed+i*19)*256,sy=seeded(seed+i*23)*256;c.moveTo(sx,sy);c.lineTo(sx+seeded(seed+i*29)*40-20,sy+seeded(seed+i*31)*70);c.stroke();}
    tex.update();tex.uScale=2;tex.vScale=2;
    const m=new BABYLON.StandardMaterial(key,scene);m.diffuseTexture=tex;m.diffuseColor=new BABYLON.Color3(.95,.95,.95);m.specularColor=BABYLON.Color3.Black();mats.set(key,m);return m;
  }
  function box(name,w,h,d,x,y,z,material,collision=true){const m=BABYLON.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);m.position.set(x,y,z);m.material=material;m.checkCollisions=collision;return m;}
  function cyl(name,dia,h,x,y,z,material,tess=12){const m=BABYLON.MeshBuilder.CreateCylinder(name,{diameter:dia,height:h,tessellation:tess},scene);m.position.set(x,y,z);m.material=material;return m;}
  function plane(name,w,h,x,y,z,material,rotY=0){const p=BABYLON.MeshBuilder.CreatePlane(name,{width:w,height:h},scene);p.position.set(x,y,z);p.rotation.y=rotY;p.material=material;p.isPickable=false;return p;}
  function sign(text,x,y,z,width=5.8,height=.85,bg='#4d3425',rot=Math.PI){
    const tex=new BABYLON.DynamicTexture('signTex'+Math.random(),{width:900,height:160},scene,false);const c=tex.getContext();c.fillStyle=bg;c.fillRect(0,0,900,160);c.fillStyle='#fff4d6';c.font='bold 62px Tahoma,Arial';c.textAlign='center';c.textBaseline='middle';c.direction='rtl';c.fillText(text,450,83);tex.update();
    const sm=new BABYLON.StandardMaterial('signMat'+Math.random(),scene);sm.diffuseTexture=tex;sm.emissiveColor=new BABYLON.Color3(.08,.07,.05);sm.backFaceCulling=false;return plane('sign',width,height,x,y,z,sm,rot);
  }

  function buildScene(){
    engine=new BABYLON.Engine(canvas,true,{antialias:true,adaptToDeviceRatio:true,preserveDrawingBuffer:false});
    scene=new BABYLON.Scene(engine);scene.collisionsEnabled=true;scene.gravity=new BABYLON.Vector3(0,-.22,0);scene.clearColor=new BABYLON.Color4(.69,.78,.84,1);scene.fogMode=BABYLON.Scene.FOGMODE_EXP2;scene.fogDensity=.0018;scene.fogColor=new BABYLON.Color3(.72,.75,.73);
    camera=new BABYLON.UniversalCamera('player',new BABYLON.Vector3(state.savedX,PLAYER_EYE,state.savedZ),scene);camera.minZ=.05;camera.fov=.86;camera.inertia=0;camera.applyGravity=true;camera.checkCollisions=true;camera.ellipsoid=new BABYLON.Vector3(.42,.84,.42);camera.ellipsoidOffset=new BABYLON.Vector3(0,-.81,0);camera.rotation.set(0,0,0);
    hemi=new BABYLON.HemisphericLight('ambient',new BABYLON.Vector3(.1,1,.2),scene);hemi.intensity=.68;hemi.groundColor=new BABYLON.Color3(.31,.25,.19);
    sun=new BABYLON.DirectionalLight('sun',new BABYLON.Vector3(-.4,-1,-.28),scene);sun.position.set(70,120,50);sun.intensity=1.25;
    const skyMat=mat('sky','#7fabc6','#182b36');skyMat.backFaceCulling=false;skyMat.disableLighting=true;sky=BABYLON.MeshBuilder.CreateSphere('sky',{diameter:620,segments:12},scene);sky.material=skyMat;sky.infiniteDistance=true;sky.isPickable=false;
    const ground=BABYLON.MeshBuilder.CreateGround('ground',{width:world.size,height:world.size},scene);ground.material=plasterMat('dust','#a89878',2);ground.checkCollisions=true;
    buildRoads();buildDistricts();buildMarket();buildAhwa();buildLandmarks();buildStreetLife();buildVehicles();buildPeople();
    scene.onBeforeRenderObservable.add(update);
    return scene;
  }

  function buildRoads(){
    const asphalt=mat('asphalt','#494946'),walk=mat('sidewalk','#aaa093'),curb=mat('curb','#d0c6b8'),stripe=mat('stripe','#ddd8c9');
    for(const r of world.roads){
      box('roadV',9.5,.06,world.size,r,.03,0,asphalt,false);box('roadH',world.size,.06,9.5,0,.032,r,asphalt,false);
      box('walkV1',2.3,.16,world.size,r-5.9,.08,0,walk,true);box('walkV2',2.3,.16,world.size,r+5.9,.08,0,walk,true);
      box('walkH1',world.size,.16,2.3,0,.08,r-5.9,walk,true);box('walkH2',world.size,.16,2.3,0,.08,r+5.9,walk,true);
      box('curbV1',.18,.25,world.size,r-4.8,.13,0,curb,true);box('curbV2',.18,.25,world.size,r+4.8,.13,0,curb,true);
      box('curbH1',world.size,.25,.18,0,.13,r-4.8,curb,true);box('curbH2',world.size,.25,.18,0,.13,r+4.8,curb,true);
      for(let n=-100;n<=100;n+=10){box('dashV',.1,.018,3.2,r,.07,n,stripe,false);box('dashH',3.2,.018,.1,n,.072,r,stripe,false);}
    }
    for(const x of [-72,-24,24,72])for(const z of [-72,-24,24,72])for(let i=-3;i<=3;i++){box('crossV',.7,.02,3.2,x+i*1.05,.08,z, stripe,false);box('crossH',3.2,.02,.7,x,.082,z+i*1.05,stripe,false);}
  }

  function buildDistricts(){
    const centers=[-96,-48,0,48,96];
    let id=0;
    for(const x of centers)for(const z of centers){
      if(world.roads.some(r=>Math.abs(x-r)<18)||world.roads.some(r=>Math.abs(z-r)<18)) continue;
      const seed=id++ + Math.abs(x*7+z*11);
      const w=24+Math.floor(seeded(seed)*7),d=22+Math.floor(seeded(seed+2)*8),floors=3+Math.floor(seeded(seed+4)*4);
      buildBuilding(x,z,w,d,floors,seed);
    }
    // Extra street-facing blocks between the major roads.
    const extras=[[-48,-48],[-48,0],[-48,48],[0,-48],[0,48],[48,-48],[48,0],[48,48]];
    for(const [x,z] of extras) buildBuilding(x,z,26,23,4+Math.floor(seeded(x+z+71)*3),500+x*3+z);
  }

  function buildBuilding(x,z,w,d,floors,seed){
    const palette=['#c8ae86','#b99672','#d0bea1','#c19f7d','#d3c2a5','#bfa98c','#c79c78'];
    const wall=plasterMat('facade'+seed,palette[Math.abs(seed)%palette.length],seed);
    const h=floors*3.05;
    box('building',w,h,d,x,h/2,z,wall,true);
    // Ground-level darker base gives the building visual weight.
    box('baseBand',w+.05,.62,d+.05,x,.31,z,mat('base'+seed,'#786c5d'),false);
    addRoof(x,z,w,d,h,seed);
    addFacade(x,z,w,d,floors,seed,'south');
    addFacade(x,z,w,d,floors,seed+9,'east');
    if(seed%3===0)addExposedBrickTop(x,z,w,d,h,seed);
    if(seed%4===0)addDrainPipe(x+w/2-.45,z-d/2-.18,h);
  }

  function addFacade(x,z,w,d,floors,seed,side){
    const south=side==='south',front=south?z-d/2-.045:x+w/2+.045;
    const span=south?w:d,cols=Math.max(2,Math.floor(span/5.6));
    for(let f=1;f<floors;f++){
      for(let c=0;c<cols;c++){
        const p=-span/2+(c+.5)*span/cols;
        if(south)addWindow(x+p,f*3.05+1.42,front,seed+f*13+c,0);
        else addWindow(front,f*3.05+1.42,z+p,seed+f*13+c,Math.PI/2);
      }
      if(south && f%2===1 && floors>3) addBalcony(x,z-d/2,f*3.05+1.2,w,seed+f);
    }
    if(south) addGroundShops(x,z-d/2,w,seed);
  }

  function addWindow(x,y,z,seed,rot){
    const dark=mat('windowDark','#26343a','#071014');
    if(rot===0){
      box('windowRecess',2.0,1.38,.16,x,y,z-.05,dark,false);box('frameTop',2.18,.10,.22,x,y+.73,z-.10,mat('frame','#d2c6b3'),false);box('frameBottom',2.18,.1,.22,x,y-.73,z-.10,mat('frame','#d2c6b3'),false);box('frameL',.10,1.45,.22,x-1.04,y,z-.10,mat('frame','#d2c6b3'),false);box('frameR',.10,1.45,.22,x+1.04,y,z-.10,mat('frame','#d2c6b3'),false);
      box('mullion',.07,1.3,.19,x,y,z-.13,mat('mullion','#9f998f'),false);
      if(seed%5===0)box('shutter',2.05,.9,.12,x,y-.18,z-.19,mat('shutter','#665b50'),false);
    }else{
      box('windowSide',.16,1.38,2.0,x+.05,y,z,dark,false);box('sillSide',.22,.1,2.18,x+.10,y-.73,z,mat('frame','#d2c6b3'),false);
    }
  }

  function addBalcony(x,front,y,w,seed){
    const bw=Math.min(w*.56,10.5),rail=mat('rail','#4a4741'),slab=mat('balconySlab','#b7a58d');
    box('balconySlab',bw,.16,1.25,x,y-.74,front-.62,slab,false);box('railTop',bw,.07,.07,x,y-.12,front-1.21,rail,false);
    for(let i=0;i<=Math.floor(bw/.75);i++){const px=x-bw/2+i*(bw/Math.floor(bw/.75));box('railPost',.045,.6,.045,px,y-.43,front-1.21,rail,false);}
    if(seed%2===0){const colors=['#ede2d4','#6f83a0','#b25a52','#e1c35b','#658267'];for(let i=0;i<5;i++)box('laundry',.58,.68,.025,x-1.6+i*.8,y-.02-(i%2)*.07,front-1.26,mat('cloth'+i,colors[i]),false);}
    if(seed%3===0)addAC(x+bw*.33,y-.05,front-.18);
  }

  function addGroundShops(x,front,w,seed){
    const count=Math.max(2,Math.floor(w/7.5)),sw=w/count;
    for(let s=0;s<count;s++){
      const sx=x-w/2+sw*(s+.5),shop=shops[Math.abs(seed+s)%shops.length];
      box('shopFrame',sw-.3,2.62,.26,sx,1.42,front-.15,mat('shopFrame','#3a3029'),false);
      box('shopGlass',sw-.65,2.2,.11,sx,1.35,front-.31,mat('glass','#26373b','#071012'),false);
      // Awnings / shutters make shop fronts less flat.
      const aw=box('awning',sw-.35,.12,1.05,sx,2.72,front-.75,mat('awning'+shop.type,shop.sign),false);aw.rotation.x=.10;
      for(let i=-2;i<=2;i++)box('awningStripe',.18,.02,.92,sx+i*(sw-.8)/5,2.66,front-.77,mat('stripeA',i%2?'#f0dfbf':'#6f4b34'),false).rotation.x=.10;
      sign(shop.name,sx,3.2,front-.27,Math.min(sw-.55,7.1),.75,shop.sign);
      const hot=box('shopHot',sw-.45,2.7,1.35,sx,1.35,front-.95,mat('hot','#fff'),false);hot.visibility=0;world.interactables.push({mesh:hot,kind:'shop',name:shop.name,data:shop,x:sx,z:front-1});
      if(shop.type==='produce')decorateProduce(sx,front-1.55);if(shop.type==='bakery')decorateBread(sx,front-1.52);if(shop.type==='kiosk')decorateKiosk(sx,front-1.5);
    }
  }

  function addRoof(x,z,w,d,h,seed){
    const roof=mat('roof','#92826e'),metal=mat('metal','#656565');
    box('roof',w+.12,.3,d+.12,x,h+.15,z,roof,false);
    box('parapetF',w,.65,.18,x,h+.48,z-d/2+.05,roof,false);box('parapetB',w,.65,.18,x,h+.48,z+d/2-.05,roof,false);box('parapetL',.18,.65,d,x-w/2+.05,h+.48,z,roof,false);box('parapetR',.18,.65,d,x+w/2-.05,h+.48,z,roof,false);
    const tank=cyl('waterTank',1.45,1.8,x-w*.23,h+1.15,z+d*.18,mat('tank','#30363a'),14);tank.checkCollisions=false;
    if(seed%2===0){const pole=cyl('dishPole',.06,.65,x+w*.21,h+.85,z-d*.15,metal,8);const dish=BABYLON.MeshBuilder.CreateDisc('dish',{radius:.68,tessellation:18},scene);dish.position.set(x+w*.21,h+1.25,z-d*.15);dish.rotation.x=1.05;dish.rotation.z=seed*.08;dish.material=mat('dish','#d6d0c5');dish.isPickable=false;}
  }
  function addExposedBrickTop(x,z,w,d,h,seed){const brick=mat('brick','#9c5f43');box('unfinished',w*.58,1.15,d*.55,x+w*.1,h+.72,z,brick,false);for(let i=-2;i<=2;i++)box('rebar',.05,1.45,.05,x+i*1.8,h+1.7,z-d*.18,mat('rebar','#4d4a45'),false);}
  function addDrainPipe(x,z,h){box('pipe',.12,h-.6,.12,x,h/2-.1,z,mat('pipe','#77756f'),false);}
  function addAC(x,y,z){box('ac',.88,.54,.38,x,y,z-.22,mat('ac','#d8d5cc'),false);for(let i=-2;i<=2;i++)box('acVent',.56,.025,.02,x,y+i*.065,z-.42,mat('vent','#777'),false);}

  function decorateProduce(x,z){for(let i=-2;i<=2;i++){box('crate',.82,.42,.62,x+i*.88,.25,z,mat('crate','#7c5a3b'),false);const f=BABYLON.MeshBuilder.CreateSphere('fruit',{diameter:.24,segments:6},scene);f.position.set(x+i*.88,.57,z);f.material=mat('fruit'+i,i%2?'#cb5b38':'#7e9b43');f.isPickable=false;}}
  function decorateBread(x,z){for(let i=-1;i<=1;i++){box('tray',.95,.05,.48,x+i*1.02,.4,z,mat('tray','#777'),false);for(let j=-1;j<=1;j++){const b=BABYLON.MeshBuilder.CreateSphere('bread',{diameter:.34,segments:8},scene);b.scaling.y=.34;b.position.set(x+i*1.02+j*.27,.53,z);b.material=mat('bread','#c99250');b.isPickable=false;}}}
  function decorateKiosk(x,z){for(let i=-2;i<=2;i++)box('pack',.36,.4,.26,x+i*.4,.24,z,mat('pack'+i,['#b8483a','#d1ae3d','#4b82a4','#799a51','#b96a3c'][i+2]),false);}

  function buildMarket(){
    const x=70,z=-65;sign('سوق الحارة',x,4.1,z+15,7.4,1,'#8a4d2d',0);
    for(let i=0;i<4;i++){const sx=x-13+i*8.7;box('stall',6.2,.72,3.4,sx,.38,z+3,mat('stall','#735139'),true);box('shade',6.5,.12,4.2,sx,2.75,z+3,mat('shade'+i,i%2?'#c79b3e':'#b94b3b'),false);decorateProduce(sx,z+.8);}
    const hot=box('marketHot',31,2.4,24,x,1.2,z,mat('hot','#fff'),false);hot.visibility=0;world.interactables.push({mesh:hot,kind:'market',name:'سوق الحارة',x,z});
  }
  function buildAhwa(){const x=-66,z=65;sign('قهوة المعلم فتحي',x,3.7,z-13,7,.9,'#5d3923',0);for(let r=0;r<2;r++)for(let c=0;c<4;c++){const px=x-6.5+c*4.2,pz=z-7+r*4;const t=cyl('table',1,.72,px,.36,pz,mat('table','#725033'),10);t.checkCollisions=false;for(const ox of [-.9,.9])box('chair',.5,.72,.5,px+ox,.36,pz,mat('chair','#68472f'),false);}}
  function buildLandmarks(){
    const h=box('homeDoor',2.1,2.8,.25,-96,1.4,-82,mat('door','#553622'),false);sign('بيت العيلة',-96,3.35,-82.2,3.2,.72,'#553622');world.home={mesh:h,kind:'home',name:'بيت العيلة',x:-96,z:-82};world.interactables.push(world.home);
    const j=box('jobBooth',3.7,2.3,1.9,-24,1.15,64,mat('job','#245d66'),true);sign('طلبات الحارة',-24,2.85,63,4.2,.8,'#245d66');world.job={mesh:j,kind:'job',name:'شغل التوصيل',x:-24,z:64};world.interactables.push(world.job);
    buildFulCart(-8,-8);
    const mosque=box('mosque',13,6,11,91,3,91,plasterMat('mosque','#d6ccb5',91),true);const dome=BABYLON.MeshBuilder.CreateSphere('dome',{diameter:5.4,segments:16,slice:.55},scene);dome.position.set(91,7.1,91);dome.material=mat('dome','#819781');cyl('minaret',1.55,13,97,6.5,92,plasterMat('minaret','#d6c8aa',92),12);
  }
  function buildFulCart(x,z){box('cart',2.7,.82,1.45,x,.55,z,mat('cart','#407455'),true);const p=cyl('fulPot',.92,.66,x,.85,z,mat('pot','#898881'),14);p.checkCollisions=false;sign('فول وطعمية',x,1.75,z-.82,2.8,.58,'#407455');const hot=box('fulHot',2.9,2,2,x,1,z,mat('hot','#fff'),false);hot.visibility=0;world.interactables.push({mesh:hot,kind:'shop',name:'عربية فول وطعمية',x,z,data:shops[0]});}

  function buildStreetLife(){
    const lampMat=mat('lamp','#494744');
    for(const x of world.roads)for(const z of world.roads){const px=x+7.4,pz=z+7.4;const pole=cyl('lampPole',.11,5.2,px,2.6,pz,lampMat,8);pole.checkCollisions=false;box('lampArm',1.2,.09,.09,px+.55,5.05,pz,lampMat,false);const b=BABYLON.MeshBuilder.CreateSphere('bulb',{diameter:.38,segments:7},scene);b.position.set(px+1.08,4.95,pz);b.material=mat('bulb','#fff0bd','#5c471e');world.lights.push(b);}
    // Utility poles and overhead cables.
    for(let i=-2;i<=2;i++){const z=i*36+10;const a=cyl('utility',.18,7,-104,3.5,z,mat('woodPole','#554437'),8);a.checkCollisions=false;const b=cyl('utility',.18,7,104,3.5,z,mat('woodPole','#554437'),8);b.checkCollisions=false;addCable(-104,6.1,z,104,6.1,z+.8);addCable(-104,5.7,z+.3,104,5.7,z-.4);}
    // A few planted street trees and bins.
    for(let i=0;i<12;i++){const x=-95+(i*37)%190,z=-94+(i*53)%188;if(world.roads.every(r=>Math.abs(x-r)>8)&&world.roads.every(r=>Math.abs(z-r)>8)){const tr=cyl('treeTrunk',.34,2.3,x,1.15,z,mat('trunk','#6c4e35'),8);tr.checkCollisions=false;const crown=BABYLON.MeshBuilder.CreateSphere('treeCrown',{diameter:2.8,segments:8},scene);crown.position.set(x,3,z);crown.scaling.y=.82;crown.material=mat('leaf','#58714b');crown.isPickable=false;}}
  }
  function addCable(x1,y1,z1,x2,y2,z2){const path=[];for(let i=0;i<=10;i++){const t=i/10;path.push(new BABYLON.Vector3(x1+(x2-x1)*t,y1+(y2-y1)*t-Math.sin(Math.PI*t)*.7,z1+(z2-z1)*t));}const cable=BABYLON.MeshBuilder.CreateTube('cable',{path,radius:.025,tessellation:5},scene);cable.material=mat('cable','#252525');cable.isPickable=false;}

  function makeVehicle(type,i){
    const vertical=i%2===0,lane=world.roads[i%world.roads.length]+(i%3===0?2.15:-2.15),along=-105+(i*31)%210,root=new BABYLON.TransformNode(type+'Root',scene);
    root.position=vertical?new BABYLON.Vector3(lane,.52,along):new BABYLON.Vector3(along,.52,lane);root.rotation.y=vertical?0:Math.PI/2;
    let w=1.76,h=1.08,d=3.75,col='#dddcd7',speed=.095;if(type==='micro'){w=2.0;h=1.58;d=4.8;col='#e7e5dc';speed=.082;}if(type==='tuktuk'){w=1.28;h=1.42;d=2.12;col=['#28688a','#a64039','#4d7043'][i%3];speed=.07;}if(type==='taxi'){col='#e9e8e3';speed=.09;}
    const lower=box('vehLower',w,.55,d,0,-.03,0,mat(type+'body'+i,col),false);lower.parent=root;const upper=box('vehUpper',w*.9,h*.66,d*.62,0,.48,.1,mat(type+'upper'+i,col),false);upper.parent=root;const wind=box('wind',w*.78,.44,.07,0,.55,-d*.31,mat('vehGlass','#23343b','#071116'),false);wind.parent=root;
    if(type==='micro'){for(let s=-1;s<=1;s++){const side=box('microWindow',w+.03,.48,.78,0,.57,s*.95,mat('vehGlass','#23343b','#071116'),false);side.parent=root;}const stripe=box('microStripe',w+.05,.12,d*.82,0,.05,0,mat('microStripe','#416b88'),false);stripe.parent=root;}
    if(type==='taxi'){const stripe=box('taxiStripe',w+.04,.13,d*.78,0,.02,0,mat('taxiStripe','#222'),false);stripe.parent=root;}
    if(type==='tuktuk'){const canopy=box('canopy',w*1.02,.12,d*.72,0,1.17,.05,mat('canopy','#202020'),false);canopy.parent=root;}
    for(const sx of [-1,1])for(const sz of [-1,1]){const wh=BABYLON.MeshBuilder.CreateCylinder('wheel',{diameter:.5,height:.2,tessellation:10},scene);wh.parent=root;wh.position.set(sx*w*.47,-.33,sz*d*.31);wh.rotation.z=Math.PI/2;wh.material=mat('wheel','#171717');}
    return {root,vertical,dir:i%3===0?-1:1,speed,type};
  }
  function buildVehicles(){const types=['micro','taxi','car','tuktuk','car','micro','taxi'];for(let i=0;i<20;i++)world.vehicles.push(makeVehicle(types[i%types.length],i));}

  function makePerson(x,z,i){
    const root=new BABYLON.TransformNode('personRoot',scene);root.position.set(x,0,z);const cols=['#455f77','#744e40','#45684a','#6b4b71','#817047','#4b4b4b'];const skin=mat('skin','#b98563');
    const torso=box('torso',.58,.85,.32,0,1.05,0,mat('shirt'+i,cols[i%cols.length]),false);torso.parent=root;const head=BABYLON.MeshBuilder.CreateSphere('head',{diameter:.44,segments:8},scene);head.parent=root;head.position.y=1.72;head.material=skin;
    const legL=box('legL',.18,.72,.2,-.16,.43,0,mat('pants'+i,'#343b40'),false);legL.parent=root;const legR=box('legR',.18,.72,.2,.16,.43,0,mat('pants'+i,'#343b40'),false);legR.parent=root;
    const armL=box('armL',.15,.72,.16,-.38,1.08,0,skin,false);armL.parent=root;const armR=box('armR',.15,.72,.16,.38,1.08,0,skin,false);armR.parent=root;
    const data={root,legL,legR,armL,armR,axis:i%2,dir:i%3===0?-1:1,speed:.016+(i%4)*.003,phase:i*.7,name:sayings[i%sayings.length][0],line:sayings[i%sayings.length][1]};world.interactables.push({kind:'person',name:data.name,data,root});return data;
  }
  function buildPeople(){for(let i=0;i<28;i++)world.people.push(makePerson(-100+(i*29)%200,-100+(i*41)%200,i));}

  function update(){
    const dt=Math.min(engine.getDeltaTime(),45)/16.6667;
    const active=ui.menu.style.display==='none'&&!modal;
    if(active){updateMovement(dt);updateNeeds(dt);updateVehicles(dt);updatePeople(dt);updateInteraction();updateAudio(dt);}
    updateDayNight();updateHUD();drawMap();
    const now=performance.now();if(now-lastSave>12000&&ui.menu.style.display==='none'){saveState();lastSave=now;}
  }

  function updateMovement(dt){
    let forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),strafe=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
    if(isTouch){forward+=joyY;strafe+=joyX;}
    const len=Math.hypot(forward,strafe);if(len>1){forward/=len;strafe/=len;}
    if(Math.abs(forward)+Math.abs(strafe)>.02){
      const fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);const speed=(running?0.19:0.115)*dt;const dx=(fx*forward+rx*strafe)*speed,dz=(fz*forward+rz*strafe)*speed;camera.moveWithCollisions(new BABYLON.Vector3(dx,0,dz));
      stepClock+=dt*(running?1.55:1);if(stepClock>25){stepClock=0;playStep();}
    }
    camera.rotation.x=pitch;camera.rotation.y=yaw;
  }
  function updateNeeds(dt){const moving=keys.has('KeyW')||keys.has('KeyS')||keys.has('KeyA')||keys.has('KeyD')||Math.abs(joyX)+Math.abs(joyY)>.1;state.hunger=clamp(state.hunger-.0022*dt);state.energy=clamp(state.energy-(moving?(running?.0041:.0017):-.00045)*dt);if(state.hunger<25)state.mood=clamp(state.mood-.0011*dt);state.minute+=.011*dt;if(state.minute>=1440){state.minute-=1440;state.day++;}}
  function updateVehicles(dt){for(const v of world.vehicles){if(v.vertical){v.root.position.z+=v.speed*v.dir*dt;if(v.root.position.z>112)v.root.position.z=-112;if(v.root.position.z<-112)v.root.position.z=112;}else{v.root.position.x+=v.speed*v.dir*dt;if(v.root.position.x>112)v.root.position.x=-112;if(v.root.position.x<-112)v.root.position.x=112;}}}
  function nearestRoad(v){return world.roads.reduce((a,b)=>Math.abs(b-v)<Math.abs(a-v)?b:a,world.roads[0]);}
  function updatePeople(dt){for(const p of world.people){p.phase+=.08*dt;const swing=Math.sin(p.phase*5)*.45;p.legL.rotation.x=swing;p.legR.rotation.x=-swing;p.armL.rotation.x=-swing*.7;p.armR.rotation.x=swing*.7;if(p.axis===0){p.root.position.x+=p.speed*p.dir*dt;p.root.position.z=nearestRoad(p.root.position.z)+(p.phase%2>1?7:-7);if(p.root.position.x>106)p.root.position.x=-106;if(p.root.position.x<-106)p.root.position.x=106;p.root.rotation.y=p.dir>0?Math.PI/2:-Math.PI/2;}else{p.root.position.z+=p.speed*p.dir*dt;p.root.position.x=nearestRoad(p.root.position.x)+(p.phase%2>1?7:-7);if(p.root.position.z>106)p.root.position.z=-106;if(p.root.position.z<-106)p.root.position.z=106;p.root.rotation.y=p.dir>0?0:Math.PI;}}}

  function itemPos(i){if(i.root)return i.root.position;if(i.mesh)return i.mesh.position;return new BABYLON.Vector3(i.x||0,0,i.z||0);}
  function updateInteraction(){let best=null,bestD=3;for(const i of world.interactables){const p=itemPos(i),d=Math.hypot(p.x-camera.position.x,p.z-camera.position.z);if(d<bestD){bestD=d;best=i;}}current=best;ui.prompt.classList.toggle('show',!!best);if(best)ui.prompt.textContent=`${isTouch?'تفاعل':'E'} — ${best.name}`;}
  function interact(){if(modal){closeModals();return;}if(!current)return;playInteract();if(current.kind==='shop')openShop(current.data);else if(current.kind==='person')openDialog(current.data.name,current.data.line);else if(current.kind==='market'){state.mood=clamp(state.mood+3);showToast('لفّيت في سوق الحارة 👌');advanceTask('market');}else if(current.kind==='job')startJob();else if(current.kind==='home'){state.energy=100;state.hunger=Math.max(state.hunger,62);state.minute+=60;showToast('رجعت بيت العيلة وارتحت');advanceTask('home');saveState();}}
  function openShop(data){modal=true;ui.shopTitle.textContent=data.name;ui.shopDesc.textContent=data.desc;ui.shopItems.innerHTML='';for(const [name,price,hunger,mood] of data.items){const row=document.createElement('div');row.className='item';row.innerHTML=`<div><b>${name}</b><div style="font-size:11px;opacity:.66">${price} جنيه</div></div>`;const b=document.createElement('button');b.textContent='اشتري';b.onclick=()=>{if(state.money<price){showToast('الفلوس مش مكفية');return;}state.money-=price;state.hunger=clamp(state.hunger+hunger);state.mood=clamp(state.mood+mood);state.minute+=7;playBuy();if(['ful','bakery','koshary'].includes(data.type))advanceTask('breakfast');showToast(`اشتريت ${name}`);saveState();};row.appendChild(b);ui.shopItems.appendChild(row);}ui.shop.style.display='flex';}
  function openDialog(who,text){modal=true;ui.dialogWho.textContent=who;ui.dialogText.textContent=text;ui.dialog.style.display='flex';state.mood=clamp(state.mood+1);}
  function closeModals(){modal=false;ui.shop.style.display='none';ui.dialog.style.display='none';}
  function startJob(){if(state.energy<18){showToast('طاقتك قليلة، كل أو ارجع البيت الأول');return;}const pay=48+Math.floor(Math.random()*28);state.energy=clamp(state.energy-10);state.money+=pay;state.worked++;state.minute+=35;playBuy();showToast(`خلصت طلبية وكسبت ${pay} جنيه`);advanceTask('job');saveState();}
  function advanceTask(action){if(state.task===0&&action==='breakfast'){state.task=1;showToast('فطار تمام 👌 روح السوق');}else if(state.task===1&&action==='market'){state.task=2;showToast('عرفت السوق — جرّب شغل التوصيل');}else if(state.task===2&&action==='job'){state.task=3;showToast('خلصت الشغل — ارجع بيت العيلة');}else if(state.task===3&&action==='home'){state.task=4;showToast('خلصت أول يوم في الحارة 🇪🇬');}}
  function taskCopy(){switch(state.task){case 0:return['أول يوم في الحارة','اتمشّى وافطر فول وطعمية أو عيش بلدي أو كشري.'];case 1:return['لفة السوق','روح سوق الحارة واتفرج على الباعة.'];case 2:return['رزق اليوم','روح «طلبات الحارة» وخد شغلانة توصيل.'];case 3:return['ارجع للعيلة','بعد الشغل ارجع بيت العيلة وارتاح.'];default:return['عيش يومك','لف الحارة، كل، اشتغل واتكلم مع الناس.'];}}

  function updateDayNight(){const t=state.minute/1440,a=t*Math.PI*2-Math.PI/2,light=clamp(Math.sin(a)*.78+.45,.08,1);sun.direction.set(Math.cos(a)*-.55,-Math.max(.12,Math.sin(a)),Math.sin(a)*-.35);sun.intensity=.2+light*1.15;hemi.intensity=.24+light*.48;scene.fogColor=new BABYLON.Color3(.17+.56*light,.2+.56*light,.23+.53*light);if(sky&&sky.material)sky.material.emissiveColor=new BABYLON.Color3(.07+.43*light,.09+.51*light,.13+.57*light);const night=light<.34;for(const b of world.lights)b.material.emissiveColor=night?new BABYLON.Color3(.9,.65,.22):new BABYLON.Color3(.1,.08,.04);}
  function updateHUD(){ui.money.textContent=`${Math.round(state.money)} ج`;ui.hungerTxt.textContent=`${Math.round(state.hunger)}%`;ui.energyTxt.textContent=`${Math.round(state.energy)}%`;ui.moodTxt.textContent=`${Math.round(state.mood)}%`;ui.hungerBar.style.width=state.hunger+'%';ui.energyBar.style.width=state.energy+'%';ui.moodBar.style.width=state.mood+'%';const h=Math.floor(state.minute/60)%24,m=Math.floor(state.minute%60);ui.time.textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;ui.day.textContent=`اليوم ${state.day} — ${weekdays[(state.day-1)%7]}`;const [a,b]=taskCopy();ui.taskTitle.textContent=a;ui.taskText.textContent=b;if(ui.sound)ui.sound.textContent=audio.enabled?'🔊 الصوت':'🔇 مكتوم';}
  function showToast(text){ui.toast.textContent=text;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),2300);}
  function drawMap(){const c=ui.map,ctx=c.getContext('2d'),s=c.width,scale=s/world.size;ctx.clearRect(0,0,s,s);ctx.fillStyle='#6f6853';ctx.fillRect(0,0,s,s);ctx.fillStyle='#3f4240';for(const r of world.roads){ctx.fillRect((r+world.size/2-4.75)*scale,0,9.5*scale,s);ctx.fillRect(0,(r+world.size/2-4.75)*scale,s,9.5*scale);}ctx.fillStyle='#d3b85e';ctx.fillRect((world.market.x+world.size/2-15)*scale,(world.market.z+world.size/2-12)*scale,30*scale,24*scale);ctx.save();ctx.translate((camera.position.x+world.size/2)*scale,(camera.position.z+world.size/2)*scale);ctx.rotate(-yaw);ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(4,5);ctx.lineTo(-4,5);ctx.closePath();ctx.fill();ctx.restore();}

  function applyLook(dx,dy){yaw+=dx*.00225;pitch=clamp(pitch+dy*.0019,-1.15,1.15);}
  function setupInput(){
    addEventListener('keydown',e=>{keys.add(e.code);if(e.code==='KeyE')interact();if(e.code==='ShiftLeft'||e.code==='ShiftRight')running=true;if(e.code==='Escape')closeModals();if(e.code==='KeyM')toggleAudio();});
    addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='ShiftLeft'||e.code==='ShiftRight')running=false;});
    if(!isTouch){canvas.addEventListener('click',()=>{if(ui.menu.style.display==='none'&&!modal)canvas.requestPointerLock?.();});document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&!modal)applyLook(e.movementX,e.movementY);});}
    else{
      ui.joy.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;ui.joy.setPointerCapture(e.pointerId);setJoy(e);});ui.joy.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)setJoy(e);});
      const end=e=>{if(e.pointerId===joyPointer){joyPointer=null;joyX=joyY=0;ui.knob.style.transform='translate(0,0)';}};ui.joy.addEventListener('pointerup',end);ui.joy.addEventListener('pointercancel',end);
      canvas.addEventListener('pointerdown',e=>{lookPointer=e.pointerId;lastPX=e.clientX;lastPY=e.clientY;});canvas.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer||modal)return;const dx=e.clientX-lastPX,dy=e.clientY-lastPY;lastPX=e.clientX;lastPY=e.clientY;applyLook(dx,dy);});canvas.addEventListener('pointerup',e=>{if(e.pointerId===lookPointer)lookPointer=null;});canvas.addEventListener('pointercancel',e=>{if(e.pointerId===lookPointer)lookPointer=null;});
    }
    ui.shopClose.onclick=closeModals;ui.dialogClose.onclick=closeModals;ui.act.onclick=interact;ui.run.onpointerdown=()=>running=true;ui.run.onpointerup=()=>running=false;ui.run.onpointercancel=()=>running=false;if(ui.sound)ui.sound.onclick=toggleAudio;
    addEventListener('beforeunload',saveState);addEventListener('resize',()=>engine.resize());
  }
  function setJoy(e){const r=ui.joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=40,len=Math.hypot(dx,dy)||1,k=Math.min(1,max/len),nx=dx*k,ny=dy*k;joyX=nx/max;joyY=-ny/max;ui.knob.style.transform=`translate(${nx}px,${ny}px)`;}

  function resetState(){state={...DEFAULT_STATE};yaw=0;pitch=0;if(camera){camera.position.set(DEFAULT_STATE.savedX,PLAYER_EYE,DEFAULT_STATE.savedZ);camera.rotation.set(0,0,0);}updateHUD();}
  function enterGame(newGame){if(newGame){localStorage.removeItem(SAVE_KEY);resetState();}else{state=loadState();camera.position.set(state.savedX,PLAYER_EYE,state.savedZ);yaw=camera.rotation.y=0;pitch=camera.rotation.x=0;updateHUD();}ui.menu.style.display='none';ui.menuStatus.textContent='';startAudio();if(!isTouch)setTimeout(()=>canvas.requestPointerLock?.(),80);showToast(newGame?'بدأت يوم جديد في الحارة 🇪🇬':'رجعت لآخر مكان محفوظ');}
  function setupMenu(){ui.cont.disabled=!hasSave();ui.cont.style.opacity=hasSave()?'1':'.45';ui.cont.onclick=()=>{if(hasSave())enterGame(false);};ui.newGame.onclick=()=>enterGame(true);ui.reset.onclick=()=>{localStorage.removeItem(SAVE_KEY);ui.cont.disabled=true;ui.cont.style.opacity='.45';ui.menuStatus.textContent='تم مسح الحفظ. تقدر تبدأ يوم جديد.';resetState();};if(!hasSave())ui.menuStatus.textContent='مفيش حفظ قديم لسه — ابدأ يوم جديد.';}

  // Procedural WebAudio: no missing mp3 files and no copyrighted recordings.
  function startAudio(){
    if(!audio.enabled)return;
    try{
      if(!audio.ctx){
        const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audio.ctx=new AC();audio.master=audio.ctx.createGain();audio.master.gain.value=.42;audio.master.connect(audio.ctx.destination);
        const len=audio.ctx.sampleRate*2,buf=audio.ctx.createBuffer(1,len,audio.ctx.sampleRate),data=buf.getChannelData(0);for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*.23;
        const noise=audio.ctx.createBufferSource();noise.buffer=buf;noise.loop=true;const lp=audio.ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=520;const g=audio.ctx.createGain();g.gain.value=.055;noise.connect(lp);lp.connect(g);g.connect(audio.master);noise.start();audio.noise=noise;
        const hum=audio.ctx.createOscillator();hum.type='sine';hum.frequency.value=58;const hg=audio.ctx.createGain();hg.gain.value=.018;hum.connect(hg);hg.connect(audio.master);hum.start();audio.hum=hum;
      }
      audio.ctx.resume();nextHorn=performance.now()+1800;
    }catch(e){console.warn('Audio unavailable',e);}
  }
  function toggleAudio(){audio.enabled=!audio.enabled;if(audio.master)audio.master.gain.value=audio.enabled?.42:0;if(audio.enabled)startAudio();updateHUD();showToast(audio.enabled?'الصوت اشتغل 🔊':'الصوت اتكتم 🔇');}
  function tone(freq,dur=.12,vol=.08,type='sine',delay=0){if(!audio.enabled||!audio.ctx||!audio.master)return;const t=audio.ctx.currentTime+delay,o=audio.ctx.createOscillator(),g=audio.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(audio.master);o.start(t);o.stop(t+dur+.03);}
  function playHorn(){tone(360,.18,.10,'square');tone(510,.13,.055,'square',.045);}
  function playStep(){if(!audio.enabled||!audio.ctx||!audio.master)return;const t=audio.ctx.currentTime,buf=audio.ctx.createBuffer(1,Math.floor(audio.ctx.sampleRate*.045),audio.ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=audio.ctx.createBufferSource(),g=audio.ctx.createGain(),f=audio.ctx.createBiquadFilter();s.buffer=buf;f.type='lowpass';f.frequency.value=420;g.gain.value=.065;s.connect(f);f.connect(g);g.connect(audio.master);s.start(t);}
  function playInteract(){tone(620,.08,.045,'sine');}
  function playBuy(){tone(760,.08,.06,'triangle');tone(990,.1,.05,'triangle',.07);}
  function updateAudio(){if(!audio.enabled||!audio.ctx)return;const now=performance.now();if(now>nextHorn){let nearest=999;for(const v of world.vehicles)nearest=Math.min(nearest,Math.hypot(v.root.position.x-camera.position.x,v.root.position.z-camera.position.z));if(nearest<45)playHorn();nextHorn=now+2800+Math.random()*5200;}}

  window.__egyptDebug={
    getCamera:()=>({x:camera.position.x,y:camera.position.y,z:camera.position.z,yaw,pitch,fov:camera.fov,ellipsoidY:camera.ellipsoid.y,offsetY:camera.ellipsoidOffset.y}),
    applyLook:(dx,dy)=>{applyLook(dx,dy);camera.rotation.x=pitch;camera.rotation.y=yaw;},
    audioState:()=>({enabled:audio.enabled,state:audio.ctx?.state||'none'}),
    resetPose:()=>{camera.position.set(-10,PLAYER_EYE,12);yaw=0;pitch=0;camera.rotation.set(0,0,0);}
  };

  window.addEventListener('error',e=>{ui.error.style.display='block';ui.error.textContent='حصل خطأ أثناء تشغيل اللعبة: '+(e.message||'خطأ غير معروف');});
  try{buildScene();setupMenu();setupInput();updateHUD();engine.runRenderLoop(()=>scene.render());}catch(err){console.error(err);ui.error.style.display='block';ui.error.textContent='اللعبة وقفت أثناء التحميل: '+err.message;}
})();