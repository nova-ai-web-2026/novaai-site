(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const status = $('bootStatus');
  const fatal = $('fatalError');
  const fatalText = $('fatalErrorText');
  const retry = $('fatalRetry');

  const showFatal = message => {
    window.__SHWARE3_BOOT_FAILED = true;
    if (status) status.textContent = 'حصلت مشكلة أثناء تشغيل اللعبة.';
    if (fatalText) fatalText.textContent = message;
    if (fatal) fatal.hidden = false;
  };

  if (retry) retry.addEventListener('click', () => location.reload());

  window.addEventListener('error', event => {
    if (!window.__SHWARE3_READY && event?.message) showFatal(`خطأ في التشغيل: ${event.message}`);
  });
  window.addEventListener('unhandledrejection', event => {
    if (!window.__SHWARE3_READY) showFatal(`خطأ في التشغيل: ${event?.reason?.message || String(event?.reason || 'خطأ غير معروف')}`);
  });

  const sources = [
    'https://cdn.babylonjs.com/babylon.js',
    'https://cdn.jsdelivr.net/npm/babylonjs/babylon.js',
    'https://unpkg.com/babylonjs/babylon.js'
  ];

  const loadEngine = index => {
    if (window.BABYLON?.Engine) return launchGame(`cached-${index}`);
    if (index >= sources.length) {
      showFatal('تعذر تحميل محرك الرسوم. جرّب فتح الرابط في Chrome أو تأكد إن الاتصال بالإنترنت مش بيمنع ملفات المحرك.');
      return;
    }
    if (status) status.textContent = `جاري تحميل محرك اللعبة… (${index + 1}/${sources.length})`;
    const script = document.createElement('script');
    script.src = sources[index];
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      if (window.BABYLON?.Engine) launchGame(sources[index]);
      else loadEngine(index + 1);
    };
    script.onerror = () => loadEngine(index + 1);
    document.head.appendChild(script);
  };

  const launchGame = engineSource => {
    if (window.__SHWARE3_MODULE_LOADING) return;
    window.__SHWARE3_MODULE_LOADING = true;
    window.__SHWARE3_ENGINE_SOURCE = engineSource;
    if (status) status.textContent = 'جاري تجهيز الحارة…';
    const module = document.createElement('script');
    module.type = 'module';
    module.src = `./src/game.js?v=mobile-recovery-1`;
    module.onerror = () => showFatal('ملفات اللعبة اتحملت ناقصة. اعمل إعادة تحميل للصفحة.');
    document.body.appendChild(module);
  };

  loadEngine(0);
})();
