const BUILD='v32-visual-motion-polish-1';
const B=window.BABYLON;
window.__SHWARE3_POLISH_BUILD=BUILD;
window.__SHWARE3_POLISH_READY=false;

const damp=(from,to,speed,dt)=>B.Scalar.Lerp(from,to,1-Math.exp(-speed*dt));
const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const dampAngle=(from,to,speed,dt)=>from+wrapAngle(to-from)*(1-Math.exp(-speed*dt));

function material(scene,name,color,{emissive=null,specular=.05}={}){
  const m=new B.StandardMaterial(name,scene);m.diffuseColor=B.Color3.FromHexString(color);m.specularColor=new B.Color3(specular,specular,specular);if(emissive)m.emissiveColor=B.Color3.FromHexString(emissive);return m;
}
function box(scene,name,size,pos,mat){const mesh=B.MeshBuilder.CreateBox(name,{width:size.x,height:size.y,depth:size.z},scene);mesh.position.set(pos.x,pos.y,pos.z);mesh.material=mat;mesh.checkCollisions=false;return mesh;}
function cylinder(scene,name,height,diameter,pos,mat){const mesh=B.MeshBuilder.CreateCylinder(name,{height,diameter,tessellation:12},scene);mesh.position.set(pos.x,pos.y,pos.z);mesh.material=mat;mesh.checkCollisions=false;return mesh;}
function sphere(scene,name,diameter,pos,mat){const mesh=B.MeshBuilder.CreateSphere(name,{diameter,segments:10},scene);mesh.position.set(pos.x,pos.y,pos.z);mesh.material=mat;mesh.checkCollisions=false;return mesh;}

function installHomePolish(scene){
  const homeWall=material(scene,'v32-home-wall','#ddd1c0'),homeAccent=material(scene,'v32-home-accent','#b57961'),homeCeiling=material(scene,'v32-home-ceiling','#f0e9df'),homeFacade=material(scene,'v32-home-facade','#c99a76'),homeTrim=material(scene,'v32-home-trim','#725746'),homeRug=material(scene,'v32-home-rug','#486b70'),homePlant=material(scene,'v32-home-plant','#456447'),homePot=material(scene,'v32-home-pot','#a06043'),brass=material(scene,'v32-home-brass','#b28a45',{specular:.2}),backsplash=material(scene,'v32-backsplash','#d7ded9',{specular:.12}),warmLight=material(scene,'v32-warm-light','#fff1c8',{emissive:'#b99755'});
  for(const name of ['apartment-left','apartment-right','apartment-solidWall','apartment-doorWallL','apartment-doorWallR']){const mesh=scene.getMeshByName(name);if(mesh)mesh.material=homeWall;}
  const roof=scene.getMeshByName('apartment-roof');if(roof)roof.material=homeCeiling;
  const facade=scene.getMeshByName('apartment-front-skin');if(facade)facade.material=homeFacade;
  const frameTop=scene.getMeshByName('door-frame-top');if(frameTop)frameTop.material=homeTrim;for(const mesh of scene.meshes.filter(m=>m.name==='door-frame-side'))mesh.material=homeTrim;
  const floor=scene.getMaterialByName('floor');if(floor){floor.diffuseColor=B.Color3.FromHexString('#b28b67');floor.specularColor=new B.Color3(.035,.035,.035);}
  const curtain=scene.getMaterialByName('curtain');if(curtain)curtain.diffuseColor=B.Color3.FromHexString('#9d6257');
  const sofa=scene.getMaterialByName('sofa');if(sofa)sofa.diffuseColor=B.Color3.FromHexString('#456e70');
  const wallBase=scene.getMaterialByName('wall');if(wallBase)wallBase.diffuseColor=B.Color3.FromHexString('#c49372');

  box(scene,'v32-living-rug',{x:4.7,y:.035,z:2.65},{x:-23.65,y:.095,z:-13.1},homeRug);
  box(scene,'v32-tv-panel',{x:2.65,y:1.65,z:.045},{x:-18.7,y:1.55,z:-13.23},homeAccent);
  box(scene,'v32-kitchen-backsplash',{x:5.05,y:.62,z:.045},{x:-20.8,y:1.34,z:-18.17},backsplash);
  box(scene,'v32-ceiling-panel',{x:5.4,y:.055,z:3.2},{x:-22.1,y:4.82,z:-14.0},homeCeiling);
  box(scene,'v32-ceiling-light-bar',{x:2.0,y:.07,z:.22},{x:-22.1,y:4.75,z:-14.0},warmLight);
  const pot=cylinder(scene,'v32-plant-pot',.42,.46,{x:-20.35,y:.28,z:-12.45},homePot);pot.scaling.y=.8;
  for(const [dx,dy,dz,s] of [[0,.58,0,.62],[-.22,.52,.05,.46],[.2,.48,-.06,.42],[.05,.76,.04,.4]]){const leaf=sphere(scene,'v32-plant-leaf',s,{x:-20.35+dx,y:.28+dy,z:-12.45+dz},homePlant);leaf.scaling.y=1.35;}
  cylinder(scene,'v32-floor-lamp-stem',1.55,.055,{x:-27.55,y:.82,z:-12.9},brass);
  const shade=B.MeshBuilder.CreateCylinder('v32-floor-lamp-shade',{height:.35,diameterTop:.34,diameterBottom:.7,tessellation:12},scene);shade.position.set(-27.55,1.72,-12.9);shade.material=warmLight;
  if(scene.imageProcessingConfiguration){scene.imageProcessingConfiguration.exposure=1.09;scene.imageProcessingConfiguration.contrast=1.04;}
}

function installOcclusion(scene,player,camera){
  const blockers=new Set(['apartment-left','apartment-right','apartment-solidWall','apartment-doorWallL','apartment-doorWallR','apartment-roof','apartment-front-skin']);
  const state={faded:new Set(),lastBlocker:null};camera.checkCollisions=true;if('collisionRadius' in camera)camera.collisionRadius=new B.Vector3(.3,.3,.3);
  function update(dt){
    const inside=player.position.x>-29&&player.position.x<-15&&player.position.z>-19.6&&player.position.z<-10.1;
    const origin=camera.globalPosition?.clone?.()||camera.position.clone(),target=player.getAbsolutePosition?.()||player.position,delta=target.subtract(origin),distance=delta.length();let hit=null;
    if(distance>.1){const ray=new B.Ray(origin,delta.scale(1/distance),Math.max(.1,distance-.16));const pick=scene.pickWithRay(ray,m=>blockers.has(m.name));if(pick?.hit&&pick.pickedMesh)hit=pick.pickedMesh;}
    state.lastBlocker=hit?.name||null;
    for(const name of blockers){const mesh=scene.getMeshByName(name);if(!mesh)continue;const shouldFade=mesh===hit||(inside&&name==='apartment-roof');const targetVisibility=shouldFade?.07:1;mesh.visibility=damp(mesh.visibility??1,targetVisibility,shouldFade?14:7,dt);if(shouldFade)state.faded.add(name);else if(mesh.visibility>.95)state.faded.delete(name);}
  }
  return {state,update};
}

function installPedestrians(scene){
  const npcs=[];for(let i=0;i<12;i++){const p=scene.getMeshByName(`npc-${i}-collider`);if(!p)continue;const m=p.metadata;m._v32BaseZ=p.position.z;m._v32Phase=i*1.731;m._v32BaseCruise=m.cruise;m._v32LastDir=m.dir;npcs.push(p);}let t=0;
  function update(dt){t+=dt;for(let i=0;i<npcs.length;i++){const p=npcs[i],m=p.metadata;if(m.dir!==m._v32LastDir){m.pause=Math.max(m.pause||0,.42+(i%4)*.08);m._v32LastDir=m.dir;}m.cruise=m._v32BaseCruise*(.94+.06*Math.sin(t*.42+m._v32Phase));const lateral=.26*Math.sin(t*.31+m._v32Phase),lateralVelocity=.26*.31*Math.cos(t*.31+m._v32Phase);p.position.z=damp(p.position.z,m._v32BaseZ+lateral,1.8,dt);const forward=m.dir*(m.currentSpeed||0);if(Math.abs(forward)>.04){const targetYaw=Math.atan2(forward,lateralVelocity);m.yaw=dampAngle(m.yaw,targetYaw,4.2,dt);p.rotation.y=m.yaw;}}}
  return {npcs,update};
}

function installWheels(scene){
  let totalMotion=0;
  function update(dt){for(const wheel of scene.meshes){if(!wheel.name.includes('-wheel')||!wheel.parent)continue;const m=wheel.parent.metadata||{};let speed=Number.isFinite(m.currentSpeed)?m.currentSpeed:(Number.isFinite(m.speed)?m.speed:0);if(m.dir)speed*=m.dir;const spin=speed*dt/.28;wheel.rotation.y=(wheel.rotation.y||0)+spin;totalMotion+=Math.abs(spin);}}
  return {update,getTotal:()=>totalMotion};
}

async function waitForGame(){for(let i=0;i<600;i++){const scene=B?.Engine?.LastCreatedEngine?.scenes?.[0];if(window.__SHWARE3_READY&&scene?.activeCamera&&scene.getMeshByName('yassin-collider'))return scene;await new Promise(r=>setTimeout(r,50));}throw new Error('V3.2 polish timed out waiting for game scene');}

(async()=>{try{const scene=await waitForGame(),player=scene.getMeshByName('yassin-collider'),camera=scene.activeCamera;installHomePolish(scene);const occlusion=installOcclusion(scene,player,camera),pedestrians=installPedestrians(scene),wheels=installWheels(scene);const state={build:BUILD,occlusionEnabled:true,lastBlocker:null,fadedBlockers:[],npcCount:pedestrians.npcs.length,wheelMotion:0};scene.onBeforeRenderObservable.add(()=>{const dt=Math.min(scene.getEngine().getDeltaTime()/1000,.05);pedestrians.update(dt);wheels.update(dt);occlusion.update(dt);state.lastBlocker=occlusion.state.lastBlocker;state.fadedBlockers=[...occlusion.state.faded];state.wheelMotion=wheels.getTotal();});window.__SHWARE3_POLISH_STATE=state;window.__SHWARE3_POLISH_READY=true;}catch(error){window.__SHWARE3_POLISH_ERROR=error?.message||String(error);console.error('Shaware3 V3.2 polish failed',error);}})();
