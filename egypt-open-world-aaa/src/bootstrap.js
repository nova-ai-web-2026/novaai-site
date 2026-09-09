(() => {
  'use strict';
  const BUILD='v32-visual-motion-polish-1';
  const GAME_BUILD='v32-controls-direction-1';
  const GROUND_BUILD='v33-ground-contact-1';
  const $ = id => document.getElementById(id),status=$('bootStatus'),fatal=$('fatalError'),fatalText=$('fatalErrorText'),retry=$('fatalRetry');
  const bootButtons=['newGame','continueGame','howTo'].map($).filter(Boolean);for(const button of bootButtons)button.disabled=true;
  const showFatal=message=>{window.__SHWARE3_BOOT_FAILED=true;if(status)status.textContent='حصلت مشكلة أثناء تشغيل اللعبة.';if(fatalText)fatalText.textContent=message;if(fatal)fatal.hidden=false;for(const button of bootButtons)button.disabled=true;};
  if(retry)retry.addEventListener('click',()=>location.reload());
  window.addEventListener('error',event=>{if(!window.__SHWARE3_READY&&event?.message)showFatal(`خطأ في التشغيل: ${event.message}`);});
  window.addEventListener('unhandledrejection',event=>{if(!window.__SHWARE3_READY)showFatal(`خطأ في التشغيل: ${event?.reason?.message||String(event?.reason||'خطأ غير معروف')}`);});
  const sources=[`./vendor/babylon.js?v=${BUILD}`,'https://cdn.babylonjs.com/babylon.js','https://cdn.jsdelivr.net/npm/babylonjs/babylon.js','https://unpkg.com/babylonjs/babylon.js'];
  const launchGame=engineSource=>{
    if(window.__SHWARE3_MODULE_LOADING)return;window.__SHWARE3_MODULE_LOADING=true;window.__SHWARE3_ENGINE_SOURCE=engineSource;if(status)status.textContent='جاري تجهيز شوارع النور V3.3…';
    const module=document.createElement('script');module.type='module';module.src=`./src/game.js?v=${GAME_BUILD}`;module.onerror=()=>showFatal('ملفات اللعبة اتحملت ناقصة. اعمل إعادة تحميل للصفحة.');document.body.appendChild(module);
    const polish=document.createElement('script');polish.type='module';polish.src=`./src/v32-polish.js?v=${BUILD}`;polish.onerror=()=>console.error('تعذر تحميل تحسينات V3.2');document.body.appendChild(polish);
    const grounding=document.createElement('script');grounding.type='module';grounding.src=`./src/v33-grounding.js?v=${GROUND_BUILD}`;grounding.onerror=()=>showFatal('تعذر تحميل نظام تلامس القدم مع الأرض.');document.body.appendChild(grounding);
  };
  const loadEngine=index=>{if(window.BABYLON?.Engine)return launchGame(`cached-${index}`);if(index>=sources.length){showFatal('تعذر تحميل محرك الرسوم. جرّب إعادة تحميل الصفحة أو فتح الرابط في Chrome.');return;}if(status)status.textContent=index===0?'جاري تحميل محرك اللعبة من نفس السيرفر…':`جاري تجربة مصدر احتياطي… (${index}/${sources.length-1})`;const script=document.createElement('script');script.src=sources[index];script.async=true;if(sources[index].startsWith('http'))script.crossOrigin='anonymous';script.onload=()=>{if(window.BABYLON?.Engine)launchGame(sources[index]);else loadEngine(index+1);};script.onerror=()=>loadEngine(index+1);document.head.appendChild(script);};
  loadEngine(0);
})();