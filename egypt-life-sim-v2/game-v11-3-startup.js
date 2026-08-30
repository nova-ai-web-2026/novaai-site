(() => {
  'use strict';
  const body=document.body,menu=document.getElementById('menu');
  body.classList.add('menu-open');
  if(menu){menu.dataset.startupGuard='true';menu.style.visibility='visible';menu.style.opacity='1';}
  const release=()=>{body.classList.remove('menu-open');body.classList.add('game-running');if(menu)menu.dataset.startupGuard='released';};
  document.getElementById('newGameBtn')?.addEventListener('click',release,true);
  document.getElementById('continueBtn')?.addEventListener('click',release,true);
  window.__V113_STARTUP={version:'11.3',menuGuard:true,hudHiddenUntilStart:true};
})();