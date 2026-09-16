from pathlib import Path

models=Path('music-ai/models-v2.js')
s=models.read_text()
repls={
"<small>48 kHz، أفضل درامز وباس وهارموني وTransitions وMastering.</small>":"<small>48 kHz، أعلى توزيع + AI Vocals عند كتابة الكلمات.</small>",
"lite:{chordVoices:3,chordGain:.74,bassGain:.78,drumGain:.76,leadGain:.68,leadDensity:.40":"lite:{chordVoices:3,chordGain:.74,bassGain:.78,drumGain:.76,leadGain:.58,leadDensity:.40",
"studio:{chordVoices:3,chordGain:.94,bassGain:.94,drumGain:.92,leadGain:.90,leadDensity:.72":"studio:{chordVoices:3,chordGain:.94,bassGain:.94,drumGain:.92,leadGain:.74,leadDensity:.72",
"ultra:{chordVoices:4,chordGain:1.08,bassGain:1.04,drumGain:1.00,leadGain:1.02,leadDensity:1":"ultra:{chordVoices:4,chordGain:1.08,bassGain:1.04,drumGain:1.00,leadGain:.78,leadDensity:1",
"style==='pop'?5200:6200":"style==='pop'?4300:5000",
"const hGain=gain*(profile===MODEL_PROFILE.ultra?.12:.055)":"const hGain=gain*(profile===MODEL_PROFILE.ultra?.075:.035)",
"const leadBase=(opts.model==='lite'?.044:opts.model==='studio'?.054:.058)":"const leadBase=(opts.model==='lite'?.035:opts.model==='studio'?.043:.046)",
"shelf.gain.value=.75":"shelf.gain.value=.25",
"Math.tanh(x*1.08)":"Math.tanh(x*1.04)"
}
for old,new in repls.items():
    if old not in s:
        raise SystemExit(f'missing models anchor: {old}')
    s=s.replace(old,new,1)
models.write_text(s)

index=Path('music-ai/index.html')
h=index.read_text()
if 'ultra-vocals.js' not in h:
    if '</body>' not in h: raise SystemExit('missing body close')
    h=h.replace('</body>','<script src="./ultra-vocals.js"></script>\n</body>',1)
h=h.replace('<div class="badge">بدون تسجيل • بدون API Key</div>','<div class="badge">Instrumental بدون API • Ultra Vocals اختياري</div>')
index.write_text(h)

test=Path('music-ai/e2e.spec.js')
t=test.read_text()
if "lyrics box is available and vocals stay Ultra-only" not in t:
    insert="""\ntest('lyrics box is available and vocals stay Ultra-only', async ({ page }) => {\n  await page.goto('http://127.0.0.1:4173/music-ai/');\n  await expect(page.locator('#nbvLyrics')).toBeVisible();\n  await page.fill('#nbvLyrics', '[Verse]\\nكلمات اختبار');\n  await expect(page.locator('#nbvState')).toContainText('Ultra 3');\n  await page.click('[data-nb2-model=\"studio\"]');\n  await expect(page.locator('#nbvState')).toContainText('Nova Ultra 3 فقط');\n  await page.click('[data-nb2-model=\"ultra\"]');\n  await expect(page.locator('#nbvState')).toContainText('Ultra 3');\n});\n"""
    t += insert
    test.write_text(t)
