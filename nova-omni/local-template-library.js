/* NOVA Template Library v3.1: explicit, editable starters, never simulated AI. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.NovaTemplateLibrary=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const items=[
  {id:'research_topic',category:'research',mode:'research',icon:'⌕',title:'بحث عن موضوع',description:'مصادر وروابط من ويكيبيديا وCrossref',prompt:'ابحث عن فوائد الطاقة الشمسية'},
  {id:'research_science',category:'research',mode:'research',icon:'◈',title:'بحث علمي',description:'ابحث عن دراسات منشورة وراجع المصادر',prompt:'ابحث عن دراسات عن الطاقة المتجددة'},
  {id:'research_history',category:'research',mode:'research',icon:'◷',title:'بحث تاريخي',description:'ابحث عن تواريخ وأحداث من مصادر قابلة للفتح',prompt:'ابحث عن تاريخ استكشاف الفضاء'},
  {id:'email_formal',category:'writing',mode:'write_fast',icon:'✉',title:'إيميل رسمي',description:'قالب مراسلة مهنية واضح',prompt:'اكتب إيميل رسمي بخصوص [الموضوع]'},
  {id:'email_followup',category:'writing',mode:'write_fast',icon:'↗',title:'متابعة طلب',description:'استفسار مهذب عن آخر المستجدات',prompt:'اكتب إيميل متابعة لطلب [نوع الطلب]'},
  {id:'complaint',category:'writing',mode:'write_fast',icon:'!',title:'شكوى أو اعتراض',description:'صياغة منظمة لمشكلة وطلب الحل',prompt:'اكتب شكوى بخصوص [المشكلة]'},
  {id:'leave_request',category:'writing',mode:'write_fast',icon:'◷',title:'طلب إجازة',description:'رسالة مختصرة للعمل أو الدراسة',prompt:'اكتب طلب إجازة للفترة [التاريخ]'},
  {id:'job_application',category:'writing',mode:'write_fast',icon:'▣',title:'طلب وظيفة',description:'رسالة تقديم مع مكان لتفاصيلك',prompt:'اكتب رسالة تقديم لوظيفة [المسمى]'},
  {id:'cover_letter',category:'writing',mode:'write_fast',icon:'✦',title:'خطاب تقديم',description:'هيكل Cover Letter قابل للتخصيص',prompt:'اكتب خطاب تقديم لوظيفة [المسمى]'},
  {id:'cv_summary',category:'writing',mode:'write_fast',icon:'◇',title:'نبذة سيرة ذاتية',description:'هيكل نبذة مهنية بدون اختراع خبرات',prompt:'جهز نبذة CV عن مهاراتي [المهارات]'},
  {id:'social_post',category:'writing',mode:'write_fast',icon:'✎',title:'منشور سوشيال',description:'قالب نشر مع افتتاحية ودعوة للتفاعل',prompt:'اعمل منشور عن [الموضوع]'},
  {id:'meeting_notes',category:'writing',mode:'write_fast',icon:'☷',title:'محضر اجتماع',description:'القرارات والمسؤوليات والمواعيد',prompt:'جهز محضر اجتماع عن [الموضوع]'},
  {id:'project_outline',category:'writing',mode:'write_fast',icon:'▤',title:'خطة مشروع',description:'هدف ونطاق ومراحل ومخاطر',prompt:'جهز مخطط مشروع عن [الفكرة]'},
  {id:'essay_outline',category:'writing',mode:'write_fast',icon:'§',title:'هيكل مقال',description:'مقدمة وفقرات وحجة وخاتمة',prompt:'جهز مخطط مقال عن [الموضوع]'},
  {id:'report_structure',category:'writing',mode:'write_fast',icon:'▥',title:'هيكل تقرير',description:'ملخص ومنهج ونتائج وتوصيات',prompt:'جهز تقرير عن [الموضوع]'},
  {id:'python_calc',category:'code',mode:'code_fast',icon:'⌘',title:'حاسبة Python',description:'عمليات أساسية وفحص القسمة على صفر',prompt:'اعمل آلة حاسبة Python'},
  {id:'python_todo',category:'code',mode:'code_fast',icon:'✓',title:'مهام Python',description:'إضافة واستعراض وحذف مهام',prompt:'اعمل قائمة مهام Python'},
  {id:'html_page',category:'code',mode:'code_fast',icon:'▣',title:'صفحة HTML',description:'صفحة متجاوبة كنقطة بداية',prompt:'اعمل صفحة HTML'},
  {id:'js_fetch',category:'code',mode:'code_fast',icon:'⇄',title:'جلب بيانات API',description:'fetch مع معالجة أخطاء HTTP',prompt:'اعمل JavaScript fetch API'},
  {id:'python_quiz',category:'code',mode:'code_fast',icon:'?',title:'اختبار Python',description:'سؤال وجواب وحساب نتيجة',prompt:'اعمل برنامج اختبار Python'},
  {id:'python_csv',category:'code',mode:'code_fast',icon:'▦',title:'قراءة CSV',description:'قراءة ملف محلي باستخدام csv',prompt:'اكتب كود Python لقراءة CSV'},
  {id:'python_json',category:'code',mode:'code_fast',icon:'{ }',title:'قراءة JSON',description:'قراءة ملف JSON مع معالجة أخطاء',prompt:'اكتب كود Python لقراءة JSON'},
  {id:'js_counter',category:'code',mode:'code_fast',icon:'＋',title:'عداد JavaScript',description:'عداد يزيد وينقص بأزرار',prompt:'اعمل عداد JavaScript'},
  {id:'js_filter',category:'code',mode:'code_fast',icon:'⌕',title:'بحث داخل قائمة',description:'فلترة عناصر محليًا بجافاسكربت',prompt:'اكتب JavaScript للبحث داخل قائمة'},
  {id:'html_form',category:'code',mode:'code_fast',icon:'▧',title:'نموذج تواصل',description:'HTML form بلا إرسال خارجي',prompt:'اعمل نموذج تواصل HTML'},
  {id:'css_cards',category:'code',mode:'code_fast',icon:'▦',title:'بطاقات متجاوبة',description:'شبكة بطاقات HTML وCSS',prompt:'اعمل CSS responsive cards'},
  {id:'js_timer',category:'code',mode:'code_fast',icon:'◴',title:'مؤقت JavaScript',description:'ابدأ وأوقف مؤقتًا على الصفحة',prompt:'اعمل JavaScript timer'},
  {id:'study_plan',category:'study',mode:'write_fast',icon:'◫',title:'خطة مذاكرة',description:'قالب تقسيم أهداف ومراجعة أسبوعية',prompt:'جهز خطة مذاكرة لمادة [المادة]'},
  {id:'study_revision',category:'study',mode:'write_fast',icon:'☑',title:'قائمة مراجعة',description:'نقاط فحص قبل الاختبار',prompt:'جهز قائمة مراجعة لموضوع [الموضوع]'},
  {id:'payment_confirmation',category:'writing',mode:'write_fast',icon:'✓',title:'تأكيد دفع',description:'رسالة لتأكيد المبلغ وتاريخ الدفع',prompt:'اكتب تأكيد دفع بقيمة [المبلغ] بتاريخ [التاريخ]'},
  {id:'interview_thanks',category:'writing',mode:'write_fast',icon:'✉',title:'شكر بعد مقابلة',description:'متابعة مهذبة بعد مقابلة العمل',prompt:'اكتب رسالة شكر بعد مقابلة وظيفة [الوظيفة]'},
  {id:'js_form_validation',category:'code',mode:'code_fast',icon:'⌘',title:'التحقق من نموذج',description:'مثال JavaScript للتحقق من البيانات',prompt:'اعمل JavaScript form validation'},
  {id:'research_comparison',category:'research',mode:'research',icon:'≍',title:'مقارنة مصادر',description:'ابحث عن مصادر للمقارنة دون تلخيص مختلق',prompt:'ابحث عن مقارنة الطاقة الشمسية وطاقة الرياح'},
  {id:'study_flashcards',category:'study',mode:'write_fast',icon:'▣',title:'بطاقات مراجعة',description:'هيكل أسئلة وأجوبة للمذاكرة',prompt:'جهز بطاقات مراجعة لموضوع [الموضوع]'}
 ];
 const frozen=Object.freeze(items.map(item=>Object.freeze(item)));
 const byId=new Map(frozen.map(item=>[item.id,item]));
 const validCategories=Object.freeze(['all','writing','code','research','study']);
 let catalog=frozen,catalogLookup=byId,catalogSource='local';
 // Metadata from the same-origin hosted JSON is strictly validated. It cannot add
 // arbitrary code, change execution modes, or introduce unknown template identifiers.
 function applyHostedCatalog(payload){
  if(!payload||payload.schemaVersion!==1||!Array.isArray(payload.templates)||
    payload.templates.length!==frozen.length)return false;
  const seen=new Set(),next=[];
  for(const row of payload.templates){
   if(!row||typeof row.id!=='string'||seen.has(row.id))return false;
   const original=byId.get(row.id);
   if(!original||row.category!==original.category||row.mode!==original.mode)return false;
   const details={};
   for(const key of ['title','description','prompt']){
    if(typeof row[key]!=='string')return false;
    const value=row[key].trim();
    if(!value||value.length>(key==='prompt'?400:140))return false;
    details[key]=value;
   }
   seen.add(row.id);
   next.push(Object.freeze({...original,...details}));
  }
  if(seen.size!==frozen.length)return false;
  catalog=Object.freeze(next);
  catalogLookup=new Map(next.map(item=>[item.id,item]));
  catalogSource='hosted';
  return true;
 }
 function catalogOrigin(){return catalogSource;}
 function getTemplates(){return catalog.slice();}
 function getById(id){return catalogLookup.get(String(id||''))||null;}
 function filterTemplates(category='all',text=''){
  const selected=validCategories.includes(category)?category:'all';
  const q=String(text||'').trim().toLocaleLowerCase();
  return catalog.filter(item=>(selected==='all'||item.category===selected)&&
   (!q||[item.title,item.description,item.prompt].some(s=>s.toLocaleLowerCase().includes(q))));
 }
 const writeStructures={
  email_formal:['الموضوع: [الموضوع]','تحية طيبة،','أتواصل معكم بخصوص [الموضوع].','[التفاصيل والمعلومات ذات الصلة]','أرجو إفادتي بالإجراء المناسب.','مع خالص التحية،','[الاسم]'],
  email_followup:['الموضوع: متابعة بشأن [الطلب]','تحية طيبة،','أتواصل لمتابعة [الطلب] المقدم بتاريخ [التاريخ].','هل تتوفر أي مستجدات أو خطوات مطلوبة مني؟','أشكركم مقدمًا على وقتكم.','مع خالص التحية،','[الاسم]'],
  complaint:['الموضوع: طلب مراجعة بخصوص [المشكلة]','تحية طيبة،','أود لفت انتباهكم إلى المشكلة التالية: [الوصف].','التاريخ/الرقم المرجعي: [البيانات إن وجدت].','أرجو مراجعة المشكلة وتوضيح الحل أو الإجراء المطلوب.','وتفضلوا بقبول الاحترام،','[الاسم]'],
  leave_request:['الموضوع: طلب إجازة','تحية طيبة،','أتقدم بطلب إجازة من [تاريخ البداية] إلى [تاريخ النهاية].','السبب، إذا رغبت في ذكره: [السبب].','أرجو التكرم بالموافقة وإفادتي بأي إجراءات.','شكرًا لتفهمكم.','[الاسم]'],
  job_application:['الموضوع: التقديم لوظيفة [المسمى]','تحية طيبة،','أرغب في التقديم لوظيفة [المسمى] لدى [جهة العمل].','المهارات والخبرات ذات الصلة: [أضف التفاصيل الحقيقية].','أرفقت [السيرة الذاتية إذا أرفقتها بالفعل].','شكرًا لتخصيص وقت لمراجعة الطلب.','[الاسم]'],
  cover_letter:['إلى فريق التوظيف في [الجهة]،','أتقدم لفرصة [المسمى الوظيفي].','المهارات المرتبطة بالمتطلبات: [المهارات الفعلية].','مثال على تجربة أو مشروع: [مثال حقيقي].','سبب الاهتمام بالدور: [السبب].','شكرًا للنظر في طلبي.','[الاسم]'],
  cv_summary:['**نبذة مهنية**','[المجال/الدور الحالي]، لدي خبرة في [مجالات خبرة مثبتة].','تشمل مهاراتي [المهارات الرئيسية].','اهتماماتي المهنية أو هدفي القادم: [الهدف].','احذف أي خانة لا تنطبق على خبرتك.'],
  social_post:['[جملة افتتاحية مشوقة عن الموضوع]','[الفكرة الرئيسية أو الخبر]','[قيمة واضحة للقارئ أو مثال]','[دعوة لطيفة للتفاعل]','[وسوم مرتبطة عند الحاجة]'],
  meeting_notes:['محضر اجتماع: [الموضوع]','التاريخ: [التاريخ]','الحضور: [الأسماء]','النقاط التي نوقشت:','- [النقطة الأولى]','القرارات:','- [القرار + المسؤول]','مهام المتابعة:','- [المهمة + تاريخ التسليم]'],
  project_outline:['اسم المشروع: [الاسم]','الهدف: [ما المطلوب تحقيقه]','النطاق: [ما يدخل وما لا يدخل]','الموارد: [ما يلزم]','المراحل:','1. [البحث والتخطيط]','2. [التنفيذ]','3. [الاختبار والتسليم]','المخاطر وطريقة التعامل: [المخاطر]','قياس النجاح: [معايير قابلة للملاحظة]'],
  essay_outline:['عنوان المقال: [الموضوع]','المقدمة: [سياق + الفكرة الرئيسية]','الفقرة الأولى: [حجة + دليل]','الفقرة الثانية: [حجة + مثال]','وجهة نظر بديلة: [نقطة للنقاش]','الخاتمة: [تلخيص الفكرة والنتيجة]','المصادر: [أضف مراجع تحققت منها]'],
  report_structure:['عنوان التقرير: [العنوان]','الملخص التنفيذي: [المشكلة + النتيجة الرئيسية]','الهدف والنطاق: [التحديد]','الطريقة أو مصادر البيانات: [المصادر الفعلية]','النتائج: [ما تم رصده]','المناقشة والقيود: [تفسير وحدود الاستنتاج]','التوصيات: [الإجراء]'],
  study_plan:['المادة: [اسم المادة]','الهدف الأسبوعي: [الموضوعات]','الأحد: [درس + تدريب]','الإثنين: [مراجعة + أسئلة]','الثلاثاء: [درس + تطبيق]','الأربعاء: [حل أسئلة]','الخميس: [مراجعة الأخطاء]','الجمعة: [اختبار ذاتي]','السبت: [مراجعة خفيفة/راحة]','طريقة قياس التقدم: [المهام المكتملة]'],
  study_revision:['موضوع المراجعة: [الموضوع]','☐ أفهم التعريفات والأفكار الأساسية','☐ أقدر أشرح القانون أو الفكرة بمثال','☐ حللت سؤالًا بدون النظر للحل','☐ راجعت الأخطاء الشائعة','☐ عرفت النقاط التي أحتاج سؤال المعلم عنها','☐ جهزت ملخصًا أو بطاقات مذاكرة'],
  payment_confirmation:['الموضوع: تأكيد استلام / إتمام دفعة','تحية طيبة،','أود تأكيد سداد مبلغ [المبلغ] بتاريخ [التاريخ].','رقم الفاتورة أو المرجع: [إن وجد].','أرفقت إثبات الدفع [فقط إذا أُرفق بالفعل].','أرجو تأكيد وصول المبلغ إلى حسابكم.','مع خالص التحية،','[الاسم]'],
  interview_thanks:['الموضوع: شكر بخصوص مقابلة [الوظيفة]','تحية طيبة،','شكرًا على تخصيص وقت لمقابلتي بشأن [الوظيفة].','أسعدني التعرف أكثر على [الفريق أو الدور].','ما زلت مهتمًا بالفرصة، ويسعدني تقديم أي معلومات إضافية.','مع خالص التحية،','[الاسم]'],
  study_flashcards:['بطاقات مراجعة لموضوع: [الموضوع]','البطاقة 1 — السؤال: [تعريف أو مفهوم]','الإجابة: [اكتب الإجابة الصحيحة من المنهج]','البطاقة 2 — السؤال: [سبب أو قانون]','الإجابة: [اكتب السبب أو القانون الصحيح]','البطاقة 3 — السؤال: [مثال تطبيقي]','الإجابة: [حل المثال خطوة خطوة]','راجع كل إجابة باستخدام ملاحظاتك أو كتابك']
 };
 const englishOverrides={
  email_formal:['Subject: [Subject]','Hello,','I am writing regarding [subject].','[Relevant details]','Could you please advise on the next steps?','Kind regards,','[Your name]'],
  email_followup:['Subject: Follow-up on [request]','Hello,','I am following up on [request] submitted on [date].','Could you please share an update or let me know if anything else is required?','Thank you for your time.','Kind regards,','[Your name]'],
  complaint:['Subject: Request to review [issue]','Hello,','I would like to raise the following concern: [description].','Reference/date: [if applicable].','Please review this matter and advise on a resolution.','Kind regards,','[Your name]'],
  leave_request:['Subject: Leave request','Hello,','I would like to request leave from [start] to [end].','Reason, if needed: [reason].','Please let me know if you require any further details.','Thank you,','[Your name]'],
  job_application:['Subject: Application for [role]','Dear Hiring Team,','I am applying for [role] with [organisation].','Relevant skills and experience: [verified details].','I have attached [CV, only if actually attached].','Thank you for considering my application.','[Your name]'],
  cover_letter:['Dear Hiring Team,','I am applying for [role].','I can offer [real relevant skills].','One relevant example: [your actual project or experience].','Why this position: [reason].','Thank you for your consideration.','[Your name]'],
  cv_summary:['Professional summary','[Your field/current role].','My proven skills include [skills].','My next goal is [professional goal].','Remove any placeholder that does not apply.'],
  social_post:['[Engaging opening]','[Main news or idea]','[Why it matters or example]','[Call to action]','[Relevant tags, optional]'],
  meeting_notes:['Meeting: [topic]','Date: [date]','Attendees: [names]','Discussion points: [items]','Decisions: [decision and owner]','Follow-ups: [task and due date]'],
  project_outline:['Project: [name]','Objective: [desired outcome]','Scope: [included/excluded]','Resources: [needed]','Milestones: [steps]','Risks: [mitigations]','Success criteria: [checks]'],
  essay_outline:['Title: [subject]','Introduction: [context + thesis]','Paragraph 1: [claim + evidence]','Paragraph 2: [claim + example]','Alternative view: [counterpoint]','Conclusion: [synthesis]','References: [verified sources]'],
  report_structure:['Report: [title]','Summary: [purpose + findings]','Scope: [boundaries]','Methods: [actual sources/data]','Findings: [observations]','Discussion and limits: [interpretation]','Recommendations: [next steps]'],
  study_plan:['Subject: [subject]','Weekly goal: [topics]','Mon: [lesson]','Tue: [practice]','Wed: [review]','Thu: [questions]','Fri: [test]','Weekend: [review and rest]','Progress check: [completed tasks]'],
  study_revision:['Revision topic: [topic]','[ ] Understand key ideas','[ ] Explain with an example','[ ] Solve a question independently','[ ] Review mistakes','[ ] Note what to ask a teacher'],
  payment_confirmation:['Subject: Payment confirmation for [reference]','Hello,','I am confirming payment of [amount] on [date].','Invoice/reference: [if applicable].','I have attached payment confirmation [only if actually attached].','Could you please acknowledge receipt?','Kind regards,','[Your name]'],
  interview_thanks:['Subject: Thank you for the [role] interview','Hello,','Thank you for taking the time to meet with me about [role].','It was helpful learning more about [team or responsibilities].','I remain interested and would be happy to share further information.','Kind regards,','[Your name]'],
  study_flashcards:['Flashcards for [topic]','Card 1 — Question: [key definition]','Answer: [verified definition from notes]','Card 2 — Question: [why/how question]','Answer: [correct explanation]','Card 3 — Question: [practice example]','Answer: [worked solution]','Verify each card against your notes']
 };
 const codeSnippets={
  python_quiz:"questions = [('Capital of France?', 'paris'), ('2 + 3?', '5')]\nscore = 0\nfor question, answer in questions:\n    response = input(question + ' ').strip().lower()\n    if response == answer:\n        print('Correct')\n        score += 1\n    else:\n        print('Answer:', answer)\nprint(f'Score: {score}/{len(questions)}')",
  python_csv:"import csv\nfrom pathlib import Path\npath = Path('data.csv')\ntry:\n    with path.open(newline='', encoding='utf-8-sig') as file:\n        for row in csv.DictReader(file):\n            print(row)\nexcept FileNotFoundError:\n    print('Create data.csv in the same folder first.')",
  python_json:"import json\nfrom pathlib import Path\npath = Path('data.json')\ntry:\n    with path.open(encoding='utf-8') as file:\n        data = json.load(file)\n    print(data)\nexcept FileNotFoundError:\n    print('File not found:', path)\nexcept json.JSONDecodeError as error:\n    print('Invalid JSON:', error)",
  js_counter:"<!doctype html>\n<html lang=\"en\"><meta charset=\"utf-8\"><title>Counter</title>\n<button id=\"minus\">−</button>\n<output id=\"count\">0</output>\n<button id=\"plus\">+</button>\n<script>\nlet count = 0;\nconst output = document.querySelector('#count');\nfunction show() { output.textContent = String(count); }\ndocument.querySelector('#plus').addEventListener('click', () => {count++;show();});\ndocument.querySelector('#minus').addEventListener('click', () => {count--;show();});\n</script></html>",
  js_filter:"const items = ['apple', 'orange', 'banana', 'pear'];\nfunction searchList(query) {\n  const q = query.toLowerCase().trim();\n  return items.filter(item => item.toLowerCase().includes(q));\n}\nconsole.log(searchList('ap'));\n// Connect the function to your own input/list UI.",
  html_form:"<!doctype html>\n<html lang=\"en\"><meta charset=\"utf-8\"><title>Contact form</title>\n<form id=\"contact\">\n  <label>Name <input name=\"name\" required></label>\n  <label>Email <input name=\"email\" type=\"email\" required></label>\n  <label>Message <textarea name=\"message\" required></textarea></label>\n  <button>Preview</button>\n</form><output id=\"message\"></output>\n<script>\ndocument.querySelector('#contact').addEventListener('submit', e => {\n  e.preventDefault();\n  document.querySelector('#message').textContent = 'Preview only — no message was sent.';\n});\n</script></html>",
  css_cards:"<!doctype html>\n<html lang=\"en\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<style>\nbody{font-family:system-ui;padding:1.5rem}\n.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:1rem}\n.card{border:1px solid #ddd;border-radius:12px;padding:1.2rem}\n</style>\n<h1>Cards</h1>\n<div class=\"cards\"><article class=\"card\">First</article><article class=\"card\">Second</article></div>\n</html>",
  js_form_validation:"<!doctype html>\n<html lang=\"en\"><meta charset=\"utf-8\"><title>Form validation</title>\n<form id=\"registration\">\n <label>Email <input name=\"email\" type=\"email\" required></label>\n <label>Age <input name=\"age\" type=\"number\" min=\"1\" max=\"120\" required></label>\n <button type=\"submit\">Check form</button>\n</form>\n<p id=\"status\" role=\"status\"></p>\n<script>\nconst form = document.querySelector('#registration');\nform.addEventListener('submit', event => {\n event.preventDefault();\n const status = document.querySelector('#status');\n status.textContent = form.checkValidity() ? 'Inputs valid (nothing sent).' : 'Please fix the fields.';\n});\n</script></html>",
  js_timer:"<!doctype html>\n<html lang=\"en\"><meta charset=\"utf-8\"><title>Timer</title>\n<output id=\"seconds\">0</output><button id=\"start\">Start</button><button id=\"stop\">Stop</button>\n<script>\nlet seconds = 0;\nlet timer = null;\nconst output = document.querySelector('#seconds');\ndocument.querySelector('#start').addEventListener('click', () => {\n  if(timer !== null) return;\n  timer = setInterval(() => {seconds++;output.textContent = String(seconds);},1000);\n});\ndocument.querySelector('#stop').addEventListener('click',()=>{\n  if(timer!==null)clearInterval(timer);\n  timer = null;\n});\n</script></html>"
 };
 const legacyCode=new Set(['python_calc','python_todo','html_page','js_fetch']);
 function render(input,id,opts={}){
  const item=getById(id);
  if(!item||item.mode==='research')return null;
  const raw=String(input||'').trim().slice(0,2500);
  const ar=opts.language==='ar'||opts.language==='ar-eg'||(opts.language!=='en'&&/[\u0600-\u06ff]/.test(raw));
  if(item.mode==='code_fast'){
   if(legacyCode.has(id))return null;
   const source=codeSnippets[id];
   if(!source)return null;
   return {kind:'code-template',network:false,text:(ar?'قالب برمجي قابل للتعديل، بدون AI ولم يتم اختبار تشغيله:':'Editable code starter, no AI and not executed:')+'\n\n'+source+
    (ar?'\n\nعدّل النص والملفات حسب مشروعك.':'\n\nAdapt to your project before use.')};
  }
  const lines=(ar?writeStructures[id]:englishOverrides[id])||writeStructures[id];
  if(!lines)return null;
  const details=raw&&raw!==item.prompt?'\n\n'+(ar?'تفاصيلك المكتوبة (لم يتم إعادة صياغتها آليًا):':'Your provided details (not AI-rewritten):')+'\n'+raw:'';
  return {kind:'writing-template',network:false,text:(ar?'قالب منظم قابل للتعديل (بدون نموذج AI):':'Editable structured template (no AI model):')+'\n\n'+lines.join('\n')+details+
   (ar?'\n\nراجع الخانات بين [ ] واملأها بالمعلومات الحقيقية.':'\n\nReplace [ ] placeholders with real information.')};
 }
 return Object.freeze({getTemplates,getById,filterTemplates,render,applyHostedCatalog,catalogOrigin});
});
