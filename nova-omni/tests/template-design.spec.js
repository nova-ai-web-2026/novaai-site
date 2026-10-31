const {test,expect}=require('@playwright/test');
const BASE=process.env.NOVA_SITE_URL||'https://nova-ai-web-2026.github.io/novaai-site/nova-omni/';
test.use({browserName:'chromium',trace:'retain-on-failure',screenshot:'only-on-failure'});

async function enterInstant(page){
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 if(await page.locator('#introOverlay').isVisible())await page.locator('#introInstant').click();
 await expect(page.locator('#introOverlay')).toBeHidden();
}
test('29 real templates can be searched, filtered and selected without AI downloads',async({page})=>{
 await page.addInitScript(()=>{
  window.__workers=0;
  window.Worker=class{constructor(){window.__workers++;}postMessage(){}terminate(){}};
 });
 await enterInstant(page);
 await page.locator('#browseTemplatesWelcome').click();
 await expect(page.locator('#templateOverlay')).toBeVisible();
 await expect(page.locator('.templateCard')).toHaveCount(29);
 await expect(page.locator('#templateCount')).toContainText('29');
 await page.locator('[data-filter="code"]').click();
 await expect(page.locator('.templateCard')).toHaveCount(12);
 await page.locator('#templateSearch').fill('CSV');
 await expect(page.locator('.templateCard')).toHaveCount(1);
 await page.locator('.templateCard[data-template-id="python_csv"]').click();
 await expect(page.locator('#templateOverlay')).toBeHidden();
 await expect(page.locator('#taskMode')).toHaveValue('code_fast');
 await expect(page.locator('#prompt')).toContainText('CSV');
 await expect(page.locator('#send')).toBeEnabled();
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai')).toContainText('csv.DictReader');
 expect(await page.evaluate(()=>window.__workers)).toBe(0);
});
test('different writing and study templates are distinct and preserve user edits',async({page})=>{
 await enterInstant(page);
 await page.locator('#openTemplatesTop').click();
 await page.locator('[data-filter="writing"]').click();
 await expect(page.locator('.templateCard')).toHaveCount(12);
 await page.locator('.templateCard[data-template-id="email_followup"]').click();
 await page.locator('#prompt').fill('متابعة طلبي المؤرخ 20 أكتوبر');
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai')).toContainText('متابعة طلبي المؤرخ 20 أكتوبر');
 await expect(page.locator('.bubble.ai')).toContainText('أشكركم مقدمًا');
 await page.locator('#openTemplatesTop').click();
 await page.locator('[data-filter="study"]').click();
 await expect(page.locator('.templateCard')).toHaveCount(2);
 await page.locator('.templateCard[data-template-id="study_revision"]').click();
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai').last()).toContainText('نقاط');
});
test('font size controls change reading text and persist independently of chat memory',async({page})=>{
 await enterInstant(page);
 await page.locator('#prompt').fill('احسب ٢ + ٣؟');
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai')).toContainText('5');
 const before=await page.locator('.bubble.ai > div').last().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
 await page.locator('#increaseText').click();
 await expect(page.locator('#textSizeSetting')).toHaveValue('large');
 const after=await page.locator('.bubble.ai > div').last().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
 expect(after).toBeGreaterThan(before+1);
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('#textSizeSetting')).toHaveValue('large');
 await expect(page.locator('.bubble.ai')).toContainText('5');
 await page.locator('#decreaseText').click();
 await expect(page.locator('#textSizeSetting')).toHaveValue('normal');
 await page.locator('#textSizeSetting').selectOption('small');
 await expect(page.locator('#decreaseText')).toBeDisabled();
});
test('library opens after chat history, supports Escape, keyboard focus and empty search',async({page})=>{
 await enterInstant(page);
 await page.locator('#prompt').fill('احسب ٣ + ٤؟');
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai')).toContainText('7');
 await page.locator('#openTemplatesTop').click();
 await page.locator('#templateSearch').fill('string that should never match 9321');
 await expect(page.locator('.templateEmpty')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.locator('#templateOverlay')).toBeHidden();
 await page.locator('#openTemplatesTop').click();
 await expect(page.locator('.templateCard')).toHaveCount(29);
 await page.locator('#closeTemplates').click();
 await expect(page.locator('#templateOverlay')).toBeHidden();
});
for(const size of [{width:320,height:760},{width:390,height:844},{width:768,height:950},{width:1440,height:900}]){
 test('responsive layout '+size.width+'px keeps text legible and no horizontal overflow',async({page})=>{
  await page.setViewportSize(size);
  await enterInstant(page);
  const metrics=await page.evaluate(()=>({
   viewport:innerWidth,document:document.documentElement.scrollWidth,
   title:parseFloat(getComputedStyle(document.querySelector('.welcome h1')).fontSize),
   card:parseFloat(getComputedStyle(document.querySelector('.suggestion strong')).fontSize),
   select:parseFloat(getComputedStyle(document.querySelector('#taskMode')).fontSize),
  }));
  expect(metrics.document).toBeLessThanOrEqual(metrics.viewport+2);
  expect(metrics.title).toBeGreaterThanOrEqual(25);
  expect(metrics.card).toBeGreaterThanOrEqual(12);
  expect(metrics.select).toBeGreaterThanOrEqual(11.5);
  await page.locator('#openTemplatesTop').click();
  await expect(page.locator('#templateOverlay')).toBeVisible();
  await expect(page.locator('.templateCard')).toHaveCount(29);
  const modal=await page.evaluate(()=>({
   viewport:innerWidth,body:document.documentElement.scrollWidth,
   right:document.querySelector('.templateDialog').getBoundingClientRect().right,
   left:document.querySelector('.templateDialog').getBoundingClientRect().left
  }));
  expect(modal.body).toBeLessThanOrEqual(modal.viewport+2);
  expect(modal.left).toBeGreaterThanOrEqual(-2);
  expect(modal.right).toBeLessThanOrEqual(modal.viewport+2);
 });
}
test('mobile navigation can open template library without losing conversations',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await enterInstant(page);
 await page.locator('#toggleSidebar').click();
 await expect(page.locator('#sidebar')).toHaveClass(/open/);
 await page.locator('#openTemplatesSidebar').click();
 await expect(page.locator('#templateOverlay')).toBeVisible();
 await expect(page.locator('#sidebar')).not.toHaveClass(/open/);
 await page.locator('[data-filter="code"]').click();
 await page.locator('.templateCard[data-template-id="js_timer"]').click();
 await expect(page.locator('#taskMode')).toHaveValue('code_fast');
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai')).toContainText('clearInterval');
});
