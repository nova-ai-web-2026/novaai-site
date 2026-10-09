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
  scene.fog=new THREE.Fog(0xbac8d0,105,690);
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
  const terrain=new THREE.Mesh(new THREE.PlaneGeometry(980,980),std(0xffffff,.96,{map:asphalt}));
  terrain.rotation.x=-Math.PI/2;terrain.receiveShadow=true;scene.add(terrain);
  const pavingMap=surfaceTexture('paving'), pavingMat=std(0xffffff,.92,{map:pavingMap});
  const pavingGeometry=new THREE.PlaneGeometry(22,22);pavingGeometry.attributes.uv.array.forEach((_,i,a)=>a[i]*=5.5);

  // Paint is batched; markings stop before junctions rather than crossing them.
  for(let lane=-7;lane<=7;lane++){
    const r=lane*32+16;
    for(let cell=-11;cell<=11;cell++){
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
  for(let ix=-7;ix<=7;ix++)for(let iz=-7;iz<=7;iz++){
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
  for(let ix=-6;ix<=6;ix++)for(let iz=-6;iz<=6;iz++){
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
      const r=ring===0?rnd(410,475):rnd(505,620);
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

  // Continuation district: keep the avenues open instead of capping them with buildings.
  // Edge continuation: all three visible rings participate in collisions/web anchors so roads never end at an invisible wall.
  const edgeBlocks=[];
  for(let i=-6;i<=6;i++)edgeBlocks.push(i*32);

  const outerFacadeMaterials=facadeMaterials.map((base,idx)=>{
    const mat=base.clone();
    for(const key of ["map","emissiveMap","roughnessMap","bumpMap"]){
      if(!base[key])continue;
      const tex=base[key].clone();
      tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
      const glassy=idx===2||idx===4;
      tex.repeat.set(glassy?2.7:2.25,glassy?5.2:4.6);
      tex.needsUpdate=true;
      mat[key]=tex;
    }
    mat.roughness=(idx===2||idx===4)?.36:.74;
    mat.envMapIntensity=(idx===2||idx===4)?.76:.18;
    return mat;
  });

  // Four deliberately colored landmark buildings make each world edge feel authored.
  const heroColors=[0xc65f4d,0x2f8999,0xd0a13f,0x745fb0];
  const heroMaterials=heroColors.map((color,side)=>{
    const mat=outerFacadeMaterials[(side*2+1)%outerFacadeMaterials.length].clone();
    mat.color.setHex(color);
    mat.roughness=.42;
    mat.envMapIntensity=.46;
    mat.emissive=new THREE.Color(color).multiplyScalar(.065);
    mat.emissiveIntensity=.30;
    return mat;
  });

  let continuationBuildings=0,heroEdgeBuildings=0,visualOuterBuildings=0,playableOuterBuildings=0;
  for(let side=0;side<4;side++){
    const edge=side<2?(side===0?-224:224):(side===2?-224:224);
    const faceSign=side<2?(side===0?1:-1):(side===2?1:-1);

    for(let i=0;i<edgeBlocks.length;i++){
      const p=edgeBlocks[i];
      const hero=p===0;
      const w=hero?22.4:rnd(17.0,21.0);
      const d=hero?21.0:rnd(17.0,21.0);
      const h=hero?72+side*5:rnd(34,72);
      const x=side<2?p:edge,z=side<2?edge:p;
      const bw=side<2?w:d,bz=side<2?d:w;
      const style=(i+side*2)%outerFacadeMaterials.length;
      const bodyMat=hero?heroMaterials[side]:outerFacadeMaterials[style];

      box(bodyMat,[x,h/2,z],[bw,h,bz]);
      box(m.coping,[x,.92,z],[bw*1.035,1.84,bz*1.035],[0,0,0],hero?0x515c61:0x69777c);
      box(m.cream,[x,h-1.65,z],[bw*1.012,.26,bz*1.012]);
      box(m.dark,[x,h+.82,z],[bw*.68,1.55,bz*.66],[0,0,0],hero?0x343c42:0x49565d);
      box(m.coping,[x,h+1.67,z],[bw*.72,.20,bz*.70],[0,0,0],hero?heroColors[side]:0xa8b1b2);

      // Horizontal façade breaks keep these close buildings from reading as single slabs.
      for(let yy=11;yy<h-6;yy+=15){
        if(side<2)box(m.cream,[x,yy,z+faceSign*(bz/2+.035)],[bw*.92,.13,.075]);
        else box(m.cream,[x+faceSign*(bw/2+.035),yy,z],[.075,.13,bz*.92]);
      }

      // Ground-floor storefronts always face back toward the playable city.
      const storefrontCount=hero?4:3;
      if(side<2){
        const faceZ=z+faceSign*(bz/2+.065);
        const span=bw*.82,slot=span/storefrontCount;
        for(let k=0;k<storefrontCount;k++){
          const px=x+(k-(storefrontCount-1)/2)*slot;
          box(m.dark,[px,2.02,faceZ],[slot*.82,2.76,.13]);
          box(m.glass,[px,2.02,faceZ+faceSign*.038],[slot*.70,2.47,.075]);
        }
        box(m.dark,[x,3.55,faceZ+faceSign*.10],[bw*.88,.20,.40]);
        inst(unitPlane,signs[(side+i)%signs.length],[x,3.98,faceZ+faceSign*.125],[bw*.64,.54,1],[0,faceSign>0?0:Math.PI,0]);
      }else{
        const faceX=x+faceSign*(bw/2+.065);
        const span=bz*.82,slot=span/storefrontCount;
        for(let k=0;k<storefrontCount;k++){
          const pz=z+(k-(storefrontCount-1)/2)*slot;
          box(m.dark,[faceX,2.02,pz],[.13,2.76,slot*.82]);
          box(m.glass,[faceX+faceSign*.038,2.02,pz],[.075,2.47,slot*.70]);
        }
        box(m.dark,[faceX+faceSign*.10,3.55,z],[.40,.20,bz*.88]);
        inst(unitPlane,signs[(side+i)%signs.length],[faceX+faceSign*.125,3.98,z],[bz*.64,.54,1],[0,faceSign>0?-Math.PI/2:Math.PI/2,0]);
      }

      if(hero){
        heroEdgeBuildings++;
        // Four authored landmarks: stronger color, readable vertical rhythm and a stepped crown.
        if(side<2){
          const faceZ=z+faceSign*(bz/2+.082);
          for(const sx of [-1,1])box(m.paint,[x+sx*bw*.35,h*.53,faceZ],[.22,h*.78,.11],[0,0,0],heroColors[side]);
          for(const sx of [-.18,.18])box(m.glass,[x+sx*bw,h*.54,faceZ+faceSign*.018],[bw*.15,h*.56,.055]);
          box(m.paint,[x,h*.31,faceZ+faceSign*.035],[bw*.58,.16,.075],[0,0,0],heroColors[side]);
          box(m.paint,[x,h*.69,faceZ+faceSign*.035],[bw*.58,.16,.075],[0,0,0],heroColors[side]);
        }else{
          const faceX=x+faceSign*(bw/2+.082);
          for(const sz of [-1,1])box(m.paint,[faceX,h*.53,z+sz*bz*.35],[.11,h*.78,.22],[0,0,0],heroColors[side]);
          for(const sz of [-.18,.18])box(m.glass,[faceX+faceSign*.018,h*.54,z+sz*bz],[.055,h*.56,bz*.15]);
          box(m.paint,[faceX+faceSign*.035,h*.31,z],[.075,.16,bz*.58],[0,0,0],heroColors[side]);
          box(m.paint,[faceX+faceSign*.035,h*.69,z],[.075,.16,bz*.58],[0,0,0],heroColors[side]);
        }
        box(m.dark,[x,h+2.55,z],[bw*.60,1.45,bz*.58],[0,0,0],0x30383e);
        box(m.dark,[x,h+4.02,z],[bw*.47,1.40,bz*.45],[0,0,0],0x374148);
        box(m.paint,[x,h+4.78,z],[bw*.54,.20,bz*.52],[0,0,0],heroColors[side]);
        box(m.steel,[x,h+7.15,z],[.13,4.5,.13]);
        inst(sphere,m.red,[x,h+9.45,z],[.10,.10,.10]);
      }else if((i+side)%3===0){
        box(m.steel,[x,h+2.75,z],[bw*.27,1.75,bz*.24]);
      }

      // These are real buildings: collisions and web anchors continue one block farther.
      city.push({x,z,w:bw,d:bz,h,style,mesh:null,edge:true,hero});
      continuationBuildings++;
    }
  }

  // A second ring keeps the playable continuation from becoming a hard horizon.
  const outerBlocks=[];
  for(let i=-7;i<=7;i++)outerBlocks.push(i*32);
  for(let side=0;side<4;side++){
    const edge=side<2?(side===0?-288:288):(side===2?-288:288);
    const inward=side<2?(side===0?1:-1):(side===2?1:-1);
    for(let i=0;i<outerBlocks.length;i++){
      const p=outerBlocks[i];
      const x=side<2?p:edge,z=side<2?edge:p;
      const w=rnd(15.5,20.5),d=rnd(15.5,20.5),h=rnd(27,61);
      const bw=side<2?w:d,bz=side<2?d:w;
      const style=(i+side+3)%outerFacadeMaterials.length;
      const nearAxis=Math.abs(p)<=32;
      const accent=nearAxis?heroColors[side]:null;

      box(outerFacadeMaterials[style],[x,h/2,z],[bw,h,bz]);
      box(m.dark,[x,h+.32,z],[bw+.14,.58,bz+.14]);
      box(m.coping,[x,h+1.05,z],[bw*.74,.82,bz*.72],[0,0,0],nearAxis?accent:0x7c898d);

      // Near the four main exits, give the last visible buildings real color/details instead of grey slabs.
      if(nearAxis){
        if(side<2){
          const fz=z+inward*(bz/2+.04);
          box(m.paint,[x,h*.54,fz],[bw*.64,.18,.08],[0,0,0],accent);
          for(const sx of [-.26,.26])box(m.glass,[x+sx*bw,h*.55,fz+inward*.018],[bw*.16,h*.48,.045]);
        }else{
          const fx=x+inward*(bw/2+.04);
          box(m.paint,[fx,h*.54,z],[.08,.18,bz*.64],[0,0,0],accent);
          for(const sz of [-.26,.26])box(m.glass,[fx+inward*.018,h*.55,z+sz*bz],[.045,h*.48,bz*.16]);
        }
      }else if((i+side)%3===0){
        box(m.steel,[x,h+1.65,z],[bw*.32,2.2,bz*.28]);
      }
      city.push({x,z,w:bw,d:bz,h,style,mesh:null,edge:true,outer:true});
      visualOuterBuildings++;
      playableOuterBuildings++;
    }
  }

  // Third continuation ring: fully playable. The four axis buildings are authored color landmarks.
  let farContinuationBuildings=0,playableFarBuildings=0,farHeroBuildings=0;
  const farBlocks=[];
  for(let i=-8;i<=8;i++)farBlocks.push(i*32);
  const farPalette=[0x7f8d91,0x8d8277,0x6f8790,0x968a78,0x73858a,0x8b7c86];
  const farHeroColors=[0xd8664f,0x278fa5,0xe0ad39,0x8064c4];
  const farHeroMaterials=farHeroColors.map((color,side)=>{
    const mat=heroMaterials[side].clone();
    mat.color.setHex(color);
    mat.roughness=.34;
    mat.metalness=.16;
    mat.envMapIntensity=.62;
    mat.emissive=new THREE.Color(color).multiplyScalar(.085);
    mat.emissiveIntensity=.38;
    return mat;
  });

  for(let side=0;side<4;side++){
    const edge=side<2?(side===0?-352:352):(side===2?-352:352);
    const inward=side<2?(side===0?1:-1):(side===2?1:-1);

    for(let i=0;i<farBlocks.length;i++){
      const p=farBlocks[i];
      const hero=p===0;
      const x=side<2?p:edge,z=side<2?edge:p;
      const w=hero?21.8:rnd(14.5,19.5);
      const d=hero?20.6:rnd(14.5,19.5);
      const h=hero?58+side*4:rnd(22,52);
      const bw=side<2?w:d,bz=side<2?d:w;
      const style=(i+side*2+1)%outerFacadeMaterials.length;
      const bodyMat=hero?farHeroMaterials[side]:outerFacadeMaterials[style];

      box(bodyMat,[x,h/2,z],[bw,h,bz],[0,0,0],hero?farHeroColors[side]:farPalette[style]);
      box(m.dark,[x,h+.30,z],[bw+.10,.52,bz+.10]);

      if(hero){
        farHeroBuildings++;
        const accent=farHeroColors[side];

        // Strong vertical rhythm on the inward-facing façade so the last buildings read as finished landmarks.
        if(side<2){
          const faceZ=z+inward*(bz/2+.055);
          for(const sx of [-.31,0,.31])box(m.paint,[x+sx*bw,h*.50,faceZ],[sx===0?.18:.13,h*.70,.075],[0,0,0],accent);
          for(const sx of [-.18,.18])box(m.glass,[x+sx*bw,h*.52,faceZ+inward*.018],[bw*.14,h*.45,.045]);
          box(m.paint,[x,h*.26,faceZ+inward*.025],[bw*.68,.15,.075],[0,0,0],accent);
          box(m.paint,[x,h*.74,faceZ+inward*.025],[bw*.68,.15,.075],[0,0,0],accent);
        }else{
          const faceX=x+inward*(bw/2+.055);
          for(const sz of [-.31,0,.31])box(m.paint,[faceX,h*.50,z+sz*bz],[.075,h*.70,sz===0?.18:.13],[0,0,0],accent);
          for(const sz of [-.18,.18])box(m.glass,[faceX+inward*.018,h*.52,z+sz*bz],[.045,h*.45,bz*.14]);
          box(m.paint,[faceX+inward*.025,h*.26,z],[.075,.15,bz*.68],[0,0,0],accent);
          box(m.paint,[faceX+inward*.025,h*.74,z],[.075,.15,bz*.68],[0,0,0],accent);
        }

        // Stepped roof crown + beacon make each of the four world exits recognizable from far away.
        box(m.dark,[x,h+1.15,z],[bw*.70,1.7,bz*.67],[0,0,0],0x313b41);
        box(m.dark,[x,h+2.65,z],[bw*.52,1.25,bz*.49],[0,0,0],0x39454b);
        box(m.paint,[x,h+3.36,z],[bw*.58,.18,bz*.55],[0,0,0],accent);
        box(m.steel,[x,h+5.35,z],[.12,3.8,.12]);
        inst(sphere,m.red,[x,h+7.32,z],[.10,.10,.10]);
      }else if((i+side)%4===0){
        box(m.steel,[x,h+1.35,z],[bw*.26,1.55,bz*.23]);
      }

      city.push({x,z,w:bw,d:bz,h,style,mesh:null,edge:true,far:true,farHero:hero});
      farContinuationBuildings++;
      playableFarBuildings++;
    }
  }

  // Building-by-building audit is exposed to QA so every collider/anchor descriptor gets checked.
  const seenCenters=new Set();
  const styleCounts=Array(6).fill(0);
  let invalidBuildings=0,duplicateCenters=0,minBuildingHeight=Infinity,maxBuildingHeight=0;
  for(const b of city){
    const key=`${b.x.toFixed(3)}:${b.z.toFixed(3)}`;
    if(seenCenters.has(key))duplicateCenters++; else seenCenters.add(key);
    if(!Number.isFinite(b.x)||!Number.isFinite(b.z)||!Number.isFinite(b.w)||!Number.isFinite(b.d)||!Number.isFinite(b.h)||b.w<=0||b.d<=0||b.h<=3)invalidBuildings++;
    if(Number.isInteger(b.style)&&b.style>=0&&b.style<styleCounts.length)styleCounts[b.style]++;
    minBuildingHeight=Math.min(minBuildingHeight,b.h);
    maxBuildingHeight=Math.max(maxBuildingHeight,b.h);
  }
  const buildingAudit={
    checked:city.length,
    invalidBuildings,
    duplicateCenters,
    styleCounts,
    minBuildingHeight,
    maxBuildingHeight,
    continuationBuildings,
    heroEdgeBuildings,
    visualOuterBuildings,
    farContinuationBuildings,
    playableOuterBuildings,
    playableFarBuildings,
    farHeroBuildings
  };

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
    cars.push({axis,dir,lane,t:rnd(-219,219),speed:rnd(7.3,11.4)});bodyMesh.setColorAt(i,new THREE.Color(carColors[i%carColors.length]));
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
      if(car.t>232)car.t=-232;if(car.t< -232)car.t=232;
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
  scene.userData.worldVersion='2.7';scene.userData.worldStats={buildings:city.length,carCount,facadeStyles:6,edgeEndcaps:heroEdgeBuildings,continuationBuildings,visualOuterBuildings,farContinuationBuildings,playableOuterBuildings,playableFarBuildings,farHeroBuildings,buildingAudit};
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
