// NOVA OMNI Local: optional, client-side-only model inference.
// This worker is initiated only after the visitor explicitly accepts a model download.
const MODEL_ID = 'onnx-community/Qwen3-0.6B-ONNX';
const LIBRARY = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.1';
let generator = null;
let initialization = null;
let generating = false;
const send = (type, detail={}) => self.postMessage({type, ...detail});
async function init() {
  if (generator) { send('ready', {model:MODEL_ID}); return; }
  if (initialization) return initialization;
  initialization = (async()=>{
    try {
      send('status',{text:'Downloading browser AI library…'});
      const {pipeline} = await import(LIBRARY);
      let useGPU = false;
      if (self.navigator?.gpu) {
        try { useGPU = Boolean(await self.navigator.gpu.requestAdapter()); } catch(e) {}
      }
      const device = useGPU ? 'webgpu' : 'wasm';
      const dtype = useGPU ? 'q4f16' : 'q4';
      send('status',{text:useGPU?'Preparing GPU and downloading AI model…':'GPU unavailable: using slower CPU model…'});
      generator = await pipeline('text-generation',MODEL_ID,{
        device,dtype,
        progress_callback:(info)=>{
          if(info?.status==='progress' && typeof info.progress==='number')
            send('progress',{progress:Math.min(100,Math.max(0,info.progress)),file:String(info.file||'model')});
          else if(info?.status==='initiate' || info?.status==='download')
            send('status',{text:'Downloading '+String(info.file||'model data')+'…'});
        }
      });
      send('ready',{model:MODEL_ID,device});
    } catch (error) {
      generator=null; initialization=null;
      send('error',{stage:'load',message:String(error?.message||error).slice(0,300)});
    }
  })();
  return initialization;
}
function instruction(language){
  const languages={'ar-eg':'Egyptian Arabic dialect','ar':'Modern Standard Arabic','en':'English','fr':'French','es':'Spanish','de':'German','pt':'Portuguese','it':'Italian','ru':'Russian','tr':'Turkish','hi':'Hindi','ur':'Urdu','zh':'Chinese','ja':'Japanese','ko':'Korean','id':'Indonesian','bn':'Bengali','fa':'Persian','sw':'Swahili','vi':'Vietnamese','th':'Thai','nl':'Dutch','pl':'Polish'};
  return 'You are NOVA OMNI Local, a small on-device assistant. Be helpful, accurate, age-appropriate, and admit uncertainty. Never claim live internet access or strong benchmarks. '+
   (languages[language]?'Reply in '+languages[language]+' unless the user requests a translation.':'Reply in the same language and dialect as the user.');
}
async function generate(request){
 if(!generator){send('error',{stage:'chat',message:'Load the local model first.'});return;}
 if(generating){send('error',{stage:'chat',message:'An answer is already being generated.'});return;}
 generating=true;
 try{
  const history=Array.isArray(request.history)?request.history.filter(m=>m && ['user','assistant'].includes(m.role) && typeof m.content==='string').slice(-9):[];
  if(!history.length||history.at(-1).role!=='user')throw Error('Please type a question.');
  const messages=[{role:'system',content:instruction(request.language)},...history];
  send('status',{text:'Generating locally on your device…'});
  const out=await generator(messages,{max_new_tokens:160,do_sample:false});
  const text=out?.[0]?.generated_text;
  let answer=Array.isArray(text)?String(text.at(-1)?.content||''):String(text||'');
  if(!Array.isArray(text)&&answer.startsWith(history.at(-1).content))answer=answer.slice(history.at(-1).content.length);
  answer=answer.replace(/<think>[\s\S]*?<\/think>/g,'').replace(/<\|[^|]+\|>/g,'').trim();
  if(!answer)throw Error('The model returned no usable answer.');
  send('answer',{answer,model:MODEL_ID});
 }catch(error){send('error',{stage:'chat',message:String(error?.message||error).slice(0,300)});}
 finally{generating=false;}
}
self.onmessage=(event)=>{
 const data=event.data||{};
 if(data.type==='init')void init();
 else if(data.type==='generate')void generate(data);
};
