import fs from 'node:fs';

const file='nova-ultimate/index.html';
let html=fs.readFileSync(file,'utf8');

if(!html.includes('https://js.puter.com/v2/')){
  html=html.replace('</head>','<script src="https://js.puter.com/v2/"></script>\n</head>');
}
if(!html.includes('./v7.css')){
  html=html.replace('</head>','<link rel="stylesheet" href="./v7.css?v=7">\n</head>');
}
if(!html.includes('./app-v7.js')){
  html=html.replace('</body>','<script src="./app-v7.js?v=7"></script>\n</body>');
}

html=html.replaceAll('تعديل محلي وتوليد AI عند ربط الخادم','تعديل وتوليد صور بالذكاء الاصطناعي');
html=html.replaceAll('المحادثة الذكية محتاجة خادم API متصل. الأدوات المحلية شغالة عادي، ومن الإعدادات تقدر تربط عنوان الخادم لما يكون جاهز.','المحادثة تعمل مباشرة عبر Puter بعد تسجيل الدخول.');
html=html.replaceAll('GitHub Pages يشغّل الواجهة والأدوات المحلية فقط؛ أضف رابط خادم API لتفعيل المحادثة وتوليد AI.','اتصال الذكاء الاصطناعي يتم مباشرة عبر Puter ولا يحتاج خادم API يدوي.');
html=html.replaceAll("navigator.serviceWorker.register('./sw.js?v=3')","navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).then(()=>navigator.serviceWorker.register('./sw.js?v=7'))");
html=html.replaceAll("navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).then(()=>navigator.serviceWorker.register('./sw.js?v=5'))","navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).then(()=>navigator.serviceWorker.register('./sw.js?v=7'))");

fs.writeFileSync(file,html);
console.log('NovaAI v7: Puter model discovery + reliable send flow + clean UI enabled');
