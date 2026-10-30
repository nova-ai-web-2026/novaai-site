const {test,expect}=require('@playwright/test');
const BASE=process.env.NOVA_SITE_URL||'https://nova-ai-web-2026.github.io/novaai-site/nova-omni/';
test.use({browserName:'chromium',trace:'retain-on-failure',screenshot:'only-on-failure'});
const start=async page=>{
 const r=await page.goto(BASE+'?preview=1',{waitUntil:'domcontentloaded',timeout:40000});
 expect(r,'Site should return HTTP 200').toBeTruthy();
 expect(r.status(),'Site should be reachable').toBe(200);
 await expect(page).toHaveTitle(/NOVA OMNI/);
};
test('Public Pages link opens the secured Vercel site',async({page})=>{
 await page.route('https://nova-omni-ai-2026.vercel.app/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<!DOCTYPE html><title>Vercel AI Site</title>'}));
 await page.goto(BASE,{waitUntil:'load'});
 await expect(page).toHaveURL('https://nova-omni-ai-2026.vercel.app/');
});
test('SSO-authenticated chat does not require a second website password',async({page})=>{
 let calls=0;
 await page.route('https://sso.example.com/api/omni**',route=>{
  const action=new URL(route.request().url()).searchParams.get('action');
  const data=action==='health'?{ok:true,app:'NOVA OMNI',ai:true,secured:true,authMode:'vercel-sso',version:'1.3.0'}:{ok:true,answer:'Authenticated test reply',model:'test-provider',reviewed:false};
  if(action==='chat')calls++;
  return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(data)});
 });
 await start(page);await page.locator('[data-page="settingsPage"]').click();
 await page.locator('#backendUrl').fill('https://sso.example.com/api/omni');
 await page.locator('#saveBackend').click();
 await page.locator('[data-page="chatPage"]').click();
 await expect(page.locator('#connectionNotice')).toBeHidden();
 await page.locator('#prompt').fill('SSO login test');await page.locator('#send').click();
 await expect(page.locator('.msg.ai .msgText')).toHaveText('Authenticated test reply');
 expect(calls).toBe(1);
});
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
 await expect(page.locator('#connectionNotice')).toContainText('AI chat is offline');
 await page.locator('#prompt').fill('Hello from browser smoke test');
 await page.locator('#prompt').press('Enter');
 await expect(page.locator('#connectionNotice')).toContainText('Message not sent');
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
  if(action==='health')return route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify({ok:true,app:'NOVA OMNI',version:'1.2.0',ai:true,secured:true,github:false,slack:false})});
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

test('API returns HTML instead of JSON: draft is preserved and no fake AI answer',async({page})=>{
 await page.route('https://failing.example.com/api/omni**',async route=>{
  const action=new URL(route.request().url()).searchParams.get('action');
  if(action==='health')return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:true,app:'NOVA OMNI',ai:true,secured:true})});
  return route.fulfill({status:200,contentType:'text/html',headers:{'access-control-allow-origin':'*'},body:'<!doctype html><title>Not an API</title>'});
 });
 await start(page);await page.locator('[data-page="settingsPage"]').click();
 await page.locator('#backendUrl').fill('https://failing.example.com/api/omni');
 await page.locator('#saveBackend').click();
 await page.locator('#key').fill('test-key');await page.locator('#saveKey').click();
 await page.locator('[data-page="chatPage"]').click();
 await expect(page.locator('#connectionNotice')).toBeHidden();
 await page.locator('#prompt').fill('Preserve this draft');await page.locator('#send').click();
 await expect(page.locator('#connectionNotice')).toContainText('HTML/text instead of JSON');
 await expect(page.locator('#prompt')).toHaveValue('Preserve this draft');
 await expect(page.locator('.msg')).toHaveCount(0);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('nova_chats')||'[]').length)).toBe(0);
});
test('invalid access key: clear 401 and no fake conversation',async({page})=>{
 await page.route('https://unauthorized.example.com/api/omni**',async route=>{
  const action=new URL(route.request().url()).searchParams.get('action');
  if(action==='health')return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:true,app:'NOVA OMNI',ai:true,secured:true})});
  return route.fulfill({status:401,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:false,error:'Access denied'})});
 });
 await start(page);await page.locator('[data-page="settingsPage"]').click();
 await page.locator('#backendUrl').fill('https://unauthorized.example.com/api/omni');
 await page.locator('#saveBackend').click();
 await page.locator('#key').fill('wrong');await page.locator('#saveKey').click();
 await page.locator('[data-page="chatPage"]').click();
 await page.locator('#prompt').fill('Key test');await page.locator('#send').click();
 await expect(page.locator('#connectionNotice')).toContainText('access key rejected');
 await expect(page.locator('#prompt')).toHaveValue('Key test');
 await expect(page.locator('.msg')).toHaveCount(0);
});
test('unknown service health cannot enable AI chat',async({page})=>{
 await page.route('https://pretend.example.com/api/omni**',async route=>{
  return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:true,ai:true,secured:true})});
 });
 await start(page);await page.locator('[data-page="settingsPage"]').click();
 await page.locator('#backendUrl').fill('https://pretend.example.com/api/omni');
 await page.locator('#saveBackend').click();
 await page.locator('[data-page="chatPage"]').click();
 await expect(page.locator('#connectionNotice')).toContainText('AI chat is unavailable');
 await page.locator('#prompt').fill('still offline');await page.locator('#send').click();
 await expect(page.locator('.msg')).toHaveCount(0);
});
test('chat failure in an existing conversation leaves prior messages unchanged',async({page})=>{
 let calls=0;
 await page.route('https://sometimes.example.com/api/omni**',async route=>{
  const action=new URL(route.request().url()).searchParams.get('action');
  if(action==='health')return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:true,app:'NOVA OMNI',ai:true,secured:true})});
  calls++;
  if(calls===1)return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:true,answer:'First response',model:'test-model'})});
  return route.fulfill({status:503,contentType:'text/html',headers:{'access-control-allow-origin':'*'},body:'Temporarily unavailable'});
 });
 await start(page);await page.locator('[data-page="settingsPage"]').click();
 await page.locator('#backendUrl').fill('https://sometimes.example.com/api/omni');await page.locator('#saveBackend').click();
 await page.locator('#key').fill('secret');await page.locator('#saveKey').click();
 await page.locator('[data-page="chatPage"]').click();
 await page.locator('#prompt').fill('Initial question');await page.locator('#send').click();
 await expect(page.locator('.msg.ai .msgText')).toHaveText('First response');
 await page.locator('#prompt').fill('Second question');await page.locator('#send').click();
 await expect(page.locator('#connectionNotice')).toContainText('Message not sent');
 await expect(page.locator('#prompt')).toHaveValue('Second question');
 await expect(page.locator('.msg')).toHaveCount(2);
 await expect(page.locator('.msg.ai .msgText')).toHaveText('First response');
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
