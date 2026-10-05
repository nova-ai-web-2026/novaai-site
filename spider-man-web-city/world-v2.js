/**
 * Web City / WORLD 2.0
 * Original procedural art. No network assets, no gameplay or rig changes.
 * The physics descriptors are generated from the same dimensions as the walls.
 */
export function createCityWorld(THREE, scene, renderer, touch = false) {
  let seed = 914278;
  const rng = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const rnd = (a,b) => a + rng()*(b-a);
  const city = [], pools = new Map(), wallParts = Array.from({length:6},()=>[]);
  const unitBox = new THREE.BoxGeometry(1,1,1);
  const unitPlane = new THREE.PlaneGeometry(1,1);
  const cylinder = new THREE.CylinderGeometry(1,1,1,10);
  const sphere = new THREE.IcosahedronGeometry(1,2);
  const tankRoof = new THREE.ConeGeometry(1.36,.6,12);
  const tankRing = new THREE.TorusGeometry(1.265,.037,4,14);
  const dummy = new THREE.Object3D();
  const textureLimit = Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const std = (color,roughness=.82,extra={}) => new THREE.MeshStandardMaterial({color,roughness,...extra});
  const m = {
    curb:std(0xa49c88), roof:std(0x65676a), coping:std(0xc1b8a4), dark:std(0x253138,.74),
    steel:std(0x434d50,.48,{metalness:.52}), cream:std(0xcac0a9), wood:std(0x75533a),
    paint:std(0xe5dfc9,.98), yellow:std(0xdfb84b), trunk:std(0x5d4733), leaf:std(0xffffff),
    green:std(0x3d5641), light:new THREE.MeshBasicMaterial({color:0xffe1b0}),
    red:new THREE.MeshBasicMaterial({color:0xd6302e}), glass:std(0x284f60,.2,{metalness:.35})
  };

  function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function texture(c,repeat=true){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=textureLimit;if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}
  function inst(geometry,material,p,s=[1,1,1],rot=[0,0,0],color=null){
    const key=geometry.uuid+material.uuid;
    if(!pools.has(key))pools.set(key,{geometry,material,items:[]});
    dummy.position.set(...p);dummy.scale.set(...s);dummy.rotation.set(...rot);dummy.updateMatrix();
    pools.get(key).items.push({matrix:dummy.matrix.clone(),color});
  }
  const box=(material,p,s,rot=[0,0,0],color=null)=>inst(unitBox,material,p,s,rot,color);
  function finishPools(){
    for(const pool of pools.values()){
      const mesh=new THREE.InstancedMesh(pool.geometry,pool.material,pool.items.length);
      const colored=pool.items.some(x=>x.color!==null);
      pool.items.forEach((item,i)=>{mesh.setMatrixAt(i,item.matrix);if(colored)mesh.setColorAt(i,new THREE.Color(item.color??0xffffff));});
      mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      mesh.castShadow=pool.material!==m.paint&&pool.material!==m.yellow&&pool.material!==m.light;
      mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);
    }
  }
  function merge(geometries){
    const out=new THREE.BufferGeometry();
    for(const key of ['position','normal','uv']){
      const size=key==='uv'?2:3, count=geometries.reduce((n,g)=>n+g.attributes[key].array.length,0);
      const data=new Float32Array(count);let offset=0;
      for(const g of geometries){data.set(g.attributes[key].array,offset);offset+=g.attributes[key].array.length;}
      out.setAttribute(key,new THREE.BufferAttribute(data,size));
    }
    out.computeBoundingSphere();return out;
  }

  // Sky and glass reflections use the same seamless, generated panorama.
  const skyCanvas=canvas(1024,512), sk=skyCanvas.getContext('2d');
  const skyGradient=sk.createLinearGradient(0,0,0,512);
  skyGradient.addColorStop(0,'#2d628e');skyGradient.addColorStop(.30,'#82afcd');
  skyGradient.addColorStop(.49,'#d5dace');skyGradient.addColorStop(.57,'#b8b39c');skyGradient.addColorStop(1,'#514d46');
  sk.fillStyle=skyGradient;sk.fillRect(0,0,1024,512);
  for(let i=0;i<33;i++){
    const x=rnd(0,1024),y=rnd(62,190),w=rnd(40,140),h=rnd(4,14);
    sk.save();sk.translate(x,y);sk.scale(w,h);
    const cloud=sk.createRadialGradient(0,0,0,0,0,1);cloud.addColorStop(0,'rgba(255,245,224,.25)');cloud.addColorStop(1,'rgba(255,245,224,0)');
    sk.fillStyle=cloud;sk.fillRect(-1,-1,2,2);sk.restore();
  }
  const sky=texture(skyCanvas,false);sky.mapping=THREE.EquirectangularReflectionMapping;
  scene.background=sky;scene.environment=sky;scene.environmentIntensity=.52;
  scene.fog=new THREE.Fog(0xbac8d0,90,440);
  renderer.toneMappingExposure=1.02;
  scene.add(new THREE.HemisphereLight(0xd5eaff,0x8a7558,1.42));
  const sun=new THREE.DirectionalLight(0xffe0b2,2.65);
  const sunOffset=new THREE.Vector3(-110,150,75);
  sun.position.copy(sunOffset);sun.castShadow=true;
  sun.shadow.mapSize.set(touch?1024:2048,touch?1024:2048);
  Object.assign(sun.shadow.camera,{left:-100,right:100,top:100,bottom:-100,near:1,far:390});
  sun.shadow.bias=-.00018;sun.shadow.normalBias=.08;
  scene.add(sun,sun.target);
  const fill=new THREE.DirectionalLight(0xa5c7ea,.30);fill.position.set(70,60,-100);scene.add(fill);
  const sunDisk=new THREE.Mesh(new THREE.SphereGeometry(5.5,16,12),new THREE.MeshBasicMaterial({color:0xfff0d2,fog:false}));
  sunDisk.position.copy(sunOffset).normalize().multiplyScalar(480);scene.add(sunDisk);

  function surfaceTexture(kind){
    const c=canvas(256,256),ctx=c.getContext('2d');
    ctx.fillStyle=kind==='road'?'#42474a':kind==='paving'?'#aaa797':'#677260';ctx.fillRect(0,0,256,256);
    for(let i=0;i<16000;i++){
      const v=rng()>.5?255:0;ctx.fillStyle=`rgba(${v},${v},${v},${rnd(.012,.065)})`;
      ctx.fillRect(rng()*256,rng()*256,1+rng()*1.5,1+rng()*1.5);
    }
    if(kind==='paving'){
      ctx.strokeStyle='rgba(73,70,62,.34)';ctx.lineWidth=2;
      for(let y=0;y<=256;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();}
      for(let x=0;x<=256;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke();}
      ctx.strokeStyle='rgba(244,235,208,.27)';ctx.lineWidth=1;
      for(let y=2;y<256;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();}
    } else if(kind==='road') {
      ctx.strokeStyle='rgba(12,20,26,.2)';ctx.lineWidth=.7;
      for(let i=0;i<5;i++){ctx.beginPath();let x=rng()*256,y=rng()*256;ctx.moveTo(x,y);for(let k=0;k<6;k++){x+=rnd(-12,12);y+=rnd(4,15);ctx.lineTo(x,y);}ctx.stroke();}
    }
    return texture(c);
  }
  const asphalt=surfaceTexture('road');asphalt.repeat.set(96,96);
  const terrain=new THREE.Mesh(new THREE.PlaneGeometry(660,660),std(0xffffff,.96,{map:asphalt}));
  terrain.rotation.x=-Math.PI/2;terrain.receiveShadow=true;scene.add(terrain);
  const pavingMap=surfaceTexture('paving'), pavingMat=std(0xffffff,.92,{map:pavingMap});
  const pavingGeometry=new THREE.PlaneGeometry(22,22);pavingGeometry.attributes.uv.array.forEach((_,i,a)=>a[i]*=5.5);

  // Paint is batched; markings stop before junctions rather than crossing them.
  for(let lane=-6;lane<=6;lane++){
    const r=lane*32+16;
    for(let cell=-7;cell<=6;cell++){
      const c=cell*32;
      for(const off of [-5,1,7]){
        box(m.yellow,[r,.017,c+off],[.12,.012,2.7]);box(m.yellow,[c+off,.018,r],[2.7,.012,.12]);
      }
      for(const side of [-1,1]){
        box(m.paint,[r+side*4.55,.017,c],[.095,.01,20.2]);
        box(m.paint,[c,.018,r+side*4.55],[20.2,.01,.095]);
      }
    }
  }
  for(let ix=-6;ix<6;ix++)for(let iz=-6;iz<6;iz++){
    const x=ix*32+16,z=iz*32+16;
    for(let j=-3;j<=3;j++)for(const s of [-1,1]){
      box(m.paint,[x+j*1.12,.02,z+s*6.1],[.48,.012,2.2]);
      box(m.paint,[x+s*6.1,.021,z+j*1.12],[2.2,.012,.48]);
    }
  }

  // Each texture tile contains two columns and two storeys, not one long stripe.
  const facadeColors=['#a16f53','#b4a68d','#477284','#ba805f','#8b9699','#c0b29c'];
  const facadeMaterials=[];
  for(let style=0;style<6;style++){
    const c=canvas(256,512),ctx=c.getContext('2d'),e=canvas(256,512),ec=e.getContext('2d');
    const rough=canvas(256,512),rc=rough.getContext('2d'),height=canvas(256,512),hc=height.getContext('2d');
    const glass=style===2||style===4;
    ctx.fillStyle=facadeColors[style];ctx.fillRect(0,0,256,512);
    ec.fillStyle='#000';ec.fillRect(0,0,256,512);rc.fillStyle=glass?'#888':'#eee';rc.fillRect(0,0,256,512);
    hc.fillStyle='#a8a8a8';hc.fillRect(0,0,256,512);
    if(style===0||style===3){
      for(let y=0,row=0;y<512;y+=12,row++)for(let x=-48;x<256;x+=48){
        const dx=x+(row%2)*24;
        ctx.fillStyle=`rgba(36,20,12,${rnd(.04,.14)})`;ctx.fillRect(dx+1,y+1,46,10);
        ctx.fillStyle='rgba(233,209,173,.20)';ctx.fillRect(dx,y,48,1);ctx.fillRect(dx,y,1,12);
        hc.fillStyle='#666';hc.fillRect(dx,y,48,1);hc.fillRect(dx,y,1,12);
      }
    } else if(!glass) {
      for(let y=0;y<512;y+=32){ctx.fillStyle='rgba(41,37,29,.16)';ctx.fillRect(0,y,256,1);}
      for(let x=0;x<256;x+=64){ctx.fillStyle='rgba(41,37,29,.1)';ctx.fillRect(x,0,1,512);}
    }
    for(let i=0;i<5500;i++){
      ctx.fillStyle=rng()>.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)';ctx.fillRect(rng()*256,rng()*512,1,1);
    }
    for(let row=0;row<2;row++)for(let col=0;col<2;col++){
      const x=col*128+(glass?5:25),y=row*256+(glass?5:50),w=glass?118:78,h=glass?236:142;
      ctx.fillStyle=glass?'#a4b4ba':'#5c5044';ctx.fillRect(x-4,y-5,w+8,h+12);
      hc.fillStyle='#ebebeb';hc.fillRect(x-4,y-5,w+8,h+12);
      const grad=ctx.createLinearGradient(x,y,x+w,y+h);
      grad.addColorStop(0,glass?'#93b4c4':'#66858c');grad.addColorStop(.5,glass?'#466d7e':'#2d444a');grad.addColorStop(1,'#1c343f');
      ctx.fillStyle=grad;ctx.fillRect(x,y,w,h);rc.fillStyle=glass?'#454545':'#686868';rc.fillRect(x,y,w,h);
      hc.fillStyle='#797979';hc.fillRect(x,y,w,h);
      ctx.fillStyle='rgba(198,222,226,.16)';ctx.beginPath();ctx.moveTo(x,y+h*.2);ctx.lineTo(x+w,y+h*.05);ctx.lineTo(x+w,y+h*.33);ctx.lineTo(x,y+h*.6);ctx.closePath();ctx.fill();
      if(rng()<.32&&!glass){ctx.fillStyle='rgba(211,193,153,.38)';ctx.fillRect(x+2,y+2,w-4,h*rnd(.2,.55));}
      if(rng()<.28){ec.fillStyle=rng()<.6?'#a18757':'#577c82';ec.fillRect(x+2,y+2,w-4,h-4);}
      ctx.fillStyle=glass?'#b3bfc1':'#aa9c80';ctx.fillRect(x+w*.5-1,y,2,h);ctx.fillRect(x,y+h*.52,w,3);
      if(!glass){ctx.fillStyle='#d0bfa1';ctx.fillRect(x-7,y+h+6,w+14,7);ctx.fillStyle='rgba(31,25,19,.3)';ctx.fillRect(x-7,y+h+13,w+14,5);}
    }
    const map=texture(c),emissiveMap=texture(e),roughnessMap=texture(rough),bumpMap=texture(height);
    roughnessMap.colorSpace=bumpMap.colorSpace=THREE.NoColorSpace;
    facadeMaterials.push(std(0xffffff,1,{map,emissive:0xffffff,emissiveMap,emissiveIntensity:.13,roughnessMap,bumpMap,bumpScale:.035,metalness:glass?.24:.025,envMapIntensity:glass?.65:.14}));
  }

  function facade(w,h,d,x,z,style){
    const g=new THREE.BoxGeometry(w,h,d).toNonIndexed(),uv=g.attributes.uv,n=g.attributes.normal;
    for(let i=0;i<uv.count;i++){
      if(Math.abs(n.getY(i))>.5)uv.setXY(i,.005,.005);
      else uv.setXY(i,uv.getX(i)*(Math.abs(n.getX(i))>.5?d:w)/5.4,uv.getY(i)*h/7.2);
    }
    g.translate(x,h/2+.06,z);wallParts[style].push(g);
  }
  const shopCanvas=canvas(512,128),sc=shopCanvas.getContext('2d');
  sc.fillStyle='#153638';sc.fillRect(0,0,512,128);
  for(let i=0;i<8;i++){
    sc.fillStyle=i%3?'#395e5e':'#d6b07c';sc.fillRect(i*64+5,8,53,111);
    sc.fillStyle='rgba(13,30,34,.6)';sc.fillRect(i*64+10,70,44,22);
    sc.fillStyle='#b4aa87';sc.fillRect(i*64,0,3,128);
  }
  const shopMat=std(0xffffff,.35,{map:texture(shopCanvas,false),metalness:.12});
  const shopNames=['MIDTOWN COFFEE','CORNER MARKET','BOOKS & PAPER','ATELIER','CITY DELI','METRO'];
  const signs=shopNames.map((name,i)=>{
    const c=canvas(512,96),s=c.getContext('2d');s.fillStyle=['#183c39','#743c2f','#35414e','#654f3b','#293e46','#295c62'][i];s.fillRect(0,0,512,96);
    s.strokeStyle='#ccbaa0';s.lineWidth=3;s.strokeRect(7,7,498,82);s.fillStyle='#f0e2c7';s.font='600 32px Arial';s.textAlign='center';s.textBaseline='middle';s.fillText(name,256,50,460);
    return std(0xffffff,.7,{map:texture(c,false)});
  });

  for(let ix=-6;ix<=6;ix++)for(let iz=-6;iz<=6;iz++){
    if(ix===0&&iz===0)continue;
    const x=ix*32,z=iz*32,dist=Math.hypot(ix,iz);
    let style=(Math.abs(ix*7+iz*3)+Math.floor(rng()*3))%6;
    const finance=(ix<-1&&iz<-1)||(ix>1&&iz<1);
    if(finance&&rng()<.68)style=rng()<.5?2:4;
    const w=rnd(16.1,19.6),d=rnd(16.1,19.6);
    let floors=finance?Math.floor(rnd(13,24)):Math.floor(rnd(6,15));
    if(dist>6)floors=Math.floor(rnd(5,13));
    if(ix===-2&&iz===-2){floors=31;style=2;}
    const h=floors*3.6;
    facade(w,h,d,x,z,style);
    city.push({x,z,w,d,h:h+.06,style,mesh:null});
    inst(pavingGeometry,pavingMat,[x,.081,z],[1,1,1],[-Math.PI/2,0,0]);
    for(const side of [-1,1]){
      box(m.curb,[x,.075,z+side*10.94],[22,.15,.18]);box(m.curb,[x+side*10.94,.075,z],[.18,.15,22]);
      box(m.coping,[x,h+.13,z+side*(d/2-.10)],[w+.30,.3,.30]);
      box(m.coping,[x+side*(w/2-.10),h+.13,z],[.30,.3,d]);
    }
    box(m.roof,[x,h+.061,z],[w-.16,.09,d-.16]);
    // Shallow projecting cornices and vertical piers break up flat silhouettes.
    if(style!==2&&style!==4){
      for(const y of [3.6,h-1]){
        box(m.cream,[x,y,z+d/2+.09],[w+.3,.24,.32]);box(m.cream,[x,y,z-d/2-.09],[w+.3,.24,.32]);
      }
      if(style===1||style===5)for(const s of [-1,1])for(const t of [-1,1])box(m.coping,[x+s*(w/2-.3),h/2,z+t*(d/2+.035)],[.5,h,.16]);
    } else {
      for(const s of [-1,1])for(let p=-1;p<=1;p++){
        box(m.steel,[x+p*w*.30,h/2,z+s*(d/2+.045)],[.11,h,.09]);
        box(m.steel,[x+s*(w/2+.045),h/2,z+p*d*.30],[.09,h,.11]);
      }
    }
    if(dist<6.5){
      for(const s of [-1,1]){
        inst(unitPlane,shopMat,[x,1.43,z+s*(d/2+.065)],[w*.88,2.38,1],[0,s===1?0:Math.PI,0]);
        inst(unitPlane,signs[(Math.abs(ix+iz)+style)%signs.length],[x,3.04,z+s*(d/2+.1)],[w*.75,.67,1],[0,s===1?0:Math.PI,0]);
        box(style%2?m.wood:m.green,[x,2.60,z+s*(d/2+.43)],[w*.84,.10,.90]);
      }
    }
    // Rooftop mechanical decks always use the same h as the building collider.
    for(let k=0;k<(h>50?2:1);k++){
      const px=x+(k?3:-3),pz=z+2.4;
      box(m.steel,[px,h+.58,pz],[2.0,1.05,1.55]);box(m.dark,[px,h+1.12,pz],[1.65,.07,1.22]);
      for(let j=-2;j<=2;j++)box(m.coping,[px+j*.27,h+1.16,pz],[.055,.045,1.18]);
    }
    if(style===0||style===3){
      const tx=x-w*.25,tz=z-d*.22;
      for(const a of [-1,1])for(const b of [-1,1])box(m.steel,[tx+a*.7,h+.66,tz+b*.7],[.11,1.2,.11]);
      inst(cylinder,m.wood,[tx,h+1.95,tz],[1.25,1.62,1.25]);
      inst(tankRoof,m.dark,[tx,h+3.05,tz]);
      for(const yy of [1.35,2.5])inst(tankRing,m.steel,[tx,h+yy,tz],[1,1,1],[Math.PI/2,0,0]);
    }
    if(h>65){
      box(m.steel,[x+3,h+2.45,z-3],[.10,4.6,.10]);inst(sphere,m.red,[x+3,h+4.81,z-3],[.09,.09,.09]);
    }
  }
  for(let i=0;i<6;i++){
    if(!wallParts[i].length)continue;
    const merged=merge(wallParts[i]),mesh=new THREE.Mesh(merged,facadeMaterials[i]);
    mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
    city.filter(b=>b.style===i).forEach(b=>b.mesh=mesh);
    wallParts[i].forEach(g=>g.dispose());
  }

  function tree(x,z,size=1){
    inst(cylinder,m.trunk,[x,1.35*size,z],[.14*size,2.7*size,.14*size]);
    const colors=[0x576f40,0x466345,0x6e7c48,0x3e5e40];
    for(let n=0;n<5;n++){
      const a=n/5*Math.PI*2,r=n?rnd(.4,.7):0;
      inst(sphere,m.leaf,[x+Math.cos(a)*r*size,(3.1+rnd(-.2,.5))*size,z+Math.sin(a)*r*size],[rnd(.72,1.13)*size,rnd(.8,1.2)*size,rnd(.72,1.1)*size],[0,rnd(0,3),0],colors[n%4]);
    }
  }
  function lamp(x,z,angle=0){
    inst(cylinder,m.steel,[x,2.6,z],[.055,5.2,.055]);
    box(m.steel,[x+Math.sin(angle)*.40,5.10,z+Math.cos(angle)*.40],[.08,.085,.86],[0,angle,0]);
    box(m.light,[x+Math.sin(angle)*.8,5.04,z+Math.cos(angle)*.8],[.28,.075,.50],[0,angle,0]);
  }
  for(let ix=-5;ix<=5;ix++)for(let iz=-5;iz<=5;iz++){
    if(ix===0&&iz===0)continue;
    const x=ix*32,z=iz*32;
    lamp(x+10.1,z+9.8,Math.PI/2);
    if((ix+iz)%3===0)tree(x-10.15,z+6.5,rnd(.72,.95));
    if((ix-iz)%4===0)tree(x+6,z-10.2,rnd(.74,.95));
    if((ix+iz)%2===0){
      box(m.steel,[x+10.2,1.1,z+10.2],[.07,2.2,.07]);
      box(m.dark,[x+10.2,2.15,z+10.2],[.27,.8,.25]);
      inst(sphere,m.red,[x+10.2,2.4,z+10.35],[.08,.08,.035]);
      inst(sphere,m.green,[x+10.2,1.9,z+10.35],[.08,.08,.035]);
    }
  }

  // Keep the central spawn and the north/south approach open.
  inst(pavingGeometry,pavingMat,[0,.065,0],[1.10,1.10,1],[-Math.PI/2,0,0]);
  for(const x of [-9.1,9.1])for(const z of [-9.1,9.1]){
    box(m.coping,[x,.32,z],[2.7,.60,2.7]);box(m.green,[x,.635,z],[2.4,.03,2.4]);tree(x,z,.95);
  }
  for(const z of [-9.7,9.7])for(const x of [-4.6,4.6]){
    for(const s of [-1,1])box(m.steel,[x+s*.82,.30,z],[.10,.60,.6]);
    for(let j=-2;j<=2;j++)box(m.wood,[x,.66,z+j*.105],[2.1,.07,.085]);
    box(m.wood,[x,1.02,z+.27],[2.1,.52,.07]);
  }
  for(const x of [-11.0,11.0])lamp(x,0,x>0?-Math.PI/2:Math.PI/2);
  const poolCenter=new THREE.Vector3(-5.0,.24,-5.0);
  inst(cylinder,m.coping,poolCenter.toArray(),[2.55,.28,2.55]);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(2.30,.17,8,48),m.cream);rim.rotation.x=Math.PI/2;rim.position.set(-5,.43,-5);rim.receiveShadow=true;scene.add(rim);
  const normalCanvas=canvas(128,128),nc=normalCanvas.getContext('2d'),image=nc.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const i=(y*128+x)*4;image.data[i]=128+Math.sin(x*.24+y*.12)*19;image.data[i+1]=128+Math.cos(y*.24-x*.12)*19;image.data[i+2]=249;image.data[i+3]=255;
  }
  nc.putImageData(image,0,0);const normal=texture(normalCanvas);normal.colorSpace=THREE.NoColorSpace;
  const waterMat=std(0x398e9b,.13,{metalness:.28,normalMap:normal,normalScale:new THREE.Vector2(.24,.24),envMapIntensity:1.3});
  const water=new THREE.Mesh(new THREE.CircleGeometry(2.17,48),waterMat);water.rotation.x=-Math.PI/2;water.position.set(-5,.43,-5);scene.add(water);
  const jetMat=new THREE.MeshPhysicalMaterial({color:0xaed9df,roughness:.12,transparent:true,opacity:.52,depthWrite:false});
  const droplets=new Float32Array(144*3),dropsGeo=new THREE.BufferGeometry();dropsGeo.setAttribute('position',new THREE.BufferAttribute(droplets,3));
  const dropMat=new THREE.PointsMaterial({color:0xe0f3f4,size:.045,transparent:true,opacity:.7,depthWrite:false});
  const drops=new THREE.Points(dropsGeo,dropMat);drops.frustumCulled=false;scene.add(drops);
  for(let i=0;i<6;i++){
    const a=i/6*Math.PI*2,pts=[];
    for(let j=0;j<=12;j++){const f=j/12;pts.push(new THREE.Vector3(-5+Math.cos(a)*f*1.55,.44+1.95*4*f*(1-f),-5+Math.sin(a)*f*1.55));}
    const jet=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),16,.020,4,false),jetMat);scene.add(jet);
  }

  // Finished distant skyline: layered towers with visible façade bands and roof caps.
  const skylineBody=std(0xffffff,.82,{metalness:.06});
  const skylineGlass=std(0xffffff,.34,{metalness:.28});
  const skylineWindow=new THREE.MeshBasicMaterial({color:0xa7c8d2,transparent:true,opacity:.28});
  const skylineWarm=new THREE.MeshBasicMaterial({color:0xe4c38d,transparent:true,opacity:.22});

  for(let ring=0;ring<2;ring++){
    const count=ring===0?104:72;
    for(let i=0;i<count;i++){
      const a=i/count*Math.PI*2+rnd(-.012,.012);
      const r=ring===0?rnd(238,285):rnd(300,365);
      const h=ring===0?rnd(28,86):rnd(20,64);
      const w=rnd(9,20),d=rnd(9,20);
      const x=Math.cos(a)*r,z=Math.sin(a)*r;
      const glass=(i+ring)%4===0;
      const bodyMat=glass?skylineGlass:skylineBody;
      const bodyColor=glass?[0x617d89,0x536d7a,0x71858b][i%3]:[0x8b9292,0x9c998f,0x7d898c,0xa59d8d][i%4];

      box(bodyMat,[x,h/2,z],[w,h,d],[0,-a,0],bodyColor);
      box(m.dark,[x,h+.28,z],[w+.18,.55,d+.18],[0,-a,0]);

      if(i%3===0){
        box(m.steel,[x,h+1.65,z],[w*.46,2.7,d*.42],[0,-a,0]);
        box(m.dark,[x,h+3.08,z],[w*.50,.18,d*.46],[0,-a,0]);
      }
      if(i%11===0)box(m.steel,[x,h+4.2,z],[.14,7.5,.14]);

      // A few large window bands are enough at this distance and avoid blank unfinished slabs.
      const faceX=Math.cos(a),faceZ=Math.sin(a);
      const winMat=i%5===0?skylineWarm:skylineWindow;
      for(let row=0;row<Math.min(7,Math.floor(h/10));row++){
        const yy=6+row*9;
        if(yy>h-3)break;
        const px=x-faceX*(Math.abs(faceX)>Math.abs(faceZ)?w/2+.05:d/2+.05);
        const pz=z-faceZ*(Math.abs(faceX)>Math.abs(faceZ)?w/2+.05:d/2+.05);
        if(Math.abs(faceX)>Math.abs(faceZ)){
          inst(unitPlane,winMat,[px,yy,pz],[d*.62,.62,1],[0,faceX>0?-Math.PI/2:Math.PI/2,0]);
        }else{
          inst(unitPlane,winMat,[px,yy,pz],[w*.62,.62,1],[0,faceZ>0?Math.PI:0,0]);
        }
      }
    }
  }

  // Finished street-end belt: textured, complete architecture on every avenue exit.
  const edgeRoads=[];
  for(let i=-6;i<=6;i++)edgeRoads.push(i*32+16);

  const outerFacadeMaterials=facadeMaterials.map((base,idx)=>{
    const mat=base.clone();
    for(const key of ["map","emissiveMap","roughnessMap","bumpMap"]){
      if(!base[key])continue;
      const tex=base[key].clone();
      tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
      const glassy=idx===2||idx===4;
      tex.repeat.set(glassy?2.8:2.35,glassy?5.4:4.8);
      tex.needsUpdate=true;
      mat[key]=tex;
    }
    mat.roughness=(idx===2||idx===4)?.38:.76;
    mat.envMapIntensity=(idx===2||idx===4)?.72:.16;
    return mat;
  });

  for(let side=0;side<4;side++){
    for(let i=0;i<edgeRoads.length;i++){
      const p=edgeRoads[i];
      const edge=side<2?(side===0?-236:236):(side===2?-236:236);
      const w=rnd(18,25),d=rnd(17,23),h=rnd(34,82);
      const x=side<2?p:edge,z=side<2?edge:p;
      const bw=side<2?w:d,bz=side<2?d:w;
      const baseH=Math.min(5.0,Math.max(3.8,h*.08));
      const outerStyle=(i+side)%outerFacadeMaterials.length;
      const faceSign=side<2?(side===0?1:-1):(side===2?1:-1);

      box(m.coping,[x,baseH/2,z],[bw*1.05,baseH,bz*1.05],[0,0,0],0x69777c);
      box(outerFacadeMaterials[outerStyle],[x,(h+baseH)/2,z],[bw,h-baseH,bz]);
      box(m.cream,[x,h-2.0,z],[bw*1.015,.28,bz*1.015]);
      box(m.dark,[x,h+1.05,z],[bw*.72,2.0,bz*.72],[0,0,0],0x49565d);
      box(m.coping,[x,h+2.14,z],[bw*.76,.26,bz*.76],[0,0,0],0xa8b1b2);

      for(let yy=baseH+13;yy<h-6;yy+=18){
        if(side<2)box(m.cream,[x,yy,z+faceSign*(bz/2+.03)],[bw*.94,.16,.07]);
        else box(m.cream,[x+faceSign*(bw/2+.03),yy,z],[.07,.16,bz*.94]);
      }

      if(side<2){
        box(m.glass,[x,2.15,z+faceSign*(bz/2+.052)],[Math.min(bw*.52,10),2.8,.085]);
        box(m.dark,[x,3.72,z+faceSign*(bz/2+.042)],[Math.min(bw*.60,11),.24,.10],[0,0,0],0x3b474d);
      }else{
        box(m.glass,[x+faceSign*(bw/2+.052),2.15,z],[.085,2.8,Math.min(bz*.52,10)]);
        box(m.dark,[x+faceSign*(bw/2+.042),3.72,z],[.10,.24,Math.min(bz*.60,11)],[0,0,0],0x3b474d);
      }

      if((i+side)%4===0){
        box(m.steel,[x,h+4.2,z],[.14,4.0,.14]);
        inst(sphere,m.red,[x,h+6.3,z],[.075,.075,.075]);
      }
    }
  }

  finishPools();

  // Dynamic traffic: shared instanced geometry, not a separate mesh per window.
  const carCount=touch?16:26, cars=[];
  const bodyMat=std(0xffffff,.36,{metalness:.30}),rubber=std(0x1b2224,.95);
  const bodyMesh=new THREE.InstancedMesh(unitBox,bodyMat,carCount);
  const cabinMesh=new THREE.InstancedMesh(unitBox,m.glass,carCount);
  const wheelGeo=new THREE.CylinderGeometry(.34,.34,.20,10);wheelGeo.rotateZ(Math.PI/2);
  const wheels=new THREE.InstancedMesh(wheelGeo,rubber,carCount*4);
  const frontLights=new THREE.InstancedMesh(unitBox,m.light,carCount*2);
  const tailLights=new THREE.InstancedMesh(unitBox,m.red,carCount*2);
  const bumpers=new THREE.InstancedMesh(unitBox,m.steel,carCount*2);
  for(const mesh of [bodyMesh,cabinMesh,wheels,frontLights,tailLights,bumpers]){
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
  }
  const carColors=[0xc5a540,0x823e36,0xb9c2c6,0x385c72,0x323f48,0x789084];
  for(let i=0;i<carCount;i++){
    const axis=i%2,dir=i%4<2?1:-1,lane=[-112,-80,-48,-16,16,48,80,112,144][i%9];
    cars.push({axis,dir,lane,t:rnd(-199,199),speed:rnd(7.3,11.4)});bodyMesh.setColorAt(i,new THREE.Color(carColors[i%carColors.length]));
  }
  const root=new THREE.Object3D(),part=new THREE.Object3D(),matrix=new THREE.Matrix4();
  function carPart(mesh,index,p,s,rot=[0,0,0]){
    part.position.set(...p);part.scale.set(...s);part.rotation.set(...rot);part.updateMatrix();matrix.multiplyMatrices(root.matrix,part.matrix);mesh.setMatrixAt(index,matrix);
  }
  function updateCars(dt,t){
    cars.forEach((car,i)=>{
      const nearCross=((car.t-16+3200)%32),red=(Math.floor(t/8)%2)!==car.axis;
      const stop=red&&(car.dir>0?nearCross>23&&nearCross<27:nearCross>5&&nearCross<9);
      car.t+=car.speed*car.dir*dt*(stop?.035:1);
      if(car.t>216)car.t=-216;if(car.t< -216)car.t=216;
      root.position.set(car.axis?car.t:car.lane+car.dir*2.5,0,car.axis?car.lane-car.dir*2.5:car.t);
      root.rotation.y=car.axis?(car.dir>0?-Math.PI/2:Math.PI/2):(car.dir>0?Math.PI:0);root.updateMatrix();
      carPart(bodyMesh,i,[0,.68,0],[1.66,.47,3.75]);carPart(cabinMesh,i,[0,1.055,.08],[1.35,.46,1.76]);
      for(let j=0;j<4;j++)carPart(wheels,i*4+j,[j%2? .83:-.83,.37,j<2?1.17:-1.17],[1,1,1]);
      for(let j=0;j<2;j++){
        carPart(frontLights,i*2+j,[j?.56:-.56,.68,-1.886],[.30,.15,.035]);
        carPart(tailLights,i*2+j,[j?.59:-.59,.72,1.886],[.22,.13,.035]);
        carPart(bumpers,i*2+j,[0,.50,j?1.91:-1.91],[1.50,.095,.08]);
      }
    });
    for(const mesh of [bodyMesh,cabinMesh,wheels,frontLights,tailLights,bumpers])mesh.instanceMatrix.needsUpdate=true;
  }
  updateCars(0,0);
  scene.userData.worldVersion='2.1';scene.userData.worldStats={buildings:city.length,carCount,facadeStyles:6};
  return {
    city,
    update(dt,t,playerPosition){
      updateCars(dt,t);normal.offset.set(t*.025,t*.017);
      for(let i=0;i<144;i++){
        const f=(t*.48+i/144)%1,a=(i%6)/6*Math.PI*2;
        droplets[i*3]=-5+Math.cos(a)*f*1.6;droplets[i*3+1]=.46+1.95*4*f*(1-f);droplets[i*3+2]=-5+Math.sin(a)*f*1.6;
      }
      dropsGeo.attributes.position.needsUpdate=true;
      if(playerPosition){sun.target.position.set(playerPosition.x,20,playerPosition.z);sun.position.copy(sun.target.position).add(sunOffset);}
    }
  };
}
