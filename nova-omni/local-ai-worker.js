// NOVA OMNI Local — browser-only inference; no AI Gateway or paid API.
// The model is requested only after the visitor confirms the download.
const LIBRARY_URL='https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.1';
const MODELS=Object.freeze({
  standard:{id:'onnx-community/Qwen3-0.6B-ONNX',name:'Qwen3 0.6B'},
  lite:{id:'onnx-community/SmolLM2-135M-Instruct-ONNX',name:'SmolLM2 135M (English-first)'}
});
let generator=null;
let selectedProfile=null;
let initializing=false;
let generating=false;
const send=(type,detail={})=>self.postMessage({type,...detail});
function profileFor(name){return MODELS[name]||MODELS.standard;}
function instruction(language){
 const languages={
  'ar-eg':'natural Egyptian Arabic','ar':'Modern Standard Arabic',en:'English',
  fr:'French',es:'Spanish',de:'German',pt:'Portuguese',it:'Italian',ru:'Russian',
  tr:'Turkish',hi:'Hindi',ur:'Urdu',zh:'Chinese',ja:'Japanese',ko:'Korean',
  id:'Indonesian',bn:'Bengali',fa:'Persian',sw:'Swahili',vi:'Vietnamese',
  th:'Thai',nl:'Dutch',pl:'Polish'
 };
 return 'You are NOVA OMNI Local, a small assistant running on this device. '+
  'Be accurate, admit uncertainty, and give safe age-appropriate answers. '+
  'You have no live browsing or cloud AI tools. Never pretend to have checked live sources. '+
  (languages[language]
    ?'Reply in '+languages[language]+' unless the user requests a translation.'
    :'Reply in the same language and dialect as the user.');
}
async function init(name){
 if(generator){
   send('ready',{model:profileFor(selectedProfile).id,profile:selectedProfile,device:'loaded'});
   return;
 }
 if(initializing)return;
 initializing=true;
 const profile=Object.hasOwn(MODELS,name)?name:'standard';
 const model=profileFor(profile);
 try{
   send('status',{text:'Loading the browser AI library…'});
   const {pipeline}=await import(LIBRARY_URL);
   let gpu=false;
   if(self.navigator?.gpu){
     try{
       const adapter=await self.navigator.gpu.requestAdapter();
       gpu=Boolean(adapter?.features?.has('shader-f16'));
     }catch(err){gpu=false;}
   }
   const device=gpu?'webgpu':'wasm',dtype=gpu?'q4f16':'q4';
   send('status',{text:'Preparing '+model.name+' ('+device+', '+dtype+')…'});
   generator=await pipeline('text-generation',model.id,{
     device,dtype,
     progress_callback:info=>{
       if(info?.status==='progress'&&typeof info.progress==='number'){
         const p=Math.min(100,Math.max(0,info.progress));
         send('progress',{progress:p,file:String(info.file||'model')});
       }else if(['initiate','download','done'].includes(info?.status)){
         send('status',{text:String(info.status)+' '+String(info.file||'model data')});
       }
     }
   });
   selectedProfile=profile;
   send('ready',{model:model.id,profile,device});
 }catch(err){
   generator=null;selectedProfile=null;
   send('error',{stage:'load',message:String(err?.message||err).slice(0,320)});
 }finally{initializing=false;}
}
function cleanResponse(generated,lastUser){
 let reply=Array.isArray(generated)?String(generated.at(-1)?.content||''):String(generated||'');
 if(!Array.isArray(generated)&&reply.startsWith(lastUser)){
  reply=reply.slice(lastUser.length);
 }
 return reply
   .replace(/<think>[\s\S]*?<\/think>/g,'')
   .replace(/^\s*<think>[\s\S]*$/,'')
   .replace(/<\|[^|]+\|>/g,'')
   .trim();
}
async function generate(payload){
 if(!generator){send('error',{stage:'chat',message:'Please load the local model first.'});return;}
 if(generating){send('error',{stage:'chat',message:'Another answer is already being generated.'});return;}
 generating=true;
 try{
   const history=Array.isArray(payload.history)
     ?payload.history.filter(x=>x && ['user','assistant'].includes(x.role) && typeof x.content==='string' && x.content.trim()).slice(-9).map(m=>({role:m.role,content:m.content.slice(0,2400)}))
     :[];
   if(!history.length||history.at(-1).role!=='user')throw Error('Please enter a question first.');
   // Qwen3 can devote the entire token budget to internal thinking.
   // A per-request /no_think instruction keeps short, browser-local replies usable.
   if(selectedProfile==='standard')history.at(-1).content+=' /no_think';
   const messages=[{role:'system',content:instruction(payload.language)},...history];
   send('status',{text:'Generating on your own device (no AI Gateway)…'});
   const out=await generator(messages,{max_new_tokens:128,do_sample:false});
   const answer=cleanResponse(out?.[0]?.generated_text,history.at(-1).content);
   if(!answer)throw Error('The local model returned no usable answer. Try asking a shorter question.');
   send('answer',{answer,model:profileFor(selectedProfile).id});
 }catch(err){
   send('error',{stage:'chat',message:String(err?.message||err).slice(0,300)});
 }finally{generating=false;}
}
self.onmessage=event=>{
 const data=event.data||{};
 if(data.type==='init')void init(data.profile);
 if(data.type==='generate')void generate(data);
};
