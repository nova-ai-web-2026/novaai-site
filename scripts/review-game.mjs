import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const mobile=process.env.GAME_TEST_MOBILE==='true';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true});
try{
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1000,height:700},isMobile:mobile,hasTouch:mobile});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{let once=false;new MutationObserver(()=>{if(!once&&document.getElementById('v12Prologue')?.classList.contains('active')){once=true;document.getElementById('storyPace').click();}}).observe(document,{subtree:true,childList:true,attributes:true});});
 const click=s=>mobile?page.tap(s):page.click(s);
 const interact=()=>mobile?page.tap('#act'):page.keyboard.press('e');
 const state=()=>page.evaluate(()=>window.EgyptLife.snapshot().state);
 const ready=()=>page.waitForFunction(()=>window.__V119_READY&&window.__EGYPT_CAST?.ready,null,{timeout:60000});
 await page.goto(process.env.GAME_TEST_URL||'http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});await ready();await click('#newGameBtn');
 for(let beat=0;beat<4;beat++){
  await page.waitForFunction(i=>window.__V12_PROLOGUE.beat===i&&document.getElementById('storyNext').textContent!=='إظهار الكلام كاملًا',beat,{timeout:15000});
  console.log('STORY_BEAT',JSON.stringify(await page.evaluate(()=>({beat:window.__V12_PROLOGUE.beat,speaker:document.getElementById('storySpeaker').textContent,text:document.getElementById('storyText').textContent,action:window.__V12_PROLOGUE.action||null}))));
  console.log('VISUAL_EVIDENCE_beat'+beat+':'+(await page.screenshot({type:'jpeg',quality:65})).toString('base64'));
  await click('#storyNext');
 }
 await page.waitForFunction(()=>document.body.classList.contains('game-started')&&!window.__V12_PROLOGUE.running);
 if(!mobile){
  const shops=await page.evaluate(()=>{
   const scene=BABYLON.Engine.LastCreatedEngine.scenes[0];
   return scene.meshes.filter(m=>m.name==='shopGlass').map(m=>({name:m.metadata.shopName,type:m.metadata.shopType,x:m.position.x,z:m.position.z-1.1}));
  });
  console.log('SHOP_COVERAGE',JSON.stringify({facades:shops.length,types:[...new Set(shops.map(s=>s.type))]}));
  for(const shop of [...new Map(shops.map(s=>[s.type,s])).values()]){
   await page.evaluate(p=>window.__egyptDebug.v12Teleport(p.x,p.z),shop);
   await page.waitForFunction(name=>document.getElementById('prompt').classList.contains('show')&&document.getElementById('prompt').textContent.includes(name),shop.name);
   await interact();await page.locator('#shop').waitFor({state:'visible'});
   assert.equal(await page.locator('#shopTitle').innerText(),shop.name);
   const rows=page.locator('#shopItems .item:not(.errand-item)');assert.ok(await rows.count()>=2);
   const price=Number((await rows.first().innerText()).match(/(\d+) جنيه/)[1]),before=await state();
   await rows.first().getByRole('button',{name:'اشتري',exact:true}).click();
   const after=await state();assert.equal(after.money,before.money-price);assert.equal(after.task,0);assert.equal(after.breakfastDelivered,false);
   console.log('SHOP_PURCHASE',JSON.stringify({type:shop.type,name:shop.name,price,money:after.money}));
   await click('#shopClose');await page.locator('#shop').waitFor({state:'hidden'});
  }
  // Separate saved-game fixture isolates the later market/job/rest stages.
  await page.evaluate(()=>{const s=window.EgyptLife.snapshot().state;localStorage.setItem('hayat-masr-v4',JSON.stringify({...s,task:1,breakfastDelivered:true,energy:80}));});
  await page.reload({waitUntil:'domcontentloaded'});await ready();await click('#continueBtn');
  for(const [x,z,task,label] of [[48,-48,2,'market'],[-16,61.9,3,'job']]){
   await page.evaluate(([x,z])=>window.__egyptDebug.v12Teleport(x,z),[x,z]);
   await page.waitForFunction(()=>document.getElementById('prompt').classList.contains('show'));
   const before=await state();await interact();await page.waitForFunction(t=>window.EgyptLife.snapshot().state.task===t,task);
   const after=await state();if(label==='job'){assert.ok(after.money>=before.money+48&&after.money<=before.money+75);assert.equal(after.worked,before.worked+1);}
   console.log('LATER_TASK',label,JSON.stringify(after));
  }
  const door=await page.evaluate(()=>window.__V12_HOME.streetDoor);
  await page.evaluate(p=>window.__egyptDebug.v12Teleport(p.x,p.z),door);await page.waitForTimeout(250);await interact();
  await page.waitForFunction(()=>window.EgyptLife.snapshot().state.task===4);assert.ok((await state()).energy>99);
  console.log('LATER_TASK home/rest passed');
 }
 assert.deepEqual(errors,[]);console.log('Four story scenes, complete opening and shop/task audit passed',{mobile});
}finally{await browser.close();}
