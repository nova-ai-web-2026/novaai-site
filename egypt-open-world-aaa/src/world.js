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
function attach(node,parent,pos){node.parent=parent;node.position.set(pos.x,pos.y,pos.z);return node;}
const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
function smoothAngle(current,target,rate,dt){
  return current+wrapAngle(target-current)*(1-Math.exp(-rate*dt));
}
function moveToward(current,target,maxDelta){
  if(current<target)return Math.min(target,current+maxDelta);
  if(current>target)return Math.max(target,current-maxDelta);
  return current;
}

function createHuman(scene,name,pos,palette,{player=false,metadata={}}={}){
  const root=B.MeshBuilder.CreateCapsule(`${name}-collider`,{height:1.82,radius:.34,tessellation:8},scene);
  root.position.set(pos.x,pos.y,pos.z);root.isVisible=false;root.checkCollisions=player||metadata.kind==='npc';root.ellipsoid=new B.Vector3(.36,.9,.36);

  const visual=attach(new B.TransformNode(`${name}-visual`,scene),root,{x:0,y:0,z:0});
  const torso=attach(box(scene,`${name}-torso`,{x:.62,y:.7,z:.34},{x:0,y:0,z:0},palette.top,false),visual,{x:0,y:.23,z:0});
  const waist=attach(box(scene,`${name}-waist`,{x:.52,y:.24,z:.3},{x:0,y:0,z:0},palette.pants,false),visual,{x:0,y:-.22,z:0});
  const head=attach(sphere(scene,`${name}-head`,.46,{x:0,y:0,z:0},palette.skin),visual,{x:0,y:.82,z:0});head.scaling.y=1.08;
  const hair=attach(sphere(scene,`${name}-hair`,.48,{x:0,y:0,z:0},palette.hair),visual,{x:0,y:.94,z:-.02});hair.scaling.y=.44;
  const nose=attach(box(scene,`${name}-nose`,{x:.1,y:.1,z:.13},{x:0,y:0,z:0},palette.skin,false),visual,{x:0,y:.82,z:.23});

  const shoulderL=attach(new B.TransformNode(`${name}-shoulderL`,scene),visual,{x:-.42,y:.48,z:0});
  const shoulderR=attach(new B.TransformNode(`${name}-shoulderR`,scene),visual,{x:.42,y:.48,z:0});
  attach(box(scene,`${name}-armL`,{x:.18,y:.72,z:.18},{x:0,y:0,z:0},palette.top,false),shoulderL,{x:0,y:-.34,z:0});
  attach(box(scene,`${name}-armR`,{x:.18,y:.72,z:.18},{x:0,y:0,z:0},palette.top,false),shoulderR,{x:0,y:-.34,z:0});

  const hipL=attach(new B.TransformNode(`${name}-hipL`,scene),visual,{x:-.16,y:-.34,z:0});
  const hipR=attach(new B.TransformNode(`${name}-hipR`,scene),visual,{x:.16,y:-.34,z:0});
  attach(box(scene,`${name}-legL`,{x:.22,y:.78,z:.24},{x:0,y:0,z:0},palette.pants,false),hipL,{x:0,y:-.36,z:0});
  attach(box(scene,`${name}-legR`,{x:.22,y:.78,z:.24},{x:0,y:0,z:0},palette.pants,false),hipR,{x:0,y:-.36,z:0});
  attach(box(scene,`${name}-shoeL`,{x:.24,y:.13,z:.38},{x:0,y:0,z:0},palette.shoes,false),visual,{x:-.16,y:-1.09,z:.08});
  attach(box(scene,`${name}-shoeR`,{x:.24,y:.13,z:.38},{x:0,y:0,z:0},palette.shoes,false),visual,{x:.16,y:-1.09,z:.08});

  if(player){
    const jacket=attach(box(scene,`${name}-jacket`,{x:.67,y:.44,z:.37},{x:0,y:0,z:0},palette.jacket||palette.top,false),visual,{x:0,y:.36,z:-.015});
    jacket.scaling.x=1.02;
    const collar=attach(box(scene,`${name}-collar`,{x:.32,y:.09,z:.38},{x:0,y:0,z:0},palette.jacket||palette.top,false),visual,{x:0,y:.68,z:0});
    collar.rotation.z=.02;
  }
  root.metadata={...metadata,anim:{visual,torso,waist,head,hair,nose,shoulderL,shoulderR,hipL,hipR,last:root.position.clone(),phase:0,speed:0}};
  return root;
}
function animateHuman(root,dt){
  const a=root.metadata?.anim;if(!a)return;
  const distance=B.Vector3.Distance(root.position,a.last);a.last.copyFrom(root.position);
  const instant=dt>0?distance/dt:0;
  a.speed+=(instant-a.speed)*(1-Math.exp(-8*dt));
  const moving=a.speed>.08;
  if(moving)a.phase+=dt*(5.4+Math.min(a.speed,5)*1.45);
  const amp=moving?Math.min(.64,.12+a.speed*.13):0;
  const swing=Math.sin(a.phase)*amp;
  const settle=1-Math.exp(-10*dt);
  a.shoulderL.rotation.x+=(swing-a.shoulderL.rotation.x)*settle;
  a.shoulderR.rotation.x+=(-swing-a.shoulderR.rotation.x)*settle;
  a.hipL.rotation.x+=(-swing*.82-a.hipL.rotation.x)*settle;
  a.hipR.rotation.x+=(swing*.82-a.hipR.rotation.x)*settle;
  const bob=moving?Math.abs(Math.sin(a.phase*2))*.025:0;
  a.visual.position.y+=(bob-a.visual.position.y)*(1-Math.exp(-12*dt));
  a.visual.rotation.z+=(0-a.visual.rotation.z)*(1-Math.exp(-8*dt));
}

function createCar(scene,name,pos,bodyMat,glassMat,rubberMat,metadata,{police=false}={}){
  const root=box(scene,name,{x:3.8,y:.62,z:1.72},pos,bodyMat,metadata.kind==='driveable');
  const cabin=attach(box(scene,`${name}-cabin`,{x:1.9,y:.62,z:1.45},{x:0,y:0,z:0},glassMat,false),root,{x:.1,y:.55,z:0});
  cabin.scaling.x=1.08;
  const wheels=[];
  for(const x of [-1.15,1.15])for(const z of [-.82,.82]){
    const w=attach(B.MeshBuilder.CreateCylinder(`${name}-wheel`,{height:.18,diameter:.58,tessellation:12},scene),root,{x,y:-.32,z});
    w.rotation.x=Math.PI/2;w.material=rubberMat;wheels.push(w);
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
  root.metadata={...metadata,wheels,cruiseSpeed:metadata.cruiseSpeed??Math.abs(metadata.speed||0),wheelRadius:.29};
  return root;
}
function spinCarWheels(car,dt){
  const m=car.metadata;if(!m?.wheels)return;
  const spin=(m.speed||0)*dt/(m.wheelRadius||.29);
  for(const w of m.wheels)w.rotation.z-=spin;
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
function createApartmentInterior(scene,mats){
  box(scene,'apartment-floor',{x:13.2,y:.08,z:8.1},{x:-22,y:.03,z:-15},mats.floor,false);
  box(scene,'apartment-accent-wall',{x:5.1,y:2.45,z:.08},{x:-24,y:1.45,z:-19.28},mats.plaster2,false);

  const bedBase=box(scene,'apartment-bed-base',{x:3.25,y:.35,z:2.25},{x:-24.7,y:.2,z:-17.15},mats.wood,true);
  const mattress=box(scene,'apartment-mattress',{x:3.05,y:.32,z:2.05},{x:-24.7,y:.53,z:-17.12},mats.mattress,false);
  box(scene,'apartment-bed-head',{x:3.25,y:1.1,z:.16},{x:-24.7,y:.72,z:-18.2},mats.wood,true);
  for(const x of [-25.45,-23.95])box(scene,'apartment-pillow',{x:1.05,y:.18,z:.55},{x,y:.77,z:-17.72},mats.white,false);
  bedBase.metadata={kind:'apartment-furniture'};mattress.metadata={kind:'apartment-furniture'};

  const sofa=box(scene,'apartment-sofa',{x:3.45,y:.58,z:1.05},{x:-22.2,y:.32,z:-12.35},mats.sofa,true);
  box(scene,'apartment-sofa-back',{x:3.45,y:.95,z:.2},{x:-22.2,y:.82,z:-12.82},mats.sofa,true);
  for(const x of [-23.4,-21.0])box(scene,'apartment-sofa-arm',{x:.25,y:.72,z:1.05},{x,y:.42,z:-12.35},mats.sofa,true);
  sofa.metadata={kind:'apartment-furniture'};
  box(scene,'apartment-coffee-table',{x:2.1,y:.42,z:.9},{x:-22.2,y:.25,z:-14.05},mats.wood,true);
  box(scene,'apartment-living-rug',{x:4.4,y:.035,z:3.1},{x:-22.1,y:.08,z:-13.75},mats.rug,false);

  box(scene,'apartment-tv-unit',{x:2.8,y:.46,z:.45},{x:-19.0,y:.25,z:-12.45},mats.wood,true);
  const tv=box(scene,'apartment-tv',{x:2.35,y:1.22,z:.09},{x:-19.0,y:1.12,z:-12.66},mats.screen,false);
  tv.material.emissiveColor=new B.Color3(.035,.055,.07);

  for(let i=0;i<4;i++)box(scene,'apartment-kitchen-lower',{x:1.05,y:.88,z:.72},{x:-18.25-i*1.08,y:.48,z:-18.65},mats.kitchen,true);
  box(scene,'apartment-kitchen-top',{x:4.25,y:.13,z:.82},{x:-19.9,y:.98,z:-18.64},mats.counter,false);
  box(scene,'apartment-sink',{x:.78,y:.05,z:.48},{x:-18.25,y:1.08,z:-18.62},mats.metal,false);
  const stove=box(scene,'apartment-stove',{x:.72,y:.08,z:.5},{x:-20.35,y:1.08,z:-18.62},mats.screen,false);
  stove.material.emissiveColor=new B.Color3(.02,.02,.02);
  box(scene,'apartment-fridge',{x:.92,y:1.85,z:.82},{x:-17.65,y:.94,z:-17.3},mats.fridge,true);
  for(let i=0;i<3;i++)box(scene,'apartment-kitchen-upper',{x:1.1,y:.75,z:.48},{x:-18.4-i*1.15,y:2.05,z:-19.05},mats.kitchen2,false);

  box(scene,'apartment-dining-table',{x:2.05,y:.1,z:1.25},{x:-18.9,y:.79,z:-15.35},mats.wood,true);
  for(const z of [-16.25,-14.45]){
    box(scene,'apartment-chair-seat',{x:.65,y:.12,z:.65},{x:-18.9,y:.49,z},mats.wood,true);
    box(scene,'apartment-chair-back',{x:.65,y:.85,z:.12},{x:-18.9,y:.83,z:z+(z<-15?.28:-.28)},mats.wood,true);
  }

  const windowZ=-19.31;
  for(const x of [-24.4,-22.4]){
    box(scene,'apartment-window-frame',{x:1.65,y:1.55,z:.09},{x,y:2.25,z:windowZ},mats.windowFrame,false);
    box(scene,'apartment-window-glass',{x:1.36,y:1.28,z:.05},{x,y:2.25,z:windowZ-.03},mats.window,false);
    box(scene,'apartment-curtain-left',{x:.22,y:1.55,z:.08},{x:x-.82,y:2.25,z:windowZ+.08},mats.curtain,false);
    box(scene,'apartment-curtain-right',{x:.22,y:1.55,z:.08},{x:x+.82,y:2.25,z:windowZ+.08},mats.curtain,false);
  }
  for(const x of [-25.2,-22.1,-19.0])box(scene,'apartment-ceiling-light',{x:.62,y:.08,z:.62},{x,y:4.65,z:-15},mats.light,false);

  box(scene,'apartment-entry-console',{x:1.45,y:.72,z:.45},{x:-19.4,y:.37,z:-11.35},mats.wood,true);
  box(scene,'apartment-mirror',{x:1.1,y:1.35,z:.06},{x:-19.4,y:1.45,z:-11.58},mats.mirror,false);
  sign(scene,'بيت ياسين',{x:-22.1,y:3.8,z:-10.33},2.55,'#57463c');
}
function createApartmentFacade(scene,mats){
  box(scene,'apartment-front-band',{x:13.6,y:.24,z:.42},{x:-22,y:4.5,z:-10.26},mats.trim,false);
  box(scene,'apartment-door-canopy',{x:3.15,y:.18,z:1.25},{x:-18,y:3.08,z:-9.95},mats.trim,false);
  for(const x of [-19.45,-16.55])box(scene,'apartment-canopy-post',{x:.18,y:2.55,z:.18},{x,y:1.42,z:-9.88},mats.metal,false);
  box(scene,'apartment-step-a',{x:3.1,y:.16,z:.8},{x:-18,y:.08,z:-9.78},mats.step,false);
  box(scene,'apartment-step-b',{x:2.6,y:.14,z:.62},{x:-18,y:.22,z:-10.02},mats.step,false);
  for(const x of [-25.1,-22.8]){
    box(scene,'apartment-facade-window-frame',{x:1.72,y:1.48,z:.08},{x,y:2.25,z:-10.29},mats.windowFrame,false);
    box(scene,'apartment-facade-window',{x:1.42,y:1.18,z:.045},{x,y:2.25,z:-10.24},mats.window,false);
  }
  box(scene,'apartment-ac-unit',{x:1.12,y:.72,z:.55},{x:-25.4,y:3.7,z:-10.04},mats.fridge,false);
  for(let i=0;i<4;i++)box(scene,'apartment-ac-slot',{x:.72,y:.045,z:.02},{x:-25.4,y:3.53+i*.11,z:-9.75},mats.metal,false);
}

export function createWorld(scene){
  scene.clearColor=new B.Color4(.61,.74,.84,1);scene.collisionsEnabled=true;
  scene.fogMode=B.Scene.FOGMODE_LINEAR;scene.fogStart=46;scene.fogEnd=92;scene.fogColor=new B.Color3(.62,.72,.78);
  if(scene.imageProcessingConfiguration){scene.imageProcessingConfiguration.toneMappingEnabled=true;scene.imageProcessingConfiguration.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;scene.imageProcessingConfiguration.exposure=1.05;scene.imageProcessingConfiguration.contrast=1.1;}

  const mats={
    sand:mat(scene,'sand','#a9916c'),road:mat(scene,'road','#24272a'),walk:mat(scene,'walk','#b9b0a2'),curb:mat(scene,'curb','#d7cfbf'),
    wall:mat(scene,'wall','#b57952'),wall2:mat(scene,'wall2','#9d6749'),shop:mat(scene,'shop','#674536'),green:mat(scene,'green','#526b52'),metal:mat(scene,'metal','#4d5358',{specular:.25}),white:mat(scene,'white','#efe9dd'),
    taxi:mat(scene,'taxi','#e0ad28'),police:mat(scene,'police','#d9e2e7'),wood:mat(scene,'wood','#5c3927'),window:mat(scene,'window','#273842',{specular:.35}),concrete:mat(scene,'concrete','#9b9487'),awning:mat(scene,'awning','#315f58'),rubber:mat(scene,'rubber','#151515'),
    skin:mat(scene,'skin','#b98260'),skin2:mat(scene,'skin2','#9f6e50'),hair:mat(scene,'hair','#171513'),pants:mat(scene,'pants','#2f3337'),shoes:mat(scene,'shoes','#17191b'),playerTop:mat(scene,'playerTop','#d5d1c6'),playerJacket:mat(scene,'playerJacket','#304b5d'),
    npcA:mat(scene,'npcA','#8b4f42'),npcB:mat(scene,'npcB','#4d6c61'),npcC:mat(scene,'npcC','#6b5c82'),cashier:mat(scene,'cashier','#80613f'),
    red:mat(scene,'red','#9b2e2e'),blue:mat(scene,'blue','#385d78'),yellow:mat(scene,'yellow','#c99e32'),plant:mat(scene,'plant','#435d3d'),
    floor:mat(scene,'apartmentFloor','#8c735b'),plaster:mat(scene,'plaster','#e7ddcf'),plaster2:mat(scene,'plaster2','#a76b54'),sofa:mat(scene,'sofa','#394c55'),
    rug:mat(scene,'rug','#8f3f35'),mattress:mat(scene,'mattress','#dad4c8'),screen:mat(scene,'screen','#101419',{specular:.3}),kitchen:mat(scene,'kitchen','#47585a'),
    kitchen2:mat(scene,'kitchen2','#d7cbbb'),counter:mat(scene,'counter','#88715a'),fridge:mat(scene,'fridge','#c9cdd0'),windowFrame:mat(scene,'windowFrame','#ddd3c5'),
    curtain:mat(scene,'curtain','#8a4f42'),light:mat(scene,'light','#fff0bd',{emissive:'#d9b86c'}),mirror:mat(scene,'mirror','#78909a',{specular:.45}),trim:mat(scene,'trim','#574238'),step:mat(scene,'step','#a89b8b')
  };

  const ground=box(scene,'ground',{x:96,y:.4,z:74},{x:0,y:-.2,z:0},mats.sand,true);
  box(scene,'road',{x:96,y:.12,z:9},{x:0,y:.02,z:0},mats.road,false);
  box(scene,'sidewalkA',{x:96,y:.24,z:4.4},{x:0,y:.12,z:-6.6},mats.walk,false);box(scene,'sidewalkB',{x:96,y:.24,z:4.4},{x:0,y:.12,z:6.6},mats.walk,false);
  for(const z of [-4.45,4.45])box(scene,'curb',{x:96,y:.34,z:.26},{x:0,y:.17,z},mats.curb,false);
  for(let x=-42;x<=42;x+=8)box(scene,'laneMark',{x:3.8,y:.025,z:.12},{x,y:.105,z:0},mats.white,false);
  for(let i=-3;i<=3;i++)box(scene,'cross',{x:1.15,y:.03,z:.82},{x:WORLD.crossingX,y:.1,z:i*1.08},mats.white,false);

  shell(scene,'apartment',-22,-15,14,9,5,-18,2.4,mats.plaster,'north');
  createApartmentInterior(scene,mats);createApartmentFacade(scene,mats);
  const aptDoor=box(scene,'aptDoor',{x:2.25,y:2.7,z:.18},{x:-18,y:1.35,z:-10.48},mats.wood,true);aptDoor.metadata={kind:'door',id:'apartment_exit',open:false,closedPos:{x:-18,z:-10.48},openPos:{x:-16.85,z:-10.48}};

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
  trafficLight.set=green=>{trafficLight.carGreen=green;carLamp.material.emissiveColor=green?new B.Color3(.1,1,.12):new B.Color3(1,.08,.05);pedLamp.material.emissiveColor=green?new B.Color3(1,.08,.05):new B.Color3(.1,1,.12);};trafficLight.set(true);

  const player=createHuman(scene,'yassin',{x:WORLD.playerStart.x,y:WORLD.playerStart.y,z:WORLD.playerStart.z},{skin:mats.skin,top:mats.playerTop,jacket:mats.playerJacket,pants:mats.pants,shoes:mats.shoes,hair:mats.hair},{player:true,metadata:{kind:'player',name:'ياسين فؤاد'}});

  const npcTops=[mats.npcA,mats.npcB,mats.npcC];const pedestrians=[];
  for(let i=0;i<12;i++){
    const side=i%2?1:-1,homeZ=side*7+(Math.random()*1.2-.6);
    const p=createHuman(scene,`npc-${i}`,{x:-34+i*5.8,y:1.02,z:homeZ},{skin:i%4===0?mats.skin2:mats.skin,top:npcTops[i%3],pants:mats.pants,shoes:mats.shoes,hair:mats.hair},{metadata:{kind:'npc',name:NPC_NAMES[i],homeZ,speed:.72+Math.random()*.34,mood:'normal',cooldown:0,line:NPC_LINES[i%NPC_LINES.length],velocity:new B.Vector3(0,0,0),target:new B.Vector3((Math.random()*70)-35,1.02,homeZ+(Math.random()*1.8-.9)),pause:Math.random()*.8}});
    pedestrians.push(p);
  }

  const glass=mats.window,traffic=[];
  for(let i=0;i<7;i++){
    const cruise=4.2+Math.random()*1.6;
    const v=createCar(scene,`traffic-${i}`,{x:-42+i*13,y:.49,z:i%2?-1.85:1.85},i===2?mats.taxi:(i%2?mats.blue:mats.metal),glass,mats.rubber,{kind:'traffic',dir:i%2?1:-1,speed:cruise,cruiseSpeed:cruise});
    v.rotation.y=v.metadata.dir>0?0:Math.PI;traffic.push(v);
  }
  const driveCar=createCar(scene,'playerCar',{x:-7,y:.49,z:-7},mats.taxi,glass,mats.rubber,{kind:'driveable',speed:0,heading:0,steer:0});

  const policeUnits=[];function ensurePoliceUnits(heat){while(policeUnits.length<Math.min(heat,2)){const idx=policeUnits.length;const pc=createCar(scene,`police-${idx}`,{x:idx?42:-42,y:.49,z:idx?-2:2},mats.police,glass,mats.rubber,{kind:'police',speed:5+idx,cruiseSpeed:5+idx},{police:true});policeUnits.push(pc);}}

  scene.onBeforeRenderObservable.add(()=>{const dt=Math.min(scene.getEngine().getDeltaTime()/1000,.05);animateHuman(player,dt);animateHuman(cashier,dt);for(const p of pedestrians)animateHuman(p,dt);});

  return {mats,ground,aptDoor,shopDoor,cashier,counter,player,pedestrians,traffic,driveCar,trafficLight,lightPoles,policeUnits,ensurePoliceUnits,spinCarWheels,smoothAngle};
}

export function setDoorOpen(door,open){door.metadata.open=open;door.checkCollisions=!open;door.position.x=open?door.metadata.openPos.x:door.metadata.closedPos.x;door.position.z=open?door.metadata.openPos.z:door.metadata.closedPos.z;door.rotation.y=open?Math.PI/2:0;}

function pickPedTarget(p){
  const m=p.metadata;
  m.target.set((Math.random()*74)-37,p.position.y,m.homeZ+(Math.random()*2.2-1.1));
}
export function updatePedestrians(pedestrians,dt,player,showNpcLine){
  for(const p of pedestrians){
    const m=p.metadata;m.cooldown=Math.max(0,m.cooldown-dt);m.pause=Math.max(0,(m.pause||0)-dt);
    const to=m.target.subtract(p.position);to.y=0;const distance=to.length();
    if(distance<.65){pickPedTarget(p);m.pause=.45+Math.random()*1.15;}
    let desired=new B.Vector3(0,0,0);
    if(m.pause<=0&&distance>.05){desired=to.scale(1/Math.max(distance,.001)).scale(m.speed);}
    const response=1-Math.exp(-3.8*dt);
    m.velocity.x+=(desired.x-m.velocity.x)*response;m.velocity.z+=(desired.z-m.velocity.z)*response;
    if(Math.abs(m.velocity.x)+Math.abs(m.velocity.z)<.018){m.velocity.x=0;m.velocity.z=0;}
    const move=m.velocity.scale(dt);p.moveWithCollisions(move);
    const planar=Math.hypot(m.velocity.x,m.velocity.z);
    if(planar>.08){const heading=Math.atan2(m.velocity.x,m.velocity.z);p.rotation.y=smoothAngle(p.rotation.y,heading,7.5,dt);}
    const dist=B.Vector3.Distance(p.position,player.position);
    if(dist<1.05&&m.cooldown<=0){
      m.cooldown=4;showNpcLine(m.name,m.line);
      const away=p.position.subtract(player.position);away.y=0;
      if(away.lengthSquared()>.001){away.normalize();m.velocity.addInPlace(away.scale(.65));m.target.copyFrom(p.position.add(away.scale(2.2)));m.target.y=p.position.y;}
    }
  }
}

export function updateTraffic(traffic,dt,trafficSystem){
  for(const v of traffic){
    const m=v.metadata;
    const signedDistance=(WORLD.crossingX-v.position.x)*m.dir;
    const beforeLine=signedDistance>0;
    const brakingZone=beforeLine&&signedDistance<9.5;
    const mustStop=!trafficSystem.carGreen&&brakingZone;
    const targetSpeed=mustStop?0:m.cruiseSpeed;
    const rate=targetSpeed<m.speed?5.4:2.2;
    m.speed=moveToward(m.speed,targetSpeed,rate*dt);
    v.position.x+=m.dir*m.speed*dt;
    spinCarWheels(v,dt);
    if(v.position.x>49){v.position.x=-49;m.speed=m.cruiseSpeed;}
    if(v.position.x<-49){v.position.x=49;m.speed=m.cruiseSpeed;}
  }
}

export function updatePolice(world,policeSystem,dt){
  world.ensurePoliceUnits(policeSystem.heat);
  for(const p of world.policeUnits){
    if(!policeSystem.active){p.setEnabled(false);continue;}
    p.setEnabled(true);const t=policeSystem.lastKnown;if(!t)continue;
    const target=new B.Vector3(t.x,p.position.y,t.z);const d=target.subtract(p.position);
    if(d.length()>3){
      d.normalize();const desiredHeading=Math.atan2(-d.z,d.x);
      p.rotation.y=smoothAngle(p.rotation.y,desiredHeading,5.5,dt);
      p.position.addInPlace(d.scale(p.metadata.speed*dt));spinCarWheels(p,dt);
    }
  }
}
