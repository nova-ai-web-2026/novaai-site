import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const base=process.env.GAME_TEST_URL;
assert.ok(base,'GAME_TEST_URL is required');
const expected=process.env.GAME_EXPECTED_COMMIT||'unknown';
const executablePath=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const report={base,expected,desktop:{},mobile:{},ok:false};
const externalEngine=/https:\/\/(cdn\.babylonjs\.com|cdn\.jsdelivr\.net|unpkg\.com)\//;

function diagnostics(page,target){
  target.errors=[];target.consoleErrors=[];target.failedRequests=[];target.httpErrors=[];
  page.on('pageerror',error=>target.errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')target.consoleErrors.push(message.text());});
  page.on('requestfailed',request=>target.failedRequests.push({url:request.url(),error:request.failure()?.errorText||'request failed'}));
  page.on('response',response=>{if(response.status()>=400)target.httpErrors.push({url:response.url(),status:response.status()});});
}

async function openReady(page,target){
  await page.route(externalEngine,route=>route.abort());
  const response=await page.goto(`${base}?verify=${expected}`,{waitUntil:'domcontentloaded',timeout:60000});
  assert.ok(response&&response.ok(),`Published page returned HTTP ${response?.status()}`);
  target.http=response.status();
  await page.locator('#boot').waitFor({state:'visible',timeout:15000});
  await page.waitForFunction(()=>window.__SHWARE3_READY===true,null,{timeout:60000});
  await page.waitForFunction(()=>window.__SHWARE3_POLISH_READY===true,null,{timeout:30000});
  target.engineSource=await page.evaluate(()=>window.__SHWARE3_ENGINE_SOURCE);
  assert.match(String(target.engineSource),/vendor\/babylon\.js/,`Local Babylon engine was not used: ${target.engineSource}`);
  assert.equal(await page.locator('#fatalError').isVisible(),false,'Fatal startup screen is visible');
  assert.equal(await page.locator('#newGame').isEnabled(),true,'New game stayed disabled after boot');
}

async function runtimeState(page){
  return page.evaluate(()=>{
    const engine=window.BABYLON?.Engine?.LastCreatedEngine,scene=engine?.scenes?.[0],canvas=document.getElementById('game'),rect=canvas?.getBoundingClientRect();
    const wheelCount=scene?.meshes?.filter(m=>m.name.includes('-wheel')).length||0;
    const homeWall=scene?.getMaterialByName('v32-home-wall');
    const polish=window.__SHWARE3_POLISH_STATE||null;
    const blocker=polish?.lastBlocker?scene?.getMeshByName(polish.lastBlocker):null;
    return {
      debug:window.__SHWARE3_DEBUG?.state?.(),polish,polishBuild:window.__SHWARE3_POLISH_BUILD||null,blockerVisibility:blocker?.visibility??null,
      meshes:scene?.meshes?.length||0,fps:engine?.getFps?.()||0,canvas:rect?{width:rect.width,height:rect.height}:null,
      hudHidden:document.getElementById('hud')?.hidden,objective:document.getElementById('objective')?.textContent||'',fatalVisible:!document.getElementById('fatalError')?.hidden,
      playerHead:!!scene?.getMeshByName('yassin-head'),playerTorso:!!scene?.getMeshByName('yassin-torso'),leftShoulder:!!scene?.getTransformNodeByName('yassin-armL-joint'),leftHip:!!scene?.getTransformNodeByName('yassin-legL-joint'),
      sofa:!!scene?.getMeshByName('sofa-base'),kitchen:!!scene?.getMeshByName('kitchen-run'),window:!!scene?.getMeshByName('window-glass'),facadeWindow:!!scene?.getMeshByName('apt-front-window'),
      livingRug:!!scene?.getMeshByName('v32-living-rug'),tvPanel:!!scene?.getMeshByName('v32-tv-panel'),plant:!!scene?.getMeshByName('v32-plant-pot'),ceilingPanel:!!scene?.getMeshByName('v32-ceiling-panel'),
      homeWall:homeWall?{r:homeWall.diffuseColor.r,g:homeWall.diffuseColor.g,b:homeWall.diffuseColor.b}:null,wheelCount
    };
  });
}

function assertV32(runtime,label){
  assert.equal(runtime.debug?.build,'v3-motion-home-2',`${label} base build missing`);
  assert.equal(runtime.debug?.controlsBuild,'v32-controls-direction-1',`${label} corrected controls build missing`);
  assert.equal(runtime.polishBuild,'v32-visual-motion-polish-1',`${label} V3.2 polish build missing`);
  assert.equal(runtime.polish?.build,'v32-visual-motion-polish-1',`${label} V3.2 polish state missing`);
  assert.equal(runtime.polish?.occlusionEnabled,true,`${label} camera occlusion polish disabled`);
  assert.equal(runtime.polish?.npcCount,12,`${label} pedestrian polish did not attach to all NPCs`);
  for(const [key,msg] of [['playerHead','player head'],['playerTorso','player torso'],['leftShoulder','shoulder joint'],['leftHip','hip joint'],['sofa','sofa'],['kitchen','kitchen'],['window','window'],['facadeWindow','facade window'],['livingRug','V3.2 rug'],['tvPanel','V3.2 TV wall panel'],['plant','V3.2 plant'],['ceilingPanel','V3.2 ceiling panel']])assert.equal(runtime[key],true,`${label} ${msg} missing`);
  assert.ok(runtime.homeWall&&runtime.homeWall.r>.65&&runtime.homeWall.g>.55,`${label} apartment wall polish is still too dark`);
  assert.ok(runtime.wheelCount>=16,`${label} vehicle wheels missing`);
  assert.ok(runtime.meshes>=180,`${label} V3.2 detail did not build`);
}

function assertCameraSightline(runtime,label){
  const blocker=runtime.polish?.lastBlocker||null;
  if(!blocker){
    assert.equal(runtime.blockerVisibility,null,`${label} reported no blocker but exposed blocker visibility`);
    return;
  }
  assert.ok(runtime.polish?.fadedBlockers?.includes(blocker),`${label} detected blocker was not marked faded: ${blocker}`);
  assert.ok(runtime.blockerVisibility!==null&&runtime.blockerVisibility<.25,`${label} camera blocker stayed opaque: ${blocker} visibility=${runtime.blockerVisibility}`);
}

function assertClean(target,label){
  assert.deepEqual(target.errors,[],`${label} page errors: ${target.errors.join(' | ')}`);
  assert.deepEqual(target.failedRequests,[],`${label} failed requests: ${JSON.stringify(target.failedRequests)}`);
  assert.deepEqual(target.httpErrors,[],`${label} HTTP errors: ${JSON.stringify(target.httpErrors)}`);
  assert.deepEqual(target.consoleErrors,[],`${label} console errors: ${target.consoleErrors.join(' | ')}`);
}

async function npcZ(page){return page.evaluate(()=>Array.from({length:12},(_,i)=>window.BABYLON.Engine.LastCreatedEngine.scenes[0].getMeshByName(`npc-${i}-collider`)?.position.z??null));}
async function putPlayer(page,x,z){await page.evaluate(({x,z})=>{const scene=window.BABYLON.Engine.LastCreatedEngine.scenes[0],p=scene.getMeshByName('yassin-collider');p.position.x=x;p.position.y=1.05;p.position.z=z;},{x,z});await page.waitForTimeout(700);}
async function controlFrame(page){return page.evaluate(()=>{const s=window.__SHWARE3_DEBUG.state(),dx=s.player.x-s.camera.x,dz=s.player.z-s.camera.z,len=Math.hypot(dx,dz)||1,fx=dx/len,fz=dz/len;return{player:s.player,camera:s.camera,forward:{x:fx,z:fz},right:{x:fz,z:-fx}};});}
async function joystick(page,{side=0,forward=0,id,duration=750}){await page.evaluate(({side,forward,id})=>{const joy=document.getElementById('joy'),r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;const x=cx+r.width*.28*side,y=cy-r.height*.28*forward;const fire=(type,px,py)=>joy.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',isPrimary:true,clientX:px,clientY:py,buttons:type==='pointerup'?0:1}));fire('pointerdown',cx,cy);fire('pointermove',x,y);window.__qaControl={joy,id,x,y};},{side,forward,id});await page.waitForTimeout(duration);await page.evaluate(()=>{const q=window.__qaControl;q.joy.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,pointerId:q.id,pointerType:'touch',isPrimary:true,clientX:q.x,clientY:q.y,buttons:0}));});await page.waitForTimeout(180);}

try{
  const desktop=await browser.newPage({viewport:{width:1280,height:800}});diagnostics(desktop,report.desktop);await openReady(desktop,report.desktop);await desktop.click('#newGame');
  await desktop.waitForFunction(()=>document.getElementById('hud')?.hidden===false&&window.__SHWARE3_DEBUG?.state?.().meshes>=170,null,{timeout:30000});
  const trafficBefore=await desktop.evaluate(()=>window.__SHWARE3_DEBUG.state().traffic.map(v=>({...v}))),npcBefore=await npcZ(desktop);await desktop.waitForTimeout(1200);const trafficAfter=await desktop.evaluate(()=>window.__SHWARE3_DEBUG.state().traffic.map(v=>({...v}))),npcAfter=await npcZ(desktop);
  report.desktop.trafficTravel=trafficAfter.map((v,i)=>Math.abs(v.x-trafficBefore[i].x));report.desktop.npcLateralTravel=npcAfter.map((z,i)=>Math.abs((z??0)-(npcBefore[i]??0)));
  assert.ok(report.desktop.trafficTravel.some(v=>v>.4),'Traffic did not move');assert.ok(trafficAfter.every(v=>Math.abs(v.z)<=2.3),'Traffic left its lane');assert.ok(report.desktop.npcLateralTravel.some(v=>v>.015),`Pedestrians did not gain V3.2 lateral variation: ${report.desktop.npcLateralTravel}`);
  report.desktop.runtime=await runtimeState(desktop);assertV32(report.desktop.runtime,'Desktop');assert.ok(report.desktop.runtime.polish.wheelMotion>.1,'Desktop wheel animation did not advance');await desktop.screenshot({path:'egypt-open-world-desktop.png',fullPage:true});assertClean(report.desktop,'Desktop');await desktop.close();

  const mobile=await browser.newPage({viewport:{width:412,height:915},deviceScaleFactor:2.625,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 16; SM-S926B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'});diagnostics(mobile,report.mobile);await openReady(mobile,report.mobile);await mobile.tap('#newGame');
  await mobile.waitForFunction(()=>window.__SHWARE3_DEBUG?.state?.().started===true,null,{timeout:30000});assert.equal(await mobile.locator('#mobileControls').isVisible(),true,'Mobile controls are not visible');

  await putPlayer(mobile,-3,-7);const rightBefore=await controlFrame(mobile);await joystick(mobile,{side:1,forward:0,id:31});const rightAfter=await controlFrame(mobile);const rdx=rightAfter.player.x-rightBefore.player.x,rdz=rightAfter.player.z-rightBefore.player.z,rightDot=rdx*rightBefore.right.x+rdz*rightBefore.right.z;report.mobile.rightControl={distance:Math.hypot(rdx,rdz),dot:rightDot};assert.ok(rightDot>.65,`Joystick RIGHT moved opposite/sideways relative to screen: dot=${rightDot}`);
  await putPlayer(mobile,-3,-7);const forwardBefore=await controlFrame(mobile);await joystick(mobile,{side:0,forward:1,id:32});const forwardAfter=await controlFrame(mobile);const fdx=forwardAfter.player.x-forwardBefore.player.x,fdz=forwardAfter.player.z-forwardBefore.player.z,forwardDot=fdx*forwardBefore.forward.x+fdz*forwardBefore.forward.z;report.mobile.forwardControl={distance:Math.hypot(fdx,fdz),dot:forwardDot};assert.ok(forwardDot>.65,`Joystick UP moved backward relative to screen: dot=${forwardDot}`);

  await putPlayer(mobile,-18,-10.7);await mobile.tap('#act');await mobile.waitForTimeout(250);const doorOpen=await mobile.evaluate(()=>window.BABYLON.Engine.LastCreatedEngine.scenes[0].getMeshByName('aptDoor')?.metadata?.open===true);assert.ok(doorOpen,'Mobile interact button did not open apartment door');
  await putPlayer(mobile,-18,-9.45);await mobile.waitForTimeout(1200);report.mobile.runtime=await runtimeState(mobile);assertV32(report.mobile.runtime,'Mobile');assert.equal(report.mobile.runtime.debug.touchDevice,true,'Android emulation not detected');assertCameraSightline(report.mobile.runtime,'Mobile');assert.ok(report.mobile.runtime.polish.wheelMotion>.1,'Mobile wheel animation did not advance');
  await mobile.screenshot({path:'egypt-open-world-mobile.png',fullPage:true});assertClean(report.mobile,'Mobile');await mobile.close();

  report.ok=true;console.log('Published Shaware3 El Noor V3.2 verified: corrected screen-relative controls, clear-or-faded camera sightline, brighter home, varied pedestrians and animated wheels',JSON.stringify({right:report.mobile.rightControl,forward:report.mobile.forwardControl,desktop:report.desktop.runtime,mobile:report.mobile.runtime,engine:report.mobile.engineSource}));
}catch(error){report.failure=error.stack||error.message;console.error(error);throw error;}finally{fs.writeFileSync('egypt-open-world-browser-report.json',JSON.stringify(report,null,2));await browser.close();}
