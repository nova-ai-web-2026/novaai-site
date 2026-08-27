import fs from 'node:fs';

const file = 'nova-studio/index.html';
const html = fs.readFileSync(file, 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(html.includes("nova4:{label:'Nova 4.0',engine:'Claude Opus 5',id:'anthropic/claude-opus-5'}"), 'Nova 4.0 mapping is missing or changed');
assert(html.includes("nova36:{label:'Nova 3.6',engine:'Qwen3.8 Max',id:'qwen/qwen3.8-max'}"), 'Nova 3.6 mapping is missing or changed');
assert(html.includes("let state={model:'nova4',think:'high',messages:[]}"), 'Nova 4.0 / High is not the default');
assert(html.includes('reasoning_effort:state.think'), 'Reasoning level is not passed to chat');
assert(html.includes("minimal:{label:'سريع'"), 'Minimal reasoning option missing');
assert(html.includes("medium:{label:'متوازن'"), 'Medium reasoning option missing');
assert(html.includes("high:{label:'تفكير عميق'"), 'High reasoning option missing');
assert(html.includes("xhigh:{label:'أقصى تفكير'"), 'XHigh reasoning option missing');
assert(html.includes('puter.ai.txt2img'), 'Image generation is not wired');
assert(html.includes("model:'gpt-image-2'"), 'GPT Image 2 is not configured');
assert(html.includes('puter.ai.txt2vid'), 'Video generation is not wired');
assert(html.includes('sora-2-pro'), 'Sora 2 Pro option missing');
assert(html.includes('Nova Game Builder'), 'Game Builder UI missing');
assert(html.includes('self-contained HTML file'), 'Game Builder system prompt missing self-contained output requirement');
assert(html.includes('sandbox="allow-scripts"'), 'Game preview sandbox missing');
assert(!html.includes('/api/chat'), 'Legacy /api/chat dependency must not return');
assert(!html.includes('serviceWorker.register'), 'Nova Studio should not register a legacy service worker');

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(m => m[1])
  .filter(Boolean);
assert(inlineScripts.length >= 1, 'No inline application script found');
for (const [index, js] of inlineScripts.entries()) {
  try {
    new Function(js);
  } catch (error) {
    throw new Error(`Inline JavaScript ${index + 1} failed syntax check: ${error.message}`);
  }
}

console.log('NOVA_STUDIO_SMOKE_TEST_PASS');
console.log('model_default=Nova 4.0');
console.log('reasoning_default=high');
console.log('features=chat,image,video,game-builder');
