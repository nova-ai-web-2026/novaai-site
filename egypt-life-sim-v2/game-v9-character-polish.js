(() => {
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  const findNode=(scene,name)=>scene.transformNodes.find(n=>n.name===name);
  const findMesh=(scene,name)=>scene.meshes.find(m=>m.name===name);
  const hide=(scene,name)=>{const m=findMesh(scene,name);if(m)m.setEnabled(false);return m;};

  function capsule(scene,name,height,radius,parent,y,material,sx=1,sy=1,sz=1){
    const m=BABYLON.MeshBuilder.CreateCapsule(name,{height,radius,tessellation:16,subdivisions:3},scene);
    m.parent=parent;m.position.y=y;m.scaling.set(sx,sy,sz);m.material=material;m.isPickable=false;m.checkCollisions=false;return m;
  }
  function sphere(scene,name,diameter,parent,x,y,z,material,sx=1,sy=1,sz=1){
    const m=BABYLON.MeshBuilder.CreateSphere(name,{diameter,segments:16},scene);
    m.parent=parent;m.position.set(x,y,z);m.scaling.set(sx,sy,sz);m.material=material;m.isPickable=false;m.checkCollisions=false;return m;
  }
  function box(scene,name,w,h,d,parent,x,y,z,material){
    const m=BABYLON.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);
    m.parent=parent;m.position.set(x,y,z);m.material=material;m.isPickable=false;m.checkCollisions=false;return m;
  }

  async function boot(){
    for(let wait=0;wait<220;wait++){
      const scene=window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0];
      if(scene&&window.__V9_PATCH?.version===9&&window.__V9_GAITFIX?.naturalAnkleRange){
        let capsuleCount=0;
        const rigs=[];
        for(let i=0;i<28;i++){
          const visual=findNode(scene,`v9_personVisual_${i}`),pelvis=findNode(scene,`v9_pelvis_${i}`),spine=findNode(scene,`v9_spine_${i}`);
          const hipL=findNode(scene,`v9_hipL_${i}`),hipR=findNode(scene,`v9_hipR_${i}`),kneeL=findNode(scene,`v9_kneeL_${i}`),kneeR=findNode(scene,`v9_kneeR_${i}`),ankleL=findNode(scene,`v9_ankleL_${i}`),ankleR=findNode(scene,`v9_ankleR_${i}`);
          const shL=findNode(scene,`v9_shoulderL_${i}`),shR=findNode(scene,`v9_shoulderR_${i}`),elL=findNode(scene,`v9_elbowL_${i}`),elR=findNode(scene,`v9_elbowR_${i}`);
          if(!visual||!pelvis||!spine||!hipL||!hipR||!kneeL||!kneeR||!ankleL||!ankleR||!shL||!shR||!elL||!elR)throw new Error(`Missing V9 rig ${i}`);

          const torsoOld=findMesh(scene,`v9_torso_${i}`),pelvisOld=findMesh(scene,`v9_pelvisMesh_${i}`),shirt=torsoOld?.material,pant=pelvisOld?.material;
          const thighOld=findMesh(scene,`v9_thighL_${i}`),calfOld=findMesh(scene,`v9_calfL_${i}`),armOld=findMesh(scene,`v9_upperArmL_${i}`),foreOld=findMesh(scene,`v9_foreArmL_${i}`);
          const shoe=findMesh(scene,`v9_footL_${i}`)?.material,skin=findMesh(scene,`v9_handL_${i}`)?.material;
          if(!shirt||!pant||!thighOld||!calfOld||!armOld||!foreOld||!shoe||!skin)throw new Error(`Missing V9 materials ${i}`);

          ['v9_torso_','v9_chestBlend_','v9_pelvisMesh_','v9_waist_','v9_thighL_','v9_thighR_','v9_calfL_','v9_calfR_','v9_ankleMeshL_','v9_ankleMeshR_','v9_upperArmL_','v9_upperArmR_','v9_foreArmL_','v9_foreArmR_','v9_hipJointL_','v9_hipJointR_','v9_kneeJointL_','v9_kneeJointR_','v9_ankleJointL_','v9_ankleJointR_','v9_shoulderJointL_','v9_shoulderJointR_','v9_elbowJointL_','v9_elbowJointR_'].forEach(p=>hide(scene,p+i));

          capsule(scene,`v9p_torso_${i}`,.74,.255,spine,.35,shirt,1.08,1,.78);capsuleCount++;
          capsule(scene,`v9p_pelvis_${i}`,.34,.23,pelvis,.02,pant,1.08,1,.88);capsuleCount++;
          capsule(scene,`v9p_waist_${i}`,.24,.205,pelvis,.18,shirt,1.04,1,.82);capsuleCount++;

          const leg=(label,hip,knee,ankle)=>{
            capsule(scene,`v9p_thigh${label}_${i}`,.48,.102,hip,-.22,pant,1.08,1,.98);capsuleCount++;
            sphere(scene,`v9p_knee${label}_${i}`,.19,knee,0,0,0,pant,.96,.82,.96);
            capsule(scene,`v9p_calf${label}_${i}`,.46,.088,knee,-.21,pant,1.06,1,.98);capsuleCount++;
            capsule(scene,`v9p_ankle${label}_${i}`,.16,.067,ankle,-.045,pant,1,1,.96);capsuleCount++;
            const foot=findMesh(scene,`v9_foot${label}_${i}`),toe=findMesh(scene,`v9_toe${label}_${i}`);if(foot){foot.scaling.x=1.08;foot.scaling.z=1.08;}if(toe){toe.scaling.x*=1.06;toe.scaling.z*=1.04;}
          };
          leg('L',hipL,kneeL,ankleL);leg('R',hipR,kneeR,ankleR);

          const arm=(label,shoulder,elbow)=>{
            sphere(scene,`v9p_shoulder${label}_${i}`,.18,shoulder,0,0,0,shirt,.94,.9,.94);
            capsule(scene,`v9p_upperArm${label}_${i}`,.4,.077,shoulder,-.18,shirt,1.05,1,.98);capsuleCount++;
            sphere(scene,`v9p_elbow${label}_${i}`,.135,elbow,0,0,0,skin,.9,.78,.9);
            capsule(scene,`v9p_foreArm${label}_${i}`,.36,.066,elbow,-.17,skin,1.04,1,.97);capsuleCount++;
          };
          arm('L',shL,elL);arm('R',shR,elR);

          const head=findMesh(scene,`v9_head_${i}`),hair=findMesh(scene,`v9_hair_${i}`);if(head){head.scaling.x*=.96;head.scaling.y*=1.02;head.scaling.z*=.96;}if(hair){hair.scaling.x*=.98;hair.scaling.z*=.98;}
          shL.position.x=-.305;shR.position.x=.305;
          rigs.push({pelvis,spine,hipL,hipR,shL,shR});
        }

        scene.onBeforeRenderObservable.add(()=>{
          for(const r of rigs){
            const stride=r.hipL.rotation.x-r.hipR.rotation.x;
            r.pelvis.rotation.y=stride*.045;
            r.spine.rotation.y=-stride*.03;
            r.spine.rotation.z=stride*.008;
            r.shL.rotation.z=-.035-r.hipR.rotation.x*.018;
            r.shR.rotation.z=.035+r.hipL.rotation.x*.018;
          }
        });

        window.__V9_POLISH={version:1,capsuleCount,rigs:rigs.length,silhouette:'capsule-human',bodyTwist:true};
        if(window.__egyptDebug)window.__egyptDebug.v9PolishState=()=>({...window.__V9_POLISH});
        return;
      }
      await sleep(50);
    }
    throw new Error('V9 rig/gait fix not ready for character polish');
  }

  boot().catch(err=>{
    console.error('V9 character polish failed',err);
    const box=document.getElementById('errorBox');if(box){box.style.display='block';box.textContent='V9 character polish failed: '+err.message;}
  });
})();