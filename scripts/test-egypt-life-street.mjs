import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1000,height:700}});
 await page.goto(process.env.GAME_TEST_URL||'http://127.0.0.1:4173/');
 await page.waitForFunction(()=>window.__EGYPT_STREET_FIX?.ready,null,{timeout:60000});
 await page.click('#newGameBtn');
 await page.waitForFunction(()=>window.__V12_PROLOGUE?.played,null,{timeout:20000});
 console.log('SIGN_DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>{
  const scene=BABYLON.Engine.LastCreatedEngine.scenes[0];
  return scene.meshes.filter(m=>m.name.startsWith('v11_legacyShop_')).slice(0,3).map(m=>({name:m.name,enabled:m.isEnabled(),visible:m.isVisible,visibility:m.visibility,position:m.position.asArray(),rotation:m.rotation.asArray(),scaling:m.scaling.asArray(),vertices:m.getVerticesData('position'),indices:m.getIndices(),material:{alpha:m.material.alpha,cull:m.material.backFaceCulling,side:m.material.sideOrientation,texture:m.material.diffuseTexture.name,uscale:m.material.diffuseTexture.uScale,vscale:m.material.diffuseTexture.vScale},children:m.getChildMeshes().map(c=>({name:c.name,pos:c.position.asArray(),rot:c.rotation.asArray()}))}));
 })));
 await page.evaluate(()=>{
  const scene=BABYLON.Engine.LastCreatedEngine.scenes[0],sign=scene.meshes.find(m=>m.name==='v11_legacyShop_0');
  const camera=new BABYLON.FreeCamera('visualTest',sign.getAbsolutePosition().add(new BABYLON.Vector3(0,0,-6)),scene);
  camera.setTarget(sign.getAbsolutePosition());scene.activeCamera=camera;
 });
 await page.waitForTimeout(300);
 console.log('VISUAL_EVIDENCE_detail:'+(await page.screenshot({type:'jpeg',quality:60})).toString('base64'));
 // Save the exact canvas used by the sign, independently of scene occlusion.
 console.log('VISUAL_EVIDENCE_texture:'+await page.evaluate(()=>BABYLON.Engine.LastCreatedEngine.scenes[0].getMeshByName('v11_legacyShop_0').material.diffuseTexture.getContext().canvas.toDataURL('image/jpeg',.7).split(',')[1]));
}finally{await browser.close();}
