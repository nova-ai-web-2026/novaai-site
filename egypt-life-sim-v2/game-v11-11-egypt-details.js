(() => {
  'use strict';
  function load(src,key,onload){
    if(document.querySelector(`script[data-${key}]`)){onload?.();return;}
    const s=document.createElement('script');s.src=src;s.async=false;s.setAttribute(`data-${key}`,'true');s.onload=()=>onload?.();s.onerror=()=>console.error('Failed to load '+src);document.body.appendChild(s);
  }
  load('game-v11-11-egypt-details-base.js?v=11.11','egypt-v1111-base',()=>{
    load('game-v12-world.js?v=12','egypt-v12-world');
  });
})();