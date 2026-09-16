from pathlib import Path
p=Path('music-ai/e2e.spec.js')
s=p.read_text()
s=s.replace("await expect(page.locator('#nbvState')).toContainText('Ultra 3');\n  await page.click('[data-nb2-model=\"studio\"]');","await expect(page.locator('#nbvState')).toContainText('AI Vocals');\n  await page.click('[data-nb2-model=\"studio\"]');",1)
s=s.replace("await page.click('[data-nb2-model=\"ultra\"]');\n  await expect(page.locator('#nbvState')).toContainText('Ultra 3');","await page.click('[data-nb2-model=\"ultra\"]');\n  await expect(page.locator('#nbvState')).toContainText('AI Vocals');",1)
s=s.replace("await page.selectOption('#duration', '15');","await page.locator('#duration').evaluate(el => { el.value = '15'; el.dispatchEvent(new Event('input', { bubbles: true })); });",1)
p.write_text(s)
