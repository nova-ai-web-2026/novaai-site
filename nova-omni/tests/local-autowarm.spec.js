const {test,expect}=require('@playwright/test');
const BASE=process.env.NOVA_SITE_URL||'https://nova-ai-web-2026.github.io/novaai-site/nova-omni/';
test.use({browserName:'chromium',trace:'retain-on-failure',screenshot:'only-on-failure'});

test('new desktop visitor sees greeting while the local AI warms once in the background',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'connection',{configurable:true,value:{type:'wifi',saveData:false,effectiveType:'4g'}});
  window.__novaStarts=[];
  class MockWorker{
   constructor(url,options){
    window.__novaStarts.push({kind:'constructor',url:String(url),type:options.type});
    this.onmessage=null;
   }
   postMessage(data){
    window.__novaStarts.push(data);
    if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',device:'webgpu',profile:data.profile}}));
   }
   terminate(){window.__novaStarts.push({kind:'terminated'});}
  }
  window.Worker=MockWorker;
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#introOverlay')).toBeVisible();
 await expect(page.locator('#introEnter')).toBeVisible();
 await expect(page.locator('#introWarmStatus')).toContainText(/الخلفية|جاهز/);
 await expect(page.locator('#statusLabel')).toContainText('جاهز',{timeout:12000});
 const starts=await page.evaluate(()=>window.__novaStarts);
 expect(starts.filter(s=>s.type==='init')).toHaveLength(1);
 expect(starts.filter(s=>s.kind==='constructor')).toHaveLength(1);
 await page.locator('#introEnter').click();
 await expect(page.locator('#introOverlay')).toBeHidden();
 await expect(page.locator('#statusLabel')).toContainText('جاهز');
});
test('on mobile cellular data no model is downloaded without an explicit agreement',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'connection',{configurable:true,value:{type:'cellular',saveData:false,effectiveType:'4g'}});
  Object.defineProperty(navigator,'userAgent',{configurable:true,get:()=> 'Mozilla/5.0 (Linux; Android 16) Mobile Chrome/141'});
  window.__novaStarts=[];
  class MockWorker{
   constructor(){window.__novaStarts.push({kind:'constructor'});this.onmessage=null;}
   postMessage(data){
    window.__novaStarts.push(data);
    if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',device:'wasm'}}));
   }
   terminate(){}
  }
  window.Worker=MockWorker;
 });
 await page.setViewportSize({width:390,height:844});
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#introOverlay')).toBeVisible();
 await expect(page.locator('#introWarmStatus')).toContainText('موافقتك');
 expect(await page.evaluate(()=>window.__novaStarts.length)).toBe(0);
 page.once('dialog',dialog=>dialog.dismiss());
 await page.locator('#introEnter').click();
 await expect(page.locator('#introOverlay')).toBeHidden();
 expect(await page.evaluate(()=>window.__novaStarts.length)).toBe(0);
 await expect(page.locator('#notice')).toContainText('التحميل ما بدأش');
 await page.locator('#toggleSettings').click();
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#start').click();
 await expect(page.locator('#statusLabel')).toContainText('جاهز');
 expect((await page.evaluate(()=>window.__novaStarts)).filter(x=>x.type==='init')).toHaveLength(1);
});
test('Save-Data blocks automatic model downloading and skip preserves visitor choice',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'connection',{configurable:true,value:{type:'wifi',saveData:true,effectiveType:'4g'}});
  window.__workerCreated=0;
  window.Worker=class {constructor(){window.__workerCreated++;}postMessage(){}terminate(){}};
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#introWarmStatus')).toContainText('موافقتك');
 await expect(page.locator('#introOverlay')).toBeVisible();
 expect(await page.evaluate(()=>window.__workerCreated)).toBe(0);
 await page.locator('#introSkip').click();
 expect(await page.evaluate(()=>window.__workerCreated)).toBe(0);
 await expect(page.locator('#introOverlay')).toBeHidden();
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('#introOverlay')).toBeHidden();
 expect(await page.evaluate(()=>window.__workerCreated)).toBe(0);
});
test('welcome skip cancels in-flight automatic download, and it stays stopped',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'connection',{configurable:true,value:{type:'wifi',saveData:false,effectiveType:'4g'}});
  window.__workerStats={starts:0,terminated:0};
  window.Worker=class{
   constructor(){window.__workerStats.starts++;}
   postMessage(){}
   terminate(){window.__workerStats.terminated++;}
  };
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#statusLabel')).toContainText('بيتحمّل',{timeout:10000});
 await page.locator('#introSkip').click();
 await expect(page.locator('#introOverlay')).toBeHidden();
 expect(await page.evaluate(()=>window.__workerStats)).toEqual({starts:1,terminated:1});
 await page.reload({waitUntil:'domcontentloaded'});
 expect(await page.evaluate(()=>window.__workerStats.starts)).toBe(0);
});
test('first question is queued during background warmup and answered when AI is ready',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'connection',{configurable:true,value:{type:'wifi',saveData:false,effectiveType:'4g'}});
  window.__novaRequests=[];
  class MockWorker{
   constructor(){window.__novaMock=this;this.onmessage=null;}
   postMessage(data){
    window.__novaRequests.push(data);
    if(data.type==='generate')queueMicrotask(()=>this.onmessage({data:{type:'answer',answer:'أهلًا! اتجهزت ودي إجابتي.',contextMessages:1}}));
   }
   terminate(){}
  }
  window.Worker=MockWorker;
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#statusLabel')).toContainText('بيتحمّل',{timeout:10000});
 await page.locator('#introEnter').click();
 await page.locator('#prompt').fill('أهلاً يا NOVA');
 await expect(page.locator('#send')).toBeEnabled();
 await page.locator('#send').click();
 await expect(page.locator('#notice')).toContainText('سؤالك محفوظ');
 await page.evaluate(()=>window.__novaMock.onmessage({data:{type:'ready',device:'webgpu',profile:'balanced'}}));
 await expect(page.locator('.bubble.ai')).toContainText('اتجهزت');
 const requests=await page.evaluate(()=>window.__novaRequests);
 expect(requests.filter(x=>x.type==='generate')).toHaveLength(1);
 expect(requests.find(x=>x.type==='generate').history.at(-1).content).toBe('أهلاً يا NOVA');
 await expect(page.locator('#prompt')).toHaveValue('');
});
test('mobile unknown connection does not use large amounts of data silently',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:false,effectiveType:'4g'}});
  Object.defineProperty(navigator,'userAgent',{configurable:true,get:()=> 'Mozilla/5.0 (Linux; Android) Chrome Mobile'});
  window.__modelRequests=0;
  window.Worker=class{constructor(){window.__modelRequests++;}postMessage(){}terminate(){}};
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#introWarmStatus')).toContainText('موافقتك');
 expect(await page.evaluate(()=>window.__modelRequests)).toBe(0);
});
