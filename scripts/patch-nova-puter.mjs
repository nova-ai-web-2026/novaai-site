import fs from 'node:fs';

const file='nova-ultimate/index.html';
let html=fs.readFileSync(file,'utf8');

if(!html.includes('https://js.puter.com/v2/')){
  const headEnd=html.indexOf('</head>');
  if(headEnd<0)throw new Error('Missing </head>');
  html=html.slice(0,headEnd)+'<script src="https://js.puter.com/v2/"></script>\n'+html.slice(headEnd);
}
if(!html.includes('./v7.css')){
  const headEnd=html.indexOf('</head>');
  if(headEnd<0)throw new Error('Missing </head>');
  html=html.slice(0,headEnd)+'<link rel="stylesheet" href="./v7.css?v=7">\n'+html.slice(headEnd);
}
if(!html.includes('./app-v7.js')){
  const bodyEnd=html.lastIndexOf('</body>');
  if(bodyEnd<0)throw new Error('Missing final </body>');
  html=html.slice(0,bodyEnd)+'<script src="./app-v7.js?v=7"></script>\n'+html.slice(bodyEnd);
}

html=html.replaceAll('تعديل محلي وتوليد AI عند ربط الخادم','تعديل وتوليد صور بالذكاء الاصطناعي');
html=html.replaceAll('المحادثة الذكية محتاجة خادم API متصل. الأدوات المحلية شغالة عادي، ومن الإعدادات تقدر تربط عنوان الخادم لما يكون جاهز.','المحادثة تعمل مباشرة عبر Puter بعد تسجيل الدخول.');
html=html.replaceAll('GitHub Pages يشغّل الواجهة والأدوات المحلية فقط؛ أضف رابط خادم API لتفعيل المحادثة وتوليد AI.','اتصال الذكاء الاصطناعي يتم مباشرة عبر Puter ولا يحتاج خادم API يدوي.');
html=html.replaceAll("navigator.serviceWorker.register('./sw.js?v=3')","navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).then(()=>navigator.serviceWorker.register('./sw.js?v=7'))");
html=html.replaceAll("navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).then(()=>navigator.serviceWorker.register('./sw.js?v=5'))","navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).then(()=>navigator.serviceWorker.register('./sw.js?v=7'))");

fs.writeFileSync(file,html);
console.log('NovaAI v7: injected AI/UI assets at real document boundaries');
