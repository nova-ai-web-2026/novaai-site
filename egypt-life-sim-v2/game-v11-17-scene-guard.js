(() => {
  'use strict';

  const canvas=document.getElementById('game');
  const menu=document.getElementById('menu');
  let armed=false,lastStart=null,repairs=0;

  const getScene=()=>window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0]||null;
  const getEngine=()=>window.BABYLON?.Engine?.LastCreatedEngine||null;
  const isMenuHidden=()=>!menu||getComputedStyle(menu).display==='none'||getComputedStyle(menu).visibility==='hidden';

  function playerCamera(scene){
    if(!scene)return null;
    return scene.cameras?.find(c=>c&&c.name==='player'&&!c.isDisposed?.())
      ||scene.cameras?.find(c=>c&&c.name!=='v1116PreviewCamera'&&!c.isDisposed?.())
      ||null;
  }

  function publish(extra={}){
    const scene=getScene(),engine=getEngine(),cam=scene?.activeCamera||null;
    window.__V1117_SCENE={
      version:'11.17',armed,startId:lastStart,repairs,
      engine:!!engine,scene:!!scene,meshes:scene?.meshes?.length||0,
      cameras:scene?.cameras?.length||0,activeCamera:cam?.name||null,
      menuHidden:isMenuHidden(),gameStarted:document.body.classList.contains('game-started'),
      canvasVisible:!!canvas&&getComputedStyle(canvas).display!=='none'&&getComputedStyle(canvas).visibility!=='hidden'&&getComputedStyle(canvas).opacity!=='0',
      renderWidth:engine?.getRenderWidth?.()||0,renderHeight:engine?.getRenderHeight?.()||0,
      ...extra
    };
  }

  function repair(reason){
    try{
      const engine=getEngine(),scene=getScene();
      if(!engine||!scene)return publish({reason,waiting:true});
      const gameplay=playerCamera(scene);
      const active=scene.activeCamera;
      if(gameplay&&(!active||active.name==='v1116PreviewCamera'||active.isDisposed?.()))scene.activeCamera=gameplay;
      if(canvas){
        canvas.style.display='block';canvas.style.visibility='visible';canvas.style.opacity='1';
        canvas.style.position='fixed';canvas.style.inset='0';canvas.style.width='100%';canvas.style.height='100%';
      }
      engine.resize?.();
      if(scene.activeCamera&&canvas&&isMenuHidden()){
        try{scene.activeCamera.attachControl?.(canvas,true);}catch(_){}
      }
      repairs++;
      publish({reason,waiting:false,playerCamera:gameplay?.name||null});
    }catch(err){
      console.error('V11.17 scene repair failed',err);
      publish({reason,error:String(err)});
    }
  }

  function armStart(id){
    armed=true;lastStart=id;publish({phase:'gesture'});
    for(const delay of [0,40,100,220,450,800,1400])setTimeout(()=>repair('start-'+delay),delay);
  }

  for(const id of ['newGameBtn','continueBtn']){
    const el=document.getElementById(id);if(!el)continue;
    el.addEventListener('pointerdown',()=>armStart(id),{capture:true});
    el.addEventListener('touchstart',()=>armStart(id),{capture:true,passive:true});
    el.addEventListener('click',()=>armStart(id),{capture:false});
  }

  const observer=new MutationObserver(()=>{
    if(armed&&isMenuHidden())repair('menu-hidden');
  });
  if(menu)observer.observe(menu,{attributes:true,attributeFilter:['style','class','hidden']});

  const poll=setInterval(()=>{
    if(!armed)return;
    if(isMenuHidden())repair('watchdog');
    if(repairs>10){clearInterval(poll);observer.disconnect();}
  },180);

  window.__egyptDebug=window.__egyptDebug||{};
  window.__egyptDebug.v1117SceneState=()=>({...window.__V1117_SCENE});
  publish({phase:'installed'});
  window.addEventListener('beforeunload',()=>{clearInterval(poll);observer.disconnect();},{once:true});
})();
