// NOVA OMNI Local v1.2 — on-device inference, zero API keys or paid model calls.
// Model downloads occur only after explicit user consent in local.html.
const LIBRARY_URL='https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.1';
const PROFILES=Object.freeze({
  balanced:{id:'onnx-community/Qwen3-0.6B-ONNX',name:'Qwen3 0.6B · Balanced',maxTokens:190},
  lite:{id:'onnx-community/SmolLM2-135M-Instruct-ONNX',name:'SmolLM2 135M · Lite (English-first)',maxTokens:155}
});
const MEMORY=Object.freeze({
  short:{messages:8,characters:4800},
  balanced:{messages:14,characters:9000},
  extended:{messages:18,characters:12000}
});
let generator=null,selectedProfile=null,initializing=false,generating=false,deviceUsed='';
const send=(type,detail={})=>self.postMessage({type,...detail});
const profileFor=name=>PROFILES[name]||PROFILES.balanced;
const memoryFor=name=>MEMORY[name]||MEMORY.balanced;
function instruction(language){
 const langs={
  'ar-eg':'natural conversational Egyptian Arabic','ar':'Modern Standard Arabic',
  en:'English',fr:'French',es:'Spanish',de:'German',pt:'Portuguese',it:'Italian',
  ru:'Russian',tr:'Turkish',hi:'Hindi',ur:'Urdu',zh:'Chinese',ja:'Japanese',
  ko:'Korean',id:'Indonesian',bn:'Bengali',fa:'Persian',sw:'Swahili',vi:'Vietnamese',
  th:'Thai',nl:'Dutch',pl:'Polish'
 };
 const output=langs[language]?'Respond in '+langs[language]+'.':'Respond in the language and dialect of the most recent user message.';
 return 'You are NOVA OMNI Local, a compact assistant that runs on the device. '+
  'Give clear, helpful and accurate answers. If uncertain, say so. '+
  'Avoid repetitive words or phrases and avoid making up facts. '+
  'You have no live web search. Never claim you checked current information. '+
  'Provide safe and age-appropriate answers. '+output;
}
function prepareHistory(input,depth){
 if(!Array.isArray(input))return [];
 const settings=memoryFor(depth);
 const data=input.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string'&&m.content.trim()).slice(-settings.messages);
 let remaining=settings.characters;
 const kept=[];
 for(let i=data.length-1;i>=0&&remaining>0;i--){
  const m=data[i];
  const text=m.content.trim().slice(0,Math.min(1600,remaining));
  if(!text)continue;
  kept.unshift({role:m.role,content:text});
  remaining-=text.length;
 }
 return kept;
}
function cleanResponse(generated,prompt){
 let value=Array.isArray(generated)?String(generated.at(-1)?.content||''):String(generated||'');
 if(!Array.isArray(generated)&&value.startsWith(prompt))value=value.slice(prompt.length);
 return value.replace(/<think>[\s\S]*?<\/think>/g,'')
   .replace(/^\s*<think>[\s\S]*$/,'')
   .replace(/<\|[^|]+\|>/g,'')
   .trim();
}
function isRepetitive(text){
 const tokens=(text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)||[]);
 if(tokens.length<12)return false;
 for(let n=3;n<=6;n++){
  for(let i=0;i+n*3<=tokens.length;i++){
   const a=tokens.slice(i,i+n).join(' ');
   if(a===tokens.slice(i+n,i+2*n).join(' ')&&a===tokens.slice(i+2*n,i+3*n).join(' '))return true;
  }
 }
 const lines=text.split(/[\n.!?؟،؛]+/).map(s=>s.trim()).filter(s=>s.length>9);
 for(let i=0;i+2<lines.length;i++){
  if(lines[i]===lines[i+1]&&lines[i]===lines[i+2])return true;
 }
 return false;
}
async function init(name){
 if(generator){
  send('ready',{model:profileFor(selectedProfile).id,profile:selectedProfile,device:deviceUsed||'loaded'});
  return;
 }
 if(initializing)return;
 initializing=true;
 const profile=Object.hasOwn(PROFILES,name)?name:'balanced';
 const model=profileFor(profile);
 try{
  send('status',{text:'Loading the AI library in your browser…'});
  const {pipeline,env}=await import(LIBRARY_URL);
  // Reuse downloaded WASM and ONNX weights where browser caching is available.
  if(env)env.useWasmCache=true;
  let gpu=false;
  if(self.navigator?.gpu){
   try{
    const adapter=await self.navigator.gpu.requestAdapter();
    gpu=Boolean(adapter?.features?.has('shader-f16'));
   }catch(err){gpu=false;}
  }
  const device=gpu?'webgpu':'wasm';
  const dtype=gpu?'q4f16':'q4';
  send('status',{text:'Preparing '+model.name+' using '+device+'…'});
  let lastPercent=-1;
  generator=await pipeline('text-generation',model.id,{
   device,dtype,
   progress_callback:info=>{
    if(info?.status==='progress'&&typeof info.progress==='number'){
     const progress=Math.max(0,Math.min(100,Math.round(info.progress)));
     if(progress!==lastPercent){
      lastPercent=progress;
      send('progress',{progress,file:String(info.file||'model file').split('/').at(-1)});
     }
    }else if(info?.status==='initiate'||info?.status==='download'){
     send('status',{text:'Downloading model files…'});
    }
   }
  });
  selectedProfile=profile;deviceUsed=device;
  send('ready',{model:model.id,profile,device});
 }catch(err){
  generator=null;selectedProfile=null;deviceUsed='';
  send('error',{stage:'load',message:String(err?.message||err).slice(0,320)});
 }finally{initializing=false;}
}
async function generate(payload){
 if(!generator){send('error',{stage:'chat',message:'Load the local model first.'});return;}
 if(generating){send('error',{stage:'chat',message:'An answer is already being generated.'});return;}
 generating=true;
 try{
  const history=prepareHistory(payload.history,payload.memory);
  if(history.length<1||history.at(-1).role!=='user')throw Error('Type a question before sending.');
  // Official Qwen3 guidance: /no_think for short replies. Sampling avoids
  // the deterministic repetition observed in the first real inference test.
  if(selectedProfile==='balanced')history.at(-1).content+='\n/no_think';
  const messages=[{role:'system',content:instruction(payload.language)},...history];
  send('status',{text:'Generating on your device…'});
  const max_new_tokens=profileFor(selectedProfile).maxTokens;
  const settings=selectedProfile==='balanced'
   ?{do_sample:true,temperature:0.7,top_p:0.8,top_k:20,repetition_penalty:1.12,max_new_tokens}
   :{do_sample:true,temperature:0.8,top_p:0.88,top_k:25,repetition_penalty:1.12,max_new_tokens};
  const out=await generator(messages,settings);
  let answer=cleanResponse(out?.[0]?.generated_text,history.at(-1).content);
  if(selectedProfile==='balanced'&&isRepetitive(answer)){
   send('status',{text:'Improving a repetitive reply…'});
   const retry=await generator(messages,{...settings,temperature:0.82,top_p:0.85,repetition_penalty:1.25,max_new_tokens:145});
   const improved=cleanResponse(retry?.[0]?.generated_text,history.at(-1).content);
   if(improved&&!isRepetitive(improved))answer=improved;
  }
  if(!answer)throw Error('The model did not produce a usable reply. Try a shorter question.');
  send('answer',{answer,model:profileFor(selectedProfile).id,contextMessages:history.length});
 }catch(err){
  send('error',{stage:'chat',message:String(err?.message||err).slice(0,300)});
 }finally{generating=false;}
}
self.onmessage=event=>{
 const data=event.data||{};
 if(data.type==='init')void init(data.profile);
 else if(data.type==='generate')void generate(data);
};
