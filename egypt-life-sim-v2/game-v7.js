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
    if(next===source)throw new Error('V8 patch target missing: '+label);
    return next;
  }

  async function waitForV6(){
    for(let i=0;i<180;i++){
      const scene=window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0];
      if(window.__V6_PATCH?.version===6&&scene)return scene;
      await sleep(50);
    }
    throw new Error('V6 core did not finish booting');
  }

  function addEgyptDetails(scene){
    const mats=new Map(),meshes=[],shopNames=[];
    const mat=(name,hex,emit='')=>{
      const key=name+hex+emit;
      if(mats.has(key))return mats.get(key);
      const m=new BABYLON.StandardMaterial('v8_mat_'+key,scene);
      m.diffuseColor=BABYLON.Color3.FromHexString(hex);
      m.specularColor=new BABYLON.Color3(.025,.025,.025);
      if(emit)m.emissiveColor=BABYLON.Color3.FromHexString(emit);
      mats.set(key,m);return m;
    };
    const reg=m=>{m.checkCollisions=false;m.isPickable=false;meshes.push(m);return m;};
    const box=(name,w,h,d,x,y,z,material,rot=0)=>{const m=reg(BABYLON.MeshBuilder.CreateBox('v8_'+name,{width:w,height:h,depth:d},scene));m.position.set(x,y,z);m.rotation.y=rot;m.material=material;return m;};
    const cyl=(name,dia,h,x,y,z,material,tess=10,rotX=0)=>{const m=reg(BABYLON.MeshBuilder.CreateCylinder('v8_'+name,{diameter:dia,height:h,tessellation:tess},scene));m.position.set(x,y,z);m.rotation.x=rotX;m.material=material;return m;};
    const torus=(name,dia,thick,x,y,z,material,rotX=Math.PI/2)=>{const m=reg(BABYLON.MeshBuilder.CreateTorus('v8_'+name,{diameter:dia,thickness:thick,tessellation:12},scene));m.position.set(x,y,z);m.rotation.x=rotX;m.material=material;return m;};
    const sign=(text,x,y,z,w=3.6,h=.65,bg='#315d48',rot=0,prefix='shopSign')=>{
      const tex=new BABYLON.DynamicTexture('v8_tex_'+prefix+'_'+text,{width:800,height:150},scene,false),c=tex.getContext();
      c.fillStyle=bg;c.fillRect(0,0,800,150);c.fillStyle='#f8edd6';c.font='bold 54px Tahoma,Arial';c.textAlign='center';c.textBaseline='middle';c.direction='rtl';c.fillText(text,400,77);tex.update();
      const sm=new BABYLON.StandardMaterial('v8_signMat_'+prefix+'_'+text,scene);sm.diffuseTexture=tex;sm.emissiveColor=new BABYLON.Color3(.045,.04,.035);sm.backFaceCulling=false;
      const p=reg(BABYLON.MeshBuilder.CreatePlane('v8_'+prefix+'_'+text,{width:w,height:h},scene));p.position.set(x,y,z);p.rotation.y=rot;p.material=sm;return p;
    };
    const shutter=(x,z,w,rot,color='#4d514f')=>{const m=box('rollingShutter',w,2.05,.08,x,1.03,z,mat('shutter',color),rot);for(let i=-4;i<=4;i++)box('shutterSlat',w*.96,.025,.018,x,1.03+i*.2,z-.055,mat('slat','#2f3332'),rot);return m;};
    const awning=(x,z,w,rot,color='#7d3f32')=>{const m=box('awning',w,.12,1.25,x,2.38,z,mat('awning'+color,color),rot);m.rotation.x=-.12;for(let i=0;i<6;i++)box('awningStripe',w/6-.04,.03,1.28,x-w/2+w/12+i*w/6,2.40,z-.02,mat('awningStripe'+i,i%2?'#e6d4b1':color),rot);return m;};
    const bareBulb=(x,y,z)=>{box('bulbWire',.025,.85,.025,x,y+.38,z,mat('wire','#292725'));const b=reg(BABYLON.MeshBuilder.CreateSphere('v8_hangingBulb',{diameter:.13,segments:8},scene));b.position.set(x,y,z);b.material=mat('bulb','#ddd5b9','#d1a75b');return b;};
    const crate=(name,x,z,color='#79583d')=>box(name,1.12,.3,.82,x,.18,z,mat(name,color));
    const sack=(x,z,color='#c5aa76')=>{const s=reg(BABYLON.MeshBuilder.CreateSphere('v8_spiceSack',{diameter:.72,segments:8},scene));s.position.set(x,.31,z);s.scaling.set(.72,.86,.72);s.material=mat('sack',color);return s;};

    const buildings=scene.meshes.filter(m=>m.name==='building').slice(0,14);
    for(let i=0;i<buildings.length;i++){
      const b=buildings[i];b.computeWorldMatrix(true);const bb=b.getBoundingInfo().boundingBox,min=bb.minimumWorld,max=bb.maximumWorld;
      const fx=min.x+1.25+(i%3)*.72,fz=min.z-.055;
      box('meterBox',.38,.5,.09,fx,.62,fz,mat('meter','#74746d'));box('wallConduit',.045,1.5,.045,fx+.13,1.55,fz-.025,mat('conduit','#343330'));
      if(i%2===0){const railY=Math.min(max.y-.75,4.25);box('laundryLine',2.7,.025,.025,b.position.x,railY,min.z-.22,mat('line','#302e2b'));for(let j=0;j<4;j++){const cloth=box('laundryCloth',.48,.58,.035,b.position.x-1.0+j*.67,railY-.34,min.z-.23,mat('cloth'+j,['#c66c58','#5b78a8','#d6c06d','#e6e1d5'][j]));cloth.rotation.z=(j%2?-.04:.035);}}
      if(i%3===0){box('balconyRug',1.2,.78,.035,b.position.x+.8,Math.min(max.y-.9,5.1),min.z-.25,mat('rug',i%2?'#8b493d':'#4f6f77'));for(let p=0;p<2;p++)cyl('balconyPlantPot',.28,.3,b.position.x-1+p*.6,Math.min(max.y-.35,5.55),min.z-.38,mat('pot','#8a5b3d'),10);}
    }

    const shops=[
      ['بقالة أولاد الحارة',-86,-18.05,4.2,'#315d48','#6c4a32'],['فرن الحاج سالم',-73,-18.05,4.0,'#8a4f31','#9b5b36'],['عطارة البركة',-59,-18.05,3.9,'#6d5a2e','#7b6632'],['مكتبة الأمل',-44,-18.05,3.7,'#315b75','#3f6482'],['حلاق المعلم',-28,-18.05,3.6,'#60416f','#664c75'],['موبايلات الميدان',-10,-18.05,4.1,'#365f80','#3f6688'],['ألبان الريف',10,-18.05,3.6,'#47715c','#5f806b'],['عصير قصب أبو زيد',28,-18.05,4.2,'#587b36','#6d8b43'],['حلويات زمان',46,-18.05,3.8,'#8a4d57','#955764'],['كهربائي الحارة',64,-18.05,4.0,'#4f5960','#606970'],['كاوتش وبنشر',82,-18.05,4.0,'#374650','#4d565d'],['مفروشات المحروسة',-72,17.62,4.3,'#7b4c3b','#8b5c47'],['صيدلية الشفاء',-50,17.62,3.8,'#3f7669','#4c8275'],['كشري الميدان',-26,17.62,3.8,'#9a6335','#a66c3b'],['قهوة عم رجب',4,17.62,3.7,'#60472f','#6e5236'],['خضار وفاكهة البركة',34,17.62,4.5,'#52743c','#678148']
    ];
    for(let i=0;i<shops.length;i++){const [name,x,z,w,bg,awn]=shops[i];shopNames.push(name);sign(name,x,2.68,z,w,.68,bg);shutter(x,z+.08,w*.96,0,i%2?'#555957':'#494e4c');awning(x,z-.72,w*.92,0,awn);bareBulb(x,2.05,z-.86);}

    for(let r=0;r<3;r++)for(let c=0;c<4;c++)box('grocerySnackBox',.38,.22,.28,-87.2+c*.43,.28+r*.24,-17.25,mat('snack'+((r+c)%4),['#c85242','#d4a948','#47799b','#6c8b4b'][(r+c)%4]));
    for(let i=0;i<5;i++)box('stationeryStack',.38,.12,.55,-45.2+i*.42,.16+(i%2)*.13,-17.18,mat('stationery'+i,['#5879a5','#c45e55','#d9bb5a','#6d8d67','#8a5f8f'][i]));

    const metal=mat('metal','#777a77'),bread=mat('bread','#c89654');
    for(let k=0;k<4;k++)box('bakeryRackBar',2.4,.035,.035,-74,0.42+k*.42,-17.22,metal);
    box('bakeryRackSide',.035,1.7,.7,-75.15,1.0,-17.22,metal);box('bakeryRackSide',.035,1.7,.7,-72.85,1.0,-17.22,metal);
    for(let i=0;i<12;i++){const b=cyl('baladiLoaf',.46,.07,-74.85+(i%6)*.34,.52+Math.floor(i/6)*.42,-17.18,bread,12,Math.PI/2);b.scaling.x=1.2;}

    const spiceCols=['#a76635','#c7a245','#7b4f2f','#9b7a4d','#73543b','#b65e3d'];for(let i=0;i<6;i++){sack(-60.7+i*.55,-17.18,spiceCols[i]);cyl('attarJar',.25,.45,-60.7+i*.55,.72,-17.18,mat('jar'+i,'#b9b29e'),10);}
    for(let i=0;i<9;i++){const stalk=cyl('sugarCane',.08,2.2,26.3+i*.13,1.1,-17.22,mat('cane','#71834a'),8);stalk.rotation.z=.08-(i%3)*.05;}box('juiceMachine',.72,1.05,.55,29.2,.55,-17.18,mat('juiceMachine','#8d9290'));for(let i=0;i<4;i++)cyl('juiceCup',.12,.24,30+i*.17,.13,-17.18,mat('juiceCup','#d8cfb5'),10);

    const tyreMat=mat('tyre','#232424');for(let i=0;i<5;i++)torus('tyreStack',.95,.21,80.8,.23+i*.24,-17.25,tyreMat);box('workBench',1.7,.72,.65,84,.37,-17.18,mat('bench','#5f5142'));for(let i=0;i<6;i++)cyl('oilCan',.16,.38,83.5+i*.18,.88,-17.15,mat('oilCan',i%2?'#a23f32':'#323c47'),10);
    for(let i=0;i<8;i++){const roll=cyl('fabricRoll',.24,1.7,-73.7+i*.38,.86,18.18,mat('fabric'+i,['#8d5147','#56778c','#c1a35c','#657f58'][i%4]),10);roll.rotation.z=Math.PI/2;}

    sign('24 ساعة',-50,1.68,17.5,1.4,.42,'#2f695e',0,'smallSign');for(let i=0;i<4;i++)cyl('kosharyPot',.48,.38,-27.2+i*.58,.28,18.15,mat('potMetal','#8c8e8a'),12);
    const tableMat=mat('ahwaTable','#6f5037'),chairCols=['#3e78a8','#8c3e36','#4d875c','#d1b84f'];
    for(let t=0;t<3;t++){box('ahwaTable',.78,.06,.78,1.8+t*1.35,.67,18.7,tableMat);box('ahwaTableLeg',.08,.65,.08,1.8+t*1.35,.33,18.7,tableMat);for(let s=0;s<2;s++){const cx=1.25+t*1.35+s*1.1,cm=mat('plasticChair'+((t+s)%4),chairCols[(t+s)%4]);box('plasticChairSeat',.5,.08,.5,cx,.45,18.72,cm);box('plasticChairBack',.5,.62,.07,cx,.75,18.95,cm);}for(let g=0;g<2;g++)cyl('teaGlass',.11,.21,1.65+t*1.35+g*.3,.83,18.7,mat('teaGlass','#a97a43','#241407'),10);box('dominoBoard',.42,.025,.28,1.8+t*1.35,.72,18.7,mat('domino','#d9d3c5'));}

    const produceCols=['#a94f3d','#5f874b','#d3b04d','#864a3e','#6d9457'];for(let i=0;i<8;i++){crate('produceCrate',31.8+i*.72,18.22,i%2?'#6c4d33':'#7b5838');for(let j=0;j<6;j++){const f=reg(BABYLON.MeshBuilder.CreateSphere('v8_produce',{diameter:.19,segments:6},scene));f.position.set(31.45+i*.72+(j%3)*.22,.37,18.03+Math.floor(j/3)*.24);f.material=mat('produce'+((i+j)%5),produceCols[(i+j)%5]);}}

    box('kioskBody',3.3,2.4,1.8,55,1.2,42,mat('kiosk','#3f4845'));sign('كشك عم سيد',55,2.55,41.05,3.1,.55,'#6f4c2f',0,'kioskSign');for(let r=0;r<4;r++)for(let c=0;c<7;c++)box('kioskPacket',.27,.18,.08,54.15+c*.28,.55+r*.22,41.02,mat('packet'+((r+c)%5),['#c34d40','#cfa53d','#4f789b','#6e8d4e','#875786'][(r+c)%5]));box('kioskCooler',.72,1.45,.66,57,.73,41.3,mat('cooler','#d7d9d6'));

    const routeNames=['رمسيس  ←  العتبة','فيصل  ←  التحرير','الدقي  ←  رمسيس'];for(let i=0;i<3;i++){box('routePost',.08,2.15,.08,-10+i*7,1.08,54,mat('routePost','#555a59'));sign(routeNames[i],-10+i*7,2.1,53.96,4.4,.52,i%2?'#e6d24a':'#d6e3ea',0,'routeBoard');}
    ['شارع السوق','حارة النور','ميدان البلد'].forEach((n,i)=>sign(n,-94+i*12,3.15,18.0,2.4,.5,'#2f6380',0,'streetPlate'));for(let i=0;i<14;i++)bareBulb(-88+i*13.3,3.2,(i%2?-18.6:18.6));
    for(let i=0;i<6;i++){cyl('manhole',1.05,.04,-72+i*29,.025,0,mat('manhole','#404340'),18);const patch=reg(BABYLON.MeshBuilder.CreateDisc('v8_asphaltPatch',{radius:.65+(i%3)*.15,tessellation:16},scene));patch.position.set(-78+i*31,.021,34-(i%2)*68);patch.rotation.x=Math.PI/2;patch.material=mat('asphaltPatch','#3b3c39');}for(let i=0;i<8;i++)box('drainGrate',.5,.035,.22,-90+i*25,.025,-7.3,mat('drain','#454846'));

    const catCols=['#806752','#b7a28d','#4b4742','#c58a55','#7c7f77','#a56f50'];function cat(x,z,i,rot){const root=new BABYLON.TransformNode('v8_catRoot',scene);root.position.set(x,0,z);root.rotation.y=rot;const cm=mat('cat'+i,catCols[i%catCols.length]);const body=reg(BABYLON.MeshBuilder.CreateSphere('v8_catBody',{diameter:.5,segments:8},scene));body.parent=root;body.position.set(0,.31,0);body.scaling.set(1.22,.7,.64);body.material=cm;const head=reg(BABYLON.MeshBuilder.CreateSphere('v8_catHead',{diameter:.33,segments:8},scene));head.parent=root;head.position.set(0,.44,-.31);head.material=cm;const tail=reg(BABYLON.MeshBuilder.CreateTube('v8_catTail',{path:[new BABYLON.Vector3(0,.35,.27),new BABYLON.Vector3(.13,.48,.54),new BABYLON.Vector3(.06,.66,.63)],radius:.04,tessellation:6},scene));tail.parent=root;tail.material=cm;}[[ -31,-18,0,.2],[23,18,1,2.4],[77,66,2,1.2],[-74,63,3,4.4],[56,-63,4,5.1],[14,42,5,1.7]].forEach(v=>cat(...v));

    const near=scene.meshes.filter(m=>m.name==='building').sort((a,b)=>Math.hypot(a.position.x,a.position.z)-Math.hypot(b.position.x,b.position.z)).slice(0,4);for(let i=0;i<near.length;i++){const b=near[i];b.computeWorldMatrix(true);const max=b.getBoundingInfo().boundingBox.maximumWorld,by=max.y+.1,cx=b.position.x+2.4,cz=b.position.z+2.1;if(i===0){box('pigeonCoopBase',3.2,.14,2.3,cx,by,cz,mat('coopWood','#6b503a'));for(const dx of [-1.45,1.45])for(const dz of [-1.0,1.0])box('coopPost',.08,1.55,.08,cx+dx,by+.78,cz+dz,mat('coopPost','#6b503a'));box('pigeonCoopRoof',3.4,.11,2.5,cx,by+1.58,cz,mat('coopRoof','#86684c'));}cyl('roofTank',1.15,1.35,b.position.x-2.2,by+.68,b.position.z+1.6,mat('tank','#333739'),14);const dish=reg(BABYLON.MeshBuilder.CreateDisc('v8_roofDish',{radius:.62,tessellation:18},scene));dish.position.set(b.position.x+1.8,by+.9,b.position.z-1.7);dish.rotation.set(Math.PI/2.7,0,.25+i*.2);dish.material=mat('dish','#b5b1a7');}

    scene.fogMode=BABYLON.Scene.FOGMODE_EXP2;scene.fogDensity=Math.max(scene.fogDensity||0,.00155);scene.fogColor=new BABYLON.Color3(.67,.61,.51);if(scene.imageProcessingConfiguration){scene.imageProcessingConfiguration.exposure=.98;scene.imageProcessingConfiguration.contrast=1.06;}

    return {meshCount:meshes.length,signs:scene.meshes.filter(m=>m.name.startsWith('v8_shopSign_')).length,awnings:scene.meshes.filter(m=>m.name==='v8_awning').length,routeBoards:scene.meshes.filter(m=>m.name.startsWith('v8_routeBoard_')).length,bulbs:scene.meshes.filter(m=>m.name==='v8_hangingBulb').length,cats:scene.transformNodes.filter(n=>n.name==='v8_catRoot').length,marketCrates:scene.meshes.filter(m=>m.name==='v8_produceCrate').length,manholes:scene.meshes.filter(m=>m.name==='v8_manhole').length,shopNames:[...shopNames]};
  }

  function addNaturalMicroMotion(scene){
    const roots=scene.transformNodes.filter(n=>n.name==='personRoot');
    const people=roots.map((root,i)=>{const visual=scene.transformNodes.find(n=>n.name==='personVisual'&&n.parent===root);const head=scene.meshes.find(n=>n.name==='head'&&n.parent===visual);const torso=scene.meshes.find(n=>n.name==='torso'&&n.parent===visual);return {root,visual,head,torso,i};});
    scene.onBeforeRenderObservable.add(()=>{const t=performance.now()/1000;for(const p of people){if(p.head)p.head.rotation.y=Math.sin(t*.52+p.i*1.31)*.028+Math.sin(t*.19+p.i)*.008;if(p.torso)p.torso.rotation.y=Math.sin(t*.48+p.i*.87)*.007;}});
    return people.length;
  }

  async function boot(){
    try{
      const response=await fetch('game-v6.js',{cache:'no-store'});if(!response.ok)throw new Error('تعذر تحميل V6');let source=await response.text();
      source=replaceOrThrow(source,/speed:\.014\+\(i%5\)\*\.0022,cadence:\.88\+\(i%4\)\*\.08/,'speed:.0162+(i%5)*.00155,cadence:1+(i%4)*.035,stepScale:.94+(i%4)*.025','pedestrian speed');
      source=replaceOrThrow(source,/if\(moving\)p\.phase\+=\.082\*dt\*p\.cadence;/,'if(moving)p.phase+=p.speed*dt*p.stepScale;','distance synced gait phase');
      source=replaceOrThrow(source,/else p\.phase\+=\.025\*dt;/,'else p.phase+=.008*dt;','idle phase');
      source=replaceOrThrow(source,/const hip=s\*\.34\*stride;/,'const hip=s*.29*stride;','hip swing');
      source=replaceOrThrow(source,/\.035\+Math\.max\(0,-s\)\*\.52\*stride;/,'.02+Math.max(0,-s)*.30*stride;','left knee');
      source=replaceOrThrow(source,/\.035\+Math\.max\(0,s\)\*\.52\*stride;/,'.02+Math.max(0,s)*.30*stride;','right knee');
      source=replaceOrThrow(source,/p\.footL\.rotation\.x=-Math\.max\(0,s\)\*\.11\*stride;/,'p.footL.rotation.x=-(p.hipL.rotation.x+p.kneeL.rotation.x)*.82+Math.max(0,s)*.035*stride;','left foot plant');
      source=replaceOrThrow(source,/p\.footR\.rotation\.x=-Math\.max\(0,-s\)\*\.11\*stride;/,'p.footR.rotation.x=-(p.hipR.rotation.x+p.kneeR.rotation.x)*.82+Math.max(0,-s)*.035*stride;','right foot plant');
      source=replaceOrThrow(source,/p\.shoulderL\.rotation\.x=-s\*\.25\*stride;p\.shoulderR\.rotation\.x=s\*\.25\*stride;/,'p.shoulderL.rotation.x=-s*.16*stride;p.shoulderR.rotation.x=s*.16*stride;','arm swing');
      source=replaceOrThrow(source,/p\.elbowL\.rotation\.x=\.08\+Math\.max\(0,s\)\*\.17\*stride;p\.elbowR\.rotation\.x=\.08\+Math\.max\(0,-s\)\*\.17\*stride;/,'p.elbowL.rotation.x=.035+Math.max(0,s)*.055*stride;p.elbowR.rotation.x=.035+Math.max(0,-s)*.055*stride;','elbow swing');
      source=replaceOrThrow(source,/p\.visual\.position\.y=Math\.abs\(Math\.sin\(g\*2\)\)\*\.017\*stride;/,'p.visual.position.y=Math.abs(Math.sin(g*2))*.0065*stride;','pelvis bob');
      source=replaceOrThrow(source,/p\.visual\.rotation\.z=Math\.sin\(g\)\*\.008\*stride;/,'p.visual.rotation.z=Math.sin(g)*.0022*stride;','body roll');
      source=replaceOrThrow(source,/p\.torso\.rotation\.x=\.018\+Math\.abs\(s\)\*\.006\*stride;/,'p.torso.rotation.x=.0035+Math.abs(s)*.0015*stride;','torso posture');
      source=source.replaceAll('p.turning=12;','p.turning=3;');source=replaceOrThrow(source,/delta\*Math\.min\(1,\.12\*dt\)/,'delta*Math.min(1,.22*dt)','turn smoothing');
      source+='\n//# sourceURL=game-v8-v6-core.js';(0,eval)(source);

      const scene=await waitForV6(),details=addEgyptDetails(scene),microMotionPeople=addNaturalMicroMotion(scene),gaitCycleMeters=(Math.PI*2)/(4.55*.9775);
      window.__V8_PATCH={version:8,pedestrians:'distance-synced-footplant',egyptDetails:'researched-cairo-street-layers',atmosphere:'warm-dusty-lived-in',gaitCycleMeters,details,microMotionPeople};
      if(window.__egyptDebug){window.__egyptDebug.v8State=()=>({...window.__V8_PATCH});window.__egyptDebug.v8VisualState=()=>({details:{...details},decorativeCollisions:scene.meshes.filter(m=>m.name.startsWith('v8_')&&m.checkCollisions).length,v8Meshes:scene.meshes.filter(m=>m.name.startsWith('v8_')).length,fogDensity:scene.fogDensity,gaitCycleMeters});}
      const kicker=document.querySelector('.kicker');if(kicker)kicker.textContent='HAYAT MASR • V8';const tagline=document.querySelector('.tagline');if(tagline)tagline.textContent='حياة مصر — شارع مصري أعيش: محلات وورش وقهوة وسوق وتفاصيل عمارات أكتر، مع مشية مرتبطة بالمسافة بدل الخطوات القصيرة الصناعية.';const foot=document.querySelector('.menuFoot');if(foot)foot.textContent='V8 مبنية على مراجع بصرية لشوارع القاهرة اليومية، بأسماء محلات خيالية وهوية مصرية أصلية.';
    }catch(err){fail('V8 ما اشتغلتش بالشكل المطلوب',err);}
  }

  boot();
})();
