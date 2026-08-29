(() => {
  'use strict';

  const errorBox = document.getElementById('errorBox');

  function fail(message, err) {
    console.error(message, err || '');
    if (errorBox) {
      errorBox.style.display = 'block';
      errorBox.textContent = message + (err?.message ? ': ' + err.message : '');
    }
  }

  function replaceOrThrow(source, pattern, replacement, label) {
    const next = source.replace(pattern, replacement);
    if (next === source) throw new Error('V6 patch target missing: ' + label);
    return next;
  }

  async function boot() {
    try {
      const response = await fetch('game.js', { cache: 'no-store' });
      if (!response.ok) throw new Error('تعذر تحميل كود اللعبة الأصلي');
      let source = await response.text();

      source = replaceOrThrow(
        source,
        /  function updateVehicles\(dt\)\{[\s\S]*?\n  function nearestRoad/,
`  function updateVehicles(dt){
    for(const v of world.vehicles){
      if(v.vertical){
        v.root.position.z+=v.speed*v.dir*dt;
        if(v.root.position.z>101){v.root.position.z=101;v.dir=-1;}
        else if(v.root.position.z<-101){v.root.position.z=-101;v.dir=1;}
        const target=v.dir>0?Math.PI:0,delta=Math.atan2(Math.sin(target-v.root.rotation.y),Math.cos(target-v.root.rotation.y));
        v.root.rotation.y+=delta*Math.min(1,.09*dt);
      }else{
        v.root.position.x+=v.speed*v.dir*dt;
        if(v.root.position.x>101){v.root.position.x=101;v.dir=-1;}
        else if(v.root.position.x<-101){v.root.position.x=-101;v.dir=1;}
        const target=v.dir>0?-Math.PI/2:Math.PI/2,delta=Math.atan2(Math.sin(target-v.root.rotation.y),Math.cos(target-v.root.rotation.y));
        v.root.rotation.y+=delta*Math.min(1,.09*dt);
      }
    }
  }
  function nearestRoad`,
        'vehicle continuity'
      );

      source = replaceOrThrow(
        source,
        /  function makePerson\(x,z,i\)\{[\s\S]*?\n  function buildPeople\(\)\{[^\n]*\}/,
`  function makePerson(x,z,i){
    const root=new BABYLON.TransformNode('personRoot',scene);root.position.set(x,0,z);
    const visual=new BABYLON.TransformNode('personVisual',scene);visual.parent=root;
    const skin=mat('skin','#b98563'),cols=['#455f77','#744e40','#45684a','#6b4b71','#817047','#4b4b4b'],shirt=mat('shirt'+i,cols[i%cols.length]),pants=mat('pants'+i,'#343b40'),shoe=mat('shoe','#24211f');

    const torso=box('torso',.62,.78,.34,0,1.24,0,shirt);torso.parent=visual;
    const pelvis=box('pelvis',.5,.25,.31,0,.80,0,pants);pelvis.parent=visual;
    const neck=cyl('neck',.17,.15,0,1.68,0,skin,8);neck.parent=visual;
    const head=BABYLON.MeshBuilder.CreateSphere('head',{diameter:.44,segments:10},scene);head.parent=visual;head.position.y=1.86;head.material=skin;

    function leg(side){
      const hip=new BABYLON.TransformNode(side<0?'hipL':'hipR',scene);hip.parent=visual;hip.position.set(side*.17,.77,0);
      const thigh=box(side<0?'thighL':'thighR',.19,.46,.21,0,-.23,0,pants);thigh.parent=hip;
      const knee=new BABYLON.TransformNode(side<0?'kneeL':'kneeR',scene);knee.parent=hip;knee.position.set(0,-.46,0);
      const calf=box(side<0?'calfL':'calfR',.17,.43,.19,0,-.21,0,pants);calf.parent=knee;
      const foot=box(side<0?'footL':'footR',.2,.12,.38,0,-.45,-.08,shoe);foot.parent=knee;
      return {hip,knee,foot};
    }
    function arm(side){
      const shoulder=new BABYLON.TransformNode(side<0?'shoulderL':'shoulderR',scene);shoulder.parent=visual;shoulder.position.set(side*.39,1.49,0);
      const upper=box(side<0?'upperArmL':'upperArmR',.15,.39,.16,0,-.19,0,shirt);upper.parent=shoulder;
      const elbow=new BABYLON.TransformNode(side<0?'elbowL':'elbowR',scene);elbow.parent=shoulder;elbow.position.set(0,-.38,0);
      const fore=box(side<0?'foreArmL':'foreArmR',.14,.34,.15,0,-.17,0,skin);fore.parent=elbow;
      return {shoulder,elbow};
    }

    const leftLeg=leg(-1),rightLeg=leg(1),leftArm=arm(-1),rightArm=arm(1);
    const data={root,visual,torso,hipL:leftLeg.hip,hipR:rightLeg.hip,kneeL:leftLeg.knee,kneeR:rightLeg.knee,footL:leftLeg.foot,footR:rightLeg.foot,shoulderL:leftArm.shoulder,shoulderR:rightArm.shoulder,elbowL:leftArm.elbow,elbowR:rightArm.elbow,axis:i%2,dir:i%3===0?-1:1,speed:.014+(i%5)*.0022,cadence:.88+(i%4)*.08,phase:i*.73,turning:0,name:sayings[i%sayings.length][0],line:sayings[i%sayings.length][1]};
    world.interactables.push({kind:'person',name:data.name,data,root});return data;
  }
  function buildPeople(){for(let i=0;i<28;i++)world.people.push(makePerson(-100+(i*29)%200,-100+(i*41)%200,i));}`,
        'articulated pedestrian model'
      );

      source = replaceOrThrow(
        source,
        /  function updatePeople\(dt\)\{[\s\S]*?\n\n  function itemPos/,
`  function updatePeople(dt){
    for(let i=0;i<world.people.length;i++){
      const p=world.people[i];
      if(p.lane===undefined){
        const side=(Math.floor(i/2)%2===0?1:-1)*6.8;
        p.lane=p.axis===0?nearestRoad(p.root.position.z)+side:nearestRoad(p.root.position.x)+side;
      }

      const moving=p.turning<=0;
      if(moving)p.phase+=.082*dt*p.cadence;
      else p.phase+=.025*dt;
      const g=p.phase*4.55,s=Math.sin(g),stride=moving?1:.16;
      const hip=s*.34*stride;
      p.hipL.rotation.x=hip;p.hipR.rotation.x=-hip;
      p.kneeL.rotation.x=.035+Math.max(0,-s)*.52*stride;
      p.kneeR.rotation.x=.035+Math.max(0,s)*.52*stride;
      p.footL.rotation.x=-Math.max(0,s)*.11*stride;
      p.footR.rotation.x=-Math.max(0,-s)*.11*stride;
      p.shoulderL.rotation.x=-s*.25*stride;p.shoulderR.rotation.x=s*.25*stride;
      p.elbowL.rotation.x=.08+Math.max(0,s)*.17*stride;p.elbowR.rotation.x=.08+Math.max(0,-s)*.17*stride;
      p.visual.position.y=Math.abs(Math.sin(g*2))*.017*stride;
      p.visual.rotation.z=Math.sin(g)*.008*stride;
      p.torso.rotation.x=.018+Math.abs(s)*.006*stride;

      let targetYaw=0;
      if(p.axis===0){
        p.root.position.z=p.lane;
        if(p.turning>0)p.turning-=dt;
        else{
          p.root.position.x+=p.speed*p.dir*dt;
          if(p.root.position.x>99){p.root.position.x=99;p.dir=-1;p.turning=12;}
          else if(p.root.position.x<-99){p.root.position.x=-99;p.dir=1;p.turning=12;}
        }
        targetYaw=p.dir>0?Math.PI/2:-Math.PI/2;
      }else{
        p.root.position.x=p.lane;
        if(p.turning>0)p.turning-=dt;
        else{
          p.root.position.z+=p.speed*p.dir*dt;
          if(p.root.position.z>99){p.root.position.z=99;p.dir=-1;p.turning=12;}
          else if(p.root.position.z<-99){p.root.position.z=-99;p.dir=1;p.turning=12;}
        }
        targetYaw=p.dir>0?0:Math.PI;
      }
      const delta=Math.atan2(Math.sin(targetYaw-p.root.rotation.y),Math.cos(targetYaw-p.root.rotation.y));
      p.root.rotation.y+=delta*Math.min(1,.12*dt);
    }
  }

  function itemPos`,
        'natural pedestrian gait'
      );

      source = replaceOrThrow(
        source,
        /  function startAudio\(\)\{[\s\S]*?\n\n  window\.__egyptDebug=/,
`  function startAudio(){
    if(!audio.enabled)return;
    try{
      if(!audio.ctx){
        const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
        audio.ctx=new AC();audio.master=audio.ctx.createGain();audio.master.gain.value=.15;audio.master.connect(audio.ctx.destination);
        const len=audio.ctx.sampleRate*4,buf=audio.ctx.createBuffer(1,len,audio.ctx.sampleRate),data=buf.getChannelData(0);let brown=0;
        for(let i=0;i<len;i++){const white=Math.random()*2-1;brown=brown*.986+white*.014;data[i]=brown*.5;}
        const traffic=audio.ctx.createBufferSource(),lp=audio.ctx.createBiquadFilter(),g=audio.ctx.createGain();traffic.buffer=buf;traffic.loop=true;lp.type='lowpass';lp.frequency.value=235;lp.Q.value=.4;g.gain.value=.047;traffic.connect(lp);lp.connect(g);g.connect(audio.master);traffic.start();audio.noise=traffic;audio.hum=null;
      }
      audio.ctx.resume();nextHorn=performance.now()+7000+Math.random()*6000;
    }catch(e){console.warn('Audio unavailable',e);}
  }
  function toggleAudio(){audio.enabled=!audio.enabled;if(audio.master)audio.master.gain.value=audio.enabled?.15:0;if(audio.enabled)startAudio();updateHUD();showToast(audio.enabled?'الصوت اشتغل 🔊':'الصوت اتكتم 🔇');}
  function tone(freq,dur=.12,vol=.022,type='sine',delay=0){if(!audio.enabled||!audio.ctx||!audio.master)return;const t=audio.ctx.currentTime+delay,o=audio.ctx.createOscillator(),g=audio.ctx.createGain(),f=audio.ctx.createBiquadFilter();o.type=type;o.frequency.setValueAtTime(freq,t);f.type='lowpass';f.frequency.value=880;f.Q.value=.3;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.018);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(f);f.connect(g);g.connect(audio.master);o.start(t);o.stop(t+dur+.04);}
  function playHorn(){tone(195,.15,.021,'triangle');tone(232,.12,.012,'sine',.03);}
  function playStep(){if(!audio.enabled||!audio.ctx||!audio.master)return;const len=Math.floor(audio.ctx.sampleRate*.03),buf=audio.ctx.createBuffer(1,len,audio.ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);const s=audio.ctx.createBufferSource(),g=audio.ctx.createGain(),f=audio.ctx.createBiquadFilter();s.buffer=buf;f.type='lowpass';f.frequency.value=235;g.gain.value=.022;s.connect(f);f.connect(g);g.connect(audio.master);s.start();}
  function playInteract(){tone(390,.055,.015,'triangle');}
  function playBuy(){tone(500,.05,.016,'sine');tone(620,.06,.012,'sine',.055);}
  function updateAudio(){if(!audio.enabled||!audio.ctx)return;const now=performance.now();if(now>nextHorn){let nearest=999;for(const v of world.vehicles)nearest=Math.min(nearest,Math.hypot(v.root.position.x-camera.position.x,v.root.position.z-camera.position.z));if(nearest<30&&Math.random()>.42)playHorn();nextHorn=now+9000+Math.random()*12000;}}

  window.__egyptDebug=`,
        'soft audio mix'
      );

      source += `\n//# sourceURL=game-v6-patched-core.js`;
      (0, eval)(source);

      window.__V6_PATCH={version:6,pedestrians:'articulated-natural-gait',vehicles:'smooth-turnaround',audio:'soft-city-mix',menu:'live-3d-cinematic'};
      if(window.__egyptDebug){
        window.__egyptDebug.v6State=()=>({...window.__V6_PATCH});
        window.__egyptDebug.npcState=()=>{
          const scene=BABYLON.Engine.LastCreatedEngine?.scenes?.[0];
          const roots=scene?.transformNodes?.filter(n=>n.name==='personRoot')||[];
          const joints=scene?.transformNodes?.filter(n=>['hipL','hipR','kneeL','kneeR','shoulderL','shoulderR','elbowL','elbowR'].includes(n.name))||[];
          return {people:roots.length,joints:joints.length,first:roots[0]?{x:roots[0].position.x,z:roots[0].position.z,rot:roots[0].rotation.y}:null};
        };
      }

      const menu=document.getElementById('menu'),hud=document.getElementById('hud');
      const syncMenuHud=()=>{if(menu&&hud)hud.style.visibility=getComputedStyle(menu).display==='none'?'visible':'hidden';};
      if(menu){new MutationObserver(syncMenuHud).observe(menu,{attributes:true,attributeFilter:['style']});syncMenuHud();}

      const scene=BABYLON.Engine.LastCreatedEngine?.scenes?.[0],cam=scene?.activeCamera;
      if(cam){cam.position.set(-58,3.15,67);cam.rotation.set(.035,2.33,0);cam.fov=.82;}
      const kicker=document.querySelector('.kicker');if(kicker)kicker.textContent='HAYAT MASR • V6';
    }catch(err){fail('V6 ما اشتغلتش بالشكل المطلوب',err);}
  }

  boot();
})();
