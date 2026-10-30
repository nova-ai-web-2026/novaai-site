const {test,expect}=require('@playwright/test');
const BASE=process.env.NOVA_SITE_URL||'https://nova-ai-web-2026.github.io/novaai-site/nova-omni/';
test.use({browserName:'chromium',trace:'retain-on-failure',screenshot:'only-on-failure'});
const start=async page=>{
 const r=await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:40000});
 expect(r,'Site should return HTTP 200').toBeTruthy();
 expect(r.status(),'Site should be reachable').toBe(200);
 await expect(page).toHaveTitle(/NOVA OMNI/);
};
test('live page loads and all navigation tabs work',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await start(page);
 await expect(page.locator('#hero')).toBeVisible();
 await expect(page.locator('#status')).toContainText(/online|setup|Static preview|pending/i);
 for(const [pageId,description] of [['toolsPage','Tools'],['testPage','Test'],['settingsPage','Settings'],['chatPage','AI Chat']]){
  await page.locator('[data-page="'+pageId+'"]').click();
  await expect(page.locator('#'+pageId)).toBeVisible();
 }
 expect(errors).toEqual([]);
});
test('live calculator computes and rejects unsafe code',async({page})=>{
 await start(page);await page.locator('[data-page="toolsPage"]').click();
 await page.locator('#expression').fill('sqrt(144)+2^3');
 await page.locator('#calc').click();
 await expect(page.locator('#calcOut')).toContainText('20');
 await page.locator('#expression').fill('constructor(123)');
 await page.locator('#calc').click();
 await expect(page.locator('#calcOut')).toContainText(/invalid function|invalid number|invalid/i);
});
test('live test laboratory runs local checks',async({page})=>{
 await start(page);await page.locator('[data-page="testPage"]').click();
 await page.locator('#test').click();
 await expect(page.locator('#testOut')).toContainText('8/8');
 await expect(page.locator('#testOut')).toContainText('No Grok comparison performed');
});
test('chat does not send a message when no AI backend is connected',async({page})=>{
 await start(page);
 await expect(page.locator('#connectionNotice')).toContainText('AI chat is unavailable');
 await page.locator('#prompt').fill('Hello from browser smoke test');
 await page.locator('#prompt').press('Enter');
 await expect(page.locator('#connectionNotice')).toContainText('Your message has not been sent');
 await expect(page.locator('.msg')).toHaveCount(0);
 await expect(page.locator('#prompt')).toHaveValue('Hello from browser smoke test');
});
test('saving and clearing the API endpoint shows honest connection state',async({page})=>{
 await start(page);await page.locator('[data-page="settingsPage"]').click();
 await page.locator('#backendUrl').fill('https://api-demo.example.com/api/omni');
 await page.locator('#saveBackend').click();
 await expect(page.locator('#backendOut')).toContainText('api-demo.example.com/api/omni');
 expect(await page.evaluate(()=>localStorage.getItem('nova_backend_url'))).toBe('https://api-demo.example.com/api/omni');
 await page.locator('#backendUrl').fill('http://untrusted.example/api/omni');
 await page.locator('#saveBackend').click();
 await expect(page.locator('#backendOut')).toContainText('Use HTTPS');
 await page.locator('#resetBackend').click();
 expect(await page.evaluate(()=>localStorage.getItem('nova_backend_url'))).toBeNull();
});
test('connected backend can receive authenticated model requests (simulated transport only)',async({page})=>{
 let chatCalls=0;
 await page.route('https://trusted.example.com/api/omni**',async route=>{
  const url=new URL(route.request().url()),action=url.searchParams.get('action');
  if(action==='health')return route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify({ok:true,version:'1.0.0',ai:true,secured:true,github:false,slack:false})});
  if(action==='chat'){
   chatCalls++;
   expect(route.request().headers()['x-nova-key']).toBe('secret-test');
   expect(route.request().postDataJSON().messages.at(-1).content).toBe('Hello from connected mode');
   return route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify({ok:true,answer:'This is a simulated model response',model:'test-double',reviewed:false})});
  }
  return route.fulfill({status:404,body:'not found'});
 });
 await start(page);await page.locator('[data-page="settingsPage"]').click();
 await page.locator('#backendUrl').fill('https://trusted.example.com/api/omni');
 await page.locator('#saveBackend').click();
 await page.locator('#key').fill('secret-test');await page.locator('#saveKey').click();
 await page.locator('[data-page="chatPage"]').click();
 await expect(page.locator('#connectionNotice')).toBeHidden();
 await page.locator('#prompt').fill('Hello from connected mode');await page.locator('#send').click();
 await expect(page.locator('.msg.ai .msgText')).toHaveText('This is a simulated model response');
 expect(chatCalls).toBe(1);
});
test('GitHub public read falls back to real external API transport',async({page})=>{
 await page.route('https://api.github.com/repos/octocat/Hello-World',async route=>{
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({full_name:'octocat/Hello-World',description:'Public test repo',stargazers_count:42,open_issues_count:7,html_url:'https://github.com/octocat/Hello-World'})});
 });
 await start(page);await page.locator('[data-page="toolsPage"]').click();
 await page.locator('#repo').fill('octocat/Hello-World');await page.locator('#inspect').click();
 await expect(page.locator('#githubOut')).toContainText('42 stars',{timeout:15000});
 await page.locator('#repo').fill('https://evil.example/a');await page.locator('#inspect').click();
 await expect(page.locator('#githubOut')).toContainText('Use owner/repo',{timeout:15000});
});
test('settings key controls are interactive and session-only',async({page})=>{
 await start(page);await page.locator('[data-page="settingsPage"]').click();
 await page.locator('#key').fill('temporary-test-key');
 await page.locator('#saveKey').click();
 await expect(page.locator('#keyOut')).toContainText('saved');
 const value=await page.evaluate(()=>sessionStorage.getItem('nova_key'));
 expect(value).toBe('temporary-test-key');
 await page.locator('#clearKey').click();
 expect(await page.evaluate(()=>sessionStorage.getItem('nova_key'))).toBeNull();
});
for(const viewport of [{width:320,height:780},{width:390,height:844},{width:768,height:900},{width:1440,height:900}]){
 test('responsive layout '+viewport.width+'px without horizontal overflow',async({page})=>{
  await page.setViewportSize(viewport);await start(page);
  for(const tab of ['chatPage','toolsPage','testPage','settingsPage']){
   await page.locator('[data-page="'+tab+'"]').click();
   const result=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
   expect(result.scroll,'Horizontal overflow on '+tab+': '+JSON.stringify(result)).toBeLessThanOrEqual(result.viewport+2);
  }
 });
}
