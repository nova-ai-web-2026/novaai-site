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
    const fulCart=scene.getMeshByName('cart');
    if(fulCart){
      const plate=plates.find(m=>B.Vector3.Distance(m.position,new B.Vector3(fulCart.position.x,1.74,fulCart.position.z-.82))<.05);
      if(plate){plate.position.set(fulCart.position.x,.55,fulCart.position.z-.78);plate.scaling.set(.8,.68,1);plate.metadata.cartPlaque=true;}
    }
    const legacy=plates.filter(m=>m.name.startsWith('v11_legacyShop_'));
    const hosts=scene.meshes.filter(m=>m.isEnabled()&&m.isVisible&&m.visibility>0&&(m.name==='cart'||m.name==='building'||/^v12_building_/.test(m.name)||/shopFrame|kioskBody|homeWall|stall/.test(m.name)));
    hosts.forEach(m=>m.computeWorldMatrix(true));
    let wallMounted=0,postMounted=0,vehicleMounted=0,duplicates=0;
    for(const sign of plates){
      if(!sign.isEnabled())continue;
      if(sign.name.startsWith('v8_shopSign_')&&legacy.some(m=>B.Vector3.Distance(m.position,sign.position)<4.5)){sign.setEnabled(false);duplicates++;continue;}
      sign.computeWorldMatrix(true);
      const bounds=sign.getBoundingInfo().boundingBox,w=bounds.extendSize.x*2,h=bounds.extendSize.y*2,pos=sign.getAbsolutePosition();
      const backing=box('signBack_'+sign.uniqueId,w+.09,h+.09,.07,sign,0,0,.04,wood);
      const back=sign.getChildMeshes().find(m=>m.parent===sign&&m.name===sign.name+'_readableBack');if(back)back.position.z=.081;
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
      }else if(type==='ahwa'){
        c.fillStyle='#30291f';c.fillRect(30,55,452,7);c.fillRect(30,110,452,7);
        for(let row=0;row<2;row++)for(let i=0;i<12;i++){
          const x=42+i*36,y=29+row*55;
          c.fillStyle='#c9c5a5';c.fillRect(x,y,13,23);c.fillStyle='#966438';c.fillRect(x+2,y+8,9,12);
        }
        c.fillStyle='#a69f87';c.fillRect(41,160,430,14);c.fillStyle='#654834';c.fillRect(31,181,450,46);
      }else if(type==='koshary'||type==='ful'){
        c.fillStyle='#473327';c.fillRect(30,52,452,9);
        for(let i=0;i<5;i++){
          const x=46+i*88;c.fillStyle='#a9aba1';c.fillRect(x,104,60,57);
          c.fillStyle='#d6d3ba';c.beginPath();c.ellipse(x+30,104,30,8,0,0,Math.PI*2);c.fill();
          c.fillStyle='#55483a';c.fillRect(x+25,88,10,9);
        }
        c.fillStyle='#806345';c.fillRect(31,165,450,62);
      }else{
        c.fillStyle='#b9aa88';c.fillRect(40,46,150,6);c.fillRect(300,46,160,6);
        for(let i=0;i<7;i++){c.fillStyle=type==='bakery'?'#c59b58':'#8f988d';c.beginPath();c.ellipse(56+i*64,144,23,12,0,0,Math.PI*2);c.fill();}
        c.fillStyle='#ba9c66';c.fillRect(31,164,450,18);c.fillStyle='#63513d';c.fillRect(31,182,450,45);
      }
      // Reflections and a central timber door frame keep the goods behind glass.
      c.fillStyle='rgba(154,185,183,.09)';c.fillRect(0,0,512,256);c.fillStyle='#3d372e';c.fillRect(250,0,12,256);c.fillRect(0,228,512,28);c.fillStyle='#d2bea0';c.fillRect(272,135,5,27);
      tex.update();m.diffuseTexture=tex;m.emissiveColor=new B.Color3(.10,.08,.055);textures.set(type,m);return m;
    }
    const shops=scene.meshes.filter(m=>m.name==='shopGlass'||m.metadata?.interactiveShop);
    shops.forEach((glass,i)=>{
      glass.material=shopMaterial(glass.metadata?.shopType||'grocery');
      const b=glass.getBoundingInfo().boundingBox,w=b.extendSize.x*2;
      box('doorJamb_'+i,.075,2.16,.09,glass,0,0,-.10,frame);
      box('doorHandle_'+i,.045,.20,.07,glass,.15,-.20,-.16,metal);
      glass.metadata={...glass.metadata,shopfrontDetailed:true};
    });
    // Compact wooden cafe seating sits beside the door, within the pavement.
    for(const [i,glass] of shops.filter(g=>g.metadata?.shopType==='ahwa').sort((a,b)=>Math.hypot(a.position.x+12,a.position.z+16)-Math.hypot(b.position.x+12,b.position.z+16)).slice(0,2).entries()){
      const pieces=[],w=glass.getBoundingInfo().boundingBox.extendSize.x*2,x=-w*.28;
      const add=(name,a,b,c,px,py,pz)=>{const m=box(name,a,b,c,glass,px,py,pz,wood);pieces.push(m);return m;};
      const top=B.MeshBuilder.CreateCylinder('frontage_cafeTable_'+i,{diameter:.8,height:.055,tessellation:12},scene);
      top.parent=glass;top.position.set(x,-.62,-1.2);top.material=wood;top.isPickable=false;pieces.push(top);
      add('tableLeg',.10,.70,.10,x,-.99,-1.2);
      for(const side of [-1,1]){
        const cx=x+side*.65;
        add('chairSeat',.42,.055,.43,cx,-.91,-1.2);
        add('chairBack',.055,.44,.43,cx+side*.19,-.68,-1.2);
        for(const dx of [-.16,.16])for(const dz of [-.16,.16])add('chairLeg',.045,.42,.045,cx+dx,-1.12,-1.2+dz);
      }
      for(const p of pieces)p.computeWorldMatrix(true);
      const merged=B.Mesh.MergeMeshes(pieces,true,true,undefined,false,false);
      merged.name='frontage_cafeSeating_'+i;merged.isPickable=false;merged.checkCollisions=false;
    }
    const canvasMat=mat('awningCanvas','#ddceb0');
    const tex=new B.DynamicTexture('frontage_awning',256,scene,false),c=tex.getContext();c.fillStyle='#cabd9d';c.fillRect(0,0,256,256);
    for(let x=0;x<256;x+=64){c.fillStyle='#627363';c.fillRect(x,0,29,256);}tex.update();canvasMat.diffuseTexture=tex;canvasMat.diffuseColor=B.Color3.White();
    scene.meshes.filter(m=>m.name==='awning').forEach((awning,i)=>{
      const w=awning.getBoundingInfo().boundingBox.extendSize.x*2;
      box('awningValance_'+i,w,.24,.035,awning,0,-.105,-.50,canvasMat);
    });
    // Egyptian ful-cart proportions: wheels, metal pots, serving dishes and painted panels.
    const cart=scene.getMeshByName('cart'),silver=mat('pots','#a6a798'),red=mat('cartRed','#953c2d'),green=mat('cartGreen','#37664a'),breadMat=mat('bread','#c4a56a');
    if(cart){
      const x=cart.position.x,z=cart.position.z,parts=[];
      const cylinder=(name,diameter,height,px,py,pz,material)=>{const m=B.MeshBuilder.CreateCylinder('frontage_'+name,{diameter,height,tessellation:12},scene);m.position.set(px,py,pz);m.material=material;m.isPickable=false;parts.push(m);return m;};
      for(const side of [-1,1])for(const front of [-1,1]){const wheel=cylinder('cartWheel',.43,.10,x+side*1.40,.25,z+front*.53,metal);wheel.rotation.z=Math.PI/2;}
      for(let i=0;i<3;i++)box('cartPaint_'+i,.77,.53,.035,cart,-.85+i*.85,0,-.742,i%2?red:green);
      scene.getMeshByName('fulPot')?.setEnabled(false);
      for(const dx of [-.68,.1]){
        const pot=B.MeshBuilder.CreateSphere('frontage_fulPot',{diameter:.62,segments:10},scene);pot.position.set(x+dx,1.28,z+.12);pot.scaling.y=1.05;pot.material=silver;pot.isPickable=false;parts.push(pot);
        cylinder('potNeck',.26,.18,x+dx,1.61,z+.12,silver);cylinder('potLid',.34,.045,x+dx,1.72,z+.12,silver);
      }
      const dish=cylinder('servingTray',.38,.025,x+.83,.99,z-.20,silver);dish.scaling.z=.8;
      for(let i=0;i<3;i++){const loaf=cylinder('breadLoaf',.29,.035,x+.80+i*.025,1.025+i*.035,z-.23,breadMat);loaf.scaling.z=.76;}
      for(const part of parts)part.checkCollisions=false;
    }
    window.__EGYPT_FRONTAGES={ready:true,wallMounted,postMounted,vehicleMounted,duplicates,shops:shops.length};
  }
  install().catch(console.error);
})();
