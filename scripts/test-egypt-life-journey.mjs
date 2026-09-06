import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';

const mobile=process.env.GAME_TEST_MOBILE==='true';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true});
const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1000,height:700},isMobile:mobile,hasTouch:mobile});
const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
const deadline=setTimeout(()=>void browser.close().finally(()=>process.exit(1)),660000);
const click=s=>mobile?page.tap(s):page.click(s);
const interact=()=>mobile?page.tap('#act'):page.keyboard.press('e');
const ready=()=>page.waitForFunction(()=>window.__V119_READY&&window.__EGYPT_STREET_LIFE?.ready&&window.__EGYPT_HOME24?.ready,null,{timeout:90000});
const state=()=>page.evaluate(()=>EgyptLife.snapshot().state);
const street=()=>page.evaluate(()=>EgyptStreetLife.inspect());
const pose=()=>page.evaluate(()=>window.__egyptDebug.getCamera());
const evidence=async name=>console.log('VISUAL_EVIDENCE_'+name+':'+(await page.screenshot({type:'jpeg',quality:65,timeout:60000})).toString('base64'));
async function teleport(x,z,yaw=0,pitch=0){await page.evaluate(({x,z,yaw,pitch})=>{window.__egyptDebug.v12Teleport(x,z);const c=window.__egyptDebug.getCamera();window.__egyptDebug.applyLook((yaw-c.yaw)/.00225,(pitch-c.pitch)/.0019);},{x,z,yaw,pitch});}
async function hold(direction=1){
 if(!mobile){const key=direction>0?'w':'s';await page.keyboard.down(key);return()=>page.keyboard.up(key);}
 const r=await page.locator('#joy').boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2,cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-direction*38}]});
 return async()=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();};
}
async function walk(distance,direction=1){const start=await pose(),release=await hold(direction);try{await page.waitForFunction(({start,distance})=>{const p=window.__egyptDebug.getCamera();return Math.hypot(p.x-start.x,p.z-start.z)>=distance;},{start,distance},{timeout:60000});}finally{await release();}assert.equal((await street()).failed,false);return await pose();}
async function bumpFixture(){
 await teleport(-30.5,-45);
 return page.evaluate(()=>{const person=EgyptLife.streetContext().world.people[1],root=person.root;person.lane=-30.5;root.position.set(-30.5,0,-44);root.setEnabled(true);return root.uniqueId;});
}
async function bump(){const release=await hold();try{await page.waitForFunction(()=>!!EgyptStreetLife.inspect().encounter,null,{timeout:15000});}finally{await release();}}
async function buy(kind){
 const p=await page.evaluate(kind=>{const s=BABYLON.Engine.LastCreatedEngine.scenes[0],m=kind==='bread'?s.meshes.find(m=>m.name==='shopGlass'&&m.metadata?.shopType==='bakery'):s.getMeshByName('fulHot');return{x:m.position.x,z:m.position.z-(kind==='bread'?.95:2)};},kind);
 await teleport(p.x,p.z);await page.waitForFunction(()=>document.getElementById('prompt').classList.contains('show'),null,{timeout:15000});await interact();await page.locator('#shop').waitFor({state:'visible'});
 await click('[data-errand="'+kind+'"] button');await click('#shopClose');
}
async function retry(){await click('#retryJourney');await page.locator('#streetLoss').waitFor({state:'hidden'});assert.equal((await street()).failed,false);}
async function roadFixture(mode){
 // Set up controlled traffic and crowd positions; all movement, braking, light
 // transitions, failure and retry below run through the game's real update loop.
 await page.evaluate(mode=>{
  const f=window.__egyptDebug.streetFixture();window.__journeyEnabled=f.roots.map(root=>[root,root.isEnabled()]);f.roots.forEach(root=>root.setEnabled(false));
  for(const v of f.vehicles){if(v.vertical)v.root.position.z=100;else v.root.position.x=100;v.velocity=0;}
  const car=f.vehicles.find(v=>v.vertical&&v.road===-24&&v.dir===1);window.__journeyCar=car;
  const signal=f.signals.find(s=>s.id==='station');signal.phase=mode==='green'?'clear':'drive';signal.elapsed=mode==='green'?1.8:0;
  const crossZ=mode==='yield'?-79.3:-31.3,line=mode==='yield'?crossZ-2.45:-34.2;
  car.root.position.set(-26.1,car.root.position.y,mode==='red'?-50:line-car.length/2-(mode==='yield'?2:0));car.velocity=mode==='yield'?3:0;
 },mode);
 await teleport(-30.2,mode==='yield'?-79.3:-31.3,Math.PI/2);
}
const carState=()=>page.evaluate(()=>{const v=window.__journeyCar;return{z:v.root.position.z,velocity:v.velocity,length:v.length};});
try{
 await page.goto(process.env.GAME_TEST_URL||'http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});await ready();
 assert.equal(await page.locator('html').getAttribute('data-release'),'11.24.0');
 const home=await page.evaluate(()=>window.__EGYPT_HOME24);assert.ok(home.details>200&&home.bedWidth<3);
 assert.equal(await page.evaluate(()=>{const s=BABYLON.Engine.LastCreatedEngine.scenes[0];return s.meshes.filter(m=>m.metadata?.homeDetail).every(m=>Array.from(m.getVerticesData('position')||[]).every(Number.isFinite));}),true);
 await click('#newGameBtn');await page.waitForFunction(()=>window.__V12_PROLOGUE.running);await click('#storyPace');await page.waitForTimeout(900);await evidence('newBedroom');
 await click('#v12Skip');await page.waitForFunction(()=>!window.__V12_PROLOGUE.running);
 await teleport(-150,-153,1.00,.10);await evidence('newLivingRoom');
 await teleport(-149,-149.6,.83,.18);await evidence('newKitchen');
 // The actual furniture must leave a continuous route from the living room to the door.
 await teleport(-150,-151);await walk(5.6);assert.ok((await pose()).z>-145.5);
 console.log('HOME_ROUTE_PASSED',JSON.stringify({mobile,home}));
 const id=await bumpFixture();await bump();const blocked=await pose();assert.ok(blocked.z<-44.70,'walked through the body');assert.equal((await street()).encounter.id,id);assert.match(await page.locator('#streetNotice').innerText(),/خلي بالك|حاسب|وسع/);await evidence('pedestrianBump');
 await walk(1.2,-1);await page.waitForFunction(()=>!EgyptStreetLife.inspect().encounter);assert.equal((await street()).failed,false);
 await buy('bread');assert.equal((await state()).money,288);assert.equal((await state()).breakfastBread,4);
 await bumpFixture();await page.waitForTimeout(3200);await bump();
 await page.locator('#streetLoss').waitFor({state:'visible',timeout:15000});assert.ok((await state()).streetFailed);await evidence('journeyLost');
 const stopped=await pose(),release=await hold();await page.waitForTimeout(500);await release();assert.deepEqual(await pose(),stopped,'failed round still accepts movement');
 if(mobile){await page.reload({waitUntil:'domcontentloaded'});await ready();await click('#continueBtn');await page.locator('#streetLoss').waitFor({state:'visible'});assert.equal((await street()).failed,true,'reload bypassed the loss');}
 await retry();assert.equal((await state()).money,300);assert.equal((await state()).breakfastBread,0);assert.equal((await state()).task,0);
 console.log('BUMP_ESCAPE_FAILURE_RETRY_PASSED',JSON.stringify({mobile,persistedAcrossReload:mobile,wallet:300,bag:0}));
 await roadFixture('red');const redRelease=await hold();try{await page.locator('#streetLoss').waitFor({state:'visible',timeout:25000});}finally{await redRelease();}
 assert.match(await page.locator('#streetLoss p').innerText(),/حمرا/);await retry();
 await roadFixture('green');await page.waitForFunction(()=>EgyptStreetLife.inspect().signals.find(s=>s.id==='station').phase==='walk',null,{timeout:15000});
 assert.ok((await carState()).velocity<.01);await evidence('greenCrossing');
 const crossed=await walk(12.1);assert.ok(crossed.x>-18.2);
 await page.waitForFunction(()=>window.__journeyCar.velocity>.2,null,{timeout:20000});console.log('SIGNAL_WAIT_CROSS_RESUME_PASSED',JSON.stringify({mobile,crossed,car:await carState()}));
 await roadFixture('yield');const approach=await carState();assert.ok(approach.velocity>0);
 await page.waitForFunction(()=>window.__journeyCar.velocity<.01,null,{timeout:60000});const stoppedCar=await carState();assert.ok(stoppedCar.z>approach.z&&stoppedCar.z+stoppedCar.length/2<=-81.73,'car did not brake before the crossing');
 await evidence('yieldingCar');await walk(14);
 await page.waitForFunction(z=>window.__journeyCar.root.position.z>z+.15&&window.__journeyCar.velocity>.2,stoppedCar.z,{timeout:30000});
 console.log('UNCONTROLLED_YIELD_AND_RESUME_PASSED',JSON.stringify({mobile,approach,stoppedCar,resumed:await carState()}));
 await page.evaluate(()=>window.__egyptDebug.streetFixture().roots.forEach(root=>root.setEnabled(!/^storyActor_hero/.test(root.name))));
 // Complete the breakfast errand after the retry, through the real shop and home controls.
 await buy('bread');await buy('ful');assert.equal((await state()).money,263);
 const door=await page.evaluate(()=>{const h=EgyptLife.streetContext().world.home;return{x:h.x,z:h.z+1.25};});await teleport(door.x,door.z,Math.PI);
 await interact();await page.locator('#dialog').waitFor({state:'visible'});assert.equal((await state()).breakfastDelivered,true);assert.equal((await state()).task,1);assert.equal((await state()).money,283);
 assert.deepEqual(errors,[]);console.log('JOURNEY_FULL_STORY_PASSED',JSON.stringify({mobile,version:'11.24.0',state:await state()}));
}catch(e){
 console.error('JOURNEY_FAILURE_STATE',JSON.stringify(await page.evaluate(()=>({camera:window.__egyptDebug?.getCamera(),street:window.EgyptStreetLife?.inspect?.(),state:window.EgyptLife?.snapshot?.().state,error:document.getElementById('errorBox')?.textContent,prompt:document.getElementById('prompt')?.textContent})).catch(()=>null)));await evidence('journeyFailure').catch(()=>{});throw e;
}finally{clearTimeout(deadline);await browser.close();}
