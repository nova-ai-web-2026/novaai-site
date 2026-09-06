(() => {
  'use strict';
  const ORIGIN={x:420,z:420};
  let root,goods,light,titleTexture,counterMaterial,active=null,scene,B;
  const materials=new Map();
  const material=(name,color)=>{if(materials.has(name))return materials.get(name);const m=new B.StandardMaterial('shopInside_'+name,scene);m.diffuseColor=B.Color3.FromHexString(color);m.specularColor=new B.Color3(.035,.035,.035);materials.set(name,m);return m;};
  const box=(name,w,h,d,x,y,z,mat,parent=root,collision=false)=>{const m=B.MeshBuilder.CreateBox('shopInside_'+name,{width:w,height:h,depth:d},scene);m.parent=parent;m.position.set(x,y,z);m.material=mat;m.checkCollisions=collision;m.isPickable=false;return m;};
  const cylinder=(name,diameter,height,x,y,z,mat,parent=goods)=>{const m=B.MeshBuilder.CreateCylinder('shopInside_'+name,{diameter,height,tessellation:16},scene);m.parent=parent;m.position.set(x,y,z);m.material=mat;m.isPickable=false;return m;};
  function build(){
    root=new B.TransformNode('shopInterior',scene);root.position.set(ORIGIN.x,0,ORIGIN.z);
    const wall=material('wall','#dfd3b8'),tile=material('tile','#b9b4a0'),wood=material('wood','#755237'),metal=material('metal','#999d98');
    box('floor',9.6,.14,8.6,0,.02,0,tile,root,true);
    box('backWall',9.6,3.4,.2,0,1.7,4.3,wall,root,true);
    for(const side of [-1,1]){box('sideWall_'+side,.2,3.4,8.6,side*4.8,1.7,0,wall,root,true);box('frontWall_'+side,3.65,3.4,.2,side*2.97,1.7,-4.3,wall,root,true);box('doorJamb_'+side,.12,2.65,.22,side*1.10,1.35,-4.23,wood);}
    box('doorLintel',2.32,.14,.22,0,2.68,-4.23,wood);
    box('ceiling',9.6,.14,8.6,0,3.45,0,wall);
    // The customer aisle is open; stock and the counter remain solid.
    counterMaterial=material('counter','#476350');
    box('counter',6.2,1.03,.85,0,.62,1.1,counterMaterial,root,true);
    box('counterTop',6.35,.075,.96,0,1.17,1.1,metal);
    for(const side of [-1,1]){
      box('shelfBack_'+side,.16,2.5,4.8,side*4.42,1.4,.25,wood);
      for(const y of [.52,1.17,1.82,2.47])box('shelf_'+side+'_'+y,.75,.07,4.8,side*4.13,y,.25,wood,root,true);
    }
    for(let n=-4;n<=4;n++)box('floorGroutX_'+n,.018,.005,8.35,n,.094,0,material('grout','#8d9088'));
    for(let n=-4;n<=4;n++)box('floorGroutZ_'+n,9.35,.005,.018,0,.094,n,material('grout','#8d9088'));
    titleTexture=new B.DynamicTexture('shopInside_title',{width:1024,height:192},scene,false);
    const titleMaterial=material('title','#ffffff');titleMaterial.diffuseTexture=titleTexture;titleMaterial.emissiveColor=new B.Color3(.12,.12,.12);
    const title=B.MeshBuilder.CreatePlane('shopInside_titlePlate',{width:2.3,height:.46},scene);title.parent=root;title.position.set(0,3.03,4.18);title.material=titleMaterial;title.isPickable=false;
    box('titleBacking',2.42,.58,.055,0,3.03,4.22,wood);
    light=new B.PointLight('shopInside_light',new B.Vector3(ORIGIN.x,3.02,ORIGIN.z),scene);light.intensity=.7;light.range=10;light.diffuse=new B.Color3(1,.92,.77);
    cylinder('lamp',.65,.08,0,3.24,0,material('lamp','#f0ead3'),root);
    const source=scene.getTransformNodeByName('v9_personVisual_2');
    if(source){const person=source.clone('shopInside_seller',root,false);person.position.set(0,.27,2.65);person.rotation.set(0,0,0);for(const n of person.getDescendants()){if(!n.getTotalVertices&&/v9_(pelvis|spine|hip|knee|ankle|shoulder|elbow)/.test(n.name))n.rotation.set(0,0,0);if(n.getTotalVertices){n.checkCollisions=false;n.isPickable=false;}}}
  }
  function stock(type){
    goods?.dispose(false,false);goods=new B.TransformNode('shopInside_stock',scene);goods.parent=root;
    const cream=material('bread','#c99d55'),red=material('tomato','#ad4938'),green=material('produce','#6f854d'),silver=material('pots','#a9aea6');
    if(['ful','koshary','kebda'].includes(type)){
      for(let i=-1;i<=1;i++){cylinder('cookingPot',.62,.48,i*.88,1.43,1.15,silver);cylinder('potLid',.66,.05,i*.88,1.69,1.15,silver);cylinder('lidHandle',.10,.09,i*.88,1.76,1.15,material('handles','#414945'));}
    }else if(type==='bakery'){
      for(let row=0;row<2;row++)for(let col=0;col<5;col++){const loaf=cylinder('loaf',.48,.075,-1.25+col*.62,1.25+row*.06,.93+row*.27,cream);loaf.scaling.z=.82;}
    }else if(type==='juice'||type==='ahwa'){
      for(let i=-2;i<=2;i++){cylinder('cup',.22,.30,i*.42,1.35,.9,material(type==='juice'?'juice':'tea',type==='juice'?'#c3943d':'#926744'));cylinder('cupRim',.24,.035,i*.42,1.51,.9,silver);}
      cylinder('urn',.65,.68,1.65,1.52,1.25,silver);
    }else{
      for(let i=0;i<3;i++){box('crate',.85,.20,.62,-1.05+i*1.05,1.30,1.12,material('crate','#7b6341'),goods);for(let n=0;n<6;n++){const fruit=B.MeshBuilder.CreateSphere('shopInside_fruit',{diameter:.23,segments:8},scene);fruit.parent=goods;fruit.position.set(-1.30+i*1.05+(n%3)*.25,1.49,1.00+Math.floor(n/3)*.24);fruit.material=i%2?red:green;fruit.isPickable=false;}}
    }
    for(const side of [-1,1])for(const y of [.75,1.40,2.05])for(let i=0;i<5;i++){
      const color=type==='bakery'?cream:[cream,green,red,silver][i%4];
      box('stockPacket',.35,.35,.43,side*4.10,y,-1.5+i*.85,color,goods);
    }
  }
  window.EgyptShops={
    enter(s,data){scene=s;B=BABYLON;if(!root)build();if(active?.type!==data.type)stock(data.type);active={name:data.name,type:data.type};root.setEnabled(true);light.setEnabled(true);
      counterMaterial.diffuseColor=B.Color3.FromHexString(data.sign||'#476350');
      const c=titleTexture.getContext();c.fillStyle='#3d5545';c.fillRect(0,0,1024,192);c.fillStyle='#fff1cf';c.direction='rtl';c.textAlign='center';c.textBaseline='middle';c.font='bold 64px Tahoma,Arial';c.fillText(data.name,512,96,970);titleTexture.update();
      return {x:ORIGIN.x,z:ORIGIN.z-2.8};
    },
    leave(){active=null;root?.setEnabled(false);light?.setEnabled(false);},
    active:()=>active?{...active}:null,
    bounds:()=>active?{minX:ORIGIN.x-4.7,maxX:ORIGIN.x+4.7,minZ:ORIGIN.z-4.2,maxZ:ORIGIN.z+4.2}:null,
    counter:()=>({x:ORIGIN.x,z:ORIGIN.z+.58}),
    door:()=>({x:ORIGIN.x,z:ORIGIN.z-3.65})
  };
})();
