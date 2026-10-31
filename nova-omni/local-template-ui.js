/* NOVA v3.0 accessible template picker & adjustable typography. No network calls. */
(function(root){
 'use strict';
 const doc=root.document;
 if(!doc)return;
 const $=id=>doc.getElementById(id);
 const lib=root.NovaTemplateLibrary;
 const modal=$('templateOverlay');
 if(!modal||!lib)return;

 const FONT_PRESETS=Object.freeze([
  {id:'small',scale:.94},
  {id:'normal',scale:1},
  {id:'large',scale:1.13}
 ]);
 const FONT_STORAGE='nova_local_text_size';
 let fontMode='normal',filter='all',priorFocus=null;
 root.NovaSelectedTemplateId=null;

 function changeFont(mode,persist=true){
  const selected=FONT_PRESETS.find(x=>x.id===mode)||FONT_PRESETS[1];
  fontMode=selected.id;
  doc.documentElement.style.setProperty('--nova-copy-scale',String(selected.scale));
  $('textSizeSetting').value=selected.id;
  const pos=FONT_PRESETS.findIndex(x=>x.id===selected.id);
  $('decreaseText').disabled=pos===0;
  $('increaseText').disabled=pos===FONT_PRESETS.length-1;
  if(persist){try{root.localStorage.setItem(FONT_STORAGE,selected.id);}catch(e){}}
 }
 function nudgeFont(delta){
  const pos=FONT_PRESETS.findIndex(x=>x.id===fontMode);
  const next=FONT_PRESETS[Math.max(0,Math.min(FONT_PRESETS.length-1,pos+delta))];
  changeFont(next.id);
 }
 function render(){
  const data=lib.filterTemplates(filter,$('templateSearch').value);
  const grid=$('templateGrid');
  grid.replaceChildren();
  $('templateCount').textContent='عرض '+data.length+' من '+lib.getTemplates().length+' قالبًا';
  $('templateFilters').querySelectorAll('[data-filter]').forEach(button=>{
   button.setAttribute('aria-pressed',String(button.dataset.filter===filter));
  });
  if(!data.length){
   const item=doc.createElement('p');
   item.className='templateEmpty';
   item.textContent='مفيش قوالب مطابقة. جرّب كلمة تانية أو تصنيف مختلف.';
   grid.append(item);return;
  }
  for(const item of data){
   const button=doc.createElement('button');
   button.className='templateCard';button.type='button';button.dataset.templateId=item.id;
   button.setAttribute('aria-label','اختيار قالب '+item.title);
   const icon=doc.createElement('span');
   icon.className='templateCardIcon';icon.setAttribute('aria-hidden','true');icon.textContent=item.icon;
   const info=doc.createElement('span');info.className='templateCardText';
   const heading=doc.createElement('strong');heading.textContent=item.title;
   const details=doc.createElement('small');details.textContent=item.description;
   info.append(heading,details);button.append(icon,info);
   button.addEventListener('click',()=>choose(item));
   grid.append(button);
  }
 }
 function close(){
  if(modal.hidden)return;
  modal.hidden=true;
  const previous=priorFocus;priorFocus=null;
  if(previous&&previous.isConnected&&typeof previous.focus==='function')previous.focus();
 }
 function open(){
  priorFocus=doc.activeElement;
  $('sidebar')?.classList.remove('open');
  $('settingsPanel')?.classList.remove('open');
  $('screenOverlay')?.classList.remove('open');
  $('toggleSidebar')?.setAttribute('aria-expanded','false');
  $('toggleSettings')?.setAttribute('aria-expanded','false');
  $('templateSearch').value='';filter='all';
  modal.hidden=false;
  render();
  $('templateSearch').focus();
 }
 function choose(item){
  if($('prompt').disabled){
   close();
   const notice=$('notice');notice.textContent='المهمة الحالية لسه شغالة. اخلصها أو الغيها قبل اختيار قالب.';notice.hidden=false;
   return;
  }
  const mode=$('taskMode');
  mode.value=item.mode;
  mode.dispatchEvent(new Event('change',{bubbles:true}));
  root.NovaSelectedTemplateId=item.id;
  const input=$('prompt');input.value=item.prompt;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  close();
  const notice=$('notice');
  notice.textContent='اخترت قالب '+item.title+' — عدّل الخانات والتفاصيل، وبعدين اضغط إرسال.';
  notice.hidden=false;
  input.focus();
 }
 ['openTemplatesTop','openTemplatesSidebar','openTemplatesComposer','browseTemplatesWelcome'].forEach(id=>{
  $(id)?.addEventListener('click',open);
 });
 $('closeTemplates').addEventListener('click',close);
 modal.addEventListener('click',event=>{if(event.target===modal)close();});
 $('templateSearch').addEventListener('input',render);
 $('templateFilters').querySelectorAll('[data-filter]').forEach(button=>{
  button.addEventListener('click',()=>{filter=button.dataset.filter;render();});
 });
 doc.addEventListener('keydown',event=>{
  if(modal.hidden)return;
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return;}
  if(event.key!=='Tab')return;
  const focusable=[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled)')]
   .filter(x=>x.getClientRects().length>0);
  if(!focusable.length)return;
  const first=focusable[0],last=focusable[focusable.length-1];
  if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus();}
  if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus();}
 },true);
 $('textSizeSetting').addEventListener('change',()=>changeFont($('textSizeSetting').value));
 $('decreaseText').addEventListener('click',()=>nudgeFont(-1));
 $('increaseText').addEventListener('click',()=>nudgeFont(1));
 $('taskMode').addEventListener('change',()=>{root.NovaSelectedTemplateId=null;});
 doc.querySelectorAll('[data-prompt],#newChat,#clear').forEach(button=>{
  button.addEventListener('click',()=>{root.NovaSelectedTemplateId=null;},true);
 });
 $('conversations').addEventListener('click',()=>{root.NovaSelectedTemplateId=null;},true);
 try{changeFont(root.localStorage.getItem(FONT_STORAGE)||'normal',false);}
 catch(e){changeFont('normal',false);}
})(typeof globalThis!=='undefined'?globalThis:this);
