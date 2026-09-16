// Timing-safety regression suite for the three-model engine.
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
  await page.locator('#duration').evaluate(el => { el.value = '12'; el.dispatchEvent(new Event('input', { bubbles: true })); });
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
  await expect(page.locator('#durSpec')).toHaveText('12s');
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

test('built-in audio self test reports non-silent Ultra 3 render', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/music-ai/');
  await page.click('#selfTest');
  await expect(page.locator('#supportText')).toContainText('نجح', { timeout: 20000 });
  await expect(page.locator('#supportText')).toContainText('غير صامت');
  await expect(page.locator('#supportText')).toContainText('Model 3');
});

test('mobile layout loads and model controls remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4173/music-ai/');
  await expect(page.locator('#prompt')).toBeVisible();
  await expect(page.locator('#generate')).toBeVisible();
  await expect(page.locator('#style')).toBeVisible();
  await expect(page.locator('[data-nb2-model="ultra"]')).toBeVisible();
});
