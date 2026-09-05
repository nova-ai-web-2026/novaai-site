(() => {
  'use strict';
  if(window.__EGYPT_STREET_FIX)return;
  window.__EGYPT_STREET_FIX={ready:false};
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function install(){
    for(let i=0;!window.__V12_WORLD?.ready;i++){
      if(i>600)throw new Error('Street scene did not become ready');
      await sleep(100);
    }
    const B=BABYLON,scene=B.Engine.LastCreatedEngine.scenes[0];
    // A back-facing plane mirrors its lettering. Give each side its own geometry
    // and natural UVs instead of guessing the camera side from world rotation.
    let signs=0;
    for(const mesh of [...scene.meshes]){
      const texture=mesh.material?.diffuseTexture;
      if(!(texture instanceof B.DynamicTexture)||mesh.getTotalVertices()!==4||mesh.getTotalIndices()!==6)continue;
      texture.uScale=1;texture.uOffset=0;
      const material=mesh.material.clone(mesh.name+'_readable');
      material.backFaceCulling=true;mesh.material=material;
      const back=mesh.clone(mesh.name+'_readableBack',mesh,true);
      back.position.set(0,0,.002);back.rotation.set(0,Math.PI,0);
      back.rotationQuaternion=null;back.scaling.set(1,1,1);
      back.isPickable=false;back.checkCollisions=false;
      mesh.metadata={...mesh.metadata,readableArabic:true};signs++;
    }
    const material=(name,color)=>{
      const m=new B.StandardMaterial('street_'+name,scene);
      m.diffuseColor=B.Color3.FromHexString(color);m.specularColor=B.Color3.Black();return m;
    };
    let seed=1162;
    const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const palette=['#c9b798','#b9a589','#d6c6aa','#ac9780'];
    const plaster=palette.map((color,index)=>{
      const m=material('plaster_'+index,color),t=new B.DynamicTexture('street_plaster_'+index,512,scene,false),c=t.getContext();
      c.fillStyle=color;c.fillRect(0,0,512,512);
      // Fine plaster grain and soft vertical weathering, with occasional exposed
      // brick at the base; existing windows and balconies remain separate meshes.
      for(let i=0;i<3600;i++){c.fillStyle=`rgba(68,51,36,${random()*.10})`;c.fillRect(random()*512,random()*512,1+random()*3,1+random()*5);}
      for(let i=0;i<32;i++){
        const x=random()*512,y=random()*420,g=c.createLinearGradient(x,y,x,y+90);
        g.addColorStop(0,'rgba(71,57,42,.09)');g.addColorStop(1,'rgba(71,57,42,0)');c.fillStyle=g;c.fillRect(x,y,8+random()*15,90);
      }
      if(index===1)for(let row=0;row<6;row++)for(let col=0;col<12-row;col++){
        c.fillStyle=['#a76c4c','#996147','#b77c57'][(row+col)%3];
        c.fillRect(col*22-(row%2)*11,512-row*10-10,20,8);
      }
      t.update();m.diffuseTexture=t;m.diffuseColor=B.Color3.White();return m;
    });
    const trim=material('concrete','#b5aa97'),iron=material('iron','#4f5550'),terracotta=material('terracotta','#a06347'),leaf=material('leaf','#557246');
    let details=0;
    const box=(name,w,h,d,x,y,z,m)=>{
      const mesh=B.MeshBuilder.CreateBox('street_'+name,{width:w,height:h,depth:d},scene);
      mesh.position.set(x,y,z);mesh.material=m;mesh.isPickable=false;mesh.checkCollisions=false;details++;return mesh;
    };
    const buildings=scene.meshes.filter(m=>m.name==='building');
    buildings.forEach((building,index)=>{
      building.material=plaster[index%plaster.length];building.computeWorldMatrix(true);
      const {minimumWorld:min,maximumWorld:max}=building.getBoundingInfo().boundingBox;
      const x=building.position.x,z=min.z-.08,width=max.x-min.x;
      for(let y=3.3;y<max.y-.5;y+=3.1)box('floorBand',width+.12,.10,.18,x,y,z,trim);
      // A narrow drainpipe beside the facade, clear of the walking lane.
      box('drainpipe',.07,max.y-.3,.09,max.x-.3,max.y/2,z-.04,iron);
      if(index%2===0){
        for(const dx of [-width/2+.65,width/2-.65]){
          const pot=B.MeshBuilder.CreateCylinder('street_planter',{diameterTop:.52,diameterBottom:.36,height:.5,tessellation:8},scene);
          pot.position.set(x+dx,.25,z-.55);pot.material=terracotta;pot.isPickable=false;pot.checkCollisions=false;
          const shrub=B.MeshBuilder.CreateSphere('street_plant',{diameter:.68,segments:5},scene);
          shrub.position.set(x+dx,.70,z-.55);shrub.scaling.y=1.2;shrub.material=leaf;shrub.isPickable=false;shrub.checkCollisions=false;details+=2;
        }
      }
    });
    // Corrugated shop shutters replace featureless flat colour without adding
    // hundreds of bars to the render loop.
    const shutter=material('shutter','#789086'),st=new B.DynamicTexture('street_shutter',256,scene,false),sc=st.getContext();
    sc.fillStyle='#73877c';sc.fillRect(0,0,256,256);
    for(let y=0;y<256;y+=10){sc.fillStyle='#4b6059';sc.fillRect(0,y,256,2);sc.fillStyle='#93a397';sc.fillRect(0,y+2,256,1);}
    st.update();shutter.diffuseTexture=st;shutter.diffuseColor=B.Color3.White();
    for(const mesh of scene.meshes)if(/rollingShutter/i.test(mesh.name))mesh.material=shutter;
    // Small resurfacing patches stay flush with existing roads and do not affect
    // collisions, pathfinding or the established street layout.
    const asphalt=material('asphaltRepair','#55554e');
    for(const road of [-72,-24,24,72])for(let i=0;i<3;i++){
      const p=box('roadRepair',1.1+random(),.006,2+random()*2,road-2+random()*4,.018,-65+i*52+random()*8,asphalt);p.rotation.y=random()*.18;
    }
    window.__EGYPT_STREET_FIX={ready:true,version:'11.16.2',signs,buildings:buildings.length,details};
  }
  install().catch(error=>{window.__EGYPT_STREET_FIX.error=String(error);console.error(error);});
})();
