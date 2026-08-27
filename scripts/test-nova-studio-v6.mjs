import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const html=fs.readFileSync('nova-studio-v6/index.html','utf8');
let n=0;const pass=(name,fn)=>{fn();n++;console.log('PASS',name)};
pass('wraps v4',()=>assert.match(html,/nova-studio-v4\/\?from=v6/));
pass('4K resolution present',()=>assert.match(html,/3840×2160/));
pass('4K internal canvas resolution',()=>assert.match(html,/'4k':\[3840,2160\]/));
pass('2K fallback',()=>assert.match(html,/'1440':\[2560,1440\]/));
pass('1080 fallback',()=>assert.match(html,/'1080':\[1920,1080\]/));
for(const [sec,label] of [['600','10'],['900','15'],['1800','30'],['3600','60']]) pass(`${label} minute option`,()=>assert.match(html,new RegExp(`value="${sec}"`)));
pass('10 min is default',()=>assert.match(html,/value="600" selected/));
pass('60 FPS default',()=>assert.match(html,/value="60" selected>60 FPS/));
pass('50 Mbps default',()=>assert.match(html,/value="50000000" selected/));
pass('multiple video input',()=>assert.match(html,/accept="video\/\*" multiple/));
pass('canvas capture stream',()=>assert.match(html,/canvas\.captureStream\(fps\)/));
pass('MediaRecorder export',()=>assert.match(html,/new MediaRecorder\(canvasStream,opts\)/));
pass('audio context',()=>assert.match(html,/AudioContext\|\|window\.webkitAudioContext/));
pass('audio media element source',()=>assert.match(html,/createMediaElementSource\(v\)/));
pass('audio track merged',()=>assert.match(html,/getAudioTracks\(\)\.forEach\(t=>canvasStream\.addTrack\(t\)\)/));
pass('playlist cycling',()=>assert.match(html,/urls\[index%urls\.length\]/));
pass('automatic balance observer',()=>assert.match(html,/new MutationObserver\(inspect\)/));
pass('balance opens local mode',()=>assert.match(html,/open\('balance'\)/));
pass('old cloud block text not visible',()=>{const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');assert.ok(!visible.includes('Nova منع الطلب'))});
pass('no legacy api endpoint',()=>assert.ok(!html.includes('/api/chat')));
pass('explicit no-new-AI clarification',()=>assert.match(html,/لا يتم إنشاء مشاهد AI جديدة بدون رصيد سحابي/));

const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)?.[1];
pass('inline script exists',()=>assert.ok(script));
pass('JavaScript compiles',()=>new vm.Script(script));

function boot(support=t=>t.startsWith('video/mp4')){
 const dom=new JSDOM(html,{url:'https://nova.test/v6/',runScripts:'outside-only',pretendToBeVisual:true});
 const {window}=dom;
 class MR{static isTypeSupported(t){return support(t)} constructor(){this.mimeType='video/mp4'}}
 window.MediaRecorder=MR;
 window.HTMLCanvasElement.prototype.getContext=()=>({fillStyle:'',fillRect(){},drawImage(){}});
 window.HTMLCanvasElement.prototype.captureStream=()=>({addTrack(){}});
 window.eval(script);
 return window;
}
const w=boot();const api=w.__novaLongVideoTest;
pass('test API exposed',()=>assert.ok(api));
pass('4K API mapping',()=>assert.deepEqual([...api.RES['4k']],[3840,2160]));
pass('MP4 preferred',()=>assert.match(api.bestMime(),/^video\/mp4/));
pass('MP4 extension',()=>assert.equal(api.ext('video/mp4'),'mp4'));
pass('WebM extension',()=>assert.equal(api.ext('video/webm'),'webm'));
api.open('balance');
pass('balance opens modal',()=>assert.ok(w.document.querySelector('#shade').classList.contains('open')));
pass('balance banner visible',()=>assert.ok(w.document.querySelector('#balanceBanner').classList.contains('show')));
pass('balance local status shown',()=>assert.match(w.document.querySelector('#status').textContent,/محليًا|محلي/));
const w2=boot(t=>t.startsWith('video/webm;codecs=vp9'));
pass('WebM fallback',()=>assert.match(w2.__novaLongVideoTest.bestMime(),/^video\/webm/));
const w3=boot(()=>false);
pass('empty MIME when unsupported',()=>assert.equal(w3.__novaLongVideoTest.bestMime(),''));

console.log(`NOVA_V6_LONG_VIDEO_ASSERTIONS=${n}`);
console.log('NOVA_STUDIO_V6_LONG_VIDEO_PASS');
