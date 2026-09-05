import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const camera=()=>page.evaluate(()=>{const c=BABYLON.Engine.LastCreatedEngine.scenes[0].activeCamera;return {name:c.name,p:c.position.asArray(),r:c.rotation.asArray()};});
const drag=async(x,y,dx,dy)=>{const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx,y:y+dy}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();};
try{
 await page.addInitScript(()=>{let once=false;new MutationObserver(()=>{if(!once&&document.getElementById('v12Prologue')?.classList.contains('active')){once=true;document.getElementById('storyPace').click();}}).observe(document,{subtree:true,childList:true,attributes:true});});
 await page.goto(process.env.GAME_TEST_URL||'http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__V119_READY&&window.__EGYPT_CAST?.ready,null,{timeout:60000});
 const before=await camera();assert.equal(before.name,'v1116PreviewCamera');
 await page.waitForTimeout(1200);await drag(340,350,-50,35);assert.deepEqual(await camera(),before,'menu camera drifts or responds to drag');
 console.log('VISUAL_EVIDENCE_menu:'+(await page.screenshot({type:'jpeg',quality:55})).toString('base64'));
 await page.tap('#newGameBtn');await page.waitForFunction(()=>window.__V12_PROLOGUE.running);
 const visible=async(role)=>{
  const result=await page.evaluate(role=>{
   const B=BABYLON,s=B.Engine.LastCreatedEngine.scenes[0],c=s.activeCamera,h=s.getMeshByName(window.__EGYPT_CAST.actors[role].head);h.computeWorldMatrix(true);
   const pos=h.getAbsolutePosition(),engine=s.getEngine(),v=c.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight());
   const p=B.Vector3.Project(pos,B.Matrix.Identity(),s.getTransformMatrix(),v),rect=document.getElementById('game').getBoundingClientRect();
   const x=p.x/engine.getRenderWidth()*rect.width,y=p.y/engine.getRenderHeight()*rect.height;
   const ray=new B.Ray(c.position,pos.subtract(c.position).normalize(),B.Vector3.Distance(c.position,pos)+.25);
   const hit=s.pickWithRay(ray,m=>m.isEnabled()&&m.isVisible&&m.visibility>0&&m.getTotalVertices()>0);
   return {x,y,z:p.z,caption:document.querySelector('.story-caption').getBoundingClientRect().top,hit:hit?.pickedMesh?.name,role:hit?.pickedMesh?.metadata?.storyActor};
  },role);
  console.log('ACTOR_VISIBILITY',role,result);assert.equal(result.role,role,'actor face is obstructed');assert.ok(result.x>15&&result.x<375&&result.y>130&&result.y<result.caption-15&&result.z>0&&result.z<1,'actor outside visible frame');
 };
 await page.waitForTimeout(1900);await visible('hero');
 console.log('VISUAL_EVIDENCE_mobileHero:'+(await page.screenshot({type:'jpeg',quality:60})).toString('base64'));
 while(await page.evaluate(()=>window.__V12_PROLOGUE.beat)<2)await page.tap('#storyNext');
 await page.waitForTimeout(250);await visible('mother');
 console.log('VISUAL_EVIDENCE_mobileMother:'+(await page.screenshot({type:'jpeg',quality:60})).toString('base64'));
 await page.tap('#v12Skip');await page.waitForFunction(()=>document.body.classList.contains('game-started'));
 const start=await camera();assert.equal(start.name,'player');await drag(290,320,65,12);
 await page.waitForTimeout(300);const looked=await camera();assert.ok(Math.abs(looked.r[1]-start.r[1])>.05,'touch look does not rotate player');
 await page.waitForTimeout(700);const idle=await camera();assert.ok(Math.abs(idle.r[1]-looked.r[1])<.001,'camera keeps rotating after finger released');
 const joy=await page.locator('#joy').boundingBox();assert.ok(joy);
 const cdp=await page.context().newCDPSession(page),x=joy.x+joy.width/2,y=joy.y+joy.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-38}]});
 await page.waitForFunction(p=>{const c=window.__egyptDebug.getCamera();return Math.hypot(c.x-p[0],c.z-p[2])>1.2;},idle.p,{timeout:25000});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 assert.deepEqual(errors,[]);console.log('Static menu, visible actors, touch look, release and movement verified');
}finally{await browser.close();}
