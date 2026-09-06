import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';

const mobile=process.env.GAME_TEST_MOBILE==='true';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true});
let page;
const deadline=setTimeout(()=>{console.error('Shop entry exceeded seven minutes');void browser.close().finally(()=>process.exit(1));},420000);
try{
 page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1000,height:700},isMobile:mobile,hasTouch:mobile});
 const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
 const click=s=>mobile?page.tap(s):page.click(s);
 const interact=()=>mobile?page.tap('#prompt'):page.keyboard.press('e');
 const pose=()=>page.evaluate(()=>window.__egyptDebug.getCamera());
 const state=()=>page.evaluate(()=>window.EgyptLife.snapshot().state);
 const inside=()=>page.evaluate(()=>window.EgyptLife.insideShop());
 const ready=()=>page.waitForFunction(()=>window.__V119_READY&&window.EgyptShops,null,{timeout:60000});
 const look=angle=>page.evaluate(angle=>{const c=window.__egyptDebug.getCamera();window.__egyptDebug.applyLook((angle-c.yaw)/.00225,-c.pitch/.0019);},angle);
 const evidence=async name=>console.log('VISUAL_EVIDENCE_'+name+':'+(await page.screenshot({type:'jpeg',quality:65})).toString('base64'));
 async function walk(distance){
  const start=await pose();let release;
  if(mobile){
   const rect=await page.locator('#joy').boundingBox(),x=rect.x+rect.width/2,y=rect.y+rect.height/2,cdp=await page.context().newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-38}]});
   release=async()=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();};
  }else{await page.keyboard.down('w');release=()=>page.keyboard.up('w');}
  try{await page.waitForFunction(({start,distance})=>{const c=window.__egyptDebug.getCamera();return Math.hypot(c.x-start.x,c.z-start.z)>=distance;},{start,distance},{timeout:45000});}
  finally{await release();}
  return {start,end:await pose()};
 }
 async function approach(shop){
  // Only seed the route start. Every metre from the pavement to the door uses input.
  await page.evaluate(p=>window.__egyptDebug.v12Teleport(p.x,p.z-6),shop);await look(0);
  const movement=await walk(3.5);
  await page.waitForFunction(name=>document.getElementById('prompt').classList.contains('show')&&document.getElementById('prompt').textContent.includes('ادخل '+name),shop.name);
  assert.equal(await page.locator('#act').innerText(),'دخول');
  console.log('STREET_WALK',JSON.stringify({mobile,shop,movement}));
 }
 await page.goto(process.env.GAME_TEST_URL||'http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});await ready();
 assert.equal(await page.locator('html').getAttribute('data-release'),'11.23.0');
 const quality=await page.evaluate(()=>window.EgyptQuality.state());
 assert.equal(quality.version,'11.23.0');assert.ok(quality.people>=42&&quality.textures>=8,'quality geometry or materials did not load');
 assert.equal(await page.evaluate(()=>{const s=BABYLON.Engine.LastCreatedEngine.scenes[0];return s.meshes.filter(m=>m.metadata?.quality).every(m=>Array.from(m.getVerticesData(BABYLON.VertexBuffer.PositionKind)||[]).every(Number.isFinite));}),true,'invalid geometry');
 console.log('QUALITY_READY',JSON.stringify(quality));
 await click('#newGameBtn');await page.waitForFunction(()=>window.__V12_PROLOGUE.running);await click('#v12Skip');
 if(mobile)await click('#qualityToggle');else await page.keyboard.press('q');
 assert.equal((await page.evaluate(()=>window.EgyptQuality.state())).shadowSize,2048);
 assert.equal(await page.evaluate(()=>localStorage.getItem('egypt-graphics')),'high');
 if(mobile)await click('#qualityToggle');else await page.keyboard.press('q');
 assert.equal((await page.evaluate(()=>window.EgyptQuality.state())).shadowSize,1024);
 const shops=await page.evaluate(()=>{
  const s=BABYLON.Engine.LastCreatedEngine.scenes[0];
  return [s.meshes.find(m=>m.name==='shopGlass'&&m.metadata.shopType==='bakery'),s.meshes.find(m=>m.metadata?.interactiveShop&&m.metadata.shopType==='bakery')].map(m=>({x:m.position.x,z:m.position.z,name:m.metadata.shopName,type:m.metadata.shopType}));
 });
 for(const [index,shop] of shops.entries()){
  await approach(shop);await evidence('shopApproach'+index);
  const outside=await pose();
  if(!mobile)await page.keyboard.press('e');else await click(index===0?'#prompt':'#act');
  await page.locator('#shop').waitFor({state:'visible'});
  assert.equal((await inside()).name,shop.name);assert.ok(Math.hypot((await pose()).x-outside.x,(await pose()).z-outside.z)>20,'shop menu did not enter the room');
  await click('#shopBrowse');await page.locator('#shop').waitFor({state:'hidden'});
  assert.ok(await page.locator('#shopExit').isVisible());assert.equal(await page.locator('#shopLocation').innerText(),shop.name);
  await evidence('shopInterior'+index);
  const walkInside=await walk(2.1);assert.ok(walkInside.end.z>walkInside.start.z+2);
  const breadShape=await page.evaluate(()=>{const s=BABYLON.Engine.LastCreatedEngine.scenes[0],m=s.getMeshByName('quality_counterBread');m.computeWorldMatrix(true);const box=m.getBoundingInfo().boundingBox;return{thickness:box.maximumWorld.y-box.minimumWorld.y,width:box.maximumWorld.x-box.minimumWorld.x,texture:m.material.diffuseTexture.isReady()};});
  assert.ok(breadShape.texture&&breadShape.thickness<.05&&breadShape.width>.30,'bread is thick, missing or untextured');
  await page.evaluate(()=>window.__egyptDebug.applyLook(0,.25/.0019));await evidence('qualityBakery'+index);await page.evaluate(()=>window.__egyptDebug.applyLook(0,-.25/.0019));
  await page.waitForFunction(()=>document.getElementById('prompt').textContent.includes('اطلب من الكاونتر'));
  await interact();await page.locator('#shop').waitFor({state:'visible'});
  const before=await state();
  if(index===0){await click('[data-errand="bread"] button');assert.equal((await state()).money,before.money-12);assert.equal((await state()).breakfastBread,4);}
  else{
   const first=page.locator('#shopItems .item:not(.errand-item)').first(),price=Number((await first.innerText()).match(/(\d+) جنيه/)[1]);
   await first.getByRole('button',{name:'اشتري',exact:true}).click();assert.equal((await state()).money,before.money-price);
  }
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('hayat-masr-v4')));
  assert.ok(Math.hypot(saved.savedX-outside.x,saved.savedZ-outside.z)<.03,'indoor save would respawn outside the world');
  if(index===0){
   await click('#shopClose');assert.equal(await inside(),null);
   const back=await pose();assert.ok(Math.hypot(back.x-outside.x,back.z-outside.z)<.03,'exit did not return to the same door');
   await walk(1);await look(0);await walk(1);
   await page.waitForFunction(()=>document.getElementById('prompt').textContent.includes('ادخل'));
   if(mobile)await click('#act');else await page.keyboard.press('e');
   await page.locator('#shop').waitFor({state:'visible'});assert.ok(await inside());
   await click('#shopBrowse');await click('#shopExit');assert.equal(await inside(),null);
  }else{
   // Reload while inside: purchases persist; Continue returns to the entrance.
   await page.reload({waitUntil:'domcontentloaded'});await ready();await click('#continueBtn');
   assert.equal(await inside(),null);assert.equal((await state()).money,saved.money);assert.equal((await state()).breakfastBread,4);
   const resumed=await pose();assert.ok(Math.hypot(resumed.x-saved.savedX,resumed.z-saved.savedZ)<.1);
   await look(Math.PI);await walk(1);
  }
  console.log('SHOP_ENTRY_PASSED',JSON.stringify({mobile,index,shop:shop.name,roomWalking:true,purchase:true,exit:true,save:true}));
 }
 const cart=await page.evaluate(()=>{const m=BABYLON.Engine.LastCreatedEngine.scenes[0].getMeshByName('fulHot');return{x:m.position.x,z:m.position.z-2};});
 await page.evaluate(p=>window.__egyptDebug.v12Teleport(p.x,p.z),cart);
 await page.waitForFunction(()=>document.getElementById('prompt').textContent.includes('اشتري من')&&document.getElementById('prompt').textContent.includes('فول'));
 await interact();await page.locator('#shop').waitFor({state:'visible'});assert.equal(await inside(),null);assert.equal(await page.locator('#shopBrowse').isVisible(),false);await click('#shopClose');
 assert.deepEqual(errors,[]);console.log('Street access, tappable entrance, indoor walking, counter, exit, save and outdoor cart passed',{mobile});
}catch(error){
 if(page){console.error('SHOP_FAILURE_STATE',await page.evaluate(()=>({camera:window.__egyptDebug?.getCamera(),inside:window.EgyptLife?.insideShop(),prompt:document.getElementById('prompt')?.textContent,error:document.getElementById('errorBox')?.textContent})).catch(()=>null));console.log('VISUAL_EVIDENCE_shopFailure:'+(await page.screenshot({type:'jpeg',quality:65}).catch(()=>Buffer.alloc(0))).toString('base64'));}
 throw error;
}finally{clearTimeout(deadline);await browser.close();}
