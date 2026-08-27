import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const v4 = fs.readFileSync('nova-studio-v4/index.html','utf8');
const v5 = fs.readFileSync('nova-studio-v5/index.html','utf8');
let passed = 0;
const groups = new Map();
function check(name, fn, group='general') {
  fn(); passed++;
  groups.set(group,(groups.get(group)||0)+1);
  console.log(`PASS [${group}] ${name}`);
}
function includes(src, text, name=text, group='source') { check(name,()=>assert.ok(src.includes(text),`Missing: ${text}`),group); }
function excludes(src, text, name=text, group='source') { check(name,()=>assert.ok(!src.includes(text),`Forbidden text present: ${text}`),group); }
function values(src, attr){ return [...src.matchAll(new RegExp(`${attr}="([^"]+)"`,'g'))].map(m=>m[1]); }
const wait=(ms=25)=>new Promise(r=>setTimeout(r,ms));

// 1) Core document / accessibility / responsive shell
check('v4 doctype',()=>assert.match(v4,/^<!doctype html>/i),'shell');
check('v4 Arabic RTL',()=>assert.match(v4,/<html[^>]*lang="ar"[^>]*dir="rtl"/i),'shell');
includes(v4,'width=device-width','responsive viewport','shell');
includes(v4,'@media(max-width:800px)','mobile breakpoint','shell');
includes(v4,'id="hamb"','mobile menu button','shell');
includes(v4,'id="shade"','mobile shade','shell');
includes(v4,'https://js.puter.com/v2/','Puter browser SDK','shell');
check('single Puter SDK include',()=>assert.equal((v4.match(/js\.puter\.com\/v2\//g)||[]).length,1),'shell');

// 2) Navigation and workspace structure
for (const p of ['chat','images','video','games']) includes(v4,`data-panel="${p}"`,`panel nav ${p}`,'navigation');
for (const p of ['chat','images','video','games']) includes(v4,`id="panel-${p}"`,`panel body ${p}`,'navigation');
includes(v4,'id="newChat"','new chat action','navigation');
includes(v4,'id="prompt"','chat prompt','navigation');
includes(v4,'id="send"','chat send','navigation');
const panelValues=[...new Set(values(v4,'data-panel'))].sort();
check('exact four workspace nav targets',()=>assert.deepEqual(panelValues,['chat','games','images','video']),'navigation');

// 3) Nova model branding / internal routing
includes(v4,'Nova 4.0','Nova 4.0 visible','models');
includes(v4,'Nova 3.6','Nova 3.6 visible','models');
includes(v4,"nova4:'anthropic/claude-opus-5'",'Nova 4.0 exact internal route','models');
includes(v4,"nova36:'qwen/qwen3.8-max'",'Nova 3.6 exact internal route','models');
const modelValues=[...new Set(values(v4,'data-model'))].sort();
check('exact two Nova model choices',()=>assert.deepEqual(modelValues,['nova36','nova4']),'models');
includes(v4,'id="modelLabel">Nova 4.0','Nova 4.0 default label','models');
const visibleV4=v4.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
for (const secret of ['anthropic/','qwen/qwen','Claude Opus','Qwen3.8']) excludes(visibleV4,secret,`hidden provider label: ${secret}`,'models');
excludes(visibleV4,'Automatic','no Automatic model label','models');
excludes(visibleV4,'4.5','no old 4.5 model label','models');

// 4) Reasoning levels
const thinks=[...new Set(values(v4,'data-think'))].sort();
check('all four reasoning levels',()=>assert.deepEqual(thinks,['high','medium','minimal','xhigh']),'reasoning');
includes(v4,'id="thinkLabel">تفكير عميق','deep thinking default','reasoning');
includes(v4,'reasoning_effort:state.think','reasoning passed to AI call','reasoning');
includes(v4,'أقصى تفكير','maximum reasoning visible','reasoning');
includes(v4,'متوازن','balanced reasoning visible','reasoning');
includes(v4,'سريع','fast reasoning visible','reasoning');

// 5) Auth / balance handling
includes(v4,'id="auth"','auth button','balance');
includes(v4,'puter.auth.isSignedIn','signed-in check','balance');
includes(v4,'puter.auth.signIn','sign-in path','balance');
includes(v4,'puter.auth.getMonthlyUsage()','monthly usage preflight','balance');
includes(v4,'id="balanceVal"','balance value UI','balance');
includes(v4,'id="balanceSub"','balance detail UI','balance');
includes(v4,"if(q!=='preview'&&noBalance())",'video low-balance preflight guard','balance');
includes(v4,'isLowBalance','low-balance error classifier','balance');

// 6) Chat / intent routing
includes(v4,'puter.ai.chat','real chat API call','chat');
for (const route of ['function isVideo(','function isImage(','function isGame(']) includes(v4,route,`${route} current intent route`,'chat');
includes(v4,"if(isVideo(text))",'chat routes video intent','chat');
includes(v4,"if(isImage(text))",'chat routes image intent','chat');
includes(v4,"if(isGame(text))",'chat routes game intent','chat');
excludes(v4,'/api/chat','no legacy chat server endpoint','chat');
excludes(v4,'المحادثة الذكية محتاجة خادم API','no legacy API-server warning','chat');
includes(v4,'state.messages','chat state/history','chat');
includes(v4,'محادثة جديدة','new-chat UI copy','chat');
includes(v4,'Never reveal internal engine/provider names','system prompt hides providers','chat');

// 7) Image generation
includes(v4,'Nova Image','image studio visible','images');
includes(v4,'id="imgPrompt"','image prompt','images');
includes(v4,'id="imgRatio"','image ratio control','images');
includes(v4,'id="imgQuality"','image quality control','images');
includes(v4,'puter.ai.txt2img','real image generation API','images');
includes(v4,"model:'gpt-image-2'",'image engine configured','images');
includes(v4,'puter_output_path','media persistence option','images');
for(const ratio of ['1:1','16:9','9:16']) includes(v4,`value="${ratio}"`, `image ratio ${ratio}`,'images');
includes(v4,'id="imgOut"','image output region','images');
includes(v4,'id="imgWarn"','image low-balance warning region','images');

// 8) Video generation and quality
includes(v4,'Nova Video','video studio visible','video');
includes(v4,'puter.ai.txt2vid','real video generation API','video');
includes(v4,'veo-3.1-generate-preview','ultra video model configured','video');
includes(v4,'3840x2160','4K video resolution','video');
includes(v4,'seconds:8','8 second cloud generation setting','video');
includes(v4,'Preview مجاني · عينة فقط','free preview explicitly marked sample','video');
includes(v4,'puter.ai.txt2vid(p,true)','free sample test-mode route','video');
includes(v4,'id="vidOut"','video output region','video');
includes(v4,'id="vidWarn"','video low-balance warning region','video');
includes(v4,'.mp4','MP4 media path/label','video');

// 9) Game builder
includes(v4,'صانع الألعاب','game builder navigation','games');
includes(v4,'id="gamePrompt"','game prompt','games');
includes(v4,'id="gameCode"','game code editor','games');
includes(v4,'id="gamePreview"','game live preview','games');
includes(v4,'id="buildGame"','build game action','games');
includes(v4,'srcdoc','document preview mechanism','games');
includes(v4,'one complete self-contained HTML game only','self-contained game instruction','games');
includes(v4,'No external assets or libraries','no external asset instruction','games');

// 10) Security / static hygiene
for (const marker of ['sk-','BAILIAN_TOKEN_PLAN_API_KEY','DASHSCOPE_API_KEY','POLLINATIONS_API_KEY']) excludes(v4,marker,`no secret marker ${marker}`,'security');
check('no obvious hardcoded bearer token',()=>assert.doesNotMatch(v4,/Bearer\s+[A-Za-z0-9._-]{20,}/),'security');
const ids=values(v4,'id');
check('all v4 HTML ids unique',()=>assert.equal(new Set(ids).size,ids.length),'security');

// 11) v4 JavaScript parse/compile
const v4Scripts=[...v4.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
check('v4 has inline app script',()=>assert.ok(v4Scripts.length>=1),'javascript');
const v4App=v4Scripts.at(-1);
check('v4 app JavaScript compiles',()=>new vm.Script(v4App),'javascript');

// 12) Dynamic v4 browser-like integration tests
function bootV4({signedIn=true,remaining=500000000}={}){
  const dom=new JSDOM(v4,{url:'https://nova.test/v4/',runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom;
  let signed=signedIn, rem=remaining;
  const calls={chat:[],video:[],image:[],signIn:0,usage:0};
  window.puter={
    auth:{
      isSignedIn:()=>signed,
      signIn:async()=>{calls.signIn++;signed=true;return{}},
      getMonthlyUsage:async()=>{calls.usage++;return {allowanceInfo:{remaining:rem}}}
    },
    ai:{
      chat:async(messages,opts)=>{calls.chat.push({messages,opts});const sys=String(messages?.[0]?.content||'');if(sys.includes('Nova Game Builder'))return {message:{content:'<!doctype html><html><body><button>Play</button></body></html>'}};return {message:{content:'Nova dynamic reply'}}},
      txt2vid:async(prompt,opts)=>{calls.video.push({prompt,opts});const el=window.document.createElement('video');el.src='data:video/mp4;base64,AAAA';return el},
      txt2img:async(prompt,opts)=>{calls.image.push({prompt,opts});const el=window.document.createElement('img');el.src='data:image/png;base64,AAAA';return el}
    }
  };
  window.eval(v4App);
  return {window,calls,setRemaining:v=>{rem=v},setSigned:v=>{signed=v}};
}
const d=bootV4();
await wait();
const dw=d.window, dq=s=>dw.document.querySelector(s);
check('dynamic default Nova 4.0',()=>assert.equal(dq('#modelLabel').textContent.trim(),'Nova 4.0'),'dynamic-chat');
check('dynamic default deep thinking',()=>assert.equal(dq('#thinkLabel').textContent.trim(),'تفكير عميق'),'dynamic-chat');
check('initial signed-in usage refresh occurs',()=>assert.ok(d.calls.usage>=1),'dynamic-chat');
dq('[data-model="nova36"]').click(); dq('[data-think="xhigh"]').click();
dq('#prompt').value='اختبار محادثة عادي'; dq('#send').click(); await wait();
check('normal chat made one model call',()=>assert.ok(d.calls.chat.length>=1),'dynamic-chat');
check('Nova 3.6 routes to exact internal model',()=>assert.equal(d.calls.chat.at(-1).opts.model,'qwen/qwen3.8-max'),'dynamic-chat');
check('xhigh reasoning passed dynamically',()=>assert.equal(d.calls.chat.at(-1).opts.reasoning_effort,'xhigh'),'dynamic-chat');
check('normal response rendered',()=>assert.ok(dq('#chatCol').textContent.includes('Nova dynamic reply')),'dynamic-chat');
check('visible response meta uses Nova label',()=>assert.ok(dq('#chatCol').textContent.includes('Nova 3.6')),'dynamic-chat');
check('visible response does not expose provider',()=>assert.ok(!/anthropic|qwen\/qwen|claude opus/i.test(dq('#chatCol').textContent)),'dynamic-chat');

// Dynamic navigation
const imgNav=dq('[data-panel="images"]'); imgNav.click();
check('images nav activates images panel',()=>assert.ok(dq('#panel-images').classList.contains('active')),'dynamic-nav');
dq('[data-panel="chat"]').click();
check('chat nav reactivates chat panel',()=>assert.ok(dq('#panel-chat').classList.contains('active')),'dynamic-nav');

// Dynamic video intent from chat
const beforeVideo=d.calls.video.length;
dq('#prompt').value='اعمل لي فيديو لمدينة مستقبلية في المطر'; dq('#send').click(); await wait(40);
check('video chat intent calls video generator',()=>assert.equal(d.calls.video.length,beforeVideo+1),'dynamic-media');
check('video intent opens video panel',()=>assert.ok(dq('#panel-video').classList.contains('active')),'dynamic-media');
check('video element rendered',()=>assert.ok(dq('#vidOut video')),'dynamic-media');
check('video generation persists MP4 path',()=>assert.ok(String(d.calls.video.at(-1).opts?.puter_output_path||'').endsWith('.mp4')),'dynamic-media');

// Dynamic image intent from chat
const beforeImage=d.calls.image.length;
dq('[data-panel="chat"]').click(); dq('#prompt').value='اعمل لي صورة لمدينة فوق البحر'; dq('#send').click(); await wait(40);
check('image chat intent calls image generator',()=>assert.equal(d.calls.image.length,beforeImage+1),'dynamic-media');
check('image intent opens image panel',()=>assert.ok(dq('#panel-images').classList.contains('active')),'dynamic-media');
check('image element rendered',()=>assert.ok(dq('#imgOut img')),'dynamic-media');
check('image generation persists PNG path',()=>assert.ok(String(d.calls.image.at(-1).opts?.puter_output_path||'').endsWith('.png')),'dynamic-media');

// Dynamic game intent from chat
const beforeGameChats=d.calls.chat.length;
dq('[data-panel="chat"]').click(); dq('#prompt').value='اعمل لي لعبة منصات للموبايل'; dq('#send').click(); await wait(40);
check('game intent calls chat builder',()=>assert.ok(d.calls.chat.length>beforeGameChats),'dynamic-game');
check('game intent opens games panel',()=>assert.ok(dq('#panel-games').classList.contains('active')),'dynamic-game');
check('generated game HTML inserted',()=>assert.ok(dq('#gameCode').value.includes('<html')),'dynamic-game');
check('generated game preview receives HTML',()=>assert.ok(dq('#gamePreview').srcdoc.includes('<html')),'dynamic-game');
check('game builder uses selected Nova model',()=>assert.equal(d.calls.chat.at(-1).opts.model,'qwen/qwen3.8-max'),'dynamic-game');
check('game builder uses selected reasoning',()=>assert.equal(d.calls.chat.at(-1).opts.reasoning_effort,'xhigh'),'dynamic-game');

// Dynamic zero-balance video block + free preview bypass
const videoCountBeforeBlock=d.calls.video.length; d.setRemaining(0);
dq('[data-panel="video"]').click(); dq('#vidPrompt').value='فيديو اختبار رصيد'; dq('#vidQuality').value='ultra'; dq('#genVideo').click(); await wait(40);
check('zero balance blocks paid video before API call',()=>assert.equal(d.calls.video.length,videoCountBeforeBlock),'dynamic-balance');
check('zero balance shows video warning',()=>assert.ok(dq('#vidWarn').classList.contains('show')),'dynamic-balance');
check('zero balance message shown in output',()=>assert.ok(/الرصيد|صفر/.test(dq('#vidOut').textContent)),'dynamic-balance');
dq('#vidQuality').value='preview'; dq('#genVideo').click(); await wait(40);
check('free preview bypasses zero-balance block',()=>assert.equal(d.calls.video.length,videoCountBeforeBlock+1),'dynamic-balance');
check('free preview uses boolean test mode',()=>assert.equal(d.calls.video.at(-1).opts,true),'dynamic-balance');

// Dynamic sign-in flow on fresh instance
const a=bootV4({signedIn:false,remaining:500000000}); await wait();
const aq=s=>a.window.document.querySelector(s);
aq('#prompt').value='مرحبا Nova'; aq('#send').click(); await wait(40);
check('signed-out chat triggers sign-in',()=>assert.equal(a.calls.signIn,1),'dynamic-auth');
check('chat proceeds after sign-in',()=>assert.equal(a.calls.chat.length,1),'dynamic-auth');
check('auth button changes to connected',()=>assert.equal(aq('#auth').textContent.trim(),'متصل'),'dynamic-auth');

// New chat reset
dq('[data-panel="chat"]').click(); dq('#newChat').click();
check('new chat returns welcome screen',()=>assert.ok(dq('#chatCol').textContent.includes('ماذا تريد أن تصنع؟')),'dynamic-chat');

// 13) v5 Local Extend shell
includes(v5,'../nova-studio-v4/?from=v5','v5 wraps current v4','extend');
includes(v5,'Nova Local Extend','local extender dialog','extend');
includes(v5,'بدون رصيد','local no-credit wording','extend');
includes(v5,'captureStream','captureStream support','extend');
includes(v5,'mozCaptureStream','Firefox capture fallback','extend');
includes(v5,'MediaRecorder','MediaRecorder export','extend');
includes(v5,'video/mp4;codecs=avc1.42E01E,mp4a.40.2','MP4 preferred recorder format','extend');
includes(v5,'video/webm;codecs=vp9,opus','WebM VP9 fallback','extend');
for(const sec of ['16','24','32','60']) includes(v5,`value="${sec}"`,`${sec}s local duration option`,'extend');
includes(v5,'accept="video/*"','local file accepts video','extend');
includes(v5,"$('#download').download=`nova-extended-${target}s.${extFor(type)}`",'duration-based download filename','extend');
includes(v5,'الملف الناتج فارغ','empty output protection','extend');
includes(v5,'مدة الفيديو غير صالحة','invalid duration protection','extend');
includes(v5,'لم أجد فيديو داخل Nova','missing in-app video protection','extend');

// 14) v5 JS compile + dynamic test hooks
const v5Script=[...v5.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)?.[1];
check('v5 inline extender script exists',()=>assert.ok(v5Script),'extend-dynamic');
check('v5 extender JavaScript compiles',()=>new vm.Script(v5Script),'extend-dynamic');
function bootV5({mimeSupport=(t)=>t.startsWith('video/mp4')}={}){
  const dom=new JSDOM(v5,{url:'https://nova.test/v5/',runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom;
  class MR {
    static isTypeSupported(t){return mimeSupport(t)}
    constructor(stream,o={}){this.stream=stream;this.mimeType=o.mimeType||'video/webm'}
    start(){}
    stop(){this.ondataavailable?.({data:new window.Blob(['ok'],{type:this.mimeType})});this.onstop?.()}
  }
  window.MediaRecorder=MR;
  window.eval(v5Script);
  return {window,api:window.__novaLocalExtendTest};
}
const b1=bootV5();
check('v5 exposes test API',()=>assert.ok(b1.api),'extend-dynamic');
check('MP4 chosen when supported',()=>assert.match(b1.api.bestMime(),/^video\/mp4/),'extend-dynamic');
check('MP4 extension mapping',()=>assert.equal(b1.api.extFor('video/mp4'),'mp4'),'extend-dynamic');
check('WebM extension mapping',()=>assert.equal(b1.api.extFor('video/webm'),'webm'),'extend-dynamic');
check('captureStream preferred',()=>assert.deepEqual(b1.api.capture({captureStream:()=>({kind:'standard'})}),{kind:'standard'}),'extend-dynamic');
check('mozCaptureStream fallback',()=>assert.deepEqual(b1.api.capture({mozCaptureStream:()=>({kind:'moz'})}),{kind:'moz'}),'extend-dynamic');
check('unsupported capture returns null',()=>assert.equal(b1.api.capture({}),null),'extend-dynamic');
const b2=bootV5({mimeSupport:t=>t.startsWith('video/webm;codecs=vp9')});
check('WebM fallback selected when MP4 unsupported',()=>assert.match(b2.api.bestMime(),/^video\/webm/),'extend-dynamic');
const b3=bootV5({mimeSupport:()=>false});
check('empty MIME selection when none supported',()=>assert.equal(b3.api.bestMime(),''),'extend-dynamic');

// 15) v5 modal/UI behavior
const w=b1.window;
const $=s=>w.document.querySelector(s);
$('#openExtend').click();
check('open extender modal',()=>assert.ok($('#shade').classList.contains('open')),'extend-ui');
$('#cancel').click();
check('cancel closes extender modal',()=>assert.ok(!$('#shade').classList.contains('open')),'extend-ui');
$('#openExtend').click(); $('#closeExtend').click();
check('close X closes extender modal',()=>assert.ok(!$('#shade').classList.contains('open')),'extend-ui');
$('#sourceMode').value='file'; $('#sourceMode').dispatchEvent(new w.Event('change'));
check('file mode shows file picker',()=>assert.equal($('#fileField').style.display,'grid'),'extend-ui');
$('#sourceMode').value='auto'; $('#sourceMode').dispatchEvent(new w.Event('change'));
check('auto mode hides file picker',()=>assert.equal($('#fileField').style.display,'none'),'extend-ui');

// 16) Latest wrapper does not regress old problems
const visibleV5=v5.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
for(const old of ['Automatic','4.5','خادم API متصل']) excludes(visibleV5,old,`v5 no old UI regression: ${old}`,'regression');
check('v5 iframe has accessible title',()=>assert.match(v5,/iframe[^>]+title="Nova Studio"/),'regression');
check('v5 local extender button is visible control',()=>assert.match(v5,/button[^>]+id="openExtend"/),'regression');

console.log('\n================ NOVA FULL REGRESSION REPORT ================');
for(const [g,n] of groups) console.log(`${g}: ${n} passed`);
console.log(`TOTAL_ASSERTIONS_PASSED=${passed}`);
console.log('NOVA_STUDIO_FULL_REGRESSION_PASS');
