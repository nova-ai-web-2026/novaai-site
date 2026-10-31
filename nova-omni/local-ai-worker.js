// NOVA OMNI Local v2.8 — on-device, no paid API or remote inference.
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
 general:'Answer the latest question directly, using earlier chat to understand references. Cover each requested part; never invent facts.',
 explain:'Give a clear definition, explain why it works and show a correct small example. Address the exact step asked.',
 writing:'Produce a complete copy-ready draft in the requested tone and language. Preserve supplied facts without adding imaginary details.',
 coding:'Provide useful concise code, a usage note and important assumptions. Never claim external access or that code was run.',
 planning:'Provide practical ordered actions, constraints and a way to check results.',
 summarise:'Summarise only user-provided source text. Preserve key numbers, names and distinctions; never invent unseen content.',
 translate:'Translate into the requested language faithfully, preserving meaning, names and tone without extra commentary.',
 study:'Identify givens and the question, choose the right rule, show substitution and reasoning and verify results.'
});
let generator=null,selectedProfile=null,deviceUsed='',initializing=false,generating=false,TextStreamerClass=null;
let lastLoadActivity=0;
const send=(type,detail={})=>self.postMessage({type,...detail});
const profileFor=name=>PROFILES[name]||PROFILES.balanced;
const memoryFor=name=>MEMORY[name]||MEMORY.balanced;
function detectTask(text){
 const s=String(text||'').trim().toLowerCase().replace(/^(?:(?:لو سمحت|من فضلك|ممكن|عايزك|عايز|please|could you|can you|i need you to)\s*[,،]?\s*)+/iu,'');
 if(/^(?:ترجم|ترجمة|translate|translation)/iu.test(s))return 'translate';
 if(/^(?:لخّص|لخص|تلخيص|summari[sz]e|summary)/iu.test(s))return 'summarise';
 if(/^(?:اكتب كود|برمج|صلح الكود|صحح الكود|debug|fix (?:this|my) code|write (?:a )?(?:script|program|function)|code|python|javascript)/iu.test(s))return 'coding';
 if(/^(?:حل|مسألة|سؤال رياضيات|اثبت|برهن|solve|prove|work out|how (?:do|can) i solve)/iu.test(s))return 'study';
 if(/^(?:اشرح|فسر|وضح|ليه|لماذا|ما معنى|explain|what (?:does|is|are)|how (?:does|do|is))/iu.test(s))return 'explain';
 if(/^(?:خطة|خطوات|رتب|اعمل خطة|plan|roadmap|step.by.step)/iu.test(s))return 'planning';
 if(/^(?:اكتب|صياغة|رسالة|إيميل|email|draft|rewrite|write|polish|عدّل النص|حسن النص)/iu.test(s))return 'writing';
 return 'general';
}
function resolvedTask(task,text){
 return typeof task==='string'&&Object.hasOwn(TASK_INSTRUCTIONS,task)?task:detectTask(text);
}
function instruction(language,task,lastText,profile){
 const arabicLast=/[\u0600-\u06ff]/.test(lastText);
 const arabic=['ar','ar-eg'].includes(language)||(language==='auto'&&arabicLast);
 const ArabicTasks={
   general:'جاوب مباشرة، واستخدم السياق السابق لفهم المتابعة وغطّي كل جزء من السؤال.',
   explain:'ابدأ بتعريف صغير واشرح السبب بمثال، ولو السؤال عن خطوة معينة ركّز عليها.',
   study:'حدّد المعطيات والمطلوب، واختار القانون، وحل خطوة خطوة وراجع الإجابة.',
   writing:'اكتب النص كاملًا جاهزًا للنسخ بالنبرة المطلوبة، من غير اختراع تفاصيل.',
   coding:'اكتب كودًا صغيرًا مفهومًا واذكر طريقة تشغيله والافتراضات. لا تدّعي أنك نفذته أو اختبرته.',
   planning:'اكتب خطوات عملية بترتيب واضح وأول خطوة قابلة للتنفيذ، مش نصايح عامة.',
   summarise:'لخّص النص الموجود فقط مع الحفاظ على الأرقام والأسماء، ومتخترعش معلومات.',
   translate:'ترجم بأمانة للغة المطلوبة، وحافظ على المعنى والأسلوب بدون شرح إضافي.'
  };
 if(arabic){
  const dialect=language==='ar-eg'||(language==='auto'&&arabicLast)?
   'اتكلم بالمصري الطبيعي الواضح، إلا لو المستخدم طلب لغة تانية.':'اكتب بالعربية الواضحة إلا لو طُلب غيرها.';
  const translate=task==='translate'?'خلي الترجمة باللغة اللي طلبها المستخدم، حتى لو مش عربي.':dialect;
  return [
   'أنت NOVA، مساعد ذكاء اصطناعي صغير على جهاز المستخدم، بدون اتصال بحث أو أدوات خارجية.',
   'ركّز على السؤال الحقيقي. لا تخترع معلومات أو نتائج، ولو مش عارف قول مش متأكد.',
   'جاوب كل الأجزاء المطلوبة من غير تكرار، واربط سؤال المتابعة بالرسائل السابقة.',
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
  'Use earlier chat for follow-ups. Answer directly, cover all parts and avoid filler or repetition.',
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
 if(parts.length<2)return text;
 const result=[];
 for(const part of parts){
  if(part.trim().length>7&&result.length&&part.trim().toLocaleLowerCase()===result.at(-1).trim().toLocaleLowerCase())continue;
  result.push(part);
 }
 return result.join(' ').trim();
}
function generationConfig(profile,task){
 const baseline=profileFor(profile).maxTokens;
 const boost=['study','coding','planning','writing'].includes(task)?75:task==='explain'?40:0;
 const analytical=['study','coding','translate','summarise'].includes(task);
 return {max_new_tokens:Math.min(340,baseline+boost),do_sample:true,
  temperature:profile==='lite'?0.68:analytical?0.44:task==='writing'?0.66:0.57,
  top_p:analytical?0.82:0.88,top_k:20,repetition_penalty:1.16};
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
  const options=generationConfig(selectedProfile,task);
   const generationMax=options.max_new_tokens;
  let partial='',lastUpdate=0;
  if(TextStreamerClass){
   options.streamer=new TextStreamerClass(generator.tokenizer,{
    skip_prompt:true,skip_special_tokens:true,
    callback_function:text=>{
     partial+=String(text||'');
     const now=Date.now();
     if(now-lastUpdate<140||partial.length>5000)return;
     lastUpdate=now;
     const visible=cleanResponse(partial,history.at(-1).content);
     if(visible)send('partial',{text:visible.slice(0,4800)});
    }
   });
  }
  send('status',{phase:'generation',text:'Generating on your device…',task});
  const result=await generator(messages,options);
  let answer=trimRepeats(cleanResponse(result?.[0]?.generated_text,history.at(-1).content));
  if(!answer)throw Error('The local model returned no usable answer. Try a shorter question or a different profile.');
  // Only repetitive drafts incur one bounded extra inference; ordinary answers stay fast.
   if(isRepetitive(answer)&&selectedProfile!=='lite'){
    send('status',{phase:'quality',text:'Improving a repetitive answer locally…'});
    try{
     const retry=await generator(messages,{...options,streamer:undefined,
      max_new_tokens:Math.min(175,generationMax),temperature:0.4,repetition_penalty:1.28});
     const revised=trimRepeats(cleanResponse(retry?.[0]?.generated_text,history.at(-1).content));
     if(revised&&!isRepetitive(revised))answer=revised;
    }catch(e){/* keep original draft if repair fails */}
   }
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
