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
 '\nself.__testing={prepareHistory,isRepetitive,profileFor,memoryFor};',sandbox,{filename:'local-ai-worker.js'});
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
