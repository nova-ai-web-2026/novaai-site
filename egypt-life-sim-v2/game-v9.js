(() => {
  'use strict';

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>t*t*(3-2*t);
  const fail=(msg,err)=>{
    console.error(msg,err||'');
    const box=document.getElementById('errorBox');
    if(box){box.style.display='block';box.textContent=msg+(err?.message?': '+err.message:'');}
  };

  async function waitForV8(){
    for(let i=0;i<200;i++){
      const scene=window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0];
      if(scene&&window.__V8_PATCH?.version===8&&window.__V8_LAYOUT?.facadeAnchored)return scene;
      await sleep(50);
    }
    throw new Error('V8 scene did not finish before V9');
  }

  function makeMat(scene,name,hex,alpha=1){
    const m=new BABYLON.StandardMaterial(name,scene);
    m.diffuseColor=BABYLON.Color3.FromHexString(hex);
    m.specularColor=new BABYLON.Color3(.035,.035,.035);
    m.alpha=alpha;
    return m;
  }

  function cylinder(scene,name,height,diameter,parent,y,material,diameterTop=diameter,diameterBottom=diameter){
    const mesh=BABYLON.MeshBuilder.CreateCylinder(name,{height,diameterTop,diameterBottom,tessellation:14},scene);
    mesh.parent=parent;mesh.position.y=y;mesh.material=material;mesh.checkCollisions=false;mesh.isPickable=false;
    return mesh;
  }

  function sphere(scene,name,diameter,parent,x,y,z,material,sx=1,sy=1,sz=1){
    const mesh=BABYLON.MeshBuilder.CreateSphere(name,{diameter,segments:14},scene);
    mesh.parent=parent;mesh.position.set(x,y,z);mesh.scaling.set(sx,sy,sz);mesh.material=material;mesh.checkCollisions=false;mesh.isPickable=false;
    return mesh;
  }

  function box(scene,name,w,h,d,parent,x,y,z,material){
    const mesh=BABYLON.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);
    mesh.parent=parent;mesh.position.set(x,y,z);mesh.material=material;mesh.checkCollisions=false;mesh.isPickable=false;
    return mesh;
  }

  function makeRig(scene,root,i){
    const oldVisual=scene.transformNodes.find(n=>n.name==='personVisual'&&n.parent===root);
    if(oldVisual)oldVisual.setEnabled(false);

    const visual=new BABYLON.TransformNode('v9_personVisual_'+i,scene);
    visual.parent=root;
    visual.position.y=.15;
    // The simulation's root treats +Z as forward. V9 geometry was authored facing -Z,
    // so rotate the complete visible body once instead of making pedestrians look backwards.
    visual.rotation.y=Math.PI;

    const shade=i%4;
    const skin=makeMat(scene,'v9_skin_'+i,['#a97758','#b98261','#8f634b','#c08b68'][shade]);
    const shirts=['#53666c','#6c5549','#4f6358','#655969','#6e664d','#4c585f'];
    const pants=['#34383a','#3d3b38','#30373b','#38363e'];
    const shirt=makeMat(scene,'v9_shirt_'+i,shirts[i%shirts.length]);
    const pant=makeMat(scene,'v9_pants_'+i,pants[i%pants.length]);
    const shoe=makeMat(scene,'v9_shoe_'+i,i%3===0?'#2f2925':'#252525');
    const hair=makeMat(scene,'v9_hair_'+i,['#282320','#30261f','#1f1d1b'][i%3]);
    const eye=makeMat(scene,'v9_eye_'+i,'#24201e');

    const bodyScale=.96+(i%5)*.014;
    visual.scaling.setAll(bodyScale);

    const pelvis=new BABYLON.TransformNode('v9_pelvis_'+i,scene);pelvis.parent=visual;pelvis.position.y=.82;
    cylinder(scene,'v9_pelvisMesh_'+i,.28,.49,pelvis,0,pant,.44,.5);
    cylinder(scene,'v9_waist_'+i,.18,.43,pelvis,.17,shirt,.46,.41);

    const spine=new BABYLON.TransformNode('v9_spine_'+i,scene);spine.parent=pelvis;spine.position.y=.22;
    cylinder(scene,'v9_torso_'+i,.66,.54,spine,.34,shirt,.58,.45);
    sphere(scene,'v9_chestBlend_'+i,.5,spine,0,.56,0,shirt,1.04,.55,.74);
    cylinder(scene,'v9_neck_'+i,.14,.16,spine,.76,skin);
    sphere(scene,'v9_head_'+i,.43,spine,0,.98,0,skin,.94,1.03,.92);
    sphere(scene,'v9_hair_'+i,.44,spine,0,1.095,.015,hair,.95,.42,.93);
    sphere(scene,'v9_nose_'+i,.075,spine,0,.98,-.205,skin,.8,1,1.1);
    sphere(scene,'v9_eyeL_'+i,.034,spine,-.073,1.015,-.197,eye,.8,.65,.45);
    sphere(scene,'v9_eyeR_'+i,.034,spine,.073,1.015,-.197,eye,.8,.65,.45);
    sphere(scene,'v9_earL_'+i,.09,spine,-.205,.99,0,skin,.45,.9,.6);
    sphere(scene,'v9_earR_'+i,.09,spine,.205,.99,0,skin,.45,.9,.6);

    function makeLeg(side,label){
      const hip=new BABYLON.TransformNode('v9_hip'+label+'_'+i,scene);hip.parent=pelvis;hip.position.set(side*.145,-.04,0);
      sphere(scene,'v9_hipJoint'+label+'_'+i,.205,hip,0,-.02,0,pant,.88,.92,.88);
      cylinder(scene,'v9_thigh'+label+'_'+i,.43,.205,hip,-.215,pant,.19,.215);
      const knee=new BABYLON.TransformNode('v9_knee'+label+'_'+i,scene);knee.parent=hip;knee.position.y=-.43;
      sphere(scene,'v9_kneeJoint'+label+'_'+i,.19,knee,0,0,0,pant,.9,.82,.9);
      cylinder(scene,'v9_calf'+label+'_'+i,.41,.175,knee,-.205,pant,.16,.185);
      const ankle=new BABYLON.TransformNode('v9_ankle'+label+'_'+i,scene);ankle.parent=knee;ankle.position.y=-.41;
      sphere(scene,'v9_ankleJoint'+label+'_'+i,.15,ankle,0,-.015,0,pant,.86,.82,.86);
      cylinder(scene,'v9_ankleMesh'+label+'_'+i,.09,.145,ankle,-.04,pant,.13,.155);
      const foot=box(scene,'v9_foot'+label+'_'+i,.215,.105,.32,ankle,0,-.09,-.065,shoe);
      sphere(scene,'v9_toe'+label+'_'+i,.205,ankle,0,-.085,-.19,shoe,1.02,.5,1.13);
      return {hip,knee,ankle,foot};
    }

    function makeArm(side,label){
      const shoulder=new BABYLON.TransformNode('v9_shoulder'+label+'_'+i,scene);shoulder.parent=spine;shoulder.position.set(side*.31,.61,0);
      sphere(scene,'v9_shoulderJoint'+label+'_'+i,.205,shoulder,0,0,0,shirt,.88,.92,.88);
      cylinder(scene,'v9_upperArm'+label+'_'+i,.36,.155,shoulder,-.18,shirt,.145,.17);
      const elbow=new BABYLON.TransformNode('v9_elbow'+label+'_'+i,scene);elbow.parent=shoulder;elbow.position.y=-.36;
      sphere(scene,'v9_elbowJoint'+label+'_'+i,.145,elbow,0,0,0,skin,.9,.82,.9);
      cylinder(scene,'v9_foreArm'+label+'_'+i,.32,.135,elbow,-.16,skin,.12,.145);
      sphere(scene,'v9_hand'+label+'_'+i,.16,elbow,0,-.34,0,skin,.82,1.08,.78);
      return {shoulder,elbow};
    }

    const L=makeLeg(-1,'L'),R=makeLeg(1,'R'),AL=makeArm(-1,'L'),AR=makeArm(1,'R');

    const shadowMat=makeMat(scene,'v9_shadowMat_'+i,'#151310',.15);shadowMat.disableLighting=true;
    const shadow=BABYLON.MeshBuilder.CreateDisc('v9_contactShadow_'+i,{radius:.36,tessellation:24},scene);
    shadow.parent=root;shadow.rotation.x=Math.PI/2;shadow.position.y=.012;shadow.scaling.y=.58;shadow.material=shadowMat;shadow.isPickable=false;shadow.checkCollisions=false;

    return {root,oldVisual,visual,pelvis,spine,L,R,AL,AR,phase:(i*.37)%1,lastX:root.position.x,lastZ:root.position.z,lastSpeed:0,strideBlend:0,index:i};
  }

  function poseLeg(rig,t,stride){
    t=((t%1)+1)%1;
    let hip,knee,ankle;
    if(t<.62){
      const u=smooth(t/.62);
      hip=lerp(.34,-.28,u);
      knee=.035+.07*Math.sin(Math.PI*u);
      const heelLift=clamp((u-.8)/.2,0,1)*.12;
      ankle=-(hip+knee*.78)+heelLift;
    }else{
      const u=smooth((t-.62)/.38);
      hip=lerp(-.28,.34,u);
      knee=.12+.54*Math.sin(Math.PI*u);
      ankle=-(hip+knee*.62)-.08*Math.sin(Math.PI*u);
    }
    rig.hip.rotation.x=hip*stride;
    rig.knee.rotation.x=knee*stride;
    rig.ankle.rotation.x=ankle*stride;
    return {hip:hip*stride,knee:knee*stride,ankle:ankle*stride};
  }

  function tuneScene(scene){
    const ipc=scene.imageProcessingConfiguration;
    ipc.exposure=.93;ipc.contrast=1.08;ipc.saturation=.76;ipc.toneMappingEnabled=true;
    scene.fogMode=BABYLON.Scene.FOGMODE_EXP2;scene.fogDensity=.00175;scene.fogColor=new BABYLON.Color3(.68,.64,.56);
    scene.ambientColor=new BABYLON.Color3(.16,.15,.13);

    for(const light of scene.lights){
      if(light instanceof BABYLON.HemisphericLight)light.intensity=Math.min(light.intensity,.64);
    }
    if(!scene.lights.some(l=>l.name==='v9_sun')){
      const sun=new BABYLON.DirectionalLight('v9_sun',new BABYLON.Vector3(-.45,-1,.28),scene);
      sun.diffuse=new BABYLON.Color3(1,.87,.68);sun.specular=new BABYLON.Color3(.2,.18,.15);sun.intensity=.72;
    }

    const sand=new BABYLON.Color3(.58,.51,.43);
    const touched=new Set();
    for(const mesh of scene.meshes){
      const m=mesh.material;
      if(!m||touched.has(m)||!(m instanceof BABYLON.StandardMaterial))continue;
      if(mesh.name==='building'||mesh.name.startsWith('wall')||mesh.name.startsWith('v8_')){
        if(m.diffuseColor)m.diffuseColor=BABYLON.Color3.Lerp(m.diffuseColor,sand,mesh.name==='building'?.22:.07);
        m.specularColor=new BABYLON.Color3(.02,.02,.02);
        touched.add(m);
      }
    }
  }

  async function boot(){
    try{
      const scene=await waitForV8();
      tuneScene(scene);
      const roots=scene.transformNodes.filter(n=>n.name==='personRoot');
      if(roots.length!==28)throw new Error('Expected 28 pedestrian roots, got '+roots.length);
      const rigs=roots.map((r,i)=>makeRig(scene,r,i));

      scene.onBeforeRenderObservable.add(()=>{
        const dt=Math.max(.001,scene.getEngine().getDeltaTime()/1000);
        for(const r of rigs){
          const dx=r.root.position.x-r.lastX,dz=r.root.position.z-r.lastZ,move=Math.hypot(dx,dz);
          const speed=move/dt;
          r.lastSpeed=lerp(r.lastSpeed,speed,Math.min(1,dt*8));
          const moving=move>.0005;
          if(moving)r.phase=(r.phase+move/1.42)%1;
          const targetStride=moving?1:0;
          r.strideBlend=lerp(r.strideBlend,targetStride,Math.min(1,dt*(moving?18:9)));
          const stride=r.strideBlend;
          const lp=poseLeg(r.L,r.phase,stride),rp=poseLeg(r.R,r.phase+.5,stride);
          r.AL.shoulder.rotation.x=-rp.hip*.58;r.AR.shoulder.rotation.x=-lp.hip*.58;
          r.AL.elbow.rotation.x=.055+Math.max(0,-r.AL.shoulder.rotation.x)*.22;
          r.AR.elbow.rotation.x=.055+Math.max(0,-r.AR.shoulder.rotation.x)*.22;
          r.pelvis.position.y=.82+Math.sin(r.phase*Math.PI*4)*.0045*stride;
          r.spine.rotation.z=Math.sin(r.phase*Math.PI*2)*.004*stride;
          r.spine.rotation.x=.012+Math.abs(Math.sin(r.phase*Math.PI*2))*.003*stride;
          r.lastX=r.root.position.x;r.lastZ=r.root.position.z;
        }
      });

      const kicker=document.querySelector('.kicker');if(kicker)kicker.textContent='HAYAT MASR • V9';
      const tagline=document.querySelector('.tagline');if(tagline)tagline.textContent='حياة مصر — إعادة بناء بصرية للشخصيات والمشي: جسم متصل وأقل كرتونية، مفصل كاحل حقيقي، واتجاه جسم متوافق مع اتجاه الحركة.';
      const foot=document.querySelector('.menuFoot');if(foot)foot.textContent='V9 — visual + pedestrian rig rebuild';

      window.__V9_PATCH={version:9,rig:'hip-knee-ankle-foot',pedestrians:'stance-swing-distance-driven',characterStyle:'rounded-human-proportions',artDirection:'muted-dusty-cairo',gaitCycleMeters:1.42,forwardAligned:true};
      if(window.__egyptDebug){
        window.__egyptDebug.v9State=()=>({
          ...window.__V9_PATCH,
          rigs:rigs.length,
          ankles:rigs.reduce((n,r)=>n+(r.L.ankle&&r.R.ankle?2:0),0),
          oldVisualsDisabled:rigs.filter(r=>r.oldVisual&&!r.oldVisual.isEnabled()).length,
          forwardBodies:rigs.filter(r=>Math.abs(Math.abs(r.visual.rotation.y)-Math.PI)<.001).length,
          first:rigs[0]?{speed:rigs[0].lastSpeed,stride:rigs[0].strideBlend,phase:rigs[0].phase,hipL:rigs[0].L.hip.rotation.x,kneeL:rigs[0].L.knee.rotation.x,ankleL:rigs[0].L.ankle.rotation.x}:null
        });
      }
    }catch(err){fail('V9 visual/animation rebuild failed',err);}
  }

  boot();
})();