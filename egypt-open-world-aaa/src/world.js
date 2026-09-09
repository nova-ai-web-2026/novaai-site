import {NPC_NAMES,NPC_LINES,WORLD} from './data.js';
const B=window.BABYLON;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const damp=(from,to,speed,dt)=>B.Scalar.Lerp(from,to,1-Math.exp(-speed*dt));
function wrapAngle(a){while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;}
function dampAngle(from,to,speed,dt){return from+wrapAngle(to-from)*(1-Math.exp(-speed*dt));}

function mat(scene,name,color,{emissive=null,specular=.06}={}){
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
function cyl(scene,name,height,diameter,pos,material,tessellation=12){
  const m=B.MeshBuilder.CreateCylinder(name,{height,diameter,tessellation},scene);
  m.position.set(pos.x,pos.y,pos.z);m.material=material;return m;
}
function sphere(scene,name,diameter,pos,material,segments=10){
  const m=B.MeshBuilder.CreateSphere(name,{diameter,segments},scene);
  m.position.set(pos.x,pos.y,pos.z);m.material=material;return m;
}
function attach(mesh,parent,pos){mesh.parent=parent;mesh.position.set(pos.x,pos.y,pos.z);return mesh;}
function sign(scene,text,pos,width=4.2,background='#3a2414'){
  const plane=B.MeshBuilder.CreatePlane(`sign-${text}`,{width,height:1.05},scene);
  plane.position.set(pos.x,pos.y,pos.z);plane.rotation.y=Math.PI;
  const tex=new B.DynamicTexture(`signTex-${text}`,{width:1024,height:256},scene,true);
  tex.hasAlpha=true;tex.drawText(text,undefined,172,'bold 86px Tahoma','#fff',background,true,true);
  const sm=new B.StandardMaterial(`signMat-${text}`,scene);sm.diffuseTexture=tex;sm.emissiveTexture=tex;sm.specularColor=B.Color3.Black();plane.material=sm;return plane;
}
function shell(scene,prefix,cx,cz,w,d,h,doorX,doorW,material,doorSide='south'){
  const wall=.32,minX=cx-w/2,maxX=cx+w/2,gapL=doorX-doorW/2,gapR=doorX+doorW/2,leftW=Math.max(.2,gapL-minX),rightW=Math.max(.2,maxX-gapR);
  box(scene,`${prefix}-left`,{x:wall,y:h,z:d},{x:cx-w/2,y:h/2,z:cz},material);
  box(scene,`${prefix}-right`,{x:wall,y:h,z:d},{x:cx+w/2,y:h/2,z:cz},material);
  const doorZ=doorSide==='north'?cz+d/2:cz-d/2,solidZ=doorSide==='north'?cz-d/2:cz+d/2;
  box(scene,`${prefix}-solidWall`,{x:w,y:h,z:wall},{x:cx,y:h/2,z:solidZ},material);
  box(scene,`${prefix}-doorWallL`,{x:leftW,y:h,z:wall},{x:minX+leftW/2,y:h/2,z:doorZ},material);
  box(scene,`${prefix}-doorWallR`,{x:rightW,y:h,z:wall},{x:gapR+rightW/2,y:h/2,z:doorZ},material);
  box(scene,`${prefix}-roof`,{x:w,y:.2,z:d},{x:cx,y:h,z:cz},material,false);
}

function limb(scene,name,parent,pivotPos,length,diameter,material,handMat=null){
  const pivot=new B.TransformNode(`${name}-joint`,scene);pivot.parent=parent;pivot.position.set(pivotPos.x,pivotPos.y,pivotPos.z);
  const part=cyl(scene,name,length,diameter,{x:0,y:0,z:0},material,10);part.parent=pivot;part.position.y=-length*.5;
  if(handMat){const hand=sphere(scene,`${name}-hand`,diameter*1.05,{x:0,y:0,z:0},handMat,8);hand.parent=pivot;hand.position.y=-length-.04;}
  return pivot;
}
function createHuman(scene,name,pos,palette,{player=false,metadata={}}={}){
  const root=B.MeshBuilder.CreateCapsule(`${name}-collider`,{height:1.82,radius:.33,tessellation:8},scene);
  root.position.set(pos.x,pos.y,pos.z);root.isVisible=false;root.checkCollisions=player||metadata.kind==='npc';root.ellipsoid=new B.Vector3(.35,.9,.35);

  const rig=new B.TransformNode(`${name}-rig`,scene);rig.parent=root;
  const torso=attach(box(scene,`${name}-torso`,{x:.6,y:.66,z:.32},{x:0,y:0,z:0},palette.top,false),rig,{x:0,y:.24,z:0});
  torso.scaling.x=1.02;
  attach(box(scene,`${name}-waist`,{x:.48,y:.22,z:.29},{x:0,y:0,z:0},palette.pants,false),rig,{x:0,y:-.2,z:0});
  const neck=attach(cyl(scene,`${name}-neck`,.12,.17,{x:0,y:0,z:0},palette.skin,8),rig,{x:0,y:.62,z:0});
  neck.rotation.z=.01;
  const head=attach(sphere(scene,`${name}-head`,.44,{x:0,y:0,z:0},palette.skin,12),rig,{x:0,y:.84,z:.01});head.scaling.y=1.08;
  const hair=attach(sphere(scene,`${name}-hair`,.455,{x:0,y:0,z:0},palette.hair,10),rig,{x:0,y:.96,z:-.015});hair.scaling.y=.42;
  attach(box(scene,`${name}-nose`,{x:.075,y:.085,z:.11},{x:0,y:0,z:0},palette.skin,false),rig,{x:0,y:.82,z:.225});

  const armL=limb(scene,`${name}-armL`,rig,{x:-.39,y:.48,z:0},.62,.16,palette.top,palette.skin);
  const armR=limb(scene,`${name}-armR`,rig,{x:.39,y:.48,z:0},.62,.16,palette.top,palette.skin);
  const legL=limb(scene,`${name}-legL`,rig,{x:-.145,y:-.23,z:0},.72,.19,palette.pants);
  const legR=limb(scene,`${name}-legR`,rig,{x:.145,y:-.23,z:0},.72,.19,palette.pants);
  const shoeL=attach(box(scene,`${name}-shoeL`,{x:.22,y:.12,z:.34},{x:0,y:0,z:0},palette.shoes,false),legL,{x:0,y:-.76,z:.075});
  const shoeR=attach(box(scene,`${name}-shoeR`,{x:.22,y:.12,z:.34},{x:0,y:0,z:0},palette.shoes,false),legR,{x:0,y:-.76,z:.075});
  shoeL.rotation.x=.02;shoeR.rotation.x=.02;

  if(player){
    attach(box(scene,`${name}-jacket`,{x:.64,y:.42,z:.35},{x:0,y:0,z:0},palette.jacket||palette.top,false),rig,{x:0,y:.35,z:-.012});
    attach(box(scene,`${name}-collar`,{x:.31,y:.075,z:.36},{x:0,y:0,z:0},palette.jacket||palette.top,false),rig,{x:0,y:.66,z:0});
  }
  root.metadata={...metadata,anim:{rig,armL,armR,legL,legR,last:root.position.clone(),phase:Math.random()*Math.PI*2,blend:0}};
  return root;
}
function animateHuman(root,dt){
  const a=root.metadata?.anim;if(!a)return;
  const moved=B.Vector3.DistanceSquared(root.position,a.last);a.last.copyFrom(root.position);
  const moving=moved>.000004;
  a.blend=damp(a.blend,moving?1:0,9,dt);
  if(moving)a.phase+=dt*(6.4+Math.min(3,Math.sqrt(moved)/Math.max(dt,.001)*.35));
  const cycle=Math.sin(a.phase),swing=cycle*.48*a.blend;
  a.armL.rotation.x=damp(a.armL.rotation.x,swing,12,dt);
  a.armR.rotation.x=damp(a.armR.rotation.x,-swing,12,dt);
  a.legL.rotation.x=damp(a.legL.rotation.x,-swing*.72,12,dt);
  a.legR.rotation.x=damp(a.legR.rotation.x,swing*.72,12,dt);
  a.rig.position.y=damp(a.rig.position.y,Math.abs(Math.sin(a.phase*2))*.018*a.blend,12,dt);
  a.rig.rotation.z=damp(a.rig.rotation.z,0,8,dt);
}

function createCar(scene,name,pos,bodyMat,glassMat,rubberMat,metadata,{police=false}={}){
  const root=box(scene,name,{x:1.72,y:.56,z:3.75},pos,bodyMat,metadata.kind==='driveable');
  attach(box(scene,`${name}-lower`,{x:1.78,y:.22,z:3.25},{x:0,y:0,z:0},bodyMat,false),root,{x:0,y:-.22,z:0});
  const cabin=attach(box(scene,`${name}-cabin`,{x:1.48,y:.58,z:1.72},{x:0,y:0,z:0},glassMat,false),root,{x:0,y:.48,z:-.12});
  cabin.scaling.x=.96;
  for(const x of [-.82,.82])for(const z of [-1.13,1.13]){
    const w=attach(B.MeshBuilder.CreateCylinder(`${name}-wheel`,{height:.18,diameter:.56,tessellation:12},scene),root,{x,y:-.31,z});
    w.rotation.z=Math.PI/2;w.material=rubberMat;
  }
  const headMat=mat(scene,`${name}-headlightMat`,'#fff7d6',{emissive:'#ffe8a8'});
  for(const x of [-.53,.53])attach(box(scene,`${name}-headlight`,{x:.28,y:.14,z:.07},{x:0,y:0,z:0},headMat,false),root,{x,y:.02,z:1.9});
  const tailMat=mat(scene,`${name}-tailMat`,'#a82727',{emissive:'#7c1414'});
  for(const x of [-.53,.53])attach(box(scene,`${name}-tail`,{x:.27,y:.13,z:.07},{x:0,y:0,z:0},tailMat,false),root,{x,y:.02,z:-1.9});
  if(police){
    const red=mat(scene,`${name}-red`,'#b51e28',{emissive:'#ff2635'}),blue=mat(scene,`${name}-blue`,'#2456b8',{emissive:'#3478ff'});
    attach(box(scene,`${name}-barR`,{x:.48,y:.11,z:.18},{x:0,y:0,z:0},red,false),root,{x:-.28,y:.84,z:-.1});
    attach(box(scene,`${name}-barB`,{x:.48,y:.11,z:.18},{x:0,y:0,z:0},blue,false),root,{x:.28,y:.84,z:-.1});
  }
  root.metadata=metadata;return root;
}
function building(scene,name,x,z,h,w,mats,{front='north',accent=null}={}){
  const body=box(scene,name,{x:w,y:h,z:7.2},{x,y:h/2,z},mats.wall,true);
  const facadeZ=front==='north'?z+3.63:z-3.63,glass=mats.window,rail=mats.metal;
  const floors=Math.min(4,Math.floor(h/2.15));
  for(let floor=1;floor<floors;floor++){
    const fy=1.3+floor*1.72;
    for(const ox of [-w*.25,w*.25]){
      box(scene,`${name}-window`,{x:1.2,y:.88,z:.07},{x:x+ox,y:fy,z:facadeZ},glass,false);
      box(scene,`${name}-window-top`,{x:1.28,y:.07,z:.1},{x:x+ox,y:fy+.47,z:facadeZ},mats.concrete,false);
    }
    if(floor===2&&w>7){
      box(scene,`${name}-balcony`,{x:3.35,y:.14,z:.82},{x,y:fy-.61,z:front==='north'?facadeZ+.37:facadeZ-.37},accent||mats.concrete,false);
      for(const ox of [-1.55,0,1.55])box(scene,`${name}-railPost`,{x:.07,y:.5,z:.07},{x:x+ox,y:fy-.32,z:front==='north'?facadeZ+.76:facadeZ-.76},rail,false);
      box(scene,`${name}-rail`,{x:3.2,y:.07,z:.07},{x,y:fy-.08,z:front==='north'?facadeZ+.76:facadeZ-.76},rail,false);
    }
  }
  box(scene,`${name}-awning`,{x:Math.min(w-1,4.7),y:.16,z:.95},{x,y:2.18,z:front==='north'?facadeZ+.43:facadeZ-.43},accent||mats.awning,false);
  return body;
}
function makeLamp(scene,name,pos,mats){
  const stem=cyl(scene,`${name}-stem`,.48,.055,pos,mats.metal,8);stem.checkCollisions=false;
  const shade=B.MeshBuilder.CreateCylinder(`${name}-shade`,{height:.22,diameterTop:.24,diameterBottom:.48,tessellation:12},scene);shade.position.set(pos.x,pos.y+.32,pos.z);shade.material=mats.lampShade;
  const bulb=sphere(scene,`${name}-bulb`,.12,{x:pos.x,y:pos.y+.2,z:pos.z},mats.lampGlow,8);bulb.material.emissiveColor=new B.Color3(.7,.5,.25);
}
function apartmentInterior(scene,mats){
  box(scene,'apartment-floor',{x:13.3,y:.08,z:8.3},{x:-22,y:.02,z:-15},mats.floor,false);
  for(let x=-28.1;x<=-16;x+=2.1)box(scene,'floor-strip',{x:.045,y:.015,z:8.1},{x,y:.07,z:-15},mats.floorLine,false);
  box(scene,'skirting-back',{x:13.2,y:.18,z:.08},{x:-22,y:.12,z:-19.28},mats.wood,false);
  for(const x of [-28.55,-15.45])box(scene,'skirting-side',{x:.08,y:.18,z:8.1},{x,y:.12,z:-15},mats.wood,false);

  const sofaBase=box(scene,'sofa-base',{x:2.7,y:.44,z:1.05},{x:-25.25,y:.25,z:-12.7},mats.sofa,true);
  box(scene,'sofa-back',{x:2.7,y:.95,z:.24},{x:-25.25,y:.76,z:-13.08},mats.sofa,true);
  for(const x of [-26.48,-24.02])box(scene,'sofa-arm',{x:.24,y:.65,z:1.02},{x,y:.42,z:-12.7},mats.sofa,true);
  for(const x of [-25.85,-24.65])box(scene,'sofa-cushion',{x:1.05,y:.13,z:.74},{x,y:.53,z:-12.56},mats.cushion,false);
  box(scene,'coffee-table',{x:1.75,y:.13,z:.82},{x:-22.6,y:.52,z:-12.75},mats.wood,true);
  for(const x of [-23.35,-21.85])for(const z of [-13.04,-12.46])box(scene,'coffee-leg',{x:.09,y:.5,z:.09},{x,y:.25,z},mats.metal,false);

  box(scene,'tv-unit',{x:2.15,y:.48,z:.46},{x:-18.7,y:.25,z:-12.95},mats.wood,true);
  box(scene,'tv-screen',{x:1.92,y:1.12,z:.09},{x:-18.7,y:1.18,z:-13.16},mats.screen,false);
  box(scene,'tv-stand',{x:.12,y:.35,z:.12},{x:-18.7,y:.62,z:-13.05},mats.metal,false);

  box(scene,'bed-frame',{x:2.35,y:.34,z:3.7},{x:-25.35,y:.2,z:-16.55},mats.wood,true);
  box(scene,'mattress',{x:2.2,y:.38,z:3.45},{x:-25.35,y:.52,z:-16.5},mats.mattress,true);
  box(scene,'blanket',{x:2.12,y:.07,z:1.95},{x:-25.35,y:.75,z:-17.15},mats.blanket,false);
  box(scene,'pillowA',{x:.82,y:.18,z:.55},{x:-25.85,y:.78,z:-15.25},mats.pillow,false);
  box(scene,'pillowB',{x:.82,y:.18,z:.55},{x:-24.85,y:.78,z:-15.25},mats.pillow,false);
  box(scene,'headboard',{x:2.45,y:1.05,z:.14},{x:-25.35,y:.76,z:-18.36},mats.wood,true);
  box(scene,'bedside',{x:.7,y:.62,z:.62},{x:-27.25,y:.32,z:-16.05},mats.wood,true);makeLamp(scene,'bed-lamp',{x:-27.25,y:.87,z:-16.05},mats);

  box(scene,'kitchen-run',{x:5.3,y:.88,z:.72},{x:-20.8,y:.46,z:-18.55},mats.kitchen,true);
  box(scene,'kitchen-top',{x:5.35,y:.09,z:.78},{x:-20.8,y:.94,z:-18.55},mats.counter,false);
  for(const x of [-22.6,-21.4,-20.2,-19])box(scene,'cabinet-door',{x:.95,y:.62,z:.04},{x,y:.46,z:-18.16},mats.cabinet,false);
  box(scene,'sink',{x:.82,y:.04,z:.5},{x:-21.65,y:1,z:-18.48},mats.metal,false);
  const faucet=cyl(scene,'faucet',.34,.055,{x:-21.65,y:1.17,z:-18.76},mats.metal,8);faucet.rotation.x=Math.PI/2;
  for(const x of [-19.4,-19.05])for(const z of [-18.66,-18.38])cyl(scene,'stove-ring',.02,.18,{x,y:1,z},mats.dark,10);
  box(scene,'fridge',{x:.92,y:1.86,z:.82},{x:-17.25,y:.94,z:-18.25},mats.fridge,true);
  box(scene,'fridge-line',{x:.8,y:.04,z:.04},{x:-17.25,y:.96,z:-17.82},mats.metal,false);

  box(scene,'wardrobe',{x:1.25,y:2.25,z:.62},{x:-17.25,y:1.14,z:-16.6},mats.wardrobe,true);
  box(scene,'wardrobe-line',{x:.04,y:2.05,z:.04},{x:-17.25,y:1.15,z:-16.27},mats.metal,false);
  for(const x of [-17.55,-16.95])sphere(scene,'wardrobe-knob',.07,{x,y:1.18,z:-16.24},mats.metal,8);

  box(scene,'window-glass',{x:.08,y:1.55,z:2.4},{x:-28.82,y:2.4,z:-15.35},mats.window,false);
  box(scene,'window-frameA',{x:.11,y:1.75,z:.08},{x:-28.78,y:2.4,z:-16.58},mats.white,false);
  box(scene,'window-frameB',{x:.11,y:1.75,z:.08},{x:-28.78,y:2.4,z:-14.12},mats.white,false);
  box(scene,'window-mid',{x:.11,y:.08,z:2.45},{x:-28.78,y:2.4,z:-15.35},mats.white,false);
  box(scene,'curtainA',{x:.06,y:1.85,z:.52},{x:-28.68,y:2.35,z:-16.23},mats.curtain,false);
  box(scene,'curtainB',{x:.06,y:1.85,z:.52},{x:-28.68,y:2.35,z:-14.47},mats.curtain,false);

  box(scene,'wall-art-1',{x:1.05,y:.72,z:.045},{x:-23.3,y:2.65,z:-19.15},mats.artA,false);
  box(scene,'wall-art-2',{x:1.05,y:.72,z:.045},{x:-22.05,y:2.65,z:-19.15},mats.artB,false);
  box(scene,'wall-art-frame',{x:2.55,y:.08,z:.07},{x:-22.68,y:3.05,z:-19.12},mats.wood,false);

  const ceiling=sphere(scene,'ceiling-light',.34,{x:-22,y:4.6,z:-14.6},mats.lampGlow,10);ceiling.scaling.y=.35;ceiling.material.emissiveColor=new B.Color3(.55,.4,.2);
  box(scene,'door-frame-top',{x:2.62,y:.17,z:.24},{x:-18,y:2.83,z:-10.45},mats.trim,false);
  for(const x of [-19.23,-16.77])box(scene,'door-frame-side',{x:.17,y:2.72,z:.24},{x,y:1.43,z:-10.45},mats.trim,false);
}
function apartmentFacade(scene,mats){
  box(scene,'apartment-front-skin',{x:13.9,y:4.85,z:.12},{x:-22,y:2.44,z:-10.28},mats.facade,false);
  box(scene,'front-door-cut-cover',{x:2.48,y:2.82,z:.13},{x:-18,y:1.41,z:-10.19},mats.dark,false).setEnabled(false);
  for(const x of [-25.3,-22.8]){
    box(scene,'apt-front-window',{x:1.55,y:1.15,z:.08},{x,y:2.45,z:-10.18},mats.window,false);
    box(scene,'apt-window-sill',{x:1.7,y:.12,z:.34},{x,y:1.83,z:-10.02},mats.stone,false);
  }
  box(scene,'apt-balcony',{x:4.25,y:.15,z:1.05},{x:-24.05,y:1.68,z:-9.85},mats.stone,false);
  box(scene,'apt-balcony-rail',{x:4.05,y:.08,z:.08},{x:-24.05,y:2.25,z:-9.38},mats.metal,false);
  for(const x of [-25.9,-25,-24,-23,-22.2])box(scene,'apt-balcony-post',{x:.06,y:1.0,z:.06},{x,y:1.8,z:-9.38},mats.metal,false);
  box(scene,'entrance-canopy',{x:3.2,y:.18,z:1.25},{x:-18,y:3.05,z:-9.92},mats.awning,false);
  box(scene,'ac-unit',{x:1.05,y:.62,z:.36},{x:-27.1,y:3.65,z:-10.03},mats.fridge,false);
  for(let i=0;i<4;i++)box(scene,'ac-slat',{x:.72,y:.035,z:.03},{x:-27.1,y:3.48+i*.12,z:-9.83},mats.metal,false);
  sign(scene,'عمارة ١٢',{x:-18,y:3.75,z:-10.12},2.2,'#3e352d');
}

export function createWorld(scene){
  scene.clearColor=new B.Color4(.62,.76,.86,1);scene.collisionsEnabled=true;
  scene.fogMode=B.Scene.FOGMODE_LINEAR;scene.fogStart=54;scene.fogEnd=100;scene.fogColor=new B.Color3(.66,.76,.82);
  if(scene.imageProcessingConfiguration){scene.imageProcessingConfiguration.toneMappingEnabled=true;scene.imageProcessingConfiguration.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;scene.imageProcessingConfiguration.exposure=1.02;scene.imageProcessingConfiguration.contrast=1.08;}

  const mats={
    sand:mat(scene,'sand','#a58e6b'),road:mat(scene,'road','#262a2d'),walk:mat(scene,'walk','#b9b1a5'),curb:mat(scene,'curb','#ded6c8'),
    wall:mat(scene,'wall','#b47756'),wall2:mat(scene,'wall2','#986249'),facade:mat(scene,'facade','#c9936d'),shop:mat(scene,'shop','#674536'),green:mat(scene,'green','#526b52'),metal:mat(scene,'metal','#4c5358',{specular:.24}),white:mat(scene,'white','#efe9dd'),
    taxi:mat(scene,'taxi','#dfaa28'),police:mat(scene,'police','#dbe3e7'),wood:mat(scene,'wood','#59402e'),window:mat(scene,'window','#294652',{specular:.32}),stone:mat(scene,'stone','#b8ab98'),awning:mat(scene,'awning','#345f58'),rubber:mat(scene,'rubber','#171719'),
    skin:mat(scene,'skin','#b98260'),skin2:mat(scene,'skin2','#98674c'),hair:mat(scene,'hair','#191612'),pants:mat(scene,'pants','#2e3337'),shoes:mat(scene,'shoes','#17191b'),playerTop:mat(scene,'playerTop','#d8d3c8'),playerJacket:mat(scene,'playerJacket','#315066'),
    npcA:mat(scene,'npcA','#8b5145'),npcB:mat(scene,'npcB','#4c6d61'),npcC:mat(scene,'npcC','#6a5c82'),cashier:mat(scene,'cashier','#80613f'),
    red:mat(scene,'red','#8d3431'),blue:mat(scene,'blue','#3b6078'),yellow:mat(scene,'yellow','#c99d35'),plant:mat(scene,'plant','#456140'),
    floor:mat(scene,'floor','#b9946f'),floorLine:mat(scene,'floorLine','#9c7e61'),sofa:mat(scene,'sofa','#3e6968'),cushion:mat(scene,'cushion','#d4b47a'),screen:mat(scene,'screen','#11181d',{specular:.25}),mattress:mat(scene,'mattress','#eee8dc'),blanket:mat(scene,'blanket','#6e7e92'),pillow:mat(scene,'pillow','#f5efe3'),
    kitchen:mat(scene,'kitchen','#6b594c'),counter:mat(scene,'counter','#c7b9a4'),cabinet:mat(scene,'cabinet','#816c59'),fridge:mat(scene,'fridge','#d9dcda'),wardrobe:mat(scene,'wardrobe','#73523b'),curtain:mat(scene,'curtain','#b45f55'),artA:mat(scene,'artA','#d3a23e'),artB:mat(scene,'artB','#406c79'),lampShade:mat(scene,'lampShade','#d7b077'),lampGlow:mat(scene,'lampGlow','#f5dd9a'),trim:mat(scene,'trim','#3f3329'),dark:mat(scene,'dark','#201e1b')
  };

  const ground=box(scene,'ground',{x:100,y:.4,z:76},{x:0,y:-.2,z:0},mats.sand,true);
  box(scene,'road',{x:100,y:.12,z:9},{x:0,y:.02,z:0},mats.road,false);
  box(scene,'sidewalkA',{x:100,y:.24,z:4.4},{x:0,y:.12,z:-6.6},mats.walk,false);box(scene,'sidewalkB',{x:100,y:.24,z:4.4},{x:0,y:.12,z:6.6},mats.walk,false);
  for(const z of [-4.45,4.45])box(scene,'curb',{x:100,y:.34,z:.26},{x:0,y:.17,z},mats.curb,false);
  for(let x=-44;x<=44;x+=8)box(scene,'laneMark',{x:3.8,y:.025,z:.12},{x,y:.105,z:0},mats.white,false);
  for(let i=-3;i<=3;i++)box(scene,'cross',{x:1.15,y:.03,z:.82},{x:WORLD.crossingX,y:.1,z:i*1.08},mats.white,false);

  shell(scene,'apartment',-22,-15,14,9,5,-18,2.4,mats.wall,'north');
  apartmentInterior(scene,mats);apartmentFacade(scene,mats);
  const aptDoor=box(scene,'aptDoor',{x:2.18,y:2.62,z:.16},{x:-18,y:1.34,z:-10.42},mats.wood,true);aptDoor.metadata={kind:'door',id:'apartment_exit',open:false,closedPos:{x:-18,z:-10.42},openPos:{x:-16.86,z:-10.42}};

  shell(scene,'shop',20,13,11,8,4.6,18,2.4,mats.shop,'south');sign(scene,'فول عم صابر',{x:20,y:4.1,z:8.85},4.6,'#5e2c1f');
  const shopDoor=box(scene,'shopDoor',{x:2.25,y:2.7,z:.18},{x:18,y:1.35,z:9.02},mats.wood,true);shopDoor.metadata={kind:'door',id:'shop_door',open:false,closedPos:{x:18,z:9.02},openPos:{x:19.18,z:9.02}};
  const counter=box(scene,'counter',{x:5,y:1.15,z:1},{x:21,y:.58,z:13.2},mats.wood,true);
  const cashier=createHuman(scene,'cashier',{x:21,y:1.08,z:14.2},{skin:mats.skin2,top:mats.cashier,pants:mats.pants,shoes:mats.shoes,hair:mats.hair},{metadata:{kind:'cashier',name:'عم صابر'}});cashier.rotation.y=Math.PI;
  for(let i=0;i<3;i++){box(scene,'shopTable',{x:1.1,y:.85,z:1.1},{x:16+i*2.1,y:.43,z:16},mats.wood,true);box(scene,'foodTray',{x:.86,y:.12,z:.76},{x:16+i*2.1,y:.91,z:16},i===0?mats.yellow:i===1?mats.green:mats.red,false);}

  const northBuildings=[[-39,7.5,8,mats.wall],[-30,8.8,8.5,mats.wall2],[-6,7.2,8,mats.wall],[5,9.4,8.5,mats.wall2],[32,8.2,8,mats.wall],[41,10,8,mats.wall2]];
  northBuildings.forEach(([x,h,w,wall],i)=>building(scene,`north-${i}`,x,16,h,w,{...mats,wall},{front:'south',accent:i%2?mats.awning:mats.red}));
  const southBuildings=[[-40,8.5,8,mats.wall2],[-8,9.8,8.5,mats.wall],[29,7.4,8,mats.wall2],[41,9.2,8,mats.wall]];
  southBuildings.forEach(([x,h,w,wall],i)=>building(scene,`south-${i}`,x,-16,h,w,{...mats,wall},{front:'north',accent:i%2?mats.blue:mats.awning}));
  sign(scene,'بقالة النور',{x:-8.5,y:3.1,z:-11.95},3.7,'#2f5f3b');sign(scene,'قهوة المعلم رضا',{x:31.5,y:3.1,z:11.95},4.4,'#6a3a20');

  for(const x of [-35,-14,15,36]){const trunk=cyl(scene,'treeTrunk',2,.28,{x,y:1,z:-8.5},mats.wood);trunk.checkCollisions=false;const crown=sphere(scene,'treeCrown',1.55,{x,y:2.45,z:-8.5},mats.plant);crown.scaling.y=1.18;}
  for(const x of [-28,-2,24,40])box(scene,'bollard',{x:.23,y:.63,z:.23},{x,y:.33,z:8.55},mats.metal,false);
  for(const x of [-12,3,27]){box(scene,'benchSeat',{x:2.15,y:.15,z:.48},{x,y:.54,z:-8.08},mats.wood,false);box(scene,'benchBack',{x:2.15,y:.68,z:.1},{x,y:.86,z:-8.31},mats.wood,false);}

  const lightPoles=[];for(let x=-36;x<=36;x+=12){for(const z of [-8.8,8.8]){const pole=cyl(scene,'pole',5,.16,{x,y:2.5,z},mats.metal);pole.checkCollisions=false;const lamp=sphere(scene,'lamp',.42,{x:x+(z>0?-.65:.65),y:4.72,z},mats.white);lamp.material.emissiveColor=B.Color3.Black();lightPoles.push(lamp);}}
  const trafficLight={carGreen:true};const signalPole=cyl(scene,'signalPole',4,.18,{x:WORLD.crossingX-2,y:2,z:-5.2},mats.metal);signalPole.checkCollisions=false;
  const carLamp=sphere(scene,'carLamp',.55,{x:WORLD.crossingX-2,y:3.7,z:-5.2},mats.red);const pedLamp=sphere(scene,'pedLamp',.42,{x:WORLD.crossingX-2,y:3,z:-5.2},mats.green);
  trafficLight.set=green=>{carLamp.material.emissiveColor=green?new B.Color3(.1,1,.12):new B.Color3(1,.08,.05);pedLamp.material.emissiveColor=green?new B.Color3(1,.08,.05):new B.Color3(.1,1,.12);};trafficLight.set(true);

  const player=createHuman(scene,'yassin',{x:WORLD.playerStart.x,y:WORLD.playerStart.y,z:WORLD.playerStart.z},{skin:mats.skin,top:mats.playerTop,jacket:mats.playerJacket,pants:mats.pants,shoes:mats.shoes,hair:mats.hair},{player:true,metadata:{kind:'player',name:'ياسين فؤاد'}});

  const npcTops=[mats.npcA,mats.npcB,mats.npcC],pedestrians=[];
  const starts=[-36,-29,-22,-14,-6,2,10,18,26,33,39,44];
  for(let i=0;i<12;i++){
    const laneZ=i%2?7:-7,dir=i%4<2?1:-1;
    const p=createHuman(scene,`npc-${i}`,{x:starts[i],y:1.02,z:laneZ},{skin:i%4===0?mats.skin2:mats.skin,top:npcTops[i%3],pants:mats.pants,shoes:mats.shoes,hair:mats.hair},{metadata:{kind:'npc',name:NPC_NAMES[i],homeZ:laneZ,pathMin:-43,pathMax:43,dir,cruise:.72+(i%4)*.08,currentSpeed:0,cooldown:0,pause:0,line:NPC_LINES[i%NPC_LINES.length],yaw:dir>0?Math.PI/2:-Math.PI/2}});
    p.rotation.y=p.metadata.yaw;pedestrians.push(p);
  }

  const glass=mats.window,traffic=[];
  for(let i=0;i<7;i++){
    const dir=i%2?1:-1,laneZ=dir>0?-1.9:1.9;
    const v=createCar(scene,`traffic-${i}`,{x:-44+i*14.5,y:.5,z:laneZ},i===2?mats.taxi:(i%3===0?mats.blue:mats.metal),glass,mats.rubber,{kind:'traffic',dir,cruise:4.1+(i%3)*.45,currentSpeed:0,laneZ});
    v.rotation.y=dir>0?Math.PI/2:-Math.PI/2;traffic.push(v);
  }
  const driveCar=createCar(scene,'playerCar',{x:-7,y:.5,z:-7},mats.taxi,glass,mats.rubber,{kind:'driveable',speed:0,heading:0,steer:0});

  const policeUnits=[];function ensurePoliceUnits(heat){while(policeUnits.length<Math.min(heat,2)){const idx=policeUnits.length;const pc=createCar(scene,`police-${idx}`,{x:idx?42:-42,y:.5,z:idx?-2:2},mats.police,glass,mats.rubber,{kind:'police',speed:4.7+idx,currentSpeed:0,heading:idx?Math.PI/2:-Math.PI/2},{police:true});policeUnits.push(pc);}}

  scene.onBeforeRenderObservable.add(()=>{const dt=Math.min(scene.getEngine().getDeltaTime()/1000,.05);animateHuman(player,dt);animateHuman(cashier,dt);for(const p of pedestrians)animateHuman(p,dt);});
  return {mats,ground,aptDoor,shopDoor,cashier,counter,player,pedestrians,traffic,driveCar,trafficLight,lightPoles,policeUnits,ensurePoliceUnits};
}

export function setDoorOpen(door,open){door.metadata.open=open;door.checkCollisions=!open;door.position.x=open?door.metadata.openPos.x:door.metadata.closedPos.x;door.position.z=open?door.metadata.openPos.z:door.metadata.closedPos.z;door.rotation.y=open?Math.PI/2:0;}

export function updatePedestrians(pedestrians,dt,player,showNpcLine){
  for(const p of pedestrians){
    const m=p.metadata;m.cooldown=Math.max(0,m.cooldown-dt);m.pause=Math.max(0,(m.pause||0)-dt);
    if(p.position.x>m.pathMax){m.dir=-1;}else if(p.position.x<m.pathMin){m.dir=1;}
    const targetSpeed=m.pause>0?0:m.cruise;m.currentSpeed=damp(m.currentSpeed,targetSpeed,4.2,dt);
    const step=m.dir*m.currentSpeed*dt;p.moveWithCollisions(new B.Vector3(step,0,0));
    const targetYaw=m.dir>0?Math.PI/2:-Math.PI/2;m.yaw=dampAngle(m.yaw,targetYaw,7,dt);p.rotation.y=m.yaw;
    const dist=Math.hypot(p.position.x-player.position.x,p.position.z-player.position.z);
    if(dist<1.0&&m.cooldown<=0){m.cooldown=4;m.pause=.65;m.dir*=-1;showNpcLine(m.name,m.line);}
  }
}

export function updateTraffic(traffic,dt,trafficSystem){
  for(const v of traffic){
    const m=v.metadata;let desired=m.cruise;
    const toward=(m.dir>0&&v.position.x<WORLD.crossingX)||(m.dir<0&&v.position.x>WORLD.crossingX);
    const distanceToLine=Math.abs(v.position.x-WORLD.crossingX);
    if(!trafficSystem.carGreen&&toward&&distanceToLine<10)desired=Math.min(desired,clamp((distanceToLine-2.1)*1.15,0,m.cruise));
    let nearest=999;
    for(const other of traffic){if(other===v||other.metadata.dir!==m.dir||Math.abs(other.position.z-v.position.z)>.3)continue;const delta=(other.position.x-v.position.x)*m.dir;if(delta>0)nearest=Math.min(nearest,delta);}
    if(nearest<6.2)desired=Math.min(desired,clamp((nearest-2.7)*1.15,0,m.cruise));
    m.currentSpeed=damp(m.currentSpeed,desired,2.7,dt);v.position.x+=m.dir*m.currentSpeed*dt;v.position.z=damp(v.position.z,m.laneZ,6,dt);
    if(v.position.x>52)v.position.x=-52;if(v.position.x<-52)v.position.x=52;
  }
}

export function updatePolice(world,policeSystem,dt){
  world.ensurePoliceUnits(policeSystem.heat);
  for(const p of world.policeUnits){
    if(!policeSystem.active){p.setEnabled(false);continue;}p.setEnabled(true);const t=policeSystem.lastKnown;if(!t)continue;
    const dx=t.x-p.position.x,dz=t.z-p.position.z,dist=Math.hypot(dx,dz);if(dist<=3)continue;
    const targetHeading=Math.atan2(dx,dz);p.metadata.heading=dampAngle(p.metadata.heading||p.rotation.y,targetHeading,3.2,dt);p.rotation.y=p.metadata.heading;
    p.metadata.currentSpeed=damp(p.metadata.currentSpeed||0,p.metadata.speed,2.4,dt);
    const dir=new B.Vector3(Math.sin(p.metadata.heading),0,Math.cos(p.metadata.heading));p.position.addInPlace(dir.scale(p.metadata.currentSpeed*dt));
  }
}
