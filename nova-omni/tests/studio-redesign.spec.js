const {test,expect}=require('@playwright/test');
const BASE=process.env.NOVA_SITE_URL||'https://nova-ai-web-2026.github.io/novaai-site/nova-omni/';
test.use({browserName:'chromium',trace:'retain-on-failure',screenshot:'only-on-failure'});

async function enter(page){
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 if(await page.locator('#introOverlay').isVisible())
  await page.locator('#introInstant').click();
 await expect(page.locator('#introOverlay')).toBeHidden();
}
test('focused studio keeps six approved shortcuts but shows only three initially',async({page})=>{
 await page.addInitScript(()=>{
  window.__workers=0;
  window.Worker=class{constructor(){window.__workers++}postMessage(){}terminate(){}};
 });
 await enter(page);
 await expect(page.locator('.studioHero h1')).toContainText('فكرتك تبدأ هنا');
 await expect(page.locator('.studioToolsTop h2')).toHaveText('اختار اللي عايز تعمله');
 await expect(page.locator('.studioTools .suggestion')).toHaveCount(6);
 await expect(page.locator('#studioModes [aria-pressed="true"]')).toHaveCount(1);
 await expect(page.locator('#studioModes [data-studio-mode="all"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.studioTools .suggestion').first()).toHaveAttribute('data-task','research');
 await expect(page.locator('#studioToolsCounter')).toContainText('3 من 6');
 await expect(page.locator('.studioTools .suggestion:not([hidden])')).toHaveCount(3);
 await expect(page.locator('#studioShowMore')).toHaveAttribute('aria-expanded','false');
 await expect(page.locator('#studioStartWriting')).toBeEnabled();
 await expect(page.locator('#browseTemplatesWelcome')).toBeEnabled();
 expect(await page.evaluate(()=>window.__workers)).toBe(0);
 expect(await page.evaluate(()=>window.NovaStudio.getMode())).toBe('all');
 await expect(page.locator('#instantStatus')).toHaveText('الأدوات متاحة');
});
test('writing studio mode gives working editable email and job templates without AI',async({page})=>{
 await enter(page);
 await page.locator('#studioModes [data-studio-mode="writing"]').click();
 await expect(page.locator('#studioModes [data-studio-mode="writing"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.studioTools .suggestion:not([hidden])')).toHaveCount(3);
 await expect(page.locator('.studioTools .suggestion').first()).toContainText('إيميل رسمي');
 await page.locator('.studioTools .suggestion').first().click();
 await expect(page.locator('#taskMode')).toHaveValue('write_fast');
 await expect(page.locator('#prompt')).toHaveValue(/إيميل رسمي/);
 expect(await page.evaluate(()=>window.NovaSelectedTemplateId)).toBe('email_formal');
 await page.locator('#prompt').fill('عايز إيميل عن متابعة طلبي للشركة');
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai')).toContainText('الموضوع:');
 await expect(page.locator('.bubble.ai')).toContainText('متابعة طلبي');
 await expect(page.locator('#prompt')).toHaveValue('');
 expect(await page.evaluate(()=>window.NovaSelectedTemplateId)).toBe(null);
});
test('code and study mode cards run different real bundled templates',async({page})=>{
 await enter(page);
 await page.locator('#studioModes [data-studio-mode="code"]').click();
 await expect(page.locator('.studioTools .suggestion:not([hidden])')).toHaveCount(3);
 await page.locator('#studioShowMore').click();
 await expect(page.locator('.studioTools .suggestion:not([hidden])')).toHaveCount(6);
 await expect(page.locator('.studioTools .suggestion').nth(4)).toContainText('زر الوضع الليلي');
 await page.locator('.studioTools .suggestion').nth(4).click();
 await expect(page.locator('#taskMode')).toHaveValue('code_fast');
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai')).toContainText('localStorage.setItem');
 await page.locator('#newChat').click();
 await page.locator('#studioModes [data-studio-mode="study"]').click();
 await expect(page.locator('.studioTools .suggestion:not([hidden])')).toHaveCount(3);
 await page.locator('#studioShowMore').click();
 await expect(page.locator('.studioTools .suggestion:not([hidden])')).toHaveCount(5);
 await expect(page.locator('.studioTools .suggestion[hidden]')).toHaveCount(1);
 await page.locator('.studioTools .suggestion').first().click();
 await expect(page.locator('#taskMode')).toHaveValue('write_fast');
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai')).toContainText('الهدف الأسبوعي');
});
test('research mode shows five source-based choices, not fabricated summaries',async({page})=>{
 await page.route('**/w/api.php?**',route=>route.fulfill({
  status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
  body:JSON.stringify({query:{search:[{pageid:123,title:'مصدر تجريبي',snippet:'مقتطف من المصدر.'}]}})
 }));
 await page.route('https://api.crossref.org/works?**',route=>route.fulfill({
  status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
  body:JSON.stringify({message:{items:[]}})
 }));
 await enter(page);
 await page.locator('#studioModes [data-studio-mode="research"]').click();
 await expect(page.locator('.studioTools .suggestion:not([hidden])')).toHaveCount(3);
 await page.locator('.studioTools .suggestion').first().click();
 await expect(page.locator('#taskMode')).toHaveValue('research');
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai')).toContainText('مصدر تجريبي');
 await expect(page.locator('.instantLink')).toHaveCount(1);
});
test('hero shortcuts open existing library and writing tools instead of inert decoration',async({page})=>{
 await enter(page);
 await page.locator('#browseTemplatesWelcome').click();
 await expect(page.locator('#templateOverlay')).toBeVisible();
 await expect(page.locator('.templateCard')).toHaveCount(44);
 await page.locator('#closeTemplates').click();
 await page.locator('#studioStartWriting').click();
 await expect(page.locator('#studioModes [data-studio-mode="writing"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.studioTools .suggestion').first()).toContainText('إيميل رسمي');
 await page.locator('#studioModes [data-studio-mode="all"]').click();
 await expect(page.locator('.studioTools .suggestion').first()).toContainText('بحث بالمصادر');
 await expect(page.locator('.studioTools .suggestion').first()).toHaveAttribute('data-task','research');
});
test('keyboard template shortcut opens the existing accessible search from normal browsing',async({page})=>{
 await enter(page);
 await page.locator('.studioHero h1').click();
 await page.keyboard.press('Control+k');
 await expect(page.locator('#templateOverlay')).toBeVisible();
 await expect(page.locator('#templateSearch')).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(page.locator('#templateOverlay')).toBeHidden();
});
for(const width of [320,390,768,1440]){
 test('studio redesign at '+width+'px is legible, visibly differentiated and has zero document overflow',async({page})=>{
  await page.setViewportSize({width,height:845});
  await enter(page);
  const result=await page.evaluate(()=>({
   viewport:innerWidth,
   documentWidth:document.documentElement.scrollWidth,
   studioStyles:[...document.styleSheets].some(s=>s.href?.includes('local-studio.css')),
   hero:document.querySelector('.studioHero').getBoundingClientRect().toJSON(),
   art: getComputedStyle(document.querySelector('.studioVisual')).display,
   title:parseFloat(getComputedStyle(document.querySelector('.studioHero h1')).fontSize),
   card:parseFloat(getComputedStyle(document.querySelector('.studioTools .suggestion strong')).fontSize),
   cards:[...document.querySelectorAll('.studioTools .suggestion')].filter(x=>!x.hidden).length,
   modes:[...document.querySelectorAll('.studioModes button')].map(x=>x.getBoundingClientRect().width),
   composer:document.querySelector('.composerBox').getBoundingClientRect().toJSON()
  }));
  expect(result.studioStyles).toBe(true);
  expect(result.documentWidth).toBeLessThanOrEqual(width+2);
  expect(result.hero.width).toBeLessThanOrEqual(width);
  expect(result.hero.width).toBeGreaterThan(270);
  expect(result.hero.right).toBeLessThanOrEqual(width+2);
  expect(result.title).toBeGreaterThanOrEqual(28);
  expect(result.card).toBeGreaterThanOrEqual(12);
  expect(result.cards).toBe(3);
  expect(result.composer.right).toBeLessThanOrEqual(width+2);
  expect(result.modes.length).toBe(5);
  if(width<=730)expect(result.art).toBe('none');
  else expect(result.art).not.toBe('none');
  await page.locator('#studioModes [data-studio-mode="code"]').click();
  await expect(page.locator('.studioTools .suggestion:not([hidden])')).toHaveCount(3);
  await page.locator('#studioShowMore').click();
  await expect(page.locator('.studioTools .suggestion:not([hidden])')).toHaveCount(6);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
 });
}
test('studio keeps last chat, font settings, model consent and stored templates intact',async({page})=>{
 await enter(page);
 await page.locator('#prompt').fill('احسب ٢ + ٣؟');
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai')).toContainText('5');
 await page.locator('#increaseText').click();
 await page.locator('#openTemplatesTop').click();
 await expect(page.locator('.templateCard')).toHaveCount(44);
 await page.locator('#closeTemplates').click();
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('.bubble.ai')).toContainText('5');
 await expect(page.locator('#textSizeSetting')).toHaveValue('large');
 expect(await page.evaluate(()=>localStorage.getItem('nova_local_download_consent_v1'))).toBe('declined');
});

test('show-more and show-less reveal the same real templates without duplicate controls',async({page})=>{
 await enter(page);
 const cards=page.locator('.studioTools .suggestion');
 await expect(cards).toHaveCount(6);
 await expect(page.locator('.studioTools .suggestion:not([hidden])')).toHaveCount(3);
 await expect(page.locator('#studioShowMore')).toHaveAttribute('aria-expanded','false');
 await page.locator('#studioShowMore').click();
 await expect(page.locator('.studioTools .suggestion:not([hidden])')).toHaveCount(6);
 await expect(page.locator('#studioShowMore')).toHaveAttribute('aria-expanded','true');
 await page.locator('.studioTools .suggestion').nth(5).click();
 await expect(page.locator('#prompt')).toHaveValue(/لخص النص/);
 await page.locator('#studioShowMore').click();
 await expect(cards.filter({visible:true})).toHaveCount(3);
 await expect(page.locator('#prompt')).toHaveValue(/لخص النص/);
 await page.locator('#studioModes [data-studio-mode="study"]').click();
 await expect(cards.filter({visible:true})).toHaveCount(3);
 await expect(page.locator('#studioShowMore')).toHaveAttribute('aria-expanded','false');
});
test('all template entry points remain functional with no duplicate welcome teaser',async({page})=>{
 await enter(page);
 await expect(page.locator('.templateTeaser')).toHaveCount(0);
 await expect(page.locator('#studioOpenLibrary')).toHaveCount(0);
 await expect(page.locator('#browseTemplatesWelcome')).toBeVisible();
 await page.locator('#browseTemplatesWelcome').click();
 await expect(page.locator('#templateOverlay')).toBeVisible();
 await expect(page.locator('.templateCard')).toHaveCount(44);
 await page.locator('#closeTemplates').click();
 await page.locator('#openTemplatesTop').click();
 await expect(page.locator('#templateOverlay')).toBeVisible();
});
test('inline model status keeps manual consent choice while reducing composer rows',async({page})=>{
 await page.addInitScript(()=>{
  window.__workers=0;
  window.Worker=class{constructor(){window.__workers++;}postMessage(){}terminate(){}};
 });
 await enter(page);
 await expect(page.locator('#instantBanner')).toBeVisible();
 const metrics=await page.evaluate(()=>{
  const banner=document.querySelector('#instantBanner').getBoundingClientRect();
  const tool=document.querySelector('.composerTools').getBoundingClientRect();
  const box=document.querySelector('.composerBox').getBoundingClientRect();
  const input=document.querySelector('#prompt').getBoundingClientRect();
  return {bannerY:banner.y,toolsY:tool.y,toolsBottom:tool.bottom,boxBottom:box.bottom,inputBottom:input.bottom};
 });
 expect(metrics.bannerY).toBeGreaterThanOrEqual(metrics.toolsY-2);
 expect(metrics.toolsBottom).toBeLessThanOrEqual(metrics.boxBottom+2);
 expect(metrics.inputBottom).toBeLessThan(metrics.bannerY+6);
 await expect(page.locator('#quickStartAi')).toBeVisible();
 expect(await page.evaluate(()=>window.__workers)).toBe(0);
});
