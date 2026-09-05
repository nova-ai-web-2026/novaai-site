import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';

const base=process.env.GAME_TEST_URL||'http://127.0.0.1:4173/';
const mobile=process.env.GAME_TEST_MOBILE==='true';
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome'});
const deadline=setTimeout(()=>{console.error('Breakfast errand exceeded eight minutes');void browser.close().finally(()=>process.exit(1));},480000);
try{
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1000,height:700},isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error(error.message);});
  const state=()=>page.evaluate(()=>window.EgyptLife.snapshot().state);
  const sounds=()=>page.evaluate(()=>window.__V1116_SFX_API.state());
  const click=selector=>mobile?page.tap(selector):page.click(selector);
  const interact=()=>mobile?page.tap('#act'):page.keyboard.press('e');
  const ready=()=>page.waitForFunction(()=>window.__V119_READY&&window.__V12_WORLD?.ready&&window.EgyptLife,null,{timeout:60000});
  const teleport=async(x,z)=>{
    await page.evaluate(([x,z])=>window.__egyptDebug.v12Teleport(x,z),[x,z]);
    await page.waitForTimeout(200);
  };
  const approachFul=async()=>{
    const point=await page.evaluate(()=>{
      const scene=BABYLON.Engine.LastCreatedEngine.scenes[0],cart=scene.getMeshByName('fulHot');
      const point={x:cart.position.x,z:cart.position.z-2};
      const blockers=scene.meshes.filter(m=>{
        if(!m.checkCollisions||!m.isEnabled())return false;
        m.computeWorldMatrix(true);const bounds=m.getBoundingInfo().boundingBox,min=bounds.minimumWorld,max=bounds.maximumWorld;
        return max.y>=.12&&min.y<=2.45&&point.x+.52>min.x&&point.x-.52<max.x&&point.z+.52>min.z&&point.z-.52<max.z;
      }).map(m=>m.name);
      return {...point,blockers};
    });
    assert.deepEqual(point.blockers,[],'ful cart interaction position is obstructed');
    await teleport(point.x,point.z);
    await page.waitForFunction(()=>document.getElementById('prompt').classList.contains('show')&&document.getElementById('prompt').textContent.includes('فول'));
  };
  const newDay=async()=>{
    await click('#newGameBtn');
    await page.waitForFunction(()=>window.__V12_PROLOGUE.running,null,{timeout:15000});
    await click('#v12Skip');
    await page.waitForFunction(()=>window.__V12_PROLOGUE.played&&document.body.classList.contains('game-started'));
  };
  const home=async()=>{const p=await page.evaluate(()=>window.__V12_HOME.streetDoor);await teleport(p.x,p.z);await interact();};
  const exitHome=async()=>{await teleport(-150,-144);await interact();};
  const closeDialog=async()=>{
    const before=await sounds();
    if(mobile)await click('#dialogClose');else await page.keyboard.press('e');
    await page.locator('#dialog').waitFor({state:'hidden'});
    const after=await sounds();
    assert.equal(after.playCalls,before.playCalls,'closing family dialogue played a sound');
    assert.equal(after.events.door,before.events.door,'closing dialogue reopened the home door');
  };
  await page.goto(base+'?v=11.19.0',{waitUntil:'domcontentloaded'});await ready();await newDay();
  assert.equal((await state()).money,300);assert.equal((await state()).task,0);
  await page.waitForFunction(()=>document.getElementById('taskGuide').textContent.includes('م'));
  await approachFul();
  await interact();await page.locator('#shop').waitFor({state:'visible'});
  await page.getByRole('button',{name:'اشتري',exact:true}).first().click();
  assert.equal((await state()).task,0,'personal food wrongly completes the family errand');
  assert.equal((await state()).breakfastFul,false);
  const hunger=(await state()).hunger;
  await click('[data-errand="ful"] button');
  assert.equal((await state()).money,261);assert.equal((await state()).breakfastFul,true);
  assert.ok((await state()).hunger<=hunger,'packed food was eaten immediately');
  assert.ok(await page.locator('[data-errand="ful"] button').isDisabled(),'duplicate packet purchase is enabled');
  console.log('VISUAL_EVIDENCE_errandShop:'+(await page.screenshot({type:'jpeg',quality:60})).toString('base64'));
  await click('#shopClose');
  await home();await page.locator('#dialog').waitFor({state:'visible'});
  assert.match(await page.locator('#dialogText').innerText(),/٤ أرغفة/);
  assert.equal((await state()).breakfastDelivered,false);assert.equal((await state()).money,261);
  await closeDialog();await exitHome();
  await page.reload({waitUntil:'domcontentloaded'});await ready();await click('#continueBtn');
  assert.equal((await state()).breakfastFul,true);assert.equal((await state()).breakfastBread,0);
  assert.equal(await page.evaluate(()=>window.__V12_PROLOGUE.starts),0,'Continue replayed the opening');
  const bakery=await page.evaluate(()=>{
    const scene=BABYLON.Engine.LastCreatedEngine.scenes[0];
    const glass=scene.meshes.find(m=>m.name==='shopGlass'&&m.metadata?.shopType==='bakery');
    return {x:glass.position.x,z:glass.position.z-.95,name:glass.metadata.shopName};
  });
  await teleport(bakery.x,bakery.z);
  await page.waitForFunction(name=>document.getElementById('prompt').classList.contains('show')&&document.getElementById('prompt').textContent.includes(name),bakery.name);
  await interact();await page.locator('#shop').waitFor({state:'visible'});
  await click('[data-errand="bread"] button');
  assert.equal((await state()).breakfastBread,4);assert.equal((await state()).money,249);
  await click('#shopClose');
  await page.waitForFunction(()=>window.EgyptLife.snapshot().target?.kind==='home');
  assert.match(await page.locator('#taskText').innerText(),/سلّمه لماما/);
  console.log('VISUAL_EVIDENCE_errandBag:'+(await page.screenshot({type:'jpeg',quality:60})).toString('base64'));
  const beforeReward=(await sounds()).events.reward;
  await home();await page.locator('#dialog').waitFor({state:'visible'});
  const delivered=await state();
  assert.equal(delivered.breakfastDelivered,true);assert.equal(delivered.breakfastBread,0);assert.equal(delivered.breakfastFul,false);
  assert.equal(delivered.breakfastSpent,37);assert.equal(delivered.money,269);assert.equal(delivered.task,1);
  assert.equal((await sounds()).events.reward,beforeReward+1);
  assert.match(await page.locator('#dialogText').innerText(),/نشرة مفقودين/);
  console.log('VISUAL_EVIDENCE_errandDelivery:'+(await page.screenshot({type:'jpeg',quality:60})).toString('base64'));
  await closeDialog();await exitHome();await home();
  assert.equal((await state()).money,269,'re-entering home repeated the reward');
  assert.equal((await sounds()).events.reward,beforeReward+1);
  await page.reload({waitUntil:'domcontentloaded'});await ready();await click('#continueBtn');
  assert.equal((await state()).breakfastDelivered,true);assert.equal((await state()).task,1);
  // Legacy save migration is exercised at the real Continue entry point.
  if(mobile){
    // Reload saves the active session during beforeunload, so seed the fixture at
    // document creation, before the game reads storage.
    await page.addInitScript(()=>localStorage.setItem('hayat-masr-v4',JSON.stringify({money:120,task:2,savedX:-24,savedZ:-24})));
    await page.reload({waitUntil:'domcontentloaded'});await ready();await click('#continueBtn');
    assert.equal((await state()).task,2);assert.equal((await state()).breakfastDelivered,true);
    assert.equal((await state()).money,120);
    await page.addInitScript(()=>localStorage.setItem('hayat-masr-v4',JSON.stringify({money:0,task:0,savedX:-24,savedZ:-24})));
    await page.reload({waitUntil:'domcontentloaded'});await ready();await click('#continueBtn');
    await approachFul();
    await interact();await page.locator('#shop').waitFor({state:'visible'});
    const denied=(await sounds()).events.deny;
    await click('[data-errand="ful"] button');
    assert.equal((await state()).money,0);assert.equal((await state()).breakfastFul,false);
    assert.equal((await sounds()).events.deny,denied+1,'unaffordable purchase was not rejected');
    await click('#shopClose');
    await page.reload({waitUntil:'domcontentloaded'});await ready();await newDay();
    assert.equal((await state()).money,300);assert.equal((await state()).breakfastFul,false);
    assert.equal((await state()).breakfastDelivered,false);assert.equal((await state()).task,0);
  }
  assert.deepEqual(errors,[]);
  console.log('Breakfast errand passed',JSON.stringify({mobile,wrongPurchaseIgnored:true,partialSave:true,duplicateBlocked:true,oneReward:true,delivery:delivered}));
}finally{clearTimeout(deadline);await browser.close();}
