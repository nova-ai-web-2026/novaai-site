import fs from 'node:fs';

const file = 'nova-clean/index.html';
let html = fs.readFileSync(file, 'utf8');

const old = "function pickModels(list){ai.models=Array.isArray(list)?list:[];ai.opus=ai.models.find(m=>m.id==='anthropic/claude-opus-5')||ai.models.find(m=>/claude.*opus.*5|opus.*5/.test(modelBlob(m)))||null;ai.qwen=ai.models.find(m=>m.id==='qwen/qwen3.8-max')||ai.models.find(m=>/qwen.*3[.\\-_ ]?8.*max/.test(modelBlob(m)))||null;ai.scanned=true;renderModelMenu()}";

const strict = "function pickModels(list){ai.models=Array.isArray(list)?list:[];ai.opus=ai.models.find(m=>m.id==='anthropic/claude-opus-5')||null;ai.qwen=ai.models.find(m=>m.id==='qwen/qwen3.8-max')||null;ai.scanned=true;renderModelMenu()}";

if (!html.includes(old)) {
  throw new Error('Expected legacy Nova clean model matcher not found');
}

html = html.replace(old, strict);

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

fs.writeFileSync(file, html);
console.log('Nova clean: strict model routing enabled (Opus 5 exact ID -> Qwen3.8 Max exact ID)');
