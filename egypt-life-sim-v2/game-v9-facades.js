(() => {
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const fail=(msg,err)=>{console.error(msg,err||'');const e=document.getElementById('errorBox');if(e){e.style.display='block';e.textContent=msg+(err?.message?': '+err.message:'');}};

  async function waitForV9(){
    for(let i=0;i<200;i++){
      const scene=window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0];
      if(scene&&window.__V9_PATCH?.version===9)return scene;
      await sleep(50);
    }
    throw new Error('V9 rig did not finish before facade pass');
  }

  function mat(scene,name,hex,emit=''){
    const key='v9f_'+name;
    let m=scene.materials.find(x=>x.name===key);
    if(m)return m;
    m=new BABYLON.StandardMaterial(key,scene);
    m.diffuseColor=BABYLON.Color3.FromHexString(hex);
    m.specularColor=new BABYLON.Color3(.015,.015,.015);
    if(emit)m.emissiveColor=BABYLON.Color3.FromHexString(emit);
    return m;
  }

  function wb(scene,name,w,h,d,x,y,z,material){
    const m=BABYLON.MeshBuilder.CreateBox('v9f_'+name,{width:w,height:h,depth:d},scene);
    m.position.set(x,y,z);m.material=material;m.checkCollisions=false;m.isPickable=false;return m;
  }

  function addBackWindow(scene,x,y,z,index){
    const glass=mat(scene,'glass','#253237','#071014'),frame=mat(scene,'frame','#c6b79f'),shutter=mat(scene,'shutter','#62584d');
    wb(scene,'backWindow',1.78,1.22,.1,x,y,z+.055,glass);
    wb(scene,'backFrameT',1.96,.075,.14,x,y+.65,z+.095,frame);wb(scene,'backFrameB',1.96,.075,.14,x,y-.65,z+.095,frame);
    wb(scene,'backFrameL',.075,1.3,.14,x-.94,y,z+.095,frame);wb(scene,'backFrameR',.075,1.3,.14,x+.94,y,z+.095,frame);
    wb(scene,'backMullion',.055,1.13,.13,x,y,z+.11,frame);
    if(index%7===0)wb(scene,'backShutter',1.8,.62,.08,x,y-.18,z+.14,shutter);
  }

  function addLeftWindow(scene,x,y,z,index){
    const glass=mat(scene,'glass','#253237','#071014'),frame=mat(scene,'frame','#c6b79f'),shutter=mat(scene,'shutter','#62584d');
    wb(scene,'leftWindow',.1,1.22,1.78,x-.055,y,z,glass);
    wb(scene,'leftFrameT',.14,.075,1.96,x-.095,y+.65,z,frame);wb(scene,'leftFrameB',.14,.075,1.96,x-.095,y-.65,z,frame);
    wb(scene,'leftFrameA',.14,1.3,.075,x-.095,y,z-.94,frame);wb(scene,'leftFrameB2',.14,1.3,.075,x-.095,y,z+.94,frame);
    wb(scene,'leftMullion',.13,1.13,.055,x-.11,y,z,frame);
    if(index%8===0)wb(scene,'leftShutter',.08,.62,1.8,x-.14,y-.18,z,shutter);
  }

  function addBackBalcony(scene,min,max,y,index){
    const rail=mat(scene,'rail','#45423d'),slab=mat(scene,'slab','#ad9b82');
    const width=Math.min((max.x-min.x)*.48,8.5),cx=(min.x+max.x)/2,z=max.z+.58;
    wb(scene,'backBalconySlab',width,.14,1.15,cx,y-.66,z,slab);
    wb(scene,'backBalconyRail',width,.055,.055,cx,y-.08,max.z+1.1,rail);
    const posts=Math.max(5,Math.floor(width/.75));
    for(let p=0;p<=posts;p++)wb(scene,'backBalconyPost',.04,.56,.04,cx-width/2+p*width/posts,y-.37,max.z+1.1,rail);
    if(index%2===0){
      const colors=['#d8d0c2','#7a8797','#a65d51','#c5ad59'];
      for(let i=0;i<4;i++)wb(scene,'backLaundry',.5,.58,.025,cx-1.2+i*.78,y-.02-(i%2)*.05,max.z+1.14,mat(scene,'cloth'+i,colors[i]));
    }
  }

  function addACBack(scene,x,y,z){
    const ac=mat(scene,'ac','#d2cec4'),vent=mat(scene,'vent','#6e706e');
    wb(scene,'backAC',.8,.48,.32,x,y,z+.19,ac);
    for(let i=-2;i<=2;i++)wb(scene,'backACVent',.5,.022,.015,x,y+i*.056,z+.36,vent);
  }

  function addACLeft(scene,x,y,z){
    const ac=mat(scene,'ac','#d2cec4'),vent=mat(scene,'vent','#6e706e');
    wb(scene,'leftAC',.32,.48,.8,x-.19,y,z,ac);
    for(let i=-2;i<=2;i++)wb(scene,'leftACVent',.015,.022,.5,x-.36,y+i*.056,z,vent);
  }

  function skinBuilding(scene,b,index){
    b.computeWorldMatrix(true);
    const bb=b.getBoundingInfo().boundingBox,min=bb.minimumWorld,max=bb.maximumWorld;
    const width=max.x-min.x,depth=max.z-min.z,height=max.y-min.y,floors=Math.max(3,Math.round(height/3.05));
    const colsBack=Math.max(2,Math.floor(width/5.4)),colsLeft=Math.max(2,Math.floor(depth/5.5));
    let windows=0;
    for(let f=1;f<floors;f++){
      const y=f*3.05+1.4;
      for(let c=0;c<colsBack;c++){
        const x=min.x+(c+.5)*width/colsBack;addBackWindow(scene,x,y,max.z+.03,index+f*11+c);windows++;
        if((index+f+c)%9===0)addACBack(scene,x+1.2,y-.1,max.z+.08);
      }
      for(let c=0;c<colsLeft;c++){
        const z=min.z+(c+.5)*depth/colsLeft;addLeftWindow(scene,min.x-.03,y,z,index+f*13+c);windows++;
        if((index+f+c)%10===0)addACLeft(scene,min.x-.08,y-.1,z+1.1);
      }
      if(f%2===1&&width>22)addBackBalcony(scene,min,max,f*3.05+1.2,index+f);
    }

    const band=mat(scene,'band','#8d7d68'),door=mat(scene,'door','#4c382c');
    for(let f=1;f<floors;f++){
      const y=f*3.05-.04;wb(scene,'backFloorBand',width,.08,.09,(min.x+max.x)/2,y,max.z+.07,band);wb(scene,'leftFloorBand',.09,.08,depth,min.x-.07,y,(min.z+max.z)/2,band);
    }
    wb(scene,'backDoor',1.5,2.25,.14,(min.x+max.x)/2,1.16,max.z+.09,door);
    wb(scene,'backDoorTop',1.8,.12,.18,(min.x+max.x)/2,2.35,max.z+.1,band);
    wb(scene,'leftDrain',.1,height-.7,.1,min.x-.14,height/2,(min.z+max.z)/2,mat(scene,'pipe','#6f6b64'));
    return windows;
  }

  async function boot(){
    try{
      const scene=await waitForV9();
      const buildings=scene.meshes.filter(m=>m.name==='building');
      let windows=0;
      buildings.forEach((b,i)=>{windows+=skinBuilding(scene,b,i);});
      const newMeshes=scene.meshes.filter(m=>m.name.startsWith('v9f_'));
      window.__V9_FACADES={version:1,buildings:buildings.length,windows,newMeshes:newMeshes.length,blankSidesFilled:true,collisions:newMeshes.filter(m=>m.checkCollisions).length};
      window.__V9_PATCH.facades='four-sided-lived-in-buildings';
      if(window.__egyptDebug)window.__egyptDebug.v9FacadeState=()=>({...window.__V9_FACADES});
    }catch(err){fail('V9 four-side facade rebuild failed',err);}
  }

  boot();
})();