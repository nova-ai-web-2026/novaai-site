import fs from 'node:fs';

const file = 'nova-ultimate/index.html';
let html = fs.readFileSync(file, 'utf8');

if (!html.includes('https://js.puter.com/v2/')) {
  html = html.replace('</head>', '<script src="https://js.puter.com/v2/"></script>\n</head>');
}

const sendPattern = /async function send\(\)\{[\s\S]*?\}\nsendBtn\.onclick=send;/;
if (!sendPattern.test(html)) {
  throw new Error('Could not find NovaAI send() function to patch');
}

const newSend = String.raw`async function send(){
  const text=prompt.value.trim();
  if(!text)return;
  state.messages.push({role:'user',content:text});
  prompt.value='';autoGrow();save();render();sendBtn.disabled=true;
  state.messages.push({role:'assistant',content:'...',thinking:true});render();
  try{
    if(!window.puter?.ai?.chat) throw new Error('تعذر تحميل خدمة الذكاء الاصطناعي. حدّث الصفحة وتأكد من الإنترنت.');
    const modeGuide={
      general:'Be a highly capable general assistant. Give accurate, practical answers and say when you are uncertain.',
      study:'Be an excellent tutor. Explain clearly, step by step when useful, and adapt to the student level without doing dishonest assessed work for them.',
      coding:'Be a senior software engineer. Produce correct, secure, maintainable code and explain important tradeoffs.',
      research:'Be a careful research assistant. Separate facts from assumptions, reason critically, and avoid inventing sources or claims.',
      writing:'Be a strong writing assistant. Preserve the user intent and requested tone while improving clarity and structure.'
    };
    const system='You are NovaAI, a fast and capable AI assistant. '+(modeGuide[state.mode]||modeGuide.general)+' Reply in the user language naturally.';
    const history=state.messages.filter(m=>!m.thinking).slice(-20,-1).map(m=>({role:m.role,content:String(m.content||'').slice(0,12000)}));
    const fileContext=(state.files||[]).filter(f=>f.text).slice(0,8).map(f=>'\n[File: '+f.name+']\n'+String(f.text).slice(0,18000)).join('\n');
    const conversation=[{role:'system',content:system},...history,{role:'user',content:text+(fileContext?'\n\nAttached file context:'+fileContext:'')}];
    let response,model='Claude Sonnet 5';
    try{
      response=await puter.ai.chat(conversation,{model:'anthropic/claude-sonnet-5'});
    }catch(primaryError){
      response=await puter.ai.chat(conversation);
      model='Puter AI';
    }
    const raw=response?.message?.content ?? response;
    const reply=typeof raw==='string'?raw:Array.isArray(raw)?raw.map(x=>typeof x==='string'?x:(x?.text||'')).join(''):String(raw||'');
    if(!reply.trim()) throw new Error('لم يصل رد من النموذج.');
    state.messages.pop();
    state.messages.push({role:'assistant',content:reply.trim(),model});
    save();render();
  }catch(e){
    state.messages.pop();
    const msg=String(e?.message||e||'تعذر تشغيل المحادثة');
    state.messages.push({role:'assistant',content:'تعذر تشغيل المحادثة الآن. '+msg});
    save();render();
  }finally{sendBtn.disabled=false}
}
sendBtn.onclick=send;`;

html = html.replace(sendPattern, newSend);
html = html.replaceAll('تعديل محلي وتوليد AI عند ربط الخادم','تعديل محلي مع أدوات AI');
html = html.replaceAll('المحادثة الذكية محتاجة خادم API متصل. الأدوات المحلية شغالة عادي، ومن الإعدادات تقدر تربط عنوان الخادم لما يكون جاهز','المحادثة تعمل مباشرة عبر Claude Sonnet 5 من المتصفح');

fs.writeFileSync(file, html);
console.log('NovaAI: Puter.js + Claude Sonnet 5 browser chat enabled');
