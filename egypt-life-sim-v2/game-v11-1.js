(() => {
  'use strict';

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const TWO=Math.PI*2;
  const fail=(msg,err)=>{console.error(msg,err||'');const box=document.getElementById('errorBox');if(box){box.style.display='block';box.textContent=msg+(err?.message?': '+err.message:'');}};

  async function waitForV11(){
    for(let i=0;i<260;i++){
      const scene=window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0];
      if(scene&&window.__V11_PATCH?.version===11)return scene;
      await sleep(50);
    }
    throw new Error('V11 did not finish before V11.1');
  }

  function facingBack(y){
    const a=((y%TWO)+TWO)%TWO;
    return Math.cos(a)<-.2;
  }

  function repairArabicUV(scene){
    const prefixes=['v11_legacyShop_','v11_homeLabel','v11_fulLabel','v11_buildingNo_','v8_shopSign_','v8_routeBoard_','v8_streetPlate_','v8_kioskSign_','v8_smallSign_'];
    let checked=0,flipped=0;
    for(const mesh of scene.meshes){
      if(!prefixes.some(p=>mesh.name.startsWith(p)))continue;
      const tex=mesh.material?.diffuseTexture;if(!tex)continue;checked++;
      const flip=facingBack(mesh.rotation?.y||0);
      tex.uScale=flip?-Math.abs(tex.uScale||1):Math.abs(tex.uScale||1);
      tex.uOffset=flip?1:0;
      tex.wrapU=BABYLON.Texture.CLAMP_ADDRESSMODE;
      tex.wrapV=BABYLON.Texture.CLAMP_ADDRESSMODE;
      if(flip)flipped++;
    }
    return {checked,flipped,mirroredBackfacesFixed:flipped>0};
  }

  function mat(scene,name,hex,emit=''){
    let m=scene.materials.find(x=>x.name===name);if(m)return m;
    m=new BABYLON.StandardMaterial(name,scene);m.diffuseColor=BABYLON.Color3.FromHexString(hex);m.specularColor=BABYLON.Color3.Black();if(emit)m.emissiveColor=BABYLON.Color3.FromHexString(emit);return m;
  }
  function box(scene,name,w,h,d,x,y,z,material,rot=0,parent=null){const b=BABYLON.MeshBuilder.CreateBox('v111_'+name,{width:w,height:h,depth:d},scene);b.position.set(x,y,z);b.rotation.y=rot;b.material=material;b.parent=parent;b.isPickable=false;b.checkCollisions=false;return b;}
  function cyl(scene,name,d,h,x,y,z,material,tess=12,parent=null){const c=BABYLON.MeshBuilder.CreateCylinder('v111_'+name,{diameter:d,height:h,tessellation:tess},scene);c.position.set(x,y,z);c.material=material;c.parent=parent;c.isPickable=false;c.checkCollisions=false;return c;}

  function textTexture(scene,name,text,bg='#f0e7cf',fg='#25231f',w=512,h=128,font=48){
    const tex=new BABYLON.DynamicTexture('v111_tex_'+name,{width:w,height:h},scene,false),ctx=tex.getContext();
    ctx.save();ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.direction='rtl';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=fg;ctx.font=`700 ${font}px "Noto Sans Arabic", Tahoma, Arial, sans-serif`;ctx.fillText('\u2067'+text+'\u2069',w/2,h/2+2,w*.9);ctx.restore();tex.update();return tex;
  }
  function plane(scene,name,text,w,h,parent,pos,rotY=0,bg='#f0e7cf',fg='#25231f'){
    const tex=textTexture(scene,name,text,bg,fg),material=new BABYLON.StandardMaterial('v111_mat_'+name,scene);material.diffuseTexture=tex;material.emissiveColor=new BABYLON.Color3(.025,.022,.018);material.backFaceCulling=false;
    const p=BABYLON.MeshBuilder.CreatePlane('v111_'+name,{width:w,height:h},scene);p.parent=parent||null;p.position.copyFrom(pos);p.rotation.y=rotY;p.material=material;p.isPickable=false;p.checkCollisions=false;
    if(facingBack(rotY)){tex.uScale=-1;tex.uOffset=1;}
    return p;
  }

  function addEgyptianDetailPass(scene){
    let routeCards=0,plates=0,curbMarks=0,posters=0,coolers=0;
    const routes=['رمسيس • العتبة','فيصل • التحرير','الدقي • رمسيس','السيدة • العتبة'];
    const micros=scene.transformNodes.filter(n=>n.name==='microRoot');
    micros.forEach((root,i)=>{
      plane(scene,'microRoute_'+i,routes[i%routes.length],1.15,.3,root,new BABYLON.Vector3(0,.63,-2.43),Math.PI,'#ece4c8','#25231f');routeCards++;
      const white=mat(scene,'v111_plateWhite','#e8e9e5'),blue=mat(scene,'v111_plateBlue','#315f86');
      box(scene,'plate',.86,.28,.035,0,-.18,-2.43,white,0,root);box(scene,'plateBand',.2,.29,.04,-.33,-.18,-2.45,blue,0,root);plates++;
    });

    const black=mat(scene,'v111_curbBlack','#282927'),white=mat(scene,'v111_curbWhite','#dedbd2');
    for(const z of [-31,-29,-27,-21,-19,-17,17,19,21,27,29,31]){
      for(const x of [-54,-48,-42,42,48,54]){
        const along=Math.abs(z)>24;
        const m=box(scene,'curbPaint',along?5.5:.18,.2,along?.18:5.5,x,.105,z,(curbMarks%2)?black:white);m.position.y=.105;curbMarks++;
      }
    }

    const buildings=scene.meshes.filter(m=>m.name==='building').slice(0,16);
    buildings.forEach((b,i)=>{
      if(i%2!==0)return;b.computeWorldMatrix(true);const bb=b.getBoundingInfo().boundingBox,min=bb.minimumWorld,max=bb.maximumWorld,front=min.z-.2;
      plane(scene,'rentPoster_'+i,i%4===0?'للإيجار':'مدخل العمارة',1.05,.42,null,new BABYLON.Vector3(b.position.x+(i%3-1)*2.2,1.62,front),Math.PI,i%4===0?'#efe7cf':'#315f78',i%4===0?'#6d332a':'#f3ead8');posters++;
    });

    const coolerBody=mat(scene,'v111_cooler','#4280a4'),coolerLid=mat(scene,'v111_coolerLid','#ece7db');
    [[-46,36],[6,18.7],[55.8,41.5]].forEach(([x,z],i)=>{cyl(scene,'waterCooler',.56,.9,x,.48,z,coolerBody,14);cyl(scene,'waterCoolerLid',.6,.12,x,.99,z,coolerLid,14);coolers++;});

    const wire=mat(scene,'v111_looseWire','#272725');
    buildings.slice(0,8).forEach((b,i)=>{b.computeWorldMatrix(true);const bb=b.getBoundingInfo().boundingBox,min=bb.minimumWorld,max=bb.maximumWorld,front=min.z-.23;for(let k=0;k<2;k++){const path=[new BABYLON.Vector3(b.position.x-2+k*3.5,2.9,front),new BABYLON.Vector3(b.position.x-1.4+k*3.5,2.25,front-.05),new BABYLON.Vector3(b.position.x-.9+k*3.5,1.45,front)];const t=BABYLON.MeshBuilder.CreateTube('v111_looseFacadeWire',{path,radius:.015,tessellation:5},scene);t.material=wire;t.isPickable=false;t.checkCollisions=false;}});

    return {routeCards,plates,curbMarks,posters,coolers,looseFacadeWires:16};
  }

  function installBetterAudio(){
    let hooked=false,started=false,master=null,traffic=null,market=null,ahwa=null,stepDistance=0,lastCam=null,timer=null;

    function hookContext(){
      const ctx=window.__V11_AUDIO_CONTEXT;if(!ctx||ctx.__v111Hooked)return;
      ctx.__v111Hooked=true;const prev=ctx.createGain.bind(ctx);let first=true;
      ctx.createGain=()=>{const g=prev();if(first){first=false;window.__V11_OWN_MASTER=g;setTimeout(()=>{try{g.gain.setTargetAtTime(0,ctx.currentTime,.08);}catch(_){}},90);}return g;};hooked=true;
    }

    const makeNoise=(ctx,seconds=4,bright=.12)=>{const len=Math.floor(ctx.sampleRate*seconds),b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);let brown=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;brown=brown*.992+w*.008;d[i]=brown*.72+w*bright;}return b;};
    const burst=(ctx,center,dur,vol,q=1.2)=>{if(!master)return;const b=makeNoise(ctx,.09,.45),s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),t=ctx.currentTime;s.buffer=b;f.type='bandpass';f.frequency.value=center;f.Q.value=q;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(master);s.start(t);s.stop(t+dur+.03);};
    const tone=(ctx,freq,dur,vol,type='triangle',delay=0,detune=0)=>{if(!master)return;const t=ctx.currentTime+delay,o=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.detune.value=detune;f.type='lowpass';f.frequency.value=1100;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(f);f.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.04);};
    const horn=ctx=>{tone(ctx,312,.17,.018,'sawtooth',0,-7);tone(ctx,392,.15,.012,'triangle',.018,5);burst(ctx,760,.07,.004,1.6);};
    const domino=ctx=>{burst(ctx,1850,.035,.013,3.2);burst(ctx,1220,.028,.009,2.3);};
    const tea=ctx=>{tone(ctx,1680,.04,.009,'sine');tone(ctx,2230,.025,.006,'sine',.035);};
    const metalChime=ctx=>{tone(ctx,1040,.12,.008,'sine');tone(ctx,1460,.09,.006,'sine',.06);};
    const pigeon=ctx=>{tone(ctx,215,.32,.006,'sine');tone(ctx,178,.38,.0045,'sine',.19);};
    const step=(ctx,pavement)=>{burst(ctx,pavement?1120:520,.045,pavement?.012:.014,pavement?1.6:.8);if(!pavement)burst(ctx,210,.035,.007,.7);};

    function bed(ctx,noise,filterType,freq,vol){const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noise;s.loop=true;f.type=filterType;f.frequency.value=freq;f.Q.value=.55;g.gain.value=vol;s.connect(f);f.connect(g);g.connect(master);s.start();return g;}

    function start(){
      if(started)return;hookContext();const ctx=window.__V11_AUDIO_CONTEXT;if(!ctx)return;started=true;
      if(window.__V11_OWN_MASTER)window.__V11_OWN_MASTER.gain.setTargetAtTime(0,ctx.currentTime,.08);
      if(window.__V11_LEGACY_MASTER)window.__V11_LEGACY_MASTER.gain.setTargetAtTime(.004,ctx.currentTime,.08);
      master=ctx.createGain();master.gain.value=.48;master.connect(ctx.destination);
      const low=makeNoise(ctx,5,.055),mid=makeNoise(ctx,4,.10),high=makeNoise(ctx,3,.18);
      traffic=bed(ctx,low,'lowpass',310,.022);market=bed(ctx,mid,'bandpass',760,0);ahwa=bed(ctx,high,'bandpass',520,0);
      let nextHorn=performance.now()+4500,nextDomino=performance.now()+5000,nextTea=performance.now()+7300,nextMarket=performance.now()+9000,nextPigeon=performance.now()+13000;
      timer=setInterval(()=>{
        const cam=window.__egyptDebug?.getCamera?.();if(!cam)return;const now=performance.now(),t=ctx.currentTime;
        const road=Math.min(...[-72,-24,24,72].map(r=>Math.min(Math.abs(cam.x-r),Math.abs(cam.z-r))));
        const dMarket=Math.hypot(cam.x-48,cam.z+48),dAhwa=Math.hypot(cam.x+48,cam.z-48);
        traffic.gain.setTargetAtTime(road<10?.034:.014,t,.28);market.gain.setTargetAtTime(clamp((30-dMarket)/30,0,1)*.018,t,.32);ahwa.gain.setTargetAtTime(clamp((24-dAhwa)/24,0,1)*.012,t,.32);
        if(lastCam){const move=Math.hypot(cam.x-lastCam.x,cam.z-lastCam.z);stepDistance+=move;if(stepDistance>.68){const pavement=road>4.7&&road<8.3;step(ctx,pavement);stepDistance=0;}}lastCam={x:cam.x,z:cam.z};
        if(now>nextHorn&&road<18){horn(ctx);nextHorn=now+8500+Math.random()*11000;}
        if(now>nextDomino&&dAhwa<22){domino(ctx);nextDomino=now+3500+Math.random()*5000;}
        if(now>nextTea&&dAhwa<22){tea(ctx);nextTea=now+6500+Math.random()*6500;}
        if(now>nextMarket&&dMarket<27){metalChime(ctx);nextMarket=now+10000+Math.random()*12000;}
        if(now>nextPigeon){pigeon(ctx);nextPigeon=now+18000+Math.random()*18000;}
      },120);
    }

    const onStart=()=>{setTimeout(hookContext,0);setTimeout(start,140);};
    document.getElementById('newGameBtn')?.addEventListener('click',onStart,true);
    document.getElementById('continueBtn')?.addEventListener('click',onStart,true);
    const toggle=document.getElementById('soundToggle');if(toggle)new MutationObserver(()=>{if(!master||!window.__V11_AUDIO_CONTEXT)return;const mute=toggle.textContent.includes('مكتوم');master.gain.setTargetAtTime(mute?0:.48,window.__V11_AUDIO_CONTEXT.currentTime,.05);}).observe(toggle,{childList:true,subtree:true,characterData:true});

    return {engine:'layered-procedural-cairo-v2',contextHook:true,legacyMixMuted:true,locationAware:true,footsteps:'surface-aware-distance',events:['soft-horn','domino','tea-glass','market-metal-chime','pigeons']};
  }

  async function boot(){
    try{
      const scene=await waitForV11();
      const arabicUV=repairArabicUV(scene),details=addEgyptianDetailPass(scene),audio=installBetterAudio();
      const foot=document.querySelector('.menuFoot');if(foot)foot.textContent='V11.1 — corrected Arabic orientation + richer Cairo audio + micro-details';
      window.__V111_PATCH={version:'11.1',arabicUV,details,audio};
      if(window.__egyptDebug)window.__egyptDebug.v111State=()=>({...window.__V111_PATCH});
    }catch(err){fail('V11.1 polish failed',err);}
  }
  boot();
})();