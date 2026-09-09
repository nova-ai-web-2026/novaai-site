import {NPC_NAMES,NPC_LINES,WORLD} from './data.js';
const B=window.BABYLON;

function mat(scene,name,color,{emissive=null,specular=.08}={}){
  const m=new B.StandardMaterial(name,scene);
  m.diffuseColor=B.Color3.FromHexString(color);
  m.specularColor=new B.Color3(specular,specular,specular);
  if(emissive)m.emissiveColor=B.Color3.FromHexString(emissive);
  return m;
}
function box(scene,name,size,pos,material,collides=true){
  const m=B.MeshBuilder.CreateBox(name,{width:size.x,height:size.y,depth:size.z},scene);
  m.position.set(pos.x,pos.y,pos.z);m.material=material;m.checkCollisions=collides;return m;
}
function cyl(scene,name,height,diameter,pos,material){
  const m=B.MeshBuilder.CreateCylinder(name,{height,diameter,tessellation:12},scene);
  m.position.set(pos.x,pos.y,pos.z);m.material=material;return m;
}
function sphere(scene,name,diameter,pos,material){
  const m=B.MeshBuilder.CreateSphere(name,{diameter,segments:10},scene);
  m.position.set(pos.x,pos.y,pos.z);m.material=material;return m;
}
function sign(scene,text,pos,width=4.2,background='#3a2414'){
  const plane=B.MeshBuilder.CreatePlane(`sign-${text}`,{width,height:1.05},scene);
  plane.position.set(pos.x,pos.y,pos.z);plane.rotation.y=Math.PI;
  const tex=new B.DynamicTexture(`signTex-${text}`,{width:1024,height:256},scene,true);
  tex.hasAlpha=true;tex.drawText(text,undefined,172,'bold 86px Tahoma','#fff',background,true,true);
  const sm=new B.StandardMaterial(`signMat-${text}`,scene);sm.diffuseTexture=tex;sm.emissiveTexture=tex;sm.specularColor=B.Color3.Black();plane.material=sm;return plane;
}
function shell(scene,prefix,cx,cz,w,d,h,doorX,doorW,material,doorSide='south'){
  const wall=.35,minX=cx-w/2,maxX=cx+w/2,gapL=doorX-doorW/2,gapR=doorX+doorW/2,leftW=Math.max(.2,gapL-minX),rightW=Math.max(.2,maxX-gapR);
  box(scene,`${prefix}-left`,{x:wall,y:h,z:d},{x:cx-w/2,y:h/2,z:cz},material);
  box(scene,`${prefix}-right`,{x:wall,y:h,z:d},{x:cx+w/2,y:h/2,z:cz},material);
  const doorZ=doorSide==='north'?cz+d/2:cz-d/2,solidZ=doorSide==='north'?cz-d/2:cz+d/2;
  box(scene,`${prefix}-solidWall`,{x:w,y:h,z:wall},{x:cx,y:h/2,z:solidZ},material);
  box(scene,`${prefix}-doorWallL`,{x:leftW,y:h,z:wall},{x:minX+leftW/2,y:h/2,z:doorZ},material);
  box(scene,`${prefix}-doorWallR`,{x:rightW,y:h,z:wall},{x:gapR+rightW/2,y:h/2,z:doorZ},material);
  box(scene,`${prefix}-roof`,{x:w,y:.25,z:d},{x:cx,y:h,z:cz},material,false);
}
function attach(mesh,parent,pos){mesh.parent=parent;mesh.position.set(pos.x,pos.y,pos.z);return mesh;}
function createHuman(scene,name,pos,palette,{player=false,metadata={}}={}){
  const root=B.MeshBuilder.CreateCapsule(`${name}-collider`,{height:1.82,radius:.34,tessellation:8},scene);
  root.position.set(pos.x,pos.y,pos.z);root.isVisible=false;root.checkCollisions=player||metadata.kind==='npc';root.ellipsoid=new B.Vector3(.36,.9,.36);

  const torso=attach(box(scene,`${name}-torso`,{x:.62,y:.7,z:.34},{x:0,y:0,z:0},palette.top,false),root,{x:0,y:.23,z:0});
  const waist=attach(box(scene,`${name}-waist`,{x:.52,y:.24,z:.3},{x:0,y:0,z:0},palette.pants,false),root,{x:0,y:-.22,z:0});
  const head=attach(sphere(scene,`${name}-head`,.46,{x:0,y:0,z:0},palette.skin),root,{x:0,y:.82,z:0});head.scaling.y=1.08;
  const hair=attach(sphere(scene,`${name}-hair`,.48,{x:0,y:0,z:0},palette.hair),root,{x:0,y:.94,z:-.02});hair.scaling.y=.44;
  const nose=attach(box(scene,`${name}-nose`,{x:.1,y:.1,z:.13},{x:0,y:0,z:0},palette.skin,false),root,{x:0,y:.82,z:.23});

  const armL=attach(box(scene,`${name}-armL`,{x:.18,y:.72,z:.18},{x:0,y:0,z:0},palette.top,false),root,{x:-.42,y:.18,z:0});
  const armR=attach(box(scene,`${name}-armR`,{x:.18,y:.72,z:.18},{x:0,y:0,z:0},palette.top,false),root,{x:.42,y:.18,z:0});
  const legL=attach(box(scene,`${name}-legL`,{x:.22,y:.78,z:.24},{x:0,y:0,z:0},palette.pants,false),root,{x:-.16,y:-.68,z:0});
  const legR=attach(box(scene,`${name}-legR`,{x:.22,y:.78,z:.24},{x:0,y:0,z:0},palette.pants,false),root,{x:.16,y:-.68,z:0});
  attach(box(scene,`${name}-shoeL`,{x:.24,y:.13,z:.38},{x:0,y:0,z:0},palette.shoes,false),root,{x:-.16,y:-1.09,z:.08});
  attach(box(scene,`${name}-shoeR`,{x:.24,y:.13,z:.38},{x:0,y:0,z:0},palette.shoes,false),root,{x:.16,y:-1.09,z:.08});

  if(player){
    const jacket=attach(box(scene,`${name}-jacket`,{x:.67,y:.44,z:.37},{x:0,y:0,z:0},palette.jacket||palette.top,false),root,{x:0,y:.36,z:-.015});
    jacket.scaling.x=1.02;
    const collar=attach(box(scene,`${name}-collar`,{x:.32,y:.09,z:.38},{x:0,y:0,z:0},palette.jacket||palette.top,false),root,{x:0,y:.68,z:0});
    collar.rotation.z=.02;
  }
  root.metadata={...metadata,anim:{armL,armR,legL,legR,last:root.position.clone(),phase:0}};
  return root;
}
function animateHuman(root,dt){
  const a=root.metadata?.anim;if(!a)return;
  const moved=B.Vector3.DistanceSquared(root.position,a.last);a.last.copyFrom(root.position);
  const walking=moved>.00002;
  if(walking)a.phase+=dt*9;else a.phase*=.9;
  const swing=walking?Math.sin(a.phase)*.5:0;
  a.armL.rotation.x=swing;a.armR.rotation.x=-swing;a.legL.rotation.x=-swing*.75;a.legR.rotation.x=swing*.75;
}
function createCar(scene,name,pos,bodyMat,glassMat,rubberMat,metadata,{police=false}={}){
  const root=box(scene,name,{x:3.8,y:.62,z:1.72},pos,bodyMat,metadata.kind==='driveable');
  const cabin=attach(box(scene,`${name}-cabin`,{x:1.9,y:.62,z:1.45},{x:0,y:0,z:0},glassMat,false),root,{x:.1,y:.55,z:0});
  cabin.scaling.x=1.08;
  for(const x of [-1.15,1.15])for(const z of [-.82,.82]){
    const w=attach(B.MeshBuilder.CreateCylinder(`${name}-wheel`,{height:.18,diameter:.58,tessellation:12},scene),root,{x,y:-.32,z});
    w.rotation.x=Math.PI/2;w.material=rubberMat;
  }
  const headMat=mat(scene,`${name}-headlightMat`,'#fff7d6',{emissive:'#fff1b8'});
  for(const z of [-.55,.55])attach(box(scene,`${name}-headlight`,{x:.08,y:.16,z:.28},{x:0,y:0,z:0},headMat,false),root,{x:1.92,y:.05,z});
  const tailMat=mat(scene,`${name}-tailMat`,'#ba2525',{emissive:'#8a1111'});
  for(const z of [-.55,.55])attach(box(scene,`${name}-tail`,{x:.08,y:.14,z:.25},{x:0,y:0,z:0},tailMat,false),root,{x:-1.92,y:.02,z});
  if(police){
    const red=mat(scene,`${name}-red`,'#bb1b25',{emissive:'#ff2433'}),blue=mat(scene,`${name}-blue`,'#1b4fbb',{emissive:'#3273ff'});
    attach(box(scene,`${name}-barR`,{x:.36,y:.12,z:.2},{x:0,y:0,z:0},red,false),root,{x:0,y:.94,z:-.18});
    attach(box(scene,`${name}-barB`,{x:.36,y:.12,z:.2},{x:0,y:0,z:0},blue,false),root,{x:0,y:.94,z:.18});
  }
  root.metadata=metadata;return root;
}
function building(scene,name,x,z,h,w,mats,{front='north',accent=null}={}){
  const body=box(scene,name,{x:w,y:h,z:7.2},{x,y:h/2,z},mats.wall,true);
  const facadeZ=front==='north'?z+3.63:z-3.63;
  const glass=mats.window,rail=mats.metal;
  for(let floor=1;floor<Math.min(4,Math.floor(h/2.2));floor++){
    const fy=1.45+floor*1.7;
    for(const ox of [-w*.24,w*.24])box(scene,`${name}-window`,{x:1.25,y:.9,z:.08},{x:x+ox,y:fy,z:facadeZ},glass,false);
    if(floor===2&&w>7){
      box(scene,`${name}-balcony`,{x:3.2,y:.16,z:.85},{x,y:fy-.65,z:front==='north'?facadeZ+.38:facadeZ-.38},accent||mats.concrete,false);
      box(scene,`${name}-rail`,{x:3.2,y:.55,z:.08},{x,y:fy-.35,z:front==='north'?facadeZ+.76:facadeZ-.76},rail,false);
    }
  }
  const awning=box(scene,`${name}-awning`,{x:Math.min(w-1,4.8),y:.18,z:1.0},{x,y:2.25,z:front==='north'?facadeZ+.45:facadeZ-.45},accent||mats.awning,false);
  awning.rotation.z=.02;return body;
}

export function createWorld(scene){
  scene.clearColor=new B.Color4(.61,.74,.84,1);scene.collisionsEnabled=true;
  scene.fogMode=B.Scene.FOGMODE_LINEAR;scene.fogStart=46;scene.fogEnd=92;scene.fogColor=new B.Color3(.62,.72,.78);
  if(scene.imageProcessingConfiguration){scene.imageProcessingConfiguration.toneMappingEnabled=true;scene.imageProcessingConfiguration.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;scene.imageProcessingConfiguration.exposure=1.08;scene.imageProcessingConfiguration.contrast=1.12;}

  const mats={
    sand:mat(scene,'sand','#a9916c'),road:mat(scene,'road','#24272a'),walk:mat(scene,'walk','#b9b0a2'),curb:mat(scene,'curb','#d7cfbf'),
    wall:mat(scene,'wall','#b57952'),wall2:mat(scene,'wall2','#9d6749'),shop:mat(scene,'shop','#674536'),green:mat(scene,'green','#526b52'),metal:mat(scene,'metal','#4d5358',{specular:.25}),white:mat(scene,'white','#efe9dd'),
    taxi:mat(scene,'taxi','#e0ad28'),police:mat(scene,'police','#d9e2e7'),wood:mat(scene,'wood','#5c3927'),window:mat(scene,'window','#273842',{specular:.35}),concrete:mat(scene,'concrete','#9b9487'),awning:mat(scene,'awning','#315f58'),rubber:mat(scene,'rubber','#151515'),
    skin:mat(scene,'skin','#b98260'),skin2:mat(scene,'skin2','#9f6e50'),hair:mat(scene,'hair','#171513'),pants:mat(scene,'pants','#2f3337'),shoes:mat(scene,'shoes','#17191b'),playerTop:mat(scene,'playerTop','#d5d1c6'),playerJacket:mat(scene,'playerJacket','#304b5d'),
    npcA:mat(scene,'npcA','#8b4f42'),npcB:mat(scene,'npcB','#4d6c61'),npcC:mat(scene,'npcC','#6b5c82'),cashier:mat(scene,'cashier','#80613f'),
    red:mat(scene,'red','#9b2e2e'),blue:mat(scene,'blue','#385d78'),yellow:mat(scene,'yellow','#c99e32'),plant:mat(scene,'plant','#435d3d')
  };

  const ground=box(scene,'ground',{x:96,y:.4,z:74},{x:0,y:-.2,z:0},mats.sand,true);
  box(scene,'road',{x:96,y:.12,z:9},{x:0,y:.02,z:0},mats.road,false);
  box(scene,'sidewalkA',{x:96,y:.24,z:4.4},{x:0,y:.12,z:-6.6},mats.walk,false);box(scene,'sidewalkB',{x:96,y:.24,z:4.4},{x:0,y:.12,z:6.6},mats.walk,false);
  for(const z of [-4.45,4.45])box(scene,'curb',{x:96,y:.34,z:.26},{x:0,y:.17,z},mats.curb,false);
  for(let x=-42;x<=42;x+=8)box(scene,'laneMark',{x:3.8,y:.025,z:.12},{x,y:.105,z:0},mats.white,false);
  for(let i=-3;i<=3;i++)box(scene,'cross',{x:1.15,y:.03,z:.82},{x:WORLD.crossingX,y:.1,z:i*1.08},mats.white,false);

  shell(scene,'apartment',-22,-15,14,9,5,-18,2.4,mats.wall,'north');sign(scene,'عمارة ١٢ — عزبة النور',{x:-22,y:4.4,z:-10.35},5.1,'#413027');
  const aptDoor=box(scene,'aptDoor',{x:2.25,y:2.7,z:.18},{x:-18,y:1.35,z:-10.48},mats.wood,true);aptDoor.metadata={kind:'door',id:'apartment_exit',open:false,closedPos:{x:-18,z:-10.48},openPos:{x:-16.85,z:-10.48}};
  box(scene,'bed',{x:2.2,y:.55,z:4},{x:-25.5,y:.28,z:-16},mats.white,true);box(scene,'bedHead',{x:2.25,y:1.1,z:.18},{x:-25.5,y:.55,z:-18},mats.wood,true);
  box(scene,'rug',{x:3.8,y:.04,z:2.2},{x:-21.5,y:.04,z:-15.2},mats.red,false);box(scene,'table',{x:1.8,y:.9,z:1.1},{x:-19.5,y:.45,z:-16.5},mats.wood,true);
  box(scene,'wardrobe',{x:1.4,y:2.4,z:.65},{x:-26.2,y:1.2,z:-12.6},mats.wood,true);box(scene,'fridge',{x:.85,y:1.75,z:.78},{x:-18.8,y:.88,z:-18.1},mats.white,true);

  shell(scene,'shop',20,13,11,8,4.6,18,2.4,mats.shop,'south');sign(scene,'فول عم صابر',{x:20,y:4.1,z:8.85},4.6,'#5e2c1f');
  const shopDoor=box(scene,'shopDoor',{x:2.25,y:2.7,z:.18},{x:18,y:1.35,z:9.02},mats.wood,true);shopDoor.metadata={kind:'door',id:'shop_door',open:false,closedPos:{x:18,z:9.02},openPos:{x:19.18,z:9.02}};
  const counter=box(scene,'counter',{x:5,y:1.15,z:1},{x:21,y:.58,z:13.2},mats.wood,true);
  const cashier=createHuman(scene,'cashier',{x:21,y:1.08,z:14.2},{skin:mats.skin2,top:mats.cashier,pants:mats.pants,shoes:mats.shoes,hair:mats.hair},{metadata:{kind:'cashier',name:'عم صابر'}});
  cashier.rotation.y=Math.PI;
  for(let i=0;i<3;i++){box(scene,'shopTable',{x:1.1,y:.85,z:1.1},{x:16+i*2.1,y:.43,z:16},mats.wood,true);box(scene,'foodTray',{x:.86,y:.12,z:.76},{x:16+i*2.1,y:.91,z:16},i===0?mats.yellow:i===1?mats.green:mats.red,false);}

  const northBuildings=[[-39,7.5,8,mats.wall],[-30,8.8,8.5,mats.wall2],[-6,7.2,8,mats.wall],[5,9.4,8.5,mats.wall2],[32,8.2,8,mats.wall],[41,10,8,mats.wall2]];
  northBuildings.forEach(([x,h,w,wall],i)=>building(scene,`north-${i}`,x,16,h,w,{...mats,wall},{front:'south',accent:i%2?mats.awning:mats.red}));
  const southBuildings=[[-38,8.5,8,mats.wall2],[-9,9.8,8.5,mats.wall],[28,7.4,8,mats.wall2],[40,9.2,8,mats.wall]];
  southBuildings.forEach(([x,h,w,wall],i)=>building(scene,`south-${i}`,x,-16,h,w,{...mats,wall},{front:'north',accent:i%2?mats.blue:mats.awning}));
  sign(scene,'بقالة النور',{x:-8.5,y:3.1,z:-11.95},3.7,'#2f5f3b');sign(scene,'قهوة المعلم رضا',{x:31.5,y:3.1,z:11.95},4.4,'#6a3a20');

  for(const x of [-34,-15,15,35]){
    const trunk=cyl(scene,'treeTrunk',2,.28,{x,y:1,z:-8.4},mats.wood);trunk.checkCollisions=false;
    const crown=sphere(scene,'treeCrown',1.6,{x,y:2.45,z:-8.4},mats.plant);crown.scaling.y=1.2;
  }
  for(const x of [-28,-2,24,39])box(scene,'bollard',{x:.25,y:.65,z:.25},{x,y:.34,z:8.55},mats.metal,false);
  for(const x of [-24,2,27]){box(scene,'benchSeat',{x:2.2,y:.16,z:.48},{x,y:.55,z:-8.1},mats.wood,false);box(scene,'benchBack',{x:2.2,y:.7,z:.12},{x,y:.86,z:-8.32},mats.wood,false);}

  const lightPoles=[];for(let x=-36;x<=36;x+=12){for(const z of [-8.8,8.8]){const pole=cyl(scene,'pole',5,.16,{x,y:2.5,z},mats.metal);pole.checkCollisions=false;const arm=box(scene,'lampArm',{x:.9,y:.12,z:.12},{x:x+(z>0?-.35:.35),y:4.72,z},mats.metal,false);arm.rotation.z=z>0?-.15:.15;const lamp=sphere(scene,'lamp',.42,{x:x+(z>0?-.72:.72),y:4.75,z},mats.white);lamp.material.emissiveColor=B.Color3.Black();lightPoles.push(lamp);}}

  const trafficLight={carGreen:true};const signalPole=cyl(scene,'signalPole',4,.18,{x:WORLD.crossingX-2,y:2,z:-5.2},mats.metal);signalPole.checkCollisions=false;
  const carLamp=sphere(scene,'carLamp',.55,{x:WORLD.crossingX-2,y:3.7,z:-5.2},mats.red);const pedLamp=sphere(scene,'pedLamp',.42,{x:WORLD.crossingX-2,y:3,z:-5.2},mats.green);
  trafficLight.set=green=>{carLamp.material.emissiveColor=green?new B.Color3(.1,1,.12):new B.Color3(1,.08,.05);pedLamp.material.emissiveColor=green?new B.Color3(1,.08,.05):new B.Color3(.1,1,.12);};trafficLight.set(true);

  const player=createHuman(scene,'yassin',{x:WORLD.playerStart.x,y:WORLD.playerStart.y,z:WORLD.playerStart.z},{skin:mats.skin,top:mats.playerTop,jacket:mats.playerJacket,pants:mats.pants,shoes:mats.shoes,hair:mats.hair},{player:true,metadata:{kind:'player',name:'ياسين فؤاد'}});

  const npcTops=[mats.npcA,mats.npcB,mats.npcC];const pedestrians=[];
  for(let i=0;i<12;i++){
    const p=createHuman(scene,`npc-${i}`,{x:-34+i*5.8,y:1.02,z:(i%2?7:-7)+(Math.random()*2-1)},{skin:i%4===0?mats.skin2:mats.skin,top:npcTops[i%3],pants:mats.pants,shoes:mats.shoes,hair:mats.hair},{metadata:{kind:'npc',name:NPC_NAMES[i],homeZ:0,targetX:(Math.random()*70)-35,speed:.55+Math.random()*.45,mood:'normal',cooldown:0,line:NPC_LINES[i%NPC_LINES.length]}});
    p.metadata.homeZ=p.position.z;pedestrians.push(p);
  }

  const glass=mats.window,traffic=[];
  for(let i=0;i<7;i++){
    const v=createCar(scene,`traffic-${i}`,{x:-42+i*13,y:.49,z:i%2?-1.85:1.85},i===2?mats.taxi:(i%2?mats.blue:mats.metal),glass,mats.rubber,{kind:'traffic',dir:i%2?1:-1,speed:4+Math.random()*2});
    traffic.push(v);
  }
  const driveCar=createCar(scene,'playerCar',{x:-7,y:.49,z:-7},mats.taxi,glass,mats.rubber,{kind:'driveable',speed:0,heading:0});

  const policeUnits=[];function ensurePoliceUnits(heat){while(policeUnits.length<Math.min(heat,2)){const idx=policeUnits.length;const pc=createCar(scene,`police-${idx}`,{x:idx?42:-42,y:.49,z:idx?-2:2},mats.police,glass,mats.rubber,{kind:'police',speed:5+idx},{police:true});policeUnits.push(pc);}}

  scene.onBeforeRenderObservable.add(()=>{const dt=Math.min(scene.getEngine().getDeltaTime()/1000,.05);animateHuman(player,dt);animateHuman(cashier,dt);for(const p of pedestrians)animateHuman(p,dt);});

  return {mats,ground,aptDoor,shopDoor,cashier,counter,player,pedestrians,traffic,driveCar,trafficLight,lightPoles,policeUnits,ensurePoliceUnits};
}

export function setDoorOpen(door,open){door.metadata.open=open;door.checkCollisions=!open;door.position.x=open?door.metadata.openPos.x:door.metadata.closedPos.x;door.position.z=open?door.metadata.openPos.z:door.metadata.closedPos.z;door.rotation.y=open?Math.PI/2:0;}

export function updatePedestrians(pedestrians,dt,player,showNpcLine){for(const p of pedestrians){const m=p.metadata;m.cooldown=Math.max(0,m.cooldown-dt);const dx=m.targetX-p.position.x;if(Math.abs(dx)<.8)m.targetX=(Math.random()*70)-35;const step=Math.sign(dx)*m.speed*dt;p.moveWithCollisions(new B.Vector3(step,0,0));if(Math.abs(step)>.001)p.rotation.y=step>0?Math.PI/2:-Math.PI/2;const dist=B.Vector3.Distance(p.position,player.position);if(dist<1.05&&m.cooldown<=0){m.cooldown=4;showNpcLine(m.name,m.line);const away=p.position.subtract(player.position);away.y=0;if(away.lengthSquared()>.001){away.normalize();p.moveWithCollisions(away.scale(.35));}}}}

export function updateTraffic(traffic,dt,trafficSystem){for(const v of traffic){const m=v.metadata;const approaching=Math.abs(v.position.x-WORLD.crossingX)<5;const movingToward=(m.dir>0&&v.position.x<WORLD.crossingX)||(m.dir<0&&v.position.x>WORLD.crossingX);const mustStop=!trafficSystem.carGreen&&approaching&&movingToward;v.position.x+=m.dir*(mustStop?0:m.speed)*dt;v.rotation.y=m.dir>0?Math.PI/2:-Math.PI/2;if(v.position.x>48)v.position.x=-48;if(v.position.x<-48)v.position.x=48;}}

export function updatePolice(world,policeSystem,dt){world.ensurePoliceUnits(policeSystem.heat);for(const p of world.policeUnits){if(!policeSystem.active){p.setEnabled(false);continue;}p.setEnabled(true);const t=policeSystem.lastKnown;if(!t)continue;const target=new B.Vector3(t.x,p.position.y,t.z);const d=target.subtract(p.position);if(d.length()>3){d.normalize();p.position.addInPlace(d.scale(p.metadata.speed*dt));p.rotation.y=Math.atan2(d.x,d.z);}}}
