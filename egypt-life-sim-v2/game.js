(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const engine = new BABYLON.Engine(canvas, true, { antialias: true, adaptToDeviceRatio: true });
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const $ = id => document.getElementById(id);
  const ui = {
    money:$('money'), hungerTxt:$('hungerTxt'), hungerBar:$('hungerBar'), energyTxt:$('energyTxt'), energyBar:$('energyBar'), moodTxt:$('moodTxt'), moodBar:$('moodBar'),
    time:$('time'), day:$('day'), taskTitle:$('taskTitle'), taskText:$('taskText'), cultureText:$('cultureText'), prompt:$('prompt'), toast:$('toast'), start:$('start'), startBtn:$('startBtn'),
    shop:$('shop'), shopTitle:$('shopTitle'), shopDesc:$('shopDesc'), shopItems:$('shopItems'), shopClose:$('shopClose'), dialog:$('dialog'), dialogWho:$('dialogWho'), dialogText:$('dialogText'), dialogClose:$('dialogClose'),
    map:$('minimap'), joy:$('joy'), knob:$('knob'), act:$('act'), run:$('run')
  };

  const CULTURE = {
    weekdays:['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'],
    tips:[
      'القهوة الشعبية مكان للّمة والشاي والطاولة والكورة، مش مجرد مكان تشرب فيه.',
      'الكشك الصغير ممكن تلاقي فيه مياه وسناكس ومناديل وشحن وحاجات كتير متكومة لحد السقف.',
      'الفول والطعمية والعيش البلدي من أشهر فطار الشارع المصري.',
      'الكشري طبق مصري معروف بيجمع رز ومكرونة وعدس وحمص وصلصة وبصل مقرمش.',
      'في العمارات الشعبية البلكونة نفسها جزء من شكل الشارع: غسيل، زرع، سجاد، تكييف ودِش فوق السطح.',
      'الميكروباص جزء واضح من حركة شوارع القاهرة؛ بيقف ويكمل بسرعة وسط الزحمة.',
      'عصير القصب من المشروبات المرتبطة بمحلات العصير في الشارع المصري.',
      'الفرن البلدي من الأماكن اللي بتدي الشارع ريحة وهوية، خصوصًا وقت خروج العيش سخن.',
      'اللافتة العربية المكتوبة فوق المحل جزء أساسي من المشهد البصري للحارة.',
      'السوق الشعبي مش بس شراء: نداءات الباعة، صناديق الخضار، حركة الناس، وكلام الجيران جزء من الجو.'
    ],
    sayings:[
      ['عم سيد','صباح الفل يا ابني، لو لسه مفطرتش الحق عربية الفول قبل الزحمة.'],
      ['أم محمود','خد بالك وإنت معدّي الشارع، الميكروباص هنا بيظهر فجأة 😄'],
      ['الحاج رضا','الدنيا حر النهارده… قصب ساقع يعدّل المزاج.'],
      ['مينا','الماتش بالليل على القهوة، هتلاقي نص الحارة هناك.'],
      ['عم رجب','العيش لسه طالع سخن من الفرن، ريحته مالية الشارع.'],
      ['سارة','لو رايح السوق هات طماطم وخيار وإنت راجع، الأسعار بتتغير من محل للتاني.'],
      ['المعلم شوقي','الشغل عايز حركة يا نجم، خد طلبية ولف بيها الحارة.'],
      ['أحمد','أنا مستني الميكروباص من بدري… أول ما ييجي كله هيجري عليه.'],
      ['عماد','الكشك عنده كل حاجة تقريبًا، حتى الحاجة اللي مش فاكر إنك محتاجها.'],
      ['نجلاء','بليل الشارع بيبقى أهدى شوية، بس القهوة بتفضل منورة.' ]
    ],
    shops:[
      {name:'فول وطعمية أبو علي',type:'ful',sign:'#8a3f24',desc:'فطار مصري سريع مع عيش بلدي.',items:[['ساندوتش فول',14,22,3],['ساندوتش طعمية',12,18,4],['طبق فول',25,34,4],['بطاطس',16,18,5]]},
      {name:'كشري الحبايب',type:'koshary',sign:'#b33d32',desc:'رز ومكرونة وعدس وحمص وصلصة وبصل.',items:[['كشري صغير',35,32,5],['كشري كبير',52,48,8],['رز بلبن',24,15,8]]},
      {name:'قهوة الحارة',type:'ahwa',sign:'#5b3b24',desc:'شاي وقهوة وطاولة وكراسي على الرصيف.',items:[['شاي كُشري',10,1,7],['شاي بالنعناع',13,1,9],['قهوة سادة',18,0,12],['قعدة طاولة',8,0,9]]},
      {name:'فرن العيش البلدي',type:'bakery',sign:'#8d6235',desc:'عيش سخن وفطار بسيط.',items:[['رغيف عيش بلدي',3,7,1],['فطيرة جبنة',30,24,4],['قرص سادة',14,10,2]]},
      {name:'عصير ولاد البلد',type:'juice',sign:'#2f7b54',desc:'قصب وبرتقال ومانجا ساقعين.',items:[['قصب',18,0,12],['برتقال',25,1,11],['مانجا',32,3,14]]},
      {name:'كشك عم صابر',type:'kiosk',sign:'#315b89',desc:'مياه وسناكس وحاجات الشارع السريعة.',items:[['مياه',7,0,3],['بسكوت',10,7,2],['عصير',15,2,7],['مناديل',8,0,1]]},
      {name:'بقالة الأمانة',type:'grocery',sign:'#486d37',desc:'احتياجات البيت اليومية.',items:[['جبنة بيضا وعيش',30,22,3],['زبادي',12,9,3],['حلاوة',18,14,4],['مياه كبيرة',10,0,4]]},
      {name:'محمصة النيل',type:'roaster',sign:'#7b4d28',desc:'لب وسوداني وحمص وتسالي.',items:[['لب أبيض',22,6,5],['سوداني',18,8,3],['حمص',16,7,3]]},
      {name:'خضار وفاكهة البركة',type:'produce',sign:'#3c783d',desc:'صناديق خضار وفاكهة على أول السوق.',items:[['موز',25,12,5],['برتقال',22,8,5],['طماطم وخيار',28,10,3]]},
      {name:'حلاق الرجولة',type:'barber',sign:'#244c6b',desc:'حلاق الحارة وكلام الكورة المعتاد.',items:[['حلاقة',45,0,12]]},
      {name:'صيدلية الشفاء',type:'pharmacy',sign:'#276b5d',desc:'واجهة صيدلية في قلب الحارة.',items:[['مياه',8,0,2]]},
      {name:'كبدة إسكندراني',type:'kebda',sign:'#9a442d',desc:'ساندوتشات كبدة بطابع إسكندراني.',items:[['ساندوتش كبدة',32,26,7],['بطاطس',16,18,4]]}
    ]
  };

  const state = Object.assign({money:300,hunger:82,energy:91,mood:74,minute:8*60+15,day:1,task:0,breakfast:false,worked:0,market:false,savedX:0,savedZ:18}, load());
  const world = {size:304,roads:[],interactables:[],shops:[],people:[],vehicles:[],lights:[],home:null,job:null,marketCenter:new BABYLON.Vector3(72,0,-72)};
  const mats = new Map();
  let scene,camera,sun,hemi,sky,current=null,modal=false,toastTimer=0,lastSave=0,sim=0,tipIndex=0,tipTimer=0,joyX=0,joyY=0,sprinting=false,joyPointer=null,lookPointer=null,lastPX=0,lastPY=0;

  function load(){try{return JSON.parse(localStorage.getItem('hayat-masr-v2')||'{}')||{};}catch{return {};}}
  function save(){if(!camera)return;state.savedX=+camera.position.x.toFixed(2);state.savedZ=+camera.position.z.toFixed(2);localStorage.setItem('hayat-masr-v2',JSON.stringify(state));}
  function clamp(v,a=0,b=100){return Math.max(a,Math.min(b,v));}
  function material(name,hex,emissive=null){const k=name+hex+(emissive||'');if(mats.has(k))return mats.get(k);const m=new BABYLON.StandardMaterial(k,scene);m.diffuseColor=BABYLON.Color3.FromHexString(hex);m.specularColor=new BABYLON.Color3(.04,.04,.04);if(emissive)m.emissiveColor=BABYLON.Color3.FromHexString(emissive);mats.set(k,m);return m;}
  function box(name,w,h,d,x,y,z,mat,coll=true){const m=BABYLON.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);m.position.set(x,y,z);m.material=mat;m.checkCollisions=coll;return m;}
  function cyl(name,dia,h,x,y,z,mat,tess=12){const m=BABYLON.MeshBuilder.CreateCylinder(name,{diameter:dia,height:h,tessellation:tess},scene);m.position.set(x,y,z);m.material=mat;m.checkCollisions=true;return m;}
  function planeSign(text,x,y,z,width=7,height=1.25,bg='#3c352e',rotY=Math.PI){
    const tex=new BABYLON.DynamicTexture('t-'+text+Math.random(),{width:800,height:180},scene,false);const c=tex.getContext();c.fillStyle=bg;c.fillRect(0,0,800,180);c.fillStyle='#fff6da';c.font='bold 78px Tahoma,Arial';c.textAlign='center';c.textBaseline='middle';c.direction='rtl';c.fillText(text,400,94);tex.update();
    const m=new BABYLON.StandardMaterial('sm'+Math.random(),scene);m.diffuseTexture=tex;m.emissiveColor=new BABYLON.Color3(.18,.18,.15);m.backFaceCulling=false;const p=BABYLON.MeshBuilder.CreatePlane('sign',{width,height},scene);p.position.set(x,y,z);p.rotation.y=rotY;p.material=m;p.isPickable=false;return p;
  }
  function makeTextBoard(text,x,y,z,width=5,bg='#7a4b2f'){return planeSign(text,x,y,z,width,1,bg,Math.PI);}

  function buildScene(){
    scene=new BABYLON.Scene(engine);scene.collisionsEnabled=true;scene.clearColor=new BABYLON.Color4(.78,.83,.85,1);scene.fogMode=BABYLON.Scene.FOGMODE_EXP2;scene.fogDensity=.0021;scene.fogColor=new BABYLON.Color3(.77,.78,.75);
    camera=new BABYLON.UniversalCamera('player',new BABYLON.Vector3(state.savedX||0,2,state.savedZ||18),scene);camera.minZ=.08;camera.fov=1.08;camera.speed=.44;camera.inertia=.55;camera.angularSensibility=isTouch?5200:3600;camera.applyGravity=true;camera.checkCollisions=true;camera.ellipsoid=new BABYLON.Vector3(.5,.95,.5);camera.ellipsoidOffset=new BABYLON.Vector3(0,.95,0);camera.keysUp=[87];camera.keysDown=[83];camera.keysLeft=[65];camera.keysRight=[68];if(!isTouch)camera.attachControl(canvas,true);
    hemi=new BABYLON.HemisphericLight('amb',new BABYLON.Vector3(0,1,0),scene);hemi.intensity=.62;hemi.groundColor=new BABYLON.Color3(.35,.29,.22);sun=new BABYLON.DirectionalLight('sun',new BABYLON.Vector3(-.5,-1,-.35),scene);sun.position.set(70,120,50);sun.intensity=1.35;
    const skyMat=material('sky','#85a9c2','#26333b');skyMat.backFaceCulling=false;skyMat.disableLighting=true;sky=BABYLON.MeshBuilder.CreateSphere('sky',{diameter:880,segments:16},scene);sky.material=skyMat;sky.infiniteDistance=true;sky.isPickable=false;
    const g=BABYLON.MeshBuilder.CreateGround('ground',{width:world.size,height:world.size},scene);g.material=material('sand','#b5a47e');g.checkCollisions=true;
    buildRoadGrid();buildBlocks();buildMarket();buildAhwaCorner();buildLandmarks();buildStreetDetails();buildVehicles();buildPeople();
    scene.onBeforeRenderObservable.add(update);return scene;
  }

  function buildRoadGrid(){
    world.roads=[-120,-72,-24,24,72,120];const asphalt=material('asphalt','#4b4a47'),walk=material('walk','#b6ada0'),white=material('roadwhite','#d9d4c5'),black=material('curbblack','#2d2d2c');
    for(const r of world.roads){box('roadV',15,.08,world.size,r,.04,0,asphalt,false);box('sw1',3,.18,world.size,r-9,.09,0,walk,true);box('sw2',3,.18,world.size,r+9,.09,0,walk,true);box('roadH',world.size,.08,15,0,.045,r,asphalt,false);box('sw3',world.size,.18,3,0,.09,r-9,walk,true);box('sw4',world.size,.18,3,0,.09,r+9,walk,true);
      for(let t=-145;t<145;t+=10){box('dashV',.16,.02,4,r,.1,t,white,false);box('dashH',4,.02,.16,t,.105,r,white,false);}
    }
    for(const x of world.roads)for(const z of world.roads){for(let i=-2;i<=2;i++){box('curb',2.1,.23,.38,x+i*2.15,.19,z-10.55,i%2?white:black,false);box('curb2',.38,.23,2.1,x-10.55,.19,z+i*2.15,i%2?white:black,false);}}
  }

  const wallColors=['#cdb58d','#bfa57d','#d5c5aa','#b99673','#cab89a','#d0b992','#bca890','#d7c3a4'];
  function buildBlocks(){
    let shopI=0;for(const x of [-96,-48,0,48,96])for(const z of [-96,-48,0,48,96]){
      if((x===48||x===96)&&(z===-96||z===-48))continue;
      const seed=Math.abs(x*31+z*17),floors=4+(seed%5),w=28+(seed%5),d=27+((seed>>2)%5),h=floors*3.05;
      const b=box('building',w,h,d,x,h/2,z,material('wall'+seed,wallColors[seed%wallColors.length]),true);b.isPickable=false;
      box('roof',w-.7,.5,d-.7,x,h+.42,z,material('roof','#a8977e'),false);for(let t=0;t<2;t++){const tank=cyl('tank',1.6,2,x-5+t*6,h+1.55,z+4,material('tank','#252d31'),12);tank.checkCollisions=false;}addDish(x+6,h+1.15,z-4,seed*.03);
      for(let f=1;f<floors;f++)for(let c=-1;c<=1;c++){
        const wx=x+c*w*.24,wy=f*3.05+1.35,wz=z-d/2-.08;box('window',2.25,1.35,.13,wx,wy,wz,material('win','#33424a','#091116'),false);
        if((f+c+seed)%2===0)addBalcony(wx,wy,z-d/2,w,c,f,seed);if((f+c+seed)%4===1)addAC(wx+1.5,wy-.2,wz-.02);
      }
      const count=3,sw=w/count;for(let s=0;s<count;s++){
        const sx=x-w/2+sw*(s+.5),shop=CULTURE.shops[(shopI+s)%CULTURE.shops.length];box('front',sw-.45,2.65,.25,sx,1.45,z-d/2-.16,material('front'+shop.type,shop.sign),false);planeSign(shop.name,sx,3.2,z-d/2-.31,Math.min(sw-.4,8.6),1.02,shop.sign,Math.PI);
        const hot=box('hot',sw-.55,2.8,1.35,sx,1.45,z-d/2-1,material('hot','#ffffff'),false);hot.visibility=0;hot.isPickable=true;const e={mesh:hot,kind:'shop',name:shop.name,data:shop,x:sx,z:z-d/2-1.15};world.interactables.push(e);world.shops.push(e);
        if(shop.type==='kiosk')decorateKiosk(sx,z-d/2-2.1);if(shop.type==='produce')decorateProduce(sx,z-d/2-2.1);if(shop.type==='bakery')addBreadTrays(sx,z-d/2-2.0);
      }shopI+=3;
    }
  }

  function addBalcony(x,y,front,w,c,f,seed){
    box('balcony',3.9,.16,1.25,x,y-.78,front-.67,material('balcony','#c4b29a'),false);box('rail',3.4,.08,.08,x,y-.14,front-1.25,material('metal','#45423e'),false);for(let r=-1;r<=1;r++)box('rp',.07,.7,.07,x+r*1.55,y-.47,front-1.25,material('metal','#45423e'),false);
    if((seed+f+c)%3===0)addLaundry(x,y-.05,front-1.3,(seed+f)%4);if((seed+f+c)%5===0)box('plant',.45,.42,.45,x-1.3,y-.52,front-1.12,material('pot','#87523c'),false);
  }
  function addLaundry(x,y,z,v){const cols=['#efe6d5','#5b7393','#a7544d','#d9c24c','#647d55'];for(let i=-2;i<=2;i++){box('cloth',.55,.7,.035,x+i*.62,y-(i%2)*.08,z-.03,material('cloth'+v+i,cols[(v+i+5)%cols.length]),false);}}
  function addAC(x,y,z){box('ac',1.05,.62,.4,x,y,z,material('ac','#ddd8cc'),false);for(let i=-2;i<=2;i++)box('vent',.74,.026,.03,x,y+i*.075,z-.21,material('dark','#555'),false);}
  function addDish(x,y,z,rot){const pole=cyl('dishPole',.08,.8,x,y-.25,z,material('dishmetal','#777'),8);pole.checkCollisions=false;const d=BABYLON.MeshBuilder.CreateDisc('dish',{radius:.78,tessellation:20},scene);d.position.set(x,y,z);d.rotation.x=Math.PI/2.8;d.rotation.z=rot;d.material=material('dish','#d3cec4');d.isPickable=false;}
  function decorateKiosk(x,z){for(let i=-2;i<=2;i++)box('stack',.45,.5,.35,x+i*.5,.28,z,material('pack'+i,['#bd4d3e','#d2b342','#4b82a4','#7c9c55','#b96b3e'][i+2]),false);}
  function decorateProduce(x,z){const crate=material('crate','#8b653d');for(let i=-2;i<=2;i++){box('crate',1,.52,.75,x+i*1.05,.3,z,crate,false);const f=BABYLON.MeshBuilder.CreateSphere('fruit',{diameter:.3,segments:6},scene);f.position.set(x+i*1.05,.68,z);f.material=material('fruit'+i,i%2?'#d05235':'#7d9e3c');f.isPickable=false;}}
  function addBreadTrays(x,z){for(let i=-1;i<=1;i++){box('tray',1.2,.08,.6,x+i*1.25,.5,z,material('tray','#777'),false);for(let j=-1;j<=1;j++){const b=BABYLON.MeshBuilder.CreateSphere('bread',{diameter:.42,segments:8},scene);b.scaling.y=.35;b.position.set(x+i*1.25+j*.34,.63,z);b.material=material('bread','#c9914e');b.isPickable=false;}}}

  function buildMarket(){
    const cx=72,cz=-72;makeTextBoard('سوق الحارة',cx,4.4,cz+21,8,'#8a4d2d');const canvasMat=material('shade','#b74636');
    for(let i=0;i<5;i++){const x=cx-18+i*9;box('stall',7,.85,4,x,.45,cz+5,material('stall','#7b5638'),true);box('awning',7,.12,5,x,3.1,cz+5,i%2?canvasMat:material('shade2','#d0a03b'),false);for(let p of [-3,3])cyl('pole',.09,3,x+p,1.5,cz+7,material('pole','#5f554a'),8).checkCollisions=false;decorateProduce(x,cz+2.7);}
    for(let i=0;i<12;i++){const x=cx-20+(i%6)*8,z=cz-8+Math.floor(i/6)*7;const npc=makePerson(x,z,i+50,true);world.people.push(npc);}
    const hot=box('marketHot',38,2.5,30,cx,1.2,cz,material('hot','#fff'),false);hot.visibility=0;world.interactables.push({mesh:hot,kind:'market',name:'سوق الحارة',x:cx,z:cz});
  }

  function buildAhwaCorner(){
    const x=-72,z=72;makeTextBoard('قهوة المعلم فتحي',x,3.7,z-18,8,'#5d3923');for(let r=0;r<3;r++)for(let c=0;c<4;c++){const px=x-7+c*4.5,pz=z-10+r*4;const table=cyl('table',1.3,.8,px,.4,pz,material('table','#745033'),10);table.checkCollisions=false;for(const ox of [-1.1,1.1])box('chair',.6,.8,.6,px+ox,.4,pz,material('chair','#6a4831'),false);if((r+c)%2===0){const board=box('board',.8,.04,.8,px,.83,pz,material('board','#d0b98d'),false);board.rotation.y=(r+c)*.4;}}
  }

  function buildLandmarks(){
    const home=box('door',2.3,3,.3,-100,1.5,-112.1,material('door','#5b3b25'),false);home.isPickable=true;planeSign('بيت العيلة',-100,3.6,-112.28,3.4,.8,'#5b3b25',Math.PI);world.home={mesh:home,kind:'home',name:'بيت العيلة',x:-100,z:-112};world.interactables.push(world.home);
    const job=box('job',4,2.5,2,-24,1.25,72,material('job','#24606b'),true);job.isPickable=true;planeSign('طلبات الحارة',-24,3,70.95,4.5,.9,'#24606b',Math.PI);world.job={mesh:job,kind:'job',name:'شغل التوصيل',x:-24,z:72};world.interactables.push(world.job);
    const m=box('mosque',16,7,13,120,3.5,120,material('mosque','#d7ccb0'),true);m.isPickable=false;const dome=BABYLON.MeshBuilder.CreateSphere('dome',{diameter:7,segments:18,slice:.55},scene);dome.position.set(120,8.4,120);dome.material=material('dome','#829a83');dome.isPickable=false;cyl('minaret',2,16,127,8,121,material('minaret','#d7c7a6'),14);const tip=BABYLON.MeshBuilder.CreateCylinder('tip',{diameterTop:0,diameterBottom:1.35,height:3,tessellation:14},scene);tip.position.set(127,17.5,121);tip.material=material('tip','#6b7569');tip.isPickable=false;
    const squareMat=material('square','#c2b49a');box('square',35,.12,35,-72,.06,-24,squareMat,false);cyl('fountain',7,.7,-72,.35,-24,material('stone','#a79c88'),24);const water=cyl('water',5.6,.18,-72,.74,-24,material('water','#4c8eaa','#103b4b'),24);water.checkCollisions=false;makeTextBoard('ميدان الحارة',-72,4,-7,7,'#345d62');
    buildFulCart(-20,-20);buildPotatoCart(20,72);buildCornCart(-72,20);
  }

  function buildFulCart(x,z){box('cart',3,.9,1.7,x,.65,z,material('cart','#48775a'),true);cyl('pot',1.1,.8,x,.95,z,material('potmetal','#8a8a80'),16).checkCollisions=false;for(const s of [-1,1]){const w=BABYLON.MeshBuilder.CreateCylinder('wheel',{diameter:.8,height:.18,tessellation:12},scene);w.position.set(x+s*1.35,.45,z);w.rotation.z=Math.PI/2;w.material=material('wheel','#222');}planeSign('فول وطعمية',x,2,z-.95,3,.65,'#48775a',Math.PI);const hot=box('fulhot',3,2,2,x,1,z,material('hot','#fff'),false);hot.visibility=0;world.interactables.push({mesh:hot,kind:'shop',name:'عربية فول وطعمية',x,z,data:CULTURE.shops[0]});}
  function buildPotatoCart(x,z){box('pcart',2.8,.9,1.6,x,.6,z,material('pcart','#895b35'),true);planeSign('بطاطا سخنة',x,1.8,z-.9,2.8,.65,'#895b35',Math.PI);}
  function buildCornCart(x,z){box('ccart',2.8,.9,1.6,x,.6,z,material('ccart','#6d7b39'),true);planeSign('ذرة مشوية',x,1.8,z-.9,2.8,.65,'#6d7b39',Math.PI);}

  function buildStreetDetails(){
    const poleMat=material('lampPole','#494744'),bulbMat=material('bulb','#fff0bd','#6d5728');for(const x of world.roads)for(const z of world.roads){const pX=x+10,pZ=z+10;const pole=cyl('lamp',.15,6,pX,3,pZ,poleMat,8);pole.checkCollisions=false;const b=BABYLON.MeshBuilder.CreateSphere('bulb',{diameter:.55,segments:8},scene);b.position.set(pX,6.15,pZ);b.material=bulbMat;b.isPickable=false;world.lights.push(b);}
    for(let i=0;i<20;i++){const x=-138+(i*37)%276,z=-138+(i*61)%276;box('crate',1.1,.65,.8,x,.34,z,material('crate','#8a633f'),true);if(i%3===0)box('basket',.8,.5,.8,x+1,.28,z,material('basket','#b58a55'),true);}
    for(let i=0;i<9;i++){const x=-128+i*31,z=105+(i%2)*8;cyl('tree',.45,4,x,2,z,material('trunk','#5d432e'),10);const crown=BABYLON.MeshBuilder.CreateSphere('crown',{diameter:4.8,segments:9},scene);crown.position.set(x,5,z);crown.material=material('leaf','#4f7141');crown.isPickable=false;}
    for(let i=0;i<11;i++){const x=-130+i*25;box('banner',12,.06,.7,x,5.4,-24,material('banner'+i,i%3===0?'#c6453d':i%3===1?'#f0d17a':'#3d8162'),false).rotation.z=.04*(i%2?1:-1);}
  }

  function makeVehicle(type,i){
    const vertical=i%2===0,lane=world.roads[i%world.roads.length]+(i%3===0?3.1:-3.1),along=-145+(i*39)%290,root=new BABYLON.TransformNode(type+'Root',scene);root.position=vertical?new BABYLON.Vector3(lane,.65,along):new BABYLON.Vector3(along,.65,lane);root.rotation.y=vertical?0:Math.PI/2;
    let w=1.9,h=1.25,d=4.1,col='#efefeb',speed=.12;if(type==='micro'){w=2.25;h=1.75;d=5.6;col=i%2?'#dcd8cf':'#efeee8';speed=.105;}if(type==='tuktuk'){w=1.45;h=1.6;d=2.5;col=['#2b6b8a','#a83d35','#4f7441'][i%3];speed=.085;}if(type==='taxi'){col='#f1f0eb';speed=.12;}
    const body=box(type,w,h,d,0,.15,0,material(type+col,col),false);body.parent=root;if(type==='taxi'){const stripe=box('taxiStripe',w+.02,.18,d*.75,0,.1,0,material('taxiStripe','#222'),false);stripe.parent=root;}
    const wind=box('wind',w*.86,.58,.07,0,.45,-d/2-.01,material('glass','#24323a','#071015'),false);wind.parent=root;
    if(type==='micro')planeSign('موقف',0,1.25,-d/2-.06,1.5,.45,'#295f78',0).parent=root;
    for(const sx of [-1,1])for(const sz of [-1,1]){const wheel=BABYLON.MeshBuilder.CreateCylinder('wheel',{diameter:.58,height:.22,tessellation:12},scene);wheel.parent=root;wheel.position.set(sx*w*.47,-.42,sz*d*.3);wheel.rotation.z=Math.PI/2;wheel.material=material('wheel','#171717');wheel.isPickable=false;}
    return{root,vertical,dir:i%3===0?-1:1,speed,type};
  }
  function buildVehicles(){const types=['micro','taxi','car','tuktuk','car','micro','taxi','car'];for(let i=0;i<24;i++)world.vehicles.push(makeVehicle(types[i%types.length],i));}

  function makePerson(x,z,i,market=false){
    const root=new BABYLON.TransformNode('personRoot',scene);root.position.set(x,0,z);const cols=['#455f77','#744e40','#45684a','#6b4b71','#817047','#4b4b4b','#9a674a'];const body=BABYLON.MeshBuilder.CreateCapsule('body',{radius:.32,height:1.5,tessellation:8},scene);body.parent=root;body.position.y=1.1;body.material=material('shirt'+i,cols[i%cols.length]);body.isPickable=false;const head=BABYLON.MeshBuilder.CreateSphere('head',{diameter:.5,segments:8},scene);head.parent=root;head.position.y=2;head.material=material('skin'+(i%4),['#b98563','#a97455','#c69472','#8e604a'][i%4]);head.isPickable=false;
    const hot=box('personHot',1,2.4,1,0,1.2,0,material('hot','#fff'),false);hot.parent=root;hot.visibility=0;const saying=CULTURE.sayings[i%CULTURE.sayings.length];const entry={mesh:hot,kind:'person',name:saying[0],dialog:saying[1],x,z,root};world.interactables.push(entry);return{root,entry,axis:i%2,dir:i%3===0?-1:1,speed:market?0:.024+(i%5)*.005,phase:i*.71,market};
  }
  function buildPeople(){for(let i=0;i<34;i++){const p=makePerson(-140+(i*29)%280,-140+(i*53)%280,i,false);world.people.push(p);}}

  function update(){const dt=Math.min(engine.getDeltaTime(),50)/16.6667;sim+=dt;if(!modal){moveTouch(dt);updateNeeds(dt);updateTraffic(dt);updatePeople(dt);updateInteract();}updateDayNight();updateHud();drawMap();updateCultureTip(dt);const now=performance.now();if(now-lastSave>12000){save();lastSave=now;}}
  function moveTouch(dt){if(!isTouch||!camera)return;const f=camera.getDirection(BABYLON.Axis.Z);f.y=0;f.normalize();const r=camera.getDirection(BABYLON.Axis.X);r.y=0;r.normalize();let v=f.scale(joyY).add(r.scale(joyX));if(v.lengthSquared()>.001){v.normalize();camera.cameraDirection.addInPlace(v.scale((sprinting?.35:.23)*dt));}}
  function updateNeeds(dt){state.hunger=clamp(state.hunger-.0027*dt);const moving=camera.cameraDirection.lengthSquared()>.0004;state.energy=clamp(state.energy-(moving?(sprinting?.0052:.0021):-.0008)*dt);if(state.hunger<25)state.mood=clamp(state.mood-.0018*dt);else if(state.mood<78)state.mood=clamp(state.mood+.0003*dt);state.minute+=.013*dt;if(state.minute>=1440){state.minute-=1440;state.day++;}}
  function updateTraffic(dt){for(const v of world.vehicles){const p=v.root.position;if(v.vertical){p.z+=v.speed*v.dir*dt;if(p.z>158)p.z=-158;if(p.z<-158)p.z=158;}else{p.x+=v.speed*v.dir*dt;if(p.x>158)p.x=-158;if(p.x<-158)p.x=158;}}}
  function nearestRoad(v){let best=world.roads[0],bd=999;for(const r of world.roads){const d=Math.abs(v-r);if(d<bd){bd=d;best=r;}}return best;}
  function updatePeople(dt){for(const n of world.people){if(n.market)continue;const p=n.root.position;if(n.axis===0){p.x+=n.speed*n.dir*dt;p.z=nearestRoad(p.z)+(n.phase%2?11:-11);if(p.x>151)p.x=-151;if(p.x<-151)p.x=151;}else{p.z+=n.speed*n.dir*dt;p.x=nearestRoad(p.x)+(n.phase%2?11:-11);if(p.z>151)p.z=-151;if(p.z<-151)p.z=151;}n.root.rotation.y=n.axis===0?(n.dir>0?Math.PI/2:-Math.PI/2):(n.dir>0?0:Math.PI);n.entry.x=p.x;n.entry.z=p.z;}}
  function updateInteract(){let best=null,bd=3.5;for(const i of world.interactables){const d=Math.hypot(i.x-camera.position.x,i.z-camera.position.z);if(d<bd){bd=d;best=i;}}current=best;ui.prompt.classList.toggle('show',!!best);if(best)ui.prompt.textContent=`${isTouch?'تفاعل':'E'} — ${best.name}`;}

  function interact(){if(modal){closeModals();return;}if(!current)return;const i=current;if(i.kind==='shop')openShop(i.data);else if(i.kind==='person')openDialog(i.name,i.dialog);else if(i.kind==='home'){state.energy=100;state.hunger=Math.max(62,state.hunger);state.minute=(state.minute<7*60||state.minute>23*60)?8*60:state.minute+60;showToast('رجعت البيت، ارتحت وشحنت طاقتك');advanceTask('home');}else if(i.kind==='job')startJob();else if(i.kind==='market'){state.market=true;state.mood=clamp(state.mood+5);showToast('دخلت السوق — خد لفة بين الباعة والصناديق');advanceTask('market');}}
  function openShop(data){modal=true;ui.shop.style.display='flex';ui.shopTitle.textContent=data.name;ui.shopDesc.textContent=data.desc;ui.shopItems.innerHTML='';for(const it of data.items){const [name,price,hunger,mood]=it,row=document.createElement('div');row.className='item';row.innerHTML=`<div><b>${name}</b><div class="small">${price} جنيه</div></div>`;const btn=document.createElement('button');btn.textContent='اشتري';btn.onclick=()=>buy(name,price,hunger,mood,data.type);row.appendChild(btn);ui.shopItems.appendChild(row);}}
  function buy(name,price,hunger,mood,type){if(state.money<price){showToast('الفلوس مش مكفية دلوقتي');return;}state.money-=price;state.hunger=clamp(state.hunger+hunger);state.mood=clamp(state.mood+mood);showToast(`اشتريت ${name} بـ ${price} جنيه`);if(['ful','bakery','koshary'].includes(type)){state.breakfast=true;advanceTask('breakfast');}if(type==='produce'||type==='grocery')advanceTask('market');save();}
  function openDialog(who,text){modal=true;ui.dialogWho.textContent=who;ui.dialogText.textContent=text;ui.dialog.style.display='flex';state.mood=clamp(state.mood+1);}
  function closeModals(){modal=false;ui.shop.style.display='none';ui.dialog.style.display='none';}
  function startJob(){if(state.energy<18){showToast('طاقتك قليلة، ارجع البيت أو كل حاجة الأول');return;}const pay=45+Math.floor(Math.random()*31);state.energy=clamp(state.energy-10);state.money+=pay;state.worked++;state.minute+=35;showToast(`وصلت طلبية في الحارة وكسبت ${pay} جنيه`);advanceTask('job');save();}

  function advanceTask(action){
    if(state.task===0&&action==='breakfast'){state.task=1;showToast('فطار تمام 👌 دلوقتي لف على السوق');}
    else if(state.task===1&&(action==='market'||state.market)){state.task=2;showToast('عرفت السوق — جرّب شغل التوصيل');}
    else if(state.task===2&&action==='job'){state.task=3;showToast('أول شغلانة خلصت — ارجع البيت آخر اليوم');}
    else if(state.task===3&&action==='home'){state.task=4;showToast('خلصت أول يوم في الحارة 🇪🇬');}
  }
  function taskCopy(){switch(state.task){case 0:return['أول يوم في الحارة','اتمشّى وافطر فول وطعمية أو عيش بلدي أو كشري.'];case 1:return['لفة السوق','روح سوق الحارة عند الناحية الشرقية واتفرج على الباعة والخضار.'];case 2:return['رزق اليوم','روح كشك «طلبات الحارة» وخد شغلانة توصيل.'];case 3:return['ارجع للعيلة','بعد الشغل ارجع بيت العيلة وارتاح.'];default:return['عيش يومك','لف الحارة، كل، اشتغل، اتكلم مع الناس، واقعد على القهوة.'];}}

  function updateDayNight(){const t=state.minute/1440,a=t*Math.PI*2-Math.PI/2,daylight=clamp(Math.sin(a)*.78+.45,0.08,1);sun.direction.set(Math.cos(a)*-.6,-Math.max(.12,Math.sin(a)),Math.sin(a)*-.4);sun.intensity=.18+daylight*1.25;hemi.intensity=.22+daylight*.48;scene.fogColor=new BABYLON.Color3(.18+.58*daylight,.2+.59*daylight,.24+.55*daylight);if(sky&&sky.material)sky.material.emissiveColor=new BABYLON.Color3(.08+.48*daylight,.1+.58*daylight,.15+.62*daylight);const night=daylight<.35;for(const b of world.lights)b.material.emissiveColor=night?new BABYLON.Color3(.9,.65,.22):new BABYLON.Color3(.12,.1,.05);}
  function updateHud(){ui.money.textContent=`${Math.round(state.money)} ج`;ui.hungerTxt.textContent=`${Math.round(state.hunger)}%`;ui.energyTxt.textContent=`${Math.round(state.energy)}%`;ui.moodTxt.textContent=`${Math.round(state.mood)}%`;ui.hungerBar.style.width=state.hunger+'%';ui.energyBar.style.width=state.energy+'%';ui.moodBar.style.width=state.mood+'%';const h=Math.floor(state.minute/60)%24,m=Math.floor(state.minute%60);ui.time.textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;ui.day.textContent=`اليوم ${state.day} — ${CULTURE.weekdays[(state.day-1)%7]}`;const [tt,tx]=taskCopy();ui.taskTitle.textContent=tt;ui.taskText.textContent=tx;}
  function updateCultureTip(dt){tipTimer+=dt;if(tipTimer>700){tipTimer=0;tipIndex=(tipIndex+1)%CULTURE.tips.length;ui.cultureText.textContent=CULTURE.tips[tipIndex];}}
  function showToast(text){ui.toast.textContent=text;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),2400);}

  function drawMap(){const c=ui.map,ctx=c.getContext('2d'),s=c.width,scale=s/world.size;ctx.clearRect(0,0,s,s);ctx.fillStyle='#696450';ctx.fillRect(0,0,s,s);ctx.fillStyle='#393d3a';for(const r of world.roads){ctx.fillRect((r+world.size/2-7.5)*scale,0,15*scale,s);ctx.fillRect(0,(r+world.size/2-7.5)*scale,s,15*scale);}ctx.fillStyle='#d2b65c';ctx.fillRect((world.marketCenter.x+world.size/2-18)*scale,(world.marketCenter.z+world.size/2-15)*scale,36*scale,30*scale);for(const sh of world.shops.slice(0,35)){ctx.fillStyle='#7bc48c';ctx.fillRect((sh.x+world.size/2)*scale-1,(sh.z+world.size/2)*scale-1,2,2);}ctx.fillStyle='#f1d26e';ctx.fillRect((world.home.x+world.size/2)*scale-3,(world.home.z+world.size/2)*scale-3,6,6);ctx.save();ctx.translate((camera.position.x+world.size/2)*scale,(camera.position.z+world.size/2)*scale);ctx.rotate(-camera.rotation.y);ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(4,5);ctx.lineTo(-4,5);ctx.closePath();ctx.fill();ctx.restore();}

  function setupInput(){
    addEventListener('keydown',e=>{if(e.code==='KeyE')interact();if(e.code==='ShiftLeft'||e.code==='ShiftRight'){sprinting=true;camera.speed=.7;}if(e.code==='Escape')closeModals();});addEventListener('keyup',e=>{if(e.code==='ShiftLeft'||e.code==='ShiftRight'){sprinting=false;camera.speed=.44;}});
    ui.startBtn.onclick=()=>{ui.start.style.display='none';canvas.focus();if(!isTouch)canvas.requestPointerLock?.();showToast('أهلاً بيك في الحارة 🇪🇬');};ui.shopClose.onclick=closeModals;ui.dialogClose.onclick=closeModals;ui.act.onclick=interact;ui.run.onpointerdown=()=>sprinting=true;ui.run.onpointerup=()=>sprinting=false;ui.run.onpointercancel=()=>sprinting=false;
    if(isTouch){ui.joy.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;ui.joy.setPointerCapture(e.pointerId);setJoy(e);});ui.joy.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)setJoy(e);});const end=e=>{if(e.pointerId===joyPointer){joyPointer=null;joyX=joyY=0;ui.knob.style.transform='translate(0,0)';}};ui.joy.addEventListener('pointerup',end);ui.joy.addEventListener('pointercancel',end);
      canvas.addEventListener('pointerdown',e=>{lookPointer=e.pointerId;lastPX=e.clientX;lastPY=e.clientY;});canvas.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer||modal)return;const dx=e.clientX-lastPX,dy=e.clientY-lastPY;lastPX=e.clientX;lastPY=e.clientY;camera.rotation.y+=dx*.004;camera.rotation.x=clamp(camera.rotation.x+dy*.003,-1.25,1.25);});canvas.addEventListener('pointerup',e=>{if(e.pointerId===lookPointer)lookPointer=null;});
    }
    addEventListener('beforeunload',save);addEventListener('resize',()=>engine.resize());
  }
  function setJoy(e){const r=ui.joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=42,len=Math.hypot(dx,dy)||1,k=Math.min(1,max/len),nx=dx*k,ny=dy*k;joyX=nx/max;joyY=-ny/max;ui.knob.style.transform=`translate(${nx}px,${ny}px)`;}

  scene=buildScene();setupInput();engine.runRenderLoop(()=>scene.render());
})();
