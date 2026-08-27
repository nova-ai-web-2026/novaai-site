import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const html=fs.readFileSync('nova-studio-v7/index.html','utf8');
let n=0;const pass=(name,fn)=>{fn();n++;console.log('PASS',name)};
pass('wraps v6',()=>assert.match(html,/nova-studio-v6\/\?from=v7/));
pass('no-spend visible',()=>assert.match(html,/No‑Spend Video/));
pass('local 4K visible',()=>assert.match(html,/Local 4K/));
pass('paid guard exists',()=>assert.match(html,/blocked paid video before cloud request/));
pass('preview bypass exists',()=>assert.match(html,/if\(isPreviewCall\(args\)\)/));
pass('opens local long video',()=>assert.match(html,/__novaLongVideoTest\?\.open\?\.\('balance'\)/));
pass('no direct txt2vid cloud call in v7',()=>assert.ok(!/puter\.ai\.txt2vid\s*\(/.test(html)));
const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)?.[1];
pass('script exists',()=>assert.ok(script));
pass('script compiles',()=>new vm.Script(script));

const dom=new JSDOM(html,{url:'https://nova.test/v7/',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;window.eval(script);const api=window.__novaV7Test;
pass('test API exposed',()=>assert.ok(api));
pass('boolean preview detected',()=>assert.equal(api.isPreviewCall(['x',true]),true));
pass('object preview detected',()=>assert.equal(api.isPreviewCall(['x',{test_mode:true}]),true));
pass('paid object detected as paid',()=>assert.equal(api.isPreviewCall(['x',{model:'x'}]),false));
let realCalls=0;const fake={puter:{ai:{txt2vid:async()=>{realCalls++;return 'ok'}}}};
pass('patch installs',()=>assert.equal(api.installOnWindow(fake,null),true));
let paidRejected=false;try{await fake.puter.ai.txt2vid('prompt',{model:'paid'})}catch{paidRejected=true}
pass('paid request rejected locally',()=>assert.equal(paidRejected,true));
pass('paid request never reaches original',()=>assert.equal(realCalls,0));
const preview=await fake.puter.ai.txt2vid('prompt',true);
pass('preview reaches original',()=>assert.equal(preview,'ok'));
pass('preview original call count',()=>assert.equal(realCalls,1));
pass('double patch prevented',()=>assert.equal(api.installOnWindow(fake,null),false));
window.close();
console.log(`NOVA_V7_NO_SPEND_ASSERTIONS=${n}`);
console.log('NOVA_STUDIO_V7_NO_SPEND_PASS');