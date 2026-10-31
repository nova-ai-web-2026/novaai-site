const {test,expect}=require('@playwright/test');
const BASE='https://nova-ai-web-2026.github.io/novaai-site/nova-omni/local.html';
test.use({browserName:'chromium'});
test('real Qwen3 Balanced model loads in Chromium and responds without AI Gateway',async({page})=>{
 test.setTimeout(320000);
 const failures=[];
 const modelUrls=[];
 page.on('request',r=>{
  if(r.url().includes('ai-gateway.vercel.sh'))failures.push('An API Gateway call was made unexpectedly');
  if(r.url().includes('huggingface.co/')&&modelUrls.length<8)modelUrls.push(r.url().slice(0,150));
 });
 page.on('pageerror',e=>failures.push('Page error '+e.message));
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'connection',{configurable:true,value:{type:'wifi',saveData:false,effectiveType:'4g'}});
  localStorage.setItem('nova_local_profile','balanced');
 });
 page.on('dialog',dialog=>dialog.accept());
 const response=await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
 expect(response.status()).toBe(200);
 await expect(page.locator('#profile')).toHaveValue('balanced');
 await expect(page.locator('#introOverlay')).toBeVisible();
 // Fresh visitors must approve the download before the first model request.
 expect(modelUrls.length).toBe(0);
 await expect(page.locator('#progress')).toBeHidden();
 await page.locator('#introEnter').click();
 await expect(page.locator('#introOverlay')).toBeHidden();
 await expect(page.locator('#statusLabel')).toContainText('جاهز',{timeout:240000});
 await page.locator('#language').selectOption('ar-eg');
 await page.locator('#prompt').fill('قول صباح الخير بالمصري في جملة قصيرة.');
 await page.locator('#send').click();
 // The typing indicator is also a .bubble.ai; never confuse it with an AI response.
 await expect(page.locator('#typingIndicator')).toBeVisible({timeout:12000});
 await expect(page.locator('#typingIndicator')).toHaveCount(0,{timeout:120000});
 await expect(page.locator('.bubble.ai')).toHaveCount(1,{timeout:12000});
 const result=(await page.locator('.bubble.ai > div:not(.messageActions)').first().innerText()).trim().slice(0,300);
 expect(result).not.toContain('جاري تجهيز الرد');
 expect(result).not.toContain('نسخ الرد');
 console.log('BROWSER_QWEN3_REAL_MODEL: balanced');
 console.log('REAL_BROWSER_ARABIC_RESPONSE:',result);
 console.log('REAL_BROWSER_HF_MODEL_NETWORK_REQUESTS:',modelUrls.length);
 expect(result.length).toBeGreaterThan(2);
 expect(failures).toEqual([]);
});


test('real Fast Qwen2.5 local model can generate a simple Arabic response on CPU',async({page})=>{
 test.setTimeout(340000);
 const gatewayCalls=[];
 page.on('request',request=>{if(request.url().includes('ai-gateway.vercel.sh'))gatewayCalls.push(request.url());});
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'connection',{configurable:true,value:{type:'cellular',saveData:false,effectiveType:'4g'}});
  Object.defineProperty(navigator,'userAgent',{configurable:true,get:()=> 'Mozilla/5.0 (Linux; Android 16) Mobile Chrome/141'});
  localStorage.removeItem('nova_local_profile');
 });
 const res=await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
 expect(res.status()).toBe(200);
 await expect(page.locator('#profile')).toHaveValue('fast');
 await expect(page.locator('#introOverlay')).toBeVisible();
 await page.locator('#introEnter').click();
 await expect(page.locator('#introOverlay')).toBeHidden();
 await expect(page.locator('#statusLabel')).toHaveText('جاهز',{timeout:240000});
 await page.locator('#language').selectOption('ar-eg');
 await page.locator('#taskMode').selectOption('explain');
 await page.locator('#prompt').fill('اشرح لي الشمس في جملة واحدة بسيطة.');
 await page.locator('#send').click();
 await expect(page.locator('#typingIndicator')).toBeVisible({timeout:12000});
 await expect(page.locator('#typingIndicator')).toHaveCount(0,{timeout:110000});
 const text=(await page.locator('.bubble.ai > div:not(.messageActions)').last().innerText()).trim();
 expect(text.length).toBeGreaterThan(4);
 expect(text).not.toContain('نسخ الرد');
 expect(text).not.toContain('جاري تجهيز الرد');
 expect(gatewayCalls).toHaveLength(0);
 console.log('REAL_FAST_MODEL_RESPONSE:',text.slice(0,320));
});
