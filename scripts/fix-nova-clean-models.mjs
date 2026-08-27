import fs from 'node:fs';

const file = 'nova-clean/index.html';
let html = fs.readFileSync(file, 'utf8');

const old = "function pickModels(list){ai.models=Array.isArray(list)?list:[];ai.opus=ai.models.find(m=>m.id==='anthropic/claude-opus-5')||ai.models.find(m=>/claude.*opus.*5|opus.*5/.test(modelBlob(m)))||null;ai.qwen=ai.models.find(m=>m.id==='qwen/qwen3.8-max')||ai.models.find(m=>/qwen.*3[.\\-_ ]?8.*max/.test(modelBlob(m)))||null;ai.scanned=true;renderModelMenu()}";
const strict = "function pickModels(list){ai.models=Array.isArray(list)?list:[];ai.opus=ai.models.find(m=>m.id==='anthropic/claude-opus-5')||null;ai.qwen=ai.models.find(m=>m.id==='qwen/qwen3.8-max')||null;ai.scanned=true;renderModelMenu()}";

if (!html.includes(old)) {
  throw new Error('Expected legacy Nova clean model matcher not found');
}
html = html.replace(old, strict);

// Start a fresh client-side state namespace so an old 4.5 selection/label
// cannot survive from previous builds and appear as the current Auto model.
if (!html.includes("const KEY='nova_clean_v1';")) {
  throw new Error('Expected Nova clean storage key not found');
}
html = html.replace("const KEY='nova_clean_v1';", "const KEY='nova_clean_v2';");

// Never claim Opus 5 unless Puter returned the exact documented model ID.
if (html.includes('/claude.*opus.*5|opus.*5/')) {
  throw new Error('Unsafe fuzzy Opus matcher still present');
}
if (!html.includes("m.id==='anthropic/claude-opus-5'")) {
  throw new Error('Exact Claude Opus 5 ID missing');
}
if (!html.includes("m.id==='qwen/qwen3.8-max'")) {
  throw new Error('Exact Qwen3.8 Max ID missing');
}
if (!html.includes("const KEY='nova_clean_v2';")) {
  throw new Error('Fresh model-state namespace missing');
}

fs.writeFileSync(file, html);
console.log('Nova clean: strict model routing + fresh v2 model state enabled');
