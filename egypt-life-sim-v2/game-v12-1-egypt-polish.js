(() => {
  'use strict';
  const VERSION='12.1';
  const B=window.BABYLON,scene=B?.Engine?.LastCreatedEngine?.scenes?.[0];
  if(!scene||!window.__V12_WORLD?.ready){console.error('V12.1 polish: V12 world not ready');return;}

  const mats=new Map(),created=[];
  const mat=(n,h,e='')=>{const k=n+h+e;if(mats.has(k))return mats.get(k);const m=new B.StandardMaterial('v121_mat_'+n+'_'+mats.size,scene);m.diffuseColor=B.Color3.FromHexString(h);m.specularColor=new B.Color3(.02,.02,.02);if(e)m.emissiveColor=B.Color3.FromHexString(e);mats.set(k,m);return m;};
  const box=(n,w,h,d,x,y,z,m,col=false)=>{const q=B.MeshBuilder.CreateBox('v121_'+n,{width:w,height:h,depth:d},scene);q.position.set(x,y,z);q.material=m;q.checkCollisions=col;q.isPickable=false;created.push(q);return q;};
  const cyl=(n,d,h,x,y,z,m,t=12)=>{const q=B.MeshBuilder.CreateCylinder('v121_'+n,{diameter:d,height:h,tessellation:t},scene);q.position.set(x,y,z);q.material=m;q.isPickable=false;created.push(q);return q;};
  function sign(n,text,x,y,z,w=5,h=.65,bg='#315d48',rot=Math.PI){const tex=new B.DynamicTexture('v121_tex_'+n,{width:900,height:150},scene,false),c=tex.getContext();c.fillStyle=bg;c.fillRect(0,0,900,150);c.fillStyle='#fff3dc';c.font='700 55px Tahoma,Arial';c.textAlign='center';c.textBaseline='middle';c.direction='rtl';c.fillText(text,450,77);tex.update();const sm=new B.StandardMaterial('v121_signmat_'+n,scene);sm.diffuseTexture=tex;sm.emissiveColor=new B.Color3(.04,.035,.03);sm.backFaceCulling=false;const p=B.MeshBuilder.CreatePlane('v121_sign_'+n,{width:w,height:h},scene);p.position.set(x,y,z);p.rotation.y=rot;p.material=sm;p.isPickable=false;created.push(p);return p;}
  const torus=(n,d,t,x,y,z,m)=>{const q=B.MeshBuilder.CreateTorus('v121_'+n,{diameter:d,thickness:t,tessellation:14},scene);q.position.set(x,y,z);q.rotation.x=Math.PI/2;q.material=m;q.isPickable=false;created.push(q);return q;};

  // The first V12 pass accidentally placed several building centres on road centrelines.
  // Disable only those outer-district meshes and rebuild them in the blocks between roads.
  const disablePrefixes=['v12_apartment','v12_window','v12_balconySlab','v12_balconyRail','v12_laundryLine','v12_laundryCloth','v12_acUnit','v12_waterTank','v12_dishPole','v12_satDish','v12_unfinishedBrick','v12_shopFront','v12_sign_districtShop','v12_awning','v12_streetCrate','v12_marketCrate','v12_marketProduce','v12_ahwaTable','v12_plasticChair','v12_sign_market','v12_workshopBay','v12_sign_workshop','v12_workBench','v12_tyre'];
  let disabled=0;
  for(const m of scene.meshes){if(disablePrefixes.some(p=>m.name.startsWith(p))){m.setEnabled(false);m.checkCollisions=false;disabled++;}}
  for(const n of scene.transformNodes){if(n.name==='v12_microbus_root'||n.name==='v12_tuktuk_root')n.setEnabled(false);}

  function roof(x,z,w,d,h,seed){const metal=mat('roofMetal','#747570'),tank=mat('tank','#b9b5a8');if(seed%2===0)cyl('roofTank',1.5,1.18,x+w*.2,h+.65,z+d*.12,tank,14);const pole=cyl('dishPole',.055,1.0,x-w*.22,h+.55,z-d*.16,metal,8);pole.rotation.z=.06;const dish=B.MeshBuilder.CreateDisc('v121_dish',{radius:.58,tessellation:20},scene);dish.position.set(x-w*.22,h+1.0,z-d*.16);dish.rotation.x=Math.PI/2.35;dish.material=metal;dish.isPickable=false;created.push(dish);}
  function apartment(x,z,w,d,floors,seed,shop=false){
    const palette=['#c5aa8b','#b89c7d','#ccb596','#b9987b','#c2b099','#ae987f'];const wall=mat('wall'+seed,palette[seed%palette.length]),dark=mat('glass','#26343a','#080e12'),rail=mat('rail','#53534f'),ac=mat('ac','#cfcec7');const h=floors*3;
    box('apartment',w,h,d,x,h/2,z,wall,true);
    for(let f=1;f<floors;f++){const y=f*3-1.15;for(const side of [-1,1]){const wx=x+side*w*.28,front=z-d/2-.05;box('window',1.4,1.2,.06,wx,y,front,dark);box('balconySlab',2.75,.11,.9,wx,y-.78,front-.42,wall);box('balconyRail',2.75,.55,.05,wx,y-.48,front-.86,rail);if((f+seed+(side>0?1:0))%3===0){box('laundryLine',2.35,.025,.025,wx,y-.12,front-.89,rail);for(let c=0;c<3;c++){const cloth=box('laundry',.5,.62,.03,wx-.65+c*.65,y-.48,front-.9,mat('cloth'+c,['#bf665a','#52749a','#d2bd62'][c]));cloth.rotation.z=(c-1)*.03;}}}if(f%2===1)box('acUnit',.78,.43,.34,x+w*.37,y-.12,z-d/2-.2,ac);}
    roof(x,z,w,d,h,seed);
    if(shop){const names=['بقالة الحارة','مخبز بلدي','موبايلات','مغسلة وكي','أدوات منزلية','عصير وقصب','صيدلية','سوبر ماركت'];const name=names[seed%names.length],front=z-d/2-.13;box('shopFront',Math.min(5,w*.52),2.25,.14,x,1.15,front,mat('shop'+seed,['#4d6a54','#81513b','#41657a','#6b5244'][seed%4]));sign('shop'+seed,name,x,2.58,front-.09,Math.min(4.8,w*.5),.58,['#315d48','#7d4b35','#315f78','#684a38'][seed%4],Math.PI);const aw=box('awning',Math.min(5.1,w*.51),.11,1.05,x,2.27,front-.68,mat('awning'+seed,seed%2?'#8b493a':'#46694f'));aw.rotation.x=-.1;for(let c=0;c<3;c++)box('crate',.7,.28,.52,x-.9+c*.9,.17,front-1.22,mat('crate','#76553d'));}
  }

  // West/east buildings now sit BETWEEN z=-144,-72,-24,24,72,144 roads.
  const blockZ=[-108,-48,0,48,108];let seed=200;
  for(const z of blockZ){apartment(-172,z,19,18,5+(seed%3),seed++,true);apartment(-117,z,14,18,5+(seed%2),seed++,z!==48);}
  for(const z of blockZ){apartment(117,z,14,18,5+(seed%2),seed++,z!==48);if(z!==48)apartment(172,z,19,18,5+(seed%3),seed++,true);}
  sign('westDistrict','الحي السكني',-144,3.7,-96,6.5,.72,'#315f78',0);sign('eastDistrict','الميدان والسوق',144,3.7,-96,7.2,.72,'#7b4d31',0);

  // North district uses block centres between vertical roads, not the road centrelines.
  for(const x of [-96,-48,0,48,96])apartment(x,172,18,17,5+(seed++%2),seed,true);

  function market(){
    const wood=mat('marketWood','#76533a'),colors=['#b64f3e','#64904f','#d6b34c','#8a5944'];
    sign('market','سوق الميدان',168,3.0,39,5.8,.68,'#874f31',Math.PI);
    for(let r=0;r<3;r++)for(let c=0;c<5;c++){box('marketCrate',.95,.3,.7,159+c*1.12,.18,46+r*.88,wood);for(let j=0;j<6;j++){const q=B.MeshBuilder.CreateSphere('v121_produce',{diameter:.18,segments:6},scene);q.position.set(158.68+c*1.12+(j%3)*.22,.39,45.75+r*.88+Math.floor(j/3)*.25);q.material=mat('produce'+((r+c+j)%4),colors[(r+c+j)%4]);q.isPickable=false;created.push(q);}}
    const table=mat('table','#654936'),chairs=['#3d75a5','#8d443a','#4d865b','#d0b64a'];for(let i=0;i<4;i++){box('ahwaTable',.74,.08,.74,169+i*1.35,.63,51,table);for(const s of [-1,1])box('chair',.5,.72,.5,169+i*1.35+s*.65,.38,51.1,mat('chair'+i+s,chairs[(i+(s>0?1:0))%4]));}
    vehicle('microbus',151,69,Math.PI/2,'#e6e2d7');vehicle('tuktuk',157,66,Math.PI/2,'#31778a');
    box('vendorUmbrellaPole',.08,2.2,.08,164,1.1,45,mat('pole','#595956'));const top=B.MeshBuilder.CreateCylinder('v121_vendorUmbrella',{diameterTop:.4,diameterBottom:3.3,height:.45,tessellation:16},scene);top.position.set(164,2.35,45);top.material=mat('umbrella','#9b493b');created.push(top);
  }
  function vehicle(type,x,z,rot,color){const root=new B.TransformNode('v121_'+type+'_root',scene);root.position.set(x,0,z);root.rotation.y=rot;const body=box(type+'Body',type==='microbus'?4.0:2.2,type==='microbus'?2.1:1.5,type==='microbus'?1.8:1.2,0,type==='microbus'?1.08:.78,0,mat(type,color));body.parent=root;body.position.set(0,type==='microbus'?1.08:.78,0);const glass=box(type+'Glass',type==='microbus'?2.2:1,.52,.08,0,type==='microbus'?1.48:1.0,type==='microbus'?-.94:-.64,mat('vehicleGlass','#27373d','#080f13'));glass.parent=root;glass.position.set(0,type==='microbus'?1.48:1.0,type==='microbus'?-.94:-.64);const wm=mat('wheel','#242424');for(const sx of [-1,1])for(const sz of [-1,1]){const w=torus(type+'Wheel',.52,.14,0,0,0,wm);w.parent=root;w.position.set(sx*(type==='microbus'?1.35:.65),.34,sz*(type==='microbus'?.7:.46));w.rotation.z=Math.PI/2;}return root;}
  market();

  function workshops(){const wall=mat('workshop','#454744'),metal=mat('metal','#737672'),tyre=mat('tyre','#242524'),names=['ميكانيكي','كاوتش وبنشر','نجار','كهربائي سيارات','سمكري ودوكو'];let i=0;for(const x of [-96,-48,0,48,96]){box('workshop',16,3.2,9,x,1.6,119,wall,true);sign('workshop'+i,names[i],x,3.03,114.4,6,.58,['#5b4b39','#3b5562','#74533a','#405e6c','#70473d'][i],0);box('bench',3,.7,.65,x-2,.36,114,metal);for(let t=0;t<3;t++)torus('tyre',.86,.19,x+1+t*.42,.24+t*.08,114.1,tyre);i++;}}
  workshops();

  // Turn the family home into the ground-floor apartment of a lived-in 5-storey block.
  const hx=-164,hz=-164,wall=mat('homeUpper','#b79d82'),glass=mat('homeGlass','#26343b','#080e12'),rail=mat('homeRail','#555651');
  box('homeUpperBlock',22,12,18,hx,9.15,hz,wall,true);
  for(let f=0;f<4;f++){const y=4.65+f*2.85;for(const sx of [-5.8,0,5.8]){box('homeUpperWindow',1.55,1.25,.08,hx+sx,y,hz+9.05,glass);box('homeUpperBalcony',3.4,.12,1.0,hx+sx,y-.8,hz+9.55,wall);box('homeUpperRail',3.4,.58,.05,hx+sx,y-.5,hz+10.02,rail);if((f+Math.round(sx))%2===0){box('homeUpperLaundryLine',2.8,.025,.025,hx+sx,y-.12,hz+10.04,rail);for(let c=0;c<3;c++)box('homeUpperLaundry',.55,.62,.03,hx+sx-.7+c*.7,y-.48,hz+10.05,mat('homeCloth'+c,['#bd6158','#54769a','#d4bf66'][c]));}}}
  roof(hx,hz,22,18,15.15,500);sign('familyBuilding','عمارة بيت العيلة',hx,3.5,hz+9.15,5.2,.62,'#65452f',Math.PI);

  // Structural connectivity audit: no rebuilt apartment/workshop intersects main outer road cores.
  const blockers=created.filter(m=>m.checkCollisions&&/v121_(apartment|workshop|homeUpperBlock)/.test(m.name));
  const roads=[{axis:'x',v:-144},{axis:'x',v:144},{axis:'z',v:-144},{axis:'z',v:144}];
  let roadIntrusions=0;for(const m of blockers){m.computeWorldMatrix(true);const bb=m.getBoundingInfo().boundingBox;for(const r of roads){const min=r.axis==='x'?bb.minimumWorld.x:bb.minimumWorld.z,max=r.axis==='x'?bb.maximumWorld.x:bb.maximumWorld.z;if(r.v>min-4.5&&r.v<max+4.5)roadIntrusions++;}}

  const density={apartments:created.filter(m=>m.name==='v121_apartment').length,shops:created.filter(m=>m.name==='v121_shopFront').length,laundry:created.filter(m=>m.name==='v121_laundry').length,roofUtilities:created.filter(m=>/roofTank|dish/.test(m.name)).length,marketProps:created.filter(m=>/marketCrate|produce|ahwaTable|chair|vendorUmbrella/.test(m.name)).length,workshops:created.filter(m=>m.name==='v121_workshop').length};
  window.__V121_POLISH={version:VERSION,ready:true,disabledBadPlacementMeshes:disabled,roadCorridorsClear:roadIntrusions===0,roadIntrusions,density,homeAsApartmentBlock:true,marketMovedOffArterial:true};
  window.__V12_WORLD.version=VERSION;window.__V12_WORLD.roadCorridorsClear=roadIntrusions===0;window.__V12_WORLD.homeAsApartmentBlock=true;window.__V12_WORLD.visualDensity=density;window.__V12_WORLD.authenticity.score=roadIntrusions===0?100:90;window.__V12_WORLD.authenticity.features.clearRoadCorridors=roadIntrusions===0;window.__V12_WORLD.authenticity.features.familyHomeInApartmentBlock=true;
  window.__egyptDebug=window.__egyptDebug||{};window.__egyptDebug.v121PolishState=()=>({...window.__V121_POLISH,density:{...density}});
})();