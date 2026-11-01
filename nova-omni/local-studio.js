/* NOVA Studio v3.5 — focused progressive task navigation, not a visual-only filter.
   Works with the existing offline templates, prompt editor and source search. */
(function(root){
 'use strict';
 const doc=root.document;
 if(!doc)return;
 const $=id=>doc.getElementById(id);
 const panel=$('studioTools'),chooser=$('studioModes'),grid=$('studioSuggestions');
 if(!panel||!chooser||!grid)return;
 const buttons=[...grid.querySelectorAll('button.suggestion[data-prompt]')];
 if(buttons.length!==6)return;
 const lib=root.NovaTemplateLibrary;
 const originals=buttons.map(button=>({
  title:button.querySelector('strong')?.textContent||'',
  description:button.querySelector('small')?.textContent||'',
  icon:button.querySelector('.tileIcon')?.textContent||'',
  prompt:button.dataset.prompt||'',
  task:button.dataset.task||''
 }));
 const groups=Object.freeze({
  writing:Object.freeze(['email_formal','email_followup','complaint','job_application','report_structure','social_post']),
  code:Object.freeze(['python_calc','html_page','js_fetch','python_json','js_theme_toggle','html_faq']),
  research:Object.freeze(['research_topic','research_science','research_history','research_comparison','research_claim_sources']),
  study:Object.freeze(['study_plan','study_revision','study_flashcards','study_error_log','study_exam_preparation'])
 });
 const labels=Object.freeze({
  all:'كل الأدوات',
  writing:'قوالب الكتابة',
  code:'قوالب البرمجة',
  research:'مصادر البحث',
  study:'أدوات المذاكرة'
 });
 const more=$('studioShowMore');
 const FIRST_ROW=3;
 let current='all',expanded=false,total=6;
 function showAvailable(){
  const shown=expanded?total:Math.min(FIRST_ROW,total);
  buttons.forEach((button,index)=>{
   button.hidden=index>=total||index>=shown;
  });
  const counter=$('studioToolsCounter');
  if(counter)counter.textContent=shown+' من '+total+' · '+labels[current];
  if(more){
   more.hidden=total<=FIRST_ROW;
   more.setAttribute('aria-expanded',String(expanded));
   more.firstChild.textContent=expanded?'عرض أقل ':'عرض باقي الاختصارات ';
   more.setAttribute('aria-label',expanded?'عرض 3 اختصارات فقط':'عرض كل '+total+' اختصارات');
  }
 }
 more?.addEventListener('click',()=>{
  expanded=!expanded;
  showAvailable();
 });
 function applyCard(button,info){
  const title=button.querySelector('strong');
  const description=button.querySelector('small');
  const icon=button.querySelector('.tileIcon');
  if(title)title.textContent=info.title;
  if(description)description.textContent=info.description;
  if(icon)icon.textContent=info.icon;
  button.dataset.prompt=info.prompt;
  if(info.task)button.dataset.task=info.task;
  else delete button.dataset.task;
  if(info.templateId)button.dataset.templateId=info.templateId;
  else delete button.dataset.templateId;
  button.setAttribute('aria-label',info.title+' — '+info.description);
  button.hidden=false;
 }
 function selectMode(next,opts={}){
  if(next!=='all'&&!groups[next])return false;
  current=next;
  chooser.querySelectorAll('button[data-studio-mode]').forEach(btn=>{
   btn.setAttribute('aria-pressed',String(btn.dataset.studioMode===next));
  });
  let items=[];
  if(next==='all'){
   items=originals.map(item=>({...item}));
  }else{
   items=groups[next].map(id=>{
    const template=lib?.getById(id);
    return template?{
     title:template.title,description:template.description,icon:template.icon,
     prompt:template.prompt,task:template.mode,templateId:template.id
    }:null;
   }).filter(Boolean);
  }
  buttons.forEach((button,index)=>{
   if(items[index])applyCard(button,items[index]);
   else{
    button.hidden=true;
    delete button.dataset.templateId;
    button.setAttribute('aria-label','');
   }
  });
  total=items.length;
  expanded=false;
  showAvailable();
  panel.dataset.selectedMode=next;
  if(opts.focus){
   const first=buttons.find(b=>!b.hidden);
   if(first)first.focus();
  }
  return true;
 }
 chooser.querySelectorAll('button[data-studio-mode]').forEach(button=>{
  button.addEventListener('click',()=>selectMode(button.dataset.studioMode));
 });
 // The main page's existing click handler fills the editor; attach the chosen
 // template ID afterwards so only approved, bundled code/writing logic runs.
 buttons.forEach(button=>button.addEventListener('click',()=>{
  root.NovaSelectedTemplateId=button.dataset.templateId||null;
 }));
$('studioStartWriting')?.addEventListener('click',()=>{
  selectMode('writing');
  panel.scrollIntoView({block:'nearest',behavior:root.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 });
 // Keyboard: Ctrl/Cmd+K opens the existing template search (unless the user
 // is editing a text field); no extra network call happens until the panel opens.
 doc.addEventListener('keydown',event=>{
  if(!(event.ctrlKey||event.metaKey)||event.altKey||event.shiftKey||event.key.toLowerCase()!=='k')return;
  const target=event.target;
  if(target?.closest?.('input,textarea,[contenteditable="true"]'))return;
  event.preventDefault();
  if($('templateOverlay')?.hidden)$('openTemplatesTop')?.click();
  else $('templateSearch')?.focus();
 });
 // Leave the original six verified actions and focus defaults unchanged.
 selectMode('all');
 root.NovaStudio=Object.freeze({selectMode,getMode:()=>current,getVisibleCount:()=>expanded?total:Math.min(FIRST_ROW,total),isExpanded:()=>expanded});
})(typeof globalThis!=='undefined'?globalThis:this);
