/* NOVA Instant tools v2.9 — no model download, no cloud inference.
   Research is an explicitly requested browser fetch to Wikimedia/Crossref only.
   Writing/code quick modes are transparent templates, not generated AI. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.NovaInstant=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const MODES=new Set(['research','write_fast','code_fast']);
 const compact=(value,max=260)=>String(value||'').replace(/\s+/g,' ').trim().slice(0,max);
 const isArabic=text=>/[\u0600-\u06ff]/.test(String(text||''));
 function isInstant(message,mode){
  return MODES.has(mode)&&String(message||'').trim().length>0;
 }
 function makeQuery(message){
  const cleaned=String(message||'').trim().replace(
   /^(?:(?:ابحث|بحث|دور|اعمل بحث|عايز بحث|هاتي مصادر|هات مصادر|find|research|search|look up|find sources)(?:\s+(?:لي|عن|في|for|about|on))?\s*[:：،-]?\s*)+/iu,'');
  return compact(cleaned||message,150);
 }
 function stripMarkup(input){
  return compact(String(input||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ')
   .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#0*39;|&apos;/gi,"'")
   .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>'),330);
 }
 function parseWikiResults(data,language){
  const results=Array.isArray(data?.query?.search)?data.query.search:[];
  return results.slice(0,4).flatMap(item=>{
   const id=Number(item.pageid);
   if(!Number.isSafeInteger(id)||id<=0||!String(item.title||'').trim())return [];
   return [{type:'encyclopedia',title:compact(item.title,110),snippet:stripMarkup(item.snippet),
    url:'https://'+language+'.wikipedia.org/?curid='+id,source:language==='ar'?'ويكيبيديا العربية':'Wikipedia'}];
  });
 }
 function parseCrossrefResults(data){
  const items=Array.isArray(data?.message?.items)?data.message.items:[];
  return items.slice(0,5).flatMap(item=>{
   const doi=String(item.DOI||'').trim();
   if(!/^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i.test(doi))return [];
   const title=compact(Array.isArray(item.title)?item.title[0]:item.title,145);
   if(!title)return [];
   const year=Number(item.published?.['date-parts']?.[0]?.[0])||Number(item.issued?.['date-parts']?.[0]?.[0]);
   const journal=compact(Array.isArray(item['container-title'])?item['container-title'][0]:'',85);
   return [{type:'scholarly-metadata',title,source:'Crossref',
    snippet:(journal?journal+' · ':'')+(year>1800&&year<2200?String(year):'Publication date unavailable'),
    url:'https://doi.org/'+encodeURI(doi)}];
  }).slice(0,3);
 }
 async function requestJSON(url,fetchImpl,timeoutMs){
  const ctrl=typeof AbortController==='function'?new AbortController():null;
  const timer=ctrl?setTimeout(()=>ctrl.abort(),timeoutMs):null;
  try{
   const response=await fetchImpl(url,{method:'GET',credentials:'omit',...(ctrl?{signal:ctrl.signal}:{})});
   if(!response||!response.ok)throw Error('Source request failed ('+String(response?.status||'network')+').');
   return await response.json();
  }finally{if(timer!==null)clearTimeout(timer);}
 }
 async function research(prompt,opts={}){
  const fetchImpl=opts.fetchImpl||(typeof fetch==='function'?fetch:null);
  if(typeof fetchImpl!=='function')throw Error('No internet lookup available on this browser.');
  const query=makeQuery(prompt);
  if(query.length<3)throw Error('Write a more specific research topic.');
  const lang=opts.language==='ar'||(opts.language!=='en'&&isArabic(query))?'ar':'en';
  const timeout=Number.isFinite(opts.timeoutMs)?Math.max(1000,Math.min(20000,opts.timeoutMs)):9500;
  const wikipedia='https://'+lang+'.wikipedia.org/w/api.php?'+new URLSearchParams({
   action:'query',list:'search',srsearch:query,srlimit:'4',srnamespace:'0',format:'json',origin:'*'
  }).toString();
  const academic='https://api.crossref.org/works?'+new URLSearchParams({
   'query.bibliographic':query,rows:'3',select:'DOI,title,published,issued,container-title'
  }).toString();
  const found=await Promise.allSettled([
   requestJSON(wikipedia,fetchImpl,timeout),
   requestJSON(academic,fetchImpl,timeout)
  ]);
  const wikipediaSources=found[0].status==='fulfilled'?parseWikiResults(found[0].value,lang):[];
  const paperSources=found[1].status==='fulfilled'?parseCrossrefResults(found[1].value):[];
  const sources=[...wikipediaSources,...paperSources].slice(0,7);
  if(!sources.length){
   throw Error(found.every(x=>x.status==='rejected')?
    'مصادر البحث غير متاحة حاليًا. تحقق من الإنترنت أو حاول لاحقًا.':
    'ملقتش نتائج موثوقة من المصادر المتاحة؛ جرّب كلمات أدق أو بالإنجليزي.');
  }
  const ar=opts.language==='ar'||(opts.language!=='en'&&isArabic(prompt));
  const heading=ar?'نتائج بحث فعلية من مصادر خارجية:':'Real search results from external sources:';
  const caveat=ar?'دي عناوين ومقتطفات من المصادر، مش بحث شامل أو ملخص AI، ومش دليل على صحة كل معلومة. افتح الروابط للتحقق.':
   'These are source titles/excerpts, not an AI synthesis or a full fact-check. Open each source to verify.';
  const lines=sources.map((s,i)=>String(i+1)+'. '+s.title+' — '+s.source+
   (s.snippet?'\n'+s.snippet:'')+'\n'+s.url);
  const text=heading+'\n\n'+lines.join('\n\n')+'\n\n'+caveat;
  return {kind:'source-search',text,sources,network:true,query};
 }
 function writingTemplate(input,opts={}){
  const raw=String(input||'').trim().slice(0,1600);
  const ar=opts.language==='ar'||(opts.language!=='en'&&isArabic(raw));
  const stripped=compact(raw.replace(
   /^(?:(?:ممكن|لو سمحت|عايزك|عايز|please|could you)\s+)?(?:اكتب|تكتب|صياغة|write|draft|polish|rewrite)\s+(?:(?:لي|an?|me|a)?\s*)?(?:إيميل|ايميل|رسالة|email|letter|message)\s*/iu,''),1000);
  const body=stripped||raw;
  const topic=compact(body.replace(/[.!?؟].*$/s,''),90);
  if(ar){
   return {kind:'writing-template',text:'قالب رسالة من المعلومات اللي كتبتها (بدون نموذج AI):\n\nالموضوع: '+(topic||'[الموضوع]')+
    '\n\nتحية طيبة،\n\nأتواصل معكم بخصوص التالي:\n'+(body||'[اكتب التفاصيل هنا]')+
    '\n\nأرجو التكرم بالاطلاع وإفادتي بالرد المناسب.\n\nمع خالص التحية،\n[اسمك]'+
    '\n\nملاحظة: ده تنسيق تلقائي، مش إعادة صياغة ذكية أو مراجعة لغوية كاملة.',network:false};
  }
  return {kind:'writing-template',text:'Quick email structure using only the details you supplied (no AI model):\n\nSubject: '+(topic||'[Subject]')+
   '\n\nHello,\n\nI am writing regarding the following:\n'+(body||'[Add your details]')+
   '\n\nI would appreciate your response when convenient.\n\nKind regards,\n[Your name]'+
   '\n\nNote: This is a structured template, not an AI rewrite or full grammar review.',network:false};
 }
 const CODE={
  python_calc:"def calculate(a, op, b):\n    if op == '+': return a + b\n    if op == '-': return a - b\n    if op == '*': return a * b\n    if op == '/':\n        if b == 0: raise ValueError('Cannot divide by zero')\n        return a / b\n    raise ValueError('Unsupported operator')\n\ntry:\n    a = float(input('First number: '))\n    op = input('Operator (+ - * /): ').strip()\n    b = float(input('Second number: '))\n    print(calculate(a, op, b))\nexcept ValueError as error:\n    print('Error:', error)",
  python_todo:"tasks = []\nwhile True:\n    print('\\n1 Add  2 List  3 Remove  4 Quit')\n    option = input('Choose: ').strip()\n    if option == '1':\n        text = input('Task: ').strip()\n        if text: tasks.append(text)\n    elif option == '2':\n        for index, task in enumerate(tasks, 1):\n            print(f'{index}. {task}')\n    elif option == '3':\n        try:\n            index = int(input('Task number: ')) - 1\n            if 0 <= index < len(tasks): tasks.pop(index)\n            else: print('Invalid number')\n        except ValueError: print('Enter a number')\n    elif option == '4':\n        break\n    else:\n        print('Invalid choice')",
  html_page:"<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <title>My page</title>\n  <style>body{font-family:system-ui;margin:2rem;max-width:700px}button{padding:.75rem 1rem}</style>\n</head>\n<body>\n  <h1>My page</h1>\n  <p>This is a small starting template.</p>\n  <button id=\"hello\">Try it</button>\n  <script>document.querySelector('#hello').addEventListener('click',()=>alert('Hello!'));</script>\n</body>\n</html>",
  js_fetch:"async function getData(url) {\n  const response = await fetch(url);\n  if (!response.ok) throw new Error('HTTP ' + response.status);\n  return await response.json();\n}\n\ngetData('https://example.com/api')\n  .then(data => console.log(data))\n  .catch(error => console.error(error));\n// Replace example.com/api with a real JSON API that permits browser access."
 };
 function codeTemplate(input,opts={}){
  const str=String(input||'').toLowerCase();
  let key=null,label='';
  if(/(?:html|web\s*page|صفحة|موقع)/iu.test(str)){key='html_page';label='HTML/CSS/JavaScript';}
  else if(/(?:fetch|api|طلب بيانات)/iu.test(str)&&/(?:js|javascript|جافا)/iu.test(str)){key='js_fetch';label='JavaScript';}
  else if(/(?:to.?do|task list|قائمة مهام|مهام)/iu.test(str)){key='python_todo';label='Python';}
  else if(/(?:calculator|calc\b|آلة حاسبة|حاسبة)/iu.test(str)){key='python_calc';label='Python';}
  const ar=opts.language==='ar'||(opts.language!=='en'&&isArabic(input));
  if(!key)return {kind:'code-template',network:false,text:ar?
   'القوالب الفورية تدعم حاليًا: آلة حاسبة Python، قائمة مهام Python، صفحة HTML، وطلب API بـ JavaScript.\nده مش مولّد برامج عام. اختار واحدة، أو شغّل نموذج AI المحلي لطلب برمجي مختلف.':
   'Instant code templates currently cover a Python calculator, Python to-do list, HTML page and JavaScript fetch. This is not a general code generator. Select a template or load local AI for a different request.'};
  return {kind:'code-template',network:false,text:(ar?'قالب بداية قابل للتعديل — ':'Editable starting template — ')+label+
   (ar?' (بدون AI، ولم يتم تنفيذ الكود):':' (no AI, code not executed):')+'\n\n'+CODE[key]+
   (ar?'\n\nغيّر القالب حسب احتياجك قبل الاستخدام.':'\n\nAdapt this starter to your actual requirements.')};
 }
 async function perform(prompt,mode,opts={}){
  if(mode==='research')return research(prompt,opts);
  if(mode==='write_fast')return writingTemplate(prompt,opts);
  if(mode==='code_fast')return codeTemplate(prompt,opts);
  throw Error('Unsupported instant task.');
 }
 return Object.freeze({isInstant,makeQuery,stripMarkup,parseWikiResults,parseCrossrefResults,
  writingTemplate,codeTemplate,research,perform});
});
