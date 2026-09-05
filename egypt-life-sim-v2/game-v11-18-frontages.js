(() => {
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function install(){
    for(let i=0;!window.__EGYPT_STREET_FIX?.ready;i++){if(i>600)throw new Error('Street details unavailable');await sleep(100);}
    const B=BABYLON,scene=B.Engine.LastCreatedEngine.scenes[0];
    const mat=(name,color)=>{const m=new B.StandardMaterial('frontage_'+name,scene);m.diffuseColor=B.Color3.FromHexString(color);m.specularColor=B.Color3.Black();return m;};
    const metal=mat('iron','#454b49'),wood=mat('wood','#594737'),frame=mat('frame','#c0af91');
    function box(name,w,h,d,parent,x,y,z,material){const m=B.MeshBuilder.CreateBox('frontage_'+name,{width:w,height:h,depth:d},scene);m.parent=parent;m.position.set(x,y,z);m.material=material;m.isPickable=false;m.checkCollisions=false;return m;}
    const plates=scene.meshes.filter(m=>m.metadata?.readableArabic&&!m.name.endsWith('_readableBack'));
    const legacy=plates.filter(m=>m.name.startsWith('v11_legacyShop_'));
    const hosts=scene.meshes.filter(m=>m.name==='building'||/^v12_building_/.test(m.name)||/shopFrame|kioskBody|homeWall|fulHot|stall/.test(m.name));
    hosts.forEach(m=>m.computeWorldMatrix(true));
    let wallMounted=0,postMounted=0,vehicleMounted=0,duplicates=0;
    for(const sign of plates){
      if(!sign.isEnabled())continue;
      if(sign.name.startsWith('v8_shopSign_')&&legacy.some(m=>B.Vector3.Distance(m.position,sign.position)<4.5)){sign.setEnabled(false);duplicates++;continue;}
      sign.computeWorldMatrix(true);
      const bounds=sign.getBoundingInfo().boundingBox,w=bounds.extendSize.x*2,h=bounds.extendSize.y*2,pos=sign.getAbsolutePosition();
      const backing=box('signBack_'+sign.uniqueId,w+.09,h+.09,.07,sign,0,0,.04,wood);
      const back=scene.getMeshByName(sign.name+'_readableBack');if(back)back.position.z=.081;
      const supports=[backing.name];
      let mount='';
      if(sign.parent){mount='vehicle-or-prop';vehicleMounted++;}
      else{
        const host=hosts.find(m=>{
          const b=m.getBoundingInfo().boundingBox,min=b.minimumWorld,max=b.maximumWorld;
          const dx=Math.max(min.x-pos.x,0,pos.x-max.x),dy=Math.max(min.y-pos.y,0,pos.y-max.y),dz=Math.max(min.z-pos.z,0,pos.z-max.z);
          return Math.hypot(dx,dy,dz)<.8;
        });
        if(host){
          mount='wall-brackets';wallMounted++;
          // Short brackets meet the facade behind the sign; the readable faces
          // remain a few centimetres in front of the solid backing.
          const hb=host.getBoundingInfo().boundingBox,nearest=new B.Vector3(Math.max(hb.minimumWorld.x,Math.min(pos.x,hb.maximumWorld.x)),Math.max(hb.minimumWorld.y,Math.min(pos.y,hb.maximumWorld.y)),Math.max(hb.minimumWorld.z,Math.min(pos.z,hb.maximumWorld.z)));
          const local=B.Vector3.TransformCoordinates(nearest,sign.getWorldMatrix().clone().invert());
          for(const x of [-w*.36,w*.36])supports.push(box('bracket_'+sign.uniqueId+'_'+x,.065,.09,Math.max(.08,Math.abs(local.z-.04)),sign,x,-h*.28,(local.z+.04)/2,metal).name);
          sign.metadata.host=host.name;
        }else{
          mount='ground-posts';postMounted++;
          const height=Math.max(.2,pos.y-h/2+.04);
          for(const x of [-w*.36,w*.36])supports.push(box('post_'+sign.uniqueId+'_'+x,.075,height,.075,sign,x,-h/2-height/2,.04,metal).name);
        }
      }
      sign.metadata={...sign.metadata,mount,supports};
    }
    const textures=new Map();
    function shopMaterial(type){
      if(textures.has(type))return textures.get(type);
      const m=mat('shop_'+type,'#ffffff'),tex=new B.DynamicTexture('frontage_shop_'+type,{width:512,height:256},scene,false),c=tex.getContext();
      c.fillStyle='#383d37';c.fillRect(0,0,512,256);c.fillStyle='#9c8760';c.fillRect(18,12,476,216);
      c.fillStyle='#514b3b';c.fillRect(28,24,456,164);
      if(['kiosk','produce','grocery'].includes(type)){
        const colors=['#a26442','#b79543','#657b48','#b6ab83','#6f8b8b'];
        for(let r=0;r<3;r++){for(let col=0;col<11;col++){c.fillStyle=colors[(r+col)%5];c.fillRect(39+col*40,38+r*46,21,30);c.fillStyle='#d1c2a0';c.fillRect(41+col*40,45+r*46,17,6);}c.fillStyle='#3d342b';c.fillRect(30,70+r*46,452,7);}
      }else{
        c.fillStyle='#b9aa88';c.fillRect(40,46,150,6);c.fillRect(300,46,160,6);
        for(let i=0;i<7;i++){c.fillStyle=type==='bakery'?'#c59b58':'#8f988d';c.beginPath();c.ellipse(56+i*64,144,23,12,0,0,Math.PI*2);c.fill();}
        c.fillStyle='#ba9c66';c.fillRect(31,164,450,18);c.fillStyle='#63513d';c.fillRect(31,182,450,45);
      }
      // Reflections and a central timber door frame keep the goods behind glass.
      c.fillStyle='rgba(154,185,183,.09)';c.fillRect(0,0,512,256);c.fillStyle='#3d372e';c.fillRect(250,0,12,256);c.fillRect(0,228,512,28);c.fillStyle='#d2bea0';c.fillRect(272,135,5,27);
      tex.update();m.diffuseTexture=tex;m.emissiveColor=new B.Color3(.10,.08,.055);textures.set(type,m);return m;
    }
    const shops=scene.meshes.filter(m=>m.name==='shopGlass');
    shops.forEach((glass,i)=>{
      glass.material=shopMaterial(glass.metadata?.shopType||'grocery');
      const b=glass.getBoundingInfo().boundingBox,w=b.extendSize.x*2;
      box('doorJamb_'+i,.075,2.16,.09,glass,0,0,-.10,frame);
      box('doorHandle_'+i,.045,.20,.07,glass,.15,-.20,-.16,metal);
      glass.metadata={...glass.metadata,shopfrontDetailed:true};
    });
    const canvasMat=mat('awningCanvas','#ddceb0');
    const tex=new B.DynamicTexture('frontage_awning',256,scene,false),c=tex.getContext();c.fillStyle='#cabd9d';c.fillRect(0,0,256,256);
    for(let x=0;x<256;x+=64){c.fillStyle='#627363';c.fillRect(x,0,29,256);}tex.update();canvasMat.diffuseTexture=tex;canvasMat.diffuseColor=B.Color3.White();
    scene.meshes.filter(m=>m.name==='awning').forEach((awning,i)=>{
      const w=awning.getBoundingInfo().boundingBox.extendSize.x*2;
      box('awningValance_'+i,w,.24,.035,awning,0,-.105,-.50,canvasMat);
    });
    window.__EGYPT_FRONTAGES={ready:true,wallMounted,postMounted,vehicleMounted,duplicates,shops:shops.length};
  }
  install().catch(console.error);
})();
