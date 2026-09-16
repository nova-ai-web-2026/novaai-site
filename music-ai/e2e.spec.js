const { test, expect } = require('@playwright/test');

test('NovaBeat AI renders a real playable track', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/music-ai/');
  await expect(page).toHaveTitle(/NovaBeat AI/);
  await expect(page.locator('#supportText')).toContainText('يدعم');
  await page.fill('#prompt', 'اختبار موسيقى بوب مبهجة');
  await page.selectOption('#style', 'pop');
  await page.selectOption('#mood', 'uplifting');
  await page.locator('#duration').evaluate(el => { el.value = '12'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('#generate');
  await expect(page.locator('#result')).toHaveClass(/show/, { timeout: 30000 });
  await expect(page.locator('#statusText')).toContainText('تم التوليد');
  const audioSrc = await page.locator('#audio').getAttribute('src');
  const downloadHref = await page.locator('#download').getAttribute('href');
  expect(audioSrc).toMatch(/^blob:/);
  expect(downloadHref).toMatch(/^blob:/);
  await expect(page.locator('#bpmSpec')).not.toHaveText('—');
  await expect(page.locator('#keySpec')).not.toHaveText('—');
  await expect(page.locator('#durSpec')).toHaveText('12s');
});

test('built-in audio self test reports non-silent render', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/music-ai/');
  await page.click('#selfTest');
  await expect(page.locator('#supportText')).toContainText('نجح', { timeout: 15000 });
  await expect(page.locator('#supportText')).toContainText('غير صامت');
});

test('mobile layout loads and core controls remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4173/music-ai/');
  await expect(page.locator('#prompt')).toBeVisible();
  await expect(page.locator('#generate')).toBeVisible();
  await expect(page.locator('#style')).toBeVisible();
});
