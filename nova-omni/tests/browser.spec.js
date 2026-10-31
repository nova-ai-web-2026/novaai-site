const {test,expect}=require('@playwright/test');
const BASE=process.env.NOVA_SITE_URL||'https://nova-ai-web-2026.github.io/novaai-site/nova-omni/';
test.use({browserName:'chromium',trace:'retain-on-failure',screenshot:'only-on-failure'});
// Existing UI tests opt out of auto-warming to verify manual download and
// deterministic controls. Automatic warmup is tested separately on real page
// loads with a simulated Wi-Fi/mobile network.
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  sessionStorage.setItem('nova_intro_seen','1');
  sessionStorage.setItem('nova_no_autowarm','1');
  localStorage.setItem('nova_local_download_consent_v1','declined');
 });
});

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


test('language selector sends Egyptian Arabic to the AI backend and persists',async({page})=>{
 let languageSent='';
 await page.route('https://lang.example.com/api/omni**',async route=>{
  const action=new URL(route.request().url()).searchParams.get('action');
  if(action==='health')return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:true,app:'NOVA OMNI',version:'1.4.0',ai:true,secured:true,authMode:'vercel-sso',github:false,slack:false})});
  if(action==='chat'){
   languageSent=route.request().postDataJSON().language;
   return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:true,model:'mock-multilingual',answer:'أهلاً بيك يا فندم!',reviewed:false})});
  }
  return route.fulfill({status:404});
 });
 await start(page);await page.locator('[data-page="settingsPage"]').click();
 await page.locator('#backendUrl').fill('https://lang.example.com/api/omni');await page.locator('#saveBackend').click();
 await page.locator('[data-page="chatPage"]').click();
 await page.locator('#language').selectOption('ar-eg');
 await page.locator('#prompt').fill('ازيك النهارده؟');
 await page.locator('#send').click();
 await expect(page.locator('.msg.ai .msgText')).toHaveText('أهلاً بيك يا فندم!');
 expect(languageSent).toBe('ar-eg');
 expect(await page.evaluate(()=>localStorage.getItem('nova_language'))).toBe('ar-eg');
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('#language')).toHaveValue('ar-eg');
});
test('gateway connection button shows the real 403 access problem',async({page})=>{
 await page.route('https://denied.example.com/api/omni**',async route=>{
  const action=new URL(route.request().url()).searchParams.get('action');
  if(action==='health')return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:true,app:'NOVA OMNI',version:'1.4.0',ai:true,secured:true,authMode:'vercel-sso',github:false,slack:false})});
  if(action==='diagnose')return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:true,available:false,code:'gateway_access_denied',reason:'Vercel AI Gateway refused access (403). Check account permissions.'})});
  return route.fulfill({status:404});
 });
 await start(page);await page.locator('[data-page="settingsPage"]').click();
 await page.locator('#backendUrl').fill('https://denied.example.com/api/omni');await page.locator('#saveBackend').click();
 await page.locator('#testAI').click();
 await expect(page.locator('#testAIOut')).toContainText('gateway_access_denied');
 await expect(page.locator('#testAIOut')).toContainText('403');
 await page.locator('[data-page="chatPage"]').click();
 await expect(page.locator('#connectionNotice')).toContainText('403');
});
test('diagnostic button correctly reports successful Arabic model response',async({page})=>{
 await page.route('https://healthy.example.com/api/omni**',async route=>{
  const action=new URL(route.request().url()).searchParams.get('action');
  const info=action==='health'
    ?{ok:true,app:'NOVA OMNI',version:'1.4.0',ai:true,secured:true,authMode:'vercel-sso'}
    :{ok:true,available:true,model:'mock-ai',language:'ar',sample:'مرحباً!'};
  return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(info)});
 });
 await start(page);await page.locator('[data-page="settingsPage"]').click();
 await page.locator('#backendUrl').fill('https://healthy.example.com/api/omni');await page.locator('#saveBackend').click();
 await page.locator('#testAI').click();
 await expect(page.locator('#testAIOut')).toContainText('Live model request succeeded');
 await expect(page.locator('#testAIOut')).toContainText('مرحباً');
});

test('local no-key AI page loads without starting a model download',async({page})=>{
 let modelRequests=0;
 page.on('request',r=>{if(/huggingface|jsdelivr/.test(r.url()))modelRequests++;});
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page).toHaveTitle(/NOVA OMNI Local/);
 await expect(page.locator('#start')).toBeEnabled();
 await expect(page.locator('#send')).toBeDisabled();
 await expect(page.locator('#state')).toContainText('Not started');
 expect(modelRequests).toBe(0);
});
test('local AI requires consent before any worker is loaded',async({page})=>{
 page.on('dialog',dialog=>dialog.dismiss());
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#start').click();
 await expect(page.locator('#state')).toContainText('Not started');
 await expect(page.locator('#send')).toBeDisabled();
});
test('local AI mock worker responds in Egyptian Arabic without any backend requests',async({page})=>{
 let posts=[];
 await page.addInitScript(()=>{
  class MockWorker{
   constructor(){this.onmessage=null;this.onerror=null;}
   postMessage(data){
    window.__localMessages??=[];window.__localMessages.push(data);
    if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',model:'onnx-community/Qwen3-0.6B-ONNX',device:'webgpu'}}));
    if(data.type==='generate')queueMicrotask(()=>this.onmessage({data:{type:'answer',answer:'أهلاً بيك! أنا مساعد محلي مجاني.'}}));
   }
   terminate(){}
  }
  window.Worker=MockWorker;
 });
 page.on('dialog',dialog=>dialog.accept());
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#start').click();
 await expect(page.locator('#state')).toContainText('AI local ready');
 await page.locator('#language').selectOption('ar-eg');
 await page.locator('#prompt').fill('إزيك؟');
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai').last()).toContainText('أهلاً بيك');
 await expect(page.locator('#prompt')).toHaveValue('');
 const posted=await page.evaluate(()=>window.__localMessages);
 const outgoing=posted.find(x=>x.type==='generate');
 expect(outgoing.language).toBe('ar-eg');
 expect(outgoing.history.at(-1).content).toBe('إزيك؟');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('nova_omni_local_sessions_v1')||'{}'));
 expect(saved.sessions.length).toBe(1);
 expect(saved.sessions[0].messages.length).toBe(2);
 await page.locator('#clear').click();
 await expect(page.locator('.bubble')).toHaveCount(0);
});
test('local AI worker error preserves unsent draft',async({page})=>{
 await page.addInitScript(()=>{
  class MockWorker{
   postMessage(d){
    if(d.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',model:'mock',device:'wasm'}}));
    if(d.type==='generate')queueMicrotask(()=>this.onmessage({data:{type:'error',stage:'chat',message:'Model memory limit'}}));
   }
   terminate(){}
  }
  window.Worker=MockWorker;
 });
 page.on('dialog',dialog=>dialog.accept());
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#start').click();
 await expect(page.locator('#statusLabel')).toContainText('جاهز');
 await page.locator('#prompt').fill('Please preserve this text');
 await expect(page.locator('#send')).toBeEnabled();
 await page.locator('#send').click();
 await expect(page.locator('#state')).toContainText('Your draft is still here');
 await expect(page.locator('#prompt')).toHaveValue('Please preserve this text');
 await expect(page.locator('.bubble')).toHaveCount(0);
});
test('local AI page is mobile responsive and worker endpoint is served',async({page,request})=>{
 const script=await request.get(BASE+'local-ai-worker.js');
 expect(script.ok()).toBe(true);
 expect(await script.text()).toContain('onnx-community/Qwen3-0.6B-ONNX');
 await page.setViewportSize({width:360,height:780});
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 const result=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
 expect(result.scroll).toBeLessThanOrEqual(result.viewport+2);
});

test('new visitors default to Fast and balanced memory',async({page})=>{
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#profile')).toHaveValue('fast');
 await expect(page.locator('#memory')).toHaveValue('balanced');
 await expect(page.locator('#memoryInfo')).toContainText('14');
 await expect(page.locator('#memoryInfo')).toContainText('60');
});
test('local model profile and conversation memory can be changed and persist',async({page})=>{
 await page.addInitScript(()=>{
  class MockWorker{
   constructor(){this.onmessage=null;}
   postMessage(data){
    window.__profileMessages??=[];window.__profileMessages.push(data);
    if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',profile:data.profile,device:'wasm'}}));
    if(data.type==='generate')queueMicrotask(()=>this.onmessage({data:{type:'answer',answer:'Local answer',contextMessages:5}}));
   }
   terminate(){}
  }
  window.Worker=MockWorker;
 });
 page.on('dialog',dialog=>dialog.accept());
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#profile').selectOption('lite');
 await page.locator('#memory').selectOption('extended');
 await page.locator('#start').click();
 await expect(page.locator('#profile')).toBeDisabled();
 await expect(page.locator('#state')).toContainText('ready');
 await page.locator('#prompt').fill('Tell me something.');
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai')).toContainText('Local answer');
 const posted=await page.evaluate(()=>window.__profileMessages);
 expect(posted.find(x=>x.type==='init').profile).toBe('lite');
 expect(posted.find(x=>x.type==='generate').memory).toBe('extended');
 await page.locator('#stop').click();
 await expect(page.locator('#profile')).toBeEnabled();
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('#profile')).toHaveValue('lite');
 await expect(page.locator('#memory')).toHaveValue('extended');
 await expect(page.locator('#memoryInfo')).toContainText('18');
});
test('simple calculations use a verified local math parser, not AI model guessing',async({page})=>{
 await page.addInitScript(()=>{
  class MockWorker{
   postMessage(data){
    window.__modelMessageTypes??=[];window.__modelMessageTypes.push(data.type);
    if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',device:'webgpu'}}));
   }
   terminate(){}
  }
  window.Worker=MockWorker;
 });
 page.on('dialog',dialog=>dialog.accept());
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#start').click();
 await expect(page.locator('#statusLabel')).toContainText('جاهز');
 await page.locator('#prompt').fill('What is 3 + 4? Reply with the number.');
 await expect(page.locator('#send')).toBeEnabled();
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai').last()).toContainText('7');
 const messages=await page.evaluate(()=>window.__modelMessageTypes);
 expect(messages).toEqual(['init']);
 await page.locator('#prompt').fill('احسب ٣ + ٤؟');
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai').last()).toContainText('الناتج: 7');
});
test('balanced context keeps long history locally without showing old messages to the model',async({page})=>{
 await page.addInitScript(()=>{
  const stored=Array.from({length:72},(_,i)=>({role:i%2?'assistant':'user',content:'Local history entry '+i}));
  localStorage.setItem('nova_omni_local_history',JSON.stringify(stored));
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.bubble')).toHaveCount(60);
 await expect(page.locator('#memory')).toHaveValue('balanced');
 await expect(page.locator('#memoryInfo')).toContainText('14');
});


test('premium Local AI desktop layout shows navigation, welcome and settings without overflow',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 const response=await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 expect(response.status()).toBe(200);
 await expect(page.locator('.sidebar')).toBeVisible();
 await expect(page.locator('#settingsPanel')).toBeVisible();
 await expect(page.locator('.welcome h1')).toContainText('مساحتك للأفكار');
 await expect(page.locator('#memory')).toHaveValue('balanced');
 await expect(page.locator('#profile')).toHaveValue('fast');
 const dimensions=await page.evaluate(()=>({
  viewport:window.innerWidth,document:document.documentElement.scrollWidth,
  chat:document.querySelector('#chat').getBoundingClientRect().width,
  composer:document.querySelector('.composerBox').getBoundingClientRect().width
 }));
 expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport+2);
 expect(dimensions.chat).toBeGreaterThan(350);
 expect(dimensions.composer).toBeGreaterThan(350);
});
test('new premium Local AI mobile UI has accessible working model settings drawer',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#settingsPanel')).not.toBeInViewport();
 await page.locator('#toggleSettings').click();
 await expect(page.locator('#settingsPanel')).toHaveClass(/open/);
 await expect(page.locator('#settingsPanel')).toBeInViewport();
 await page.locator('#memory').selectOption('extended');
 await expect(page.locator('#memoryInfo')).toContainText('18');
 await page.locator('#closeSettings').click();
 await expect(page.locator('#settingsPanel')).not.toBeInViewport();
 await page.locator('#toggleSidebar').click();
 await expect(page.locator('#sidebar')).toHaveClass(/open/);
 await page.locator('#screenOverlay').click({position:{x:30,y:300}});
 await expect(page.locator('#sidebar')).not.toHaveClass(/open/);
 const dimensions=await page.evaluate(()=>({viewport:innerWidth,body:document.documentElement.scrollWidth}));
 expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport+2);
});
test('premium Local AI example cards populate the real composer without loading a model',async({page})=>{
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#send')).toBeDisabled();
 await page.locator('[data-prompt]').first().click();
 await expect(page.locator('#prompt')).toHaveValue('اشرح لي الذكاء الاصطناعي بطريقة بسيطة مع مثال.');
 await expect(page.locator('#send')).toBeDisabled();
});
test('premium Local AI chat retains layout and conversation after mocked model response',async({page})=>{
 await page.addInitScript(()=>{
  class MockWorker {
   postMessage(data){
    if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',device:'wasm'}}));
    if(data.type==='generate')queueMicrotask(()=>this.onmessage({data:{type:'answer',answer:'أهلاً بيك! دي إجابة محلية تجريبية.',contextMessages:1}}));
   }
   terminate(){}
  }
  window.Worker=MockWorker;
 });
 page.on('dialog',dialog=>dialog.accept());
 await page.setViewportSize({width:390,height:844});
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#toggleSettings').click();
 await page.locator('#start').click();
 await expect(page.locator('#statusLabel')).toContainText('جاهز');
 await page.locator('#prompt').fill('أهلًا!');
 await page.locator('#send').click();
 await expect(page.locator('.bubble.user')).toContainText('أهلًا!');
 await expect(page.locator('.bubble.ai')).toContainText('إجابة محلية');
 await expect(page.locator('.welcome')).toHaveCount(0);
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('.bubble')).toHaveCount(2);
 await page.locator('#toggleSidebar').click();
 await page.locator('#newChat').click();
 await expect(page.locator('.bubble')).toHaveCount(0);
 await expect(page.locator('#welcome')).toBeVisible();
});


test('new conversation preserves previous sessions and opens them from the sidebar',async({page})=>{
 await page.addInitScript(()=>{
  class MockWorker{
   postMessage(data){
    if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',device:'wasm'}}));
    if(data.type==='generate'){
     const answer='إجابة للسؤال: '+data.history.at(-1).content;
     queueMicrotask(()=>this.onmessage({data:{type:'answer',answer,contextMessages:data.history.length}}));
    }
   }
   terminate(){}
  }
  window.Worker=MockWorker;
 });
 page.on('dialog',dialog=>dialog.accept());
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#start').click();
 await expect(page.locator('#statusLabel')).toContainText('جاهز');
 await page.locator('#prompt').fill('أول محادثة محفوظة');
 await expect(page.locator('#send')).toBeEnabled();
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai')).toContainText('أول محادثة محفوظة');
 await expect(page.locator('#conversations .sessionRow')).toHaveCount(1);
 await page.locator('#newChat').click();
 await expect(page.locator('#welcome')).toBeVisible();
 await expect(page.locator('#conversations .sessionRow')).toHaveCount(1);
 await page.locator('#prompt').fill('ثاني محادثة محفوظة');
 await page.locator('#send').click();
 await expect(page.locator('#conversations .sessionRow')).toHaveCount(2);
 await page.locator('#searchConversations').fill('أول');
 await expect(page.locator('#conversations .sessionRow')).toHaveCount(1);
 await page.locator('#conversations .sessionPick').click();
 await expect(page.locator('.bubble.user')).toContainText('أول محادثة محفوظة');
 await expect(page.locator('.bubble.ai')).toContainText('إجابة للسؤال');
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('.bubble.user')).toContainText('أول محادثة محفوظة');
 await expect(page.locator('#conversations .sessionRow')).toHaveCount(2);
 const local=await page.evaluate(()=>JSON.parse(localStorage.getItem('nova_omni_local_sessions_v1')||'{}'));
 expect(local.sessions.length).toBe(2);
 expect(local.sessions.every(s=>s.messages.length===2)).toBe(true);
});
test('deleting one conversation does not delete the other, and confirmation can be cancelled',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('nova_omni_local_sessions_v1',JSON.stringify({
   currentId:'first',
   sessions:[
    {id:'first',title:'جلسة أولى',updatedAt:123,messages:[{role:'user',content:'مرحبا الأول'},{role:'assistant',content:'رد أول'}]},
    {id:'second',title:'جلسة ثانية',updatedAt:122,messages:[{role:'user',content:'مرحبا التاني'},{role:'assistant',content:'رد تاني'}]}
   ]
  }));
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#conversations .sessionRow')).toHaveCount(2);
 page.once('dialog',dialog=>dialog.dismiss());
 await page.locator('#clear').click();
 await expect(page.locator('#conversations .sessionRow')).toHaveCount(2);
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#clear').click();
 await expect(page.locator('#conversations .sessionRow')).toHaveCount(1);
 await expect(page.locator('#welcome')).toBeVisible();
 await page.locator('#conversations .sessionPick').click();
 await expect(page.locator('.bubble.user')).toContainText('مرحبا التاني');
 await expect(page.locator('.bubble.ai')).toContainText('رد تاني');
});
test('export conversation downloads plaintext while copy reply remains safe',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('nova_omni_local_sessions_v1',JSON.stringify({
   currentId:'export1',
   sessions:[{
    id:'export1',title:'محفوظة للتصدير',updatedAt:100,
    messages:[{role:'user',content:'ما هو الرقم 7؟'},{role:'assistant',content:'الرقم 7 هو سبعة.'}]
   }]
  }));
 });
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#exportChat')).toBeEnabled();
 const downloadPromise=page.waitForEvent('download');
 await page.locator('#exportChat').click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toMatch(/^nova-local-conversation-\d{4}-\d{2}-\d{2}\.txt$/);
 const file=await download.createReadStream();
 let content='';
 for await (const chunk of file)content+=chunk.toString('utf8');
 expect(content).toContain('ما هو الرقم 7؟');
 expect(content).toContain('الرقم 7 هو سبعة.');
 await expect(page.locator('.copyMessage')).toHaveCount(1);
});
test('during generation saved conversations cannot change and typing indicator is visible',async({page})=>{
 await page.addInitScript(()=>{
  class MockWorker{
   postMessage(data){
    if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',device:'webgpu'}}));
   }
   terminate(){}
  }
  window.Worker=MockWorker;
 });
 page.on('dialog',dialog=>dialog.accept());
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#start').click();
 await expect(page.locator('#statusLabel')).toContainText('جاهز');
 await page.locator('#prompt').fill('احكيلي معلومة جديدة عن الفضاء');
 await expect(page.locator('#send')).toBeEnabled();
 await page.locator('#send').click();
 await expect(page.locator('#typingIndicator')).toContainText('جاري تجهيز الرد');
 await expect(page.locator('#newChat')).toBeDisabled();
 await expect(page.locator('#prompt')).toBeDisabled();
 await page.locator('#stop').click();
 await expect(page.locator('#typingIndicator')).toHaveCount(0);
 await expect(page.locator('#prompt')).toHaveValue('احكيلي معلومة جديدة عن الفضاء');
 await expect(page.locator('#newChat')).toBeEnabled();
});


test('Arabic arithmetic works instantly without downloading any AI model',async({page})=>{
 let externalCalls=0;
 page.on('request',r=>{if(/huggingface|jsdelivr|ai-gateway\.vercel/.test(r.url()))externalCalls++;});
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#send')).toBeDisabled();
 await page.locator('#prompt').fill('احسب ٣ + ٤؟');
 await expect(page.locator('#send')).toBeEnabled();
 await page.locator('#send').click();
 await expect(page.locator('.bubble.ai')).toContainText('الناتج: 7');
 await expect(page.locator('#start')).toBeEnabled();
 expect(externalCalls).toBe(0);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('nova_omni_local_sessions_v1')||'{}'));
 expect(saved.sessions[0].messages.length).toBe(2);
});
test('ordinary questions without a loaded local AI cannot be submitted',async({page})=>{
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#prompt').fill('اشرح لي الثقوب السوداء');
 await expect(page.locator('#send')).toBeDisabled();
 await page.locator('#prompt').press('Enter');
 await expect(page.locator('#notice')).toContainText('شغّل النموذج');
 await expect(page.locator('.bubble')).toHaveCount(0);
 await expect(page.locator('#prompt')).toHaveValue('اشرح لي الثقوب السوداء');
});


test('first-time mobile visitor receives Fast Qwen2.5 profile with balanced memory',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'userAgent',{configurable:true,get:()=> 'Mozilla/5.0 (Linux; Android 16) Mobile Chrome/141'});
  localStorage.removeItem('nova_local_profile');
 });
 await page.setViewportSize({width:390,height:844});
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#profile')).toHaveValue('fast');
 await expect(page.locator('#memory')).toHaveValue('balanced');
 await expect(page.locator('#taskMode')).toHaveValue('auto');
});
test('task mode is sent to local model and streamed response is displayed progressively',async({page})=>{
 await page.addInitScript(()=>{
  class MockWorker{
   postMessage(data){
    window.__taskRequests??=[];
    window.__taskRequests.push(data);
    if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',device:'wasm'}}));
    if(data.type==='generate'){
     queueMicrotask(()=>this.onmessage({data:{type:'partial',text:'خطوة أولى: جهز البيانات'}}));
     setTimeout(()=>this.onmessage({data:{type:'answer',answer:'خطوة أولى: جهز البيانات. خطوة ثانية: اكتب الكود.',contextMessages:1,task:'coding'}}),500);
    }
   }
   terminate(){}
  }
  window.Worker=MockWorker;
 });
 page.on('dialog',dialog=>dialog.accept());
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#start').click();
 await expect(page.locator('#statusLabel')).toContainText('جاهز');
 await page.locator('#taskMode').selectOption('coding');
 await page.locator('#prompt').fill('اكتب برنامج بسيط');
 await page.locator('#send').click();
 await expect(page.locator('#typingIndicator')).toContainText('جهز البيانات');
 await expect(page.locator('.bubble.ai')).toContainText('خطوة ثانية');
 const calls=await page.evaluate(()=>window.__taskRequests);
 expect(calls.find(x=>x.type==='generate').task).toBe('coding');
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('#taskMode')).toHaveValue('coding');
});
test('text file attachment stays local and selects summarising mode',async({page})=>{
 let external=0;
 page.on('request',r=>{if(/ai-gateway|api\/omni/.test(r.url()))external++;});
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#textFile').setInputFiles({name:'lesson-notes.txt',mimeType:'text/plain',buffer:Buffer.from('The Sun is a star. Earth orbits around the Sun.')});
 await expect(page.locator('#taskMode')).toHaveValue('summarise');
 await expect(page.locator('#prompt')).toHaveValue(/The Sun is a star/);
 await expect(page.locator('#notice')).toContainText('محليًا');
 expect(external).toBe(0);
});
test('model failure offers a confirmed switch to faster model',async({page})=>{
 await page.addInitScript(()=>{
  window.__workers=[];
  class MockWorker{
   constructor(){window.__workers.push(this);this.onmessage=null;}
   postMessage(data){
    if(data.type==='init'){
     if(data.profile==='balanced')queueMicrotask(()=>this.onmessage({data:{type:'error',stage:'load',message:'Model download failed'}}));
     else queueMicrotask(()=>this.onmessage({data:{type:'ready',device:'wasm',profile:data.profile}}));
    }
   }
   terminate(){}
  }
  window.Worker=MockWorker;
 });
 page.on('dialog',dialog=>dialog.accept());
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#profile').selectOption('balanced');
 await page.locator('#start').click();
 await expect(page.locator('#modelHelp')).toBeVisible();
 await expect(page.locator('#loadAssist')).toBeVisible();
 await page.locator('#tryFast').click();
 await expect(page.locator('#profile')).toHaveValue('fast');
 await expect(page.locator('#statusLabel')).toContainText('جاهز');
 expect(await page.evaluate(()=>window.__workers.length)).toBe(2);
});
test('long local-model start reveals actionable alternatives without percentages',async({page})=>{
 await page.clock.install();
 await page.addInitScript(()=>{
  window.Worker=class{postMessage(){}terminate(){}};
 });
 page.on('dialog',dialog=>dialog.accept());
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#start').click();
 await expect(page.locator('#loadAssist')).toBeHidden();
 await page.clock.fastForward(25000);
 await expect(page.locator('#loadAssist')).toBeVisible();
 await expect(page.locator('#loadAssistFast')).toBeEnabled();
 await expect(page.locator('#progress')).toBeHidden();
});


test('queued question can be cancelled without terminating a model that is still loading',async({page})=>{
 await page.addInitScript(()=>{
  class MockWorker{
   constructor(){window.__pendingWorker=this;this.onmessage=null;window.__terminated=0;}
   postMessage(data){window.__pendingCalls??=[];window.__pendingCalls.push(data);}
   terminate(){window.__terminated++;}
  }
  window.Worker=MockWorker;
 });
 page.on('dialog',d=>d.accept());
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#start').click();
 await page.locator('#prompt').fill('شرح قصير للموجات');
 await page.locator('#send').click();
 await expect(page.locator('#cancelReply')).toBeVisible();
 await page.locator('#cancelReply').click();
 await expect(page.locator('#cancelReply')).toBeHidden();
 expect(await page.evaluate(()=>window.__terminated)).toBe(0);
 await page.evaluate(()=>window.__pendingWorker.onmessage({data:{type:'ready',device:'wasm'}}));
 await expect(page.locator('#statusLabel')).toContainText('جاهز');
 expect((await page.evaluate(()=>window.__pendingCalls)).filter(x=>x.type==='generate')).toHaveLength(0);
 await expect(page.locator('#prompt')).toHaveValue('شرح قصير للموجات');
});
test('cancel reply aborts local generation and preserves the unsent draft',async({page})=>{
 await page.addInitScript(()=>{
  window.__terminated=0;
  class MockWorker{
   postMessage(data){
    if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',device:'wasm'}}));
   }
   terminate(){window.__terminated++;}
  }
  window.Worker=MockWorker;
 });
 page.on('dialog',d=>d.accept());
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#start').click();
 await expect(page.locator('#statusLabel')).toContainText('جاهز');
 await page.locator('#prompt').fill('اكتب خطة لمشروع صغير');
 await page.locator('#send').click();
 await expect(page.locator('#typingIndicator')).toBeVisible();
 await expect(page.locator('#cancelReply')).toBeVisible();
 await page.locator('#cancelReply').click();
 await expect(page.locator('#typingIndicator')).toHaveCount(0);
 await expect(page.locator('#prompt')).toHaveValue('اكتب خطة لمشروع صغير');
 expect(await page.evaluate(()=>window.__terminated)).toBe(1);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('nova_omni_local_sessions_v1')||'{}').sessions||[]);
 expect(saved.some(x=>x.messages.some(m=>m.content.includes('اكتب خطة')))).toBe(false);
});
test('local model init gives recovery options and safely ends at the load deadline',async({page})=>{
 await page.clock.install();
 await page.addInitScript(()=>{
  window.__terminated=0;
  class MockWorker{postMessage(){}terminate(){window.__terminated++;}}
  window.Worker=MockWorker;
 });
 page.on('dialog',d=>d.accept());
 await page.goto(BASE+'local.html',{waitUntil:'domcontentloaded'});
 await page.locator('#start').click();
 await page.clock.fastForward(152000);
 await expect(page.locator('#modelHelp')).toBeVisible();
 await expect(page.locator('#start')).toBeEnabled();
 await expect(page.locator('#stop')).toBeDisabled();
 expect(await page.evaluate(()=>window.__terminated)).toBe(1);
 await expect(page.locator('#modelHelpText')).toContainText('دقيقتين ونصف');
 await expect(page.locator('#prompt')).toBeEnabled();
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
