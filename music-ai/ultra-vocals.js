(()=>{
'use strict';
if(window.__NOVABEAT_ULTRA_VOCALS__) return;
window.__NOVABEAT_ULTRA_VOCALS__=true;
const $=s=>document.querySelector(s);
const modelField=$('.nb2-model-field'),promptEl=$('#prompt'),styleEl=$('#style'),moodEl=$('#mood'),durEl=$('#duration'),btn=$('#generate'),audio=$('#audio'),dl=$('#download'),result=$('#result'),empty=$('#emptyState'),dot=$('#statusDot'),status=$('#statusText');
if(!modelField||!btn||!audio) return;
const style=document.createElement('style');
style.textContent=`.nbv-field{margin:2px 0 16px}.nbv-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:8px}.nbv-tag{font-size:10px;font-weight:900;border:1px solid #2d6c65;background:#10332f;color:#8cf2e5;border-radius:999px;padding:4px 7px;white-space:nowrap}.nbv-field textarea{min-height:145px}.nbv-help{font-size:11px;color:#999aac;line-height:1.55;margin-top:7px}.nbv-state{margin-top:8px;font-size:11px;padding:8px 10px;border-radius:10px;border:1px solid #2b2b3d;background:#0d0d15;color:#bfc0cf}.nbv-state.ready{border-color:#2d625d;color:#86e7db}.nbv-state.off{opacity:.74}.nbv-live{display:inline-block;margin-inline-start:6px;color:#86e7db;font-weight:800}`;
document.head.appendChild(style);
const field=document.createElement('div');field.className='nbv-field';field.innerHTML=`<div class="nbv-head"><div class="label" style="margin:0">كلمات الأغنية</div><span class="nbv-tag">VOCALS — ULTRA 3 فقط</span></div><textarea id="nbvLyrics" maxlength="4000" placeholder="اكتب كلماتك هنا. تقدر تستخدم [Verse] و [Chorus] و [Bridge] لتنظيم الأغنية."></textarea><div class="nbv-help">الكلمات لا تغيّر Lite أو Studio. الغناء العصبي الكامل يعمل فقط مع Nova Ultra 3، واللحن الصناعي الحالي يفضل موجودًا لكن بمستوى أخف.</div><div id="nbvState" class="nbv-state">اكتب كلماتك ثم اختار Nova Ultra 3 للغناء.</div>`;
modelField.insertAdjacentElement('afterend',field);
const lyricsEl=$('#nbvLyrics'),voiceState=$('#nbvState');
let vocalUrl=null,busy=false;
function activeModel(){return document.querySelector('[data-nb2-model].active')?.dataset.nb2Model||'ultra'}
function endpoint(){const meta=document.querySelector('meta[name="novabeat-vocal-api"]')?.content?.trim();if(meta)return meta;if(window.NOVABEAT_VOCAL_API)return String(window.NOVABEAT_VOCAL_API);if(location.hostname.endsWith('.vercel.app'))return '/api/ultra-vocals';return ''}
function setState(){const model=activeModel(),has=lyricsEl.value.trim().length>0,ep=endpoint();voiceState.className='nbv-state '+(model==='ultra'&&has?'ready':'off');if(model!=='ultra')voiceState.textContent='الكلمات محفوظة، لكن الغناء متاح في Nova Ultra 3 فقط.';else if(!has)voiceState.textContent='اكتب كلماتك لتفعيل Ultra 3 Vocals.';else if(ep)voiceState.innerHTML='Ultra 3 Vocals جاهز للتوليد العصبي.<span class="nbv-live">AI VOCALS</span>';else voiceState.textContent='AI Vocals غير متصلة على GitHub Pages — سيتم توليد Instrumental بدل الصمت. الغناء الحقيقي يحتاج الـbackend الآمن.'}
function setWork(msg){if(dot)dot.className='dot work';if(status)status.textContent=msg;btn.disabled=true;busy=true}
function setDone(msg){if(dot)dot.className='dot on';if(status)status.textContent=msg;btn.disabled=false;busy=false}
function setFail(msg){if(dot)dot.className='dot bad';if(status)status.textContent=msg;btn.disabled=false;busy=false}
async function generateVocals(){
  const ep=endpoint();if(!ep)throw new Error('محرك الغناء العصبي غير متصل بعد');
  const duration=Math.max(15,Math.min(120,+durEl.value||60));
  setWork('Nova Ultra 3 يولّد الغناء والكلمات بصوت عصبي طبيعي…');
  const res=await fetch(ep,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:promptEl?.value||'',lyrics:lyricsEl.value.trim(),style:styleEl?.value||'pop',mood:moodEl?.value||'uplifting',duration})});
  if(!res.ok){let msg='فشل توليد الغناء';try{const j=await res.json();if(j?.error)msg=j.error}catch{}throw new Error(msg)}
  const blob=await res.blob();if(!blob.size)throw new Error('رجع ملف صوت فارغ');
  if(vocalUrl)URL.revokeObjectURL(vocalUrl);vocalUrl=URL.createObjectURL(blob);audio.src=vocalUrl;audio.load();if(dl){dl.href=vocalUrl;dl.download=`novabeat-ultra-vocals-${Date.now()}.mp3`;dl.textContent='⬇ تحميل MP3'}
  if(empty)empty.style.display='none';if(result)result.classList.add('show');
  const title=$('#trackTitle'),meta=$('#trackMeta'),bpm=$('#bpmSpec'),key=$('#keySpec'),dur=$('#durSpec');
  if(title)title.textContent=(promptEl?.value||'Nova Ultra Vocals').trim().slice(0,36)||'Nova Ultra Vocals';
  if(meta)meta.innerHTML=`Nova Ultra 3 • AI Vocals • ${styleEl?.options?.[styleEl.selectedIndex]?.text||''} • ${moodEl?.options?.[moodEl.selectedIndex]?.text||''} • MP3 <span class="nb2-model-badge">Neural vocal mix</span>`;
  const bpms={trap:90,pop:116,lofi:78,edm:128,cinematic:84};if(bpm)bpm.textContent=bpms[styleEl?.value]||'—';if(key)key.textContent='AI';if(dur)dur.textContent=duration+'s';
  setDone('تم توليد Nova Ultra 3 Vocals — التراك جاهز للتشغيل.');
}
async function intercept(e){
  const trigger=e.target.closest?.('#generate,#regenerate');if(!trigger||busy)return;
  const lyrics=lyricsEl.value.trim();if(activeModel()!=='ultra'||!lyrics)return;
  const ep=endpoint();if(!ep){setState();if(status)status.textContent='AI Vocals غير متصلة — جاري توليد Instrumental حتى لا يحدث صمت.';return}
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  try{await generateVocals()}catch(err){console.error(err);setFail('تعذر توليد Ultra Vocals: '+(err?.message||'خطأ غير معروف'))}
}
document.addEventListener('click',intercept,true);
lyricsEl.addEventListener('input',setState);document.querySelectorAll('[data-nb2-model]').forEach(x=>x.addEventListener('click',()=>setTimeout(setState,0)));
setState();
})();
