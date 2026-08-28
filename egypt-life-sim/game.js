(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, adaptToDeviceRatio: true });
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

  const ui = {
    money: document.getElementById('money'), hungerTxt: document.getElementById('hungerTxt'), hungerBar: document.getElementById('hungerBar'),
    energyTxt: document.getElementById('energyTxt'), energyBar: document.getElementById('energyBar'), moodTxt: document.getElementById('moodTxt'), moodBar: document.getElementById('moodBar'),
    time: document.getElementById('time'), day: document.getElementById('day'), taskTitle: document.getElementById('taskTitle'), taskText: document.getElementById('taskText'),
    prompt: document.getElementById('prompt'), toast: document.getElementById('toast'), start: document.getElementById('start'), shop: document.getElementById('shop'),
    shopTitle: document.getElementById('shopTitle'), shopDesc: document.getElementById('shopDesc'), shopItems: document.getElementById('shopItems'), minimap: document.getElementById('minimap')
  };

  const state = Object.assign({
    money: 250, hunger: 85, energy: 90, mood: 72, minute: 8 * 60 + 10, day: 1, task: 0,
    homeVisited: false, groceryVisited: false, delivered: 0, savedX: 0, savedZ: 12
  }, loadSave());

  const world = { interactables: [], shops: [], npcs: [], vehicles: [], mapSize: 320, roadEvery: 48, roadWidth: 16, blockHalf: 16, home: null };
  const materialCache = new Map();
  let scene, camera, sun, hemi, sky, currentInteractable = null, shopOpen = false, toastTimer = 0, lastSave = 0, simulationClock = 0;
  let moveX = 0, moveY = 0, sprint = false, mobileLookPointer = null, lastLookX = 0, lastLookY = 0;

  function loadSave() {
    try { return JSON.parse(localStorage.getItem('hayat-alhara-save') || '{}') || {}; } catch { return {}; }
  }
  function saveGame() {
    if (!camera) return;
    state.savedX = +camera.position.x.toFixed(2); state.savedZ = +camera.position.z.toFixed(2);
    localStorage.setItem('hayat-alhara-save', JSON.stringify(state));
  }

  function mat(name, hex, rough = 1, emissive = null) {
    const key = `${name}|${hex}|${emissive || ''}`; if (materialCache.has(key)) return materialCache.get(key);
    const m = new BABYLON.StandardMaterial(name, scene); m.diffuseColor = BABYLON.Color3.FromHexString(hex); m.specularColor.scaleInPlace(0.08);
    if (emissive) m.emissiveColor = BABYLON.Color3.FromHexString(emissive);
    materialCache.set(key, m); return m;
  }

  function box(name, size, pos, material, collisions = true) {
    const b = BABYLON.MeshBuilder.CreateBox(name, { width:size.x, height:size.y, depth:size.z }, scene); b.position.copyFrom(pos); b.material = material; b.checkCollisions = collisions; return b;
  }
  function cyl(name, dia, height, pos, material, tess = 12) {
    const c = BABYLON.MeshBuilder.CreateCylinder(name, { diameter:dia, height, tessellation:tess }, scene); c.position.copyFrom(pos); c.material = material; c.checkCollisions = true; return c;
  }

  function signTexture(text, bg = '#202c4a', fg = '#fff8d8', w = 700, h = 180) {
    const tex = new BABYLON.DynamicTexture('sign-' + text, { width:w, height:h }, scene, false);
    tex.hasAlpha = false; const ctx = tex.getContext(); ctx.fillStyle = bg; ctx.fillRect(0,0,w,h); ctx.fillStyle = fg;
    ctx.font = `bold ${Math.floor(h * .48)}px Tahoma, Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl'; ctx.fillText(text, w/2, h/2 + 4); tex.update();
    return tex;
  }
  function makeSign(text, pos, width = 7, height = 1.5, bg = '#1f3b60') {
    const p = BABYLON.MeshBuilder.CreatePlane('sign-' + text, { width, height }, scene); p.position.copyFrom(pos); p.rotation.y = Math.PI; p.isPickable = false;
    const m = new BABYLON.StandardMaterial('signMat-' + text + Math.random(), scene); m.diffuseTexture = signTexture(text, bg); m.emissiveColor = new BABYLON.Color3(.18,.18,.18); m.backFaceCulling = false; p.material = m; return p;
  }

  function buildScene() {
    scene = new BABYLON.Scene(engine); scene.collisionsEnabled = true; scene.clearColor = new BABYLON.Color4(.73,.82,.92,1); scene.fogMode = BABYLON.Scene.FOGMODE_EXP2; scene.fogDensity = 0.0024; scene.fogColor = new BABYLON.Color3(.74,.80,.84);

    camera = new BABYLON.UniversalCamera('player', new BABYLON.Vector3(state.savedX || 0, 2.0, state.savedZ || 12), scene);
    camera.minZ = .08; camera.speed = .42; camera.angularSensibility = isTouch ? 4200 : 3500; camera.inertia = .58; camera.fov = 1.08;
    camera.applyGravity = true; camera.ellipsoid = new BABYLON.Vector3(.5,.95,.5); camera.ellipsoidOffset = new BABYLON.Vector3(0,.95,0); camera.checkCollisions = true;
    camera.keysUp = [87]; camera.keysDown = [83]; camera.keysLeft = [65]; camera.keysRight = [68]; if (!isTouch) camera.attachControl(canvas, true);

    hemi = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0,1,0), scene); hemi.intensity = .62; hemi.groundColor = new BABYLON.Color3(.32,.28,.22);
    sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-.55,-1,-.35), scene); sun.position = new BABYLON.Vector3(80,120,60); sun.intensity = 1.3;

    const skyMat = new BABYLON.StandardMaterial('skyMat', scene); skyMat.backFaceCulling = false; skyMat.disableLighting = true; skyMat.emissiveColor = new BABYLON.Color3(.55,.72,.88);
    sky = BABYLON.MeshBuilder.CreateSphere('sky', { diameter:900, segments:16 }, scene); sky.material = skyMat; sky.infiniteDistance = true; sky.isPickable = false;

    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width:world.mapSize, height:world.mapSize }, scene); ground.material = mat('ground','#b7a77f'); ground.checkCollisions = true;

    buildCity(); buildLandmarks(); buildVehicles(); buildNPCs(); buildStreetFurniture();

    scene.onBeforeRenderObservable.add(update);
    return scene;
  }

  const palettes = ['#d4bd91','#c6a77a','#d0c2aa','#bc9c79','#d7c6a8','#bda58e','#c8b595','#b9a68e'];
  const awningColors = ['#8e2f2f','#225c47','#294a77','#725125','#5d2e73','#8c5d1d'];
  const shopTemplates = [
    { name:'بقالة أولاد البلد', type:'grocery', desc:'بقالة الحارة — مياه وسناكس واحتياجات البيت', items:[['مياه ساقعة',8,0,3],['عصير مانجا',18,2,8],['بسكوت',12,6,2],['ساندوتش جبنة',25,14,3]] },
    { name:'كشري الحارة', type:'koshary', desc:'طبق كشري سريع يشبعك ويرفع المزاج', items:[['طبق صغير',32,26,4],['طبق كبير',48,42,7],['رز بلبن',22,12,7]] },
    { name:'قهوة المعلم', type:'cafe', desc:'قهوة شعبية — شاي وقهوة ولعبة طاولة', items:[['شاي',12,2,7],['قهوة',18,0,13],['جلسة طاولة',10,0,10]] },
    { name:'فرن بلدي', type:'bakery', desc:'عيش سخن وحاجات سريعة للفطار', items:[['عيش بلدي',6,8,1],['فطيرة جبنة',28,20,4],['باتيه',18,12,2]] },
    { name:'عصير قصب', type:'juice', desc:'عصاير طازة من قلب الشارع', items:[['قصب',18,0,10],['برتقال',24,2,10],['مانجا',30,3,13]] },
    { name:'محمصة الحارة', type:'roaster', desc:'تسالي وحاجات خفيفة', items:[['لب أبيض',20,5,4],['سوداني',18,7,3],['حمص',16,6,3]] }
  ];

  function buildCity() {
    const roads = [];
    for (let x = -144; x <= 144; x += world.roadEvery) roads.push(x);
    const asphalt = mat('asphalt','#4d4d4b'); const sidewalk = mat('sidewalk','#b6afa2'); const curbA = mat('curbA','#e6e1d4'); const curbB = mat('curbB','#343434');

    roads.forEach(x => {
      box('roadX', new BABYLON.Vector3(world.roadWidth,.08,world.mapSize), new BABYLON.Vector3(x,.04,0), asphalt, false);
      box('walkXL', new BABYLON.Vector3(3,.18,world.mapSize), new BABYLON.Vector3(x-world.roadWidth/2-1.5,.09,0), sidewalk, true);
      box('walkXR', new BABYLON.Vector3(3,.18,world.mapSize), new BABYLON.Vector3(x+world.roadWidth/2+1.5,.09,0), sidewalk, true);
    });
    roads.forEach(z => {
      box('roadZ', new BABYLON.Vector3(world.mapSize,.09,world.roadWidth), new BABYLON.Vector3(0,.045,z), asphalt, false);
      box('walkZT', new BABYLON.Vector3(world.mapSize,.18,3), new BABYLON.Vector3(0,.09,z-world.roadWidth/2-1.5), sidewalk, true);
      box('walkZB', new BABYLON.Vector3(world.mapSize,.18,3), new BABYLON.Vector3(0,.09,z+world.roadWidth/2+1.5), sidewalk, true);
    });

    for (let x=-144; x<=144; x+=world.roadEvery) for (let z=-144; z<=144; z+=world.roadEvery) {
      for (let i=-2;i<=2;i++) {
        box('curbStripe', new BABYLON.Vector3(2.2,.25,.42), new BABYLON.Vector3(x+i*2.2,.19,z-world.roadWidth/2-3.05), i%2?curbA:curbB, false);
        box('curbStripe2', new BABYLON.Vector3(.42,.25,2.2), new BABYLON.Vector3(x-world.roadWidth/2-3.05,.19,z+i*2.2), i%2?curbA:curbB, false);
      }
    }

    let shopCounter = 0;
    for (let gx=-120; gx<=120; gx+=world.roadEvery) {
      for (let gz=-120; gz<=120; gz+=world.roadEvery) {
        const seed = Math.abs(Math.floor(gx*13 + gz*17));
        const floors = 4 + (seed % 5); const width = 26 + (seed % 7); const depth = 25 + ((seed>>2)%6); const h = floors*3.05;
        const building = box('building', new BABYLON.Vector3(width,h,depth), new BABYLON.Vector3(gx,h/2,gz), mat('bld'+seed,palettes[seed%palettes.length]), true); building.isPickable = false;
        box('parapet', new BABYLON.Vector3(width+0.3,.7,depth+0.3), new BABYLON.Vector3(gx,h+.28,gz), mat('parapet','#c0b09b'), false);
        const roof = box('roofCut', new BABYLON.Vector3(width-.8,.5,depth-.8), new BABYLON.Vector3(gx,h+.55,gz), mat('roof','#a28f77'), false); roof.isPickable=false;
        for (let t=0;t<2;t++) cyl('tank',1.6,2,new BABYLON.Vector3(gx-width*.22+t*4,h+1.65,gz+depth*.12),mat('tankMat','#202a31'),12).checkCollisions=false;
        addDish(new BABYLON.Vector3(gx+width*.2,h+1.05,gz-depth*.12), seed*.7);

        for (let f=1; f<floors; f++) {
          for (let c=-1;c<=1;c++) {
            const wx = gx + c*(width*.24); const wy = f*3.05 + 1.45;
            const win = box('window', new BABYLON.Vector3(2.35,1.35,.14), new BABYLON.Vector3(wx,wy,gz-depth/2-.08), mat('window','#34444e',1,'#101a20'), false); win.isPickable=false;
            if ((f+c+seed)%3===0) {
              const balcony = box('balcony', new BABYLON.Vector3(3.9,.15,1.2), new BABYLON.Vector3(wx,wy-.82,gz-depth/2-.65), mat('balcony','#c7b7a2'), false); balcony.isPickable=false;
              for (let r=-1;r<=1;r++) box('rail',new BABYLON.Vector3(.07,.75,.07),new BABYLON.Vector3(wx+r*1.5,wy-.45,gz-depth/2-1.18),mat('rail','#444'),false);
              box('railTop',new BABYLON.Vector3(3.2,.07,.07),new BABYLON.Vector3(wx,wy-.1,gz-depth/2-1.18),mat('rail','#444'),false);
            }
            if ((f+c+seed)%4===1) addAC(new BABYLON.Vector3(wx+1.55,wy-.15,gz-depth/2-.13));
          }
        }
        const shopCount = 3; const sw = width/shopCount;
        for (let s=0;s<shopCount;s++) {
          const sx = gx-width/2+sw*(s+.5); const shop = shopTemplates[(shopCounter+s)%shopTemplates.length];
          const shutter = box('shopfront',new BABYLON.Vector3(sw-.45,2.6,.25),new BABYLON.Vector3(sx,1.45,gz-depth/2-.16),mat('front'+shop.type,awningColors[(shopCounter+s)%awningColors.length]),false); shutter.isPickable=false;
          makeSign(shop.name,new BABYLON.Vector3(sx,3.15,gz-depth/2-.31),Math.min(sw-.4,8.4),1.05,awningColors[(shopCounter+s)%awningColors.length]);
          const hotspot = box('hotspot',new BABYLON.Vector3(sw-.65,2.9,1.25),new BABYLON.Vector3(sx,1.45,gz-depth/2-1),mat('hotspot','#ffffff'),false); hotspot.visibility = 0; hotspot.isPickable = true;
          const entry = { mesh:hotspot, kind:'shop', name:shop.name, data:shop, x:sx, z:gz-depth/2-1.2 }; world.interactables.push(entry); world.shops.push(entry);
        }
        shopCounter += 3;
      }
    }

    const marking = mat('marking','#d8d2bb');
    roads.forEach(x => { for(let z=-150;z<150;z+=10) box('dash',new BABYLON.Vector3(.16,.02,4),new BABYLON.Vector3(x,.1,z),marking,false); });
    roads.forEach(z => { for(let x=-150;x<150;x+=10) box('dash',new BABYLON.Vector3(4,.02,.16),new BABYLON.Vector3(x,.105,z),marking,false); });
  }

  function addAC(pos) {
    box('ac',new BABYLON.Vector3(1.05,.62,.38),pos,mat('acmat','#dedbd2'),false);
    for(let i=-2;i<=2;i++) box('acvent',new BABYLON.Vector3(.75,.025,.03),new BABYLON.Vector3(pos.x,pos.y+i*.08,pos.z-.2),mat('dark','#444'),false);
  }
  function addDish(pos, rot) {
    const pole = cyl('dishPole',.09,.8,pos.add(new BABYLON.Vector3(0,-.25,0)),mat('metal','#777'),8); pole.checkCollisions=false;
    const dish = BABYLON.MeshBuilder.CreateDisc('dish',{radius:.8,tessellation:20},scene); dish.position.copyFrom(pos); dish.rotation.x=Math.PI/2.9; dish.rotation.z=rot; dish.material=mat('dish','#cfc9bd'); dish.isPickable=false;
  }

  function buildLandmarks() {
    const homeMesh = box('homeDoor',new BABYLON.Vector3(2.3,3,.28),new BABYLON.Vector3(-114,1.5,-134.1),mat('door','#5a3b25'),false); homeMesh.isPickable=true;
    makeSign('بيتكم',new BABYLON.Vector3(-114,3.55,-134.28),3.1,.8,'#5a3b25');
    world.home = { mesh:homeMesh, kind:'home', name:'البيت', x:-114,z:-134 }; world.interactables.push(world.home);

    const treeMat=mat('tree','#365d32'); const trunkMat=mat('trunk','#60462f');
    cyl('trunk',.5,4,new BABYLON.Vector3(24,2,24),trunkMat,10); const crown=BABYLON.MeshBuilder.CreateSphere('crown',{diameter:5.5,segments:10},scene); crown.position=new BABYLON.Vector3(24,5,24); crown.material=treeMat;crown.isPickable=false;
    box('bench',new BABYLON.Vector3(4,.25,1),new BABYLON.Vector3(18,.6,24),mat('bench','#7a5131'),false);

    const base = box('mosque',new BABYLON.Vector3(16,7,13),new BABYLON.Vector3(120,3.5,120),mat('mosque','#d9cfb5'),true); base.isPickable=false;
    const dome=BABYLON.MeshBuilder.CreateSphere('dome',{diameter:7,segments:18,slice:.55},scene); dome.position=new BABYLON.Vector3(120,8.4,120); dome.material=mat('dome','#8ba188'); dome.isPickable=false;
    cyl('minaret',2.1,16,new BABYLON.Vector3(127,8,121),mat('minaret','#d7c7a6'),14); const tip=BABYLON.MeshBuilder.CreateCylinder('tip',{diameterTop:0,diameterBottom:1.4,height:3,tessellation:16},scene); tip.position=new BABYLON.Vector3(127,17.5,121); tip.material=mat('tip','#727d6e');tip.isPickable=false;

    const job = box('jobStand',new BABYLON.Vector3(3,2.4,2),new BABYLON.Vector3(-72,1.2,72),mat('job','#1d5862'),true); job.isPickable=true; makeSign('طلبات الحارة',new BABYLON.Vector3(-72,2.9,70.95),4,.9,'#1d5862');
    world.interactables.push({mesh:job,kind:'job',name:'طلبات الحارة',x:-72,z:72});
  }

  function buildStreetFurniture() {
    for(let x=-144;x<=144;x+=48) for(let z=-144;z<=144;z+=48){
      const p=new BABYLON.Vector3(x+10,0,z+10); const pole=cyl('lampPole',.16,6,p.add(new BABYLON.Vector3(0,3,0)),mat('lampPole','#494949'),8); pole.checkCollisions=false;
      const bulb=BABYLON.MeshBuilder.CreateSphere('lampBulb',{diameter:.55,segments:8},scene); bulb.position=p.add(new BABYLON.Vector3(0,6.15,0)); bulb.material=mat('bulb','#fff0bd',1,'#6a5b32'); bulb.isPickable=false;
      if(((x+z)/48)%2===0){ box('crate',new BABYLON.Vector3(1.1,.7,.8),new BABYLON.Vector3(x-10,.35,z+10),mat('crate','#8a6238'),true); box('crate2',new BABYLON.Vector3(.9,.6,.8),new BABYLON.Vector3(x-9.2,.3,z+10),mat('crate2','#9a7147'),true); }
    }
  }

  function buildVehicles() {
    const colors=['#e7e7e3','#b43a34','#2e566d','#d8b343','#6c746e'];
    for(let i=0;i<18;i++){
      const vertical=i%2===0; const lane=-144+(i%7)*48 + (i%3===0?3.2:-3.2); const along=-145+(i*37)%290;
      const root=new BABYLON.TransformNode('vehicleRoot',scene); root.position=vertical?new BABYLON.Vector3(lane,.65,along):new BABYLON.Vector3(along,.65,lane); root.rotation.y=vertical?0:Math.PI/2;
      const micro=i%4===0; const body=box('vehicle',new BABYLON.Vector3(micro?2.3:1.9, micro?1.75:1.25, micro?5.6:4.1),new BABYLON.Vector3(0,0,0),mat('car'+i,colors[i%colors.length]),false); body.parent=root; body.position.y=.15;
      const wind=box('wind',new BABYLON.Vector3(micro?2.05:1.7,.65,.08),new BABYLON.Vector3(0,.45,micro?-2.81:-2.06),mat('glass','#24333d',1,'#071218'),false); wind.parent=root;
      for(let s of [-1,1]) for(let f of [-1.6,1.6]){ const w=BABYLON.MeshBuilder.CreateCylinder('wheel',{diameter:.62,height:.24,tessellation:12},scene); w.parent=root; w.position.set(s*(micro?1.05:.92),-.42,f*(micro?1.35:1)); w.rotation.z=Math.PI/2; w.material=mat('wheel','#171717');w.isPickable=false; }
      world.vehicles.push({root,vertical,dir:i%3===0?-1:1,speed:micro?.105:.13,lane});
    }
  }

  function buildNPCs() {
    const clothes=['#415e7a','#7b5140','#3d694c','#6b4a71','#817147','#4a4a4a'];
    for(let i=0;i<34;i++){
      const root=new BABYLON.TransformNode('npcRoot',scene); root.position=new BABYLON.Vector3(-140+(i*29)%280,0,-140+(i*53)%280);
      const body=BABYLON.MeshBuilder.CreateCapsule('npc',{radius:.32,height:1.5,tessellation:8},scene); body.parent=root; body.position.y=1.1; body.material=mat('cloth'+i,clothes[i%clothes.length]);body.isPickable=false;
      const head=BABYLON.MeshBuilder.CreateSphere('head',{diameter:.5,segments:8},scene); head.parent=root; head.position.y=2.0; head.material=mat('skin','#b98563');head.isPickable=false;
      const axis=i%2; const dir=i%3===0?-1:1; world.npcs.push({root,axis,dir,speed:.025+(i%5)*.006,phase:i*.7});
    }
  }

  function update() {
    const dt=Math.min(engine.getDeltaTime(),50)/16.6667; simulationClock += dt;
    if(!shopOpen){ updateMobileMovement(dt); updateNeeds(dt); updateTraffic(dt); updateNPCs(dt); updateInteract(); }
    updateDayNight(); updateHUD(); drawMinimap();
    const now=performance.now(); if(now-lastSave>12000){ saveGame(); lastSave=now; }
  }

  function updateMobileMovement(dt){
    if(!isTouch || !camera || shopOpen) return;
    const forward=camera.getDirection(BABYLON.Axis.Z); forward.y=0; forward.normalize(); const right=camera.getDirection(BABYLON.Axis.X); right.y=0; right.normalize();
    let v=forward.scale(moveY).add(right.scale(moveX)); if(v.lengthSquared()>.001){ v.normalize(); const speed=(sprint?0.36:0.23)*dt; camera.cameraDirection.addInPlace(v.scale(speed)); }
  }
  function updateNeeds(dt){
    state.hunger=Math.max(0,state.hunger-.0025*dt); const moving=camera.cameraDirection.lengthSquared()>.0004; state.energy=Math.max(0,Math.min(100,state.energy-(moving?(sprint?.005:.002):-.0007)*dt));
    if(state.hunger<25) state.mood=Math.max(0,state.mood-.0015*dt); else if(state.mood<75) state.mood=Math.min(100,state.mood+.00025*dt);
    state.minute += .012*dt; if(state.minute>=1440){state.minute-=1440;state.day++;}
  }
  function updateTraffic(dt){
    for(const v of world.vehicles){ const p=v.root.position; if(v.vertical){p.z+=v.speed*v.dir*dt; if(p.z>158)p.z=-158; if(p.z<-158)p.z=158;} else {p.x+=v.speed*v.dir*dt;if(p.x>158)p.x=-158;if(p.x<-158)p.x=158;} }
  }
  function nearestRoad(v){ const n=Math.round((v+144)/48)*48-144; return Math.max(-144,Math.min(144,n)); }
  function updateNPCs(dt){
    for(const n of world.npcs){ const p=n.root.position; if(n.axis===0){p.x+=n.speed*n.dir*dt; p.z=nearestRoad(p.z)+(n.phase%2?11:-11); if(p.x>151)p.x=-151;if(p.x<-151)p.x=151;} else {p.z+=n.speed*n.dir*dt;p.x=nearestRoad(p.x)+(n.phase%2?11:-11);if(p.z>151)p.z=-151;if(p.z<-151)p.z=151;} n.root.rotation.y=n.axis===0?(n.dir>0?Math.PI/2:-Math.PI/2):(n.dir>0?0:Math.PI); }
  }

  function updateInteract(){
    let best=null,bestD=3.4; const p=camera.position;
    for(const i of world.interactables){ const dx=i.x-p.x,dz=i.z-p.z,d=Math.hypot(dx,dz); if(d<bestD){bestD=d;best=i;} }
    currentInteractable=best; ui.prompt.classList.toggle('show',!!best); if(best) ui.prompt.textContent=`${isTouch?'تفاعل':'E'} — ${best.name}`;
  }

  function interact(){
    if(shopOpen){closeShop();return;} if(!currentInteractable)return;
    const i=currentInteractable;
    if(i.kind==='shop'){openShop(i.data); if(i.data.type==='grocery'&&!state.groceryVisited){state.groceryVisited=true; state.task=Math.max(state.task,1); showToast('اتعرفت على البقالة — كويس!');}}
    else if(i.kind==='home'){ state.energy=100; state.hunger=Math.max(state.hunger,60); state.minute=(state.minute<7*60||state.minute>23*60)?8*60:state.minute+60; state.homeVisited=true; showToast('ارتحت في البيت واستعدت طاقتك'); }
    else if(i.kind==='job') startDeliveryJob();
  }

  function openShop(data){
    shopOpen=true; ui.shop.style.display='flex'; ui.shopTitle.textContent=data.name; ui.shopDesc.textContent=data.desc; ui.shopItems.innerHTML='';
    data.items.forEach(item=>{ const [name,price,hunger,mood]=item; const row=document.createElement('div'); row.className='shopItem'; row.innerHTML=`<div><b>${name}</b><br><small>شبع +${hunger} · مزاج +${mood}</small></div><div><span class="price">${price} ج</span> <button class="primary">اشتري</button></div>`; row.querySelector('button').onclick=()=>buyItem(name,price,hunger,mood); ui.shopItems.appendChild(row); });
    if(!isTouch) document.exitPointerLock?.();
  }
  function closeShop(){ shopOpen=false;ui.shop.style.display='none'; if(!isTouch) canvas.requestPointerLock?.(); }
  function buyItem(name,price,hunger,mood){ if(state.money<price){showToast('الفلوس مش مكفية');return;} state.money-=price;state.hunger=Math.min(100,state.hunger+hunger);state.mood=Math.min(100,state.mood+mood);state.energy=Math.min(100,state.energy+Math.floor(hunger*.15));showToast(`اشتريت ${name} بـ ${price} جنيه`);saveGame(); }

  let deliveryTarget=null;
  function startDeliveryJob(){
    if(deliveryTarget){ const d=Math.hypot(camera.position.x-deliveryTarget.x,camera.position.z-deliveryTarget.z); if(d<4){state.money+=65;state.delivered++;state.mood=Math.min(100,state.mood+6);showToast('وصلت الطلب! +65 جنيه');deliveryTarget=null;state.task=3;saveGame();} else showToast('لسه الطلب معاك — وصّله للنقطة المحددة'); return; }
    const targets=[{x:72,z:-72,name:'عمارة 12'},{x:120,z:-24,name:'الصيدلية'},{x:24,z:120,name:'الورشة'},{x:-24,z:-72,name:'القهوة'}]; deliveryTarget=targets[state.delivered%targets.length]; state.task=2; showToast(`شغل جديد: وصّل الطلب إلى ${deliveryTarget.name}`);
  }

  function updateDayNight(){
    const t=state.minute/1440; const ang=t*Math.PI*2-Math.PI/2; const height=Math.sin(ang); sun.direction.set(Math.cos(ang)*-.65,-Math.max(.12,height),-.35); sun.intensity=Math.max(.05,.95*height+0.4); hemi.intensity=Math.max(.16,.48*height+.38);
    const night=Math.max(0,-height); const day=Math.max(0,height); const r=.14*night+.55*day+.35*(1-day-night); const g=.18*night+.72*day+.24*(1-day-night); const b=.3*night+.88*day+.22*(1-day-night); scene.clearColor.set(r,g,b,1); scene.fogColor.set(r,g,b); sky.material.emissiveColor.set(r,g,b);
    const bulbs=materialCache.get('bulb|#fff0bd|#6a5b32'); if(bulbs) bulbs.emissiveColor = night>.15 ? new BABYLON.Color3(1,.72,.25) : new BABYLON.Color3(.08,.07,.04);
  }

  function updateHUD(){
    ui.money.textContent=`${Math.floor(state.money)} ج`; setStat(ui.hungerTxt,ui.hungerBar,state.hunger); setStat(ui.energyTxt,ui.energyBar,state.energy); setStat(ui.moodTxt,ui.moodBar,state.mood);
    const h=Math.floor(state.minute/60)%24,m=Math.floor(state.minute%60);ui.time.textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; const days=['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];ui.day.textContent=`${days[(state.day-1)%7]} · اليوم ${state.day}`;
    if(deliveryTarget){ui.taskTitle.textContent='طلب توصيل';ui.taskText.textContent=`وصّل الطلب إلى ${deliveryTarget.name}. النقطة الصفراء ظاهرة على الخريطة.`;}
    else if(state.task===0){ui.taskTitle.textContent='أول يوم في الحارة';ui.taskText.textContent='لف في الشارع وروح أي بقالة وتفاعل معاها.';}
    else if(state.task===1){ui.taskTitle.textContent='دوّر على شغل';ui.taskText.textContent='روح كشك «طلبات الحارة» عند الناحية الشمالية الشرقية وخد أول طلب توصيل.';}
    else {ui.taskTitle.textContent='عيش يومك';ui.taskText.textContent=`معاك ${Math.floor(state.money)} جنيه · وصلت ${state.delivered} طلب. جرّب المحلات، اشتغل، وكل وارجع البيت وقت ما تحتاج.`;}
  }
  function setStat(txt,bar,val){val=Math.max(0,Math.min(100,val));txt.textContent=`${Math.round(val)}%`;bar.style.width=`${val}%`;bar.style.background=val<25?'var(--danger)':val<55?'var(--accent)':'var(--ok)';}

  function drawMinimap(){
    const c=ui.minimap,ctx=c.getContext('2d'),s=c.width;ctx.clearRect(0,0,s,s);ctx.fillStyle='#31483a';ctx.fillRect(0,0,s,s);const scale=s/world.mapSize;
    ctx.strokeStyle='#65645f';ctx.lineWidth=16*scale;for(let r=-144;r<=144;r+=48){ctx.beginPath();ctx.moveTo((r+160)*scale,0);ctx.lineTo((r+160)*scale,s);ctx.stroke();ctx.beginPath();ctx.moveTo(0,(r+160)*scale);ctx.lineTo(s,(r+160)*scale);ctx.stroke();}
    for(const sh of world.shops.slice(0,28)){ctx.fillStyle='#f0d276';ctx.fillRect((sh.x+160)*scale-2,(sh.z+160)*scale-2,4,4);}
    if(deliveryTarget){ctx.fillStyle='#ffd233';ctx.beginPath();ctx.arc((deliveryTarget.x+160)*scale,(deliveryTarget.z+160)*scale,7,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#5bd36c';ctx.fillRect((world.home.x+160)*scale-4,(world.home.z+160)*scale-4,8,8);
    const px=(camera.position.x+160)*scale,pz=(camera.position.z+160)*scale;ctx.save();ctx.translate(px,pz);ctx.rotate(camera.rotation.y);ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(5,6);ctx.lineTo(-5,6);ctx.closePath();ctx.fill();ctx.restore();
  }

  function showToast(msg){ ui.toast.textContent=msg;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),2200); }

  function setupInputs(){
    window.addEventListener('keydown',e=>{if(e.code==='KeyE')interact();if(e.code==='ShiftLeft'||e.code==='ShiftRight'){sprint=true;camera.speed=.72;}if(e.code==='Escape'&&shopOpen)closeShop();});
    window.addEventListener('keyup',e=>{if(e.code==='ShiftLeft'||e.code==='ShiftRight'){sprint=false;camera.speed=.42;}});
    document.getElementById('shopClose').onclick=closeShop; document.getElementById('mInteract').onclick=interact;
    const sprintBtn=document.getElementById('mSprint');sprintBtn.addEventListener('pointerdown',()=>sprint=true);sprintBtn.addEventListener('pointerup',()=>sprint=false);sprintBtn.addEventListener('pointercancel',()=>sprint=false);

    const base=document.getElementById('joyBase'),knob=document.getElementById('joyKnob'); let joyId=null;
    function joyUpdate(e){const r=base.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=r.width*.34,l=Math.hypot(dx,dy)||1,k=Math.min(1,max/l);const x=dx*k,y=dy*k;knob.style.transform=`translate(${x}px,${y}px)`;moveX=x/max;moveY=-y/max;}
    base.addEventListener('pointerdown',e=>{joyId=e.pointerId;base.setPointerCapture(e.pointerId);joyUpdate(e);});base.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joyUpdate(e);});
    const joyEnd=e=>{if(e.pointerId===joyId){joyId=null;moveX=moveY=0;knob.style.transform='';}};base.addEventListener('pointerup',joyEnd);base.addEventListener('pointercancel',joyEnd);

    canvas.addEventListener('pointerdown',e=>{if(!isTouch||e.clientX<innerWidth*.35)return;mobileLookPointer=e.pointerId;lastLookX=e.clientX;lastLookY=e.clientY;canvas.setPointerCapture?.(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(!isTouch||e.pointerId!==mobileLookPointer||shopOpen)return;const dx=e.clientX-lastLookX,dy=e.clientY-lastLookY;lastLookX=e.clientX;lastLookY=e.clientY;camera.rotation.y+=dx*.0042;camera.rotation.x=Math.max(-1.35,Math.min(1.35,camera.rotation.x+dy*.0036));});
    const lookEnd=e=>{if(e.pointerId===mobileLookPointer)mobileLookPointer=null;};canvas.addEventListener('pointerup',lookEnd);canvas.addEventListener('pointercancel',lookEnd);
  }

  document.getElementById('playBtn').onclick=()=>{ui.start.style.display='none';if(!isTouch)canvas.requestPointerLock?.();showToast('نورت الحارة 👋');};
  document.getElementById('resetSaveBtn').onclick=()=>{localStorage.removeItem('hayat-alhara-save');location.reload();};
  window.addEventListener('beforeunload',saveGame); window.addEventListener('resize',()=>engine.resize());

  scene=buildScene();setupInputs();engine.runRenderLoop(()=>scene.render());
})();
