'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const lib=require('../local-template-library.js');

test('44 unique templates are grouped into writing, coding, research and study',()=>{
 const all=lib.getTemplates();
 assert.equal(all.length,44);
 assert.equal(new Set(all.map(x=>x.id)).size,all.length);
 assert.deepEqual(all.reduce((acc,x)=>(acc[x.category]=(acc[x.category]||0)+1,acc),{}),
  {research:5,writing:18,code:16,study:5});
 assert.ok(all.every(x=>x.title&&x.description&&x.prompt&&x.mode));
});
test('template search is case-insensitive, supports Arabic and handles empty matches',()=>{
 const a=lib.filterTemplates('code','python');
 assert.ok(a.length>=4);
 assert.ok(a.every(x=>x.category==='code'));
 assert.ok(lib.filterTemplates('writing','إيميل').length>=2);
 assert.deepEqual(lib.filterTemplates('research','unfindable string test xyz'),[]);
 assert.equal(lib.filterTemplates('nonsense').length,44);
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
 assert.equal(manifest.templates.length,44);
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
 assert.equal(lib.getTemplates().length,44);
 assert.ok(lib.getById('payment_confirmation'));
});

test('ten new templates have unique IDs and map to existing modes',()=>{
 const categoryMap={
  appointment_request:'writing',technical_support:'writing',project_proposal:'writing',weekly_planner:'writing',
  python_grade_average:'code',js_theme_toggle:'code',html_faq:'code',
  study_error_log:'study',study_exam_preparation:'study',research_claim_sources:'research'
 };
 assert.equal(Object.keys(categoryMap).length,10);
 for(const [id,category] of Object.entries(categoryMap)){
  const item=lib.getById(id);
  assert.ok(item,id);
  assert.equal(item.category,category,id);
  assert.equal(item.mode,category==='research'?'research':category==='code'?'code_fast':'write_fast',id);
  assert.ok(item.title&&item.description&&item.prompt,id);
 }
 for(const id of ['email_formal','python_calc','research_topic','study_plan','payment_confirmation','study_flashcards'])
  assert.ok(lib.getById(id),id);
});
test('six new writing and study templates retain actual details and editable structure',()=>{
 for(const id of ['appointment_request','technical_support','project_proposal','weekly_planner','study_error_log','study_exam_preparation']){
  const ar=lib.render('تفاصيل المستخدم الحقيقية',id,{language:'ar'});
  const en=lib.render('Real user details',id,{language:'en'});
  assert.equal(ar.kind,'writing-template',id);
  assert.equal(ar.network,false,id);
  assert.match(ar.text,/تفاصيل المستخدم الحقيقية/,id);
  assert.match(en.text,/Real user details/,id);
  assert.ok(ar.text.includes('[')&&en.text.includes('['),id);
  assert.ok(ar.text.length>130&&en.text.length>130,id);
 }
 assert.match(lib.render('Ticket','technical_support',{language:'en'}).text,/Steps to reproduce/);
 assert.match(lib.render('Idea','project_proposal',{language:'en'}).text,/Risks and success criteria/);
 assert.match(lib.render('Mistakes','study_error_log',{language:'en'}).text,/Why it was wrong/);
 assert.match(lib.render('Review','study_exam_preparation',{language:'en'}).text,/rest and sleep/);
});
test('three new coding templates return real editable code without executing or claiming AI',()=>{
 for(const id of ['python_grade_average','js_theme_toggle','html_faq']){
  const a=lib.render(lib.getById(id).prompt,id,{language:'en'});
  assert.equal(a.kind,'code-template',id);
  assert.equal(a.network,false,id);
  assert.match(a.text,/no AI and not executed/i,id);
  assert.ok(a.text.length>250,id);
 }
 assert.match(lib.render('Average','python_grade_average',{language:'en'}).text,/sum\(grades\) \/ len\(grades\)/);
 assert.match(lib.render('Theme','js_theme_toggle',{language:'en'}).text,/aria-pressed/);
 assert.match(lib.render('Theme','js_theme_toggle',{language:'en'}).text,/localStorage\.setItem/);
 assert.match(lib.render('FAQ','html_faq',{language:'en'}).text,/<details><summary>/);
});
test('fact source research does not falsely say it fact-checked a claim',()=>{
 const item=lib.getById('research_claim_sources');
 assert.equal(item.mode,'research');
 assert.equal(lib.render(item.prompt,item.id),null);
 assert.match(item.description,/دون حكم آلي/);
});
test('hosted 3.2 catalog equals all forty-four bundled templates and keeps modes fixed',()=>{
 const manifest=require('../templates/catalog.json');
 assert.equal(manifest.catalogVersion,'3.2.0');
 assert.equal(manifest.templates.length,44);
 assert.deepEqual(new Set(manifest.templates.map(x=>x.id)),new Set(lib.getTemplates().map(x=>x.id)));
 for(const entry of manifest.templates){
  const local=lib.getById(entry.id);
  assert.equal(entry.mode,local.mode,entry.id);
  assert.equal(entry.category,local.category,entry.id);
  assert.equal(entry.prompt,local.prompt,entry.id);
 }
});
