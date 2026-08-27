import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const file='nova-studio-v3/index.html';
const html=fs.readFileSync(file,'utf8');
const fail=(m)=>{throw new Error(m)};

// Visible UI must expose only Nova branding, while internal model IDs remain in JS.
const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').toLowerCase();
for(const forbidden of ['claude','qwen','opus','anthropic/','qwen/']){
  if(visible.includes(forbidden)) fail(`Internal engine name leaked into visible UI: ${forbidden}`);
}
for(const required of ['Nova 4.0','Nova 3.6','تفكير عميق','أقصى تفكير','Nova Image','Nova Video','Nova Game Builder']){
  if(!html.includes(required)) fail(`Missing UI feature: ${required}`);
}
if(!html.includes("anthropic/claude-opus-5")) fail('Nova 4.0 internal engine ID missing');
if(!html.includes("qwen/qwen3.8-max")) fail('Nova 3.6 internal engine ID missing');
if(!html.includes('puter.ai.txt2vid')) fail('Real video API missing');
if(!html.includes('puter_output_path')) fail('Media file persistence missing');
if(!html.includes('isVideoRequest')) fail('Chat-to-video intent routing missing');
if(!html.includes('isImageRequest')) fail('Chat-to-image intent routing missing');
if(!html.includes('isGameRequest')) fail('Chat-to-game intent routing missing');

const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
if(!scripts.length) fail('Inline app script missing');
const appScript=scripts.at(-1);
new Function(appScript); // syntax compile check

const dom=new JSDOM(html.replace(/<script src="https:\/\/js\.puter\.com\/v2\/"><\/script>/,''),{
  url:'https://nova.test/',runScripts:'outside-only',pretendToBeVisual:true
});
const {window}=dom;
const calls={chat:[],video:[],image:[],signIn:0};
window.puter={
  auth:{isSignedIn:()=>true,signIn:async()=>{calls.signIn++;return{};}},
  ai:{
    chat:async(messages,opts)=>{calls.chat.push({messages,opts});const sys=Array.isArray(messages)?String(messages[0]?.content||''):'';if(sys.includes('Nova Game Builder'))return {message:{content:'<!doctype html><html><body><button id="play">Play</button><script>document.getElementById("play").onclick=()=>{}<\/script></body></html>'}};return {message:{content:'Nova test reply'}};},
    txt2vid:async(prompt,opts)=>{calls.video.push({prompt,opts});const v=window.document.createElement('video');v.src='data:video/mp4;base64,AAAA';return v;},
    txt2img:async(prompt,opts)=>{calls.image.push({prompt,opts});const i=window.document.createElement('img');i.src='data:image/png;base64,AAAA';return i;}
  }
};
window.eval(appScript);
const $=s=>window.document.querySelector(s);
const wait=(ms=20)=>new Promise(r=>setTimeout(r,ms));

if($('#modelLabel').textContent.trim()!=='Nova 4.0') fail('Nova 4.0 is not default');
if($('#thinkLabel').textContent.trim()!=='تفكير عميق') fail('Deep thinking is not default');

// Model + reasoning control test.
$('[data-model="nova36"]').click();
$('[data-think="xhigh"]').click();
$('#prompt').value='مرحبا';
$('#send').click();
await wait();
const normalCall=calls.chat.at(-1);
if(normalCall.opts.model!=='qwen/qwen3.8-max') fail('Nova 3.6 did not route to its internal engine');
if(normalCall.opts.reasoning_effort!=='xhigh') fail('Maximum thinking was not passed to the chat API');

// Explicit video request from chat must generate a real video, not a text disclaimer.
$('#prompt').value='اعمل لي فيديو لمدينة مستقبلية وقت الليل';
$('#vidTest').value='false';
$('#send').click();
await wait();
if(calls.video.length!==1) fail('Chat video request did not call txt2vid');
const vc=calls.video[0];
if(typeof vc.opts!=='object'||vc.opts.model!=='sora-2') fail('Real video options were not passed');
if(!String(vc.opts.puter_output_path||'').endsWith('.mp4')) fail('Video output path is not an MP4 file');
if(!$('#panel-video').classList.contains('active')) fail('Chat video request did not open Nova Video');
if(!$('#vidOut video')) fail('Generated video element not rendered');
if(![...$('#vidOut').querySelectorAll('a')].some(a=>a.textContent.includes('MP4'))) fail('MP4 save action missing');

// Image generation test.
$('#imgPrompt').value='صورة مدينة مستقبلية';
$('#genImage').click();
await wait();
if(calls.image.length!==1) fail('Image generator did not call txt2img');
if(!String(calls.image[0].opts.puter_output_path||'').endsWith('.png')) fail('Image output path is not PNG');
if(!$('#imgOut img')) fail('Generated image not rendered');

// Game builder test.
$('#gamePrompt').value='لعبة منصات بسيطة';
$('#buildGame').click();
await wait();
if(!$('#gameCode').value.includes('<html')) fail('Game Builder did not produce HTML');
if(!$('#gamePreview').srcdoc.includes('<html')) fail('Game preview did not run generated HTML');

console.log('Nova Studio v3 integration tests: PASS');
console.log(JSON.stringify({chatCalls:calls.chat.length,videoCalls:calls.video.length,imageCalls:calls.image.length,defaultModel:'Nova 4.0',maxThinking:'xhigh'}));
