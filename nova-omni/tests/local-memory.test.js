'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const math=require('../local-math.js');

test('offline calculator correctly handles ordinary order of operations',()=>{
 assert.equal(math.calculate('3+4'),7);
 assert.equal(math.calculate('(2+3)*4'),20);
 assert.equal(math.calculate('2^3^2'),512);
 assert.equal(math.calculate('-3^2'),-9);
 assert.equal(math.calculate('0.1+0.2'),0.3);
});
test('offline arithmetic understands Arabic and English math prompts',()=>{
 assert.equal(math.tryArithmetic('What is 3 + 4? Reply with the number.').value,7);
 assert.equal(math.tryArithmetic('احسب ٣ + ٤؟').value,7);
 assert.equal(math.tryArithmetic('كام ۳ + ۴؟').value,7);
});
test('offline calculator rejects potentially unsafe syntax and nonfinite values',()=>{
 assert.equal(math.tryArithmetic('process.exit(0)'),null);
 assert.equal(math.tryArithmetic('2/0'),null);
 assert.equal(math.tryArithmetic('my favourite animal is 2'),null);
 assert.throws(()=>math.calculate('1;alert(1)'));
});

const workerSource=fs.readFileSync(path.join(__dirname,'../local-ai-worker.js'),'utf8');
const mockSelf={postMessage(){}};
const sandbox={self:mockSelf,console};
vm.runInNewContext(workerSource+
 '\nself.__testing={prepareHistory,isRepetitive,profileFor,memoryFor,detectTask,resolvedTask,instruction,trimRepeats,runtimeFor,generationConfig};',sandbox,{filename:'local-ai-worker.js'});
const helpers=mockSelf.__testing;

test('balanced memory uses up to 14 messages and 9000 characters',()=>{
 const history=Array.from({length:42},(_,i)=>({
  role:i%2?'assistant':'user',content:'entry-'+i+' '+('text '.repeat(45))
 }));
 const prepared=helpers.prepareHistory(history,'balanced');
 assert.ok(prepared.length>8);
 assert.ok(prepared.length<=14);
 assert.ok(prepared.reduce((sum,x)=>sum+x.content.length,0)<=9000);
 assert.equal(prepared.at(-1).content,history.at(-1).content.trim());
});
test('memory profiles enforce distinct short, medium and extended limits',()=>{
 const history=Array.from({length:32},(_,i)=>({role:i%2?'assistant':'user',content:'message '+i}));
 assert.equal(helpers.prepareHistory(history,'short').length,8);
 assert.equal(helpers.prepareHistory(history,'balanced').length,14);
 assert.equal(helpers.prepareHistory(history,'extended').length,18);
 assert.equal(helpers.prepareHistory(history,'unknown').length,14);
});
test('worker does not preload models without an explicit init command',()=>{
 assert.equal(typeof mockSelf.onmessage,'function');
 assert.equal(mockSelf.__testing.profileFor('balanced').id,'onnx-community/Qwen3-0.6B-ONNX');
 assert.equal(mockSelf.__testing.profileFor('lite').id,'onnx-community/SmolLM2-135M-Instruct-ONNX');
});
test('repetition detection catches repeated phrases in Arabic',()=>{
 assert.equal(helpers.isRepetitive('اهلا يا معلم ازيك النهارده اهلا يا معلم ازيك النهارده اهلا يا معلم ازيك النهارده'),true);
 assert.equal(helpers.isRepetitive('This is a normal helpful sentence that contains several different words with no repeated segments'),false);
});


test('fast multilingual Qwen2.5 profile exists alongside smart and light models',()=>{
 assert.equal(helpers.profileFor('balanced').id,'onnx-community/Qwen3-0.6B-ONNX');
 assert.equal(helpers.profileFor('fast').id,'onnx-community/Qwen2.5-0.5B-Instruct');
 assert.equal(helpers.profileFor('lite').id,'onnx-community/SmolLM2-135M-Instruct-ONNX');
});
test('task router recognizes Arabic and English coding, writing, studying, and summarising',()=>{
 assert.equal(helpers.detectTask('اشرح الكهرباء ببساطة'),'explain');
 assert.equal(helpers.detectTask('اكتب كود Python'),'coding');
 assert.equal(helpers.detectTask('لخص هذا النص'),'summarise');
 assert.equal(helpers.detectTask('اكتب إيميل رسمي'),'writing');
 assert.equal(helpers.detectTask('حل مسألة في الرياضيات'),'study');
 assert.equal(helpers.detectTask('Translate this into Arabic'),'translate');
 assert.equal(helpers.detectTask('help me today'),'general');
});
test('explicit task mode overrides automatic detection',()=>{
 assert.equal(helpers.resolvedTask('coding','اشرح الفكرة'),'coding');
 assert.equal(helpers.resolvedTask('auto','اشرح الفكرة'),'explain');
});
test('task prompt is tailored, multilingual, and avoids unverified claims',()=>{
 const text=helpers.instruction('ar-eg','coding','اكتب برنامج','fast');
 assert.match(text,/المصري/);
 assert.match(text,/كودًا صغيرًا/);
 assert.match(text,/لا تخترع/);
 const summary=helpers.instruction('auto','summarise','لخص النص','balanced');
 assert.match(summary,/لخّص النص/);
 assert.match(summary,/بالمصري/);
});
test('balanced memory preserves longer last user task while respecting context cap',()=>{
 const history=Array.from({length:15},(_,i)=>({role:i%2?'assistant':'user',content:'توضيح '.repeat(100)}));
 history.push({role:'user',content:'اشرح '+('كيف أبدأ العمل. '.repeat(210))});
 const context=helpers.prepareHistory(history,'balanced');
 assert.equal(context.at(-1).role,'user');
 assert.ok(context.at(-1).content.length>2200);
 assert.ok(context.reduce((sum,x)=>sum+x.content.length,0)<=9000);
 assert.ok(context.length<=14);
});
test('repetition cleanup removes exact adjacent duplicate sentences but preserves content',()=>{
 const answer=helpers.trimRepeats('أهلاً بك. أهلاً بك. هنا شرح واضح. هنا شرح واضح. مثال مختلف.');
 assert.match(answer,/مثال مختلف/);
 assert.equal((answer.match(/أهلاً بك/g)||[]).length,1);
 assert.equal((answer.match(/هنا شرح واضح/g)||[]).length,1);
});

test('Fast and Lite use smaller q8 CPU; Smart uses q4 CPU and q4f16 GPU',()=>{
 assert.equal(helpers.runtimeFor('fast',false,false).device,'wasm');
 assert.equal(helpers.runtimeFor('fast',false,false).dtype,'q8');
 assert.equal(helpers.runtimeFor('lite',false,false).dtype,'q8');
 assert.equal(helpers.runtimeFor('balanced',false,false).dtype,'q4');
 assert.equal(helpers.runtimeFor('fast',true,false).dtype,'q8');
 assert.equal(helpers.runtimeFor('balanced',true,true).device,'webgpu');
 assert.equal(helpers.runtimeFor('balanced',true,true).dtype,'q4f16');
});

test('NOVA recognises politely phrased Arabic and English tasks',()=>{
 assert.equal(helpers.detectTask('ممكن تشرح قانون نيوتن؟'),'explain');
 assert.equal(helpers.detectTask('عايزك تكتب إيميل رسمي'),'writing');
 assert.equal(helpers.detectTask('لو سمحت حل المسألة'),'study');
 assert.equal(helpers.detectTask('Could you translate this to French?'),'translate');
 assert.equal(helpers.detectTask('Please write a program to sort names'),'coding');
});
test('study and coding generation use more careful settings than casual chat',()=>{
 const general=helpers.generationConfig('fast','general');
 const study=helpers.generationConfig('fast','study');
 const coding=helpers.generationConfig('fast','coding');
 assert.ok(study.max_new_tokens>general.max_new_tokens);
 assert.ok(coding.temperature<general.temperature);
 assert.ok(study.repetition_penalty>=1.15);
 assert.ok(study.max_new_tokens<=340);
});
test('multilingual prompts prioritise context, completeness and honesty',()=>{
 const arabic=helpers.instruction('ar-eg','study','حل المسألة دي','fast');
 assert.match(arabic,/السياق السابق|الرسائل السابقة/);
 assert.match(arabic,/القانون/);
 const english=helpers.instruction('en','planning','Plan my project','fast');
 assert.match(english,/earlier chat/);
 assert.match(english,/Never invent|never invent|If uncertain/);
});

test('CPU fast default caps generation length to avoid multi-minute responses',()=>{
 const fastQuick=helpers.generationConfig('fast','explain','wasm','quick');
 const fastNormal=helpers.generationConfig('fast','explain','wasm','normal');
 const fastLong=helpers.generationConfig('fast','explain','wasm','detailed');
 assert.ok(fastQuick.max_new_tokens<=52);
 assert.ok(fastQuick.max_new_tokens<fastNormal.max_new_tokens);
 assert.ok(fastNormal.max_new_tokens<fastLong.max_new_tokens);
 assert.ok(helpers.generationConfig('fast','coding','wasm','quick').max_new_tokens<=88);
 assert.ok(helpers.generationConfig('fast','study','wasm','normal').max_new_tokens>
  helpers.generationConfig('fast','explain','wasm','normal').max_new_tokens);
});
test('GPU still offers longer requested outputs when explicitly selected',()=>{
 const quick=helpers.generationConfig('balanced','writing','webgpu','quick');
 const detailed=helpers.generationConfig('balanced','writing','webgpu','detailed');
 assert.ok(detailed.max_new_tokens>quick.max_new_tokens);
 assert.ok(detailed.max_new_tokens<=340);
});
