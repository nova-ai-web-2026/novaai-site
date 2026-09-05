(() => {
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function install(){
    for(let i=0;!window.__V9_POLISH||!window.__V12_WORLD?.ready;i++){if(i>600)throw new Error('People rigs unavailable');await sleep(100);}
    const B=BABYLON,scene=B.Engine.LastCreatedEngine.scenes[0],mats=new Map();
    const mat=(name,color)=>{if(mats.has(name))return mats.get(name);const m=new B.StandardMaterial('people_'+name,scene);m.diffuseColor=B.Color3.FromHexString(color);m.specularColor=B.Color3.Black();mats.set(name,m);return m;};
    const mesh=(name,options,parent,x,y,z,material,type='sphere')=>{
      const m=type==='box'?B.MeshBuilder.CreateBox(name,options,scene):type==='cylinder'?B.MeshBuilder.CreateCylinder(name,options,scene):B.MeshBuilder.CreateSphere(name,options,scene);
      m.parent=parent;m.position.set(x,y,z);m.material=material;m.isPickable=false;m.checkCollisions=false;return m;
    };
    const sphere=(name,parent,x,y,z,material,sx,sy,sz)=>{const m=mesh(name,{diameter:1,segments:12},parent,x,y,z,material);m.scaling.set(sx,sy,sz);return m;};
    const names=['عم سيد','أم محمود','الحاج رضا','مينا','عم رجب','سارة','المعلم شوقي','نجلاء'];
    const identities=[];
    for(let i=0;i<28;i++){
      const visual=scene.getTransformNodeByName('v9_personVisual_'+i),spine=scene.getTransformNodeByName('v9_spine_'+i),pelvis=scene.getTransformNodeByName('v9_pelvis_'+i);
      if(!visual||!spine||!pelvis)continue;
      const female=[1,5,7].includes(i%8),scarf=female&&i%8!==5;
      const cloth=mat('outfit_'+i,['#536779','#856a87','#718071','#85614b','#577b7b','#a6654f','#6a6656','#617a90'][i%8]);
      const hair=mat('hair_'+i%3,['#292522','#44312a','#242323'][i%3]);
      const torso=scene.getMeshByName('v9p_torso_'+i);if(torso){torso.material=cloth;torso.scaling.x=female?1.0:1.12;}
      for(const side of ['L','R']){
        for(const prefix of ['v9p_upperArm','v9p_shoulder']){const m=scene.getMeshByName(prefix+side+'_'+i);if(m)m.material=cloth;}
        const fore=scene.getMeshByName('v9p_foreArm'+side+'_'+i);if(fore&&female)fore.material=cloth;
      }
      if(female){
        scene.getMeshByName('v9p_pelvis_'+i)?.setEnabled(false);scene.getMeshByName('v9p_waist_'+i)?.setEnabled(false);
        const tunic=mesh('people_tunic_'+i,{height:.60,diameterTop:.43,diameterBottom:.66,tessellation:16},pelvis,0,.08,0,cloth,'cylinder');tunic.scaling.z=.68;
        const oldHair=scene.getMeshByName('v9_hair_'+i);oldHair?.setEnabled(false);
        if(scarf){
          const fabric=mat('scarf_'+i,['#b7a78c','#d0b394','#8c6f7d'][i%3]);
          sphere('people_scarfCap_'+i,spine,0,1.045,.035,fabric,.435,.29,.40);
          sphere('people_scarfBack_'+i,spine,0,.88,.13,fabric,.43,.45,.23);
          for(const side of [-1,1])sphere('people_scarfSide_'+i+'_'+side,spine,side*.195,.93,.015,fabric,.105,.31,.27);
          sphere('people_scarfShoulders_'+i,spine,0,.68,.04,fabric,.55,.18,.36);
        }else{
          sphere('people_longHairCap_'+i,spine,0,1.08,.04,hair,.41,.18,.37);
          sphere('people_longHairBack_'+i,spine,0,.84,.15,hair,.40,.57,.20);
          sphere('people_ponytail_'+i,spine,.08,.83,.29,hair,.15,.46,.16);
        }
      }else{
        const oldHair=scene.getMeshByName('v9_hair_'+i);if(oldHair){oldHair.material=hair;oldHair.scaling.y=.24;}
        for(const side of [-1,1]){const collar=mesh('people_collar_'+i+'_'+side,{width:.12,height:.16,depth:.045},spine,side*.08,.62,-.18,mat('collar','#d2c7b5'),'box');collar.rotation.z=side*.35;}
        if(i%8===0||i%8===2)sphere('people_moustache_'+i,spine,0,.885,-.174,hair,.12,.026,.035);
        if(i%8===2)sphere('people_cap_'+i,spine,0,1.13,.02,mat('cap','#d5ccb8'),.42,.16,.38);
      }
      visual.scaling.setAll(.94+(i%5)*.025);
      const identity={name:names[i%8],presentation:female?'woman':'man',outfit:scarf?'headscarf-and-tunic':female?'long-hair-and-tunic':'collared-shirt',rig:i};
      visual.parent.metadata={...visual.parent.metadata,identity};identities.push(identity);
    }
    // The expanded neighbourhood uses a simpler rig, but still has complete
    // silhouettes and the same clothing vocabulary as the original street.
    const expanded=scene.transformNodes.filter(n=>/^v12_ped_\d+$/.test(n.name));
    expanded.forEach((root,i)=>{
      const female=i%3===1,cloth=mat('expanded_'+i,['#62776d','#966c80','#667b92'][i%3]),head=scene.getMeshByName('v12_pedHead_'+i);
      if(!head)return;
      const torso=scene.getMeshByName('v12_pedTorso_'+i);if(torso)torso.material=cloth;
      for(const side of [-1,1])sphere('people_expSleeve_'+i+'_'+side,root,side*.37,1.15,0,cloth,.15,.66,.19);
      sphere('people_expHair_'+i,root,0,2.015,.04,mat('expandedHair','#352820'),.46,.22,.44);
      if(female){sphere('people_expLongHair_'+i,root,0,1.77,.15,mat('expandedHair','#352820'),.43,.48,.22);const coat=mesh('people_expTunic_'+i,{height:.5,diameterTop:.49,diameterBottom:.68,tessellation:12},root,0,.9,0,cloth,'cylinder');coat.scaling.z=.65;}
      root.metadata={...root.metadata,identity:{presentation:female?'woman':'man',outfit:female?'long-hair-and-tunic':'shirt-and-trousers'}};
    });
    window.__EGYPT_PEOPLE={ready:true,identities,expanded:expanded.length};
  }
  install().catch(console.error);
})();
