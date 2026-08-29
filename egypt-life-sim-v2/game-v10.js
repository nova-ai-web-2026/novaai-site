(() => {
  'use strict';

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>t*t*(3-2*t);
  const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));

  const findNode=(scene,name)=>scene.transformNodes.find(n=>n.name===name);
  const findMesh=(scene,name)=>scene.meshes.find(m=>m.name===name);

  function roundedShoe(scene,name,parent,material){
    const shoe=BABYLON.MeshBuilder.CreateCapsule(name,{height:.34,radius:.086,tessellation:18,subdivisions:4},scene);
    shoe.parent=parent;
    shoe.position.set(0,-.085,-.075);
    shoe.rotation.x=Math.PI/2;
    shoe.scaling.set(1.05,1,.92);
    shoe.material=material;
    shoe.isPickable=false;
    shoe.checkCollisions=false;
    return shoe;
  }

  function legPose(t,amp){
    t=((t%1)+1)%1;
    let hip=0,knee=0,ankle=0,foot=0;
    if(t<.60){
      const u=smooth(t/.60);
      const toe=smooth(clamp((u-.72)/.28,0,1));
      hip=lerp(.285,-.235,u);
      knee=.035+.06*Math.sin(Math.PI*u)+toe*.035;
      ankle=lerp(-.075,.055,u)+toe*.145;
      foot=lerp(.085,-.025,u)-toe*.07;
    }else{
      const u=smooth((t-.60)/.40);
      hip=lerp(-.235,.285,u);
      knee=.10+.43*Math.sin(Math.PI*u);
      ankle=lerp(.095,-.07,u)-.035*Math.sin(Math.PI*u);
      foot=lerp(-.06,.075,u)+.025*Math.sin(Math.PI*u);
    }
    return {
      hip:hip*amp,
      knee:knee*amp,
      ankle:clamp(ankle*amp,-.34,.34),
      foot:clamp(foot*amp,-.13,.13)
    };
  }

  async function boot(){
    for(let wait=0;wait<240;wait++){
      const scene=window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0];
      if(scene&&window.__V9_PATCH?.version===9&&window.__V9_GAITFIX?.naturalAnkleRange&&window.__V9_POLISH?.silhouette==='capsule-human'&&window.__V9_FACADES?.blankSidesFilled){
        const roots=scene.transformNodes.filter(n=>n.name==='personRoot');
        if(roots.length!==28)throw new Error(`Expected 28 pedestrian roots, got ${roots.length}`);
        const rigs=[];
        let shoes=0;

        for(let i=0;i<28;i++){
          const root=roots[i];
          const visual=findNode(scene,`v9_personVisual_${i}`),pelvis=findNode(scene,`v9_pelvis_${i}`),spine=findNode(scene,`v9_spine_${i}`);
          const hipL=findNode(scene,`v9_hipL_${i}`),hipR=findNode(scene,`v9_hipR_${i}`),kneeL=findNode(scene,`v9_kneeL_${i}`),kneeR=findNode(scene,`v9_kneeR_${i}`),ankleL=findNode(scene,`v9_ankleL_${i}`),ankleR=findNode(scene,`v9_ankleR_${i}`);
          const shL=findNode(scene,`v9_shoulderL_${i}`),shR=findNode(scene,`v9_shoulderR_${i}`),elL=findNode(scene,`v9_elbowL_${i}`),elR=findNode(scene,`v9_elbowR_${i}`);
          const oldFootL=findMesh(scene,`v9_footL_${i}`),oldFootR=findMesh(scene,`v9_footR_${i}`),toeL=findMesh(scene,`v9_toeL_${i}`),toeR=findMesh(scene,`v9_toeR_${i}`);
          if(!visual||!pelvis||!spine||!hipL||!hipR||!kneeL||!kneeR||!ankleL||!ankleR||!shL||!shR||!elL||!elR||!oldFootL||!oldFootR)throw new Error(`Incomplete V9 rig ${i}`);
          const shoeMat=oldFootL.material;
          oldFootL.setEnabled(false);oldFootR.setEnabled(false);if(toeL)toeL.setEnabled(false);if(toeR)toeR.setEnabled(false);
          const shoeL=roundedShoe(scene,`v10_shoeL_${i}`,ankleL,shoeMat),shoeR=roundedShoe(scene,`v10_shoeR_${i}`,ankleR,shoeMat);shoes+=2;
          const strideMeters=1.34+(i%5)*.035;
          rigs.push({root,visual,pelvis,spine,hipL,hipR,kneeL,kneeR,ankleL,ankleR,shL,shR,elL,elR,shoeL,shoeR,strideMeters,phase:(i*.173)%1,lastX:root.position.x,lastZ:root.position.z,lastYaw:root.rotation.y,blend:0,turnBlend:0});
        }

        scene.onBeforeRenderObservable.add(()=>{
          const dt=clamp(scene.getEngine().getDeltaTime()/1000,.001,.05);
          for(const r of rigs){
            const dx=r.root.position.x-r.lastX,dz=r.root.position.z-r.lastZ,move=Math.hypot(dx,dz);
            const yawDelta=Math.abs(wrap(r.root.rotation.y-r.lastYaw));
            const moving=move>.00045;
            if(moving)r.phase=(r.phase+move/r.strideMeters)%1;
            r.blend=lerp(r.blend,moving?1:0,Math.min(1,dt*(moving?13:7)));
            r.turnBlend=lerp(r.turnBlend,yawDelta>.012?.58:1,Math.min(1,dt*9));
            const amp=r.blend*r.turnBlend;
            const L=legPose(r.phase,amp),R=legPose(r.phase+.5,amp);

            r.hipL.rotation.x=L.hip;r.kneeL.rotation.x=L.knee;r.ankleL.rotation.x=L.ankle;r.shoeL.rotation.x=Math.PI/2+L.foot;
            r.hipR.rotation.x=R.hip;r.kneeR.rotation.x=R.knee;r.ankleR.rotation.x=R.ankle;r.shoeR.rotation.x=Math.PI/2+R.foot;

            const wave=Math.sin(r.phase*Math.PI*2),counter=Math.sin((r.phase+.25)*Math.PI*2);
            r.pelvis.position.y=.82+Math.abs(counter)*.006*amp;
            r.pelvis.rotation.z=wave*.0075*amp;
            r.pelvis.rotation.y=(L.hip-R.hip)*.032;
            r.spine.rotation.y=-(L.hip-R.hip)*.024;
            r.spine.rotation.z=-wave*.0045*amp;
            r.shL.rotation.x=-R.hip*.48;r.shR.rotation.x=-L.hip*.48;
            r.elL.rotation.x=.10+Math.max(0,-r.shL.rotation.x)*.19;
            r.elR.rotation.x=.10+Math.max(0,-r.shR.rotation.x)*.19;

            r.lastX=r.root.position.x;r.lastZ=r.root.position.z;r.lastYaw=r.root.rotation.y;
          }
        });

        const kicker=document.querySelector('.kicker');if(kicker)kicker.textContent='HAYAT MASR • V10';
        window.__V10_PATCH={version:10,rigs:rigs.length,shoes,gait:'heel-strike-stance-toe-off-swing',phaseDrivenByDistance:true,ankleLimit:.34,turnStrideReduction:true,roundedFootwear:true,strideMeters:[1.34,1.48]};
        if(window.__egyptDebug)window.__egyptDebug.v10State=()=>({...window.__V10_PATCH});
        return;
      }
      await sleep(50);
    }
    throw new Error('V9 layers did not finish before V10');
  }

  boot().catch(err=>{
    console.error('V10 gait/visual layer failed',err);
    const box=document.getElementById('errorBox');if(box){box.style.display='block';box.textContent='V10 gait/visual layer failed: '+err.message;}
  });
})();