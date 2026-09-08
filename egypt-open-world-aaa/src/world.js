import {NPC_NAMES,NPC_LINES,WORLD} from './data.js';
const B=window.BABYLON;

function mat(scene,name,color,rough=1){const m=new B.PBRMaterial(name,scene);m.albedoColor=B.Color3.FromHexString(color);m.roughness=rough;m.metallic=0;return m;}
function box(scene,name,size,pos,material,collides=true){const m=B.MeshBuilder.CreateBox(name,{width:size.x,height:size.y,depth:size.z},scene);m.position.set(pos.x,pos.y,pos.z);m.material=material;m.checkCollisions=collides;return m;}
function sign(scene,text,pos){const plane=B.MeshBuilder.CreatePlane('sign',{width:4.2,height:1.1},scene);plane.position.set(pos.x,pos.y,pos.z);plane.rotation.y=Math.PI;const tex=new B.DynamicTexture('signTex',{width:1024,height:256},scene,true);tex.hasAlpha=true;tex.drawText(text,undefined,170,'bold 96px Tahoma','#fff','#3a2414',true,true);plane.material=new B.StandardMaterial('signMat',scene);plane.material.diffuseTexture=tex;plane.material.emissiveColor=new B.Color3(.25,.18,.1);return plane;}
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

export function createWorld(scene){
  scene.clearColor=new B.Color4(.62,.78,.9,1);scene.collisionsEnabled=true;
  const mats={sand:mat(scene,'sand','#b9a27d'),road:mat(scene,'road','#303235'),walk:mat(scene,'walk','#b9b2a6'),wall:mat(scene,'wall','#b98f69'),shop:mat(scene,'shop','#795137'),green:mat(scene,'green','#61785c'),metal:mat(scene,'metal','#696c70',.55),white:mat(scene,'white','#eee7da'),taxi:mat(scene,'taxi','#d9aa32'),police:mat(scene,'police','#d8dce4'),wood:mat(scene,'wood','#654630')};
  const ground=box(scene,'ground',{x:90,y:.4,z:70},{x:0,y:-.2,z:0},mats.sand,true);
  box(scene,'road',{x:90,y:.12,z:8},{x:0,y:.02,z:0},mats.road,false);box(scene,'sidewalkA',{x:90,y:.22,z:4},{x:0,y:.12,z:-6},mats.walk,false);box(scene,'sidewalkB',{x:90,y:.22,z:4},{x:0,y:.12,z:6},mats.walk,false);
  for(let i=-3;i<=3;i++)box(scene,'cross',{x:1.2,y:.03,z:.8},{x:WORLD.crossingX,y:.1,z:i*1.05},mats.white,false);

  shell(scene,'apartment',-22,-15,14,9,5,-18,2.4,mats.wall,'north');sign(scene,'عمارة ١٢ — عزبة النور',{x:-22,y:4.4,z:-10.35});
  const aptDoor=box(scene,'aptDoor',{x:2.25,y:2.7,z:.18},{x:-18,y:1.35,z:-10.48},mats.wood,true);aptDoor.metadata={kind:'door',id:'apartment_exit',open:false,closedPos:{x:-18,z:-10.48},openPos:{x:-16.85,z:-10.48}};
  box(scene,'bed',{x:2.2,y:.55,z:4},{x:-25.5,y:.28,z:-16},mats.white,true);box(scene,'table',{x:1.8,y:.9,z:1.1},{x:-19.5,y:.45,z:-16.5},mats.wood,true);

  shell(scene,'shop',20,13,11,8,4.6,18,2.4,mats.shop,'south');sign(scene,'فول عم صابر',{x:20,y:4.1,z:8.85});
  const shopDoor=box(scene,'shopDoor',{x:2.25,y:2.7,z:.18},{x:18,y:1.35,z:9.02},mats.wood,true);shopDoor.metadata={kind:'door',id:'shop_door',open:false,closedPos:{x:18,z:9.02},openPos:{x:19.18,z:9.02}};
  const counter=box(scene,'counter',{x:5,y:1.15,z:1},{x:21,y:.58,z:13.2},mats.wood,true);
  const cashier=B.MeshBuilder.CreateCapsule('cashier',{height:1.75,radius:.36},scene);cashier.position.set(21,.9,14.2);cashier.material=mat(scene,'cashierMat','#8a6a45');cashier.metadata={kind:'cashier',name:'عم صابر'};
  for(let i=0;i<3;i++)box(scene,'shopTable',{x:1.1,y:.85,z:1.1},{x:16+i*2.1,y:.43,z:16},mats.wood,true);

  for(const x of [-38,-30,-5,5,31,39])box(scene,'building',{x:8,y:5+Math.random()*5,z:8},{x,y:2.5,z:15},Math.random()>.5?mats.wall:mats.shop,true);
  for(const x of [-36,-8,28,38])box(scene,'building',{x:8,y:5+Math.random()*4,z:8},{x,y:2.5,z:-15},Math.random()>.5?mats.wall:mats.shop,true);

  const lightPoles=[];for(let x=-36;x<=36;x+=12){for(const z of [-8,8]){const pole=B.MeshBuilder.CreateCylinder('pole',{height:5,diameter:.16},scene);pole.position.set(x,2.5,z);pole.material=mats.metal;const lamp=B.MeshBuilder.CreateSphere('lamp',{diameter:.45},scene);lamp.position.set(x,5,z);lamp.material=mats.white;lightPoles.push(lamp);}}

  const trafficLight={carGreen:true};const signalPole=B.MeshBuilder.CreateCylinder('signalPole',{height:4,diameter:.18},scene);signalPole.position.set(WORLD.crossingX-2,2,-5);signalPole.material=mats.metal;
  const carLamp=B.MeshBuilder.CreateSphere('carLamp',{diameter:.55},scene);carLamp.position.set(WORLD.crossingX-2,3.7,-5);const carLampMat=new B.StandardMaterial('carLampMat',scene);carLamp.material=carLampMat;
  const pedLamp=B.MeshBuilder.CreateSphere('pedLamp',{diameter:.42},scene);pedLamp.position.set(WORLD.crossingX-2,3,-5);const pedLampMat=new B.StandardMaterial('pedLampMat',scene);pedLamp.material=pedLampMat;
  trafficLight.set=green=>{trafficLight.carGreen=green;carLampMat.emissiveColor=green?new B.Color3(.1,1,.12):new B.Color3(1,.08,.05);pedLampMat.emissiveColor=green?new B.Color3(1,.08,.05):new B.Color3(.1,1,.12);};trafficLight.set(true);

  const player=B.MeshBuilder.CreateCapsule('player',{height:1.9,radius:.42},scene);player.position.set(WORLD.playerStart.x,WORLD.playerStart.y,WORLD.playerStart.z);player.material=mat(scene,'playerMat','#3d628c');player.checkCollisions=true;player.ellipsoid=new B.Vector3(.42,.95,.42);player.metadata={kind:'player'};

  const pedestrians=[];for(let i=0;i<12;i++){const p=B.MeshBuilder.CreateCapsule(`npc-${i}`,{height:1.75,radius:.36},scene);p.position.set(-34+i*5.8,.92,(i%2?7:-7)+(Math.random()*2-1));p.material=mat(scene,`npcMat-${i}`,i%3===0?'#8b4f42':i%3===1?'#4d6c61':'#6b5c82');p.checkCollisions=true;p.ellipsoid=new B.Vector3(.38,.88,.38);p.metadata={kind:'npc',name:NPC_NAMES[i],homeZ:p.position.z,targetX:(Math.random()*70)-35,speed:.55+Math.random()*.45,mood:'normal',cooldown:0,line:NPC_LINES[i%NPC_LINES.length]};pedestrians.push(p);}

  const traffic=[];for(let i=0;i<7;i++){const v=box(scene,`traffic-${i}`,{x:3.4,y:1.35,z:1.65},{x:-42+i*13,y:.8,z:i%2?-1.8:1.8},i===2?mats.taxi:mats.metal,false);v.metadata={kind:'traffic',dir:i%2?1:-1,speed:4+Math.random()*2};traffic.push(v);}
  const driveCar=box(scene,'playerCar',{x:3.7,y:1.45,z:1.75},{x:-7,y:.82,z:-7},mats.taxi,true);driveCar.metadata={kind:'driveable',speed:0,heading:0};

  const policeUnits=[];function ensurePoliceUnits(heat){while(policeUnits.length<Math.min(heat,2)){const idx=policeUnits.length;const pc=box(scene,`police-${idx}`,{x:3.8,y:1.45,z:1.8},{x:idx?42:-42,y:.82,z:idx?-2:2},mats.police,false);pc.metadata={kind:'police',speed:5+idx};policeUnits.push(pc);}}

  return {mats,ground,aptDoor,shopDoor,cashier,counter,player,pedestrians,traffic,driveCar,trafficLight,lightPoles,policeUnits,ensurePoliceUnits};
}

export function setDoorOpen(door,open){door.metadata.open=open;door.checkCollisions=!open;door.position.x=open?door.metadata.openPos.x:door.metadata.closedPos.x;door.position.z=open?door.metadata.openPos.z:door.metadata.closedPos.z;door.rotation.y=open?Math.PI/2:0;}

export function updatePedestrians(pedestrians,dt,player,showNpcLine){for(const p of pedestrians){const m=p.metadata;m.cooldown=Math.max(0,m.cooldown-dt);const dx=m.targetX-p.position.x;if(Math.abs(dx)<.8)m.targetX=(Math.random()*70)-35;const step=Math.sign(dx)*m.speed*dt;p.moveWithCollisions(new B.Vector3(step,0,0));const dist=B.Vector3.Distance(p.position,player.position);if(dist<1.05&&m.cooldown<=0){m.cooldown=4;showNpcLine(m.name,m.line);const away=p.position.subtract(player.position);away.y=0;if(away.lengthSquared()>.001){away.normalize();p.moveWithCollisions(away.scale(.35));}}}}

export function updateTraffic(traffic,dt,trafficSystem){for(const v of traffic){const m=v.metadata;const approaching=Math.abs(v.position.x-WORLD.crossingX)<5;const movingToward=(m.dir>0&&v.position.x<WORLD.crossingX)||(m.dir<0&&v.position.x>WORLD.crossingX);const mustStop=!trafficSystem.carGreen&&approaching&&movingToward;v.position.x+=m.dir*(mustStop?0:m.speed)*dt;if(v.position.x>46)v.position.x=-46;if(v.position.x<-46)v.position.x=46;}}

export function updatePolice(world,policeSystem,dt){world.ensurePoliceUnits(policeSystem.heat);for(const p of world.policeUnits){if(!policeSystem.active){p.setEnabled(false);continue;}p.setEnabled(true);const t=policeSystem.lastKnown;if(!t)continue;const target=new B.Vector3(t.x,p.position.y,t.z);const d=target.subtract(p.position);if(d.length()>3){d.normalize();p.position.addInPlace(d.scale(p.metadata.speed*dt));p.rotation.y=Math.atan2(d.x,d.z);}}}
