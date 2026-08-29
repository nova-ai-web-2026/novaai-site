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

    const visual=new BABYLON.TransformNode('v9_personVisual_'+i,scene);visual.parent=root;visual.position.y=.15;
    const shade=i%4;
    const skin=makeMat(scene,'v9_skin_'+i,['#a97758','#b98261','#8f634b','#c08b68'][shade]);
    const shirts=['#5a6b70','#70594c','#50645a','#6b5d68','#756b50','#4f5a61'];
    const pants=['#34383a','#3e3c39','#30373b','#39373f'];
    const shirt=makeMat(scene,'v9_shirt_'+i,shirts[i%shirts.length]);
    const pant=makeMat(scene,'v9_pants_'+i,pants[i%pants.length]);
    const shoe=makeMat(scene,'v9_shoe_'+i,i%3===0?'#2f2925':'#272727');
    const hair=makeMat(scene,'v9_hair_'+i,['#2b2522','#332821','#1f1d1b'][i%3]);

    const bodyScale=.96+(i%5)*.018;
    visual.scaling.setAll(bodyScale);

    const pelvis=new BABYLON.TransformNode('v9_pelvis_'+i,scene);pelvis.parent=visual;pelvis.position.y=.82;
    cylinder(scene,'v9_pelvisMesh_'+i,.24,.46,pelvis,0,pant,.42,.48);

    const spine=new BABYLON.TransformNode('v9_spine_'+i,scene);spine.parent=pelvis;spine.position.y=.22;
    cylinder(scene,'v9_torso_'+i,.68,.5,spine,.34,shirt,.54,.43);
    cylinder(scene,'v9_neck_'+i,.14,.15,spine,.76,skin);
    const head=sphere(scene,'v9_head_'+i,.43,spine,0,.98,0,skin,.92,1.02,.9);
    sphere(scene,'v9_hair_'+i,.44,spine,0,1.09,-.01,hair,.94,.46,.94);
    sphere(scene,'v9_nose_'+i,.075,spine,0,.98,-.205,skin,.8,1,1.1);

    function makeLeg(side,label){
      const hip=new BABYLON.TransformNode('v9_hip'+label+'_'+i,scene);hip.parent=pelvis;hip.position.set(side*.145,-.04,0);
      cylinder(scene,'v9_thigh'+label+'_'+i,.43,.17,hip,-.215,pant,.16,.18);
      const knee=new BABYLON.TransformNode('v9_knee'+label+'_'+i,scene);knee.parent=hip;knee.position.y=-.43;
      cylinder(scene,'v9_calf'+label+'_'+i,.41,.15,knee,-.205,pant,.145,.16);
      const ankle=new BABYLON.TransformNode('v9_ankle'+label+'_'+i,scene);ankle.parent=knee;ankle.position.y=-.41;
      cylinder(scene,'v9_ankleMesh'+label+'_'+i,.09,.13,ankle,-.035,pant,.12,.14);
      const foot=box(scene,'v9_foot'+label+'_'+i,.18,.095,.31,ankle,0,-.09,-.065,shoe);
      sphere(scene,'v9_toe'+label+'_'+i,.18,ankle,0,-.085,-.18,shoe,.92,.52,1.1);
      return {hip,knee,ankle,foot};
    }

    function makeArm(side,label){
      const shoulder=new BABYLON.TransformNode('v9_shoulder'+label+'_'+i,scene);shoulder.parent=spine;shoulder.position.set(side*.31,.61,0);
      cylinder(scene,'v9_upperArm'+label+'_'+i,.36,.14,shoulder,-.18,shirt,.135,.15);
      const elbow=new BABYLON.TransformNode('v9_elbow'+label+'_'+i,scene);elbow.parent=shoulder;elbow.position.y=-.36;
      cylinder(scene,'v9_foreArm'+label+'_'+i,.32,.125,elbow,-.16,skin,.115,.13);
      sphere(scene,'v9_hand'+label+'_'+i,.15,elbow,0,-.34,0,skin,.85,1.08,.82);
      return {shoulder,elbow};
    }

    const L=makeLeg(-1,'L'),R=makeLeg(1,'R'),AL=makeArm(-1,'L'),AR=makeArm(1,'R');

    const shadowMat=makeMat(scene,'v9_shadowMat_'+i,'#151310',.15);shadowMat.disableLighting=true;
    const shadow=BABYLON.MeshBuilder.CreateDisc('v9_contactShadow_'+i,{radius:.34,tessellation:24},scene);
    shadow.parent=root;shadow.rotation.x=Math.PI/2;shadow.position.y=.012;shadow.scaling.y=.58;shadow.material=shadowMat;shadow.isPickable=false;shadow.checkCollisions=false;

    return {root,oldVisual,visual,pelvis,spine,head,L,R,AL,AR,phase:(i*.37)%1,lastX:root.position.x,lastZ:root.position.z,lastSpeed:0,strideBlend:0,index:i};
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
          r.head.rotation.y=Math.sin((performance.now()/1000)*.7+r.index)*.018;
          r.lastX=r.root.position.x;r.lastZ=r.root.position.z;
        }
      });

      const kicker=document.querySelector('.kicker');if(kicker)kicker.textContent='HAYAT MASR • V9';
      const tagline=document.querySelector('.tagline');if(tagline)tagline.textContent='حياة مصر — إعادة بناء بصرية للشخصيات والمشي: جسم أقل كرتونية، مفصل كاحل حقيقي، وخطوات ثابتة على الأرض بدل دوران القدم من الركبة.';
      const foot=document.querySelector('.menuFoot');if(foot)foot.textContent='V9 — visual + pedestrian rig rebuild';

      window.__V9_PATCH={version:9,rig:'hip-knee-ankle-foot',pedestrians:'stance-swing-distance-driven',characterStyle:'rounded-human-proportions',artDirection:'muted-dusty-cairo',gaitCycleMeters:1.42};
      if(window.__egyptDebug){
        window.__egyptDebug.v9State=()=>({
          ...window.__V9_PATCH,
          rigs:rigs.length,
          ankles:rigs.reduce((n,r)=>n+(r.L.ankle&&r.R.ankle?2:0),0),
          oldVisualsDisabled:rigs.filter(r=>r.oldVisual&&!r.oldVisual.isEnabled()).length,
          first:rigs[0]?{speed:rigs[0].lastSpeed,stride:rigs[0].strideBlend,phase:rigs[0].phase,hipL:rigs[0].L.hip.rotation.x,kneeL:rigs[0].L.knee.rotation.x,ankleL:rigs[0].L.ankle.rotation.x}:null
        });
      }
    }catch(err){fail('V9 visual/animation rebuild failed',err);}
  }

  boot();
})();