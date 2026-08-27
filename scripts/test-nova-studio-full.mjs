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

// 6) Chat / intent routing
includes(v4,'puter.ai.chat','real chat API call','chat');
for (const route of ['isVideoRequest','isImageRequest','isGameRequest']) includes(v4,route,`${route} routing`,'chat');
excludes(v4,'/api/chat','no legacy chat server endpoint','chat');
excludes(v4,'المحادثة الذكية محتاجة خادم API','no legacy API-server warning','chat');
includes(v4,'state.messages','chat state/history','chat');
includes(v4,'محادثة جديدة','new-chat UI copy','chat');

// 7) Image generation
includes(v4,'Nova Image','image studio visible','images');
includes(v4,'id="imgPrompt"','image prompt','images');
includes(v4,'id="imgRatio"','image ratio control','images');
includes(v4,'id="imgQuality"','image quality control','images');
includes(v4,'puter.ai.txt2img','real image generation API','images');
includes(v4,'puter_output_path','media persistence option','images');
for(const ratio of ['1:1','16:9','9:16']) includes(v4,`value="${ratio}"`, `image ratio ${ratio}`,'images');
includes(v4,'id="imgOut"','image output region','images');

// 8) Video generation and quality
includes(v4,'Nova Video','video studio visible','video');
includes(v4,'puter.ai.txt2vid','real video generation API','video');
includes(v4,'veo-3.1-generate-preview','ultra video model configured','video');
includes(v4,'3840x2160','4K video resolution','video');
includes(v4,'seconds:8','8 second cloud generation setting','video');
includes(v4,'Preview مجاني · عينة فقط','free preview explicitly marked sample','video');
includes(v4,'puter.ai.txt2vid(p,true)','free sample test-mode route','video');
includes(v4,'id="vidOut"','video output region','video');
includes(v4,'.mp4','MP4 media path/label','video');

// 9) Game builder
includes(v4,'صانع الألعاب','game builder navigation','games');
includes(v4,'id="gamePrompt"','game prompt','games');
includes(v4,'id="gameCode"','game code editor','games');
includes(v4,'id="gamePreview"','game live preview','games');
includes(v4,'id="buildGame"','build game action','games');
includes(v4,'srcdoc','sandboxed document preview mechanism','games');

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

// 12) v5 Local Extend shell
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

// 13) v5 JS compile + dynamic test hooks
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

// 14) v5 modal/UI behavior
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

// 15) Latest wrapper does not regress old problems
const visibleV5=v5.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
for(const old of ['Automatic','4.5','خادم API متصل']) excludes(visibleV5,old,`v5 no old UI regression: ${old}`,'regression');
check('v5 iframe has accessible title',()=>assert.match(v5,/iframe[^>]+title="Nova Studio"/),'regression');
check('v5 local extender button is visible control',()=>assert.match(v5,/button[^>]+id="openExtend"/),'regression');

console.log('\n================ NOVA FULL REGRESSION REPORT ================');
for(const [g,n] of groups) console.log(`${g}: ${n} passed`);
console.log(`TOTAL_ASSERTIONS_PASSED=${passed}`);
console.log('NOVA_STUDIO_FULL_REGRESSION_PASS');
