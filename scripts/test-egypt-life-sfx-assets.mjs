import assert from 'node:assert/strict';
import fs from 'node:fs';

for (const name of ['step_pavement','step_asphalt','interact','buy_coin','door','reward','deny']) {
  const bytes=fs.readFileSync(new URL('../egypt-life-sim-v2/audio/v11-8/'+name+'.wav',import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'RIFF',name);
  assert.equal(bytes.readUInt32LE(4)+8,bytes.length,name+' truncated RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WAVE',name);
  let format=null,data=null;
  for(let offset=12;offset+8<=bytes.length;){
    const size=bytes.readUInt32LE(offset+4),start=offset+8;
    assert.ok(start+size<=bytes.length,name+' truncated chunk');
    const id=bytes.toString('ascii',offset,offset+4);
    if(id==='fmt ')format=bytes.subarray(start,start+size);
    if(id==='data')data=bytes.subarray(start,start+size);
    offset=start+size+(size%2);
  }
  assert.ok(format&&data,name+' missing PCM data');
  assert.equal(format.readUInt16LE(0),1,name+' PCM');
  assert.equal(format.readUInt16LE(2),1,name+' mono');
  assert.equal(format.readUInt16LE(14),16,name+' 16-bit');
  assert.equal(data.length%2,0,name+' partial sample');
  let power=0,peak=0;
  for(let i=0;i<data.length;i+=2){const value=data.readInt16LE(i)/32768;power+=value*value;peak=Math.max(peak,Math.abs(value));}
  const rms=Math.sqrt(power/(data.length/2)),seconds=data.length/2/format.readUInt32LE(4);
  assert.ok(seconds>.04&&seconds<4,name+' duration');
  assert.ok(rms>.003&&peak<.99,name+' silent or clipped signal');
  console.log(name,{seconds:+seconds.toFixed(3),rms:+rms.toFixed(4),peak:+peak.toFixed(3)});
}
