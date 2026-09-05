(() => {
  'use strict';
  window.EgyptStory={install(scene,home){
    const B=BABYLON,button=document.getElementById('newGameBtn');
    // Deliberate fixed shots keep furniture out of the foreground and actors in frame.
    const beats=[
      {who:'المنبّه',line:'قوم يا بطل… دي تالت «خمس دقايق»!',from:[-154,1.85,-150.3],look:[-154,1.35,-154.1]},
      {who:'أنا',line:'حاضر… بس المخ لسه بيفتح. محدّش يدوس عليه.',from:[-154,1.8,-148.6],look:[-154,1.3,-152.4]},
      {who:'ماما',line:'هات عيش وفول يا حبيبي… والفكة ترجع، مش تتبنّاها!',from:[-148,1.75,-147.4],look:[-150.4,1.35,-150]},
      {who:'أنا',line:'نازل أبدأ مستقبلي… بس أفطر الأول. محدّش بيعمل إنجازات على الريق!',from:[-152,1.85,-144.5],look:[-151.8,1.25,-150.2]}
    ];
    let actors;
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
        return {root,visual,joint,head:nodes.find(n=>n.name.endsWith('v9_head_'+rig))};
      };
      actors={hero:copy('hero',3,[-154,0,-154.1]),mother:copy('mother',1,[-150.4,0,-150]),vendor:copy('vendor',2,[-8,0,-16.7])};
      actors.vendor.visual.rotation.y=0;
      actors.hero.root.setEnabled(false);
      window.__EGYPT_CAST={ready:true,actors:Object.fromEntries(Object.entries(actors).map(([role,a])=>[role,{root:a.root.name,head:a.head.name}]))};
    };
    function poseActors(){
      actors.hero.root.setEnabled(true);
      actors.hero.root.position.set(...(index===0?[-154,0,-154.1]:index===3?[-152.6,0,-150.3]:[-154,0,-152.4]));
      actors.mother.root.position.set(...(index===3?[-151,0,-150.1]:[-150.4,0,-150]));
      for(const side of ['L','R']){
        actors.hero.joint('v9_hip'+side).rotation.x=index===0?1.3:0;
        actors.hero.joint('v9_knee'+side).rotation.x=index===0?-1.25:0;
        actors.hero.joint('v9_shoulder'+side).rotation.x=index===1?-.35:0;
        actors.hero.joint('v9_elbow'+side).rotation.x=index===1?-.55:0;
      }
      for(const role of ['hero','mother']){
        const a=actors[role],p=beats[index].from;
        a.visual.rotation.y=Math.atan2(-(p[0]-a.root.position.x),-(p[2]-a.root.position.z));
      }
      actors.mother.joint('v9_shoulderR').rotation.x=index===2?-.45:0;
      actors.mother.joint('v9_elbowR').rotation.x=index===2?-.7:0;
    }
    const overlay=document.createElement('section');overlay.id='v12Prologue';overlay.hidden=true;
    overlay.setAttribute('aria-label','افتتاحية يوم جديد');overlay.innerHTML='<div class="story-eyelids"></div><div class="story-top"><span>القاهرة · بدري على الإنجازات</span><button id="storyPace" type="button">قراءة على مهلك</button><button id="storyMute" type="button">كتم صوت الكتابة</button><button id="v12Skip" type="button">تخطي المقدمة</button></div><div class="story-caption" dir="rtl"><div id="storySpeaker"></div><p id="storyText" aria-hidden="true"></p><p id="storyAccessible" class="story-sr" aria-live="polite"></p><div class="story-bottom"><span id="storyCount"></span><button id="storyNext" type="button">إظهار الكلام كاملًا</button></div></div>';
    document.body.appendChild(overlay);
    const style=document.createElement('style');style.textContent=`
      #v12Prologue[hidden]{display:none!important}#v12Prologue.active{display:block;position:fixed;inset:0;z-index:90;color:#fff;background:linear-gradient(0deg,rgba(12,10,8,.70),transparent 65%);font-family:Tahoma,Arial,sans-serif}
      .story-top{position:absolute;top:max(16px,env(safe-area-inset-top));left:18px;right:18px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;direction:rtl;font-size:12px}.story-top span{margin-left:auto;text-shadow:0 2px 4px #000}
      #v12Prologue button{color:#fff;background:#30291ee8;border:1px solid #a68b62;border-radius:9px;padding:10px 14px;font:700 13px Tahoma;cursor:pointer}#v12Skip{display:inline-block!important}
      .story-caption{position:absolute;right:5%;left:5%;bottom:max(24px,env(safe-area-inset-bottom));max-width:720px;margin:auto;background:rgba(27,23,17,.94);border:1px solid #88734e;border-radius:16px;padding:20px 24px;box-sizing:border-box}#storySpeaker{color:#f0c875;font-weight:700;font-size:15px}#storyText{font-size:clamp(17px,2.6vw,23px);line-height:1.7;min-height:3.4em;margin:10px 0 14px;letter-spacing:normal;overflow-wrap:break-word}.story-bottom{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#d0c4af}.story-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
      .story-eyelids{position:absolute;inset:0;background:#080706;pointer-events:none;animation:storyWake 1.7s ease-out forwards}@keyframes storyWake{0%{opacity:1}35%{opacity:.8}60%{opacity:.15}75%{opacity:.65}100%{opacity:0}}@media(prefers-reduced-motion:reduce){.story-eyelids{animation:none;opacity:0}}@media(max-width:500px){.story-caption{padding:15px 17px;right:12px;left:12px}.story-top{left:12px;right:12px;gap:6px}.story-top span{width:100%}#v12Prologue button{padding:9px 11px}}
    `;document.head.appendChild(style);
    const status=window.__V12_PROLOGUE={ready:true,played:false,running:false,startsAtHome:true,version:'11.20',beat:0,typed:0,starts:0};
    let gameCamera,introCamera,observer,timer,bypass=false,manual=false,index=0,letters=[],shown=0,beatStarted=0,fullyTypedAt=0,pausedAt=0;
    const text=document.getElementById('storyText'),next=document.getElementById('storyNext');
    function stopTimer(){clearInterval(timer);timer=null;}
    function writeBeat(){
      const beat=beats[index];stopTimer();poseActors();introCamera.position.set(...beat.from);introCamera.setTarget(new B.Vector3(...beat.look));shown=0;fullyTypedAt=0;beatStarted=performance.now();
      letters=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ar',{granularity:'grapheme'}).segment(beat.line)].map(s=>s.segment):Array.from(beat.line);
      text.textContent='';document.getElementById('storySpeaker').textContent=beat.who;
      document.getElementById('storyAccessible').textContent=beat.who+': '+beat.line;
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
      scene.activeCamera=gameCamera;introCamera.dispose();introCamera=null;actors.hero.root.setEnabled(false);gameCamera.detachControl();
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
      introCamera=new B.FreeCamera('egyptWakeCamera',new B.Vector3(...beats[0].from),scene);introCamera.minZ=.05;introCamera.fov=.95;scene.activeCamera=introCamera;
      overlay.hidden=false;overlay.classList.add('active');writeBeat();next.focus();
      observer=scene.onBeforeRenderObservable.add(()=>{
        const beat=beats[index];
        introCamera.position.set(...beat.from);introCamera.setTarget(new B.Vector3(...beat.look));scene.activeCamera=introCamera;
        const speaker=index===2?actors.mother:actors.hero;speaker.joint('v9_spine').rotation.z=Math.sin(performance.now()*.002)*.014;
      });
    },true);
  }};
})();
