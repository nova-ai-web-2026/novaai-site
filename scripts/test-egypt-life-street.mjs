import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1000,height:700}});
 await page.goto(process.env.GAME_TEST_URL||'http://127.0.0.1:4173/');
 await page.waitForFunction(()=>window.__EGYPT_STREET_FIX?.ready,null,{timeout:60000});
 await page.click('#newGameBtn');
 await page.waitForFunction(()=>window.__V12_PROLOGUE?.played,null,{timeout:20000});
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
}finally{await browser.close();}
