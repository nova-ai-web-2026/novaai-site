import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1000,height:700}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/game-v12-world.js*',async route=>{await new Promise(r=>setTimeout(r,1500));await route.continue();});
 await page.goto(process.env.GAME_TEST_URL||'http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
 await page.click('#newGameBtn');
 await page.waitForFunction(()=>window.__V12_PROLOGUE?.running&&window.__EGYPT_FRONTAGES?.ready&&window.__EGYPT_PEOPLE?.ready,null,{timeout:60000});
 assert.equal(await page.evaluate(()=>window.__V12_PROLOGUE.starts),1,'early click must start one introduction');
 assert.equal(await page.evaluate(()=>document.body.classList.contains('game-started')),false,'gameplay started during introduction');
 await page.waitForFunction(()=>window.__V12_PROLOGUE.typed>12);
 console.log('VISUAL_EVIDENCE_waking:'+(await page.screenshot({type:'jpeg',quality:55})).toString('base64'));
 assert.ok(await page.evaluate(()=>window.__V1116_SFX_API.state().events.typing)>0,'no typing sound events');
 await page.click('#storyMute');await page.waitForFunction(()=>window.__V1116_SFX_API.state().muted);
 const muted=await page.evaluate(()=>window.__V1116_SFX_API.state().playCalls);
 await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__V1116_SFX_API.state().playCalls),muted,'typing ignored mute');
 await page.click('#storyMute');await page.waitForFunction(()=>!window.__V1116_SFX_API.state().muted);
 await page.click('#storyNext');
 // One tap reveals text; the next advances the scene. It never drops into gameplay.
 if(await page.evaluate(()=>window.__V12_PROLOGUE.beat)===0)await page.click('#storyNext');
 assert.ok(await page.evaluate(()=>window.__V12_PROLOGUE.beat)>=1);
 await page.click('#v12Skip');
 await page.waitForFunction(()=>window.__V12_PROLOGUE?.played&&!window.__V12_PROLOGUE.running,null,{timeout:10000});
 assert.ok(await page.evaluate(()=>document.body.classList.contains('game-started')));
 assert.deepEqual(await page.evaluate(()=>{const s=BABYLON.Engine.LastCreatedEngine.scenes[0];return s.cameras.filter(c=>c.name==='egyptWakeCamera').map(c=>c.name);}),[],'intro camera leaked after skip');
 const mounts=await page.evaluate(()=>BABYLON.Engine.LastCreatedEngine.scenes[0].meshes.filter(m=>m.isEnabled()&&m.metadata?.readableArabic&&!m.name.endsWith('_readableBack')).filter(m=>!m.metadata.mount||!m.metadata.supports?.every(n=>BABYLON.Engine.LastCreatedEngine.scenes[0].getMeshByName(n)?.isEnabled())).map(m=>m.name));
 assert.deepEqual(mounts,[],'unsupported visible sign');
 const people=await page.evaluate(()=>window.__EGYPT_PEOPLE.identities);
 assert.equal(people.length,28);assert.ok(people.filter(p=>p.presentation==='woman').length>=9);assert.ok(people.filter(p=>p.presentation==='man').length>=14);
 assert.deepEqual(errors,[]);
 const signs=await page.evaluate(()=>{
  const scene=BABYLON.Engine.LastCreatedEngine.scenes[0];
  return scene.meshes.filter(m=>m.metadata?.readableArabic&&!m.name.endsWith('_readableBack')).map(m=>{
   const c=m.material.diffuseTexture.getContext(),data=c.getImageData(0,0,c.canvas.width,c.canvas.height).data;
   let opaque=0;const colors=new Set();for(let i=0;i<data.length;i+=16){if(data[i+3]>0)opaque++;colors.add(data[i]+','+data[i+1]+','+data[i+2]);}
   return {name:m.name,opaque,colors:colors.size};
  });
 });
 assert.ok(signs.length>20);assert.deepEqual(signs.filter(s=>s.opaque===0||s.colors<2),[],'a sign texture lost its painted content');
 console.log('Painted Arabic signs verified',signs.length);
 await page.evaluate(()=>{
  const scene=BABYLON.Engine.LastCreatedEngine.scenes[0],sign=scene.meshes.find(m=>m.name==='v11_legacyShop_0');
  const camera=new BABYLON.FreeCamera('visualTest',sign.getAbsolutePosition().add(new BABYLON.Vector3(0,0,-6)),scene);
  camera.setTarget(sign.getAbsolutePosition());scene.activeCamera=camera;
 });
 await page.waitForTimeout(300);
 console.log('VISUAL_EVIDENCE_detail:'+(await page.screenshot({type:'jpeg',quality:60})).toString('base64'));
 // Save the exact canvas used by the sign, independently of scene occlusion.
 console.log('VISUAL_EVIDENCE_texture:'+await page.evaluate(()=>BABYLON.Engine.LastCreatedEngine.scenes[0].getMeshByName('v11_legacyShop_0').material.diffuseTexture.getContext().canvas.toDataURL('image/jpeg',.7).split(',')[1]));
 await page.evaluate(()=>{
  const scene=BABYLON.Engine.LastCreatedEngine.scenes[0],camera=scene.activeCamera;
  camera.position.set(-18,2.2,-26);camera.setTarget(new BABYLON.Vector3(0,5,-13));camera.fov=1.15;
 });
 await page.waitForTimeout(250);
 console.log('VISUAL_EVIDENCE_street:'+(await page.screenshot({type:'jpeg',quality:60})).toString('base64'));
 // Render the same animated rigs at close range for silhouette review.
 await page.evaluate(()=>{
  const scene=BABYLON.Engine.LastCreatedEngine.scenes[0];
  window.__testPeopleRoot=new BABYLON.TransformNode('testPeopleReview',scene);
  for(const [slot,index] of [0,1,5,7].entries()){
   const original=scene.getTransformNodeByName('v9_personVisual_'+index);
   const model=original.clone('testPerson_'+index,window.__testPeopleRoot,false);
   model.position.set(slot*1.2,0,0);model.rotation.y=0;
  }
  const camera=scene.activeCamera;camera.position.set(1.8,1.6,-4.7);camera.setTarget(new BABYLON.Vector3(1.8,1.1,0));camera.fov=.9;
  window.__testPeopleRoot.position.set(-24,0,-24);camera.position.addInPlace(window.__testPeopleRoot.position);camera.setTarget(new BABYLON.Vector3(-22.2,1.1,-24));
 });
 await page.waitForTimeout(200);
 console.log('VISUAL_EVIDENCE_people:'+(await page.screenshot({type:'jpeg',quality:60})).toString('base64'));
 // Continuing a saved game skips the story and restores ordinary play.
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__V119_READY,null,{timeout:60000});
 await page.click('#continueBtn');
 await page.waitForFunction(()=>document.body.classList.contains('game-started'));
 assert.equal(await page.evaluate(()=>window.__V12_PROLOGUE.running),false);
 assert.equal(await page.evaluate(()=>window.__V12_PROLOGUE.starts),0);
 console.log('Story, characters, mounted signs, skip and continue verified');
}finally{await browser.close();}
