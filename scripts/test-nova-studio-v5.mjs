import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html=fs.readFileSync('nova-studio-v5/index.html','utf8');
assert.match(html,/Nova Local Extend/);
assert.match(html,/16 ثانية/);
assert.match(html,/24 ثانية/);
assert.match(html,/32 ثانية/);
assert.match(html,/60 ثانية/);
assert.match(html,/captureStream/);
assert.match(html,/MediaRecorder/);
assert.match(html,/بدون رصيد إضافي/);

const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)?.[1];
assert.ok(script,'inline JS missing');
new vm.Script(script); // syntax check

const body={appendChild(){}};
const noop=()=>{};
const nodes=new Map();
function node(id=''){return {id,classList:{add:noop,remove:noop,toggle:noop},style:{},textContent:'',value:'16',files:[],addEventListener:noop,querySelector:()=>null,play:async()=>{},pause:noop,load:noop,readyState:1,duration:8,captureStream:()=>({getTracks:()=>[]})}}
for(const id of ['status','target','sourceMode','file','app','extend','result','preview','download','shade','openExtend','closeExtend','cancel','fileField']) nodes.set(id,node(id));
nodes.get('sourceMode').value='file';
nodes.get('file').files=[{name:'x.mp4'}];
const document={querySelector:(s)=>nodes.get(s.replace('#',''))||node(),createElement:(tag)=>node(tag),body};
class MR {static isTypeSupported(t){return t.startsWith('video/mp4')||t.startsWith('video/webm')} constructor(stream,o={}){this.stream=stream;this.mimeType=o.mimeType||'video/webm'} start(){} stop(){this.ondataavailable?.({data:new Blob(['x'],{type:this.mimeType})});this.onstop?.()} }
const context={window:{MediaRecorder:MR},MediaRecorder:MR,document,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:noop},Blob,performance:{now:()=>0},requestAnimationFrame:noop,setTimeout,console};
context.window.window=context.window;context.window.document=document;context.window.URL=context.URL;context.window.Blob=Blob;context.window.performance=context.performance;context.window.requestAnimationFrame=noop;context.window.MediaRecorder=MR;
vm.runInNewContext(script,context);
const api=context.window.__novaLocalExtendTest;
assert.ok(api,'test API missing');
assert.equal(api.bestMime(),'video/mp4;codecs=avc1.42E01E,mp4a.40.2');
assert.equal(api.extFor('video/mp4'),'mp4');
assert.equal(api.extFor('video/webm'),'webm');
assert.ok(api.capture({captureStream:()=>({ok:true})}).ok);
console.log('NOVA_V5_LOCAL_EXTEND_PASS');
