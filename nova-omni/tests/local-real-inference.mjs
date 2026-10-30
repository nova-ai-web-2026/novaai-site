// Real Qwen3 local inference smoke test. No AI Gateway, no user secrets.
// The model uses a balanced 4-bit CPU configuration and Qwen3's official
// non-thinking + sampling approach to avoid greedy repetition.
import {pipeline} from '@huggingface/transformers';
const model='onnx-community/Qwen3-0.6B-ONNX';
const start=Date.now();
let lastLogged=-1;
console.log('Downloading actual Qwen3 0.6B ONNX Q4 weights into runner cache.');
const generator=await pipeline('text-generation',model,{
 device:'cpu',dtype:'q4',
 progress_callback:info=>{
  if(info?.status==='progress'&&String(info.file).includes('.onnx')){
   const progress=Math.floor(Number(info.progress)||0);
   if(progress>=100&&lastLogged<100){lastLogged=100;console.log('Model ONNX download complete.');}
  }
 }
});
console.log('MODEL_LOADED_SECONDS:',Math.round((Date.now()-start)/1000));
const prompts=[
 [
  {role:'system',content:'You are a friendly assistant. Reply naturally in Egyptian Arabic. Avoid repetition and use no more than one sentence.'},
  {role:'user',content:'إزيك يا معلم؟ رد بتحية قصيرة بالمصري.\n/no_think'}
 ],
 [
  {role:'system',content:'You are a concise assistant. Answer the question directly, in English.'},
  {role:'user',content:'What is 3 + 4? Reply with just the number.\n/no_think'}
 ]
];
function cleanResponse(result){
 const generated=result?.[0]?.generated_text;
 return (Array.isArray(generated)?String(generated.at(-1)?.content||''):String(generated||''))
  .replace(/<think>[\s\S]*?<\/think>/g,'').replace(/^\s*<think>[\s\S]*$/,'').trim();
}
try{
 for(let i=0;i<prompts.length;i++){
  const current=Date.now();
  const output=await generator(prompts[i],{
   max_new_tokens:i===0?125:60,
   do_sample:true,temperature:0.7,top_p:0.8,top_k:20,
   repetition_penalty:1.12
  });
  const answer=cleanResponse(output);
  if(!answer)throw Error('Empty reply in live test '+i);
  console.log('REAL_TEST_LANGUAGE:',i===0?'egyptian-arabic':'english');
  console.log('REAL_RESPONSE:',answer.slice(0,350));
  console.log('GENERATION_SECONDS:',Math.round((Date.now()-current)/1000));
 }
 console.log('REAL_INFERENCE: SUCCESS; no cloud model API used.');
}finally{await generator.dispose?.();}
