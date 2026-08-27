(()=>{
'use strict';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const ai={models:[],opus:null,qwen:null,selected:'auto',ready:false,checking:false,lastUsed:''};
const delay=ms=>new Promise(r=>setTimeout(r,ms));

function toast(text){const old=$('.v7Toast');if(old)old.remove();const el=document.createElement('div');el.className='v7Toast';el.textContent=text;document.body.appendChild(el);setTimeout(()=>el.remove(),3600)}
function status(text,kind='warn'){const pill=$('#modePill');if(!pill)return;pill.innerHTML=`<span class="aiDot ${kind}"></span><span>${text}</span>`}
function setModelButton(text){const b=$('#modelBtn');if(!b)return;b.innerHTML=`<span>${text}</span><span style="font-size:10px;color:#777">▾</span>`}
function modelBlob(m){return [m?.id,m?.name,...(Array.isArray(m?.aliases)?m.aliases:[])].filter(Boolean).join(' ').toLowerCase()}
function modelLabel(m){return m?.name||m?.id||'AI model'}
function normalizeResponse(response){const raw=response?.message?.content ?? response?.content ?? response;if(typeof raw==='string')return raw;if(Array.isArray(raw))return raw.map(x=>typeof x==='string'?x:(x?.text||x?.content||'')).join('');if(raw&&typeof raw==='object'&&typeof raw.text==='string')return raw.text;return String(raw||'')}

async function waitForPuter(timeout=7000){const start=Date.now();while(Date.now()-start<timeout){if(window.puter?.ai?.chat)return true;await delay(120)}return false}

function choosePreferred(models){
  ai.models=Array.isArray(models)?models:[];
  ai.opus=ai.models.find(m=>{const s=modelBlob(m);return /opus/.test(s)&&/(^|[^0-9])5([^0-9]|$)/.test(s)})||null;
  ai.qwen=ai.models.find(m=>{const s=modelBlob(m);return /qwen/.test(s)&&(/3[.\-_ ]?8/.test(s)||/3\.8/.test(s))&&/max/.test(s)})||null;
}

function renderModelMenu(){
  const menu=$('#modelMenu');if(!menu)return;
  const options=[];
  options.push(`<button data-v7-model="auto" class="${ai.selected==='auto'?'active':''}"><span class="modelText"><span class="modelName">تلقائي</span><span class="modelDesc">Opus 5 ثم Qwen3.8 Max حسب المتاح فعليًا</span></span><span class="check">✓</span></button>`);
  if(ai.opus)options.push(`<button data-v7-model="${escapeHtml(ai.opus.id)}" class="${ai.selected===ai.opus.id?'active':''}"><span class="modelText"><span class="modelName">${escapeHtml(modelLabel(ai.opus))}</span><span class="modelDesc">${escapeHtml(ai.opus.id)}</span></span><span class="check">✓</span></button>`);
  if(ai.qwen)options.push(`<button data-v7-model="${escapeHtml(ai.qwen.id)}" class="${ai.selected===ai.qwen.id?'active':''}"><span class="modelText"><span class="modelName">${escapeHtml(modelLabel(ai.qwen))}</span><span class="modelDesc">${escapeHtml(ai.qwen.id)}</span></span><span class="check">✓</span></button>`);
  if(!ai.opus&&!ai.qwen)options.push(`<div class="modelUnavailable">لم يتم العثور على Opus 5 أو Qwen3.8 Max في قائمة النماذج الحالية بعد. سجّل الدخول ثم اضغط فحص النماذج.</div>`);
  menu.innerHTML=`<div class="modelTitle">النموذج الحقيقي المستخدم</div>${options.join('')}<div style="border-top:1px solid #24242d;margin-top:4px;padding-top:5px"><button id="v7RefreshModels"><span class="modelText"><span class="modelName">فحص النماذج الآن</span><span class="modelDesc">قراءة القائمة مباشرة من Puter</span></span><span>↻</span></button></div>`;
  $$('[data-v7-model]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();ai.selected=btn.dataset.v7Model;renderModelMenu();updateModelButton();menu.classList.remove('open')});
  const refresh=$('#v7RefreshModels');if(refresh)refresh.onclick=async e=>{e.stopPropagation();await discoverModels(true)};
}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function updateModelButton(){if(ai.selected==='auto'){setModelButton(ai.lastUsed?`Auto · ${ai.lastUsed}`:'Auto · أقوى متاح');return}const m=ai.models.find(x=>x.id===ai.selected);setModelButton(m?modelLabel(m):'Auto · أقوى متاح')}

async function discoverModels(showToast=false){
  if(ai.checking)return;ai.checking=true;status('فحص AI…','warn');
  try{
    if(!await waitForPuter())throw new Error('مكتبة Puter لم تُحمّل');
    const models=await puter.ai.listModels();
    choosePreferred(models);ai.ready=true;status(`AI جاهز · ${ai.models.length} نموذج`,'ready');renderModelMenu();updateModelButton();
    if(showToast)toast(`تم فحص ${ai.models.length} نموذج. ${ai.opus?'Opus 5 متاح. ':''}${ai.qwen?'Qwen3.8 Max متاح.':''}`.trim());
  }catch(err){ai.ready=false;status('يحتاج تسجيل دخول','warn');renderModelMenu();if(showToast)toast('سجّل الدخول أولًا ثم أعد فحص النماذج')}
  finally{ai.checking=false}
}

async function ensureAuth(){
  if(!await waitForPuter())throw new Error('تعذر تحميل Puter.js. أعد تحميل الصفحة.');
  if(puter.auth?.isSignedIn && !puter.auth.isSignedIn()){
    status('فتح تسجيل الدخول…','warn');
    await puter.auth.signIn({attempt_temp_user_creation:true});
    status('تم تسجيل الدخول','ready');
  }
}

function showTyping(text='جاري التفكير…'){
  hideTyping();const box=$('#messages');if(!box)return;const row=document.createElement('div');row.id='v7Typing';row.className='typingRow';row.innerHTML=`<div class="typingDots"><i></i><i></i><i></i></div><span>${escapeHtml(text)}</span>`;box.appendChild(row);box.scrollTop=box.scrollHeight
}
function hideTyping(){const t=$('#v7Typing');if(t)t.remove()}
function setTyping(text){const t=$('#v7Typing span');if(t)t.textContent=text}

function buildConversation(text){
  const system='You are NovaAI, a precise, capable assistant. Reply naturally in the user language. Be concise unless detail is useful. For coding, produce secure maintainable code. For study, explain clearly rather than pretending to have verified facts you have not verified.';
  const hist=(state?.messages||[]).slice(-18,-1).filter(m=>m.role==='user'||m.role==='assistant').map(m=>({role:m.role,content:String(m.content||'').slice(0,10000)}));
  const fileContext=(state?.files||[]).filter(f=>f.text).slice(0,6).map(f=>`\n[File: ${f.name}]\n${String(f.text).slice(0,16000)}`).join('\n');
  return [{role:'system',content:system},...hist,{role:'user',content:text+(fileContext?'\n\nAttached file context:'+fileContext:'')}];
}

async function callModel(messages,model){
  const opts=model?{model}:{ };
  return await puter.ai.chat(messages,opts);
}

async function sendV7(){
  const p=$('#prompt'),btn=$('#sendBtn');if(!p||!btn)return;const text=p.value.trim();if(!text)return;
  state.messages.push({role:'user',content:text});p.value='';p.style.height='auto';save();render();btn.disabled=true;showTyping('تجهيز الذكاء الاصطناعي…');
  try{
    await ensureAuth();
    if(!ai.models.length){setTyping('فحص النماذج المتاحة…');await discoverModels(false)}
    const messages=buildConversation(text);
    let candidates=[];
    if(ai.selected==='auto')candidates=[ai.opus,ai.qwen].filter(Boolean);
    else candidates=[ai.models.find(m=>m.id===ai.selected)].filter(Boolean);
    let response=null,used=null,lastErr=null;
    for(const m of candidates){
      try{setTyping(`تشغيل ${modelLabel(m)}…`);response=await callModel(messages,m.id);used=m;break}catch(err){lastErr=err}
    }
    if(!response){setTyping('تشغيل أفضل نموذج متاح…');try{response=await callModel(messages,null);used=null}catch(err){throw lastErr||err}}
    const reply=normalizeResponse(response).trim();if(!reply)throw new Error('وصل رد فارغ من خدمة AI');
    hideTyping();ai.lastUsed=used?modelLabel(used):'Puter default';updateModelButton();status(`AI جاهز · ${ai.lastUsed}`,'ready');addAssistant(reply,used?`${modelLabel(used)} · ${used.id}`:'Puter AI');
  }catch(err){
    hideTyping();const msg=String(err?.msg||err?.message||err||'خطأ غير معروف');status('AI غير متصل','bad');addAssistant(`تعذر تشغيل الذكاء الاصطناعي: ${msg}`,'System');
  }finally{btn.disabled=false;p.focus()}
}

function replaceComposerHandlers(){
  const oldP=$('#prompt'),oldB=$('#sendBtn');if(!oldP||!oldB)return;
  const p=oldP.cloneNode(true),b=oldB.cloneNode(true);oldP.replaceWith(p);oldB.replaceWith(b);
  p.addEventListener('input',()=>{p.style.height='auto';p.style.height=Math.min(p.scrollHeight,135)+'px'});
  p.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendV7()}});
  b.onclick=sendV7;b.setAttribute('aria-label','إرسال الرسالة');
}

function rebuildSettings(){
  const overlay=$('#settingsOverlay');if(!overlay)return;
  overlay.innerHTML=`<div class="sheet"><div class="sheetHead"><h2>الإعدادات</h2><button class="close" id="v7CloseSettings">×</button></div><div class="accountCard"><div class="accountMeta"><b>اتصال الذكاء الاصطناعي</b><span id="v7AccountText">يتم التحقق من Puter…</span></div><button class="btn primary" id="v7AuthBtn">تسجيل الدخول</button></div><div style="height:9px"></div><div class="row"><button class="btn" id="v7CheckBtn">فحص النماذج</button><button class="btn" id="v7ClearBtn">مسح البيانات المحلية</button></div><div class="status" style="margin-top:8px">لا يوجد API Server يدوي للمحادثة. النموذج يتم اختياره من قائمة Puter الفعلية.</div></div>`;
  $('#v7CloseSettings').onclick=()=>overlay.classList.remove('open');
  $('#v7AuthBtn').onclick=async()=>{try{await ensureAuth();$('#v7AccountText').textContent='تم تسجيل الدخول';$('#v7AuthBtn').textContent='متصل';await discoverModels(true)}catch(e){toast(String(e?.msg||e?.message||e))}};
  $('#v7CheckBtn').onclick=()=>discoverModels(true);
  $('#v7ClearBtn').onclick=()=>{localStorage.removeItem('nova_ui_v3');location.reload()};
  const open=$('#openSettings');if(open)open.onclick=()=>{overlay.classList.add('open');const signed=window.puter?.auth?.isSignedIn?.();$('#v7AccountText').textContent=signed?'متصل بـ Puter':'غير مسجل الدخول';$('#v7AuthBtn').textContent=signed?'متصل':'تسجيل الدخول'};
}

function cleanToolCopy(){
  const welcome=$('.welcome');if(welcome){const h=welcome.querySelector('h1'),p=welcome.querySelector('p');if(h)h.textContent='كيف أقدر أساعدك؟';if(p)p.textContent='محادثة ذكية، ملفات، كود وصور — من واجهة واحدة بسيطة.'}
  const imgTile=$('[data-pane="imagePane"] span');if(imgTile)imgTile.textContent='تعديل وتوليد صور بالذكاء الاصطناعي';
  const mode=$('#modePill');if(mode){mode.onclick=null;mode.removeAttribute('title')}
}

function overrideImageGeneration(){
  const btn=$('#generateImage');if(!btn)return;btn.onclick=async()=>{
    const prompt=$('#imagePrompt')?.value.trim(),st=$('#imageStatus');if(!prompt)return;btn.disabled=true;if(st){st.className='status';st.textContent='جاري تشغيل مولد الصور…'}
    try{await ensureAuth();const image=await puter.ai.txt2img(prompt);const out=$('#generatedImage');out.src=image.src;out.style.display='block';if(st){st.className='status ok';st.textContent='تم التوليد عبر Puter AI'}}catch(e){if(st){st.className='status err';st.textContent='تعذر توليد الصورة: '+String(e?.msg||e?.message||e)}}finally{btn.disabled=false}
  }
}

function boot(){
  replaceComposerHandlers();rebuildSettings();cleanToolCopy();overrideImageGeneration();renderModelMenu();updateModelButton();
  const mb=$('#modelBtn');if(mb)mb.onclick=e=>{e.stopPropagation();$('#modelMenu')?.classList.toggle('open')};
  document.addEventListener('click',e=>{if(!e.target.closest('#modelMenu')&&!e.target.closest('#modelBtn'))$('#modelMenu')?.classList.remove('open')});
  status('فحص AI…','warn');discoverModels(false);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
