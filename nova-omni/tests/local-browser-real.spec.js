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
 });
 page.on('dialog',dialog=>dialog.accept());
 const response=await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
 expect(response.status()).toBe(200);
 await expect(page.locator('#profile')).toHaveValue('balanced');
 await expect(page.locator('#introOverlay')).toBeVisible();
 await expect(page.locator('#introWarmStatus')).toContainText('الخلفية');
 await expect(page.locator('#state')).toContainText('ready',{timeout:240000});
 await page.locator('#introEnter').click();
 await expect(page.locator('#introOverlay')).toBeHidden();
 await page.locator('#language').selectOption('ar-eg');
 await page.locator('#prompt').fill('قول صباح الخير بالمصري في جملة قصيرة.');
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai')).toHaveCount(1,{timeout:110000});
 const result=(await page.locator('.bubble.ai > div').last().innerText()).trim().slice(0,300);
 console.log('BROWSER_QWEN3_REAL_MODEL: balanced');
 console.log('REAL_BROWSER_ARABIC_RESPONSE:',result);
 console.log('REAL_BROWSER_HF_MODEL_NETWORK_REQUESTS:',modelUrls.length);
 expect(result.length).toBeGreaterThan(2);
 expect(failures).toEqual([]);
});
