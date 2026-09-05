(() => {
  'use strict';

  const VERSION='11.13';
  const menu=document.getElementById('menu');
  const hud=document.getElementById('hud');
  const buttons=['newGameBtn','continueBtn'];
  let menuObserver=null,checkTimer=null,spawnTimer=null,lastReason='boot',spawnRepaired=false,lastBlockedBy=null,lastSpawn=null;

  function syncCopy(){
    const kicker=document.querySelector('.kicker'),foot=document.querySelector('.menuFoot');
    if(kicker)kicker.textContent=`HAYAT MASR • V${document.documentElement.dataset.release||'11.13'}`;
    if(foot)foot.textContent=`V${document.documentElement.dataset.release||'11.18.0'} — صحوة مصرية وشخصيات وحارة بتفاصيل جديدة`;
  }

  function installStyle(){
    if(document.getElementById('v1113-hud-style'))return;
    const style=document.createElement('style');
    style.id='v1113-hud-style';
    style.textContent=`
      #hud{transition:opacity .14s ease}
      body:not(.game-started) #hud{visibility:hidden!important;opacity:0!important}
      body.game-started #hud{visibility:visible!important;opacity:1!important}
      body.game-started #hud .glass{background:rgba(19,18,16,.70);backdrop-filter:blur(6px);box-shadow:0 7px 20px rgba(0,0,0,.22)}
      @media(max-width:760px){
        #stats{width:44vw!important;gap:3px!important}
        #mission{width:min(44vw,182px)!important;top:80px!important}
        #soundToggle{width:34px!important;height:34px!important;top:61px!important}
        #mapWrap{width:76px!important;height:76px!important;bottom:140px!important}
        #joy{width:98px!important;height:98px!important;left:14px!important;bottom:18px!important}
        #knob{width:34px!important;height:34px!important;left:32px!important;top:32px!important}
        #act{width:60px!important;height:60px!important;right:16px!important;bottom:26px!important}
        #run{width:42px!important;height:42px!important;right:25px!important;bottom:96px!important}
        #toast{top:auto!important;bottom:148px!important;font-size:10px!important;max-width:56vw!important}
      }
    `;
    document.head.appendChild(style);
  }

  function menuHidden(){
    if(!menu)return true;
    const s=getComputedStyle(menu);
    return s.display==='none'||s.visibility==='hidden'||s.opacity==='0';
  }

  function pointBlocked(scene,x,z,r=.52){
    if(!scene)return null;
    for(const mesh of scene.meshes||[]){
      if(!mesh?.checkCollisions||mesh.isEnabled?.()===false||!mesh.getBoundingInfo)continue;
      try{
        mesh.computeWorldMatrix(true);
        const bb=mesh.getBoundingInfo().boundingBox,min=bb.minimumWorld,max=bb.maximumWorld;
        if(max.y<.12||min.y>2.45)continue;
        if(x+r>min.x&&x-r<max.x&&z+r>min.z&&z-r<max.z)return mesh;
      }catch(_){}
    }
    return null;
  }

  function nearestBuildingDistance(scene,x,z){
    let best=Infinity;
    for(const mesh of scene?.meshes||[]){
      if(mesh?.name!=='building'||!mesh.getBoundingInfo)continue;
      try{
        mesh.computeWorldMatrix(true);
        const bb=mesh.getBoundingInfo().boundingBox,min=bb.minimumWorld,max=bb.maximumWorld;
        const dx=Math.max(min.x-x,0,x-max.x),dz=Math.max(min.z-z,0,z-max.z);
        best=Math.min(best,Math.hypot(dx,dz));
      }catch(_){}
    }
    return Number.isFinite(best)?best:null;
  }

  function repairSpawn(reason='sync'){
    if(window.__V12_PROLOGUE?.running)return false;
    if(!document.body.classList.contains('game-started'))return false;
    const scene=window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0],cam=scene?.activeCamera;
    if(!scene||!cam)return false;
    const blocked=pointBlocked(scene,cam.position.x,cam.position.z);
    const tooClose=(nearestBuildingDistance(scene,cam.position.x,cam.position.z)??99)<.35;
    if(!blocked&&!tooClose){
      lastBlockedBy=null;lastSpawn={x:+cam.position.x.toFixed(2),z:+cam.position.z.toFixed(2),repaired:false};publish(reason);return true;
    }
    const candidates=[[-24,-24],[-24,-12],[-12,-24],[24,-24],[-24,24],[24,24],[0,-24],[-24,0],[0,24],[24,0]];
    const safe=candidates.find(([x,z])=>!pointBlocked(scene,x,z)&&((nearestBuildingDistance(scene,x,z)??99)>.8));
    if(!safe){lastBlockedBy=blocked?.name||'near-building';publish(reason);return false;}
    lastBlockedBy=blocked?.name||'near-building';
    cam.position.x=safe[0];cam.position.z=safe[1];cam.position.y=1.72;
    if(cam.rotation){cam.rotation.x=0;cam.rotation.y=0;cam.rotation.z=0;}
    spawnRepaired=true;lastSpawn={x:safe[0],z:safe[1],repaired:true,from:lastBlockedBy};
    publish(reason);return true;
  }

  function publish(reason=lastReason){
    lastReason=reason;
    const scene=window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0],cam=scene?.activeCamera;
    window.__V1113_HUD={
      version:VERSION,
      installed:true,
      compactMobileHud:true,
      safeSpawnGuard:true,
      menuHidden:menuHidden(),
      gameStarted:document.body.classList.contains('game-started'),
      hudVisibility:hud?getComputedStyle(hud).visibility:null,
      hudOpacity:hud?getComputedStyle(hud).opacity:null,
      spawnRepaired,
      lastBlockedBy,
      lastSpawn,
      camera:cam?{x:+cam.position.x.toFixed(2),y:+cam.position.y.toFixed(2),z:+cam.position.z.toFixed(2)}:null,
      reason
    };
  }

  function syncHud(reason='sync'){
    if(window.__V12_PROLOGUE?.running){document.body.classList.remove('game-started');if(hud)hud.style.visibility='hidden';return;}
    const hidden=menuHidden();
    if(hidden){
      document.body.classList.add('game-started');
      if(hud){hud.dataset.v1113Visible='true';hud.style.visibility='visible';hud.style.opacity='1';}
      clearTimeout(spawnTimer);spawnTimer=setTimeout(()=>repairSpawn(reason),60);
    }else if(!document.body.classList.contains('game-started')){
      if(hud){hud.removeAttribute('data-v1113-visible');hud.style.removeProperty('visibility');hud.style.removeProperty('opacity');}
    }
    publish(reason);
  }

  function hook(){
    installStyle();syncCopy();
    if(menu){
      menuObserver=new MutationObserver(()=>syncHud('menu-mutation'));
      menuObserver.observe(menu,{attributes:true,attributeFilter:['style','class','hidden']});
    }
    for(const id of buttons){
      const el=document.getElementById(id);if(!el)continue;
      const follow=()=>{setTimeout(()=>syncHud(id+'-0'),0);setTimeout(()=>syncHud(id+'-120'),120);setTimeout(()=>syncHud(id+'-450'),450);};
      el.addEventListener('pointerup',follow,{capture:true});
      el.addEventListener('touchend',follow,{capture:true,passive:true});
      el.addEventListener('click',follow,{capture:true});
    }
    let checks=0;
    checkTimer=setInterval(()=>{
      syncCopy();syncHud('watchdog');
      if(document.body.classList.contains('game-started')&&repairSpawn('watchdog-spawn'))checks+=3;else checks++;
      if(checks>60){clearInterval(checkTimer);checkTimer=null;}
    },180);
    syncHud('boot');
  }

  hook();
  window.__egyptDebug=window.__egyptDebug||{};
  window.__egyptDebug.v1113HudState=()=>({...window.__V1113_HUD});
  window.__egyptDebug.v1113RepairSpawn=()=>repairSpawn('debug');
  window.addEventListener('beforeunload',()=>{menuObserver?.disconnect();if(checkTimer)clearInterval(checkTimer);clearTimeout(spawnTimer);},{once:true});
})();
