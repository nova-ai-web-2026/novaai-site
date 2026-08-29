(() => {
  'use strict';

  const errorBox=document.getElementById('errorBox');
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function fail(message,err){
    console.error(message,err||'');
    if(errorBox){
      errorBox.style.display='block';
      errorBox.textContent=message+(err?.message?': '+err.message:'');
    }
  }

  function replaceOrThrow(source,pattern,replacement,label){
    const next=source.replace(pattern,replacement);
    if(next===source)throw new Error('V7 patch target missing: '+label);
    return next;
  }

  async function waitForV6(){
    for(let i=0;i<160;i++){
      const scene=window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0];
      if(window.__V6_PATCH?.version===6&&scene)return scene;
      await sleep(50);
    }
    throw new Error('V6 core did not finish booting');
  }

  function addEgyptDetails(scene){
    const mats=new Map();
    const mat=(name,hex,emit='')=>{
      const key=name+hex+emit;
      if(mats.has(key))return mats.get(key);
      const m=new BABYLON.StandardMaterial('v7_'+key,scene);
      m.diffuseColor=BABYLON.Color3.FromHexString(hex);
      m.specularColor=new BABYLON.Color3(.02,.02,.02);
      if(emit)m.emissiveColor=BABYLON.Color3.FromHexString(emit);
      mats.set(key,m);return m;
    };
    const box=(name,w,h,d,x,y,z,material)=>{
      const m=BABYLON.MeshBuilder.CreateBox('v7_'+name,{width:w,height:h,depth:d},scene);
      m.position.set(x,y,z);m.material=material;m.checkCollisions=false;m.isPickable=false;return m;
    };
    const cyl=(name,dia,h,x,y,z,material,tess=10)=>{
      const m=BABYLON.MeshBuilder.CreateCylinder('v7_'+name,{diameter:dia,height:h,tessellation:tess},scene);
      m.position.set(x,y,z);m.material=material;m.checkCollisions=false;m.isPickable=false;return m;
    };
    const sign=(text,x,y,z,w=3.5,h=.64,bg='#315d48',rot=0)=>{
      const tex=new BABYLON.DynamicTexture('v7_signTex_'+text,{width:700,height:130},scene,false),c=tex.getContext();
      c.fillStyle=bg;c.fillRect(0,0,700,130);c.fillStyle='#fff2d2';c.font='bold 52px Tahoma,Arial';c.textAlign='center';c.textBaseline='middle';c.direction='rtl';c.fillText(text,350,67);tex.update();
      const sm=new BABYLON.StandardMaterial('v7_signMat_'+text,scene);sm.diffuseTexture=tex;sm.emissiveColor=new BABYLON.Color3(.055,.05,.04);sm.backFaceCulling=false;
      const p=BABYLON.MeshBuilder.CreatePlane('v7_sign_'+text,{width:w,height:h},scene);p.position.set(x,y,z);p.rotation.y=rot;p.material=sm;p.isPickable=false;return p;
    };

    // Plastic chairs outside buildings and the ahwa.
    const plastic=['#3c78a8','#8c3e36','#4d875c','#d6c15e'];
    function chair(x,z,i,rot=0){
      const m=mat('plastic'+i,plastic[i%plastic.length]);
      const seat=box('plasticChair',.54,.09,.55,x,.48,z,m);seat.rotation.y=rot;
      const back=box('plasticChairBack',.54,.72,.08,x,.82,z+.24,m);back.rotation.y=rot;
      for(const dx of [-.21,.21])for(const dz of [-.2,.2]){const leg=box('plasticChairLeg',.07,.44,.07,x+dx,.22,z+dz,m);leg.rotation.y=rot;}
    }
    [[-57,42,0,.1],[-54.8,42.5,1,-.1],[-57.2,46,2,.15],[-53.5,45.8,3,-.2],[-86,-18,1,.05],[-83.8,-18.4,0,-.08]].forEach(v=>chair(...v));

    // Bread crates and baladi loaves near a bakery frontage.
    const crate=mat('breadCrate','#5a3f2d'),bread=mat('baladiBread','#c99755');
    for(let q=0;q<2;q++){
      box('breadCrate',2.0,.18,1.15,-38+q*2.25,.14,-17,crate);
      for(let i=0;i<7;i++){
        const b=cyl('baladiBread',.54,.08,-38.7+q*2.25+(i%4)*.45,.29,-17.25+Math.floor(i/4)*.45,bread,12);b.rotation.x=Math.PI/2;
      }
    }

    // Public water cooler.
    box('waterCooler',.62,1.05,.55,-61,.55,-17.6,mat('cooler','#e6e0d5'));
    const bottle=cyl('waterBottle',.46,.72,-61,1.42,-17.6,mat('bottle','#5b9fc1','#10242c'),12);bottle.scaling.x=.84;

    // Workshop tyre stack.
    const tyreMat=mat('tyre','#242526');
    for(let i=0;i<4;i++){
      const t=BABYLON.MeshBuilder.CreateTorus('v7_tyre',{diameter:1.0,thickness:.22,tessellation:12},scene);
      t.position.set(59,.24+i*.28,-17.3);t.rotation.x=Math.PI/2;t.material=tyreMat;t.checkCollisions=false;t.isPickable=false;
    }

    // Familiar fictional neighborhood signs.
    sign('كاوتش وبنشر',59,2.05,-18.05,4,.66,'#374650',0);
    sign('مكوجي الحارة',-10,2.45,17.6,3.8,.66,'#76502f',0);
    sign('موبايلات النيل',10,2.45,17.6,4,.66,'#315b75',0);
    sign('حلاق الرجولة',36,2.45,17.6,3.8,.66,'#60416f',0);

    // Electric meter boxes and short facade conduits.
    const buildings=scene.meshes.filter(m=>m.name==='building').slice(0,8);
    for(let i=0;i<buildings.length;i++){
      const b=buildings[i];b.computeWorldMatrix(true);const bb=b.getBoundingInfo().boundingBox,min=bb.minimumWorld;
      const x=min.x+1.4+(i%3)*.7,z=min.z-.05;
      box('meterBox',.42,.58,.10,x,.68,z,mat('meter','#77766f'));
      box('meterWire',.055,1.35,.055,x+.14,1.62,z-.03,mat('meterWire','#30302e'));
    }

    // Rooftop pigeon coop.
    const roofBuilding=scene.meshes.filter(m=>m.name==='building').sort((a,b)=>Math.hypot(a.position.x,a.position.z)-Math.hypot(b.position.x,b.position.z))[0];
    if(roofBuilding){
      roofBuilding.computeWorldMatrix(true);const bb=roofBuilding.getBoundingInfo().boundingBox,max=bb.maximumWorld;
      const cx=roofBuilding.position.x+3.2,cz=roofBuilding.position.z+2.7,baseY=max.y+.1,wood=mat('coopWood','#6b503a'),wire=mat('coopWire','#4d504e');
      box('pigeonCoopBase',3.5,.16,2.5,cx,baseY,cz,wood);
      for(const dx of [-1.65,1.65])for(const dz of [-1.15,1.15])box('coopPost',.09,1.7,.09,cx+dx,baseY+.85,cz+dz,wood);
      box('pigeonCoopRoof',3.7,.12,2.7,cx,baseY+1.72,cz,mat('coopRoof','#8a6b4e'));
      for(let k=-2;k<=2;k++)box('pigeonCoopWire',3.25,.025,.025,cx,baseY+.35+k*.27,cz-1.18,wire);
    }

    // Street cats: simple, stationary and non-colliding.
    const catCols=['#806752','#b7a28d','#4b4742','#c58a55','#7c7f77'];
    function cat(x,z,i,rot){
      const root=new BABYLON.TransformNode('v7_catRoot',scene);root.position.set(x,0,z);root.rotation.y=rot;
      const cm=mat('cat'+i,catCols[i%catCols.length]);
      const body=BABYLON.MeshBuilder.CreateSphere('v7_catBody',{diameter:.52,segments:8},scene);body.parent=root;body.position.set(0,.32,0);body.scaling.set(1.25,.72,.65);body.material=cm;body.isPickable=false;
      const head=BABYLON.MeshBuilder.CreateSphere('v7_catHead',{diameter:.34,segments:8},scene);head.parent=root;head.position.set(0,.45,-.32);head.material=cm;head.isPickable=false;
      const tail=BABYLON.MeshBuilder.CreateTube('v7_catTail',{path:[new BABYLON.Vector3(0,.35,.27),new BABYLON.Vector3(.15,.48,.55),new BABYLON.Vector3(.08,.68,.66)],radius:.045,tessellation:6},scene);tail.parent=root;tail.material=cm;tail.isPickable=false;
    }
    [[-31,-18,0,.2],[23,18,1,2.4],[77,66,2,1.2],[-74,63,3,4.4],[56,-63,4,5.1]].forEach(v=>cat(...v));

    // Produce boxes, gas cylinders and a small tea tray add everyday clutter.
    const boxMat=mat('vegBox','#7d5a37'),green=mat('veg','#597b47'),red=mat('tomato','#a95442');
    for(let i=0;i<4;i++){box('produceCrate',1.25,.24,.9,39+i*1.4,.17,-38,boxMat);for(let j=0;j<5;j++){const f=BABYLON.MeshBuilder.CreateSphere('v7_produce',{diameter:.2,segments:6},scene);f.position.set(38.6+i*1.4+(j%3)*.28,.36,-38.2+Math.floor(j/3)*.3);f.material=j%2?green:red;f.isPickable=false;}}
    for(let i=0;i<3;i++)cyl('gasCylinder',.42,.92,68+i*.5,.48,17.8,mat('gas','#596b57'),12);
    box('teaTray',.72,.05,.48,-46,.82,42.2,mat('tray','#a4a09a'));for(let i=0;i<3;i++)cyl('teaGlass',.12,.22,-46.2+i*.2,.96,42.2,mat('tea','#9b6b36','#241304'),10);

    return {meshCount:scene.meshes.filter(m=>m.name.startsWith('v7_')).length,catCount:scene.transformNodes.filter(n=>n.name==='v7_catRoot').length,signCount:scene.meshes.filter(m=>m.name.startsWith('v7_sign_')).length};
  }

  async function boot(){
    try{
      const response=await fetch('game-v6.js',{cache:'no-store'});
      if(!response.ok)throw new Error('تعذر تحميل V6');
      let source=await response.text();

      // Adult everyday gait: less knee bend, less bob, lighter arms, normal cadence.
      source=replaceOrThrow(source,/speed:\.014\+\(i%5\)\*\.0022,cadence:\.88\+\(i%4\)\*\.08/,'speed:.0155+(i%5)*.0017,cadence:1.12+(i%4)*.06','pedestrian speed/cadence');
      source=replaceOrThrow(source,/if\(moving\)p\.phase\+=\.082\*dt\*p\.cadence;/,'if(moving)p.phase+=.092*dt*p.cadence;','gait cadence');
      source=replaceOrThrow(source,/const hip=s\*\.34\*stride;/,'const hip=s*.235*stride;','hip swing');
      source=replaceOrThrow(source,/\.035\+Math\.max\(0,-s\)\*\.52\*stride;/,'.025+Math.max(0,-s)*.245*stride;','left knee flex');
      source=replaceOrThrow(source,/\.035\+Math\.max\(0,s\)\*\.52\*stride;/,'.025+Math.max(0,s)*.245*stride;','right knee flex');
      source=replaceOrThrow(source,/p\.shoulderL\.rotation\.x=-s\*\.25\*stride;p\.shoulderR\.rotation\.x=s\*\.25\*stride;/,'p.shoulderL.rotation.x=-s*.16*stride;p.shoulderR.rotation.x=s*.16*stride;','arm swing');
      source=replaceOrThrow(source,/p\.elbowL\.rotation\.x=\.08\+Math\.max\(0,s\)\*\.17\*stride;p\.elbowR\.rotation\.x=\.08\+Math\.max\(0,-s\)\*\.17\*stride;/,'p.elbowL.rotation.x=.055+Math.max(0,s)*.09*stride;p.elbowR.rotation.x=.055+Math.max(0,-s)*.09*stride;','elbow swing');
      source=replaceOrThrow(source,/p\.visual\.position\.y=Math\.abs\(Math\.sin\(g\*2\)\)\*\.017\*stride;/,'p.visual.position.y=Math.abs(Math.sin(g*2))*.006*stride;','body bob');
      source=replaceOrThrow(source,/p\.visual\.rotation\.z=Math\.sin\(g\)\*\.008\*stride;/,'p.visual.rotation.z=Math.sin(g)*.0025*stride;','body roll');
      source=replaceOrThrow(source,/p\.torso\.rotation\.x=\.018\+Math\.abs\(s\)\*\.006\*stride;/,'p.torso.rotation.x=.004+Math.abs(s)*.0015*stride;','torso posture');
      source=source.replaceAll('p.turning=12;','p.turning=6;');
      source=replaceOrThrow(source,/delta\*Math\.min\(1,\.12\*dt\)/,'delta*Math.min(1,.18*dt)','turn speed');
      source += '\n//# sourceURL=game-v7-v6-core.js';
      (0,eval)(source);

      const scene=await waitForV6();
      const details=addEgyptDetails(scene);
      window.__V7_PATCH={version:7,pedestrians:'normal-adult-walk',egyptDetails:'street-life-pack',details};
      if(window.__egyptDebug){
        window.__egyptDebug.v7State=()=>({...window.__V7_PATCH});
        window.__egyptDebug.v7VisualState=()=>({
          details:{...details},
          decorativeCollisions:scene.meshes.filter(m=>m.name.startsWith('v7_')&&m.checkCollisions).length,
          v7Meshes:scene.meshes.filter(m=>m.name.startsWith('v7_')).length
        });
      }
      const kicker=document.querySelector('.kicker');if(kicker)kicker.textContent='HAYAT MASR • V7';
      const tagline=document.querySelector('.tagline');if(tagline)tagline.textContent='حياة مصر — مدينة مصرية مفتوحة بتفاصيل يومية أكثر، ومشية طبيعية للشخصيات من غير الحركة الثقيلة القديمة.';
    }catch(err){fail('V7 ما اشتغلتش بالشكل المطلوب',err);}
  }

  boot();
})();
