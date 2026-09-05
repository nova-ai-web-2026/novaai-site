import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const executablePath=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const base=process.env.GAME_TEST_URL||'http://127.0.0.1:4173/';
// Headless Playwright otherwise launches Chrome with --mute-audio.
const browser=await chromium.launch({headless:true,executablePath,ignoreDefaultArgs:['--mute-audio']});
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
    await page.goto(base+'?v=11.6',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__V1116_SFX_API?.state().localReady&&window.__V119_READY&&window.__V12_WORLD?.ready,null,{timeout:60000});
    await page.evaluate(async()=>{
      // Measure on the audio thread: slow WebGL frames cannot miss a short click.
      const ctx=new window.__testNativeAC();
      const moduleURL=URL.createObjectURL(new Blob([`
        class Meter extends AudioWorkletProcessor {
          constructor(){super();this.epoch=0;this.peak=0;this.port.onmessage=({data})=>{
            this.epoch=data.epoch;this.peak=0;this.port.postMessage({reset:true,epoch:this.epoch});
          };}
          process(inputs,outputs){
            const channels=inputs[0]||[];let peak=this.peak;
            for(let c=0;c<outputs[0].length;c++){
              const source=channels[c]||channels[0];if(source)outputs[0][c].set(source);
            }
            for(const channel of channels)for(const v of channel)peak=Math.max(peak,Math.abs(v));
            if(peak>this.peak){this.peak=peak;this.port.postMessage({peak,epoch:this.epoch});}
            return true;
          }
        }
        registerProcessor('sfx-test-meter',Meter);
      `],{type:'text/javascript'}));
      await ctx.audioWorklet.addModule(moduleURL);URL.revokeObjectURL(moduleURL);
      const meter=new AudioWorkletNode(ctx,'sfx-test-meter');meter.connect(ctx.destination);
      for(const media of window.__testMedia)ctx.createMediaElementSource(media).connect(meter);
      window.__testMeter={peak:0,ctx,epoch:0,ack:0,meter};
      meter.port.onmessage=({data})=>{
        const state=window.__testMeter;if(data.epoch!==state.epoch)return;
        if(data.reset)state.ack=data.epoch;else state.peak=Math.max(state.peak,data.peak);
      };
      document.addEventListener('pointerdown',()=>ctx.resume(),{capture:true});
    });
    if(mobile)await page.tap('#newGameBtn');else await page.click('#newGameBtn');
    await page.waitForFunction(()=>window.__V12_PROLOGUE?.played&&document.body.classList.contains('game-started'),null,{timeout:20000});
    const state=()=>page.evaluate(()=>window.__V1116_SFX_API.state());
    const resetMeter=async()=>{
      await page.evaluate(()=>{const s=window.__testMeter;s.peak=0;s.epoch++;s.meter.port.postMessage({epoch:s.epoch});});
      await page.waitForFunction(()=>window.__testMeter.ack===window.__testMeter.epoch);
    };
    const peak=()=>page.evaluate(()=>window.__testMeter.peak);

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
    await resetMeter();
    if(mobile){
      const joy=await page.locator('#joy').boundingBox();
      await page.mouse.move(joy.x+joy.width/2,joy.y+joy.height/2);await page.mouse.down();
      await page.mouse.move(joy.x+joy.width/2,joy.y+10);
    }else await page.keyboard.down('w');
    await page.waitForFunction(n=>window.__V1116_SFX_API.state().events.step>n,idle,{timeout:6000});
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

    // Kills current playback as well as blocking future SFX.
    await page.evaluate(()=>window.__V1116_SFX_API.probe('door'));
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
} finally {await browser.close();}
