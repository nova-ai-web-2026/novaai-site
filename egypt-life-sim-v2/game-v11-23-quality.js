(() => {
  'use strict';
  const VERSION='11.23.0',B=BABYLON;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const api=window.EgyptQuality={ready:false,version:VERSION};
  const tiles=new Map(),materials=new Map();
  let scene,atlas,shadow,sun,quality='balanced',nextShadow=0;
  const stats={people:0,textured:0,food:0,profileMeshes:0};
  const C=hex=>B.Color3.FromHexString(hex);
  function texture(index,repeat=1){
    const key=index+':'+repeat;if(tiles.has(key))return tiles.get(key);
    const t=new B.DynamicTexture('quality_surface_'+key,{width:512,height:512},scene,true),c=t.getContext(),cell=atlas.width/4;
    c.drawImage(atlas,(index%4)*cell+2,Math.floor(index/4)*cell+2,cell-4,cell-4,0,0,512,512);
    t.update();t.wrapU=t.wrapV=B.Texture.WRAP_ADDRESSMODE;t.uScale=t.vScale=repeat;t.anisotropicFilteringLevel=8;tiles.set(key,t);return t;
  }
  function material(name,index,color='#ffffff',repeat=1,metal=false){
    const key=name+':'+index+':'+color+':'+repeat+':'+metal;if(materials.has(key))return materials.get(key);
    const m=new B.StandardMaterial('quality_'+key,scene);m.diffuseColor=C(color);
    if(index>=0)m.diffuseTexture=texture(index,repeat);
    m.specularColor=metal?new B.Color3(.62,.64,.65):new B.Color3(.025,.025,.025);m.specularPower=metal?72:22;
    m.metadata={quality:VERSION,textureCell:index};materials.set(key,m);return m;
  }
  function assign(mesh,m){mesh.material=m;mesh.receiveShadows=true;mesh.metadata={...mesh.metadata,quality:VERSION};stats.textured++;return mesh;}
  function box(name,w,h,d,parent,x,y,z,m){const q=B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);q.parent=parent;q.position.set(x,y,z);q.material=m;q.isPickable=false;q.checkCollisions=false;q.receiveShadows=true;return q;}
  function sphere(name,parent,x,y,z,sx,sy,sz,m,segments=20){const q=B.MeshBuilder.CreateSphere(name,{diameter:1,segments},scene);q.parent=parent;q.position.set(x,y,z);q.scaling.set(sx,sy,sz);q.material=m;q.isPickable=false;q.checkCollisions=false;q.receiveShadows=true;return q;}
  function tube(name,path,radius,parent,m){const q=B.MeshBuilder.CreateTube(name,{path:path.map(p=>new B.Vector3(...p)),radius,tessellation:8,cap:B.Mesh.CAP_ALL},scene);q.parent=parent;q.material=m;q.isPickable=false;q.checkCollisions=false;return q;}
  // Rounded cross-sections form clothing and pottery, rather than stacked primitives.
  function profile(mesh,rows,segments=24,wrinkle=0){
    const positions=[],normals=[],uvs=[],indices=[];
    for(let r=0;r<rows.length;r++)for(let i=0;i<=segments;i++){
      const a=i/segments*Math.PI*2,[y,rx,rz]=rows[r],w=1+wrinkle*Math.sin(a*5+y*18);
      positions.push(Math.sin(a)*rx*w,y,Math.cos(a)*rz*w);uvs.push(i/segments,r/(rows.length-1));
      if(r<rows.length-1&&i<segments){const p=r*(segments+1)+i,n=p+segments+1;indices.push(p,p+1,n,p+1,n+1,n);}
    }
    B.VertexData.ComputeNormals(positions,indices,normals);const v=new B.VertexData();v.positions=positions;v.indices=indices;v.normals=normals;v.uvs=uvs;mesh.makeGeometryUnique();v.applyToMesh(mesh);stats.profileMeshes++;
    mesh.isPickable=false;mesh.receiveShadows=true;return mesh;
  }
  function shaped(name,parent,rows,m,segments=24){const q=new B.Mesh(name,scene);q.parent=parent;q.material=m;return profile(q,rows,segments);}
  function surfaceUV(mesh,metres){
    const p=mesh.getVerticesData(B.VertexBuffer.PositionKind),n=mesh.getVerticesData(B.VertexBuffer.NormalKind);if(!p||!n)return;
    const uv=[];for(let i=0;i<p.length;i+=3){const axis=Math.abs(n[i+1])>.6?1:Math.abs(n[i])>.6?0:2;uv.push((axis===0?p[i+2]:p[i])/metres,(axis===1?p[i+2]:p[i+1])/metres);}
    mesh.makeGeometryUnique();mesh.setVerticesData(B.VertexBuffer.UVKind,uv);
  }
  function skinMaterial(original){const color=original?.diffuseColor?.toHexString()||'#b98261';return material('skin',-1,color);}
  function refineRig(visual){
    if(visual.metadata?.realisticBody)return;
    const nodes=visual.getDescendants(false),find=suffix=>nodes.find(n=>n.name.endsWith(suffix)),id=Number(nodes.find(n=>/v9_head_\d+$/.test(n.name))?.name.match(/v9_head_(\d+)$/)?.[1]);
    if(!Number.isFinite(id))return;
    const get=name=>find(name+'_'+id),female=[1,5,7].includes(id%8),spine=get('v9_spine'),pelvis=get('v9_pelvis');
    const torso=get('v9p_torso'),head=get('v9_head');if(!torso||!head)return;
    const shirt=material('shirt',1,torso.material.diffuseColor.toHexString(),2),pants=material('trousers',2,'#9a9d9d',2),skin=skinMaterial(head.material),hair=material('hair',-1,'#302820'),shoes=material('shoes',3,'#71635b',1);
    const reshape=(name,rows,m)=>{const q=get(name);if(!q)return;profile(q,rows,24,name.includes('torso')?.014:0);q.position.set(0,0,0);q.scaling.set(1,1,1);assign(q,m);};
    reshape('v9p_torso',[[-.11,.195,.12],[0,.20,.13],[.18,.205,.14],[.38,female?.22:.25,.145],[.53,female?.235:.267,.14],[.62,.19,.12],[.69,.079,.079]],shirt);
    reshape('v9p_pelvis',[[-.15,.01,.01],[-.12,.215,.135],[.07,.215,.14],[.21,.185,.13]],pants);
    const waist=get('v9p_waist');if(waist){waist.scaling.set(.98,.7,.94);assign(waist,shirt);}
    for(const side of ['L','R']){
      const shoulder=get('v9_shoulder'+side);shoulder.position.x=(side==='L'?-1:1)*(female?.25:.272);
      for(const part of ['shoulder','elbow','knee'])get('v9p_'+part+side)?.setEnabled(false);
      reshape('v9p_upperArm'+side,[[-.385,.076,.071],[-.28,.077,.073],[-.08,.092,.082],[.05,.09,.082],[.07,.055,.057]],shirt);
      reshape('v9p_foreArm'+side,[[-.33,.043,.041],[-.27,.046,.044],[-.12,.064,.059],[.025,.072,.068]],female?shirt:skin);
      reshape('v9p_thigh'+side,[[-.465,.083,.085],[-.30,.096,.094],[-.10,.123,.115],[.04,.12,.11]],pants);
      reshape('v9p_calf'+side,[[-.44,.066,.066],[-.32,.069,.068],[-.14,.085,.084],[.035,.085,.085]],pants);
      get('v9p_ankle'+side)?.setEnabled(false);
      const foot=get('v9_foot'+side),toe=get('v9_toe'+side);if(foot){foot.scaling.set(.76,.8,.93);assign(foot,shoes);}if(toe){toe.scaling.set(.79,.39,1.0);assign(toe,shoes);}
      const hand=get('v9_hand'+side);if(hand){hand.scaling.set(.53,.88,.42);hand.position.y=-.34;assign(hand,skin);sphere('quality_thumb_'+visual.uniqueId+side,hand.parent,(side==='L'?1:-1)*.042,-.335,-.004,.038,.077,.034,skin,12);}
    }
    // Adult head proportions, jaw/cheek contour, narrow nose and visible lips.
    profile(head,[[-.165,.009,.035],[-.145,.068,.074],[-.10,.105,.105],[-.03,.128,.113],[.055,.127,.116],[.12,.093,.092],[.16,.005,.005]],32);
    head.scaling.set(1,1,1);assign(head,skin);
    const nose=get('v9_nose');if(nose){nose.position.set(0,.962,-.119);nose.scaling.set(.40,.93,.7);assign(nose,skin);}
    for(const side of ['L','R']){
      const sign=side==='L'?-1:1,eye=get('v9_eye'+side),ear=get('v9_ear'+side);
      if(eye){eye.position.set(sign*.047,.992,-.108);eye.scaling.set(.59,.32,.24);}
      if(ear){ear.position.set(sign*.131,.97,.014);ear.scaling.set(.34,.70,.45);assign(ear,skin);}
      tube('quality_brow_'+visual.uniqueId+side,[[sign*.072,1.032,-.103],[sign*.048,1.042,-.111],[sign*.026,1.036,-.109]],.0035,spine,hair);
    }
    tube('quality_lips_'+visual.uniqueId,[[-.031,.906,-.106],[0,.901,-.12],[.031,.906,-.106]],.0038,spine,material('lips',-1,'#81594a'));
    const oldHair=get('v9_hair');if(oldHair){oldHair.position.set(0,1.081,.008);oldHair.scaling.set(.68,.24,.62);}
    for(const node of nodes.filter(n=>/people_(scarf|longHair|ponytail|cap|moustache)/.test(n.name)&&n.getTotalVertices)){
      node.position.x*=.76;node.position.z*=.72;node.scaling.x*=.75;node.scaling.z*=.74;
      if(/scarfShoulders/.test(node.name)){node.scaling.x*=1.23;node.position.y=.69;}
      if(/moustache/.test(node.name)){node.position.set(0,.925,-.123);node.scaling.y*=.7;}
      if(/people_cap_/.test(node.name)){node.position.y=1.13;node.scaling.y*=.62;}
      if(node.material.name.includes('scarf'))assign(node,material('scarf',1,node.material.diffuseColor.toHexString(),2));
    }
    // Cloth seams, a shirt placket and small buttons give a readable everyday outfit.
    for(const node of nodes.filter(n=>/people_collar_/.test(n.name)))node.setEnabled(false);
    const seam=material('shirtSeam',1,'#aaa695',3);
    if(!female){
      box('quality_placket_'+visual.uniqueId,.025,.50,.012,spine,0,.27,-.143,seam);
      for(const side of [-1,1]){const q=box('quality_collar_'+visual.uniqueId+side,.085,.115,.018,spine,side*.07,.614,-.102,shirt);q.rotation.z=side*.42;}
      for(const y of [.12,.26,.4,.53])sphere('quality_button_'+visual.uniqueId,spine,0,y,-.155,.011,.011,.009,material('button',-1,'#c2bcb0'),8);
      box('quality_pocket_'+visual.uniqueId,.105,.12,.012,spine,.128,.40,-.147,shirt);
    }
    const tunic=get('people_tunic');if(tunic){profile(tunic,[[-.25,.28,.15],[-.05,.245,.145],[.15,.21,.14],[.35,.2,.13]],28,.018);tunic.position.set(0,.04,0);tunic.scaling.set(1,1,1);assign(tunic,shirt);}
    visual.metadata={...visual.metadata,realisticBody:VERSION};stats.people++;
  }
  // Baked bread has a thin, irregular rim and a lightly inflated centre.
  function bread(name,parent,diameter=.32,seed=1){
    const q=new B.Mesh(name,scene),p=[],n=[],uv=[],idx=[],rings=9,segments=32,radius=diameter/2;
    for(let ring=0;ring<=rings;ring++)for(let j=0;j<=segments;j++){
      const a=j/segments*Math.PI*2,r=radius*ring/rings,edge=1+.045*Math.sin(a*3+seed)+.025*Math.sin(a*7-seed),y=.014+.020*(1-(ring/rings)**2)+.003*Math.sin(a*5+seed)*(ring/rings);
      p.push(Math.cos(a)*r*edge,y,Math.sin(a)*r*edge);uv.push(.5+Math.cos(a)*r/diameter,.5+Math.sin(a)*r/diameter);
      if(ring<rings&&j<segments){const k=ring*(segments+1)+j;idx.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
    }
    const offset=p.length/3;
    for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2,edge=1+.045*Math.sin(a*3+seed)+.025*Math.sin(a*7-seed);p.push(Math.cos(a)*radius*edge,.005,Math.sin(a)*radius*edge);uv.push(j/segments,0);if(j<segments){const k=rings*(segments+1)+j;idx.push(k,k+1,offset+j,k+1,offset+j+1,offset+j);}}
    B.VertexData.ComputeNormals(p,idx,n);const data=new B.VertexData();Object.assign(data,{positions:p,normals:n,uvs:uv,indices:idx});data.applyToMesh(q);q.parent=parent;assign(q,material('baladiBread',0,'#ffffff'));q.material.backFaceCulling=false;q.isPickable=false;q.metadata={...q.metadata,realisticFood:'baladi-bread'};stats.food++;return q;
  }
  function pot(name,parent,x,y,z,diameter=.48,height=.48){
    const m=material('steel',8,'#e3e5e3',1,true),r=diameter/2;
    const q=shaped(name,parent,[[0,r*.72,r*.72],[.025,r*.85,r*.85],[height*.17,r,r],[height*.78,r,r],[height*.96,r*.79,r*.79],[height,r*.79,r*.79],[height+.014,r*.71,r*.71],[height*.70,r*.71,r*.71]],m,32);q.position.set(x,y,z);
    const rim=B.MeshBuilder.CreateTorus(name+'_rim',{diameter:r*1.51,thickness:.025,tessellation:32},scene);rim.parent=q;rim.position.y=height;rim.material=m;rim.isPickable=false;
    for(const side of [-1,1])tube(name+'_handle'+side,[[side*r*.87,height*.7,0],[side*r*1.35,height*.72,0],[side*r*1.36,height*.47,0],[side*r*.94,height*.46,0]],.018,q,material('handle',-1,'#383833'));
    return q;
  }
  function bottle(name,parent,x,y,z,color='#6e9161'){
    const q=shaped(name,parent,[[0,.048,.048],[.02,.058,.058],[.21,.058,.058],[.25,.034,.034],[.31,.025,.025],[.34,.025,.025]],material('bottle',-1,color),20);q.position.set(x,y,z);
    const cap=B.MeshBuilder.CreateCylinder(name+'_cap',{diameter:.058,height:.03,tessellation:16},scene);cap.parent=q;cap.position.y=.343;cap.material=material('bottleCap',-1,'#d4cab2');cap.isPickable=false;
    const label=box(name+'_label',.09,.11,.004,q,0,.145,-.056,material('paper',15,'#ffffff'));return q;
  }
  function crate(name,parent,x,y,z){
    const q=new B.TransformNode(name,scene);q.parent=parent;q.position.set(x,y,z);const wood=material('crate',9,'#d0b38a');
    box(name+'_base',.82,.055,.6,q,0,0,0,wood);
    for(const side of [-1,1])for(const h of [.07,.17]){box(name+'_front',.82,.055,.04,q,0,h,side*.3,wood);box(name+'_side',.04,.055,.6,q,side*.4,h,0,wood);}
    for(const x of [-.39,.39])for(const z of [-.29,.29])box(name+'_corner',.035,.25,.035,q,x,.10,z,wood);return q;
  }
  function tomato(parent,x,y,z,seed){
    const q=sphere('quality_tomato',parent,x,y,z,.16,.13,.16,material('tomato',-1,seed%2?'#a9462a':'#bf5832'),16);
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const leaf=box('quality_tomatoLeaf',.05,.007,.012,q,Math.sin(a)*.11,.52,Math.cos(a)*.11,material('leaf',-1,'#4d6335'));leaf.rotation.y=a;}
    return q;
  }
  function shop(root,type){
    if(!api.ready)return;
    const descendants=root.getChildMeshes(false);
    for(const q of descendants){
      if(q.name==='shopInside_floor'){assign(q,material('shopFloor',7,'#d5cec0'));surfaceUV(q,.8);}
      else if(/shopInside_(backWall|sideWall|frontWall|ceiling)/.test(q.name)){assign(q,material('shopPlaster',4,'#f5ebd8'));surfaceUV(q,2.4);}
      else if(/shopInside_(shelf|doorJamb|doorLintel|titleBacking)/.test(q.name))assign(q,material('shelfWood',9,'#bca98d'));
      else if(q.name==='shopInside_counter'){assign(q,material('counterTiles',13,'#e6e0cc'));surfaceUV(q,.5);}
      else if(q.name==='shopInside_counterTop')assign(q,material('counterSteel',8,'#c8cdcc',2,true));
    }
    const old=scene.getTransformNodeByName('quality_shopStock');old?.dispose(false,false);const group=new B.TransformNode('quality_shopStock',scene);group.parent=root;
    for(const q of root.getDescendants(false))if(q.name==='shopInside_stock')q.setEnabled(false);
    // Fixtures are placed on the counter and shelves, all below the seller's face.
    if(type==='bakery'){
      for(let col=0;col<3;col++){
        const basket=shaped('quality_breadBasket',group,[[0,.24,.19],[.035,.31,.235],[.15,.35,.265],[.16,.32,.24],[.04,.27,.20]],material('basket',10,'#ded0ae'),32);basket.position.set(-1.05+col*1.05,1.215,1.1);
        for(let i=0;i<4;i++){const q=bread('quality_counterBread',group,.35,col*4+i);q.position.set(-1.10+col*1.05+(i%2)*.08,1.29+i*.024,.96+Math.floor(i/2)*.12);q.rotation.y=i*.7;}
      }
    }else if(['ful','koshary','kebda'].includes(type)){
      for(let i=-1;i<=1;i++){const p=pot('quality_foodPot',group,i*.95,1.215,1.13,.49,i===0?.54:.38);const fill=B.MeshBuilder.CreateCylinder('quality_foodSurface',{diameter:.34,height:.008,tessellation:24},scene);fill.parent=p;fill.position.y=i===0?.40:.27;fill.material=material('food',-1,type==='ful'?'#76633d':type==='koshary'?'#c1a171':'#715040');}
      const q=bread('quality_foodBread',group,.28,5);q.position.set(1.75,1.215,.95);
    }else if(type==='juice'||type==='ahwa'){
      const steel=material('steel',8,'#d5dad8',1,true);
      for(let i=-2;i<=1;i++){
        const cup=shaped('quality_drinkingCup',group,[[0,.04,.04],[.02,.055,.055],[.16,.063,.063],[.18,.063,.063],[.18,.053,.053],[.13,.05,.05]],material('ceramic',12,'#e9e1ca'),24);cup.position.set(i*.30,1.215,.96);
        const fill=B.MeshBuilder.CreateCylinder('quality_drink',{diameter:.10,height:.009,tessellation:24},scene);fill.parent=cup;fill.position.y=.15;fill.material=material('drink',-1,type==='ahwa'?'#653923':'#c89a31');
      }
      const kettle=pot('quality_kettle',group,1.1,1.215,1.12,.34,.35);tube('quality_spout',[[.1,.10,0],[.30,.22,0],[.36,.33,0]],.035,kettle,steel);
    }else{
      for(let i=0;i<3;i++){const c=crate('quality_produceCrate',group,-1.05+i*1.05,1.24,1.1);for(let k=0;k<9;k++){if(i%2)tomato(c,-.26+(k%3)*.24,.12,-.18+Math.floor(k/3)*.18,k);else sphere('quality_orange',c,-.26+(k%3)*.24,.13,-.18+Math.floor(k/3)*.18,.17,.17,.17,material('orange',-1,'#ca882f'),16);}}
    }
    for(const side of [-1,1])for(const y of [.56,1.21,1.86])for(let i=0;i<6;i++){
      if(type==='bakery'){const loaf=bread('quality_shelfBread',group,.27,i+side+4);loaf.position.set(side*4.11,y,-1.6+i*.68);}
      else if(i%2)bottle('quality_shelfBottle',group,side*4.11,y,-1.6+i*.68,i%3?'#74804d':'#aa8143');
      else{const packet=box('quality_shelfPacket',.18,.28,.14,group,side*4.1,y+.14,-1.6+i*.68,material('packet',15,['#b7a872','#8d9866','#b08a66'][i%3]));box('quality_packetBand',.186,.07,.146,packet,0,0,0,material('paperBand',1,'#d6cfb6'));}
    }
    if(!root.metadata?.qualityFixtures){
      const wallTiles=box('quality_shopWainscot',9.3,1.2,.028,root,0,.69,4.185,material('wallTiles',13,'#f0e7d2'));surfaceUV(wallTiles,.5);
      const plinth=box('quality_counterBase',6.23,.095,.88,root,0,.15,1.1,material('plinth',9,'#a8a08e'));
      for(const side of [-1,1])surfaceUV(box('quality_wallTileSide',.025,1.2,8.1,root,side*4.685,.69,0,material('wallTiles',13,'#f0e7d2')),.5);
      root.metadata={...root.metadata,qualityFixtures:true};
    }
    for(const visual of scene.transformNodes.filter(n=>n.name==='shopInside_seller'))refineRig(visual);
    nextShadow=0;
  }
  function expandedPeople(){
    for(const [i,root] of scene.transformNodes.filter(n=>/^v12_ped_\d+$/.test(n.name)).entries()){
      const source=scene.getTransformNodeByName('v9_personVisual_'+(i%3===1?5:i%3===2?2:0));if(!source)continue;
      for(const mesh of root.getChildMeshes())mesh.setEnabled(false);
      const model=source.clone('quality_neighbour_'+i,root,false);model.position.set(0,.15,0);model.rotation.set(0,Math.PI,0);
      const nodes=model.getDescendants(),joint=name=>nodes.find(n=>new RegExp('v9_'+name+'_\\d+$').test(n.name)),hips=[joint('hipL'),joint('hipR')],arms=[joint('shoulderL'),joint('shoulderR')];
      scene.onBeforeRenderObservable.add(()=>{if(B.Vector3.DistanceSquared(root.position,scene.activeCamera.position)>2500)return;const stride=Math.sin(performance.now()*.005+i)*.32;hips.forEach((n,k)=>{if(n)n.rotation.x=k?stride:-stride;});arms.forEach((n,k)=>{if(n)n.rotation.x=k?-stride*.6:stride*.6;});});stats.people++;
    }
  }
  function world(){
    for(const visual of scene.transformNodes.filter(n=>/^v9_personVisual_\d+$/.test(n.name)||/^storyRig_/.test(n.name)))refineRig(visual);
    expandedPeople();
    for(const q of [...scene.meshes]){
      if(!q.isEnabled()||q.metadata?.quality||q.metadata?.readableArabic)continue;
      if(q.name==='building'||/^v12_building_/.test(q.name)){
        const brick=q.material.name.includes('Brick')||q.material.name.includes('exposedBrick');q.computeWorldMatrix(true);const h=q.getBoundingInfo().boundingBox.extendSizeWorld.y*2;
        assign(q,material('facade',brick?5:4,brick?'#c4afa0':'#e9ddc7'));surfaceUV(q,brick?.7:2.4);
      }else if(/^(road[HV]|v12_(road|northMain|eastMain|northLane|eastLane|northCross|eastCross))/.test(q.name)){assign(q,material('asphalt',6,'#a6a6a0'));surfaceUV(q,1.8);}
      else if(/^(walk[HV]|v12_(walk|northWalk|eastWalk|homeFloor|balconyFloor))/.test(q.name)){assign(q,material('pavement',7,'#d4ccbb'));surfaceUV(q,.8);}
      else if(/^v12_homeWall/.test(q.name)){assign(q,material('homeWall',4,'#e7dfcd'));surfaceUV(q,2.4);}
      else if(/^(v12_homeDoor|v12_diningTop|v12_coffeeTable|v12_chair|v12_bedBase)/.test(q.name))assign(q,material('homeWood',9,'#b3a38c',2));
      else if(/^v12_(bedQuilt|bedPillow|sofa)/.test(q.name))assign(q,material('homeCloth',1,q.material.diffuseColor.toHexString(),3));
      else if(/^(bread$|v8_baladiLoaf|frontage_breadLoaf)/.test(q.name)){
        q.computeWorldMatrix(true);const pos=q.getAbsolutePosition().clone(),bb=q.getBoundingInfo().boundingBox,w=Math.min(.38,bb.extendSizeWorld.x*2),newBread=bread('quality_streetBread',null,w,q.uniqueId%31);newBread.position.copyFrom(pos);newBread.position.y-=.025;q.setEnabled(false);
      }else if(q.name==='frontage_fulPot'){
        const p=pot('quality_cartPot',null,q.position.x,.975,q.position.z,.59,.67);q.setEnabled(false);
        const lid=B.MeshBuilder.CreateCylinder('quality_cartLid',{diameter:.43,height:.025,tessellation:32},scene);lid.position.set(q.position.x,1.66,q.position.z);assign(lid,material('steel',8,'#e3e5e3',1,true));
        sphere('quality_lidGrip',null,q.position.x,1.70,q.position.z,.065,.05,.065,material('handle',-1,'#383833'),12);
      }else if(/^frontage_pot(Neck|Lid)/.test(q.name)){q.setEnabled(false);
      }else if(/^(treeCrown|street_plant|v12_tree_)/.test(q.name)){
        q.scaling.y*=.84;assign(q,material('foliage',-1,'#617148'));
      }
    }
    const cart=scene.getMeshByName('cart');if(cart)assign(cart,material('cartPaint',11,'#c4c1a4',1));
  }
  function lighting(){
    const ipc=scene.imageProcessingConfiguration;ipc.toneMappingEnabled=true;ipc.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;ipc.exposure=1.05;ipc.contrast=1.04;scene.ambientColor=new B.Color3(.025,.025,.025);
    scene.getLightByName('v9_sun')?.setEnabled(false);
    sun=scene.getLightByName('sun');
    for(const light of scene.lights)if(light instanceof B.HemisphericLight){light.groundColor=new B.Color3(.30,.28,.24);light.diffuse=new B.Color3(.81,.88,.97);}
    if(sun){sun.diffuse=new B.Color3(1,.94,.83);shadow=new B.ShadowGenerator(1024,sun);shadow.usePercentageCloserFiltering=true;shadow.filteringQuality=B.ShadowGenerator.QUALITY_LOW;shadow.bias=.0006;shadow.normalBias=.025;shadow.darkness=.18;sun.shadowMinZ=1;sun.shadowMaxZ=120;sun.shadowFrustumSize=70;}
    const casters=scene.meshes.filter(q=>q.name==='building'||/^v12_building_/.test(q.name)||q.metadata?.quality||/^(carBody|vanBody|busBody)/.test(q.name));
    scene.onBeforeRenderObservable.add(()=>{
      if(!shadow||performance.now()<nextShadow)return;nextShadow=performance.now()+600;
      const c=scene.activeCamera;if(!c)return;sun.position.copyFrom(c.position.subtract(sun.direction.scale(32)));
      const indoor=!!window.EgyptShops?.active();
      const list=(indoor?scene.getTransformNodeByName('shopInterior')?.getChildMeshes(false)||[]:casters).filter(q=>q.isEnabled()&&q.isVisible&&q.visibility>0&&q.getTotalVertices()>0&&!/floor|Floor|title|Wall|Grout|Wainscot|ceiling|Ceiling/i.test(q.name)&&B.Vector3.DistanceSquared(q.getAbsolutePosition(),c.position)<(indoor?400:1800)).sort((a,b)=>B.Vector3.DistanceSquared(a.getAbsolutePosition(),c.position)-B.Vector3.DistanceSquared(b.getAbsolutePosition(),c.position));
      shadow.getShadowMap().renderList=list.slice(0,quality==='high'?240:140);
    });
  }
  function setQuality(value){
    quality=value==='high'?'high':'balanced';try{localStorage.setItem('egypt-graphics',quality);}catch{}
    const dpr=Math.min(devicePixelRatio||1,quality==='high'?2:1.25);scene.getEngine().setHardwareScalingLevel(1/dpr);
    if(shadow)shadow.mapSize=quality==='high'?2048:1024;
    const button=document.getElementById('qualityToggle');if(button){button.textContent='الجودة: '+(quality==='high'?'عالية':'متوازنة');button.setAttribute('aria-pressed',String(quality==='high'));}
    nextShadow=0;
  }
  async function install(){
    for(let i=0;!window.__EGYPT_FRONTAGES?.ready||!window.__EGYPT_PEOPLE?.ready;i++){if(i>600)throw new Error('Quality pass could not find the street');await sleep(100);}
    scene=B.Engine.LastCreatedEngine.scenes[0];atlas=new Image();atlas.src='assets/quality/egypt-materials.webp?v='+VERSION;await atlas.decode();
    api.ready=true;world();lighting();
    const button=document.createElement('button');button.id='qualityToggle';button.type='button';button.onclick=()=>setQuality(quality==='high'?'balanced':'high');button.title='تغيير جودة الصورة — Q';window.addEventListener('keydown',e=>{if(e.code==='KeyQ'&&!e.repeat&&!/INPUT|TEXTAREA/.test(e.target.tagName))button.click();});document.getElementById('hud').appendChild(button);
    const style=document.createElement('style');style.textContent='#qualityToggle{position:absolute;top:82px;left:116px;pointer-events:auto;padding:8px 10px;color:#f3e5ca;background:#25261fe8;border:1px solid #796d50;border-radius:10px;font:700 11px Tahoma;cursor:pointer}@media(max-width:760px){#qualityToggle{top:64px;left:51px;padding:8px 7px;font-size:9px;max-width:130px}}';document.head.appendChild(style);
    setQuality(localStorage.getItem('egypt-graphics')||'balanced');
    api.shop=shop;api.material=material;api.bread=bread;api.pot=pot;api.setQuality=setQuality;api.state=()=>({ready:true,version:VERSION,quality,...stats,textures:tiles.size,shadowSize:shadow?.mapSize,renderWidth:scene.getEngine().getRenderWidth(),renderHeight:scene.getEngine().getRenderHeight()});
    window.__EGYPT_QUALITY={ready:true,version:VERSION};console.info('Egyptian visual quality ready',api.state());
  }
  install().catch(error=>{api.error=String(error);console.error(error);const q=document.getElementById('errorBox');if(q){q.textContent='تعذّر تجهيز جودة الصورة: '+error.message;q.style.display='block';}});
})();
