(() => {
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  async function boot(){
    for(let i=0;i<200;i++){
      const scene=window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0];
      if(scene&&window.__V9_PATCH?.version===9){
        const ankles=scene.transformNodes.filter(n=>/^v9_ankle[LR]_\d+$/.test(n.name));
        if(ankles.length!==56)throw new Error(`Expected 56 V9 ankles, got ${ankles.length}`);
        const LIMIT=.44;
        scene.onBeforeRenderObservable.add(()=>{
          for(const ankle of ankles){
            ankle.rotation.x=clamp(ankle.rotation.x,-LIMIT,LIMIT);
          }
        });
        window.__V9_GAITFIX={version:1,ankles:ankles.length,ankleLimit:LIMIT,naturalAnkleRange:true};
        if(window.__egyptDebug)window.__egyptDebug.v9GaitFixState=()=>({...window.__V9_GAITFIX});
        return;
      }
      await sleep(50);
    }
    throw new Error('V9 rig did not finish before gait fix');
  }

  boot().catch(err=>{
    console.error('V9 gait fix failed',err);
    const box=document.getElementById('errorBox');
    if(box){box.style.display='block';box.textContent='V9 gait fix failed: '+err.message;}
  });
})();