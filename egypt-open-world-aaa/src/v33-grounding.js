const B=window.BABYLON;
const BUILD='v33-ground-contact-1';
const FOOT_ROOT_OFFSET=1.05;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const damp=(from,to,speed,dt)=>B.Scalar.Lerp(from,to,1-Math.exp(-speed*dt));

function surfaceHeightAt(x,z){
  if(x>=-28.65&&x<=-15.35&&z>=-19.15&&z<=-10.85)return .06;
  const az=Math.abs(z);
  if(Math.abs(az-4.45)<=.13)return .34;
  if(az>=4.4&&az<=8.8)return .24;
  if(az<4.5)return .08;
  return 0;
}

function soleMinY(scene,name){
  let min=Infinity;
  for(const side of ['L','R']){
    const shoe=scene.getMeshByName(`${name}-shoe${side}`);
    if(!shoe)continue;
    shoe.computeWorldMatrix(true);
    const y=shoe.getBoundingInfo()?.boundingBox?.minimumWorld?.y;
    if(Number.isFinite(y))min=Math.min(min,y);
  }
  return Number.isFinite(min)?min:null;
}

function characterEntry(scene,name){
  const root=scene.getMeshByName(`${name}-collider`);
  return root?{name,root}:null;
}

function install(scene){
  const names=['yassin','cashier',...Array.from({length:12},(_,i)=>`npc-${i}`)];
  const characters=names.map(name=>characterEntry(scene,name)).filter(Boolean);
  const state={build:BUILD,enabled:true,groundedCount:characters.length,playerSurface:0,playerContactError:null,maxContactError:0,lastSolve:0};
  let frame=0;

  scene.onBeforeRenderObservable.add(()=>{
    const dt=Math.min(scene.getEngine().getDeltaTime()/1000,.05);
    frame++;
    let maxError=0;
    for(const entry of characters){
      const {name,root}=entry;
      if(!root.isEnabled())continue;
      const surface=surfaceHeightAt(root.position.x,root.position.z);
      const rig=scene.getTransformNodeByName(`${name}-rig`);
      const bob=rig?.position?.y||0;
      const target=surface+FOOT_ROOT_OFFSET-bob;
      const speed=name==='yassin'?22:14;
      root.position.y=damp(root.position.y,target,speed,dt);

      const exact=name==='yassin'||frame%2===0;
      if(exact){
        const minY=soleMinY(scene,name);
        if(minY!==null){
          const correction=clamp(surface-minY,-.055,.075);
          root.position.y+=correction*.92;
          const after=soleMinY(scene,name);
          if(after!==null){
            const err=Math.abs(after-surface);
            maxError=Math.max(maxError,err);
            if(name==='yassin')state.playerContactError=after-surface;
          }
        }
      }
      if(name==='yassin')state.playerSurface=surface;
    }
    state.maxContactError=maxError;
    state.lastSolve=performance.now();
  });

  window.__SHWARE3_GROUNDING_STATE=state;
  window.__SHWARE3_GROUNDING_BUILD=BUILD;
  window.__SHWARE3_GROUNDING_READY=true;
}

function waitForScene(){
  const engine=B?.Engine?.LastCreatedEngine;
  const scene=engine?.scenes?.[0];
  if(scene?.getMeshByName('yassin-collider')&&scene?.getMeshByName('yassin-shoeL')){install(scene);return;}
  setTimeout(waitForScene,50);
}
waitForScene();
