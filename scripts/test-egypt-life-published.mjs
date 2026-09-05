import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

const base=new URL(process.env.GAME_TEST_URL);
const expected=process.env.GAME_EXPECTED_COMMIT;
assert.match(expected||'',/^[0-9a-f]{40}$/);
const deadline=Date.now()+300000;
let manifest;
while(Date.now()<deadline){
  try{
    const response=await fetch(new URL(`build.json?verify=${expected}`,base),{signal:AbortSignal.timeout(15000),cache:'no-store'});
    if(response.ok){
      const candidate=await response.json();
      if(candidate.commit===expected){manifest=candidate;break;}
    }
  }catch(error){console.log('Waiting for the published revision:',error.message);}
  await delay(10000);
}
assert.ok(manifest,'The expected version did not become available on GitHub Pages');
assert.equal(manifest.version,'11.19.0');
assert.equal(manifest.audioRevision,'11.19.0');
assert.ok(Object.keys(manifest.files).length>=40,'Incomplete asset manifest');
for(const [file,hash] of Object.entries(manifest.files)){
  assert.ok(!file.startsWith('/')&&!file.split('/').includes('..'),'Unsafe asset path');
  const localHash=createHash('sha256').update(readFileSync(`egypt-life-sim-v2/${file}`)).digest('hex');
  assert.equal(hash,localHash,`Manifest differs from checked-out source: ${file}`);
  const response=await fetch(new URL(`${file}?verify=${expected}`,base),{signal:AbortSignal.timeout(20000),cache:'no-store'});
  assert.ok(response.ok,`HTTP ${response.status}: ${file}`);
  const actual=createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
  assert.equal(actual,hash,`Wrong published content: ${file}`);
}
console.log(`Published release ${manifest.version} verified: ${Object.keys(manifest.files).length} exact assets, commit ${expected}`);
