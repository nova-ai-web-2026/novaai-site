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
    ui.error.style.display='block';
    ui.error.textContent='تعذر تحميل محرك اللعبة. تأكد من اتصال الإنترنت ثم أعد تحميل الصفحة.';
    return;
  }

  const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const SAVE_KEY='hayat-masr-v4';
  const EYE=1.72;
  const DEFAULT={money:300,hunger:84,energy:92,mood:76,minute:500,day:1,task:0,worked:0,breakfastBread:0,breakfastFul:false,breakfastDelivered:false,breakfastSpent:0,savedX:-18,savedZ:-18};
  const weekdays=['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];
  const shopData=[
    {name:'فول وطعمية أبو علي',type:'ful',sign:'#7e3422',desc:'فول وطعمية وعيش بلدي سخن.',items:[['ساندوتش فول',14,22,3],['ساندوتش طعمية',12,18,4],['طبق فول',25,34,4]]},
    {name:'كشري التحرير',type:'koshary',sign:'#a33c2d',desc:'رز ومكرونة وعدس وحمص وصلصة ودقة.',items:[['كشري صغير',35,32,5],['كشري كبير',52,48,8],['رز بلبن',24,15,8]]},
    {name:'قهوة المعلم',type:'ahwa',sign:'#5b3b25',desc:'شاي وقهوة وقعدة شعبية على الرصيف.',items:[['شاي كشري',10,1,7],['شاي بالنعناع',13,1,9],['قهوة سادة',18,0,12]]},
    {name:'فرن العيش البلدي',type:'bakery',sign:'#8b6135',desc:'عيش وفطير وقرص طالعين سخنين.',items:[['رغيف عيش',3,7,1],['فطيرة جبنة',30,24,4],['قرص سادة',14,10,2]]},
    {name:'عصير قصب ولاد البلد',type:'juice',sign:'#28694a',desc:'قصب وبرتقال ومانجا ساقعين.',items:[['قصب',18,0,12],['برتقال',25,1,11],['مانجا',32,3,14]]},
    {name:'كشك عم صابر',type:'kiosk',sign:'#285a84',desc:'مياه وسناكس ومناديل وحاجات سريعة.',items:[['مياه',7,0,3],['بسكوت',10,7,2],['عصير',15,2,7]]},
    {name:'بقالة الأمانة',type:'grocery',sign:'#456936',desc:'احتياجات البيت اليومية.',items:[['جبنة وعيش',30,22,3],['زبادي',12,9,3],['حلاوة',18,14,4]]},
    {name:'خضار وفاكهة البركة',type:'produce',sign:'#366f3a',desc:'خضار وفاكهة من السوق.',items:[['موز',25,12,5],['برتقال',22,8,5],['طماطم وخيار',28,10,3]]},
    {name:'كبدة وسجق إسكندراني',type:'kebda',sign:'#8e3d28',desc:'ساندوتشات كبدة وسجق سريعة.',items:[['ساندوتش كبدة',32,26,7],['ساندوتش سجق',35,27,7]]}
  ];
  const sayings=[
    ['عم سيد','صباح الفل يا ابني، الحق الفول قبل الزحمة.'],['أم محمود','خد بالك وإنت معدّي الشارع.'],['الحاج رضا','الحر النهارده محتاج قصب ساقع.'],
    ['مينا','الماتش بالليل على القهوة.'],['عم رجب','العيش لسه طالع سخن من الفرن.'],['سارة','لو رايح السوق هات طماطم وخيار.'],
    ['المعلم شوقي','الشغل عايز حركة يا نجم.'],['نجلاء','بالليل الشارع بيهدى بس القهوة بتفضل منورة.']
  ];

  let state=loadState();
  let engine,scene,camera,sun,hemi,sky;
  let yaw=0,pitch=0,current=null,modal=false,running=false,lastSave=0,toastTimer=0;
  let joyX=0,joyY=0,joyPointer=null,lookPointer=null,lastPX=0,lastPY=0,stepClock=0,nextHorn=0;
  const keys=new Set(), mats=new Map();
  const world={size:216,roads:[-72,-24,24,72],interactables:[],people:[],vehicles:[],lights:[],market:{x:48,z:-48},home:null,job:null};
  const audio={ctx:null,master:null,enabled:true,noise:null,hum:null};

  function loadState(){
    try{
      const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}'),loaded=Object.assign({},DEFAULT,saved);
      // Earlier saves that finished breakfast keep their existing task progress.
      if(!Object.hasOwn(saved,'breakfastDelivered')&&loaded.task>0)loaded.breakfastDelivered=true;
      loaded.breakfastBread=loaded.breakfastBread===4?4:0;
      loaded.breakfastFul=loaded.breakfastFul===true;loaded.breakfastDelivered=loaded.breakfastDelivered===true;
      loaded.breakfastSpent=Math.max(0,Number(loaded.breakfastSpent)||0);return loaded;
    }catch{return {...DEFAULT};}
  }
  function saveState(){if(!camera||window.__V12_PROLOGUE?.running)return;state.savedX=+camera.position.x.toFixed(2);state.savedZ=+camera.position.z.toFixed(2);localStorage.setItem(SAVE_KEY,JSON.stringify(state));}
  function hasSave(){return !!localStorage.getItem(SAVE_KEY);}
  function clamp(v,a=0,b=100){return Math.max(a,Math.min(b,v));}
  function rnd(seed){const n=Math.sin(seed*12.9898+78.233)*43758.5453;return n-Math.floor(n);}

  function mat(name,hex,emit=''){
    const key=name+hex+emit;if(mats.has(key))return mats.get(key);
    const m=new BABYLON.StandardMaterial(key,scene);m.diffuseColor=BABYLON.Color3.FromHexString(hex);m.specularColor=new BABYLON.Color3(.025,.025,.025);if(emit)m.emissiveColor=BABYLON.Color3.FromHexString(emit);mats.set(key,m);return m;
  }
  function plaster(name,hex,seed){
    const key=`plaster-${name}-${seed}`;if(mats.has(key))return mats.get(key);
    const tex=new BABYLON.DynamicTexture(key+'Tex',{width:256,height:256},scene,false),c=tex.getContext();c.fillStyle=hex;c.fillRect(0,0,256,256);
    for(let i=0;i<700;i++){const a=.018+rnd(seed+i*5)*.055;c.fillStyle=rnd(seed+i)>.5?`rgba(255,255,255,${a})`:`rgba(55,36,22,${a})`;c.fillRect(rnd(seed+i*7)*256,rnd(seed+i*11)*256,1+rnd(seed+i*13)*2,1+rnd(seed+i*17)*2);}
    for(let i=0;i<6;i++){c.strokeStyle='rgba(70,45,30,.11)';c.beginPath();const x=rnd(seed+i*19)*256,y=rnd(seed+i*23)*256;c.moveTo(x,y);c.lineTo(x+rnd(seed+i*29)*45-22,y+rnd(seed+i*31)*65);c.stroke();}
    tex.update();tex.uScale=2;tex.vScale=2;const m=new BABYLON.StandardMaterial(key,scene);m.diffuseTexture=tex;m.specularColor=BABYLON.Color3.Black();mats.set(key,m);return m;
  }
  function box(name,w,h,d,x,y,z,material,collision=false){const m=BABYLON.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);m.position.set(x,y,z);m.material=material;m.checkCollisions=collision;return m;}
  function cyl(name,dia,h,x,y,z,material,tess=12,collision=false){const m=BABYLON.MeshBuilder.CreateCylinder(name,{diameter:dia,height:h,tessellation:tess},scene);m.position.set(x,y,z);m.material=material;m.checkCollisions=collision;return m;}
  function sign(text,x,y,z,w=6,h=.85,bg='#4d3425',rot=Math.PI){
    const tex=new BABYLON.DynamicTexture('sign'+Math.random(),{width:900,height:160},scene,false),c=tex.getContext();c.fillStyle=bg;c.fillRect(0,0,900,160);c.fillStyle='#fff3d4';c.font='bold 62px Tahoma,Arial';c.textAlign='center';c.textBaseline='middle';c.direction='rtl';c.fillText(text,450,83);tex.update();
    const sm=new BABYLON.StandardMaterial('signMat'+Math.random(),scene);sm.diffuseTexture=tex;sm.emissiveColor=new BABYLON.Color3(.08,.07,.05);sm.backFaceCulling=false;const p=BABYLON.MeshBuilder.CreatePlane('sign',{width:w,height:h},scene);p.position.set(x,y,z);p.rotation.y=rot;p.material=sm;p.isPickable=false;return p;
  }

  function buildScene(){
    engine=new BABYLON.Engine(canvas,true,{antialias:true,adaptToDeviceRatio:true});
    scene=new BABYLON.Scene(engine);scene.collisionsEnabled=true;scene.clearColor=new BABYLON.Color4(.69,.78,.84,1);scene.fogMode=BABYLON.Scene.FOGMODE_EXP2;scene.fogDensity=.0017;scene.fogColor=new BABYLON.Color3(.72,.75,.73);
    camera=new BABYLON.UniversalCamera('player',new BABYLON.Vector3(state.savedX,EYE,state.savedZ),scene);camera.minZ=.05;camera.fov=.86;camera.inertia=0;camera.checkCollisions=true;camera.applyGravity=false;camera.ellipsoid=new BABYLON.Vector3(.42,.84,.42);camera.ellipsoidOffset=new BABYLON.Vector3(0,-.81,0);
    hemi=new BABYLON.HemisphericLight('ambient',new BABYLON.Vector3(.1,1,.2),scene);hemi.intensity=.7;hemi.groundColor=new BABYLON.Color3(.31,.25,.19);
    sun=new BABYLON.DirectionalLight('sun',new BABYLON.Vector3(-.4,-1,-.28),scene);sun.position.set(70,120,50);sun.intensity=1.25;
    const skyMat=mat('sky','#80aac5','#182a35');skyMat.backFaceCulling=false;skyMat.disableLighting=true;sky=BABYLON.MeshBuilder.CreateSphere('sky',{diameter:620,segments:12},scene);sky.material=skyMat;sky.infiniteDistance=true;sky.isPickable=false;
    const ground=BABYLON.MeshBuilder.CreateGround('ground',{width:world.size,height:world.size},scene);ground.material=plaster('ground','#a79777',2);ground.checkCollisions=false;
    buildRoads();buildBuildings();buildMarket();buildAhwa();buildLandmarks();buildStreetProps();buildVehicles();buildPeople();
    scene.onBeforeRenderObservable.add(update);
  }

  function buildRoads(){
    const road=mat('road','#484947'),walk=mat('walk','#aaa195'),curb=mat('curb','#d2c8bb'),stripe=mat('stripe','#ddd7c9');
    for(const r of world.roads){
      box('roadV',9.5,.055,world.size,r,.03,0,road);box('roadH',world.size,.055,9.5,0,.032,r,road);
      // Visual-only sidewalks: they no longer act like low walls that can trap the player.
      box('walkV1',2.3,.13,world.size,r-5.9,.065,0,walk);box('walkV2',2.3,.13,world.size,r+5.9,.065,0,walk);
      box('walkH1',world.size,.13,2.3,0,.065,r-5.9,walk);box('walkH2',world.size,.13,2.3,0,.065,r+5.9,walk);
      box('curbV1',.16,.19,world.size,r-4.8,.095,0,curb);box('curbV2',.16,.19,world.size,r+4.8,.095,0,curb);
      box('curbH1',world.size,.19,.16,0,.095,r-4.8,curb);box('curbH2',world.size,.19,.16,0,.095,r+4.8,curb);
      for(let n=-100;n<=100;n+=10){box('dashV',.1,.018,3.2,r,.07,n,stripe);box('dashH',3.2,.018,.1,n,.072,r,stripe);}
    }
    for(const x of world.roads)for(const z of world.roads)for(let i=-3;i<=3;i++){box('crossV',.7,.018,3,x+i*1.05,.075,z,stripe);box('crossH',3,.018,.7,x,.076,z+i*1.05,stripe);}
  }

  function buildBuildings(){
    const centers=[-96,-48,0,48,96],palette=['#c8ae86','#b99672','#d0bea1','#c19f7d','#d3c2a5','#bfa98c','#c79c78'];let id=0;
    for(const x of centers)for(const z of centers){
      if((x===48&&z===-48)||(x===-48&&z===48))continue;
      const seed=Math.abs(x*7+z*11)+id++,w=24+Math.floor(rnd(seed)*7),d=22+Math.floor(rnd(seed+2)*8),floors=3+Math.floor(rnd(seed+4)*4),h=floors*3.05;
      const wall=plaster('facade'+seed,palette[seed%palette.length],seed);box('building',w,h,d,x,h/2,z,wall,true);box('baseBand',w+.04,.6,d+.04,x,.3,z,mat('base','#776b5c'));
      addRoof(x,z,w,d,h,seed);addFrontFacade(x,z,w,d,floors,seed);addSideFacade(x,z,w,d,floors,seed+9);
      if(seed%3===0)addUnfinishedRoof(x,z,w,d,h,seed);if(seed%4===0)box('drainPipe',.11,h-.7,.11,x+w/2-.45,h/2-.05,z-d/2-.17,mat('pipe','#77736d'));
    }
  }

  function addFrontFacade(x,z,w,d,floors,seed){
    const front=z-d/2-.045,cols=Math.max(2,Math.floor(w/5.6));
    for(let f=1;f<floors;f++){
      for(let c=0;c<cols;c++){const wx=x-w/2+(c+.5)*w/cols;addWindowFront(wx,f*3.05+1.4,front,seed+f*13+c);}
      if(f%2===1&&floors>3)addBalcony(x,front,f*3.05+1.2,w,seed+f);
    }
    addShops(x,front,w,seed);
  }
  function addSideFacade(x,z,w,d,floors,seed){
    const side=x+w/2+.045,cols=Math.max(2,Math.floor(d/5.8));
    for(let f=1;f<floors;f++)for(let c=0;c<cols;c++){const wz=z-d/2+(c+.5)*d/cols;box('windowSide',.16,1.35,1.95,side+.04,f*3.05+1.4,wz,mat('window','#26343a','#071014'));box('sideSill',.21,.1,2.12,side+.1,f*3.05+.71,wz,mat('frame','#d2c6b3'));}
  }
  function addWindowFront(x,y,z,seed){
    const dark=mat('window','#26343a','#071014'),frame=mat('frame','#d2c6b3');box('windowRecess',2,1.36,.14,x,y,z-.05,dark);box('frameT',2.16,.09,.2,x,y+.72,z-.1,frame);box('frameB',2.16,.09,.2,x,y-.72,z-.1,frame);box('frameL',.09,1.43,.2,x-1.035,y,z-.1,frame);box('frameR',.09,1.43,.2,x+1.035,y,z-.1,frame);box('mullion',.06,1.28,.18,x,y,z-.13,mat('mullion','#9d978e'));if(seed%5===0)box('shutter',2.02,.86,.11,x,y-.2,z-.18,mat('shutter','#665b50'));
  }
  function addBalcony(x,front,y,w,seed){
    const bw=Math.min(w*.56,10.5),rail=mat('rail','#47443f');box('balconySlab',bw,.15,1.22,x,y-.74,front-.61,mat('slab','#b7a58d'));box('railTop',bw,.065,.065,x,y-.12,front-1.19,rail);const posts=Math.max(4,Math.floor(bw/.75));for(let i=0;i<=posts;i++)box('railPost',.045,.6,.045,x-bw/2+i*bw/posts,y-.43,front-1.19,rail);
    if(seed%2===0){const cs=['#eee3d4','#6f82a0','#b15b52','#ddc45c','#678368'];for(let i=0;i<5;i++)box('laundry',.57,.67,.024,x-1.6+i*.8,y-.02-(i%2)*.06,front-1.24,mat('cloth'+i,cs[i]));}if(seed%3===0)addAC(x+bw*.33,y-.05,front-.17);
  }
  function addAC(x,y,z){box('ac',.88,.54,.36,x,y,z-.21,mat('ac','#d9d5cc'));for(let i=-2;i<=2;i++)box('acVent',.55,.023,.018,x,y+i*.064,z-.4,mat('vent','#777'));}
  function addRoof(x,z,w,d,h,seed){
    const rm=mat('roof','#91816d');box('roof',w+.1,.28,d+.1,x,h+.14,z,rm);box('parapetF',w,.62,.17,x,h+.45,z-d/2+.05,rm);box('parapetB',w,.62,.17,x,h+.45,z+d/2-.05,rm);box('parapetL',.17,.62,d,x-w/2+.05,h+.45,z,rm);box('parapetR',.17,.62,d,x+w/2-.05,h+.45,z,rm);cyl('waterTank',1.42,1.75,x-w*.23,h+1.12,z+d*.18,mat('tank','#30363a'),14);
    if(seed%2===0){cyl('dishPole',.06,.65,x+w*.21,h+.84,z-d*.15,mat('metal','#666'),8);const dish=BABYLON.MeshBuilder.CreateDisc('dish',{radius:.66,tessellation:18},scene);dish.position.set(x+w*.21,h+1.23,z-d*.15);dish.rotation.x=1.05;dish.rotation.z=seed*.08;dish.material=mat('dish','#d5cfc4');dish.isPickable=false;}
  }
  function addUnfinishedRoof(x,z,w,d,h){box('unfinished',w*.56,1.1,d*.52,x+w*.1,h+.7,z,mat('brick','#995d42'));for(let i=-2;i<=2;i++)box('rebar',.05,1.4,.05,x+i*1.75,h+1.65,z-d*.17,mat('rebar','#4b4844'));}

  function addShops(x,front,w,seed){
    const count=Math.max(2,Math.floor(w/7.5)),sw=w/count;
    for(let s=0;s<count;s++){
      const sx=x-w/2+sw*(s+.5),data=shopData[Math.abs(seed+s)%shopData.length];box('shopFrame',sw-.28,2.58,.24,sx,1.4,front-.15,mat('shopFrame','#392f28'));const glass=box('shopGlass',sw-.62,2.16,.1,sx,1.34,front-.3,mat('shopGlass','#26373b','#071012'));glass.metadata={shopName:data.name,shopType:data.type};
      const aw=box('awning',sw-.34,.11,1.02,sx,2.7,front-.73,mat('awning'+data.type,data.sign));aw.rotation.x=.1;for(let i=-2;i<=2;i++){const st=box('awningStripe',.16,.018,.9,sx+i*(sw-.8)/5,2.64,front-.75,mat('awningStripe',i%2?'#f0dfbf':'#6f4b34'));st.rotation.x=.1;}
      sign(data.name,sx,3.17,front-.26,Math.min(sw-.52,7),.73,data.sign);const hot=box('shopHot',sw-.42,2.65,1.3,sx,1.34,front-.92,mat('hot','#fff'));hot.visibility=0;world.interactables.push({mesh:hot,kind:'shop',name:data.name,data,x:sx,z:front-1});
      if(data.type==='produce')decorateProduce(sx,front-1.5);if(data.type==='bakery')decorateBread(sx,front-1.5);if(data.type==='kiosk')decorateKiosk(sx,front-1.48);
    }
  }
  function decorateProduce(x,z){for(let i=-2;i<=2;i++){box('crate',.8,.4,.6,x+i*.86,.24,z,mat('crate','#7b593b'));const f=BABYLON.MeshBuilder.CreateSphere('fruit',{diameter:.23,segments:6},scene);f.position.set(x+i*.86,.55,z);f.material=mat('fruit'+i,i%2?'#cb5b38':'#7e9b43');f.isPickable=false;}}
  function decorateBread(x,z){for(let i=-1;i<=1;i++){box('tray',.92,.05,.46,x+i, .4,z,mat('tray','#777'));for(let j=-1;j<=1;j++){const b=BABYLON.MeshBuilder.CreateSphere('bread',{diameter:.33,segments:8},scene);b.scaling.y=.34;b.position.set(x+i+j*.26,.52,z);b.material=mat('bread','#c99250');b.isPickable=false;}}}
  function decorateKiosk(x,z){const cs=['#b8483a','#d1ae3d','#4b82a4','#799a51','#b96a3c'];for(let i=-2;i<=2;i++)box('pack',.35,.39,.25,x+i*.39,.23,z,mat('pack'+i,cs[i+2]));}

  function buildMarket(){
    const x=48,z=-48;sign('سوق الحارة',x,4,z+14,7.2,.95,'#874b2c',0);for(let i=0;i<4;i++){const sx=x-12.4+i*8.3;box('stall',5.9,.7,3.3,sx,.36,z+2.5,mat('stall','#725039'),true);box('shade',6.2,.11,3.9,sx,2.7,z+2.5,mat('shade'+i,i%2?'#c69a3d':'#b8493a'));decorateProduce(sx,z+.5);}const hot=box('marketHot',30,2.4,22,x,1.2,z,mat('hot','#fff'));hot.visibility=0;world.interactables.push({mesh:hot,kind:'market',name:'سوق الحارة',x,z});
  }
  function buildAhwa(){
    const x=-48,z=48;sign('قهوة المعلم فتحي',x,3.65,z-13,7,.9,'#5b3923',0);for(let r=0;r<2;r++)for(let c=0;c<4;c++){const px=x-6.4+c*4.15,pz=z-6.4+r*4;cyl('table',1,.7,px,.35,pz,mat('table','#705034'),10);for(const ox of [-.88,.88])box('chair',.49,.7,.49,px+ox,.35,pz,mat('chair','#68472f'));}}
  function buildLandmarks(){
    const familyBuilding=scene.meshes.find(mesh=>mesh.name==='building'&&mesh.position.x===-96&&mesh.position.z===-96);
    familyBuilding.computeWorldMatrix(true);const homeZ=familyBuilding.getBoundingInfo().boundingBox.maximumWorld.z+.15;
    const h=box('homeDoor',2.1,2.8,.25,-96,1.4,homeZ,mat('door','#553622'));sign('بيت العيلة',-96,3.34,homeZ+.18,3.2,.72,'#553622');
    world.home={mesh:h,kind:'home',name:'بيت العيلة',x:-96,z:homeZ};world.interactables.push(world.home);
    const j=box('jobBooth',3.7,2.25,1.9,-16,1.13,64,mat('job','#245d66'),true);sign('طلبات الحارة',-16,2.82,63,4.1,.78,'#245d66');world.job={mesh:j,kind:'job',name:'شغل التوصيل',x:-16,z:64};world.interactables.push(world.job);
    buildFulCart(-8,-18);box('mosque',13,6,11,91,3,91,plaster('mosque','#d6ccb5',91),true);const dome=BABYLON.MeshBuilder.CreateSphere('dome',{diameter:5.4,segments:16,slice:.55},scene);dome.position.set(91,7.1,91);dome.material=mat('dome','#819781');cyl('minaret',1.55,13,97,6.5,92,plaster('minaret','#d6c8aa',92),12,true);
  }
  function buildFulCart(x,z){box('cart',2.7,.82,1.45,x,.55,z,mat('cart','#407455'),true);cyl('fulPot',.92,.66,x,.85,z,mat('pot','#898881'),14);sign('فول وطعمية',x,1.74,z-.82,2.8,.58,'#407455');const hot=box('fulHot',2.9,2,2,x,1,z,mat('hot','#fff'));hot.visibility=0;world.interactables.push({mesh:hot,kind:'shop',name:'عربية فول وطعمية',x,z,data:shopData[0]});}

  function buildStreetProps(){
    const lm=mat('lamp','#494744');for(const x of world.roads)for(const z of world.roads){const px=x+7.4,pz=z+7.4;cyl('lampPole',.11,5.2,px,2.6,pz,lm,8);box('lampArm',1.15,.08,.08,px+.53,5,pz,lm);const b=BABYLON.MeshBuilder.CreateSphere('bulb',{diameter:.37,segments:7},scene);b.position.set(px+1.05,4.92,pz);b.material=mat('bulb','#fff0bd','#5c471e');world.lights.push(b);}
    for(let i=-2;i<=2;i++){const z=i*36+10;cyl('utility',.18,7,-104,3.5,z,mat('pole','#554437'),8);cyl('utility',.18,7,104,3.5,z,mat('pole','#554437'),8);addCable(-104,6.1,z,104,6.1,z+.8);addCable(-104,5.7,z+.3,104,5.7,z-.4);}
    for(let i=0;i<12;i++){const x=-95+(i*37)%190,z=-94+(i*53)%188;if(world.roads.every(r=>Math.abs(x-r)>8)&&world.roads.every(r=>Math.abs(z-r)>8)){cyl('treeTrunk',.34,2.3,x,1.15,z,mat('trunk','#6c4e35'),8);const crown=BABYLON.MeshBuilder.CreateSphere('treeCrown',{diameter:2.8,segments:8},scene);crown.position.set(x,3,z);crown.scaling.y=.82;crown.material=mat('leaf','#58714b');crown.isPickable=false;}}
  }
  function addCable(x1,y1,z1,x2,y2,z2){const path=[];for(let i=0;i<=10;i++){const t=i/10;path.push(new BABYLON.Vector3(x1+(x2-x1)*t,y1+(y2-y1)*t-Math.sin(Math.PI*t)*.7,z1+(z2-z1)*t));}const m=BABYLON.MeshBuilder.CreateTube('cable',{path,radius:.025,tessellation:5},scene);m.material=mat('cable','#242424');m.isPickable=false;}

  function makeVehicle(type,i){
    const vertical=i%2===0,lane=world.roads[i%world.roads.length]+(i%3===0?2.1:-2.1),along=-105+(i*31)%210,root=new BABYLON.TransformNode(type+'Root',scene);root.position=vertical?new BABYLON.Vector3(lane,.52,along):new BABYLON.Vector3(along,.52,lane);root.rotation.y=vertical?0:Math.PI/2;
    let w=1.76,h=1.08,d=3.75,col='#dddcd7',speed=.095;if(type==='micro'){w=2;h=1.58;d=4.8;col='#e7e5dc';speed=.082;}if(type==='tuktuk'){w=1.28;h=1.42;d=2.12;col=['#28688a','#a64039','#4d7043'][i%3];speed=.07;}if(type==='taxi'){col='#e9e8e3';speed=.09;}
    const lower=box('vehLower',w,.55,d,0,-.03,0,mat(type+'body'+i,col));lower.parent=root;const upper=box('vehUpper',w*.9,h*.66,d*.62,0,.48,.1,mat(type+'upper'+i,col));upper.parent=root;const wind=box('wind',w*.78,.44,.07,0,.55,-d*.31,mat('vehGlass','#23343b','#071116'));wind.parent=root;
    const hit=box('vehCollider',w*.92,Math.max(.9,h),d*.88,0,.18,0,mat('hot','#fff'),true);hit.visibility=0;hit.parent=root;
    if(type==='micro'){for(let s=-1;s<=1;s++){const side=box('microWindow',w+.03,.47,.75,0,.57,s*.94,mat('vehGlass','#23343b','#071116'));side.parent=root;}const st=box('microStripe',w+.04,.12,d*.82,0,.04,0,mat('microStripe','#416b88'));st.parent=root;}
    if(type==='taxi'){const st=box('taxiStripe',w+.04,.13,d*.78,0,.02,0,mat('taxiStripe','#222'));st.parent=root;}if(type==='tuktuk'){const cp=box('canopy',w*1.02,.12,d*.72,0,1.17,.05,mat('canopy','#202020'));cp.parent=root;}
    for(const sx of [-1,1])for(const sz of [-1,1]){const wh=BABYLON.MeshBuilder.CreateCylinder('wheel',{diameter:.5,height:.2,tessellation:10},scene);wh.parent=root;wh.position.set(sx*w*.47,-.33,sz*d*.31);wh.rotation.z=Math.PI/2;wh.material=mat('wheel','#171717');}
    return{root,vertical,dir:i%3===0?-1:1,speed,type};
  }
  function buildVehicles(){const types=['micro','taxi','car','tuktuk','car','micro','taxi'];for(let i=0;i<20;i++)world.vehicles.push(makeVehicle(types[i%types.length],i));}

  function makePerson(x,z,i){
    const root=new BABYLON.TransformNode('personRoot',scene);root.position.set(x,0,z);const skin=mat('skin','#b98563'),cols=['#455f77','#744e40','#45684a','#6b4b71','#817047','#4b4b4b'];
    const torso=box('torso',.58,.85,.32,0,1.05,0,mat('shirt'+i,cols[i%cols.length]));torso.parent=root;const head=BABYLON.MeshBuilder.CreateSphere('head',{diameter:.44,segments:8},scene);head.parent=root;head.position.y=1.72;head.material=skin;
    const legL=box('legL',.18,.72,.2,-.16,.43,0,mat('pants'+i,'#343b40')),legR=box('legR',.18,.72,.2,.16,.43,0,mat('pants'+i,'#343b40')),armL=box('armL',.15,.72,.16,-.38,1.08,0,skin),armR=box('armR',.15,.72,.16,.38,1.08,0,skin);legL.parent=legR.parent=armL.parent=armR.parent=root;
    const data={root,legL,legR,armL,armR,axis:i%2,dir:i%3===0?-1:1,speed:.016+(i%4)*.003,phase:i*.7,name:sayings[i%sayings.length][0],line:sayings[i%sayings.length][1]};world.interactables.push({kind:'person',name:data.name,data,root});return data;
  }
  function buildPeople(){for(let i=0;i<28;i++)world.people.push(makePerson(-100+(i*29)%200,-100+(i*41)%200,i));}

  function update(){
    const dt=Math.min(engine.getDeltaTime(),45)/16.6667,active=ui.menu.style.display==='none'&&!modal&&!window.__V12_PROLOGUE?.running;if(active){updateMovement(dt);updateNeeds(dt);updateVehicles(dt);updatePeople(dt);updateInteraction();updateAudio();}updateDayNight();updateHUD();drawMap();const now=performance.now();if(now-lastSave>12000&&ui.menu.style.display==='none'&&!window.__V12_PROLOGUE?.running){saveState();lastSave=now;}
  }
  function updateMovement(dt){
    let forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),strafe=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);if(TOUCH){forward+=joyY;strafe+=joyX;}const len=Math.hypot(forward,strafe);if(len>1){forward/=len;strafe/=len;}
    if(Math.abs(forward)+Math.abs(strafe)>.02){const fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw),speed=(running?.19:.115)*dt;camera.moveWithCollisions(new BABYLON.Vector3((fx*forward+rx*strafe)*speed,0,(fz*forward+rz*strafe)*speed));stepClock+=dt*(running?1.55:1);if(stepClock>25){stepClock=0;playStep();}}
    camera.position.y=EYE;camera.rotation.x=pitch;camera.rotation.y=yaw;
  }
  function updateNeeds(dt){const moving=keys.has('KeyW')||keys.has('KeyS')||keys.has('KeyA')||keys.has('KeyD')||Math.abs(joyX)+Math.abs(joyY)>.1;state.hunger=clamp(state.hunger-.0022*dt);state.energy=clamp(state.energy-(moving?(running?.0041:.0017):-.00045)*dt);if(state.hunger<25)state.mood=clamp(state.mood-.0011*dt);state.minute+=.011*dt;if(state.minute>=1440){state.minute-=1440;state.day++;}}
  function updateVehicles(dt){for(const v of world.vehicles){if(v.vertical){v.root.position.z+=v.speed*v.dir*dt;if(v.root.position.z>112)v.root.position.z=-112;if(v.root.position.z<-112)v.root.position.z=112;}else{v.root.position.x+=v.speed*v.dir*dt;if(v.root.position.x>112)v.root.position.x=-112;if(v.root.position.x<-112)v.root.position.x=112;}}}
  function nearestRoad(v){return world.roads.reduce((a,b)=>Math.abs(b-v)<Math.abs(a-v)?b:a,world.roads[0]);}
  function updatePeople(dt){for(const p of world.people){p.phase+=.08*dt;const sw=Math.sin(p.phase*5)*.45;p.legL.rotation.x=sw;p.legR.rotation.x=-sw;p.armL.rotation.x=-sw*.7;p.armR.rotation.x=sw*.7;if(p.axis===0){p.root.position.x+=p.speed*p.dir*dt;p.root.position.z=nearestRoad(p.root.position.z)+(p.phase%2>1?7:-7);if(p.root.position.x>106)p.root.position.x=-106;if(p.root.position.x<-106)p.root.position.x=106;p.root.rotation.y=p.dir>0?Math.PI/2:-Math.PI/2;}else{p.root.position.z+=p.speed*p.dir*dt;p.root.position.x=nearestRoad(p.root.position.x)+(p.phase%2>1?7:-7);if(p.root.position.z>106)p.root.position.z=-106;if(p.root.position.z<-106)p.root.position.z=106;p.root.rotation.y=p.dir>0?0:Math.PI;}}}

  function itemPos(i){if(i.root)return i.root.position;if(i.mesh)return i.mesh.position;return new BABYLON.Vector3(i.x||0,0,i.z||0);}
  function updateInteraction(){let best=null,bestD=3;for(const i of world.interactables){const p=itemPos(i),d=Math.hypot(p.x-camera.position.x,p.z-camera.position.z);if(d<bestD){bestD=d;best=i;}}current=best;ui.prompt.classList.toggle('show',!!best);if(best)ui.prompt.textContent=`${TOUCH?'تفاعل':'E'} — ${best.name}`;}
  function releaseMouse(){if(document.pointerLockElement)document.exitPointerLock?.();}
  function emitSfx(name){window.dispatchEvent(new CustomEvent('egypt-sfx',{detail:{name}}));}
  function interact(){
    if(ui.menu.style.display!=='none'||window.__V12_PROLOGUE?.running)return;
    if(modal){closeModals();return;}
    if(window.__V12_INTERACT_DOOR?.())return;
    if(!current)return;emitSfx('interact');playInteract();
    if(current.kind==='shop')openShop(current.data);
    else if(current.kind==='person')openDialog(current.data.name,current.data.line);
    else if(current.kind==='market'){state.mood=clamp(state.mood+3);showToast('لفّيت في سوق الحارة 👌');advanceTask('market');}
    else if(current.kind==='job')startJob();
    else if(current.kind==='home')visitHome();
  }
  function missingBreakfast(){return [!state.breakfastBread?'٤ أرغفة عيش':'',!state.breakfastFul?'طبق فول':''].filter(Boolean);}
  function breakfastOffer(data){
    if(state.breakfastDelivered)return null;
    if(data.type==='bakery')return {key:'bread',name:'٤ أرغفة عيش للبيت',price:12,owned:state.breakfastBread===4};
    if(data.type==='ful')return {key:'ful',name:'طبق فول للبيت',price:25,owned:state.breakfastFul};
    return null;
  }
  function buyBreakfast(data){
    const offer=breakfastOffer(data);if(!offer||offer.owned)return;
    if(state.money<offer.price){emitSfx('deny');showToast('الفلوس مش مكفية — جرّب شغل التوصيل');return;}
    state.money-=offer.price;state.breakfastSpent+=offer.price;state.minute+=7;
    if(offer.key==='bread')state.breakfastBread=4;else state.breakfastFul=true;
    emitSfx('buy');playBuy();saveState();updateHUD();openShop(data);
    showToast(missingBreakfast().length?'اتحط في الشنطة — باقي '+missingBreakfast().join(' و'):'الفطار جاهز — ارجع بيت العيلة');
  }
  function openShop(data){
    modal=true;releaseMouse();ui.shopTitle.textContent=data.name;ui.shopDesc.textContent=data.desc;ui.shopItems.innerHTML='';
    const offer=breakfastOffer(data);
    if(offer){
      const row=document.createElement('div');row.className='item errand-item';row.dataset.errand=offer.key;
      const label=document.createElement('div');label.innerHTML=`<b>${offer.name}</b><div class="errand-hint">طلب ماما · ${offer.price} جنيه · بيتحفظ في الشنطة</div>`;
      const button=document.createElement('button');button.textContent=offer.owned?'موجود في الشنطة':'حط في الشنطة';button.disabled=offer.owned;button.onclick=()=>buyBreakfast(data);
      row.append(label,button);ui.shopItems.appendChild(row);
    }
    for(const [name,price,hunger,mood] of data.items){
      const row=document.createElement('div');row.className='item';row.innerHTML=`<div><b>${name}</b><div style="font-size:11px;opacity:.66">${price} جنيه · للأكل دلوقتي</div></div>`;
      const button=document.createElement('button');button.textContent='اشتري';button.onclick=()=>{
        if(state.money<price){emitSfx('deny');showToast('الفلوس مش مكفية');return;}
        state.money-=price;state.hunger=clamp(state.hunger+hunger);state.mood=clamp(state.mood+mood);state.minute+=7;
        emitSfx('buy');playBuy();showToast(`اشتريت ${name}`);saveState();updateHUD();
      };row.appendChild(button);ui.shopItems.appendChild(row);
    }
    ui.shop.style.display='flex';
  }
  function visitHome(){
    if(!state.breakfastDelivered){
      const missing=missingBreakfast();
      if(missing.length){openDialog('ماما','رجعت بسرعة كده؟ إنت نزلت تجيب الفطار ولا تطمّن على الشارع؟\nلسه ناقص: '+missing.join(' و')+'. الحاجات اللي جبتها محفوظة في الشنطة.');return;}
      state.breakfastDelivered=true;state.breakfastBread=0;state.breakfastFul=false;
      state.money+=20;state.hunger=clamp(state.hunger+30);state.mood=clamp(state.mood+10);state.minute+=15;
      if(state.task===0)state.task=1;
      saveState();updateHUD();emitSfx('reward');
      openDialog('فطار العيلة','أنا: العيش والفول وصلوا… والفكة كمان، قبل ما تعملي لها نشرة مفقودين.\nماما: برافو! أول إنجاز النهارده من غير ما تقول الشبكة واقعة. خد ٢٠ جنيه، وافطر قبل ما تنزل السوق.\n\nتم تسليم الفطار · صرفت '+state.breakfastSpent+' جنيه · مكافأة ٢٠ جنيه');
      return;
    }
    state.energy=100;state.hunger=Math.max(state.hunger,62);state.minute+=60;
    showToast('رجعت بيت العيلة وارتحت');advanceTask('home');saveState();updateHUD();
  }
  function openDialog(who,text){modal=true;releaseMouse();ui.dialogWho.textContent=who;ui.dialogText.textContent=text;ui.dialog.style.display='flex';state.mood=clamp(state.mood+1);}
  function closeModals(){modal=false;ui.shop.style.display='none';ui.dialog.style.display='none';}
  function startJob(){if(state.energy<18){showToast('طاقتك قليلة، كل أو ارجع البيت الأول');return;}const pay=48+Math.floor(Math.random()*28);state.energy=clamp(state.energy-10);state.money+=pay;state.worked++;state.minute+=35;emitSfx('reward');playBuy();showToast(`خلصت طلبية وكسبت ${pay} جنيه`);advanceTask('job');saveState();}
  function advanceTask(action){if(state.task===1&&action==='market'){state.task=2;showToast('عرفت السوق — جرّب شغل التوصيل');}else if(state.task===2&&action==='job'){state.task=3;showToast('خلصت الشغل — ارجع بيت العيلة');}else if(state.task===3&&action==='home'){state.task=4;showToast('خلصت أول يوم في الحارة 🇪🇬');}}
  function taskCopy(){switch(state.task){case 0:return['مشوار الفطار',missingBreakfast().length?'هات '+missingBreakfast().join(' و')+' للبيت. اختار «حط في الشنطة» عند البياع.':'الفطار في الشنطة. ارجع بيت العيلة وسلّمه لماما.'];case 1:return['لفة السوق','روح سوق الحارة واتفرج على الباعة.'];case 2:return['رزق اليوم','روح «طلبات الحارة» وخد شغلانة توصيل.'];case 3:return['ارجع للعيلة','بعد الشغل ارجع بيت العيلة وارتاح.'];default:return['عيش يومك','لف الحارة، كل، اشتغل واتكلم مع الناس.'];}}

  let missionTarget=null,nextTargetAt=0;
  function refreshMissionTarget(){
    const targets=world.interactables.filter(item=>{
      if(state.task===0){
        if(!missingBreakfast().length)return item.kind==='home';
        return item.kind==='shop'&&((!state.breakfastBread&&item.data.type==='bakery')||(!state.breakfastFul&&item.data.type==='ful'));
      }
      return item.kind===(state.task===1?'market':state.task===2?'job':state.task===3?'home':'none');
    });
    const distance=item=>Math.hypot(itemPos(item).x-camera.position.x,itemPos(item).z-camera.position.z);
    missionTarget=targets.sort((a,b)=>distance(a)-distance(b))[0]||null;
    const bag=$('taskBag'),guide=$('taskGuide');
    if(bag){bag.hidden=state.breakfastDelivered;bag.textContent=`الشنطة: عيش ${state.breakfastBread}/٤ · فول ${state.breakfastFul?'١':'٠'}/١`;}
    if(guide){
      const indoors=window.__V12_HOME&&Math.abs(camera.position.x-window.__V12_HOME.spawn.x)<15&&Math.abs(camera.position.z-window.__V12_HOME.spawn.z)<15;
      guide.hidden=!missionTarget;
      guide.textContent=indoors?'اخرج من باب البيت علشان تكمل المشوار':missionTarget?`● ${missionTarget.name} · ${Math.round(distance(missionTarget))} م`:'';
    }
  }
  function updateDayNight(){const t=state.minute/1440,a=t*Math.PI*2-Math.PI/2,light=clamp(Math.sin(a)*.78+.45,.08,1);sun.direction.set(Math.cos(a)*-.55,-Math.max(.12,Math.sin(a)),Math.sin(a)*-.35);sun.intensity=.2+light*1.15;hemi.intensity=.24+light*.48;scene.fogColor=new BABYLON.Color3(.17+.56*light,.2+.56*light,.23+.53*light);if(sky&&sky.material)sky.material.emissiveColor=new BABYLON.Color3(.07+.43*light,.09+.51*light,.13+.57*light);const night=light<.34;for(const b of world.lights)b.material.emissiveColor=night?new BABYLON.Color3(.9,.65,.22):new BABYLON.Color3(.1,.08,.04);}
  function updateHUD(){ui.money.textContent=`${Math.round(state.money)} ج`;ui.hungerTxt.textContent=`${Math.round(state.hunger)}%`;ui.energyTxt.textContent=`${Math.round(state.energy)}%`;ui.moodTxt.textContent=`${Math.round(state.mood)}%`;ui.hungerBar.style.width=state.hunger+'%';ui.energyBar.style.width=state.energy+'%';ui.moodBar.style.width=state.mood+'%';const h=Math.floor(state.minute/60)%24,m=Math.floor(state.minute%60);ui.time.textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;ui.day.textContent=`اليوم ${state.day} — ${weekdays[(state.day-1)%7]}`;if(performance.now()>nextTargetAt){refreshMissionTarget();nextTargetAt=performance.now()+500;}const [a,b]=taskCopy();ui.taskTitle.textContent=a;ui.taskText.textContent=b;if(ui.sound)ui.sound.textContent=audio.enabled?'🔊 الصوت':'🔇 مكتوم';}
  function showToast(text){ui.toast.textContent=text;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),2300);}
  function drawMap(){const c=ui.map,ctx=c.getContext('2d'),s=c.width,scale=s/world.size;ctx.clearRect(0,0,s,s);ctx.fillStyle='#6f6853';ctx.fillRect(0,0,s,s);ctx.fillStyle='#3f4240';for(const r of world.roads){ctx.fillRect((r+world.size/2-4.75)*scale,0,9.5*scale,s);ctx.fillRect(0,(r+world.size/2-4.75)*scale,s,9.5*scale);}ctx.fillStyle='#d3b85e';ctx.fillRect((world.market.x+world.size/2-15)*scale,(world.market.z+world.size/2-11)*scale,30*scale,22*scale);ctx.save();ctx.translate((camera.position.x+world.size/2)*scale,(camera.position.z+world.size/2)*scale);ctx.rotate(-yaw);ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(4,5);ctx.lineTo(-4,5);ctx.closePath();ctx.fill();ctx.restore();if(missionTarget){const p=itemPos(missionTarget);ctx.beginPath();ctx.arc((p.x+world.size/2)*scale,(p.z+world.size/2)*scale,7,0,Math.PI*2);ctx.fillStyle='#f0c875';ctx.fill();ctx.strokeStyle='#31281a';ctx.lineWidth=3;ctx.stroke();}}

  function applyLook(dx,dy){yaw+=dx*.00225;pitch=clamp(pitch+dy*.0019,-1.15,1.15);}
  function setupInput(){
    addEventListener('keydown',e=>{keys.add(e.code);if(e.code==='KeyE')interact();if(e.code==='ShiftLeft'||e.code==='ShiftRight')running=true;if(e.code==='Escape')closeModals();if(e.code==='KeyM')toggleAudio();});addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='ShiftLeft'||e.code==='ShiftRight')running=false;});
    if(!TOUCH){canvas.addEventListener('click',()=>{if(ui.menu.style.display==='none'&&!modal)canvas.requestPointerLock?.();});document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&!modal)applyLook(e.movementX,e.movementY);});}
    else{ui.joy.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;ui.joy.setPointerCapture(e.pointerId);setJoy(e);});ui.joy.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)setJoy(e);});const end=e=>{if(e.pointerId===joyPointer){joyPointer=null;joyX=joyY=0;ui.knob.style.transform='translate(0,0)';}};ui.joy.addEventListener('pointerup',end);ui.joy.addEventListener('pointercancel',end);canvas.addEventListener('pointerdown',e=>{lookPointer=e.pointerId;lastPX=e.clientX;lastPY=e.clientY;});canvas.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer||modal)return;const dx=e.clientX-lastPX,dy=e.clientY-lastPY;lastPX=e.clientX;lastPY=e.clientY;applyLook(dx,dy);});canvas.addEventListener('pointerup',e=>{if(e.pointerId===lookPointer)lookPointer=null;});canvas.addEventListener('pointercancel',e=>{if(e.pointerId===lookPointer)lookPointer=null;});}
    ui.shopClose.onclick=closeModals;ui.dialogClose.onclick=closeModals;ui.act.onclick=interact;ui.run.onpointerdown=()=>running=true;ui.run.onpointerup=()=>running=false;ui.run.onpointercancel=()=>running=false;if(ui.sound)ui.sound.onclick=toggleAudio;addEventListener('beforeunload',saveState);addEventListener('resize',()=>engine.resize());
  }
  function setJoy(e){const r=ui.joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=40,len=Math.hypot(dx,dy)||1,k=Math.min(1,max/len),nx=dx*k,ny=dy*k;joyX=nx/max;joyY=-ny/max;ui.knob.style.transform=`translate(${nx}px,${ny}px)`;}

  function resetState(){state={...DEFAULT};nextTargetAt=0;yaw=0;pitch=0;if(camera){camera.position.set(DEFAULT.savedX,EYE,DEFAULT.savedZ);camera.rotation.set(0,0,0);}updateHUD();}
  function enterGame(newGame){if(newGame){localStorage.removeItem(SAVE_KEY);resetState();}else{state=loadState();camera.position.set(state.savedX,EYE,state.savedZ);yaw=0;pitch=0;camera.rotation.set(0,0,0);updateHUD();}ui.menu.style.display='none';ui.menuStatus.textContent='';startAudio();if(!TOUCH&&navigator.userActivation?.isActive)canvas.requestPointerLock?.()?.catch?.(()=>{});showToast(newGame?'بدأت يوم جديد في الحارة 🇪🇬':'رجعت لآخر مكان محفوظ');}
  function setupMenu(){ui.cont.disabled=!hasSave();ui.cont.style.opacity=hasSave()?'1':'.45';ui.cont.onclick=()=>{if(hasSave())enterGame(false);};ui.newGame.onclick=()=>enterGame(true);ui.reset.onclick=()=>{localStorage.removeItem(SAVE_KEY);ui.cont.disabled=true;ui.cont.style.opacity='.45';ui.menuStatus.textContent='تم مسح الحفظ. تقدر تبدأ يوم جديد.';resetState();};if(!hasSave())ui.menuStatus.textContent='مفيش حفظ قديم لسه — ابدأ يوم جديد.';}

  window.EgyptLife={
    visitHome,
    doorSound:()=>emitSfx('door'),
    modalOpen:()=>modal,
    snapshot:()=>({state:{...state},target:missionTarget?{kind:missionTarget.kind,name:missionTarget.name,type:missionTarget.data?.type,x:itemPos(missionTarget).x,z:itemPos(missionTarget).z}:null})
  };

  function startAudio(){if(!audio.enabled)return;try{if(!audio.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audio.ctx=new AC();audio.master=audio.ctx.createGain();audio.master.gain.value=.42;audio.master.connect(audio.ctx.destination);const len=audio.ctx.sampleRate*2,buf=audio.ctx.createBuffer(1,len,audio.ctx.sampleRate),data=buf.getChannelData(0);for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*.23;const noise=audio.ctx.createBufferSource(),lp=audio.ctx.createBiquadFilter(),g=audio.ctx.createGain();noise.buffer=buf;noise.loop=true;lp.type='lowpass';lp.frequency.value=520;g.gain.value=.05;noise.connect(lp);lp.connect(g);g.connect(audio.master);noise.start();audio.noise=noise;const hum=audio.ctx.createOscillator(),hg=audio.ctx.createGain();hum.type='sine';hum.frequency.value=58;hg.gain.value=.017;hum.connect(hg);hg.connect(audio.master);hum.start();audio.hum=hum;}audio.ctx.resume();nextHorn=performance.now()+1800;}catch(e){console.warn('Audio unavailable',e);}}
  function toggleAudio(){audio.enabled=!audio.enabled;if(audio.master)audio.master.gain.value=audio.enabled?.42:0;if(audio.enabled)startAudio();updateHUD();showToast(audio.enabled?'الصوت اشتغل 🔊':'الصوت اتكتم 🔇');}
  function tone(freq,dur=.12,vol=.08,type='sine',delay=0){if(!audio.enabled||!audio.ctx||!audio.master)return;const t=audio.ctx.currentTime+delay,o=audio.ctx.createOscillator(),g=audio.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(audio.master);o.start(t);o.stop(t+dur+.03);}
  function playHorn(){tone(360,.18,.1,'square');tone(510,.13,.055,'square',.045);}
  function playStep(){if(!audio.enabled||!audio.ctx||!audio.master)return;const buf=audio.ctx.createBuffer(1,Math.floor(audio.ctx.sampleRate*.045),audio.ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=audio.ctx.createBufferSource(),g=audio.ctx.createGain(),f=audio.ctx.createBiquadFilter();s.buffer=buf;f.type='lowpass';f.frequency.value=420;g.gain.value=.06;s.connect(f);f.connect(g);g.connect(audio.master);s.start();}
  function playInteract(){tone(620,.08,.045);}function playBuy(){tone(760,.08,.06,'triangle');tone(990,.1,.05,'triangle',.07);}
  function updateAudio(){if(!audio.enabled||!audio.ctx)return;const now=performance.now();if(now>nextHorn){let nearest=999;for(const v of world.vehicles)nearest=Math.min(nearest,Math.hypot(v.root.position.x-camera.position.x,v.root.position.z-camera.position.z));if(nearest<45)playHorn();nextHorn=now+2800+Math.random()*5200;}}

  window.__egyptDebug={getCamera:()=>({x:camera.position.x,y:camera.position.y,z:camera.position.z,yaw,pitch,fov:camera.fov,ellipsoidY:camera.ellipsoid.y,offsetY:camera.ellipsoidOffset.y}),applyLook:(dx,dy)=>{applyLook(dx,dy);camera.rotation.x=pitch;camera.rotation.y=yaw;},audioState:()=>({enabled:audio.enabled,state:audio.ctx?.state||'none'}),resetPose:()=>{camera.position.set(DEFAULT.savedX,EYE,DEFAULT.savedZ);yaw=0;pitch=0;camera.rotation.set(0,0,0);}};

  window.addEventListener('error',e=>{ui.error.style.display='block';ui.error.textContent='حصل خطأ أثناء تشغيل اللعبة: '+(e.message||'خطأ غير معروف');});
  try{buildScene();setupMenu();setupInput();updateHUD();engine.runRenderLoop(()=>scene.render());}catch(err){console.error(err);ui.error.style.display='block';ui.error.textContent='اللعبة وقفت أثناء التحميل: '+err.message;}
})();