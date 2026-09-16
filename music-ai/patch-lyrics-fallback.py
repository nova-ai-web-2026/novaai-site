from pathlib import Path

# 1) Ensure generated browser audio starts immediately when possible.
models=Path('music-ai/models-v2.js')
s=models.read_text()
old="audio.src=currentUrl;dl.href=currentUrl;dl.download=`novabeat-${selectedModel}-${Date.now()}.wav`;"
new="audio.src=currentUrl;audio.load();const autoPlay=audio.play();if(autoPlay&&autoPlay.catch)autoPlay.catch(()=>{});dl.href=currentUrl;dl.download=`novabeat-${selectedModel}-${Date.now()}.wav`;"
if old not in s:
    raise SystemExit('missing models autoplay anchor')
s=s.replace(old,new,1)
models.write_text(s)

# 2) Make the no-backend lyrics state explicit and allow the instrumental engine to continue.
vocals=Path('music-ai/ultra-vocals.js')
v=vocals.read_text()
old_state="else voiceState.textContent='Ultra 3 جاهز للكلمات. يلزم تشغيل الـbackend الآمن لتفعيل الغناء العصبي الواقعي.'"
new_state="else voiceState.textContent='AI Vocals غير متصلة على GitHub Pages — سيتم توليد Instrumental بدل الصمت. الغناء الحقيقي يحتاج الـbackend الآمن.'"
if old_state not in v:
    raise SystemExit('missing vocals state anchor')
v=v.replace(old_state,new_state,1)
old_fallback="const ep=endpoint();if(!ep){setState();return}"
new_fallback="const ep=endpoint();if(!ep){setState();if(status)status.textContent='AI Vocals غير متصلة — جاري توليد Instrumental حتى لا يحدث صمت.';return}"
if old_fallback not in v:
    raise SystemExit('missing vocals fallback anchor')
v=v.replace(old_fallback,new_fallback,1)
vocals.write_text(v)

# 3) Cache-bust the two runtime scripts on GitHub Pages.
index=Path('music-ai/index.html')
h=index.read_text()
if '<script src="./models-v2.js"></script>' in h:
    h=h.replace('<script src="./models-v2.js"></script>','<script src="./models-v2.js?v=20260916-lyricsfix1"></script>',1)
elif 'models-v2.js?v=20260916-lyricsfix1' not in h:
    raise SystemExit('missing models-v2 script tag')
if '<script src="./ultra-vocals.js"></script>' in h:
    h=h.replace('<script src="./ultra-vocals.js"></script>','<script src="./ultra-vocals.js?v=20260916-lyricsfix1"></script>',1)
elif 'ultra-vocals.js?v=20260916-lyricsfix1' not in h:
    raise SystemExit('missing ultra-vocals script tag')
index.write_text(h)

# 4) Regression test the exact bug: lyrics + Ultra + no backend must still produce playable audio.
test=Path('music-ai/e2e.spec.js')
t=test.read_text()
name="Ultra lyrics without backend falls back to playable instrumental"
if name not in t:
    t += f'''\n\ntest('{name}', async ({{ page }}) => {{\n  await page.goto('http://127.0.0.1:4173/music-ai/');\n  await page.selectOption('#duration', '15');\n  await page.click('[data-nb2-model="ultra"]');\n  await page.fill('#nbvLyrics', '[Verse]\\nكلمات اختبار للصوت');\n  await expect(page.locator('#nbvState')).toContainText('Instrumental');\n  await page.click('#generate');\n  await expect(page.locator('#result')).toHaveClass(/show/, {{ timeout: 20000 }});\n  await expect(page.locator('#audio')).toHaveAttribute('src', /^blob:/);\n  await expect(page.locator('#statusText')).toContainText('تم التوليد بنجاح');\n}});\n'''
    test.write_text(t)
