import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const mobile=process.env.GAME_TEST_MOBILE==='true';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true});
try{
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1000,height:700},isMobile:mobile,hasTouch:mobile});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.GAME_TEST_URL||'http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__V119_READY,null,{timeout:60000});
 const click=s=>mobile?page.tap(s):page.click(s);
 await click('#newGameBtn');await page.waitForFunction(()=>window.__V12_PROLOGUE.running);await click('#v12Skip');
 const shop=await page.evaluate(()=>{const s=BABYLON.Engine.LastCreatedEngine.scenes[0],m=s.meshes.find(m=>m.name==='shopGlass'&&m.metadata.shopType==='bakery');return {x:m.position.x,z:m.position.z,name:m.metadata.shopName};});
 await page.evaluate(p=>{window.__egyptDebug.v12Teleport(p.x,p.z-6);window.__egyptDebug.applyLook(-window.__egyptDebug.getCamera().yaw/.00225,0);},shop);
 const start=await page.evaluate(()=>window.__egyptDebug.getCamera());
 let release;
 if(mobile){const rect=await page.locator('#joy').boundingBox(),x=rect.x+rect.width/2,y=rect.y+rect.height/2,cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-38}]});release=async()=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();};}
 else{await page.keyboard.down('w');release=()=>page.keyboard.up('w');}
 await page.waitForFunction(p=>window.__egyptDebug.getCamera().z>p.z-1.4,shop,{timeout:45000});await release();
 await page.waitForFunction(name=>document.getElementById('prompt').textContent.includes(name),shop.name);
 console.log('VISUAL_EVIDENCE_shopApproach:'+(await page.screenshot({type:'jpeg',quality:60})).toString('base64'));
 const before=await page.evaluate(()=>window.__egyptDebug.getCamera());
 if(mobile)await page.tap('#act');else await page.keyboard.press('e');
 await page.locator('#shop').waitFor({state:'visible'});
 const after=await page.evaluate(()=>window.__egyptDebug.getCamera());
 console.log('SHOP_ENTRY_BASELINE',JSON.stringify({mobile,walked:Math.hypot(before.x-start.x,before.z-start.z),before,after,menu:await page.locator('#shopTitle').innerText(),interiorAvailable:!!window.EgyptShops?.active?.()}));
 console.log('VISUAL_EVIDENCE_shopMenu:'+(await page.screenshot({type:'jpeg',quality:60})).toString('base64'));
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
