(() => {
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const P='v12_';
  const HOME={x:-150,z:-150,spawnX:-150,spawnZ:-151,doorX:-150,doorZ:-143.15};
  const STREET_DOOR={x:-96,z:-82.2};
  const BOUND=176;
  let scene=null,camera=null,homeBuilt=false,worldBuilt=false,prologueRunning=false,bypassStart=false,insideHome=false;
  const counters={buildings:0,mixedUse:0,arabicSigns:0,microbuses:0,balconies:0,laundry:0,satelliteDishes:0,acUnits:0,utilityWires:0,narrowLanes:0,workshops:0,rooftopTanks:0,pedestrians:0,homeProps:0,streetTrees:0};
  const mats=new Map();

  async function waitForScene(){
    for(let i=0;i<320;i++){
      const s=window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0];
      if(s&&s.activeCamera&&s.meshes?.length>80){scene=s;camera=s.activeCamera;return s;}
      await sleep(50);
    }
    throw new Error('V12 could not find active scene');
  }
  const mat=(name,hex,emit='')=>{const k=name+hex+emit;if(mats.has(k))return mats.get(k);const m=new BABYLON.StandardMaterial(P+'mat_'+name,scene);m.diffuseColor=BABYLON.Color3.FromHexString(hex);m.specularColor=new BABYLON.Color3(.02,.02,.02);if(emit)m.emissiveColor=BABYLON.Color3.FromHexString(emit);mats.set(k,m);return m;};
  const reg=(m,coll=false)=>{m.checkCollisions=coll;m.isPickable=false;return m;};
  const box=(name,w,h,d,x,y,z,material,coll=false,ry=0)=>{const m=reg(BABYLON.MeshBuilder.CreateBox(P+name,{width:w,height:h,depth:d},scene),coll);m.position.set(x,y,z);m.rotation.y=ry;m.material=material;return m;};
  const cyl=(name,dia,h,x,y,z,material,t=14)=>{const m=reg(BABYLON.MeshBuilder.CreateCylinder(P+name,{diameter:dia,height:h,tessellation:t},scene));m.position.set(x,y,z);m.material=material;return m;};
  function sign(name,text,x,y,z,w=4,h=.72,bg='#315f78',ry=Math.PI){
    const tex=new BABYLON.DynamicTexture(P+'tex_'+name,{width:900,height:180},scene,false),c=tex.getContext();c.fillStyle=bg;c.fillRect(0,0,900,180);c.direction='rtl';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff5df';c.font='700 58px Tahoma,Arial,sans-serif';c.fillText('\u2067'+text+'\u2069',450,94,820);tex.update();
    const sm=new BABYLON.StandardMaterial(P+'signmat_'+name,scene);sm.diffuseTexture=tex;sm.emissiveColor=new BABYLON.Color3(.035,.03,.025);sm.backFaceCulling=false;
    const p=reg(BABYLON.MeshBuilder.CreatePlane(P+'sign_'+name,{width:w,height:h},scene));p.position.set(x,y,z);p.rotation.y=ry;p.material=sm;counters.arabicSigns++;return p;
  }
  function toast(text){const t=document.getElementById('toast');if(!t)return;t.textContent=text;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800);}

  function installExpandedCollision(){
    const proto=window.BABYLON?.UniversalCamera?.prototype;if(!proto)return;
    proto.moveWithCollisions=function(delta){
      const sc=this.getScene(),radius=.38;
      const blocked=(x,z)=>{if(Math.abs(x)>BOUND||Math.abs(z)>BOUND)return true;for(const mesh of sc.meshes){if(!mesh.checkCollisions||!mesh.isEnabled?.()||!mesh.getBoundingInfo)continue;mesh.computeWorldMatrix(true);const bb=mesh.getBoundingInfo().boundingBox,min=bb.minimumWorld,max=bb.maximumWorld;if(max.y<.08||min.y>2.45)continue;if(x+radius>min.x&&x-radius<max.x&&z+radius>min.z&&z-radius<max.z)return true;}return false;};
      const nx=this.position.x+(delta.x||0);if(!blocked(nx,this.position.z))this.position.x=nx;const nz=this.position.z+(delta.z||0);if(!blocked(this.position.x,nz))this.position.z=nz;return this;
    };
  }

  function buildHome(){
    if(homeBuilt)return;homeBuilt=true;
    const floor=mat('homeFloor','#a9825a'),wall=mat('homeWall','#e4d5bb'),trim=mat('homeTrim','#795d45'),dark=mat('homeDark','#35312d'),wood=mat('homeWood','#76533b'),fabric=mat('homeFabric','#6c857a'),white=mat('homeWhite','#e5e2d7'),metal=mat('homeMetal','#777b79');
    box('homeFloor',18,.16,14,HOME.x,.02,HOME.z,floor,true);
    box('homeWallW',.22,3.1,14,HOME.x-9,1.55,HOME.z,wall,true);box('homeWallE',.22,3.1,14,HOME.x+9,1.55,HOME.z,wall,true);box('homeWallN',18,3.1,.22,HOME.x,1.55,HOME.z-7,wall,true);
    box('homeWallS1',7.2,3.1,.22,HOME.x-5.4,1.55,HOME.z+7,wall,true);box('homeWallS2',7.2,3.1,.22,HOME.x+5.4,1.55,HOME.z+7,wall,true);
    box('homeDoor',2.25,2.65,.12,HOME.doorX,1.33,HOME.doorZ,wood,false);
    // Living room.
    box('rug',5.2,.035,3.4,HOME.x-2.2,.12,HOME.z-1.0,mat('rug','#8e5648'));
    box('sofaSeat',4.4,.55,1.15,HOME.x-4.5,.48,HOME.z-1.2,fabric);box('sofaBack',4.4,1.1,.35,HOME.x-4.5,1.12,HOME.z-1.68,fabric);counters.homeProps+=2;
    box('coffeeTable',2.1,.12,1.05,HOME.x-2.0,.52,HOME.z-1.0,wood);box('coffeeLegA',.12,.5,.12,HOME.x-2.75,.27,HOME.z-1.35,wood);box('coffeeLegB',.12,.5,.12,HOME.x-1.25,.27,HOME.z-.65,wood);counters.homeProps+=3;
    box('tvStand',2.5,.62,.55,HOME.x+1.8,.34,HOME.z-1.8,wood);box('tv',2.2,1.25,.12,HOME.x+1.8,1.35,HOME.z-2.08,dark);counters.homeProps+=2;
    // Bedroom.
    box('bedBase',4.3,.46,2.45,HOME.x-4.0,.35,HOME.z-5.0,wood);box('mattress',4.05,.34,2.25,HOME.x-4.0,.73,HOME.z-5.0,white);box('pillowA',1.2,.24,.68,HOME.x-5.05,.99,HOME.z-5.55,white);box('pillowB',1.2,.24,.68,HOME.x-3.45,.99,HOME.z-5.55,white);counters.homeProps+=4;
    box('wardrobe',2.5,2.4,.65,HOME.x+5.8,1.2,HOME.z-5.7,wood);counters.homeProps++;
    // Kitchen / dining.
    box('counter',4.6,.92,.7,HOME.x+5.3,.48,HOME.z+2.0,wood);box('fridge',1.35,2.15,1.2,HOME.x+7.1,1.08,HOME.z+4.5,white);box('stove',1.45,.92,1.0,HOME.x+4.9,.48,HOME.z+4.55,metal);box('washer',1.25,1.05,1.0,HOME.x+3.2,.54,HOME.z+4.55,white);counters.homeProps+=4;
    box('diningTop',2.7,.12,1.5,HOME.x-.5,.82,HOME.z+3.1,wood);for(const [dx,dz] of [[-1.5,0],[1.5,0],[0,-1.25],[0,1.25]]){box('chairSeat_'+dx+'_'+dz,.7,.08,.7,HOME.x-.5+dx,.48,HOME.z+3.1+dz,trim);box('chairBack_'+dx+'_'+dz,.7,.85,.08,HOME.x-.5+dx,.9,HOME.z+3.42+dz,trim);counters.homeProps+=2;}counters.homeProps++;
    // Familiar home details.
    const fan=cyl('fanHead',.95,.18,HOME.x+1.5,2.3,HOME.z+5.8,metal,20);fan.rotation.x=Math.PI/2;cyl('fanPole',.09,1.45,HOME.x+1.5,1.25,HOME.z+5.8,metal,10);counters.homeProps+=2;
    box('waterFilter',.48,.78,.38,HOME.x+6.9,1.55,HOME.z+1.62,white);counters.homeProps++;
    // Window/balcony cues: laundry and AC.
    box('window',3.4,1.45,.05,HOME.x-5.0,1.8,HOME.z-6.86,mat('glass','#7193a4','#13202a'));box('acIndoor',1.35,.5,.28,HOME.x+4.7,2.45,HOME.z-6.78,white);counters.homeProps+=2;
    for(let i=0;i<5;i++){box('homeLaundry_'+i,.48,.72,.035,HOME.x-6+i*.65,2.18,HOME.z-7.04,mat('cloth'+i,['#b95c50','#52749a','#d0ad4c','#688a60','#dfd8c8'][i]));counters.laundry++;}
    sign('homeCalendar','النهارده يوم جديد',HOME.x+5.1,1.65,HOME.z-6.75,2.5,.58,'#7b4c35',0);
    window.__V12_HOME={ready:true,spawn:{x:HOME.spawnX,z:HOME.spawnZ},door:{x:HOME.doorX,z:HOME.doorZ},props:counters.homeProps};
  }

  function addBuilding(x,z,floors,i,shopName=''){
    const h=floors*3.0,w=16+(i%3)*2,d=14+(i%2)*2,wall=mat('bld'+i,['#c3a680','#b99878','#d0b99c','#bca486','#c9ad8e'][i%5]);
    box('building_'+i,w,h,d,x,h/2,z,wall,true);counters.buildings++;
    const front=z-d/2-.08;
    for(let f=1;f<Math.min(floors,6);f++)for(let s=-1;s<=1;s+=2){box('balcony_'+i+'_'+f+'_'+s,3.0,.16,1.05,x+s*w*.27,f*3+.25,front-.45,mat('balcony','#9d8a74'));box('rail_'+i+'_'+f+'_'+s,3.0,.72,.05,x+s*w*.27,f*3+.62,front-.94,mat('rail','#565651'));counters.balconies++;if((i+f+s)%3===0){for(let q=0;q<3;q++){box('laundry_'+i+'_'+f+'_'+s+'_'+q,.5,.65,.035,x+s*w*.27-.62+q*.62,f*3+.28,front-1.0,mat('laundry'+q,['#b95c50','#52749a','#d0ad4c'][q]));counters.laundry++;}}}
    for(let q=0;q<2;q++){box('ac_'+i+'_'+q,.92,.54,.34,x-w*.22+q*w*.44,2.4+q*2.8,front-.2,mat('ac','#d8d5ca'));counters.acUnits++;}
    if(i%2===0){const dish=reg(BABYLON.MeshBuilder.CreateDisc(P+'dish_'+i,{radius:.64,tessellation:22,sideOrientation:BABYLON.Mesh.DOUBLESIDE},scene));dish.position.set(x-2,h+.85,z);dish.rotation.x=Math.PI*.36;dish.material=mat('dish','#b5b3a8');counters.satelliteDishes++;cyl('tank_'+i,1.25,1.25,x+2,h+.7,z+1.2,mat('tank','#292b2a'),16);counters.rooftopTanks++;}
    if(shopName){box('shopfront_'+i,w*.74,2.55,.35,x,1.3,front-.28,mat('shopfront',['#536b55','#70483a','#43647a','#735f3d'][i%4]));sign('shop_'+i,shopName,x,2.78,front-.5,Math.min(6,w*.65),.72,['#315d48','#7d4b33','#315f78','#6e5c32'][i%4],Math.PI);counters.mixedUse++;}
  }
  function addMicrobus(x,z,ry,i){
    const root=new BABYLON.TransformNode(P+'microbus_'+i,scene);root.position.set(x,0,z);root.rotation.y=ry;
    const body=box('microbusBody_'+i,2.0,1.8,4.8,0,1.0,0,mat('mbWhite','#e7e4dc'));body.parent=root;const blue=box('microbusStripe_'+i,2.04,.34,4.55,0,.82,0,mat('mbBlue','#2f7598'));blue.parent=root;
    for(const sx of [-.92,.92])for(const sz of [-1.55,1.55]){const w=cyl('microbusWheel_'+i+'_'+sx+'_'+sz,.55,.18,sx,.45,sz,mat('tyre','#222322'),12);w.rotation.z=Math.PI/2;w.parent=root;}
    counters.microbuses++;return root;
  }
  function addPedestrian(x,z,i){
    const root=new BABYLON.TransformNode(P+'ped_'+i,scene);root.position.set(x,0,z);const skin=mat('skin'+i,['#9f7356','#b98565','#8d6249','#c09172'][i%4]),cloth=mat('shirt'+i,['#486d82','#8a5549','#5e7654','#7a657e'][i%4]);
    const torso=box('pedTorso_'+i,.62,.9,.32,0,1.2,0,cloth);torso.parent=root;const head=reg(BABYLON.MeshBuilder.CreateSphere(P+'pedHead_'+i,{diameter:.46,segments:10},scene));head.position.set(0,1.88,0);head.material=skin;head.parent=root;
    for(const s of [-1,1]){const leg=cyl('pedLeg_'+i+'_'+s,.16,.8,s*.16,.55,0,mat('pants','#343a40'),8);leg.parent=root;}
    const startX=x,startZ=z,axis=i%2,span=8+(i%4)*3,speed=.00022+(i%3)*.00005;scene.onBeforeRenderObservable.add(()=>{const t=performance.now()*speed+i;const off=Math.sin(t)*span;if(axis)root.position.x=startX+off;else root.position.z=startZ+off;root.rotation.y=axis?(Math.cos(t)>=0?Math.PI/2:-Math.PI/2):(Math.cos(t)>=0?0:Math.PI);});counters.pedestrians++;
  }
  function buildExpandedWorld(){
    if(worldBuilt)return;worldBuilt=true;
    const road=mat('road','#494a48'),dust=mat('dust','#9f9277'),walk=mat('walk','#a79d8e');
    box('worldGround',356,.08,356,0,-.05,0,dust,false);
    // Two broad connectors plus genuinely narrow side lanes.
    box('northMain',356,.07,10,0,.01,120,road);box('eastMain',10,.07,356,120,.012,0,road);
    for(const z of [138,154]){box('northLane_'+z,160,.065,4,-70,.013,z,road);counters.narrowLanes++;}
    for(const x of [-152,-132,-112,-92]){box('northCross_'+x,4,.065,60,x,.014,145,road);counters.narrowLanes++;}
    for(const x of [138,154]){box('eastLane_'+x,4,.065,160,x,.015,-65,road);counters.narrowLanes++;}
    for(const z of [-152,-132,-112,-92]){box('eastCross_'+z,60,.065,4,145,.016,z,road);counters.narrowLanes++;}
    // Sidewalk strips on the broad connectors.
    box('northWalkA',356,.12,2.2,0,.06,113.8,walk);box('northWalkB',356,.12,2.2,0,.06,126.2,walk);box('eastWalkA',2.2,.12,356,113.8,.06,0,walk);box('eastWalkB',2.2,.12,356,126.2,.06,0,walk);
    const shops=['بقالة الحارة','فرن بلدي','عطارة النيل','موبايلات المحطة','ألبان الريف','عصير قصب','مكتبة المدرسة','كشري البلد','ورشة كهرباء','كاوتش وبنشر','خضار وفاكهة','قهوة الميدان'];
    const positions=[[-160,132],[-142,132],[-122,132],[-102,132],[-80,132],[-58,132],[-36,132],[-14,132],[14,132],[38,132],[62,132],[86,132],[132,-160],[132,-140],[132,-120],[132,-100],[132,-78],[132,-56],[132,-34],[132,-12],[132,16],[132,40],[132,64],[132,88],[154,104],[-154,104]];
    positions.forEach(([x,z],i)=>{const floors=5+(i%4);const shop=i<shops.length?shops[i]:((i>=12&&i<20)?shops[(i-12)%shops.length]:'');addBuilding(x,z,floors,i,shop);if(shop&&/ورشة|كاوتش/.test(shop))counters.workshops++;});
    // Street furniture, trees and wires.
    for(let i=0;i<10;i++){const x=-160+i*32;cyl('treeTrunk_'+i,.28,2.2,x,1.1,109.7,mat('trunk','#6b553c'),10);const crown=reg(BABYLON.MeshBuilder.CreateSphere(P+'tree_'+i,{diameter:2.4,segments:10},scene));crown.position.set(x,3.0,109.7);crown.material=mat('leaf','#637855');counters.streetTrees++;}
    for(let i=0;i<18;i++){const horizontal=i<9,x1=-164+i*36,z1=horizontal?128:-164+i*36,x2=horizontal?x1+28:128,z2=horizontal?128:z1+28;const mx=(x1+x2)/2,mz=(z1+z2)/2,len=Math.hypot(x2-x1,z2-z1);const w=box('wire_'+i,len,.025,.025,mx,4.4+(i%3)*.25,mz,mat('wire','#282a28'));w.rotation.y=Math.atan2(z2-z1,x2-x1);counters.utilityWires++;}
    [[-150,119,Math.PI/2],[-112,119,Math.PI/2],[-72,121,-Math.PI/2],[119,-146,0],[121,-108,Math.PI],[119,-68,0]].forEach((v,i)=>addMicrobus(...v,i));
    for(let i=0;i<14;i++)addPedestrian(i<7?-160+i*24:126,i<7?114+(i%2)*12:-160+(i-7)*24,i);
    // Small neighborhood mosque silhouette as a skyline cue, not a dominant landmark.
    const mosque=mat('mosque','#d8cfb6');box('mosqueBase',12,4.4,10,158,2.2,150,mosque,true);const dome=reg(BABYLON.MeshBuilder.CreateSphere(P+'mosqueDome',{diameter:5.2,segments:18,slice:.52},scene));dome.position.set(158,5.0,150);dome.material=mat('dome','#8a9d83');cyl('minaret',1.25,11,164,5.5,150,mosque,14);cyl('minaretCap',2.0,.65,164,10.7,150,mat('dome','#8a9d83'),14);
    sign('northStreet','شارع المحطة الجديدة',0,3.1,114.8,5.4,.72,'#245f82',0);sign('eastStreet','شارع السوق',114.8,3.1,0,4.5,.72,'#245f82',Math.PI/2);
  }

  function distanceTo(p){return camera?Math.hypot(camera.position.x-p.x,camera.position.z-p.z):999;}
  function teleport(x,z,msg){if(!camera)return;camera.position.x=x;camera.position.y=1.72;camera.position.z=z;camera.rotation.x=0;camera.rotation.z=0;insideHome=(Math.abs(x-HOME.x)<15&&Math.abs(z-HOME.z)<15);toast(msg);}
  function installDoorInteractions(){
    const prompt=document.createElement('div');prompt.id='v12DoorPrompt';prompt.textContent='E — افتح الباب';prompt.style.cssText='position:fixed;z-index:25;left:50%;bottom:12%;transform:translateX(-50%);padding:9px 13px;border-radius:10px;background:rgba(17,16,14,.82);border:1px solid rgba(255,255,255,.16);color:#fff;font:700 13px Tahoma;display:none;pointer-events:none';document.body.appendChild(prompt);
    const interact=()=>{if(distanceTo({x:HOME.doorX,z:HOME.doorZ})<2.4){teleport(STREET_DOOR.x,STREET_DOOR.z,'نزلت للشارع 🇪🇬');return true;}if(distanceTo(STREET_DOOR)<2.7){teleport(HOME.spawnX,HOME.spawnZ,'رجعت البيت');return true;}return false;};
    window.addEventListener('keydown',e=>{if((e.key==='e'||e.key==='E')&&document.body.classList.contains('game-started'))interact();});document.getElementById('act')?.addEventListener('click',()=>interact(),true);
    scene.onBeforeRenderObservable.add(()=>{const near=distanceTo({x:HOME.doorX,z:HOME.doorZ})<2.4||distanceTo(STREET_DOOR)<2.7;prompt.style.display=near&&document.body.classList.contains('game-started')?'block':'none';});
    window.__V12_INTERACT_DOOR=interact;
  }

  function createPrologueUI(){
    let el=document.getElementById('v12Prologue');if(el)return el;el=document.createElement('div');el.id='v12Prologue';el.innerHTML='<div class="v12shade"></div><div class="v12copy"><div class="v12place">القاهرة • ٨:١٠ صباحًا</div><div class="v12title">يوم جديد</div><div class="v12line">صحيت في بيتك… والحي كله قدامك.</div></div><button id="v12Skip">تخطي</button>';
    const st=document.createElement('style');st.textContent='#v12Prologue{position:fixed;inset:0;z-index:80;display:none;overflow:hidden;background:#050505;color:#fff;font-family:Tahoma,Arial}#v12Prologue.active{display:block;background:transparent}.v12shade{position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.82),rgba(0,0,0,.05) 58%,rgba(0,0,0,.42));pointer-events:none}.v12copy{position:absolute;right:6vw;bottom:10vh;text-align:right;text-shadow:0 2px 14px #000}.v12place{font-size:12px;letter-spacing:1px;color:#e9c77d}.v12title{font-size:clamp(42px,8vw,76px);font-weight:950;margin-top:7px}.v12line{font-size:15px;margin-top:7px;color:#f0e8da}#v12Skip{position:absolute;left:18px;top:max(18px,env(safe-area-inset-top));border:1px solid rgba(255,255,255,.28);background:rgba(0,0,0,.42);color:white;border-radius:10px;padding:9px 13px;font-weight:800}';document.head.appendChild(st);document.body.appendChild(el);return el;
  }
  async function runPrologue(btn){
    if(prologueRunning)return;prologueRunning=true;const overlay=createPrologueUI();document.getElementById('menu').style.display='none';document.body.classList.remove('game-started');overlay.classList.add('active');
    camera=scene.activeCamera;const old={x:camera.position.x,y:camera.position.y,z:camera.position.z,rx:camera.rotation.x,ry:camera.rotation.y,rz:camera.rotation.z};camera.position.set(HOME.x-5.5,2.15,HOME.z+4.7);camera.rotation.set(.04,.93,0);
    let done=false;const finish=()=>{if(done)return;done=true;overlay.classList.remove('active');const menu=document.getElementById('menu');menu.style.display='';bypassStart=true;btn.click();bypassStart=false;setTimeout(()=>{camera=scene.activeCamera;teleport(HOME.spawnX,HOME.spawnZ,'ابدأ يومك من البيت');document.body.classList.add('game-started');insideHome=true;prologueRunning=false;window.__V12_PROLOGUE.played=true;},80);};
    document.getElementById('v12Skip').onclick=finish;const start=performance.now();await new Promise(resolve=>{const obs=scene.onBeforeRenderObservable.add(()=>{const t=Math.min(1,(performance.now()-start)/4200);camera.position.x=HOME.x-5.5+t*3.9;camera.position.z=HOME.z+4.7-t*3.3;camera.rotation.y=.93-t*.34;if(t>=1){scene.onBeforeRenderObservable.remove(obs);resolve();}});});finish();
  }
  function installPrologue(){
    window.__V12_PROLOGUE={ready:true,played:false,durationMs:4200,startsAtHome:true};createPrologueUI();
    const btn=document.getElementById('newGameBtn');if(btn)btn.addEventListener('click',e=>{if(bypassStart||prologueRunning)return;e.preventDefault();e.stopImmediatePropagation();runPrologue(btn);},{capture:true});
    const kicker=document.querySelector('.kicker');if(kicker)kicker.textContent=`HAYAT MASR • V${document.documentElement.dataset.release||'12'}`;const tagline=document.querySelector('.tagline');if(tagline)tagline.textContent='ابدأ من بيتك، انزل الحارة، وبعدها اتحرك بحرية بين الشوارع والسوق والورش والمناطق الجديدة.';const foot=document.querySelector('.menuFoot');if(foot)foot.textContent=`V${document.documentElement.dataset.release||'11.16.1'} — تحسين أصوات اللعب`;
  }

  function authenticity(){
    const checks={mixedUse:counters.mixedUse>=12,arabicSigns:counters.arabicSigns>=14,microbuses:counters.microbuses>=5,balconies:counters.balconies>=55,laundry:counters.laundry>=30,satelliteDishes:counters.satelliteDishes>=10,acUnits:counters.acUnits>=35,utilityWires:counters.utilityWires>=15,narrowLanes:counters.narrowLanes>=8,buildingScale:counters.buildings>=24,streetLife:counters.pedestrians>=12,home:counters.homeProps>=20};
    const values=Object.values(checks),score=Math.round(values.filter(Boolean).length/values.length*100);return {score,grade:score>=92?'strong':score>=80?'good':'needs-work',checks,profile:'Greater Cairo mixed-use residential street cues',referenceTargets:{sideLaneMeters:'2-4m visual target',typicalExpandedFloors:'5-8',mixedUseGroundFloors:true,microbusPresence:true,balconiesLaundry:true,rooftopDishesTanks:true,facadeAC:true,overheadWires:true}};
  }
  async function install(){
    await waitForScene();installExpandedCollision();buildHome();buildExpandedWorld();installDoorInteractions();installPrologue();const auth=authenticity();
    window.__V12_WORLD={version:12,ready:true,openWorld:true,boundary:BOUND,diameter:BOUND*2,districts:['الحارة الأصلية','منطقة المحطة','منطقة السوق والورش'],home:window.__V12_HOME,counters:{...counters},authenticity:auth};
    window.__egyptDebug=window.__egyptDebug||{};window.__egyptDebug.v12WorldState=()=>JSON.parse(JSON.stringify(window.__V12_WORLD));window.__egyptDebug.v12Teleport=(x,z)=>teleport(x,z,'انتقلت للاختبار');
    console.info('V12 open world ready',window.__V12_WORLD);
  }
  install().catch(err=>{console.error('V12 world failed',err);const box=document.getElementById('errorBox');if(box){box.style.display='block';box.textContent='V12 world failed: '+err.message;}});
})();