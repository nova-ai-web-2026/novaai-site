// Model/style differentiation, natural-sound and duration regression suite.
const { test, expect } = require('@playwright/test');

test('NovaBeat AI renders a real playable track with Ultra 3 by default', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/music-ai/');
  await expect(page).toHaveTitle(/NovaBeat AI/);
  await expect(page.locator('#supportText')).toContainText('يدعم');
  await expect(page.locator('[data-nb2-model]')).toHaveCount(3);
  await expect(page.locator('[data-nb2-model="ultra"]')).toHaveClass(/active/);
  await expect(page.locator('#generate')).toContainText('Nova Ultra 3');
  await page.fill('#prompt', 'اختبار موسيقى بوب مبهجة');
  await page.selectOption('#style', 'pop');
  await page.selectOption('#mood', 'uplifting');
  await page.locator('#duration').evaluate(el => { el.value = '15'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('#generate');
  await expect(page.locator('#result')).toHaveClass(/show/, { timeout: 30000 });
  await expect(page.locator('#statusText')).toContainText('تم التوليد');
  await expect(page.locator('#trackMeta')).toContainText('Nova Ultra 3');
  await expect(page.locator('#nb2RateSpec')).toHaveText('48 kHz');
  const audioSrc = await page.locator('#audio').getAttribute('src');
  const downloadHref = await page.locator('#download').getAttribute('href');
  expect(audioSrc).toMatch(/^blob:/);
  expect(downloadHref).toMatch(/^blob:/);
  await expect(page.locator('#bpmSpec')).not.toHaveText('—');
  await expect(page.locator('#keySpec')).not.toHaveText('—');
  await expect(page.locator('#durSpec')).toHaveText('15s');
});

test('all three models are selectable and technically distinct', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/music-ai/');
  await page.click('[data-nb2-model="lite"]');
  await expect(page.locator('#generate')).toContainText('Nova Lite 1');
  await expect(page.locator('#nb2RateSpec')).toHaveText('24 kHz');
  await page.click('[data-nb2-model="studio"]');
  await expect(page.locator('#generate')).toContainText('Nova Studio 2');
  await expect(page.locator('#nb2RateSpec')).toHaveText('44.1 kHz');
  await page.click('[data-nb2-model="ultra"]');
  await expect(page.locator('#generate')).toContainText('Nova Ultra 3');
  await expect(page.locator('#nb2RateSpec')).toHaveText('48 kHz');
});

test('same brief renders three materially different model outputs', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('http://127.0.0.1:4173/music-ai/');
  await page.fill('#prompt', 'نفس الاختبار للموديلات الثلاثة');
  await page.selectOption('#style', 'pop');
  await page.selectOption('#mood', 'uplifting');
  await page.locator('#duration').evaluate(el => { el.value = '15'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  const outputs = [];
  let previousSrc = null;
  for (const model of ['lite','studio','ultra']) {
    await page.click(`[data-nb2-model="${model}"]`);
    await page.click('#generate');
    await expect(page.locator('#statusText')).toContainText('تم التوليد', { timeout: 30000 });
    await expect(page.locator('#result')).toHaveClass(/show/, { timeout: 30000 });
    if (previousSrc) {
      await expect.poll(async () => page.locator('#audio').getAttribute('src'), { timeout: 30000 }).not.toBe(previousSrc);
    }
    const src = await page.locator('#audio').getAttribute('src');
    outputs.push({
      src,
      rate: await page.locator('#nb2RateSpec').textContent(),
      mix: await page.locator('#nb2MixSpec').textContent(),
      meta: await page.locator('#trackMeta').textContent()
    });
    previousSrc = src;
  }
  expect(new Set(outputs.map(x => x.src)).size).toBe(3);
  expect(outputs.map(x => x.rate)).toEqual(['24 kHz','44.1 kHz','48 kHz']);
  expect(new Set(outputs.map(x => x.mix)).size).toBe(3);
  expect(outputs[0].meta).toContain('Nova Lite 1');
  expect(outputs[1].meta).toContain('Nova Studio 2');
  expect(outputs[2].meta).toContain('Nova Ultra 3');
});

test('built-in audio self test reports non-silent Ultra 3 render', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/music-ai/');
  await page.click('#selfTest');
  await expect(page.locator('#supportText')).toContainText('نجح', { timeout: 20000 });
  await expect(page.locator('#supportText')).toContainText('غير صامت');
  await expect(page.locator('#supportText')).toContainText('Model 3');
});

test('duration control supports and renders a one-minute track', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('http://127.0.0.1:4173/music-ai/');
  const duration = page.locator('#duration');
  await expect(duration).toHaveAttribute('min', '15');
  await expect(duration).toHaveAttribute('max', '120');
  await duration.evaluate(el => { el.value = '60'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await expect(page.locator('#durationOut')).toContainText('60');
  await page.fill('#prompt', 'اختبار مدة طويلة وصوت طبيعي هادئ');
  await page.selectOption('#style', 'lofi');
  await page.selectOption('#mood', 'calm');
  await page.click('#generate');
  await expect(page.locator('#result')).toHaveClass(/show/, { timeout: 50000 });
  await expect(page.locator('#durSpec')).toHaveText('60s');
  const src = await page.locator('#audio').getAttribute('src');
  expect(src).toMatch(/^blob:/);
});

test('changing style changes arrangement profile and BPM', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/music-ai/');
  await page.locator('#duration').evaluate(el => { el.value = '15'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.selectOption('#style', 'trap');
  await page.click('#generate');
  await expect(page.locator('#result')).toHaveClass(/show/, { timeout: 30000 });
  await expect(page.locator('#trackMeta')).toContainText('Trap');
  await expect(page.locator('#bpmSpec')).toHaveText('90');
  const trapSrc = await page.locator('#audio').getAttribute('src');
  await page.selectOption('#style', 'edm');
  await expect(page.locator('#statusText')).toContainText('EDM');
  await page.click('#generate');
  await expect(page.locator('#trackMeta')).toContainText('EDM');
  await expect(page.locator('#bpmSpec')).toHaveText('128');
  const edmSrc = await page.locator('#audio').getAttribute('src');
  expect(edmSrc).not.toBe(trapSrc);
});

test('all five styles expose clearly different tempo identities', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/music-ai/');
  const expected = { trap: '90', pop: '116', lofi: '78', edm: '128', cinematic: '84' };
  for (const [style, bpm] of Object.entries(expected)) {
    await page.selectOption('#style', style);
    await page.locator('#duration').evaluate(el => { el.value = '15'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('#generate');
    await expect(page.locator('#result')).toHaveClass(/show/, { timeout: 30000 });
    await expect(page.locator('#bpmSpec')).toHaveText(bpm);
  }
});

test('mobile layout loads and model controls remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4173/music-ai/');
  await expect(page.locator('#prompt')).toBeVisible();
  await expect(page.locator('#generate')).toBeVisible();
  await expect(page.locator('#style')).toBeVisible();
  await expect(page.locator('[data-nb2-model="ultra"]')).toBeVisible();
});

test('lyrics box is available and vocals stay Ultra-only', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/music-ai/');
  await expect(page.locator('#nbvLyrics')).toBeVisible();
  await page.fill('#nbvLyrics', '[Verse]\nكلمات اختبار');
  await expect(page.locator('#nbvState')).toContainText('Ultra 3');
  await page.click('[data-nb2-model="studio"]');
  await expect(page.locator('#nbvState')).toContainText('Nova Ultra 3 فقط');
  await page.click('[data-nb2-model="ultra"]');
  await expect(page.locator('#nbvState')).toContainText('Ultra 3');
});


test('Ultra lyrics without backend falls back to playable instrumental', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/music-ai/');
  await page.selectOption('#duration', '15');
  await page.click('[data-nb2-model="ultra"]');
  await page.fill('#nbvLyrics', '[Verse]\nكلمات اختبار للصوت');
  await expect(page.locator('#nbvState')).toContainText('Instrumental');
  await page.click('#generate');
  await expect(page.locator('#result')).toHaveClass(/show/, { timeout: 20000 });
  await expect(page.locator('#audio')).toHaveAttribute('src', /^blob:/);
  await expect(page.locator('#statusText')).toContainText('تم التوليد بنجاح');
});
