import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const base=process.env.GAME_TEST_URL;
assert.ok(base,'GAME_TEST_URL is required');
const expected=process.env.GAME_EXPECTED_COMMIT||'unknown';
const executablePath=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const baseOrigin=new URL(base).origin;
const report={base,expected,profiles:{}};
const profiles=[
  {name:'desktop',screenshot:'egypt-open-world-desktop.png',context:{viewport:{width:1280,height:800}}},
  {name:'android',screenshot:'egypt-open-world-android.png',context:{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3,userAgent:'Mozilla/5.0 (Linux; Android 16; SM-S926B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'}}
];

try{
  for(const profile of profiles){
    const entry={errors:[],consoleErrors:[],failedRequests:[],httpErrors:[],requests:[],checks:{}};
    report.profiles[profile.name]=entry;
    const context=await browser.newContext(profile.context);
    const page=await context.newPage();
    await page.route('https://cdn.babylonjs.com/**',route=>route.abort());
    page.on('pageerror',error=>entry.errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')entry.consoleErrors.push(message.text());});
    page.on('request',request=>entry.requests.push({url:request.url(),type:request.resourceType()}));
    page.on('requestfailed',request=>entry.failedRequests.push({url:request.url(),error:request.failure()?.errorText||'request failed'}));
    page.on('response',response=>{if(response.status()>=400)entry.httpErrors.push({url:response.url(),status:response.status()});});

    const response=await page.goto(`${base}?verify=${expected}&profile=${profile.name}`,{waitUntil:'domcontentloaded',timeout:60000});
    assert.ok(response,'No navigation response');
    assert.ok(response.ok(),`Published page returned HTTP ${response.status()} on ${profile.name}`);
    entry.checks.http=response.status();

    await page.locator('#boot').waitFor({state:'visible',timeout:15000});
    await page.locator('#newGame').waitFor({state:'visible',timeout:15000});
    await page.waitForFunction(()=>window.__EGYPT_OPEN_WORLD_READY&&window.BABYLON?.Engine?.LastCreatedEngine,null,{timeout:30000});
    assert.equal(await page.locator('#fatal').isHidden(),true,`Fatal screen visible before start on ${profile.name}`);
    entry.checks.bootText=(await page.locator('#boot').innerText()).slice(0,260);
    assert.match(entry.checks.bootText,/شوارع/);
    assert.match(entry.checks.bootText,/المحرك جاهز/);

    const localEngine=entry.requests.find(r=>r.type==='script'&&r.url.includes('/egypt-open-world-aaa/vendor/babylon.js'));
    assert.ok(localEngine,`Local Babylon engine was not requested on ${profile.name}`);
    const externalScripts=entry.requests.filter(r=>r.type==='script'&&new URL(r.url).origin!==baseOrigin);
    assert.deepEqual(externalScripts,[],`External runtime scripts found on ${profile.name}: ${JSON.stringify(externalScripts)}`);

    if(profile.name==='android')await page.tap('#newGame');else await page.click('#newGame');
    await page.waitForFunction(()=>{
      const engine=window.BABYLON?.Engine?.LastCreatedEngine,scene=engine?.scenes?.[0];
      return document.getElementById('hud')?.hidden===false&&scene&&scene.meshes.length>=20;
    },null,{timeout:45000});

    const before=await page.evaluate(()=>{
      const engine=window.BABYLON.Engine.LastCreatedEngine,scene=engine.scenes[0],player=scene.getMeshByName('player'),canvas=document.getElementById('game'),rect=canvas.getBoundingClientRect();
      return {meshes:scene.meshes.length,fps:engine.getFps(),canvas:{width:rect.width,height:rect.height},hudHidden:document.getElementById('hud').hidden,objective:document.getElementById('objective').textContent,babylon:!!window.BABYLON,ready:window.__EGYPT_OPEN_WORLD_READY,player:{x:player.position.x,z:player.position.z}};
    });
    entry.checks.runtime=before;
    assert.ok(before.babylon,'Babylon.js did not load');
    assert.ok(before.meshes>=20,`World did not build; only ${before.meshes} meshes on ${profile.name}`);
    assert.ok(before.canvas.width>300&&before.canvas.height>300,`Canvas has invalid size on ${profile.name}`);
    assert.equal(before.hudHidden,false,`HUD did not enter game state on ${profile.name}`);
    assert.match(before.objective,/اخرج من الشقة/);

    if(profile.name==='android'){
      assert.equal(before.ready.mobile,true,'Android profile did not enter mobile mode');
      assert.ok(before.ready.hardwareScaling>=1.5,'Mobile hardware scaling optimization is not active');
      assert.equal(await page.locator('#mobileControls').isVisible(),true,'Touch controls are not visible on Android');
      await page.locator('#touchRight').dispatchEvent('pointerdown',{pointerType:'touch',pointerId:1,isPrimary:true});
      await page.waitForTimeout(1800);
      await page.locator('#touchRight').dispatchEvent('pointerup',{pointerType:'touch',pointerId:1,isPrimary:true});
    }else{
      await page.keyboard.down('d');
      await page.waitForTimeout(1800);
      await page.keyboard.up('d');
    }
    await page.waitForTimeout(300);
    const after=await page.evaluate(()=>{const player=window.BABYLON.Engine.LastCreatedEngine.scenes[0].getMeshByName('player');return{x:player.position.x,z:player.position.z};});
    entry.checks.playerAfterMove=after;
    assert.ok(Math.hypot(after.x-before.player.x,after.z-before.player.z)>.3,`${profile.name} controls did not move the player`);

    await page.screenshot({path:profile.screenshot,fullPage:true});
    assert.deepEqual(entry.errors,[],`Page errors on ${profile.name}: ${entry.errors.join(' | ')}`);
    assert.deepEqual(entry.failedRequests,[],`Failed requests on ${profile.name}: ${JSON.stringify(entry.failedRequests)}`);
    assert.deepEqual(entry.httpErrors,[],`HTTP errors on ${profile.name}: ${JSON.stringify(entry.httpErrors)}`);
    assert.deepEqual(entry.consoleErrors,[],`Console errors on ${profile.name}: ${entry.consoleErrors.join(' | ')}`);
    entry.ok=true;
    console.log(`Published ${profile.name} build verified`,JSON.stringify(entry.checks));
    await context.close();
  }
  report.ok=true;
}catch(error){
  report.ok=false;report.failure=error.stack||error.message;console.error(error);throw error;
}finally{
  fs.writeFileSync('egypt-open-world-browser-report.json',JSON.stringify(report,null,2));
  await browser.close();
}
