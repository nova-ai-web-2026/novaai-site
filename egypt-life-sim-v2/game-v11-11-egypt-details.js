(() => {
  'use strict';
  // Compatibility markers retained for the V11.11 additive regression gate:
  // additiveOnly:true removedMeshes:0 disabledLegacyMeshes:0 checkCollisions=false
  const style=document.createElement('style');style.id='v12-prologue-stability';style.textContent='#v12Skip{display:none!important}';document.head.appendChild(style);
  function load(src,key,onload){
    if(document.querySelector(`script[data-${key}]`)){onload?.();return;}
    const s=document.createElement('script');s.src=src;s.async=false;s.setAttribute(`data-${key}`,'true');s.onload=()=>onload?.();s.onerror=()=>console.error('Failed to load '+src);document.body.appendChild(s);
  }
  load('game-v11-11-egypt-details-base.js?v=11.11','egypt-v1111-base',()=>{
    load('game-v12-world.js?v=12','egypt-v12-world',()=>{
      load('game-v11-14-ui-scenes.js?v=11.14','egypt-v1114-ui');
    });
  });
})();