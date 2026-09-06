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
  await page.waitForFunction(()=>window.__V12_PROLOGUE.actionProgress>=1);
  const pose=await page.evaluate(()=>{
    const B=BABYLON,scene=B.Engine.LastCreatedEngine.scenes[0],rig=scene.getTransformNodeByName('storyActor_hero'),head=scene.getMeshByName(window.__EGYPT_CAST.actors.hero.head);
    head.computeWorldMatrix(true);const spine=rig.getDescendants().find(n=>n.name.endsWith('v9_spine_3'));
    return {headY:head.getAbsolutePosition().y,spine:spine.rotation.x,hero:rig.position.asArray(),door:scene.getTransformNodeByName('storyDoorHinge').rotation.y,cash:scene.getTransformNodeByName('storyCash').isEnabled(),action:document.getElementById('storyAction').textContent};
  });
  assert.ok(pose.action.length>10);if(beat===0){assert.ok(pose.spine>1.4&&pose.headY<1.5,'hero is not lying on the bed');}
  if(beat===1)assert.ok(Math.abs(pose.spine)<.05&&pose.headY>1.9,'hero did not sit up');
  if(beat===2)assert.ok(pose.cash,'money handoff has no visible banknotes');
  if(beat===3)assert.ok(pose.hero[2]>-145&&pose.door<-1,'hero did not walk to the open door');
  console.log('STORY_ACTION',JSON.stringify(pose));
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
  const expanded=await page.evaluate(()=>{
    const s=BABYLON.Engine.LastCreatedEngine.scenes[0],m=s.meshes.find(m=>m.metadata?.interactiveShop&&m.metadata.shopType==='bakery');
    return {name:m.metadata.shopName,x:m.position.x,z:m.position.z-1.1,open:s.meshes.filter(m=>m.metadata?.interactiveShop).length,closed:s.meshes.filter(m=>m.metadata?.closedShop).length};
  });
  assert.ok(expanded.open>0&&expanded.closed>0);
  await page.evaluate(p=>window.__egyptDebug.v12Teleport(p.x,p.z),expanded);
  await page.waitForFunction(name=>document.getElementById('prompt').textContent.includes(name),expanded.name);await interact();await page.locator('#shop').waitFor({state:'visible'});
  const beforePacket=await state();await click('[data-errand="bread"] button');assert.equal((await state()).money,beforePacket.money-12);assert.equal((await state()).breakfastBread,4);await click('#shopClose');
  console.log('EXPANDED_SHOPS',JSON.stringify(expanded));
  // Separate saved-game fixture isolates the later market/job/rest stages.
  const laterSave={...await state(),task:1,breakfastDelivered:true,energy:80};
  await page.addInitScript(s=>localStorage.setItem('hayat-masr-v4',JSON.stringify(s)),laterSave);
  await page.reload({waitUntil:'domcontentloaded'});await ready();await click('#continueBtn');assert.equal((await state()).task,1,'later-stage fixture did not load');
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
  const homeStart=await page.evaluate(()=>window.__egyptDebug.getCamera());await page.keyboard.down('w');
  await page.waitForFunction(p=>{const c=window.__egyptDebug.getCamera();return Math.hypot(c.x-p.x,c.z-p.z)>1;},homeStart,{timeout:20000});await page.keyboard.up('w');
  console.log('LATER_TASK home/rest and indoor walking passed');
 }
 assert.deepEqual(errors,[]);console.log('Four story scenes, complete opening and shop/task audit passed',{mobile});
}finally{await browser.close();}
