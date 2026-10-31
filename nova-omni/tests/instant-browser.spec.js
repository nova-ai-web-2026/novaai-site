const {test,expect}=require('@playwright/test');
const BASE=process.env.NOVA_SITE_URL||'https://nova-ai-web-2026.github.io/novaai-site/nova-omni/';
test.use({browserName:'chromium',trace:'retain-on-failure',screenshot:'only-on-failure'});

test('first click opens instant tools without starting downloads or a model',async({page})=>{
 await page.addInitScript(()=>{
  window.__workers=0;
  window.Worker=class{constructor(){window.__workers++;}postMessage(){}terminate(){}};
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#introOverlay')).toBeVisible();
 await expect(page.locator('#introInstant')).toBeVisible();
 await page.locator('#introInstant').click();
 await expect(page.locator('#introOverlay')).toBeHidden();
 expect(await page.evaluate(()=>window.__workers)).toBe(0);
 await expect(page.locator('#quickStartAi')).toBeEnabled();
 await page.locator('[data-task="code_fast"]').click();
 await expect(page.locator('#taskMode')).toHaveValue('code_fast');
 await expect(page.locator('#send')).toBeEnabled();
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai')).toContainText('def calculate');
 expect(await page.evaluate(()=>window.__workers)).toBe(0);
});

test('writing email template works while no model or online API is configured',async({page})=>{
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#introInstant').click();
 await page.locator('#taskMode').selectOption('write_fast');
 await page.locator('#prompt').fill('اكتب إيميل عن متابعة طلب التوظيف');
 await expect(page.locator('#send')).toBeEnabled();
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai')).toContainText('متابعة طلب التوظيف');
 await expect(page.locator('.bubble.ai')).toContainText('بدون نموذج AI');
 await expect(page.locator('#prompt')).toHaveValue('');
});

test('explicit research fetches real named sources and renders clickable safe links',async({page})=>{
 let sourceRequests=0;
 await page.route('**/w/api.php?**',route=>{
  sourceRequests++;
  expect(route.request().url()).toContain('origin=');
  return route.fulfill({status:200,contentType:'application/json',
   headers:{'access-control-allow-origin':'*'},
   body:JSON.stringify({query:{search:[{pageid:741,title:'طاقة شمسية',snippet:'ألواح <b>الطاقة الشمسية</b> تحول الضوء إلى كهرباء.'}]}})});
 });
 await page.route('https://api.crossref.org/works?**',route=>{
  sourceRequests++;
  return route.fulfill({status:200,contentType:'application/json',
   headers:{'access-control-allow-origin':'*'},
   body:JSON.stringify({message:{items:[{DOI:'10.5555/solar.paper',title:['Solar research paper'],
    published:{'date-parts':[[2025]]},'container-title':['Energy Review']}]}})});
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#introInstant').click();
 expect(sourceRequests).toBe(0);
 await page.locator('#taskMode').selectOption('research');
 await page.locator('#prompt').fill('ابحث عن الطاقة الشمسية');
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai')).toContainText('نتائج بحث فعلية',{timeout:15000});
 await expect(page.locator('.instantLink')).toHaveCount(2);
 const links=await page.locator('.instantLink').evaluateAll(anchors=>anchors.map(x=>x.href));
 expect(links).toEqual(['https://ar.wikipedia.org/?curid=741','https://doi.org/10.5555/solar.paper']);
 expect(sourceRequests).toBe(2);
});

test('external source snippets do not become executable HTML',async({page})=>{
 await page.route('**/w/api.php?**',route=>route.fulfill({
  status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
  body:JSON.stringify({query:{search:[{pageid:24,title:'Safe search',
   snippet:'Testing <img src=x onerror="window.__injected=1"> and text.'}]}})
 }));
 await page.route('https://api.crossref.org/works?**',route=>route.fulfill({
  status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
  body:JSON.stringify({message:{items:[]}})
 }));
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#introInstant').click();
 await page.locator('#taskMode').selectOption('research');
 await page.locator('#prompt').fill('Research safe search test');
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai')).toContainText('Safe search');
 expect(await page.evaluate(()=>window.__injected||false)).toBe(false);
 await expect(page.locator('.bubble.ai img')).toHaveCount(0);
});

test('manual mobile AI start asks consent and research remains usable',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'connection',{configurable:true,value:{type:'cellular',saveData:false,effectiveType:'4g'}});
  window.__started=0;
  window.Worker=class{
   constructor(){this.onmessage=null;window.__started++;}
   postMessage(data){
    if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',device:'wasm'}}));
   }
   terminate(){}
  };
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#introInstant').click();
 expect(await page.evaluate(()=>window.__started)).toBe(0);
 page.on('dialog',async d=>d.accept());
 await page.locator('#quickStartAi').click();
 await expect(page.locator('#statusLabel')).toHaveText('جاهز');
 expect(await page.evaluate(()=>window.__started)).toBe(1);
});
