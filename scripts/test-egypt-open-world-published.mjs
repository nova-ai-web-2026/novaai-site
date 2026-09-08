import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const base=process.env.GAME_TEST_URL;
assert.ok(base,'GAME_TEST_URL is required');
const expected=process.env.GAME_EXPECTED_COMMIT||'unknown';
const executablePath=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const report={base,expected,desktop:{},mobile:{},ok:false};

function diagnostics(page,target){
  target.errors=[];target.consoleErrors=[];target.failedRequests=[];target.httpErrors=[];
  page.on('pageerror',error=>target.errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')target.consoleErrors.push(message.text());});
  page.on('requestfailed',request=>target.failedRequests.push({url:request.url(),error:request.failure()?.errorText||'request failed'}));
  page.on('response',response=>{if(response.status()>=400)target.httpErrors.push({url:response.url(),status:response.status()});});
}

async function openReady(page,target){
  const response=await page.goto(`${base}?verify=${expected}`,{waitUntil:'domcontentloaded',timeout:60000});
  assert.ok(response&&response.ok(),`Published page returned HTTP ${response?.status()}`);
  target.http=response.status();
  await page.locator('#boot').waitFor({state:'visible',timeout:15000});
  await page.waitForFunction(()=>window.__SHWARE3_READY===true,null,{timeout:60000});
  target.engineSource=await page.evaluate(()=>window.__SHWARE3_ENGINE_SOURCE);
  assert.equal(await page.locator('#fatalError').isVisible(),false,'Fatal startup screen is visible');
  assert.equal(await page.locator('#newGame').isEnabled(),true,'New game stayed disabled after boot');
}

async function runtimeState(page){
  return page.evaluate(()=>{
    const engine=window.BABYLON?.Engine?.LastCreatedEngine,scene=engine?.scenes?.[0],canvas=document.getElementById('game'),rect=canvas?.getBoundingClientRect();
    return {debug:window.__SHWARE3_DEBUG?.state?.(),meshes:scene?.meshes?.length||0,fps:engine?.getFps?.()||0,canvas:rect?{width:rect.width,height:rect.height}:null,hudHidden:document.getElementById('hud')?.hidden,objective:document.getElementById('objective')?.textContent||'',fatalVisible:!document.getElementById('fatalError')?.hidden};
  });
}

function assertClean(target,label){
  assert.deepEqual(target.errors,[],`${label} page errors: ${target.errors.join(' | ')}`);
  assert.deepEqual(target.failedRequests,[],`${label} failed requests: ${JSON.stringify(target.failedRequests)}`);
  assert.deepEqual(target.httpErrors,[],`${label} HTTP errors: ${JSON.stringify(target.httpErrors)}`);
  assert.deepEqual(target.consoleErrors,[],`${label} console errors: ${target.consoleErrors.join(' | ')}`);
}

try{
  const desktop=await browser.newPage({viewport:{width:1280,height:800}});diagnostics(desktop,report.desktop);await openReady(desktop,report.desktop);
  await desktop.click('#newGame');
  await desktop.waitForFunction(()=>document.getElementById('hud')?.hidden===false&&window.__SHWARE3_DEBUG?.state?.().meshes>=20,null,{timeout:30000});
  report.desktop.runtime=await runtimeState(desktop);
  assert.ok(report.desktop.runtime.meshes>=20,'Desktop world did not build');assert.equal(report.desktop.runtime.hudHidden,false,'Desktop HUD hidden');assert.equal(report.desktop.runtime.fatalVisible,false,'Desktop fatal screen visible');
  await desktop.screenshot({path:'egypt-open-world-desktop.png',fullPage:true});assertClean(report.desktop,'Desktop');await desktop.close();

  const mobile=await browser.newPage({viewport:{width:412,height:915},deviceScaleFactor:2.625,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 16; SM-S926B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'});
  diagnostics(mobile,report.mobile);await openReady(mobile,report.mobile);await mobile.tap('#newGame');
  await mobile.waitForFunction(()=>document.getElementById('hud')?.hidden===false&&window.__SHWARE3_DEBUG?.state?.().started===true,null,{timeout:30000});
  assert.equal(await mobile.locator('#mobileControls').isVisible(),true,'Mobile controls are not visible');assert.equal(await mobile.locator('#joy').isVisible(),true,'Joystick missing');assert.equal(await mobile.locator('#act').isVisible(),true,'Interact button missing');assert.equal(await mobile.locator('#run').isVisible(),true,'Run button missing');

  const before=await mobile.evaluate(()=>window.__SHWARE3_DEBUG.state());
  await mobile.evaluate(()=>{
    const joy=document.getElementById('joy'),r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,id=17;
    const fire=(type,x,y)=>joy.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,buttons:type==='pointerup'?0:1}));
    fire('pointerdown',cx,cy);fire('pointermove',cx+r.width*.24,cy-r.height*.24);window.__qaJoy={joy,id,cx,cy,r};
  });
  await mobile.waitForTimeout(1800);
  await mobile.evaluate(()=>{const q=window.__qaJoy;q.joy.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,pointerId:q.id,pointerType:'touch',isPrimary:true,clientX:q.cx+q.r.width*.24,clientY:q.cy-q.r.height*.24,buttons:0}));});
  const nearDoor=await mobile.evaluate(()=>window.__SHWARE3_DEBUG.state());
  const moved=Math.hypot(nearDoor.player.x-before.player.x,nearDoor.player.z-before.player.z);report.mobile.joystickMovement=moved;assert.ok(moved>3.8,`Touch joystick did not move player enough: ${moved}`);

  const doorDistance=Math.hypot(nearDoor.player.x+18,nearDoor.player.z+10.48);report.mobile.doorDistanceBeforeInteract=doorDistance;assert.ok(doorDistance<2.25,`Joystick did not reach apartment door: ${doorDistance}`);
  await mobile.tap('#act');await mobile.waitForTimeout(250);
  const doorOpen=await mobile.evaluate(()=>window.BABYLON.Engine.LastCreatedEngine.scenes[0].getMeshByName('aptDoor')?.metadata?.open===true);assert.ok(doorOpen,'Mobile interact button did not open apartment door');

  await mobile.evaluate(()=>{
    const joy=document.getElementById('joy'),r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,id=18;
    const fire=(type,x,y)=>joy.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,buttons:type==='pointerup'?0:1}));
    fire('pointerdown',cx,cy);fire('pointermove',cx,cy-r.height*.30);window.__qaJoy2={joy,id,cx,cy,r};
  });
  await mobile.waitForTimeout(650);
  await mobile.evaluate(()=>{const q=window.__qaJoy2;q.joy.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,pointerId:q.id,pointerType:'touch',isPrimary:true,clientX:q.cx,clientY:q.cy-q.r.height*.30,buttons:0}));});
  await mobile.waitForFunction(()=>window.__SHWARE3_DEBUG?.state?.().mission==='reach_shop_side',null,{timeout:5000});
  report.mobile.runtime=await runtimeState(mobile);assert.equal(report.mobile.runtime.hudHidden,false,'Mobile HUD hidden');assert.equal(report.mobile.runtime.fatalVisible,false,'Mobile fatal screen visible');assert.equal(report.mobile.runtime.debug.touchDevice,true,'Android emulation was not detected as touch device');
  await mobile.screenshot({path:'egypt-open-world-mobile.png',fullPage:true});assertClean(report.mobile,'Mobile');await mobile.close();

  report.ok=true;console.log('Published Egyptian open-world recovery build verified on desktop and Android touch',JSON.stringify({desktop:report.desktop.runtime,mobile:report.mobile.runtime,moved:report.mobile.joystickMovement}));
}catch(error){report.failure=error.stack||error.message;console.error(error);throw error;}finally{fs.writeFileSync('egypt-open-world-browser-report.json',JSON.stringify(report,null,2));await browser.close();}
