// NOVA OMNI Local v2.4 — on-device, no paid API or remote inference.
// Initiated only by the visitor's consent; memory and model profile are adjustable.
const LIBRARY_URL='https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.1';
const PROFILES=Object.freeze({
 balanced:{id:'onnx-community/Qwen3-0.6B-ONNX',name:'Qwen3 0.6B — Smart',maxTokens:210,noThink:true},
 fast:{id:'onnx-community/Qwen2.5-0.5B-Instruct',name:'Qwen2.5 0.5B — Fast',maxTokens:190,noThink:false},
 lite:{id:'onnx-community/SmolLM2-135M-Instruct-ONNX',name:'SmolLM2 135M — Lite',maxTokens:140,noThink:false}
});
const MEMORY=Object.freeze({
 short:{messages:8,characters:4800},
 balanced:{messages:14,characters:9000},
 extended:{messages:18,characters:12000}
});
const TASK_INSTRUCTIONS=Object.freeze({
 general:'Understand the user request first. Answer directly, without generic filler or repeating the question. If ambiguous, make one reasonable assumption and state it.',
 explain:'Explain the concept clearly. Give a short definition, 2 or 3 logically ordered steps, and one correct simple example. Avoid unnecessary technical jargon.',
 writing:'Produce a finished, naturally worded draft ready to copy. Follow the desired tone and purpose; avoid generic introductions, invented facts, and repetitive sentences.',
 coding:'Provide short runnable code when practical, show how to use it, and point out any assumptions. Do not pretend code was tested. Never invent APIs, files or external access.',
 planning:'Give an actionable plan of realistic, ordered steps with what to do first and how to check progress. Avoid vague advice.',
 summarise:'Summarise ONLY text supplied by the user in this conversation. Keep key facts and distinctions. Never invent unseen material.',
 translate:'Translate the user-provided text faithfully into the requested language, preserving meaning and tone; avoid extra commentary.',
 study:'Act as a patient tutor. Explain how to solve the task, show working and verify each step. Admit uncertainty instead of guessing results.'
});
let generator=null,selectedProfile=null,deviceUsed='',initializing=false,generating=false,TextStreamerClass=null;
let lastLoadActivity=0;
const send=(type,detail={})=>self.postMessage({type,...detail});
const profileFor=name=>PROFILES[name]||PROFILES.balanced;
const memoryFor=name=>MEMORY[name]||MEMORY.balanced;
function detectTask(text){
 const s=String(text||'').trim().toLowerCase();
 if(/(?:^|\s)(?:ترجم|translate|translation|ترجمة)(?:\s|$)/i.test(s))return 'translate';
 if(/(?:^|\s)(?:لخص|لخّص|تلخيص|summari[sz]e|summary)(?:\s|$)/i.test(s))return 'summarise';
 if(/(?:^|\s)(?:كود|برمجة|برمج|python|javascript|html|code|program|debug)(?:\s|$)/i.test(s))return 'coding';
 if(/(?:^|\s)(?:اشرح|فسر|شرح|explain|what does|how does)(?:\s|$)/i.test(s))return 'explain';
 if(/(?:^|\s)(?:خطة|خطوات|رتب|plan|roadmap)(?:\s|$)/i.test(s))return 'planning';
 if(/(?:^|\s)(?:اكتب|صياغة|رسالة|إيميل|email|draft|rewrite|write)(?:\s|$)/i.test(s))return 'writing';
 if(/(?:^|\s)(?:حل|مسألة|سؤال|واجب|رياضيات|calculate|solve|proof)(?:\s|$)/i.test(s))return 'study';
 return 'general';
}
function resolvedTask(task,text){
 return typeof task==='string'&&Object.hasOwn(TASK_INSTRUCTIONS,task)?task:detectTask(text);
}
function instruction(language,task,lastText,profile){
 const arabicLast=/[\u0600-\u06ff]/.test(lastText);
 const arabic=['ar','ar-eg'].includes(language)||(language==='auto'&&arabicLast);
 const ArabicTasks={
  general:'افهم الطلب وجاوب عليه مباشرة من غير كلام زيادة أو تكرار السؤال.',
  explain:'اشرح الفكرة بتعريف واضح وسبب بسيط أو مثال صحيح. خلّي الشرح مرتب وسهل.',
  study:'حل خطوة خطوة مع القانون أو السبب. راجع النتيجة، ولو مش متأكد وضّح ده.',
  writing:'اكتب النص المطلوب كاملًا وجاهزًا للنسخ، بأسلوب طبيعي حسب طلب المستخدم.',
  coding:'اكتب كودًا صغيرًا مفهومًا، واذكر طريقة تشغيله. لا تدّعي أنك نفذته أو اختبرته.',
  planning:'اكتب خطوات عملية بالترتيب، ووضّح أول خطوة يمكن تنفيذها.',
  summarise:'لخّص النص الموجود في رسالة المستخدم فقط، في نقاط قصيرة، من غير اختراع تفاصيل.',
  translate:'ترجم النص بأمانة للغة المطلوبة، وحافظ على المعنى والأسلوب بدون شرح إضافي.'
 };
 if(arabic){
  const dialect=language==='ar-eg'||(language==='auto'&&arabicLast)?
   'اتكلم بالمصري الطبيعي الواضح، إلا لو المستخدم طلب لغة تانية.':'اكتب بالعربية الواضحة إلا لو طُلب غيرها.';
  const translate=task==='translate'?'خلي الترجمة باللغة اللي طلبها المستخدم، حتى لو مش عربي.':dialect;
  return [
   'أنت NOVA، مساعد ذكاء اصطناعي صغير على جهاز المستخدم، بدون اتصال بحث أو أدوات خارجية.',
   'ركّز على السؤال الحقيقي. لا تخترع معلومات أو نتائج، ولو مش عارف قول مش متأكد.',
   'خلي الرد مباشر ومفيد وتجنب التكرار والجمل غير المفهومة.',
   translate,ArabicTasks[task]||ArabicTasks.general,
   profile==='lite'?'لأن النموذج صغير جدًا، استخدم إجابة قصيرة وواضحة.':''
  ].filter(Boolean).join('\n');
 }
 const langs={
  en:'English',fr:'French',es:'Spanish',de:'German',pt:'Portuguese',it:'Italian',
  ru:'Russian',tr:'Turkish',hi:'Hindi',ur:'Urdu',zh:'Chinese',ja:'Japanese',
  ko:'Korean',id:'Indonesian',bn:'Bengali',fa:'Persian',sw:'Swahili',vi:'Vietnamese',
  th:'Thai',nl:'Dutch',pl:'Polish'
 };
 const output=langs[language]?'Reply in '+langs[language]+' unless a translation to another language was requested.':
  'Reply in the language of the latest user request.';
 return [
  'You are NOVA, a small local assistant with no access to browsing or other apps.',
  'Focus only on the actual request. Be clear, accurate, direct and avoid repetition.',
  'If uncertain, say so. Never invent sources or claim you executed code or actions.',
  output,TASK_INSTRUCTIONS[task]||TASK_INSTRUCTIONS.general
 ].join('\n');
}
function prepareHistory(input,depth){
 if(!Array.isArray(input))return [];
 const options=memoryFor(depth);
 const data=input.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string'&&m.content.trim()).slice(-options.messages);
 let remaining=options.characters;
 const kept=[];
 for(let i=data.length-1;i>=0&&remaining>0;i--){
  const m=data[i],cap=i===data.length-1?4200:1300;
  const content=m.content.trim().slice(0,Math.min(cap,remaining));
  if(!content)continue;
  kept.unshift({role:m.role,content});
  remaining-=content.length;
 }
 return kept;
}
function cleanResponse(generated,prompt){
 let text=Array.isArray(generated)?String(generated.at(-1)?.content||''):String(generated||'');
 if(!Array.isArray(generated)&&text.startsWith(prompt))text=text.slice(prompt.length);
 return text.replace(/<think>[\s\S]*?<\/think>/g,'')
  .replace(/^\s*<think>[\s\S]*$/,'')
  .replace(/<\|[^|]+\|>/g,'').trim();
}
function isRepetitive(s){
 const words=(String(s).toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)||[]);
 if(words.length<12)return false;
 for(let n=3;n<=6;n++)for(let i=0;i+3*n<=words.length;i++){
  const phrase=words.slice(i,i+n).join(' ');
  if(phrase===words.slice(i+n,i+2*n).join(' ')&&phrase===words.slice(i+2*n,i+3*n).join(' '))return true;
 }
 return false;
}
function trimRepeats(text){
 const parts=String(text).split(/(?<=[.!?؟])\s+/u);
 if(parts.length<3)return text;
 const result=[];
 for(const part of parts){
  if(part.trim().length>7&&result.length&&part.trim().toLocaleLowerCase()===result.at(-1).trim().toLocaleLowerCase())continue;
  result.push(part);
 }
 return result.join(' ').trim();
}
function runtimeFor(profile,hasGPU,hasFP16){
 if(hasGPU&&hasFP16)return {device:'webgpu',dtype:'q4f16'};
 // Smart CPU q8 was significantly slower during real inference tests.
 // Use its previously tested q4 variant. Fast and Lite retain smaller q8.
 return {device:'wasm',dtype:profile==='balanced'?'q4':'q8'};
}
async function init(request){
 if(generator){
  send('ready',{model:profileFor(selectedProfile).id,profile:selectedProfile,device:deviceUsed});
  return;
 }
 if(initializing)return;
 initializing=true;
 const profile=typeof request==='string'?request:Object.hasOwn(PROFILES,request?.profile)?request.profile:'balanced';
 const model=profileFor(profile);
 try{
  lastLoadActivity=Date.now();
  send('status',{phase:'library',text:'Preparing browser inference library…'});
  const {pipeline,TextStreamer,env,LogLevel}=await import(LIBRARY_URL);
  TextStreamerClass=TextStreamer;
  if(env){
   env.useBrowserCache=true;
   env.useWasmCache=true;
   if(LogLevel)env.logLevel=LogLevel.WARNING;
  }
  let hasGPU=false,hasFP16=false;
  if(request?.device!=='cpu'&&self.navigator?.gpu){
   try{
    const adapter=await self.navigator.gpu.requestAdapter();
    hasGPU=!!adapter;
    hasFP16=!!adapter?.features?.has('shader-f16');
   }catch(e){hasGPU=false;}
  }
  // These particular ONNX repositories have unusually large q4 CPU files:
  // Qwen3 q4=919MB vs q8=618MB; Qwen2.5 q4=786MB vs q8=512MB.
  // Prefer smaller q8 CPU files (often more accurate, too), and q4f16
  // only on GPUs explicitly supporting shader-f16. Never fetch both variants.
  const {device,dtype}=runtimeFor(profile,hasGPU,hasFP16);
  send('status',{phase:'model',model:model.id,device,dtype,text:'Preparing '+model.name+' locally'});
  let lastEmit=-1;
  generator=await pipeline('text-generation',model.id,{
   device,dtype,
   progress_callback:info=>{
    lastLoadActivity=Date.now();
    if(info?.status==='progress'||info?.status==='progress_total'){
     const percent=Math.min(100,Math.max(0,Math.floor(Number(info.progress)||0)));
     if(percent!==lastEmit){
      lastEmit=percent;
      send('progress',{phase:'download',progress:percent,loaded:Number(info.loaded)||0,total:Number(info.total)||0});
     }
    }else if(['initiate','download','done','ready'].includes(info?.status)){
     send('status',{phase:info.status==='ready'?'compile':'download',text:'Preparing local model files'});
    }
   }
  });
  selectedProfile=profile;deviceUsed=device;
  send('ready',{model:model.id,profile,device,dtype});
 }catch(error){
  generator=null;selectedProfile=null;deviceUsed='';
  send('error',{stage:'load',message:String(error?.message||error).slice(0,330),model:model.id,
   hint:'Check internet and free space. Try Fast or Lite for a smaller on-device download.'});
 }finally{initializing=false;}
}
async function generate(request){
 if(!generator){send('error',{stage:'chat',message:'Load a local model first.'});return;}
 if(generating){send('error',{stage:'chat',message:'Please finish the previous response first.'});return;}
 generating=true;
 try{
  const history=prepareHistory(request.history,request.memory);
  if(!history.length||history.at(-1).role!=='user')throw Error('Type a question before sending.');
  const lastText=history.at(-1).content;
  const task=resolvedTask(request.task,lastText);
  if(selectedProfile==='balanced')history.at(-1).content+='\n/no_think';
  const messages=[{role:'system',content:instruction(request.language,task,lastText,selectedProfile)},...history];
  const generationMax=Math.min(320,profileFor(selectedProfile).maxTokens+
   (['coding','writing','planning','study'].includes(task)?55:0));
  const options={
   max_new_tokens:generationMax,do_sample:true,
   temperature:selectedProfile==='lite'?0.8:0.7,
   top_p:selectedProfile==='lite'?0.88:0.8,top_k:20,repetition_penalty:1.14
  };
  let partial='',lastUpdate=0;
  if(TextStreamerClass){
   options.streamer=new TextStreamerClass(generator.tokenizer,{
    skip_prompt:true,skip_special_tokens:true,
    callback_function:text=>{
     partial+=String(text||'');
     const now=Date.now();
     if(now-lastUpdate<150||partial.length>1600)return;
     lastUpdate=now;
     const visible=cleanResponse(partial,history.at(-1).content);
     if(visible)send('partial',{text:visible.slice(0,1700)});
    }
   });
  }
  send('status',{phase:'generation',text:'Generating on your device…',task});
  const result=await generator(messages,options);
  let answer=trimRepeats(cleanResponse(result?.[0]?.generated_text,history.at(-1).content));
  if(!answer)throw Error('The local model returned no usable answer. Try a shorter question or a different profile.');
  if(isRepetitive(answer))send('status',{phase:'quality',text:'Answer may contain repetition; smaller models have limits.'});
  send('answer',{answer,task,model:profileFor(selectedProfile).id,contextMessages:history.length});
 }catch(error){
  send('error',{stage:'chat',message:String(error?.message||error).slice(0,330)});
 }finally{generating=false;}
}
self.onmessage=event=>{
 const data=event.data||{};
 if(data.type==='init')void init(data);
 else if(data.type==='generate')void generate(data);
};
