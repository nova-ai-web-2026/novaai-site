const {test,expect}=require('@playwright/test');
const BASE=process.env.NOVA_SITE_URL||'https://nova-ai-web-2026.github.io/novaai-site/nova-omni/';
test.use({browserName:'chromium',trace:'retain-on-failure',screenshot:'only-on-failure'});

test('first visit presents premium welcome and never downloads before the visitor clicks Start',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'connection',{configurable:true,value:{type:'wifi',saveData:false,effectiveType:'4g'}});
  window.__created=0;window.__messages=[];
  window.Worker=class {
   constructor(){window.__created++;this.onmessage=null;}
   postMessage(data){window.__messages.push(data);if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',device:'webgpu',profile:data.profile}}));}
   terminate(){}
  };
 });
 let dialogs=0;
 page.on('dialog',async d=>{dialogs++;await d.dismiss();});
 const result=await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 expect(result.status()).toBe(200);
 await expect(page.locator('#introOverlay')).toBeVisible();
 await expect(page.locator('#introTitle')).toContainText('أهلاً بيك في');
 await expect(page.locator('.introData')).toContainText('مئات الميجابايت');
 await expect(page.locator('.introData')).toContainText('بالضغط');
 expect(await page.evaluate(()=>window.__created)).toBe(0);
 expect(dialogs).toBe(0);
 await page.locator('#introEnter').click();
 await expect(page.locator('#introOverlay')).toBeHidden();
 await expect(page.locator('#statusLabel')).toHaveText('جاهز');
 expect(await page.evaluate(()=>window.__created)).toBe(1);
 const messages=await page.evaluate(()=>window.__messages);
 expect(messages.filter(x=>x.type==='init')).toHaveLength(1);
 expect(await page.evaluate(()=>localStorage.getItem('nova_local_download_consent_v1'))).toBe('granted');
 expect(dialogs).toBe(0);
 await expect(page.locator('#progress')).toBeHidden();
});
test('after initial approval, revisiting on Wi-Fi quietly starts one worker without showing welcome',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'connection',{configurable:true,value:{type:'wifi',saveData:false,effectiveType:'4g'}});
  window.__created=0;
  window.Worker=class {
   constructor(){window.__created++;this.onmessage=null;}
   postMessage(data){if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',device:'wasm'}}));}
   terminate(){}
  };
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#introEnter').click();
 await expect(page.locator('#statusLabel')).toContainText('جاهز');
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('#introOverlay')).toBeHidden();
 await expect(page.locator('#statusLabel')).toContainText('جاهز',{timeout:8000});
 expect(await page.evaluate(()=>window.__created)).toBe(1);
 await expect(page.locator('#progress')).toBeHidden();
});
test('one welcome click explicitly authorizes downloading over cellular without extra dialogs',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'connection',{configurable:true,value:{type:'cellular',saveData:false,effectiveType:'4g'}});
  Object.defineProperty(navigator,'userAgent',{configurable:true,get:()=> 'Mozilla/5.0 (Linux; Android 16) Mobile Chrome/141'});
  window.__created=0;
  window.Worker=class{
   constructor(){window.__created++;this.onmessage=null;}
   postMessage(data){if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',device:'wasm'}}));}
   terminate(){}
  };
 });
 await page.setViewportSize({width:390,height:844});
 let dialogs=0;page.on('dialog',async d=>{dialogs++;await d.dismiss();});
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#introOverlay')).toBeVisible();
 expect(await page.evaluate(()=>window.__created)).toBe(0);
 await page.locator('#introEnter').click();
 await expect(page.locator('#introOverlay')).toBeHidden();
 await expect(page.locator('#statusLabel')).toHaveText('جاهز');
 expect(await page.evaluate(()=>window.__created)).toBe(1);
 expect(dialogs).toBe(0);
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('#introOverlay')).toBeHidden();
 expect(await page.evaluate(()=>window.__created)).toBe(0); // no automatic cellular redownload
});
test('Save-Data users can explicitly opt in once but are never auto-downloaded after reload',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'connection',{configurable:true,value:{type:'wifi',saveData:true,effectiveType:'4g'}});
  window.__created=0;
  window.Worker=class{
   constructor(){window.__created++;this.onmessage=null;}
   postMessage(data){if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',device:'wasm'}}));}
   terminate(){}
  };
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 expect(await page.evaluate(()=>window.__created)).toBe(0);
 await page.locator('#introEnter').click();
 await expect(page.locator('#statusLabel')).toHaveText('جاهز');
 expect(await page.evaluate(()=>window.__created)).toBe(1);
 await page.reload({waitUntil:'domcontentloaded'});
 expect(await page.evaluate(()=>window.__created)).toBe(0);
});
test('skip stores a true opt-out and never starts downloads or asks for camera/location access',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'connection',{configurable:true,value:{type:'wifi',saveData:false,effectiveType:'4g'}});
  window.__created=0;
  window.Worker=class {constructor(){window.__created++;}postMessage(){}terminate(){}};
 });
 let dialogs=0;page.on('dialog',async d=>{dialogs++;await d.dismiss();});
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#introSkip').click();
 await expect(page.locator('#introOverlay')).toBeHidden();
 expect(await page.evaluate(()=>window.__created)).toBe(0);
 expect(await page.evaluate(()=>localStorage.getItem('nova_local_download_consent_v1'))).toBe('declined');
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('#introOverlay')).toBeHidden();
 expect(await page.evaluate(()=>window.__created)).toBe(0);
 expect(dialogs).toBe(0);
});
test('question typed before model readiness is queued exactly once after consent and then answered',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'connection',{configurable:true,value:{type:'wifi',saveData:false,effectiveType:'4g'}});
  window.__events=[];
  window.Worker=class{
   constructor(){window.__worker=this;this.onmessage=null;}
   postMessage(data){
    window.__events.push(data);
    if(data.type==='generate')queueMicrotask(()=>this.onmessage({data:{type:'answer',answer:'أهلاً! دي إجابتي المحلية.',contextMessages:1}}));
   }
   terminate(){}
  };
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#introEnter').click();
 await page.locator('#prompt').fill('اشرحلي نظرية بسيطة');
 await expect(page.locator('#send')).toBeEnabled();
 await page.locator('#send').click();
 await expect(page.locator('#notice')).toContainText('وصل سؤالك');
 await expect(page.locator('#prompt')).toHaveValue('اشرحلي نظرية بسيطة');
 expect((await page.evaluate(()=>window.__events)).filter(x=>x.type==='generate')).toHaveLength(0);
 await page.evaluate(()=>window.__worker.onmessage({data:{type:'ready',device:'webgpu'}}));
 await expect(page.locator('.bubble.ai')).toContainText('إجابتي المحلية');
 const calls=await page.evaluate(()=>window.__events.filter(x=>x.type==='generate'));
 expect(calls).toHaveLength(1);
 expect(calls[0].history.at(-1).content).toBe('اشرحلي نظرية بسيطة');
 await expect(page.locator('#prompt')).toHaveValue('');
});
test('workspace never shows download bars or percentages while worker prepares',async({page})=>{
 await page.addInitScript(()=>{
  window.Worker=class{
   constructor(){window.__worker=this;}
   postMessage(){}
   terminate(){}
  };
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#introEnter').click();
 await page.evaluate(()=>{
  window.__worker.onmessage({data:{type:'progress',file:'model.onnx',progress:55}});
  window.__worker.onmessage({data:{type:'status',text:'Downloading weights 55%'}});
 });
 await expect(page.locator('#introOverlay')).toBeHidden();
 await expect(page.locator('#progress')).toBeHidden();
 await expect(page.locator('#statusLabel')).toHaveText('NOVA Local');
 const dimensions=await page.evaluate(()=>{
  const el=document.getElementById('state');
  const css=getComputedStyle(el.parentElement);
  return {width:el.parentElement.getBoundingClientRect().width,overflow:css.overflow,text:document.body.innerText};
 });
 expect(dimensions.width).toBeLessThanOrEqual(1);
 expect(dimensions.overflow).toBe('hidden');
 expect(dimensions.text).not.toContain('55%');
 expect(dimensions.text).not.toContain('Downloading weights');
});
test('stop cancels the selected model and withdraws future auto-start consent',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'connection',{configurable:true,value:{type:'wifi',saveData:false,effectiveType:'4g'}});
  window.__stats={created:0,stopped:0};
  window.Worker=class{
   constructor(){window.__stats.created++;this.onmessage=null;}
   postMessage(data){if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',device:'wasm'}}));}
   terminate(){window.__stats.stopped++;}
  };
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#introEnter').click();
 await expect(page.locator('#statusLabel')).toHaveText('جاهز');
 await page.locator('#stop').click();
 expect(await page.evaluate(()=>localStorage.getItem('nova_local_download_consent_v1'))).toBe('declined');
 expect(await page.evaluate(()=>window.__stats.stopped)).toBe(1);
 await page.reload({waitUntil:'domcontentloaded'});
 expect(await page.evaluate(()=>window.__stats.created)).toBe(0);
 await expect(page.locator('#introOverlay')).toBeHidden();
});
test('old intro_seen flag cannot bypass new explicit model consent',async({page})=>{
 await page.addInitScript(()=>{
  sessionStorage.setItem('nova_intro_seen','1');
  sessionStorage.removeItem('nova_no_autowarm');
  localStorage.removeItem('nova_local_download_consent_v1');
  window.__created=0;
  window.Worker=class{constructor(){window.__created++;}postMessage(){}terminate(){}};
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#introOverlay')).toBeVisible();
 expect(await page.evaluate(()=>window.__created)).toBe(0);
});

test('new welcome is readable and usable on a compact 320px mobile display',async({page})=>{
 await page.setViewportSize({width:320,height:568});
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'connection',{configurable:true,value:{type:'cellular',saveData:true,effectiveType:'4g'}});
  window.__workerCount=0;
  window.Worker=class{constructor(){window.__workerCount++;}postMessage(){}terminate(){}};
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#introOverlay')).toBeVisible();
 await expect(page.locator('#introTitle')).toContainText('NOVA');
 await page.locator('#introEnter').scrollIntoViewIfNeeded();
 await expect(page.locator('#introEnter')).toBeInViewport();
 const dimensions=await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth,button:document.querySelector('#introEnter').getBoundingClientRect().width}));
 expect(dimensions.document).toBeLessThanOrEqual(dimensions.width+2);
 expect(dimensions.button).toBeGreaterThan(220);
 expect(await page.evaluate(()=>window.__workerCount)).toBe(0);
});
