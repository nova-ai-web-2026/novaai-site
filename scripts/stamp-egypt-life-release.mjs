import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root='egypt-life-sim-v2';
const commit=process.env.GITHUB_SHA;
assert.match(commit||'',/^[0-9a-f]{40}$/,'A complete source commit is required');
const release=JSON.parse(readFileSync(path.join(root,'release.json'),'utf8'));
const files={};
function scan(directory){
  for(const entry of readdirSync(directory,{withFileTypes:true})){
    if(entry.name.startsWith('.')||entry.name==='build.json')continue;
    const file=path.join(directory,entry.name);
    if(entry.isDirectory())scan(file);
    else if(entry.isFile())files[path.relative(root,file).split(path.sep).join('/')]=createHash('sha256').update(readFileSync(file)).digest('hex');
  }
}
scan(root);
writeFileSync(path.join(root,'build.json'),JSON.stringify({...release,commit,files},null,2)+'\n');
console.log(`Release ${release.version}: ${Object.keys(files).length} assets from ${commit}`);
