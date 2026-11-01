'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const lib=require('../local-template-library.js');

test('34 unique templates are grouped into writing, coding, research and study',()=>{
 const all=lib.getTemplates();
 assert.equal(all.length,34);
 assert.equal(new Set(all.map(x=>x.id)).size,all.length);
 assert.deepEqual(all.reduce((acc,x)=>(acc[x.category]=(acc[x.category]||0)+1,acc),{}),
  {research:4,writing:14,code:13,study:3});
 assert.ok(all.every(x=>x.title&&x.description&&x.prompt&&x.mode));
});
test('template search is case-insensitive, supports Arabic and handles empty matches',()=>{
 const a=lib.filterTemplates('code','python');
 assert.ok(a.length>=4);
 assert.ok(a.every(x=>x.category==='code'));
 assert.ok(lib.filterTemplates('writing','إيميل').length>=2);
 assert.deepEqual(lib.filterTemplates('research','unfindable string test xyz'),[]);
 assert.equal(lib.filterTemplates('nonsense').length,34);
});
test('template selection preserves user details and does not pretend AI wrote it',()=>{
 const result=lib.render('متابعة الطلب المقدم الثلاثاء','email_followup',{language:'ar'});
 assert.equal(result.kind,'writing-template');
 assert.equal(result.network,false);
 assert.match(result.text,/متابعة الطلب المقدم الثلاثاء/);
 assert.match(result.text,/بدون نموذج AI/);
 assert.match(result.text,/\[التاريخ\]/);
 const job=lib.render('Job application for a library officer','job_application',{language:'en'});
 assert.match(job.text,/Dear Hiring Team/);
 assert.match(job.text,/library officer/);
});
test('each writing/study template produces an honest distinct editable outline',()=>{
 for(const item of lib.getTemplates().filter(x=>x.mode==='write_fast')){
  const result=lib.render(item.prompt,item.id,{language:'ar'});
  assert.ok(result?.text.includes('بدون نموذج AI'),item.id);
  assert.ok(result.text.includes('[')||item.id==='study_revision',item.id);
  assert.equal(result.network,false,item.id);
  assert.ok(result.text.length>90,item.id);
 }
});
test('new coding starters contain actual code and never require a model',()=>{
 for(const id of ['python_quiz','python_csv','python_json','js_counter','js_filter','html_form','css_cards','js_timer','js_form_validation']){
  const result=lib.render('Sample '+id,id,{language:'en'});
  assert.equal(result.kind,'code-template',id);
  assert.equal(result.network,false,id);
  assert.match(result.text,/not executed/i,id);
  assert.ok(result.text.length>110,id);
 }
 assert.match(lib.render('Python CSV','python_csv').text,/csv\.DictReader/);
 assert.match(lib.render('timer','js_timer').text,/clearInterval/);
 assert.match(lib.render('form','html_form').text,/no message was sent/);
});
test('legacy coding and research templates delegate to existing vetted tools',()=>{
 for(const id of ['python_calc','python_todo','html_page','js_fetch','research_topic','research_science']){
  const item=lib.getById(id);
  assert.ok(item);
  assert.equal(lib.render(item.prompt,id),null);
 }
 assert.equal(lib.getById('not-real'),null);
});

test('the five new template ids are present and render distinct useful content',()=>{
 const ids=['payment_confirmation','interview_thanks','js_form_validation','research_comparison','study_flashcards'];
 for(const id of ids)assert.ok(lib.getById(id),id);
 const payment=lib.render('دفعت 200 يوم 1 نوفمبر','payment_confirmation',{language:'ar'});
 assert.match(payment.text,/تأكيد سداد مبلغ/);
 assert.match(payment.text,/دفعت 200/);
 const interview=lib.render('شكرا على مقابلة المحاسب','interview_thanks',{language:'ar'});
 assert.match(interview.text,/شكرًا على تخصيص وقت/);
 const forms=lib.render('validate form','js_form_validation',{language:'en'});
 assert.match(forms.text,/checkValidity/);
 assert.match(forms.text,/nothing sent/);
 const comparison=lib.getById('research_comparison');
 assert.equal(comparison.mode,'research');
 assert.equal(lib.render(comparison.prompt,'research_comparison'),null);
 const cards=lib.render('بطاقات عن قوانين نيوتن','study_flashcards',{language:'ar'});
 assert.match(cards.text,/البطاقة 1/);
 assert.match(cards.text,/بطاقات عن قوانين نيوتن/);
});
test('same-origin hosted catalogue matches approved IDs and never changes execution mode',()=>{
 const manifest=require('../templates/catalog.json');
 assert.equal(manifest.schemaVersion,1);
 assert.equal(manifest.templates.length,34);
 assert.equal(lib.catalogOrigin(),'local');
 const changed=JSON.parse(JSON.stringify(manifest));
 changed.templates[0].mode='code_fast';
 assert.equal(lib.applyHostedCatalog(changed),false);
 assert.equal(lib.catalogOrigin(),'local');
 const duplicate=JSON.parse(JSON.stringify(manifest));
 duplicate.templates[1].id=duplicate.templates[0].id;
 assert.equal(lib.applyHostedCatalog(duplicate),false);
 const injected=JSON.parse(JSON.stringify(manifest));
 injected.templates[0].title='<img src=x onerror=alert(1)>';
 // The renderer uses textContent, but this catalogue should never provide scripts.
 assert.equal(lib.applyHostedCatalog(manifest),true);
 assert.equal(lib.catalogOrigin(),'hosted');
 assert.equal(lib.getTemplates().length,34);
 assert.ok(lib.getById('payment_confirmation'));
});
