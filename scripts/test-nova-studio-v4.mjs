import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('nova-studio-v4/index.html','utf8');
const must = [
  "const INTERNAL={nova4:'anthropic/claude-opus-5',nova36:'qwen/qwen3.8-max'}",
  "veo-3.1-generate-preview",
  "3840x2160",
  "seconds:8",
  "puter.auth.getMonthlyUsage()",
  "if(q!=='preview'&&noBalance())",
  "puter.ai.txt2vid(p,true)",
  "Preview مجاني · عينة فقط",
  "Nova 4.0",
  "Nova 3.6",
  "reasoning_effort:state.think"
];
for (const s of must) if (!html.includes(s)) throw new Error('Missing: '+s);

// Internal provider names must not appear in visible HTML outside the script.
const bodyBeforeScript = html.split('<script>\n(()=>')[0];
for (const forbidden of ['Claude Opus','Qwen3.8','anthropic/','qwen/qwen']) {
  if (bodyBeforeScript.includes(forbidden)) throw new Error('Internal engine leaked into visible UI: '+forbidden);
}

const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.includes("'use strict'"));
if(scripts.length!==1) throw new Error('Expected one app script');
new vm.Script(scripts[0]);

console.log('NOVA_STUDIO_V4_TEST_PASS');
console.log('Ultra video: Veo 3.1 / 4K / 8s');
console.log('Balance preflight: enabled');
console.log('Free preview: explicit sample mode');
console.log('Internal engine names: hidden from visible UI');
