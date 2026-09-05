(() => {
  'use strict';

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const fail=(msg,err)=>{console.error(msg,err||'');const box=document.getElementById('errorBox');if(box){box.style.display='block';box.textContent=msg+(err?.message?': '+err.message:'');}};

  // Capture the game's AudioContext before the player presses Start. This lets V11
  // turn the old synthetic mix down and layer a softer location-aware soundscape.
  const NativeAC=window.AudioContext||window.webkitAudioContext;
  if(NativeAC&&!window.__V11_AUDIO_WRAPPED){
    function WrappedAC(...args){
      const ctx=new NativeAC(...args),originalCreateGain=ctx.createGain.bind(ctx);let gains=0;
      ctx.createGain=()=>{const g=originalCreateGain();if(gains++===0)window.__V11_LEGACY_MASTER=g;return g;};
      window.__V11_AUDIO_CONTEXT=ctx;return ctx;
    }
    WrappedAC.prototype=NativeAC.prototype;
    try{window.AudioContext=WrappedAC;if(window.webkitAudioContext)window.webkitAudioContext=WrappedAC;window.__V11_AUDIO_WRAPPED=true;}catch(_){/* browser may expose read-only constructor */}
  }

  async function waitForV10(){
    for(let i=0;i<260;i++){
      const scene=window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0];
      if(scene&&window.__V10_PATCH?.version===10)return scene;
      await sleep(50);
    }
    throw new Error('V10 did not finish before V11');
  }

  const arabicDigits=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[+d]);
  const cleanArabic=text=>String(text||'').replace(/[←→]/g,' • ').replace(/\s+/g,' ').trim();
  const rtl=text=>'\u2067'+cleanArabic(text)+'\u2069';

  function signTexture(scene,name,text,bg='#315d48',fg='#fff5df',w=1024,h=192,font=68){
    const tex=new BABYLON.DynamicTexture(name,{width:w,height:h},scene,false),c=tex.getContext();
    c.save();c.clearRect(0,0,w,h);c.fillStyle=bg;c.fillRect(0,0,w,h);
    c.direction='rtl';c.textAlign='center';c.textBaseline='middle';c.fillStyle=fg;
    c.font=`700 ${font}px Tahoma, Arial, sans-serif`;
    c.fillText(rtl(text),w/2,h/2+3,w*.9);c.restore();tex.update();
    return tex;
  }

  function planeSign(scene,name,text,x,y,z,w,h,bg,rot=Math.PI){
    const tex=signTexture(scene,'v11_tex_'+name,text,bg,'#fff4d8',1024,192,68);
    const mat=new BABYLON.StandardMaterial('v11_mat_'+name,scene);mat.diffuseTexture=tex;mat.emissiveColor=new BABYLON.Color3(.045,.038,.03);mat.backFaceCulling=false;
    const p=BABYLON.MeshBuilder.CreatePlane('v11_'+name,{width:w,height:h},scene);p.position.set(x,y,z);p.rotation.y=rot;p.material=mat;p.isPickable=false;p.checkCollisions=false;return p;
  }

  function repairV8Signs(scene){
    const sets=[
      ['v8_shopSign_','#365b47'],['v8_routeBoard_','#e0d6a9'],['v8_streetPlate_','#315f78'],['v8_kioskSign_','#6a4b32'],['v8_smallSign_','#3d6d62']
    ];
    let fixed=0;
    for(const [prefix,bg] of sets){
      for(const mesh of scene.meshes.filter(m=>m.name.startsWith(prefix))){
        const text=cleanArabic(mesh.name.slice(prefix.length));if(!text||!mesh.material)continue;
        const t=signTexture(scene,'v11_repair_'+fixed,text,bg,bg==='#e0d6a9'?'#2c2924':'#fff4df',1024,192,64);
        mesh.material.diffuseTexture=t;mesh.material.emissiveColor=new BABYLON.Color3(.035,.03,.025);mesh.material.backFaceCulling=false;fixed++;
      }
    }
    return fixed;
  }

  function replaceLegacyShopSigns(scene){
    // The original sign meshes all share the generic name "sign", so rebuild the
    // shop labels from their storefront geometry and remove the unreadable originals.
    const names=['فول وطعمية أبو علي','كشري التحرير','قهوة المعلم','فرن العيش البلدي','عصير قصب ولاد البلد','كشك عم صابر','بقالة الأمانة','خضار وفاكهة البركة','كبدة وسجق إسكندراني'];
    const generic=scene.meshes.filter(m=>m.name==='sign');generic.forEach(m=>m.setEnabled(false));
    const glass=scene.meshes.filter(m=>m.name==='shopGlass').sort((a,b)=>a.position.z-b.position.z||a.position.x-b.position.x);
    let made=0;
    glass.forEach((g,i)=>{
      g.computeWorldMatrix(true);const p=g.getAbsolutePosition();
      planeSign(scene,'legacyShop_'+i,g.metadata?.shopName||names[i%names.length],p.x,3.18,p.z-.08,Math.max(3.2,Math.min(6.8,g.getBoundingInfo().boundingBox.extendSizeWorld.x*1.9)),.72,['#74432f','#925634','#5e4632','#38604d'][i%4],Math.PI);made++;
    });
    planeSign(scene,'marketLabel','سوق الحارة',48,4,-34,7.2,.92,'#854b2d',0);
    planeSign(scene,'ahwaLabel','قهوة المعلم فتحي',-48,3.65,35,7,.86,'#5b3923',0);
    planeSign(scene,'homeLabel','بيت العيلة',-96,3.34,-82.68,3.2,.7,'#553622',Math.PI);
    planeSign(scene,'jobLabel','طلبات الحارة',-16,2.82,63,4.1,.76,'#245d66',0);
    const ful=scene.getMeshByName('fulHot');
    planeSign(scene,'fulLabel','فول وطعمية',ful.position.x,1.74,ful.position.z-.82,2.8,.58,'#407455',Math.PI);
    return {hidden:generic.length,made:made+5};
  }

  function mat(scene,name,hex){let m=scene.materials.find(x=>x.name===name);if(m)return m;m=new BABYLON.StandardMaterial(name,scene);m.diffuseColor=BABYLON.Color3.FromHexString(hex);m.specularColor=BABYLON.Color3.Black();return m;}
  function box(scene,name,w,h,d,x,y,z,m,rot=0){const b=BABYLON.MeshBuilder.CreateBox('v11_'+name,{width:w,height:h,depth:d},scene);b.position.set(x,y,z);b.rotation.y=rot;b.material=m;b.isPickable=false;b.checkCollisions=false;return b;}
  function cyl(scene,name,d,h,x,y,z,m,t=12){const c=BABYLON.MeshBuilder.CreateCylinder('v11_'+name,{diameter:d,height:h,tessellation:t},scene);c.position.set(x,y,z);c.material=m;c.isPickable=false;c.checkCollisions=false;return c;}

  function addStreetMicroDetails(scene){
    const buildings=scene.meshes.filter(m=>m.name==='building').slice(0,22);let numbers=0,meters=0,intercoms=0;
    buildings.forEach((b,i)=>{
      b.computeWorldMatrix(true);const bb=b.getBoundingInfo().boundingBox,min=bb.minimumWorld,max=bb.maximumWorld,front=min.z-.16;
      const n=12+i*3;
      planeSign(scene,'buildingNo_'+i,arabicDigits(n),b.position.x-(max.x-min.x)*.34,2.45,front,.72,.5,'#315f78',Math.PI);numbers++;
      const metal=mat(scene,'v11_utility','#6f706b'),dark=mat(scene,'v11_utilityDark','#353734');
      for(let k=0;k<2;k++){box(scene,'meterCluster',.34,.44,.09,b.position.x+(max.x-min.x)*.35+k*.4,.75,front,metal);box(scene,'meterGlass',.18,.14,.02,b.position.x+(max.x-min.x)*.35+k*.4,.78,front-.055,dark);meters++;}
      box(scene,'intercom',.18,.42,.055,b.position.x+(max.x-min.x)*.18,1.35,front,metal);intercoms++;
      if(i%3===0){
        const antenna=mat(scene,'v11_antenna','#555653');cyl(scene,'antennaPole',.045,1.55,b.position.x+1.4,max.y+.85,b.position.z-1.2,antenna,8);
        for(let q=-2;q<=2;q++)box(scene,'antennaBar',.72-Math.abs(q)*.09,.025,.025,b.position.x+1.4,max.y+1.05+q*.16,b.position.z-1.2,antenna);
      }
    });

    const wood=mat(scene,'v11_cartWood','#755137'),wheel=mat(scene,'v11_cartWheel','#242321');
    [[43,-37,0],[51,-37,.08],[-39,55,Math.PI/2]].forEach((v,i)=>{
      const [x,z,r]=v;box(scene,'handCart',2.15,.52,1.05,x,.55,z,wood,r);
      for(const s of [-1,1]){const w=BABYLON.MeshBuilder.CreateTorus('v11_cartWheel',{diameter:.62,thickness:.11,tessellation:14},scene);w.position.set(x+s*(r?0:.94),.38,z+s*(r?.94:0));w.rotation.x=Math.PI/2;w.rotation.y=r;w.material=wheel;w.checkCollisions=false;w.isPickable=false;}
      box(scene,'cartHandle',.08,.08,1.25,x+(r?0:1.55),.72,z+(r?1.55:0),wood,r);
    });

    const crate=mat(scene,'v11_waterCrate','#315d7a'),bottle=mat(scene,'v11_bottle','#6c9aa7');
    for(let r=0;r<2;r++)for(let c=0;c<4;c++){box(scene,'waterCrate',.46,.27,.36,56.2+c*.5,.18+r*.31,40.9,crate);for(let j=0;j<3;j++)cyl(scene,'waterBottle',.09,.29,56.05+c*.5+j*.12,.48+r*.31,40.9,bottle,8);}

    const curtain=mat(scene,'v11_shopCurtain','#b9a37c');
    [[-48,17.1,0],[-24,17.1,0],[5,17.1,0],[35,17.1,0]].forEach(([x,z,r],i)=>{
      for(let s=0;s<6;s++){const strip=box(scene,'shopCurtain',.32,1.55,.035,x-1+s*.4,1.33,z,curtain,r);strip.rotation.z=(s%2?.025:-.02);}
    });

    planeSign(scene,'microbusStand','موقف الحارة',-3,2.45,54,3.6,.62,'#2e6278',0);
    const bench=mat(scene,'v11_bench','#575a57');box(scene,'standBench',3.2,.12,.48,-3,.5,56,bench);for(const x of [-4.3,-1.7])box(scene,'standBenchLeg',.12,.5,.35,x,.25,56,bench);

    return {numbers,meters,intercoms,handCarts:3,waterCrates:8,curtains:24};
  }

  function installAudio(scene){
    let own=null,trafficGain=null,marketGain=null,ahwaGain=null,scheduler=null,started=false;
    const makeNoise=(ctx,seconds=3)=>{const len=Math.floor(ctx.sampleRate*seconds),b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);let brown=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;brown=brown*.985+w*.015;d[i]=brown*.65+w*.08;}return b;};
    const env=(ctx,freq,dur,vol,type='sine',when=0)=>{const t=ctx.currentTime+when,o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type=type;o.frequency.value=freq;f.type='lowpass';f.frequency.value=900;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.025);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(f);f.connect(g);g.connect(own);o.start(t);o.stop(t+dur+.05);};
    const clink=ctx=>{env(ctx,1450,.035,.018,'sine');env(ctx,2050,.025,.011,'sine',.045);};
    const coo=ctx=>{env(ctx,235,.34,.012,'sine');env(ctx,185,.42,.009,'sine',.18);};
    const horn=ctx=>{env(ctx,260,.13,.014,'triangle');env(ctx,315,.10,.008,'triangle',.035);};

    function start(){
      if(started)return;const ctx=window.__V11_AUDIO_CONTEXT;if(!ctx)return;started=true;
      if(window.__V11_LEGACY_MASTER)window.__V11_LEGACY_MASTER.gain.setTargetAtTime(.018,ctx.currentTime,.05);
      own=ctx.createGain();own.gain.value=.8;own.connect(ctx.destination);
      const noise=makeNoise(ctx,4);
      const traffic=ctx.createBufferSource(),tf=ctx.createBiquadFilter();traffic.buffer=noise;traffic.loop=true;tf.type='lowpass';tf.frequency.value=420;trafficGain=ctx.createGain();trafficGain.gain.value=.025;traffic.connect(tf);tf.connect(trafficGain);trafficGain.connect(own);traffic.start();
      const market=ctx.createBufferSource(),mf=ctx.createBiquadFilter();market.buffer=noise;market.loop=true;mf.type='bandpass';mf.frequency.value=980;mf.Q.value=.55;marketGain=ctx.createGain();marketGain.gain.value=0;market.connect(mf);mf.connect(marketGain);marketGain.connect(own);market.start();
      const ahwa=ctx.createBufferSource(),af=ctx.createBiquadFilter();ahwa.buffer=noise;ahwa.loop=true;af.type='bandpass';af.frequency.value=620;af.Q.value=.7;ahwaGain=ctx.createGain();ahwaGain.gain.value=0;ahwa.connect(af);af.connect(ahwaGain);ahwaGain.connect(own);ahwa.start();
      let nextHorn=performance.now()+5000,nextClink=performance.now()+6500,nextCoo=performance.now()+12000;
      scheduler=setInterval(()=>{
        const cam=window.__egyptDebug?.getCamera?.();if(!cam)return;const now=performance.now();
        const dMarket=Math.hypot(cam.x-48,cam.z+48),dAhwa=Math.hypot(cam.x+48,cam.z-48),road=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));
        const t=ctx.currentTime;trafficGain?.gain.setTargetAtTime(road<12?.035:.018,t,.35);marketGain?.gain.setTargetAtTime(clamp((34-dMarket)/34,0,1)*.026,t,.4);ahwaGain?.gain.setTargetAtTime(clamp((28-dAhwa)/28,0,1)*.018,t,.4);
        if(now>nextHorn&&road<20){horn(ctx);nextHorn=now+7000+Math.random()*9000;}
        if(now>nextClink&&dAhwa<24){clink(ctx);nextClink=now+5500+Math.random()*7000;}
        if(now>nextCoo){coo(ctx);nextCoo=now+16000+Math.random()*18000;}
      },350);
    }

    const tryStart=()=>setTimeout(start,50);
    document.getElementById('newGameBtn')?.addEventListener('click',tryStart,true);
    document.getElementById('continueBtn')?.addEventListener('click',tryStart,true);
    document.addEventListener('click',e=>{if(e.target?.matches?.('.item button')){const ctx=window.__V11_AUDIO_CONTEXT;if(started&&ctx)clink(ctx);}});
    const toggle=document.getElementById('soundToggle');if(toggle)new MutationObserver(()=>{if(!own)return;const muted=toggle.textContent.includes('مكتوم');own.gain.setTargetAtTime(muted?0:.8,window.__V11_AUDIO_CONTEXT.currentTime,.05);}).observe(toggle,{childList:true,subtree:true,characterData:true});
    return {captureInstalled:!!NativeAC,spatialZones:true,layers:['traffic','market','ahwa','pigeons','soft-horns']};
  }

  async function boot(){
    try{
      const scene=await waitForV10();
      const repaired=repairV8Signs(scene),legacy=replaceLegacyShopSigns(scene),details=addStreetMicroDetails(scene),audio=installAudio(scene);
      const kicker=document.querySelector('.kicker');if(kicker)kicker.textContent='HAYAT MASR • V11';
      const tagline=document.querySelector('.tagline');if(tagline)tagline.textContent='حياة مصر — شارع مصري حيّ بتفاصيل يومية أوضح، كتابة عربية مضبوطة، وصوت شارع أهدى وأقرب للطبيعي.';
      const foot=document.querySelector('.menuFoot');if(foot)foot.textContent='V11 — Arabic signage + Egyptian street micro-details + location-aware audio';
      window.__V11_PATCH={version:11,arabic:'rtl-shaped-signage',repairedSigns:repaired,legacySigns:legacy,details,audio};
      if(window.__egyptDebug)window.__egyptDebug.v11State=()=>({...window.__V11_PATCH});
    }catch(err){fail('V11 polish failed',err);}
  }
  boot();
})();