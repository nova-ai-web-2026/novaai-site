'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const lib=require('../local-template-library.js');

test('29 unique templates are grouped into writing, coding, research and study',()=>{
 const all=lib.getTemplates();
 assert.equal(all.length,29);
 assert.equal(new Set(all.map(x=>x.id)).size,all.length);
 assert.deepEqual(all.reduce((acc,x)=>(acc[x.category]=(acc[x.category]||0)+1,acc),{}),
  {research:3,writing:12,code:12,study:2});
 assert.ok(all.every(x=>x.title&&x.description&&x.prompt&&x.mode));
});
test('template search is case-insensitive, supports Arabic and handles empty matches',()=>{
 const a=lib.filterTemplates('code','python');
 assert.ok(a.length>=4);
 assert.ok(a.every(x=>x.category==='code'));
 assert.ok(lib.filterTemplates('writing','إيميل').length>=2);
 assert.deepEqual(lib.filterTemplates('research','unfindable string test xyz'),[]);
 assert.equal(lib.filterTemplates('nonsense').length,29);
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
 for(const id of ['python_quiz','python_csv','python_json','js_counter','js_filter','html_form','css_cards','js_timer']){
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
