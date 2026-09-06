(() => {
  'use strict';
  window.EgyptStory={install(scene,home){
    const B=BABYLON,button=document.getElementById('newGameBtn');
    // Each line has a visible action; the camera remains fixed within each shot.
    const beats=[
      {who:'الصبح بدري',line:'المنبّه بيرن… وأنا عامل نفسي مش من سكان الشقة.',action:'نايم على السرير والمنبّه جنبي.',from:[-155.8,3.0,-151.4],look:[-155.9,1.0,-154.75]},
      {who:'أنا',line:'أهو قعدت… باقي بس أقنع رجليّ إن الإجازة خلصت.',action:'بصحصح وبقعد على طرف السرير.',from:[-157.8,2.7,-150.4],look:[-155.3,1.35,-154]},
      {who:'ماما',line:'خد الفلوس: أربعة عيش وطبق فول. والفكة ترجع… ما تعملهاش بلوك!',action:'ماما بتديني فلوس مشوار الفطار.',from:[-153.7,2.45,-146.0],look:[-153.7,1.35,-150.9]},
      {who:'أنا',line:'نازل أجيب الفطار… أول مهمة في اليوم، وربنا يستر من ريحة الطعمية!',action:'بخرج من الشقة… وبعد شوية أوصل أول الحارة.',from:[-152,2.6,-150.2],look:[-150,1.25,-144.2]}
    ];
    let actors,cash,doorHinge;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.EgyptStory.prepareCast=()=>{
      if(actors)return;
      const copy=(role,rig,position)=>{
        const root=new B.TransformNode('storyActor_'+role,scene);
        const visual=scene.getTransformNodeByName('v9_personVisual_'+rig).clone('storyRig_'+role,root,false);
        visual.position.set(0,.15,0);visual.rotation.set(0,Math.PI,0);root.position.set(...position);
        const nodes=visual.getDescendants(false);
        for(const node of nodes){
          if(/v9_(pelvis|spine|hip|knee|ankle|shoulder|elbow)/.test(node.name)&&!node.getTotalVertices)node.rotation.set(0,0,0);
          if(node.getTotalVertices){node.metadata={...node.metadata,storyActor:role};node.isPickable=false;node.checkCollisions=false;}
        }
        const joint=name=>nodes.find(n=>n.name.endsWith(name+'_'+rig));
        return {root,visual,joint,waist:nodes.filter(n=>/v9p_(pelvis|waist)_/.test(n.name)),head:nodes.find(n=>n.name.endsWith('v9_head_'+rig))};
      };
      actors={hero:copy('hero',3,[-154,0,-154.1]),mother:copy('mother',1,[-150.4,0,-150]),vendor:copy('vendor',2,[-8,0,-16.7])};
      // Clear sight lines to the bed and a walkable route to the front door.
      for(const mesh of scene.meshes){
        if(['v12_sofaSeat','v12_sofaBack'].includes(mesh.name))mesh.position.x+=8.5;
        if(/^v12_coffee(Table|Leg)/.test(mesh.name)){mesh.position.x+=6;mesh.position.z+=1.7;}
        if(mesh.name==='v12_diningTop'||/^v12_chair(Seat|Back)_/.test(mesh.name))mesh.position.x-=4;
        if(/^v12_fan(Head|Pole)$/.test(mesh.name))mesh.position.x+=4;
      }
      // The flat opens onto a landing, so the exit shot never exposes the
      // off-map space used to keep the indoor set separate from the street.
      const landing=(name,size,position,material)=>{const m=B.MeshBuilder.CreateBox('storyLanding_'+name,size,scene);m.position.set(...position);m.material=material;m.checkCollisions=true;m.isPickable=false;};
      const wall=scene.getMeshByName('v12_homeWallN').material,floor=scene.getMeshByName('v12_homeFloor').material;
      landing('floor',{width:5.2,height:.16,depth:4.5},[-150,.02,-140.8],floor);
      landing('back',{width:5.2,height:3.1,depth:.22},[-150,1.55,-138.55],wall);
      for(const x of [-152.6,-147.4])landing('side_'+x,{width:.22,height:3.1,depth:4.5},[x,1.55,-140.8],wall);
      landing('ceiling',{width:5.2,height:.18,depth:4.5},[-150,3.22,-140.8],wall);
      const door=scene.getMeshByName('v12_homeDoor');
      doorHinge=new B.TransformNode('storyDoorHinge',scene);doorHinge.position.set(door.position.x-1.125,door.position.y,door.position.z);
      door.parent=doorHinge;door.position.set(1.125,0,0);
      cash=new B.TransformNode('storyCash',scene);
      const texture=new B.DynamicTexture('storyBanknotes',{width:256,height:128},scene,false),ctx=texture.getContext();
      ctx.fillStyle='#c5bd8d';ctx.fillRect(0,0,256,128);ctx.strokeStyle='#536651';ctx.lineWidth=8;ctx.strokeRect(10,10,236,108);ctx.fillStyle='#435746';ctx.font='bold 54px Tahoma';ctx.textAlign='center';ctx.fillText('١٠٠',128,84);texture.update();
      const material=new B.StandardMaterial('storyMoneyMaterial',scene);material.diffuseTexture=texture;material.specularColor=B.Color3.Black();
      for(let i=0;i<3;i++){const bill=B.MeshBuilder.CreateBox('storyBill_'+i,{width:.34,height:.17,depth:.006},scene);bill.parent=cash;bill.position.set(i*.018,i*.012,i*.008);bill.material=material;bill.isPickable=false;bill.metadata={storyProp:'cash'};}
      cash.setEnabled(false);
      const clockFace=scene.getMeshByName('v12_alarmClockFace'),clockTex=new B.DynamicTexture('storyClockDial',{width:256,height:160},scene,false),cc=clockTex.getContext();
      cc.fillStyle='#263532';cc.fillRect(0,0,256,160);cc.fillStyle='#f8e597';cc.textAlign='center';cc.font='bold 64px Tahoma';cc.fillText('٦:٣٠',128,103);clockTex.update();
      const cm=new B.StandardMaterial('storyClockMaterial',scene);cm.diffuseTexture=clockTex;cm.emissiveColor=new B.Color3(.25,.24,.14);clockFace.material=cm;
      actors.vendor.visual.rotation.y=0;
      actors.hero.root.setEnabled(false);
      window.__EGYPT_CAST={ready:true,actors:Object.fromEntries(Object.entries(actors).map(([role,a])=>[role,{root:a.root.name,head:a.head.name}]))};
    };
    function poseActors(progress){
      const t=Math.max(0,Math.min(1,progress)),ease=t*t*(3-2*t),hero=actors.hero,mother=actors.mother;
      hero.root.setEnabled(true);cash.setEnabled(index===2);
      for(const actor of [hero,mother]){
        actor.visual.rotation.set(0,Math.PI,0);actor.joint('v9_spine').rotation.set(0,0,0);
        actor.joint('v9_pelvis').position.y=.82;actor.joint('v9_spine').position.y=.22;
        for(const mesh of actor.waist)mesh.rotation.x=0;
        for(const side of ['L','R'])for(const part of ['hip','knee','shoulder','elbow'])actor.joint('v9_'+part+side).rotation.set(0,0,0);
      }
      mother.root.position.set(-153,.12,-150.9);hero.root.position.set(-155.05,0,-154.65);
      for(const eye of hero.visual.getChildMeshes().filter(m=>/v9_eye[LR]_3$/.test(m.name)))eye.scaling.y=index===0?.065:.65;
      const clock=scene.getMeshByName('v12_alarmClock'),face=scene.getMeshByName('v12_alarmClockFace');
      clock.rotation.z=face.rotation.z=index===0&&!reduced?Math.sin(performance.now()*.018)*.075:0;
      doorHinge.rotation.y=0;
      if(index<=1){
        const reclined=index===0?1:1-ease;
        hero.joint('v9_pelvis').position.y=.82+.19*reclined;
        hero.joint('v9_spine').position.y=.22-.19*reclined;
        for(const mesh of hero.waist)mesh.rotation.x=1.55*reclined;
        hero.joint('v9_spine').rotation.x=1.55*(index===0?1:1-ease);
        hero.root.position.z=-154.65+(index===1?.6*ease:0);
        for(const side of ['L','R']){
          hero.joint('v9_hip'+side).rotation.x=index===0?1.55:1.55-.25*ease;
          hero.joint('v9_knee'+side).rotation.x=index===0?0:-1.25*ease;
          hero.joint('v9_shoulder'+side).rotation.x=index===1?2.1*ease:0;
          hero.joint('v9_elbow'+side).rotation.x=index===1?.5*ease:0;
        }
      }else if(index===2){
        hero.root.position.set(-154.4,.12,-150.9);hero.visual.rotation.y=-Math.PI/2;mother.visual.rotation.y=Math.PI/2;
        for(const [actor,side] of [[hero,'L'],[mother,'R']]){actor.joint('v9_shoulder'+side).rotation.x=1.3;actor.joint('v9_elbow'+side).rotation.x=.3;}
        hero.visual.computeWorldMatrix(true);mother.visual.computeWorldMatrix(true);
        const hand=(actor,side)=>{const elbow=actor.joint('v9_elbow'+side);elbow.computeWorldMatrix(true);return B.Vector3.TransformCoordinates(new B.Vector3(0,-.32,0),elbow.getWorldMatrix());};
        cash.position.copyFrom(B.Vector3.Lerp(hand(mother,'R'),hand(hero,'L'),ease));cash.rotation.y=0;
      }else{
        hero.root.position.set(-150.1,.12,-148.7+6.45*ease);
        const stride=t<1&&!reduced?Math.sin(t*Math.PI*10)*.42:0;
        hero.joint('v9_hipL').rotation.x=stride;hero.joint('v9_hipR').rotation.x=-stride;
        hero.joint('v9_shoulderL').rotation.x=-stride*.6;hero.joint('v9_shoulderR').rotation.x=stride*.6;
        doorHinge.rotation.y=-1.35*Math.min(1,t*2);
      }
      status.actionProgress=t;
    }
    const overlay=document.createElement('section');overlay.id='v12Prologue';overlay.hidden=true;
    overlay.setAttribute('aria-label','افتتاحية يوم جديد');overlay.innerHTML='<div class="story-eyelids"></div><div class="story-top"><span>القاهرة · بدري على الإنجازات</span><button id="storyPace" type="button">قراءة على مهلك</button><button id="storyMute" type="button">كتم صوت الكتابة</button><button id="v12Skip" type="button">تخطي المقدمة</button></div><div class="story-caption" dir="rtl"><div id="storySpeaker"></div><div id="storyAction"></div><p id="storyText" aria-hidden="true"></p><p id="storyAccessible" class="story-sr" aria-live="polite"></p><div class="story-bottom"><span id="storyCount"></span><button id="storyNext" type="button">إظهار الكلام كاملًا</button></div></div>';
    document.body.appendChild(overlay);
    const style=document.createElement('style');style.textContent=`
      #v12Prologue[hidden]{display:none!important}#v12Prologue.active{display:block;position:fixed;inset:0;z-index:90;color:#fff;background:linear-gradient(0deg,rgba(12,10,8,.70),transparent 65%);font-family:Tahoma,Arial,sans-serif}
      .story-top{position:absolute;top:max(16px,env(safe-area-inset-top));left:18px;right:18px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;direction:rtl;font-size:12px}.story-top span{margin-left:auto;text-shadow:0 2px 4px #000}
      #v12Prologue button{color:#fff;background:#30291ee8;border:1px solid #a68b62;border-radius:9px;padding:10px 14px;font:700 13px Tahoma;cursor:pointer}#v12Skip{display:inline-block!important}
      .story-caption{position:absolute;right:5%;left:5%;bottom:max(24px,env(safe-area-inset-bottom));max-width:720px;margin:auto;background:rgba(27,23,17,.94);border:1px solid #88734e;border-radius:16px;padding:20px 24px;box-sizing:border-box}#storyAction{font-size:12px;line-height:1.6;color:#d6ccba;margin-top:7px}#storySpeaker{color:#f0c875;font-weight:700;font-size:15px}#storyText{font-size:clamp(17px,2.6vw,23px);line-height:1.7;min-height:3.4em;margin:10px 0 14px;letter-spacing:normal;overflow-wrap:break-word}.story-bottom{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#d0c4af}.story-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
      .story-eyelids{position:absolute;inset:0;background:#080706;pointer-events:none;animation:storyWake 1.7s ease-out forwards}@keyframes storyWake{0%{opacity:1}35%{opacity:.8}60%{opacity:.15}75%{opacity:.65}100%{opacity:0}}@media(prefers-reduced-motion:reduce){.story-eyelids{animation:none;opacity:0}}@media(max-width:500px){.story-caption{padding:15px 17px;right:12px;left:12px}.story-top{left:12px;right:12px;gap:6px}.story-top span{width:100%}#v12Prologue button{padding:9px 11px}}
    `;document.head.appendChild(style);
    const status=window.__V12_PROLOGUE={ready:true,played:false,running:false,startsAtHome:true,version:'11.23',beat:0,typed:0,starts:0};
    let gameCamera,introCamera,observer,timer,bypass=false,manual=false,index=0,letters=[],shown=0,beatStarted=0,fullyTypedAt=0,pausedAt=0;
    const text=document.getElementById('storyText'),next=document.getElementById('storyNext');
    function stopTimer(){clearInterval(timer);timer=null;}
    function writeBeat(){
      const beat=beats[index];stopTimer();poseActors(reduced?1:0);introCamera.position.set(...beat.from);introCamera.setTarget(new B.Vector3(...beat.look));shown=0;fullyTypedAt=0;beatStarted=performance.now();
      letters=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ar',{granularity:'grapheme'}).segment(beat.line)].map(s=>s.segment):Array.from(beat.line);
      text.textContent='';document.getElementById('storySpeaker').textContent=beat.who;
      document.getElementById('storyAccessible').textContent=beat.who+': '+beat.line;
      document.getElementById('storyAction').textContent=beat.action;status.action=beat.action;
      document.getElementById('storyCount').textContent=`مشهد ${index+1} من ${beats.length}`;
      next.textContent='إظهار الكلام كاملًا';status.beat=index;status.typed=0;
      timer=setInterval(()=>{
        if(document.hidden)return;
        if(shown<letters.length){
          const expected=Math.min(letters.length,Math.floor((performance.now()-beatStarted)/42));
          if(expected<=shown)return;shown=expected;text.textContent=letters.slice(0,shown).join('');status.typed=shown;
          if(letters[shown-1]?.trim())window.__V1116_SFX_API?.play('typing');
          if(shown===letters.length){fullyTypedAt=beatStarted+letters.length*42;next.textContent=index===beats.length-1?'يلا على الشارع':'كمّل';}
        }else if(!manual&&performance.now()-fullyTypedAt>2600)advance();
      },42);
    }
    function finish(){
      if(!status.running)return;stopTimer();scene.onBeforeRenderObservable.remove(observer);observer=null;
      scene.activeCamera=gameCamera;introCamera.dispose();introCamera=null;actors.hero.root.setEnabled(false);cash.setEnabled(false);doorHinge.rotation.y=0;gameCamera.detachControl();
      overlay.hidden=true;overlay.classList.remove('active');document.getElementById('menu').style.display='';
      bypass=true;button.click();bypass=false;
      window.__egyptDebug?.resetPose?.();gameCamera.position.set(-24,1.72,-24);
      status.running=false;status.played=true;document.body.classList.add('game-started');
      window.dispatchEvent(new CustomEvent('egypt-story-finished'));
    }
    function advance(){if(index<beats.length-1){index++;writeBeat();}else finish();}
    document.getElementById('storyPace').onclick=()=>{manual=!manual;document.getElementById('storyPace').textContent=manual?'تشغيل تلقائي':'قراءة على مهلك';};
    next.onclick=()=>{manual=true;document.getElementById('storyPace').textContent='تشغيل تلقائي';if(shown<letters.length){shown=letters.length;text.textContent=letters.join('');status.typed=shown;fullyTypedAt=performance.now();next.textContent=index===beats.length-1?'يلا على الشارع':'كمّل';}else advance();};
    document.getElementById('v12Skip').onclick=finish;
    document.getElementById('storyMute').onclick=()=>{document.getElementById('soundToggle').click();setTimeout(()=>{document.getElementById('storyMute').textContent=window.__V1116_SFX_API?.state().muted?'تشغيل صوت الكتابة':'كتم صوت الكتابة';},50);};
    document.addEventListener('visibilitychange',()=>{if(!status.running)return;if(document.hidden)pausedAt=performance.now();else if(pausedAt){const delay=performance.now()-pausedAt;beatStarted+=delay;if(fullyTypedAt)fullyTypedAt+=delay;pausedAt=0;}});
    document.addEventListener('keydown',event=>{if(status.running&&['KeyW','KeyA','KeyS','KeyD','KeyE','Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)){event.preventDefault();event.stopImmediatePropagation();}},true);
    button.addEventListener('click',event=>{
      if(bypass)return;event.preventDefault();event.stopImmediatePropagation();if(status.running)return;
      status.running=true;status.played=false;status.starts++;index=0;manual=false;document.getElementById('storyPace').textContent='قراءة على مهلك';document.body.classList.remove('game-started');
      gameCamera=scene.getCameraByName('player')||scene.activeCamera;gameCamera.detachControl();document.getElementById('menu').style.display='none';document.exitPointerLock?.();
      introCamera=new B.FreeCamera('egyptWakeCamera',new B.Vector3(...beats[0].from),scene);introCamera.minZ=.05;introCamera.fov=1.05;scene.activeCamera=introCamera;
      overlay.hidden=false;overlay.classList.add('active');writeBeat();next.focus();
      observer=scene.onBeforeRenderObservable.add(()=>{
        const beat=beats[index];
        introCamera.position.set(...beat.from);introCamera.setTarget(new B.Vector3(...beat.look));scene.activeCamera=introCamera;
        poseActors(reduced?1:Math.min(1,(performance.now()-beatStarted)/2200));
      });
    },true);
  }};
})();
