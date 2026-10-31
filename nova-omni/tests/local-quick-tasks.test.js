'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const math=require('../local-math.js');
const task=require('../local-tasks.js');

test('verified arithmetic handles square roots, powers, trigonometry and logarithms',()=>{
 assert.equal(math.calculate('sqrt(144)+2^3'),20);
 assert.equal(math.calculate('sin(pi/2)'),1);
 assert.equal(math.calculate('cos(pi)'),-1);
 assert.equal(math.calculate('log(100)'),2);
 assert.equal(math.calculate('ln(e)'),1);
 assert.equal(math.calculate('2×4+8÷2'),12);
 assert.equal(math.calculate('abs(-11)'),11);
 assert.equal(math.calculate('-3^2'),-9);
});
test('natural Arabic and English math questions work without local AI',()=>{
 assert.equal(math.tryArithmetic('احسب ٣ + ٤؟').value,7);
 assert.equal(math.tryArithmetic('What is 3 + 4? Reply with the number.').value,7);
 assert.equal(math.tryArithmetic('Calculate sqrt(144)+2^3').value,20);
 assert.equal(math.tryArithmetic('ما نتيجة sin(pi/2)؟').value,1);
});
test('arithmetic rejects injection, undefined trig and non-finite values',()=>{
 assert.equal(math.tryArithmetic('process.exit(0)'),null);
 assert.equal(math.tryArithmetic('import("evil")'),null);
 assert.equal(math.tryArithmetic('1/0'),null);
 assert.equal(math.tryArithmetic('tan(pi/2)'),null);
 assert.throws(()=>math.calculate('1;alert(1)'));
});
const english='Photosynthesis is the process by which plants convert sunlight into chemical energy. Plants absorb light through chlorophyll in their leaves. During photosynthesis, the plant uses water and carbon dioxide to make glucose. The plant also releases oxygen into the atmosphere. Light intensity and temperature can affect the rate of photosynthesis.';
const arabic='تعتبر الطاقة الشمسية من مصادر الطاقة المتجددة التي تعتمد على ضوء الشمس. تقوم الألواح الشمسية بتحويل الضوء إلى كهرباء باستخدام الخلايا الكهروضوئية. وتساعد هذه التقنية في تقليل استخدام الوقود الأحفوري. ويمكن تخزين الكهرباء في بطاريات لاستخدامها أثناء الليل. لكن كفاءة الألواح تتأثر بالطقس والظل ودرجة الحرارة.';
test('extractive summary returns only sentences present in user-provided English text',()=>{
 const x=task.tryQuickSummary('Summarize this text:\n\n'+english,'summarise');
 assert.equal(x.kind,'extractive-summary');
 assert.ok(x.sentences.length>=2&&x.sentences.length<=4);
 assert.ok(x.sentences.every(v=>english.includes(v)));
 assert.ok(x.originalSentences>=x.sentences.length);
});
test('Arabic summarization is source-grounded and retains original order',()=>{
 const x=task.tryQuickSummary('لخص النص التالي:\n\n'+arabic,'summarise');
 assert.ok(x);
 assert.ok(x.sentences.length>=2);
 assert.ok(x.sentences.every(v=>arabic.includes(v)));
 assert.deepEqual([...x.sentences].sort((a,b)=>arabic.indexOf(a)-arabic.indexOf(b)),x.sentences);
});
test('summary will not invent summaries of unseen content',()=>{
 assert.equal(task.tryQuickSummary('لخص هذا الكتاب الذي لم أرسله','summarise'),null);
 assert.equal(task.tryQuickSummary('Summarise a text I have not provided.','summarise'),null);
 assert.equal(task.tryQuickSummary('Write a persuasive email '+english,'writing'),null);
});
test('summary mode supports file imports without network requests or model downloads',()=>{
 const x=task.tryQuickSummary('لخّص النص التالي واستخرج أهم النقاط:\n\n'+arabic,'summarise');
 assert.ok(x);
 assert.equal(x.kind,'extractive-summary');
 assert.ok(x.text.startsWith('•'));
});
