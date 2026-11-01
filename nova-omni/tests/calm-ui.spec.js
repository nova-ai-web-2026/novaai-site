const {test,expect}=require('@playwright/test');
const BASE=process.env.NOVA_SITE_URL||'https://nova-ai-web-2026.github.io/novaai-site/nova-omni/';
test.use({browserName:'chromium',trace:'retain-on-failure',screenshot:'only-on-failure'});

test('calmer welcome is truthful, readable and never triggers an unapproved model download',async({page})=>{
 await page.addInitScript(()=>{
  window.__workers=0;
  window.Worker=class{constructor(){window.__workers++;}postMessage(){}terminate(){}};
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#introOverlay')).toBeVisible();
 await expect(page.locator('.introData')).toContainText('مئات الميجابايت');
 await expect(page.locator('#introEnter')).toContainText('تنزيل كبير');
 expect(await page.evaluate(()=>window.__workers)).toBe(0);
 await page.locator('#introInstant').click();
 await expect(page.locator('#introOverlay')).toBeHidden();
 await expect(page.locator('#notice')).toBeHidden();
 await expect(page.locator('#instantStatus')).toHaveText('الأدوات متاحة');
 await expect(page.locator('#quickStartAi')).toHaveText('تشغيل المساعد');
 expect(await page.evaluate(()=>window.__workers)).toBe(0);
 const metrics=await page.evaluate(()=>({
  cssLoaded:[...document.styleSheets].some(sheet=>sheet.href?.includes('local-polish.css')),
  bannerHeight:document.querySelector('#instantBanner').getBoundingClientRect().height,
  composerRadius:getComputedStyle(document.querySelector('.composerBox')).borderRadius,
  shortStatus:document.querySelector('#instantStatus').innerText,
  hero:document.querySelector('.welcome h1').innerText
 }));
 expect(metrics.cssLoaded).toBe(true);
 expect(metrics.bannerHeight).toBeLessThanOrEqual(65);
 expect(metrics.composerRadius).toBe('17px');
 expect(metrics.shortStatus).not.toContain('الخلفية');
 expect(metrics.hero).toContain('فكرتك تبدأ هنا');
});

test('approved Wi-Fi startup is quiet, accurately marked as preparing, then ready',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('nova_local_download_consent_v1','granted');
  Object.defineProperty(navigator,'connection',{configurable:true,
   value:{type:'wifi',saveData:false,effectiveType:'4g'}});
  window.__workers=0;
  window.Worker=class{
   constructor(){window.__workers++;window.__worker=this;this.onmessage=null;}
   postMessage(){}
   terminate(){}
  };
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#introOverlay')).toBeHidden();
 await expect.poll(()=>page.evaluate(()=>window.__workers)).toBe(1);
 await expect(page.locator('#instantStatus')).toHaveText('نوفا بيستعد');
 await expect(page.locator('#statusLabel')).toHaveText('NOVA Local');
 await expect(page.locator('#notice')).toBeHidden();
 await expect(page.locator('#modelStatusDetails')).toContainText('قيد التحضير');
 await expect(page.locator('#progress')).toBeHidden();
 const before=await page.evaluate(()=>document.querySelector('#instantStatus').firstChild);
 await page.evaluate(()=>{
   window.__worker.onmessage({data:{type:'status',text:'Downloading files 44%'}});
   window.__worker.onmessage({data:{type:'progress',progress:44,file:'large-model.onnx'}});
 });
 expect(await page.evaluate(node=>document.querySelector('#instantStatus').firstChild===node,before)).toBe(true);
 await expect(page.locator('#instantStatus')).toHaveText('نوفا بيستعد');
 expect(await page.locator('body').innerText()).not.toContain('Downloading files 44%');
 await page.evaluate(()=>window.__worker.onmessage({data:{type:'ready',device:'wasm'}}));
 await expect(page.locator('#instantStatus')).toHaveText('المساعد جاهز');
 await expect(page.locator('#statusLabel')).toHaveText('جاهز');
 await expect(page.locator('#modelStatusDetails')).toContainText('المساعد المحلي جاهز');
});

test('approved mobile data avoids auto-download without a noisy banner; manual choice still asks consent',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{
  localStorage.setItem('nova_local_download_consent_v1','granted');
  Object.defineProperty(navigator,'connection',{configurable:true,
   value:{type:'cellular',saveData:false,effectiveType:'4g'}});
  Object.defineProperty(navigator,'userAgent',{configurable:true,get:()=> 'Mozilla/5.0 (Linux; Android 16) Mobile Chrome/141'});
  window.__workers=0;
  window.Worker=class{
   constructor(){window.__workers++;window.__worker=this;this.onmessage=null;}
   postMessage(){}
   terminate(){}
  };
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#introOverlay')).toBeHidden();
 expect(await page.evaluate(()=>window.__workers)).toBe(0);
 await expect(page.locator('#notice')).toBeHidden();
 await expect(page.locator('#instantStatus')).toHaveText('الأدوات متاحة');
 await expect(page.locator('#statusNote')).toContainText('بيانات الموبايل');
 await expect(page.locator('#modelStatusDetails')).toContainText('التشغيل التلقائي متوقف');
 let confirms=0;
 page.on('dialog',async dialog=>{confirms++;await dialog.dismiss();});
 await page.locator('#quickStartAi').click();
 expect(confirms).toBe(1);
 expect(await page.evaluate(()=>window.__workers)).toBe(0);
 page.removeAllListeners('dialog');
 page.on('dialog',async dialog=>{confirms++;await dialog.accept();});
 await page.locator('#quickStartAi').click();
 await expect.poll(()=>page.evaluate(()=>window.__workers)).toBe(1);
 expect(confirms).toBe(2);
 await expect(page.locator('#instantStatus')).toHaveText('نوفا بيستعد');
});
for(const width of [320,390,768,1440]){
 test('polished '+width+'px viewport has readable hierarchy, compact status and no horizontal overflow',async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
  if(await page.locator('#introOverlay').isVisible())await page.locator('#introInstant').click();
  const metrics=await page.evaluate(()=>({
   viewport:innerWidth,
   doc:document.documentElement.scrollWidth,
   hero:parseFloat(getComputedStyle(document.querySelector('.welcome h1')).fontSize),
   card:parseFloat(getComputedStyle(document.querySelector('.suggestion strong')).fontSize),
   select:parseFloat(getComputedStyle(document.querySelector('#taskMode')).fontSize),
   footer:document.querySelector('#instantBanner').getBoundingClientRect().height,
   bannerRight:document.querySelector('#instantBanner').getBoundingClientRect().right,
   teaserVisible:document.querySelector('#browseTemplatesWelcome').getClientRects().length>0
  }));
  expect(metrics.doc).toBeLessThanOrEqual(metrics.viewport+2);
  expect(metrics.hero).toBeGreaterThanOrEqual(26);
  expect(metrics.card).toBeGreaterThanOrEqual(12);
  expect(metrics.select).toBeGreaterThanOrEqual(11.5);
  expect(metrics.footer).toBeLessThanOrEqual(65);
  expect(metrics.bannerRight).toBeLessThanOrEqual(metrics.viewport+1);
  expect(metrics.teaserVisible).toBe(true);
  await page.locator('#openTemplatesTop').click();
  await expect(page.locator('.templateCard')).toHaveCount(44);
  await page.locator('#closeTemplates').click();
 });
}
test('reduced-motion visitors see a static loading cue rather than pulsing animation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(()=>{
  window.Worker=class{postMessage(){}terminate(){}};
 });
 page.on('dialog',async dialog=>dialog.accept());
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#introEnter').click();
 await expect(page.locator('#instantStatus')).toHaveText('نوفا بيستعد');
 const animation=await page.locator('.instantBanner .quietPulse').evaluate(el=>getComputedStyle(el).animationName);
 expect(animation).toBe('none');
});
