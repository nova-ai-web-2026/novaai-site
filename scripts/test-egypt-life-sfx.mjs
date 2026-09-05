import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const executablePath=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const base=process.env.GAME_TEST_URL||'http://127.0.0.1:4173/';
// Headless Playwright otherwise launches Chrome with --mute-audio.
const browser=await chromium.launch({headless:true,executablePath,ignoreDefaultArgs:['--mute-audio']});
const deadline=setTimeout(()=>{
  console.error('Gameplay SFX verification exceeded its eight-minute deadline');
  void browser.close().finally(()=>process.exit(1));
},480000);
const report=[];
try {
  for(const mobile of [true,false]){
    const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile});
    const errors=[],remoteAudio=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{
      const url=new URL(request.url());
      if(/\.(ogg|wav|mp3)(\?|$)/.test(url.href)&&url.origin!==new URL(base).origin)remoteAudio.push(url.href);
    });
    await page.route(/https:\/\/(raw\.githubusercontent\.com|cdn\.jsdelivr\.net)\//,route=>route.abort());
    await page.addInitScript(()=>{
      const NativeAudio=window.Audio;
      window.__testMedia=[];window.__testNativeAC=window.AudioContext||window.webkitAudioContext;
      window.Audio=function(...args){const media=new NativeAudio(...args);window.__testMedia.push(media);return media;};
      window.Audio.prototype=NativeAudio.prototype;
    });
    await page.goto(base+'?v=11.19.0',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__V1116_SFX_API?.state().localReady&&window.__V119_READY&&window.__V12_WORLD?.ready&&window.__EGYPT_STREET_FIX?.ready,null,{timeout:60000});
    assert.equal(await page.locator('html').getAttribute('data-release'),'11.19.0','wrong game release');
    await page.evaluate(()=>{
      window.__testAudioContext=new window.__testNativeAC();
      document.addEventListener('pointerdown',()=>window.__testAudioContext.resume(),{capture:true});
    });
    if(mobile)await page.tap('#newGameBtn');else await page.click('#newGameBtn');
    await page.waitForFunction(()=>window.__V12_PROLOGUE?.played&&document.body.classList.contains('game-started'),null,{timeout:45000});
    await page.waitForFunction(()=>window.__testAudioContext.state==='running',null,{timeout:10000});
    await page.evaluate(()=>{
      // MediaRecorder captures on the media thread, independent of WebGL frame rate.
      const ctx=window.__testAudioContext,stream=ctx.createMediaStreamDestination();
      const mix=ctx.createGain();mix.connect(ctx.destination);mix.connect(stream);
      for(const media of window.__testMedia)ctx.createMediaElementSource(media).connect(mix);
      window.__testMeter={ctx,stream,recorder:null,chunks:[]};
    });
    console.log('Audio capture ready',JSON.stringify({mobile}));
    const state=()=>page.evaluate(()=>window.__V1116_SFX_API.state());
    const resetMeter=()=>page.evaluate(()=>{
      const s=window.__testMeter;
      if(s.recorder?.state==='recording')throw new Error('Previous recording was not measured');
      s.chunks=[];s.recorder=new MediaRecorder(s.stream.stream,{mimeType:'audio/webm;codecs=opus'});
      s.recorder.ondataavailable=event=>{if(event.data.size)s.chunks.push(event.data);};
      s.recorder.start();
    });
    const peak=()=>page.evaluate(async()=>{
      const s=window.__testMeter;
      await new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(new Error('Audio recording did not finish')),10000);
        s.recorder.onstop=()=>{clearTimeout(timeout);resolve();};
        s.recorder.onerror=event=>{clearTimeout(timeout);reject(new Error(String(event.error)));};
        s.recorder.stop();
      });
      const bytes=await new Blob(s.chunks,{type:s.recorder.mimeType}).arrayBuffer();
      const decoded=await s.ctx.decodeAudioData(bytes);
      let maximum=0;
      for(let channel=0;channel<decoded.numberOfChannels;channel++){
        for(const value of decoded.getChannelData(channel))maximum=Math.max(maximum,Math.abs(value));
      }
      return maximum;
    });

    // Re-loading a legacy entry layer must not create a second pool or listeners.
    const beforeReload=await state();
    await page.addScriptTag({url:base+'game-v11-15-real-sfx.js?duplicate-test=1'});
    assert.equal((await state()).media.voices,beforeReload.media.voices,'duplicate audio pool');

    // Use the real movement input. No footsteps while standing or rotating.
    await page.evaluate(()=>window.__egyptDebug.v12Teleport(-24,-24));
    await page.waitForTimeout(300);
    const idle=(await state()).events.step;
    await page.waitForTimeout(500);
    assert.equal((await state()).events.step,idle,'footsteps while idle');
    const movementStart=await page.evaluate(()=>({camera:window.__egyptDebug.getCamera(),fps:BABYLON.Engine.LastCreatedEngine.getFps(),at:performance.now()}));
    await resetMeter();
    if(mobile){
      const joy=await page.locator('#joy').boundingBox();
      await page.mouse.move(joy.x+joy.width/2,joy.y+joy.height/2);await page.mouse.down();
      await page.mouse.move(joy.x+joy.width/2,joy.y+10);
    }else await page.keyboard.down('w');
    // Software WebGL can render fewer than three frames per second. Require
    // real displacement and an emitted step, with a bounded wall-clock budget.
    try {
      await page.waitForFunction(n=>window.__V1116_SFX_API.state().events.step>n,idle,{timeout:20000});
    } finally {
      const movementEnd=await page.evaluate(()=>({camera:window.__egyptDebug.getCamera(),fps:BABYLON.Engine.LastCreatedEngine.getFps(),at:performance.now(),activeCamera:BABYLON.Engine.LastCreatedEngine.scenes[0].activeCamera.name,story:window.__V12_PROLOGUE.running,focus:document.activeElement?.id,events:window.__V1116_SFX_API.state().events}));
      console.log('Movement timing evidence',JSON.stringify({mobile,start:movementStart,end:movementEnd}));
    }
    const movementEnd=await page.evaluate(()=>window.__egyptDebug.getCamera());
    assert.ok(Math.hypot(movementEnd.x-movementStart.camera.x,movementEnd.z-movementStart.camera.z)>=1.8,'step without actual walking');
    await page.waitForTimeout(400);
    if(mobile)await page.mouse.up();else await page.keyboard.up('w');
    const stepPeak=await peak();
    const soundDebug=await page.evaluate(()=>({state:window.__V1116_SFX_API.state(),meterContext:window.__testMeter.ctx.state,
      media:window.__testMedia.map(m=>({key:m.dataset.v1116Sfx,muted:m.muted,paused:m.paused,time:m.currentTime,ready:m.readyState}))}));
    console.log('Walking audio evidence',JSON.stringify({mobile,stepPeak,...soundDebug}));
    assert.ok(stepPeak>.001,'silent footsteps '+JSON.stringify(soundDebug));

    // A real shop interaction and purchase must produce one event each.
    await page.evaluate(()=>{
      const scene=BABYLON.Engine.LastCreatedEngine.scenes[0],cart=scene.getMeshByName('fulHot');
      window.__egyptDebug.v12Teleport(cart.position.x,cart.position.z-2);
    });
    await page.waitForFunction(()=>document.getElementById('prompt').textContent.includes('فول')&&document.getElementById('prompt').classList.contains('show'));
    const beforeInteract=(await state()).events.interact;await resetMeter();
    if(mobile)await page.tap('#act');else await page.keyboard.press('e');
    await page.locator('#shop').waitFor({state:'visible'});
    if(!mobile)await page.waitForFunction(()=>document.pointerLockElement===null,null,{timeout:3000});
    await page.waitForTimeout(300);
    assert.equal((await state()).events.interact,beforeInteract+1,'duplicate or missing interaction');
    const interactPeak=await peak();assert.ok(interactPeak>.001,'silent interaction '+JSON.stringify(await state()));
    const money=await page.locator('#money').innerText(),beforeBuy=(await state()).events.buy;
    await resetMeter();
    await page.locator('#shopItems button').first().click();
    await page.waitForTimeout(500);
    assert.equal((await state()).events.buy,beforeBuy+1,'duplicate or missing purchase');
    assert.notEqual(await page.locator('#money').innerText(),money,'purchase did not affect money');
    const buyPeak=await peak();assert.ok(buyPeak>.001,'silent purchase '+JSON.stringify(await state()));
    const frozen=(await state()).events.step;
    await page.waitForTimeout(350);assert.equal((await state()).events.step,frozen,'footsteps while shop is open');
    await page.locator('#shopClose').click();

    // Finish an actual NPC conversation using each available close control.
    for(const closeControl of (mobile?['button']:['button','escape','interact'])){
      await page.evaluate(()=>{
        const scene=BABYLON.Engine.LastCreatedEngine.scenes[0];
        const person=scene.transformNodes.find(n=>n.name==='personRoot');
        window.__egyptDebug.v12Teleport(person.position.x,person.position.z-.6);
      });
      await page.waitForTimeout(150);
      if(mobile)await page.tap('#act');else await page.keyboard.press('e');
      await page.locator('#dialog').waitFor({state:'visible'});
      assert.match(await page.locator('#dialogText').innerText(),/[\u0600-\u06ff]/);
      await page.waitForTimeout(500);
      const beforeClose=await state();await resetMeter();
      if(closeControl==='button')await page.locator('#dialogClose').click();
      else await page.keyboard.press(closeControl==='escape'?'Escape':'e');
      await page.locator('#dialog').waitFor({state:'hidden'});
      await page.waitForTimeout(300);
      const afterClose=await state();
      assert.equal(afterClose.playCalls,beforeClose.playCalls,'closing NPC dialog triggered a sound');
      assert.equal(afterClose.events.door,beforeClose.events.door,'NPC dialog emitted a door event');
      assert.ok(await peak()<.001,'NPC dialog close was audible');
    }
    console.log('NPC dialogue closes silently',JSON.stringify({mobile}));
    const visuals=await page.evaluate(()=>{
      const scene=BABYLON.Engine.LastCreatedEngine.scenes[0];
      const signs=scene.meshes.filter(m=>m.metadata?.readableArabic&&!m.name.endsWith('_readableBack'));
      return {state:window.__EGYPT_STREET_FIX,signs:signs.length,invalid:signs.filter(m=>m.material.diffuseTexture.uScale!==1||!m.material.backFaceCulling||!scene.getMeshByName(m.name+'_readableBack')).map(m=>m.name)};
    });
    assert.ok(visuals.signs>20,'Arabic sign repair did not run');assert.deepEqual(visuals.invalid,[]);
    assert.ok(visuals.state.buildings>10,'street facades missing');
    // Detailed world screenshots are verified separately by the street release gate.

    // Kills current playback as well as blocking future SFX.
    await page.evaluate(()=>window.__V1116_SFX_API.probe('door'));
    assert.equal((await state()).lastPlayed.key,'door','real door sound was removed');
    await page.locator('#soundToggle').click();
    await page.waitForFunction(()=>window.__V1116_SFX_API.state().muted);
    await page.waitForTimeout(150);await resetMeter();
    const mutedCalls=(await state()).playCalls;
    await page.evaluate(()=>window.__V1116_SFX_API.probe('buy'));
    await page.waitForTimeout(200);
    assert.equal((await state()).playCalls,mutedCalls,'sound started while muted');
    assert.equal((await state()).media.playing,0,'existing sound survives mute');
    assert.ok(await peak()<.001,'non-silent muted output');
    await page.locator('#soundToggle').click();
    await page.waitForFunction(()=>!window.__V1116_SFX_API.state().muted);
    await resetMeter();await page.evaluate(()=>window.__V1116_SFX_API.probe('buy'));
    await page.waitForTimeout(400);assert.ok(await peak()>.001,'unmute did not recover');

    assert.deepEqual(remoteAudio,[],'external SFX requests');
    assert.equal((await state()).playRejected,0,'media playback rejected');
    assert.deepEqual(errors,[],'runtime errors');
    await page.screenshot({path:mobile?'sfx-mobile.png':'sfx-desktop.png'});
    report.push({mobile,stepPeak,interactPeak,buyPeak,final:await state()});
    await page.close();
  }
  fs.writeFileSync('sfx-verification.json',JSON.stringify(report,null,2));
  console.log('Gameplay SFX passed on mobile and desktop',report);
} finally {clearTimeout(deadline);await browser.close();}
