import fs from 'node:fs';

const file = 'nova-ultimate/index.html';
let html = fs.readFileSync(file, 'utf8');

if (!html.includes('https://js.puter.com/v2/')) {
  html = html.replace('</head>', '<script src="https://js.puter.com/v2/"></script>\n</head>');
}

const sendPattern = /async function send\(\)\{[\s\S]*?\}\n\$\('#prompt'\)\.addEventListener/;
if (!sendPattern.test(html)) {
  throw new Error('Could not find NovaAI send() function to patch');
}

const newSend = String.raw`async function send(){
  const p=$('#prompt'),text=p.value.trim();
  if(!text)return;
  state.messages.push({role:'user',content:text});
  p.value='';grow();save();render();$('#sendBtn').disabled=true;
  try{
    if(!window.puter?.ai?.chat) throw new Error('تعذر تحميل خدمة الذكاء الاصطناعي. حدّث الصفحة وتأكد من الإنترنت.');
    const modeGuide={
      general:'Be a highly capable general assistant. Give accurate, practical answers and say when you are uncertain.',
      study:'Be an excellent tutor. Explain clearly and adapt to the student level.',
      coding:'Be a senior software engineer. Produce correct, secure, maintainable code and explain important tradeoffs.',
      research:'Be a careful research assistant. Separate facts from assumptions and never invent sources.',
      writing:'Be a strong writing assistant. Preserve the user intent and requested tone while improving clarity and structure.'
    };
    const system='You are NovaAI, a fast and highly capable AI assistant. '+(modeGuide[state.mode]||modeGuide.general)+' Reply in the user language naturally.';
    const history=state.messages.slice(-20,-1).filter(m=>m.role==='user'||m.role==='assistant').map(m=>({role:m.role,content:String(m.content||'').slice(0,12000)}));
    const fileContext=(state.files||[]).filter(f=>f.text).slice(0,8).map(f=>'\n[File: '+f.name+']\n'+String(f.text).slice(0,18000)).join('\n');
    const conversation=[{role:'system',content:system},...history,{role:'user',content:text+(fileContext?'\n\nAttached file context:'+fileContext:'')}];

    const models=[
      ['anthropic/claude-opus-5','Claude Opus 5'],
      ['qwen/qwen3.8-max','Qwen3.8 Max']
    ];
    let response=null,model='';
    let lastError=null;
    for(const [id,label] of models){
      try{
        response=await puter.ai.chat(conversation,{model:id});
        model=label;
        break;
      }catch(err){lastError=err}
    }
    if(!response){
      try{response=await puter.ai.chat(conversation);model='Puter AI';}
      catch(err){throw lastError||err}
    }

    const raw=response?.message?.content ?? response;
    const reply=typeof raw==='string'?raw:Array.isArray(raw)?raw.map(x=>typeof x==='string'?x:(x?.text||'')).join(''):String(raw||'');
    if(!reply.trim()) throw new Error('لم يصل رد من النموذج.');
    addAssistant(reply.trim(),model);
  }catch(e){
    const msg=String(e?.message||e||'تعذر تشغيل المحادثة');
    addAssistant('تعذر تشغيل المحادثة الآن. '+msg);
  }finally{$('#sendBtn').disabled=false}
}
$('#prompt').addEventListener`;

html = html.replace(sendPattern, newSend);
html = html.replaceAll('تعديل محلي وتوليد AI عند ربط الخادم','تعديل محلي مع أدوات AI');
html = html.replaceAll('المحادثة الذكية محتاجة خادم API متصل. الأدوات المحلية شغالة عادي، ومن الإعدادات تقدر تربط عنوان الخادم لما يكون جاهز.','المحادثة تعمل مباشرة عبر Claude Opus 5، مع Qwen3.8 Max كبديل تلقائي.');
html = html.replaceAll('GitHub Pages يشغّل الواجهة والأدوات المحلية فقط؛ أضف رابط خادم API لتفعيل المحادثة وتوليد AI.','المحادثة تعمل مباشرة عبر Claude Opus 5، مع Qwen3.8 Max كبديل تلقائي. رابط الخادم اختياري للصور فقط.');
html = html.replaceAll('عنوان خادم NovaAI API','عنوان خادم الصور الاختياري');
html = html.replaceAll("navigator.serviceWorker.register('./sw.js?v=3')","navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).then(()=>navigator.serviceWorker.register('./sw.js?v=5'))");

fs.writeFileSync(file, html);
console.log('NovaAI: Claude Opus 5 primary + Qwen3.8 Max fallback enabled');
