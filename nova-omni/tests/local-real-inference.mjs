// This test calls the real public ONNX model without a paid API or model gateway.
import { pipeline } from '@huggingface/transformers';
const model='onnx-community/Qwen3-0.6B-ONNX';
const t0=Date.now();
console.log('Loading real Qwen3 ONNX on CPU (q4).');
const pipe=await pipeline('text-generation',model,{
  device:'cpu',dtype:'q4',
  progress_callback:p=>{
    if(p?.status==='progress' && p.file?.includes('.onnx') && p.progress>=99){
      console.log('ONNX model download complete.');
    }
  }
});
console.log('Model ready in',Math.round((Date.now()-t0)/1000),'seconds.');
try {
 const input=[
  {role:'system',content:'You are a multilingual assistant. Reply in natural Egyptian Arabic.'},
  {role:'user',content:'قول تحية قصيرة باللهجة المصرية. /no_think'}
 ];
 const output=await pipe(input,{max_new_tokens:64,do_sample:false});
 const generated=output?.[0]?.generated_text;
 let text=Array.isArray(generated)?String(generated.at(-1)?.content||''):String(generated||'');
 text=text.replace(/<think>[\s\S]*?<\/think>/g,'').trim();
 if(!text)throw Error('Real local model returned an empty answer');
 console.log('REAL_MODEL:',model);
 console.log('REAL_ARABIC_RESPONSE:',text.slice(0,250));
 console.log('TOTAL_SECONDS:',Math.round((Date.now()-t0)/1000));
} finally {await pipe.dispose?.();}
