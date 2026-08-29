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
    const mesh=BABYLON.MeshBuilder.CreateCylinder(name,{height,diameterTop,diameterBottom,tessellation:16},scene);
    mesh.parent=parent;mesh.position.y=y;mesh.material=material;mesh.checkCollisions=false;mesh.isPickable=false;
    return mesh;
  }

  function sphere(scene,name,diameter,parent,x,y,z,material,sx=1,sy=1,sz=1){
    const mesh=BABYLON.MeshBuilder.CreateSphere(name,{diameter,segments:16},scene);
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
    visual.parent=root;visual.position.y=.15;visual.rotation.y=Math.PI;

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
    cylinder(scene,'v9_pelvisMesh_'+i,.28,.515,pelvis,0,pant,.46,.53);
    cylinder(scene,'v9_waist_'+i,.18,.45,pelvis,.17,shirt,.48,.42);

    const spine=new BABYLON.TransformNode('v9_spine_'+i,scene);spine.parent=pelvis;spine.position.y=.22;
    cylinder(scene,'v9_torso_'+i,.65,.575,spine,.335,shirt,.62,.48);
    sphere(scene,'v9_chestBlend_'+i,.51,spine,0,.54,0,shirt,1.08,.48,.76);
    cylinder(scene,'v9_neck_'+i,.13,.155,spine,.755,skin);
    sphere(scene,'v9_head_'+i,.395,spine,0,.96,0,skin,.94,1.04,.93);
    sphere(scene,'v9_hair_'+i,.405,spine,0,1.062,.012,hair,.95,.35,.93);
    sphere(scene,'v9_nose_'+i,.068,spine,0,.955,-.188,skin,.8,1,1.06);
    sphere(scene,'v9_eyeL_'+i,.03,spine,-.066,.99,-.183,eye,.8,.65,.45);
    sphere(scene,'v9_eyeR_'+i,.03,spine,.066,.99,-.183,eye,.8,.65,.45);
    sphere(scene,'v9_earL_'+i,.078,spine,-.19,.965,0,skin,.45,.9,.6);
    sphere(scene,'v9_earR_'+i,.078,spine,.19,.965,0,skin,.45,.9,.6);

    function makeLeg(side,label){
      const hip=new BABYLON.TransformNode('v9_hip'+label+'_'+i,scene);hip.parent=pelvis;hip.position.set(side*.15,-.04,0);
      sphere(scene,'v9_hipJoint'+label+'_'+i,.17,hip,0,-.02,0,pant,.9,.88,.9);
      cylinder(scene,'v9_thigh'+label+'_'+i,.43,.22,hip,-.215,pant,.205,.23);
      const knee=new BABYLON.TransformNode('v9_knee'+label+'_'+i,scene);knee.parent=hip;knee.position.y=-.43;
      sphere(scene,'v9_kneeJoint'+label+'_'+i,.175,knee,0,0,0,pant,.92,.78,.92);
      cylinder(scene,'v9_calf'+label+'_'+i,.41,.185,knee,-.205,pant,.17,.20);
      const ankle=new BABYLON.TransformNode('v9_ankle'+label+'_'+i,scene);ankle.parent=knee;ankle.position.y=-.41;
      sphere(scene,'v9_ankleJoint'+label+'_'+i,.135,ankle,0,-.015,0,pant,.86,.8,.86);
      cylinder(scene,'v9_ankleMesh'+label+'_'+i,.09,.15,ankle,-.04,pant,.135,.16);
      const foot=box(scene,'v9_foot'+label+'_'+i,.225,.105,.33,ankle,0,-.09,-.067,shoe);
      sphere(scene,'v9_toe'+label+'_'+i,.21,ankle,0,-.085,-.195,shoe,1.03,.49,1.15);
      return {hip,knee,ankle,foot};
    }

    function makeArm(side,label){
      const shoulder=new BABYLON.TransformNode('v9_shoulder'+label+'_'+i,scene);shoulder.parent=spine;shoulder.position.set(side*.32,.59,0);
      sphere(scene,'v9_shoulderJoint'+label+'_'+i,.165,shoulder,0,0,0,shirt,.9,.9,.9);
      cylinder(scene,'v9_upperArm'+label+'_'+i,.35,.16,shoulder,-.175,shirt,.15,.175);
      const elbow=new BABYLON.TransformNode('v9_elbow'+label+'_'+i,scene);elbow.parent=shoulder;elbow.position.y=-.35;
      sphere(scene,'v9_elbowJoint'+label+'_'+i,.13,elbow,0,0,0,skin,.9,.8,.9);
      cylinder(scene,'v9_foreArm'+label+'_'+i,.31,.14,elbow,-.155,skin,.125,.15);
      sphere(scene,'v9_hand'+label+'_'+i,.15,elbow,0,-.33,0,skin,.8,1.08,.77);
      shoulder.rotation.z=side*.045;
      elbow.rotation.x=.11;
      return {shoulder,elbow,side};
    }

    const L=makeLeg(-1,'L'),R=makeLeg(1,'R'),AL=makeArm(-1,'L'),AR=makeArm(1,'R');

    const shadowMat=makeMat(scene,'v9_shadowMat_'+i,'#151310',.14);shadowMat.disableLighting=true;
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
      const heelLift=clamp((u-.8)/.2,0,1)*.11;
      ankle=-(hip+knee)+heelLift;
    }else{
      const u=smooth((t-.62)/.38);
      hip=lerp(-.28,.34,u);
      knee=.12+.54*Math.sin(Math.PI*u);
      ankle=-(hip+knee)+.045*Math.sin(Math.PI*u);
    }
    rig.hip.rotation.x=hip*stride;
    rig.knee.rotation.x=knee*stride;
    rig.ankle.rotation.x=ankle*stride;
    return {hip:hip*stride,knee:knee*stride,ankle:ankle*stride};
  }

  function surfaceMaterial(scene,name,base,kind){
    const tex=new BABYLON.DynamicTexture('v9_'+name+'Tex',{width:256,height:256},scene,false),c=tex.getContext();
    c.fillStyle=base;c.fillRect(0,0,256,256);
    let s=name.length*977+kind.length*131;
    const rnd=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
    const flecks=kind==='asphalt'?900:620;
    for(let i=0;i<flecks;i++){
      const a=.018+rnd()*.055,v=kind==='asphalt'?(rnd()>.5?220:28):(rnd()>.5?245:76);
      c.fillStyle=`rgba(${v},${v},${v},${a})`;
      const r=.5+rnd()*1.7;c.fillRect(rnd()*256,rnd()*256,r,r);
    }
    if(kind==='asphalt'){
      for(let i=0;i<16;i++){
        c.strokeStyle=`rgba(25,24,22,${.1+rnd()*.12})`;c.lineWidth=.6+rnd()*1.1;c.beginPath();
        let x=rnd()*256,y=rnd()*256;c.moveTo(x,y);
        for(let k=0;k<4;k++){x+=rnd()*28-14;y+=rnd()*22-11;c.lineTo(x,y);}c.stroke();
      }
      for(let i=0;i<7;i++){c.fillStyle='rgba(40,38,35,.08)';c.fillRect(rnd()*230,rnd()*230,18+rnd()*34,10+rnd()*22);}
    }else{
      c.strokeStyle='rgba(85,77,66,.15)';c.lineWidth=1;
      for(let p=0;p<=256;p+=64){c.beginPath();c.moveTo(p,0);c.lineTo(p,256);c.stroke();c.beginPath();c.moveTo(0,p);c.lineTo(256,p);c.stroke();}
    }
    tex.update();tex.uScale=kind==='asphalt'?7:5;tex.vScale=kind==='asphalt'?7:5;
    const m=new BABYLON.StandardMaterial('v9_'+name,scene);m.diffuseTexture=tex;m.specularColor=BABYLON.Color3.Black();return m;
  }

  function tuneScene(scene){
    const ipc=scene.imageProcessingConfiguration;
    ipc.exposure=.92;ipc.contrast=1.1;ipc.saturation=.74;ipc.toneMappingEnabled=true;
    scene.fogMode=BABYLON.Scene.FOGMODE_EXP2;scene.fogDensity=.00165;scene.fogColor=new BABYLON.Color3(.68,.65,.58);
    scene.ambientColor=new BABYLON.Color3(.14,.13,.12);

    for(const light of scene.lights){
      if(light instanceof BABYLON.HemisphericLight)light.intensity=Math.min(light.intensity,.56);
      if(light.name==='sun')light.intensity=.58;
    }
    if(!scene.lights.some(l=>l.name==='v9_sun')){
      const sun=new BABYLON.DirectionalLight('v9_sun',new BABYLON.Vector3(-.45,-1,.28),scene);
      sun.diffuse=new BABYLON.Color3(1,.86,.66);sun.specular=new BABYLON.Color3(.18,.15,.12);sun.intensity=.82;
    }

    const asphalt=surfaceMaterial(scene,'asphalt','#555550','asphalt');
    const pavement=surfaceMaterial(scene,'pavement','#a89d8b','concrete');
    const dustyGround=surfaceMaterial(scene,'dust','#9d8f75','concrete');
    for(const mesh of scene.meshes){
      if(mesh.name==='roadV'||mesh.name==='roadH')mesh.material=asphalt;
      else if(mesh.name.startsWith('walkV')||mesh.name.startsWith('walkH'))mesh.material=pavement;
      else if(mesh.name==='ground')mesh.material=dustyGround;
    }

    const sand=new BABYLON.Color3(.58,.51,.43),touched=new Set();
    for(const mesh of scene.meshes){
      const m=mesh.material;
      if(!m||touched.has(m)||!(m instanceof BABYLON.StandardMaterial))continue;
      if(mesh.name==='building'||mesh.name.startsWith('wall')||mesh.name.startsWith('v8_')){
        if(m.diffuseColor)m.diffuseColor=BABYLON.Color3.Lerp(m.diffuseColor,sand,mesh.name==='building'?.2:.06);
        m.specularColor=new BABYLON.Color3(.015,.015,.015);touched.add(m);
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
          const speed=move/dt;r.lastSpeed=lerp(r.lastSpeed,speed,Math.min(1,dt*8));
          const moving=move>.0005;if(moving)r.phase=(r.phase+move/1.42)%1;
          r.strideBlend=lerp(r.strideBlend,moving?1:0,Math.min(1,dt*(moving?18:9)));
          const stride=r.strideBlend,lp=poseLeg(r.L,r.phase,stride),rp=poseLeg(r.R,r.phase+.5,stride);
          r.AL.shoulder.rotation.x=-rp.hip*.62;r.AR.shoulder.rotation.x=-lp.hip*.62;
          r.AL.shoulder.rotation.z=-.045;r.AR.shoulder.rotation.z=.045;
          r.AL.elbow.rotation.x=.11+Math.max(0,-r.AL.shoulder.rotation.x)*.24;
          r.AR.elbow.rotation.x=.11+Math.max(0,-r.AR.shoulder.rotation.x)*.24;
          const bodyWave=Math.sin(r.phase*Math.PI*2);
          r.pelvis.position.y=.82+Math.sin(r.phase*Math.PI*4)*.0065*stride;
          r.pelvis.rotation.y=bodyWave*.028*stride;r.pelvis.rotation.z=bodyWave*.006*stride;
          r.spine.rotation.y=-bodyWave*.018*stride;r.spine.rotation.z=-bodyWave*.006*stride;
          r.spine.rotation.x=.01+Math.abs(bodyWave)*.004*stride;
          r.lastX=r.root.position.x;r.lastZ=r.root.position.z;
        }
      });

      const kicker=document.querySelector('.kicker');if(kicker)kicker.textContent='HAYAT MASR • V9';
      const tagline=document.querySelector('.tagline');if(tagline)tagline.textContent='حياة مصر — إعادة بناء بصرية للشخصيات والمشي والخامات: جسم متصل، مفصل كاحل حقيقي، وخطوة يشارك فيها الحوض والكتف بدل حركة رجلين منفصلة.';
      const foot=document.querySelector('.menuFoot');if(foot)foot.textContent='V9 — visual + pedestrian rig rebuild';

      window.__V9_PATCH={version:9,rig:'hip-knee-ankle-foot',pedestrians:'stance-swing-distance-driven',characterStyle:'rounded-human-proportions',artDirection:'textured-muted-dusty-cairo',gaitCycleMeters:1.42,forwardAligned:true,surfaceTextures:true};
      if(window.__egyptDebug){
        window.__egyptDebug.v9State=()=>({
          ...window.__V9_PATCH,rigs:rigs.length,ankles:rigs.reduce((n,r)=>n+(r.L.ankle&&r.R.ankle?2:0),0),oldVisualsDisabled:rigs.filter(r=>r.oldVisual&&!r.oldVisual.isEnabled()).length,
          forwardBodies:rigs.filter(r=>Math.abs(Math.abs(r.visual.rotation.y)-Math.PI)<.001).length,
          first:rigs[0]?{speed:rigs[0].lastSpeed,stride:rigs[0].strideBlend,phase:rigs[0].phase,hipL:rigs[0].L.hip.rotation.x,kneeL:rigs[0].L.knee.rotation.x,ankleL:rigs[0].L.ankle.rotation.x}:null
        });
      }
    }catch(err){fail('V9 visual/animation rebuild failed',err);}
  }

  boot();
})();