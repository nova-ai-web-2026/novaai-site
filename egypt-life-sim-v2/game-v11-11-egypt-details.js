(() => {
  'use strict';

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const PREFIX='v1111_';

  async function waitForScene(){
    for(let i=0;i<260;i++){
      const scene=window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0];
      if(scene&&scene.meshes?.length>50)return scene;
      await sleep(50);
    }
    throw new Error('V11.11 could not find the active scene');
  }

  function install(scene){
    if(window.__V1111_DETAILS?.ready)return;
    const beforeMeshes=scene.meshes.length;
    const mats=new Map();
    const counters={rooftopTanks:0,satelliteDishes:0,roofAntennas:0,acUnits:0,streetSigns:0,wallPosters:0,egyptFlags:0,ahwaProps:0,marketProps:0,utilityWires:0};

    const mat=(name,hex,emit='')=>{
      const key=name+hex+emit;if(mats.has(key))return mats.get(key);
      const m=new BABYLON.StandardMaterial(PREFIX+'mat_'+name,scene);m.diffuseColor=BABYLON.Color3.FromHexString(hex);m.specularColor=new BABYLON.Color3(.02,.02,.02);if(emit)m.emissiveColor=BABYLON.Color3.FromHexString(emit);mats.set(key,m);return m;
    };
    const reg=m=>{m.checkCollisions=false;m.isPickable=false;return m;};
    const box=(name,w,h,d,x,y,z,material,ry=0)=>{const m=reg(BABYLON.MeshBuilder.CreateBox(PREFIX+name,{width:w,height:h,depth:d},scene));m.position.set(x,y,z);m.rotation.y=ry;m.material=material;return m;};
    const cyl=(name,dia,h,x,y,z,material,tess=14)=>{const m=reg(BABYLON.MeshBuilder.CreateCylinder(PREFIX+name,{diameter:dia,height:h,tessellation:tess},scene));m.position.set(x,y,z);m.material=material;return m;};
    const planeText=(name,text,x,y,z,w,h,bg='#315f78',fg='#fff5df',ry=Math.PI)=>{
      const tex=new BABYLON.DynamicTexture(PREFIX+'tex_'+name,{width:768,height:192},scene,false),c=tex.getContext();
      c.save();c.clearRect(0,0,768,192);c.fillStyle=bg;c.fillRect(0,0,768,192);c.direction='rtl';c.textAlign='center';c.textBaseline='middle';c.fillStyle=fg;c.font='700 58px Tahoma,Arial,sans-serif';c.fillText('\u2067'+text+'\u2069',384,100,700);c.restore();tex.update();
      const sm=new BABYLON.StandardMaterial(PREFIX+'signmat_'+name,scene);sm.diffuseTexture=tex;sm.emissiveColor=new BABYLON.Color3(.035,.03,.025);sm.backFaceCulling=false;
      const p=reg(BABYLON.MeshBuilder.CreatePlane(PREFIX+name,{width:w,height:h},scene));p.position.set(x,y,z);p.rotation.y=ry;p.material=sm;return p;
    };

    // Rooftops: additions only. Never disable, remove, re-parent or mutate legacy meshes.
    const buildings=scene.meshes.filter(m=>m.name==='building').slice(0,20);
    buildings.forEach((b,i)=>{
      b.computeWorldMatrix(true);const bb=b.getBoundingInfo().boundingBox,min=bb.minimumWorld,max=bb.maximumWorld,roofY=max.y;
      if(i%2===0){
        const tank=cyl('roofTank_'+i,1.28,1.35,b.position.x+(i%3-1)*2.1,roofY+.72,b.position.z+1.4,mat('tank','#242726'),18);tank.scaling.x=.92;counters.rooftopTanks++;
        box('tankBase_'+i,1.45,.12,1.45,tank.position.x,roofY+.08,tank.position.z,mat('tankBase','#6b6257')); 
      }
      if(i%2===1||i%5===0){
        const px=b.position.x-2.2+(i%3)*1.15,pz=b.position.z-1.8+(i%2)*1.1;
        const pole=cyl('dishPole_'+i,.07,1.15,px,roofY+.58,pz,mat('dishMetal','#6d706d'),10);
        const dish=reg(BABYLON.MeshBuilder.CreateDisc(PREFIX+'satelliteDish_'+i,{radius:.72,tessellation:28,sideOrientation:BABYLON.Mesh.DOUBLESIDE},scene));dish.position.set(px,roofY+1.12,pz);dish.rotation.x=Math.PI*.34;dish.rotation.z=(i%2?-.18:.18);dish.material=mat('dish','#b7b5aa');counters.satelliteDishes++;
        cyl('dishFeed_'+i,.055,.48,px+.18,roofY+1.38,pz-.12,mat('dishMetal','#6d706d'),8).rotation.z=.58;
      }
      if(i%3===0){
        const x=b.position.x+2.5,z=b.position.z+2.0;const pole=cyl('antennaPole_'+i,.045,1.9,x,roofY+.95,z,mat('antenna','#4e504d'),8);
        for(let q=-2;q<=2;q++)box('antennaBar_'+i+'_'+q,1.05-Math.abs(q)*.12,.025,.025,x,roofY+1.28+q*.18,z,mat('antenna','#4e504d'));
        counters.roofAntennas++;
      }

      // Exterior AC units on facades.
      if(i<16){
        const front=min.z-.13,y=Math.min(max.y-1.0,2.65+(i%3)*1.25),x=b.position.x+(i%2?2.5:-2.4);
        box('acBody_'+i,1.08,.62,.34,x,y,front,mat('ac','#ddd9cd'));
        const fan=cyl('acFan_'+i,.38,.035,x,y,front-.19,mat('acFan','#6b6d69'),18);fan.rotation.x=Math.PI/2;
        box('acBracketA_'+i,.055,.42,.36,x-.38,y-.43,front+.04,mat('bracket','#51534f'));
        box('acBracketB_'+i,.055,.42,.36,x+.38,y-.43,front+.04,mat('bracket','#51534f'));
        counters.acUnits++;
      }
    });

    // Arabic street identity: small signs that complement existing shop signage.
    const streetSigns=[
      ['street_market','شارع السوق',-30,3.15,-18.45,0],['street_station','شارع المحطة',30,3.15,-18.45,0],
      ['street_saada','حارة السعادة',-30,3.15,18.45,Math.PI],['street_square','ميدان الحارة',30,3.15,18.45,Math.PI],
      ['street_school','شارع المدرسة',-78,3.1,30,Math.PI/2],['street_workshop','شارع الورش',78,3.1,-30,-Math.PI/2]
    ];
    streetSigns.forEach(([n,t,x,y,z,r])=>{planeText(n,t,x,y,z,3.5,.62,'#245f82','#f7f2df',r);counters.streetSigns++;});

    // Everyday wall posters / handwritten notices.
    const posters=[
      ['poster_rent','شقة للإيجار',-96,2.0,-82.72,2.1,.54,'#eee2c1','#563e2e',Math.PI],
      ['poster_fix','تصليح أجهزة',-48,1.75,17.42,1.9,.5,'#e7d6a7','#51382b',0],
      ['poster_tutor','سنتر تعليمي',0,2.05,-10.95,2.2,.54,'#f0dfb3','#49352c',Math.PI],
      ['poster_move','نقل عفش',48,1.8,17.42,1.75,.48,'#ddc99d','#513b31',0],
      ['poster_worker','مطلوب عامل',72,1.9,-18.35,1.85,.5,'#ead8a8','#4f382e',0],
      ['poster_offer','عرض اليوم',-72,1.8,-18.35,1.7,.48,'#f0d9a0','#5c3d2d',0]
    ];
    posters.forEach(([n,t,x,y,z,w,h,bg,fg,r])=>{planeText(n,t,x,y,z,w,h,bg,fg,r);counters.wallPosters++;});

    // Egyptian flags on a few balconies / facades.
    const flagMat=()=>{
      const tex=new BABYLON.DynamicTexture(PREFIX+'flagTex_'+Math.random(),{width:384,height:256},scene,false),c=tex.getContext();
      c.fillStyle='#ce1126';c.fillRect(0,0,384,85);c.fillStyle='#fff';c.fillRect(0,85,384,86);c.fillStyle='#000';c.fillRect(0,171,384,85);tex.update();
      const m=new BABYLON.StandardMaterial(PREFIX+'flagMat_'+Math.random(),scene);m.diffuseTexture=tex;m.backFaceCulling=false;m.specularColor=BABYLON.Color3.Black();return m;
    };
    [[-48,4.3,-12.1],[48,5.0,-12.1],[0,4.65,35.1]].forEach(([x,y,z],i)=>{const p=reg(BABYLON.MeshBuilder.CreatePlane(PREFIX+'egyptFlag_'+i,{width:1.65,height:1.05},scene));p.position.set(x,y,z);p.rotation.y=Math.PI;p.material=flagMat();counters.egyptFlags++;});

    // Ahwa micro-detail: plastic chairs, tea tray, glasses and backgammon/domino tabletop clutter.
    const chairCols=['#2d6f9d','#a9463e','#4f8a5b','#caa83f'];
    [[-47.1,36.6],[-48.5,37.4],[-50.0,36.3],[-46.0,34.9]].forEach(([x,z],i)=>{
      const cm=mat('chair'+i,chairCols[i%chairCols.length]);box('ahwaChairSeat_'+i,.52,.08,.52,x,.45,z,cm);box('ahwaChairBack_'+i,.52,.64,.07,x,.76,z+.23,cm);counters.ahwaProps+=2;
    });
    const tray=reg(BABYLON.MeshBuilder.CreateCylinder(PREFIX+'teaTray',{diameter:1.05,height:.045,tessellation:24},scene));tray.position.set(-48.4,.82,35.5);tray.material=mat('tray','#9b8f72');counters.ahwaProps++;
    for(let i=0;i<4;i++){const g=cyl('teaGlass_'+i,.12,.22,-48.72+i*.22,.96,35.5,mat('tea','#a66f35','#281406'),12);g.scaling.x=.78;counters.ahwaProps++;}
    box('dominoBox',.52,.12,.34,-47.75,.87,35.55,mat('dominoBox','#5c4632'));counters.ahwaProps++;

    // Market / street-vendor clutter, intentionally non-collidable.
    const wood=mat('crate','#745337'),blue=mat('waterCrate','#315d7a'),bottle=mat('bottle','#6c9aa7');
    for(let i=0;i<6;i++){box('breadCrate_'+i,.92,.28,.62,44.8+(i%3)*1.05,.18+Math.floor(i/3)*.31,-39.5,wood);counters.marketProps++;}
    for(let i=0;i<8;i++){box('waterCrate_'+i,.46,.27,.36,49.2+(i%4)*.5,.18+Math.floor(i/4)*.31,-39.5,blue);for(let j=0;j<3;j++)cyl('waterBottle_'+i+'_'+j,.09,.29,49.05+(i%4)*.5+j*.12,.48+Math.floor(i/4)*.31,-39.5,bottle,8);counters.marketProps+=4;}

    // Loose facade utility cables: visual only, no collision.
    const cable=mat('cable','#292a28');
    [[-88,-18.7,-54,-18.7,3.6],[-54,-18.7,-22,-18.7,4.05],[-22,18.7,14,18.7,3.8],[14,18.7,52,18.7,4.2],[52,-18.7,84,-18.7,3.55]].forEach(([x1,z1,x2,z2,y],i)=>{
      const mx=(x1+x2)/2,mz=(z1+z2)/2,len=Math.hypot(x2-x1,z2-z1);const w=box('utilityWire_'+i,len,.028,.028,mx,y,mz,cable);w.rotation.z=(i%2?.025:-.03);counters.utilityWires++;
    });

    const addedMeshes=scene.meshes.length-beforeMeshes;
    window.__V1111_DETAILS={version:'11.11',ready:true,additiveOnly:true,removedMeshes:0,disabledLegacyMeshes:0,beforeMeshes,afterMeshes:scene.meshes.length,addedMeshes,counters};
    window.__egyptDebug=window.__egyptDebug||{};
    window.__egyptDebug.v1111DetailsState=()=>JSON.parse(JSON.stringify(window.__V1111_DETAILS));
    console.info('V11.11 Egyptian detail layer ready',window.__V1111_DETAILS);
  }

  waitForScene().then(install).catch(err=>console.error('V11.11 Egyptian detail layer failed',err));
})();
