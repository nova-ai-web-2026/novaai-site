import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const base = process.env.GAME_TEST_URL;
assert.ok(base, 'GAME_TEST_URL is required');
const expected = process.env.GAME_EXPECTED_COMMIT || 'unknown';
const executablePath = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']
});

const report = { base, expected, errors: [], consoleErrors: [], failedRequests: [], checks: {} };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') report.consoleErrors.push(message.text());
  });
  page.on('requestfailed', request => {
    report.failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'request failed' });
  });

  const response = await page.goto(`${base}?verify=${expected}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  assert.ok(response, 'No navigation response');
  assert.ok(response.ok(), `Published page returned HTTP ${response.status()}`);
  report.checks.http = response.status();

  await page.locator('#boot').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#newGame').waitFor({ state: 'visible', timeout: 15000 });
  report.checks.bootText = (await page.locator('#boot').innerText()).slice(0, 240);
  assert.match(report.checks.bootText, /شوارع/);

  const bodyStyle = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  report.checks.bodyBackground = bodyStyle;
  assert.notEqual(bodyStyle, 'rgba(0, 0, 0, 0)', 'Stylesheet did not apply');

  await page.click('#newGame');
  await page.waitForFunction(() => {
    const engine = window.BABYLON?.Engine?.LastCreatedEngine;
    const scene = engine?.scenes?.[0];
    return document.getElementById('hud')?.hidden === false && scene && scene.meshes.length >= 20;
  }, null, { timeout: 45000 });

  const runtime = await page.evaluate(() => {
    const engine = window.BABYLON.Engine.LastCreatedEngine;
    const scene = engine.scenes[0];
    const canvas = document.getElementById('game');
    const rect = canvas.getBoundingClientRect();
    return {
      meshes: scene.meshes.length,
      fps: engine.getFps(),
      canvas: { width: rect.width, height: rect.height },
      hudHidden: document.getElementById('hud').hidden,
      objective: document.getElementById('objective').textContent,
      babylon: !!window.BABYLON
    };
  });
  report.checks.runtime = runtime;
  assert.ok(runtime.babylon, 'Babylon.js did not load');
  assert.ok(runtime.meshes >= 20, `World did not build; only ${runtime.meshes} meshes`);
  assert.ok(runtime.canvas.width > 500 && runtime.canvas.height > 300, 'Canvas has invalid size');
  assert.equal(runtime.hudHidden, false, 'HUD did not enter game state');
  assert.match(runtime.objective, /اخرج من الشقة/);

  await page.screenshot({ path: 'egypt-open-world-published.png', fullPage: true });
  assert.deepEqual(report.errors, [], `Page errors: ${report.errors.join(' | ')}`);
  assert.deepEqual(report.consoleErrors, [], `Console errors: ${report.consoleErrors.join(' | ')}`);
  assert.deepEqual(report.failedRequests, [], `Failed requests: ${JSON.stringify(report.failedRequests)}`);

  report.ok = true;
  console.log('Published Egyptian open-world build verified', JSON.stringify(runtime));
} catch (error) {
  report.ok = false;
  report.failure = error.stack || error.message;
  console.error(error);
  throw error;
} finally {
  fs.writeFileSync('egypt-open-world-browser-report.json', JSON.stringify(report, null, 2));
  await browser.close();
}
