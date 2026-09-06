(() => {
  'use strict';
  const B=BABYLON,VERSION='11.24.0',built=[];
  let scene,M;
  const old=name=>scene.getMeshByName('v12_'+name);
  function finish(m,name,x,y,z,material){m.name='home24_'+name;m.position.set(x,y,z);m.material=material;m.isPickable=false;m.receiveShadows=true;m.metadata={homeDetail:VERSION};built.push(m);return m;}
  function box(name,w,h,d,x,y,z,mat=M.wood){return finish(B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene),name,x,y,z,mat);}
  function round(name,w,h,d,r,x,y,z,mat){
    // A bevelled cuboid retains flat upholstery faces and rounded stitched edges.
    const p=[],n=[],uv=[],idx=[],half=[w/2,h/2,d/2],inner=half.map(v=>Math.max(0,v-r)),steps=8;
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
      const base=p.length/3,u=(axis+1)%3,v=(axis+2)%3;
      for(let j=0;j<=steps;j++)for(let i=0;i<=steps;i++){
        const q=[0,0,0];q[axis]=half[axis]*sign;q[u]=(i/steps*2-1)*half[u];q[v]=(j/steps*2-1)*half[v];
        const nearest=q.map((x,k)=>Math.max(-inner[k],Math.min(inner[k],x))),normal=q.map((x,k)=>x-nearest[k]),length=Math.hypot(...normal)||1;
        p.push(...nearest.map((x,k)=>x+normal[k]/length*r));n.push(...normal.map(x=>x/length));uv.push(i/steps,j/steps);
        if(i<steps&&j<steps){const a=base+j*(steps+1)+i,b=a+1,c=a+steps+1;idx.push(...(sign<0?[a,b,c,b,c+1,c]:[a,c,b,b,c,c+1]));}
      }
    }
    const m=new B.Mesh(name,scene),data=new B.VertexData();Object.assign(data,{positions:p,normals:n,uvs:uv,indices:idx});data.applyToMesh(m);
    return finish(m,name,x,y,z,mat);
  }
  function cylinder(name,diameter,height,x,y,z,mat=M.metal){return finish(B.MeshBuilder.CreateCylinder(name,{diameter,height,tessellation:28},scene),name,x,y,z,mat);}
  function tube(name,points,radius,mat=M.metal){return finish(B.MeshBuilder.CreateTube(name,{path:points.map(p=>new B.Vector3(...p)),radius,tessellation:12,cap:B.Mesh.CAP_ALL},scene),name,0,0,0,mat);}
  function uvMetres(mesh,metres){const p=mesh.getVerticesData('position'),n=mesh.getVerticesData('normal'),uv=[];for(let i=0;i<p.length;i+=3){const axis=Math.abs(n[i+1])>.6?1:Math.abs(n[i])>.6?0:2;uv.push((axis===0?p[i+2]:p[i])/metres,(axis===1?p[i+2]:p[i+1])/metres);}mesh.makeGeometryUnique();mesh.setVerticesData('uv',uv);}
  function legs(name,x,z,w,d,top){for(const sx of [-1,1])for(const sz of [-1,1])box(name+sx+sz,.075,top-.10,.075,x+sx*(w/2-.12),.10+(top-.10)/2,z+sz*(d/2-.12));}
  function hide(names){for(const name of names)old(name)?.setEnabled(false);}
  function turnFurniture(name,meshes,x,z,nextX=x,nextZ=z){const root=new B.TransformNode('home24_'+name,scene);root.position.set(nextX,0,nextZ);root.rotation.y=Math.PI;for(const m of meshes){m.parent=root;m.position.x-=x;m.position.z-=z;}return root;}
  function bedroom(){
    hide(['bedBase','mattress','pillowA','pillowB','bedHeadboard','bedsideTable']);
    const x=-155.05,z=-155;
    const frame=round('bedFrame',2.75,.26,2.6,.035,x,.42,z,M.wood);frame.checkCollisions=true;legs('bedLeg',x,z,2.7,2.5,.36);
    round('mattress',2.59,.34,2.43,.095,x,.73,z,M.linen);
    round('headboard',2.8,1.2,.15,.04,x,.81,-156.25,M.wood);
    for(const sx of [-.62,.62])round('headboardPanel'+sx,1.2,.65,.07,.035,x+sx,1.03,-156.15,M.cane);
    for(const sx of [-.65,.65]){const pillow=round('pillow'+sx,1.06,.22,.65,.10,x+sx,1.005,-155.6,M.linen);pillow.rotation.y=sx*.055;}
    for(const name of ['bedQuilt','bedQuiltFold']){const m=old(name);m.position.x=x;m.scaling.x=2.50/3.96;m.material=name==='bedQuilt'?M.quilt:M.linen;}
    for(const side of [-1,1])round('quiltDrape'+side,.06,.39,1.38,.025,x+side*1.27,.8,-154.58,M.quilt);
    const bedside=round('bedsideCabinet',.73,.56,.64,.025,-156.8,.40,-155.35,M.wood);bedside.checkCollisions=true;legs('bedsideLeg',-156.8,-155.35,.73,.64,.23);
    for(const y of [.35,.57]){box('bedsideDrawer',.64,.19,.024,-156.8,y,-155.014,M.wood);cylinder('drawerKnob',.036,.055,-156.8,y,-154.985,M.brass).rotation.x=Math.PI/2;}
    old('alarmClock').position.y=.825;old('alarmClockFace').position.y=.825;
    box('clockFootA',.045,.035,.10,-156.91,.714,-155.36,M.dark);box('clockFootB',.045,.035,.10,-156.69,.714,-155.36,M.dark);
    for(const sx of [-1,1]){box('wardrobeDoor',1.19,2.25,.04,-144.2+sx*.62,1.27,-155.345,M.wood);box('wardrobeHandle',.025,.32,.05,-144.2+sx*.13,1.27,-155.30,M.brass);}
    const wardrobe=turnFurniture('wardrobeGroup',[old('wardrobe'),...built.filter(m=>/^home24_wardrobe/.test(m.name))],-144.2,-155.7,-158.4,-153.5);wardrobe.rotation.y=Math.PI/2;old('wardrobe').material=M.wood;old('wardrobe').checkCollisions=true;
  }
  function sittingRoom(){
    hide(['sofaSeat','sofaBack','coffeeTable','coffeeLegA','coffeeLegB','tv','tvStand']);
    const x=-146,z=-151.2;
    round('sofaBase',3.35,.29,1.13,.07,x,.38,z,M.sofa).checkCollisions=true;legs('sofaFoot',x,z,3.24,1.0,.30);
    round('sofaBack',3.35,.73,.22,.07,x,.90,z-.47,M.sofa);
    for(const sx of [-1,1])round('sofaArm'+sx,.24,.62,1.14,.08,x+sx*1.58,.65,z,M.sofa);
    for(let i=-1;i<=1;i++){
      round('seatCushion'+i,.94,.19,.82,.065,x+i*.98,.60,z+.04,M.sofa);
      const back=round('backCushion'+i,.93,.54,.18,.07,x+i*.98,.96,z-.33,M.sofa);back.rotation.x=-.12;
    }
    for(const sx of [-1,1]){const cushion=round('scatterCushion'+sx,.44,.44,.17,.065,x+sx*1.06,.94,z+.01,M.quilt);cushion.rotation.z=sx*.15;}
    round('coffeeTop',1.65,.10,.85,.045,x,.56,-149.35,M.wood).checkCollisions=true;legs('coffeeLeg',x,-149.35,1.65,.85,.51);
    round('coffeeShelf',1.38,.035,.64,.015,x,.24,-149.35,M.cane);
    const tray=cylinder('teaTray',.46,.023,-146.35,.626,-149.32,M.brass);
    for(let i=0;i<2;i++){cylinder('teaGlass'+i,.095,.14,-146.48+i*.22,.703,-149.32,M.glass);cylinder('tea'+i,.080,.003,-146.48+i*.22,.755,-149.32,M.tea);}
    box('bookPages',.26,.055,.35,-145.58,.64,-149.31,M.linen);box('bookCover',.28,.009,.37,-145.58,.673,-149.31,M.green);
    turnFurniture('sittingGroup',built.filter(m=>/^home24_(sofa|seatCushion|backCushion|scatterCushion|coffee|tea|book)/.test(m.name)),x,z);
    // The sofa faces a TV against the north wall; the kitchen stays behind it.
    round('mediaCabinet',2.15,.48,.43,.025,-145.9,.45,-146.7,M.wood).checkCollisions=true;legs('mediaFoot',-145.9,-146.7,2.15,.43,.25);
    for(const sx of [-1,1])box('mediaDoor',1.015,.35,.022,-145.9+sx*.527,.45,-146.93,M.cane);
    const tv=round('television',1.73,.97,.085,.032,-145.9,1.31,-146.7,M.dark);
    box('tvScreen',1.64,.865,.007,-145.9,1.315,-146.747,M.screen);
    for(const sx of [-1,1]){const leg=box('tvFoot',.23,.025,.30,-145.9+sx*.56,.713,-146.7,M.dark);leg.rotation.y=sx*.22;}
    turnFurniture('televisionGroup',built.filter(m=>/^home24_(media|television$|tv)/.test(m.name)),-145.9,-146.7,-145.9,-155.65);
    const rug=old('rug');rug.position.set(-146,.122,-152.85);rug.scaling.set(.84,1,.86);rug.material=M.rug;
    // A proper table and four-legged chairs replace floating dining slabs.
    old('diningTop').material=M.wood;legs('diningLeg',-154.5,-146.9,2.7,1.5,.76);
    for(const m of scene.meshes.filter(m=>/^v12_chairSeat_/.test(m.name))){m.material=M.wood;legs('chairLeg'+m.uniqueId,m.position.x,m.position.z,.67,.67,.44);round('chairCushion',.62,.07,.62,.025,m.position.x,.548,m.position.z,M.cane);}
    for(const m of scene.meshes.filter(m=>/^v12_chairBack_/.test(m.name)))m.material=M.cane;
    cylinder('diningTray',.62,.027,-154.5,.902,-146.9,M.brass);
    const jug=EgyptQuality.pot('home24_waterJug',null,-154.5,.915,-146.9,.25,.28);built.push(...jug.getChildMeshes(false),jug);
  }
  function kitchen(){
    const counter=old('counter');counter.material=M.cabinet;counter.checkCollisions=true;
    round('countertop',4.7,.07,.79,.025,-144.7,.985,-148,M.stone);
    for(let i=0;i<5;i++){
      const x=-146.54+i*.92;box('cabinetDoor'+i,.86,.73,.04,x,.52,-147.622,M.cabinet);
      box('cabinetInset'+i,.69,.56,.015,x,.52,-147.595,M.cabinet);box('cabinetHandle'+i,.17,.024,.05,x,.76,-147.568,M.brass);
    }
    box('kitchenKickboard',4.5,.12,.055,-144.7,.165,-147.66,M.dark);
    const splash=box('backsplash',4.75,.63,.045,-144.7,1.30,-148.34,M.tile);uvMetres(splash,.42);
    // The sink is a recessed dark basin with four steel rim pieces and a curved tap.
    round('sinkBasin',.86,.055,.50,.08,-144.70,1.025,-148.02,M.dark);
    for(const sx of [-1,1])box('sinkRimSide',.07,.03,.52,-144.70+sx*.42,1.058,-148.02,M.metal);
    for(const sz of [-1,1])box('sinkRim',.85,.03,.045,-144.70,1.058,-148.02+sz*.24,M.metal);
    tube('faucet',[[-144.70,1.05,-148.29],[-144.70,1.27,-148.29],[-144.70,1.37,-148.20],[-144.70,1.32,-148.02]],.022);
    for(const sx of [-1,1])cylinder('tapHandle',.055,.035,-144.70+sx*.14,1.066,-148.27,M.metal);
    box('choppingBoard',.44,.025,.29,-143.34,1.035,-148,M.wood);
    const cooker=old('stove');cooker.material=M.cream;cooker.checkCollisions=true;
    box('hob',1.42,.026,.98,-145.1,.956,-145.45,M.metal);
    for(const dx of [-.37,.37])for(const dz of [-.25,.25]){cylinder('burner',.26,.022,-145.1+dx,.983,-145.45+dz,M.dark);for(const turn of [0,Math.PI/2]){const grate=box('hobGrate',.33,.026,.025,-145.1+dx,1.00,-145.45+dz,M.dark);grate.rotation.y=turn;}}
    box('ovenGlass',1.07,.42,.014,-145.1,.46,-144.94,M.screen);box('ovenHandle',.78,.035,.10,-145.1,.745,-144.89,M.metal);
    for(let i=0;i<4;i++)cylinder('cookerKnob',.071,.04,-145.49+i*.26,.853,-144.92,M.dark).rotation.x=Math.PI/2;
    const pot=EgyptQuality.pot('home24_cookingPot',null,-145.47,1.02,-145.70,.31,.23);built.push(...pot.getChildMeshes(false),pot);
    const fridge=old('fridge');fridge.material=M.cream;fridge.checkCollisions=true;
    for(const [y,h] of [[.78,1.31],[1.84,.73]])round('fridgeDoor',1.29,h,.055,.023,-142.9,y,-144.87,M.cream);
    for(const y of [1.1,1.77])box('fridgeHandle',.04,.29,.075,-143.41,y,-144.805,M.metal);
    box('fridgeMagnet',.09,.07,.014,-142.54,1.91,-144.83,M.green);
    old('washer').material=M.cream;old('washer').checkCollisions=true;
    const rim=cylinder('washerRim',.69,.07,-146.8,.51,-144.90,M.metal);rim.rotation.x=Math.PI/2;
    const glass=cylinder('washerGlass',.53,.075,-146.8,.51,-144.855,M.screen);glass.rotation.x=Math.PI/2;
    cylinder('washerDial',.12,.04,-146.40,.91,-144.93,M.metal).rotation.x=Math.PI/2;
    box('washerDrawer',.41,.125,.024,-147.10,.915,-144.937,M.cream);
    turnFurniture('fridgeGroup',[old('fridge'),...built.filter(m=>/^home24_fridge/.test(m.name))],-142.9,-145.5,-142.9,-144);
    turnFurniture('washerGroup',[old('washer'),...built.filter(m=>/^home24_washer/.test(m.name))],-146.8,-145.45,-146.8,-144);
    turnFurniture('cookerGroup',[old('stove'),...built.filter(m=>/^home24_(hob|burner|oven|cookerKnob)/.test(m.name)),pot],-145.1,-145.45,-145.1,-144);
  }
  function room(){
    old('homeFloor').material=M.tile;uvMetres(old('homeFloor'),1.5);
    for(const m of scene.meshes.filter(m=>/^v12_homeWall/.test(m.name))){m.material=M.plaster;uvMetres(m,3);}
    old('homeCeiling').material=M.cream;
    for(const [x,z,w,d] of [[-158.84,-150,.08,13.7],[-141.16,-150,.08,13.7],[-150,-156.84,17.7,.08],[-155.4,-143.15,7.2,.08],[-144.6,-143.15,7.2,.08]]){box('skirting',w,.16,d,x,.18,z,M.wood);box('cornice',w,.075,d,x,3.045,z,M.cream);}
    // Timber jambs, slatted shutters and pleated curtains make the window an opening.
    old('window').material=M.window;
    for(const sx of [-1,1])box('windowJamb',.10,1.63,.16,-155+sx*1.76,1.8,-156.75,M.wood);
    for(const sy of [-1,1])box('windowFrame',3.62,.10,.16,-155,1.8+sy*.77,-156.75,M.wood);
    box('windowMullion',.06,1.45,.13,-155,1.8,-156.72,M.wood);box('windowSill',3.78,.085,.38,-155,1.015,-156.70,M.stone);
    for(const sx of [-1,1]){box('shutterPanel',.61,1.47,.075,-155+sx*1.4,1.8,-156.64,M.green);for(let i=0;i<13;i++){const slat=box('shutterSlat',.54,.065,.04,-155+sx*1.4,1.16+i*.102,-156.575,M.green);slat.rotation.x=.25;}}
    tube('curtainRail',[[-157.16,2.72,-156.43],[-152.84,2.72,-156.43]],.026,M.brass);
    for(const sx of [-1,1])for(let i=0;i<7;i++){
      const x=-155+sx*(1.60+i*.082),m=round('curtainPleat',.12,1.76,.105,.042,x,1.78,-156.40+Math.sin(i*2)*.034,M.curtain);m.scaling.y=1+Math.sin(i)*.009;
    }
    const door=old('homeDoor');door.material=M.wood;door.checkCollisions=true;
    for(const sx of [-1,1])box('doorJamb',.10,2.80,.22,-150+sx*1.18,1.4,-143.22,M.wood);
    box('doorLintel',2.46,.10,.22,-150,2.78,-143.22,M.wood);
    for(const y of [-.65,.3]){const panel=box('doorPanel',1.84,.72,.024,0,0,0,M.wood);panel.parent=door;panel.position.set(0,y,-.077);}
    const handle=box('doorHandle',.20,.035,.09,0,0,0,M.brass);handle.parent=door;handle.position.set(.80,-.05,-.10);
    for(let i=0;i<7;i++)box('acVent',1.17,.015,.018,-145.3,2.28+i*.024,-156.622,M.dark);
    hide(['fanHead','fanPole']);
    cylinder('fanBase',.51,.065,-144.5,.15,-144.2,M.cream);cylinder('fanStem',.055,1.10,-144.5,.72,-144.2,M.metal);
    const fan=cylinder('fanMotor',.18,.23,-144.5,1.48,-144.2,M.cream);fan.rotation.x=Math.PI/2;
    for(const radius of [.10,.28,.45]){const ring=B.MeshBuilder.CreateTorus('fanRing',{diameter:radius*2,thickness:.009,tessellation:40},scene);finish(ring,'fanGuard',-144.5,1.48,-144.06,M.metal);ring.rotation.x=Math.PI/2;}
    for(let i=0;i<8;i++){const a=i*Math.PI/4;tube('fanSpoke',[[-144.5,1.48,-144.025],[-144.5+Math.cos(a)*.45,1.48+Math.sin(a)*.45,-144.06]],.005,M.metal);}
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3,blade=round('fanBlade',.18,.34,.025,.012,-144.5+Math.sin(a)*.20,1.48+Math.cos(a)*.20,-144.13,M.green);blade.rotation.z=-a;}
    const plant=EgyptQuality.pot('home24_planter',null,-142,.12,-152.8,.39,.42);built.push(...plant.getChildMeshes(false),plant);
    for(let i=0;i<8;i++){const a=i*Math.PI/4,stem=[[-142,.50,-152.8],[-142+Math.sin(a)*.19,.93+i%3*.13,-152.8+Math.cos(a)*.19]];tube('plantStem',stem,.012,M.green);const tip=stem[1],leaf=finish(B.MeshBuilder.CreateSphere('leaf',{diameter:1,segments:12},scene),'plantLeaf',...tip,M.green);leaf.scaling.set(.16,.33,.045);leaf.rotation.z=-Math.sin(a)*.7;leaf.rotation.y=a;}
  }
  function pattern(name,paint){const t=new B.DynamicTexture('home24_'+name,{width:512,height:512},scene,true);paint(t.getContext());t.update();const m=new B.StandardMaterial('home24_'+name,scene);m.diffuseTexture=t;m.specularColor=B.Color3.Black();return m;}
  async function install(){
    while(!window.__EGYPT_QUALITY?.ready)await new Promise(r=>setTimeout(r,100));scene=B.Engine.LastCreatedEngine.scenes[0];
    const material=(name,cell,color='#ffffff')=>EgyptQuality.material('home24_'+name,cell,color);
    M={wood:material('walnut',9,'#e3c39c'),cane:material('cane',10,'#e3d4ad'),linen:material('linen',1,'#f6efdf'),sofa:material('sofa',1,'#7f9890'),quilt:material('quilt',1,'#b38365'),green:material('paint',11,'#b3c4b1'),cream:material('cream',-1,'#e9e3d6'),dark:material('dark',-1,'#33362f'),brass:material('brass',8,'#b6a174'),metal:material('steel',8,'#c3c9c5'),stone:material('stone',12,'#e3ded0'),tile:material('tiles',13,'#ece6d8'),plaster:material('wall',4,'#f5ebd7'),screen:material('screen',-1,'#263e41'),glass:material('glass',-1,'#b4c7be'),tea:material('tea',-1,'#8b5026'),curtain:material('curtain',1,'#e9d6b3')};
    M.rug=pattern('kilim',c=>{c.fillStyle='#965d46';c.fillRect(0,0,512,512);for(const [inset,color] of [[13,'#d4b788'],[28,'#344b4a'],[45,'#d4b788'],[54,'#965d46']]){c.strokeStyle=color;c.lineWidth=9;c.strokeRect(inset,inset,512-inset*2,512-inset*2);}for(let y=108;y<460;y+=100)for(let x=105;x<460;x+=100){c.fillStyle='#d8bc86';c.beginPath();c.moveTo(x,y-39);c.lineTo(x+34,y);c.lineTo(x,y+39);c.lineTo(x-34,y);c.closePath();c.fill();c.fillStyle='#364d49';c.fillRect(x-11,y-11,22,22);}});
    const paint=M.plaster.diffuseTexture.getContext().canvas;M.plaster=pattern('interiorPaint',c=>{c.fillStyle='#e6ddcd';c.fillRect(0,0,512,512);c.globalAlpha=.14;c.drawImage(paint,0,0,512,512);c.globalAlpha=1;});
    M.cabinet=material('cabinetPaint',-1,'#81958a');
    M.window=pattern('windowView',c=>{c.fillStyle='#c0d5d6';c.fillRect(0,0,512,512);for(let i=0;i<4;i++){const x=i*136-15,top=100+(i%3)*37;c.fillStyle=['#b7a18c','#d0b696','#baac91'][i%3];c.fillRect(x,top,129,512-top);for(let y=top+25;y<512;y+=65)for(let j=0;j<3;j++){c.fillStyle='#536f6a';c.fillRect(x+13+j*36,y,21,32);c.fillStyle='#8f866f';c.fillRect(x+10+j*36,y+33,28,5);}}});
    bedroom();sittingRoom();kitchen();room();EgyptQuality.addCasters?.(built);
    window.__EGYPT_HOME24={ready:true,version:VERSION,details:built.length,bedWidth:2.75,walkway:{x:-150,fromZ:-151,toZ:-143.3}};
  }
  install().catch(e=>{console.error(e);const box=document.getElementById('errorBox');box.textContent='تعذّر تجهيز البيت: '+e.message;box.style.display='block';});
})();
