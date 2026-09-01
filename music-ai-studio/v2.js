(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const modelCfg={
  '1.0':{structure:84,expression:76,detail:74,stereo:70,polish:78,hatStep:.5,leadDensity:.52,extra:false},
  '1.5':{structure:91,expression:92,detail:88,stereo:86,polish:88,hatStep:.5,leadDensity:.70,extra:true},
  '1.5+':{structure:97,expression:97,detail:97,stereo:96,polish:97,hatStep:.25,leadDensity:.88,extra:true}
};
const styles={
  'Pop':{base:48,scale:[0,2,4,5,7,9,11],prog:[0,5,3,4],mode:'major',kick:[0,2,3.5],snare:[1,3],hat:.5},
  'Arabic Trap':{base:45,scale:[0,2,3,5,7,8,11],prog:[0,5,7,3],mode:'minor',kick:[0,1.75,2.75,3.5],snare:[1,3],hat:.25},
  'Hip-Hop':{base:43,scale:[0,3,5,7,10],prog:[0,3,7,5],mode:'minor',kick:[0,1.5,2.5,3.25],snare:[1,3],hat:.5},
  'R&B':{base:46,scale:[0,2,3,5,7,9,10],prog:[0,5,3,7],mode:'minor',kick:[0,2.5],snare:[1,3],hat:.5},
  'EDM':{base:45,scale:[0,2,3,5,7,8,10],prog:[0,5,3,7],mode:'minor',kick:[0,1,2,3],snare:[1,3],hat:.5},
  'Cinematic':{base:41,scale:[0,2,3,5,7,8,10],prog:[0,3,5,7],mode:'minor',kick:[0,2],snare:[1,3],hat:1}
};
const presets=[
  {prompt:'Nocturnal Arabic trap with oud-like plucks, huge sub bass, tight drums and a dramatic hook',style:'Arabic Trap',bpm:96,energy:78},
  {prompt:'Glossy future pop with warm synth chords, punchy drums and an emotional chorus',style:'Pop',bpm:118,energy:74},
  {prompt:'Dark cinematic score with pulsing bass, wide strings and a massive final lift',style:'Cinematic',bpm:84,energy:68},
  {prompt:'Late-night R&B with silky chords, deep bass and a smooth vocal-shaped lead',style:'R&B',bpm:92,energy:60},
  {prompt:'Festival EDM with bright supersaw chords, four-on-the-floor kick and a huge drop',style:'EDM',bpm:128,energy:90}
];
const state={model:'1.0',blob:null,url:null,voice:null,voiceFile:null,voiceDuration:0,mediaRecorder:null,recorded:[],recordTimer:null,recordStart:0};
try{state.voice=JSON.parse(localStorage.getItem('novaVoiceV2')||'null')}catch(e){}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const midi=m=>440*Math.pow(2,(m-69)/12);
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let x=seed||123456789;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%1000000)/1000000}}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1900)}
function chooseModel(m){state.model=m;$$('.model').forEach(x=>x.classList.toggle('active',x.dataset.model===m));$('#modelBadge').textContent='Nova '+m;renderMatrix()}
$$('.model').forEach(x=>x.addEventListener('click',()=>chooseModel(x.dataset.model)));
function renderMatrix(){const c=modelCfg[state.model];for(const [id,val] of [['mx1',c.structure],['mx2',c.expression],['mx3',c.detail],['mx4',c.stereo],['mx5',c.polish]]){const el=$('#'+id);el.querySelector('i').style.width=val+'%';el.querySelector('b').textContent=val}}
renderMatrix();
$('#energy').addEventListener('input',e=>$('#energyV').textContent=e.target.value+'%');
$('#bpm').addEventListener('input',e=>$('#bpmV').textContent=e.target.value);
$('#style').addEventListener('change',e=>{const defaults={'Pop':118,'Arabic Trap':96,'Hip-Hop':88,'R&B':92,'EDM':128,'Cinematic':84};$('#bpm').value=defaults[e.target.value];$('#bpmV').textContent=$('#bpm').value});
$('#surprise').addEventListener('click',()=>{const p=presets[Math.floor(Math.random()*presets.length)];$('#prompt').value=p.prompt;$('#style').value=p.style;$('#bpm').value=p.bpm;$('#bpmV').textContent=p.bpm;$('#energy').value=p.energy;$('#energyV').textContent=p.energy+'%';toast('New idea loaded')});
$('#copyPrompt').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#prompt').value);toast('Prompt copied')}catch{toast('Copy unavailable')}});
function sectionAt(bar,bars){const x=bar/Math.max(1,bars-1);if(x<.14)return'intro';if(x<.48)return'verse';if(x<.68)return'build';return'drop'}
function sectionGain(sec){return sec==='intro'?.58:sec==='verse'?.78:sec==='build'?.9:1}
function panGains(p){p=clamp(p,-1,1);return[Math.sqrt((1-p)/2),Math.sqrt((1+p)/2)]}
function renderSong({model,bpm,energy,duration,style,prompt}){
  const sr=32000,N=Math.floor(sr*duration),L=new Float32Array(N),R=new Float32Array(N),cfg=modelCfg[model],sty=styles[style]||styles.Pop,rand=rng(hash(prompt+'|'+style+'|'+model+'|'+bpm)),beat=60/bpm,barLen=beat*4,bars=Math.ceil(duration/barLen),eng=energy/100;
  const add=(start,len,fn,amp=1,pan=0)=>{const s=Math.max(0,Math.floor(start*sr)),e=Math.min(N,s+Math.floor(len*sr)),[gl,gr]=panGains(pan);for(let i=s;i<e;i++){const t=(i-s)/sr,v=fn(t,i)*amp;L[i]+=v*gl;R[i]+=v*gr}};
  const noise=i=>{const x=Math.sin((i+1)*12.9898+78.233)*43758.5453;return((x-Math.floor(x))*2-1)};
  function kick(t,a=1){add(t,.46,(x)=>{const f=47+92*Math.exp(-x*24),env=Math.exp(-x*13);return Math.sin(2*Math.PI*f*x)*env},.72*a*eng,0)}
  function snare(t,a=1){add(t,.32,(x,i)=>{const env=Math.exp(-x*16),n=noise(i),tone=Math.sin(2*Math.PI*185*x)*Math.exp(-x*20);return n*.82*env+tone*.25},.27*a*eng,(rand()-.5)*.12)}
  function hat(t,a=.65,open=false){add(t,open?.18:.075,(x,i)=>{const env=Math.exp(-x*(open?18:55)),n=noise(i)-.65*noise(i-2);return n*env},.11*a*(.65+.35*eng),(rand()-.5)*.65)}
  function bass(t,d,n,a=1){const f=midi(n),phase=rand()*6.28;add(t,d,(x)=>{const atk=Math.min(1,x/.018),rel=Math.min(1,(d-x)/.08),env=Math.max(0,atk*rel),sub=Math.sin(2*Math.PI*f*x+phase),h2=Math.sin(2*Math.PI*f*2*x+phase*.7)*.18;return Math.tanh((sub+h2)*1.35)*env},.29*a*eng,0)}
  function chord(t,d,root,a=1){const ints=sty.mode==='major'?[0,4,7,11]:[0,3,7,10],voices=model==='1.0'?3:4;for(let v=0;v<voices;v++){const n=root+ints[v],f=midi(n),p=(v-(voices-1)/2)*(.22+(cfg.stereo-70)/180),det=(rand()-.5)*(model==='1.5+'?.012:.006);add(t,d,(x)=>{const atk=Math.min(1,x/.11),rel=Math.min(1,(d-x)/.23),env=Math.max(0,atk*rel),w=.66*Math.sin(2*Math.PI*f*(1+det)*x)+.22*Math.sin(2*Math.PI*f*2*x)+.12*Math.sin(2*Math.PI*f*.5*x);return w*env},.082*a*(.7+.3*eng),p)}}
  function pluck(t,d,n,a=1,pan=0){const f=midi(n),bright=.14+(cfg.detail/100)*.12;add(t,d,(x)=>{const env=Math.exp(-x*(3.4-(cfg.expression-70)/80)),vib=1+Math.sin(2*Math.PI*5.1*x)*(.001+(cfg.expression/100)*.0012),fund=Math.sin(2*Math.PI*f*vib*x),harm=Math.sin(2*Math.PI*f*2.01*x)*bright+Math.sin(2*Math.PI*f*3*x)*bright*.38;return(fund+harm)*env},.17*a*eng,pan)}
  function pad(t,d,root,a=1){if(model!=='1.5+')return;for(const off of [0,7,12]){const f=midi(root+off),pan=(off-6)/22;add(t,d,(x)=>{const env=Math.sin(Math.PI*clamp(x/d,0,1));return(Math.sin(2*Math.PI*f*x)+.4*Math.sin(2*Math.PI*f*1.005*x))*env},.026*a,pan)}}
  for(let b=0;b<bars;b++){
    const barStart=b*barLen;if(barStart>=duration)break;const sec=sectionAt(b,bars),sg=sectionGain(sec),prog=sty.prog[b%sty.prog.length],root=sty.base+prog;
    chord(barStart,Math.min(barLen,duration-barStart),root+12,sg);pad(barStart,Math.min(barLen,duration-barStart),root+12,sg);
    if(sec!=='intro'||b>0){
      for(const k of sty.kick){const tt=barStart+k*beat;if(tt<duration)kick(tt,sg*(sec==='drop'?1.1:1))}
      for(const s of sty.snare){const tt=barStart+s*beat;if(tt<duration)snare(tt,sg)}
      const step=Math.min(sty.hat,cfg.hatStep);for(let x=0;x<4;x+=step){const tt=barStart+x*beat;if(tt<duration)hat(tt,sg*(x%1===0?.95:.62),sec==='build'&&x>3)}
    }
    const bassPattern=style==='EDM'?[0,1,2,3]:style==='Arabic Trap'?[0,1.5,2.75,3.5]:style==='R&B'?[0,.75,2.5,3.25]:[0,2,3.25];
    for(let q=0;q<bassPattern.length;q++){const pos=bassPattern[q],tt=barStart+pos*beat;if(tt>=duration)continue;const note=root+(q%3===2?7:0);bass(tt,beat*(style==='EDM'?.72:.9),note,sg)}
    if(sec!=='intro'){
      const steps=model==='1.0'?8:model==='1.5'?12:16;for(let s=0;s<steps;s++){if(rand()>cfg.leadDensity*sg)continue;const pos=(s/steps)*4,tt=barStart+pos*beat;if(tt>=duration)continue;const idx=Math.floor(rand()*sty.scale.length),oct=rand()>.76?12:0,n=root+12+sty.scale[idx]+oct,accent=(s%4===0?1.12:.82)*(sec==='drop'?1.08:1),p=(rand()-.5)*(cfg.stereo/110);pluck(tt,beat*(model==='1.5+'?.62:.48),n,accent,p)}
    }
    if(cfg.extra&&sec==='drop'&&b%2===1){for(const x of [3,3.25,3.5,3.75]){const tt=barStart+x*beat;if(tt<duration)hat(tt,1.05,false)}}
    if(model==='1.5+'&&sec==='drop'){const n=root+19;pluck(barStart+1.5*beat,beat*.8,n,.65,.58);pluck(barStart+3.5*beat,beat*.45,n-2,.48,-.52)}
  }
  const fade=Math.min(sr*.06,N/4);let peak=.001;for(let i=0;i<N;i++){const edge=Math.min(1,i/fade,(N-1-i)/fade),mono=(L[i]+R[i])*.5,duck=1-.09*Math.max(0,mono),l=Math.tanh(L[i]*duck*1.35)*edge,r=Math.tanh(R[i]*duck*1.35)*edge;L[i]=l;R[i]=r;peak=Math.max(peak,Math.abs(l),Math.abs(r))}
  const target=model==='1.0'?.84:model==='1.5'?.9:.94,gain=Math.min(1.5,target/peak);for(let i=0;i<N;i++){L[i]=clamp(L[i]*gain,-.985,.985);R[i]=clamp(R[i]*gain,-.985,.985)}
  return encodeWav(L,R,sr);
}
function encodeWav(L,R,sr){const N=L.length,buf=new ArrayBuffer(44+N*4),v=new DataView(buf),write=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));write(0,'RIFF');v.setUint32(4,36+N*4,true);write(8,'WAVE');write(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,sr,true);v.setUint32(28,sr*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);write(36,'data');v.setUint32(40,N*4,true);for(let i=0,o=44;i<N;i++,o+=4){v.setInt16(o,L[i]*32767,true);v.setInt16(o+2,R[i]*32767,true)}return new Blob([buf],{type:'audio/wav'})}
async function generate(){const prompt=$('#prompt').value.trim();if(!prompt){$('#status').textContent='Add a song idea first.';$('#status').className='inlineStatus bad';return}const btn=$('#generate');btn.disabled=true;$('#status').className='inlineStatus';$('#status').textContent='Arranging…';$('#render').classList.add('show');$('#renderProgress').style.width='8%';const stages=['Composition','Drums + bass','Harmony','Lead + detail','Master'];$$('.renderStages span').forEach((x,i)=>x.classList.toggle('on',i===0));for(let s=0;s<4;s++){await new Promise(r=>setTimeout(r,85));$('#renderProgress').style.width=(18+s*17)+'%';$$('.renderStages span').forEach((x,i)=>x.classList.toggle('on',i<=s))}try{await new Promise(r=>setTimeout(r,0));const blob=renderSong({model:state.model,bpm:Number($('#bpm').value),energy:Number($('#energy').value),duration:Number($('#length').value),style:$('#style').value,prompt});if(state.url)URL.revokeObjectURL(state.url);state.blob=blob;state.url=URL.createObjectURL(blob);$('#player').src=state.url;$('#download').disabled=false;$('#renderProgress').style.width='100%';$$('.renderStages span').forEach(x=>x.classList.add('on'));const c=modelCfg[state.model];$('#trackTitle').textContent='Nova '+state.model+' · '+$('#style').value;$('#trackInfo').textContent=$('#bpm').value+' BPM · '+$('#length').value+' sec · '+(state.voice?'Voice Signature enabled':'instrumental synth lead');[['m1',c.structure],['m2',c.expression],['m3',c.detail],['m4',c.stereo],['m5',c.polish]].forEach(([id,v])=>$('#'+id).textContent=v+'%');$('#status').textContent='Track ready.';$('#status').className='inlineStatus ok';toast('Track rendered')}catch(err){console.error(err);$('#status').textContent='Render failed: '+err.message;$('#status').className='inlineStatus bad'}finally{btn.disabled=false}}
$('#generate').addEventListener('click',generate);
$('#download').addEventListener('click',()=>{if(!state.blob)return;const a=document.createElement('a');a.href=state.url;a.download='nova-'+state.model+'-'+$('#style').value.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.wav';a.click();toast('WAV download started')});
function updateVoiceUI(){if(state.voice){$('#voiceDot').className='voiceDot ok';$('#voiceTitle').textContent='Voice Signature ready';$('#voiceInfo').textContent='Brightness '+state.voice.brightness+'% · Dynamics '+state.voice.dynamics+'%'}else{$('#voiceDot').className='voiceDot';$('#voiceTitle').textContent='No voice profile';$('#voiceInfo').textContent='Upload or record 110–130 seconds.'}}
updateVoiceUI();
const tabs=$$('.tab');tabs.forEach(t=>t.addEventListener('click',()=>{tabs.forEach(x=>x.classList.toggle('active',x===t));$('#uploadPane').hidden=t.dataset.tab!=='upload';$('#recordPane').hidden=t.dataset.tab!=='record'}));
function validVoice(){return state.voiceFile&&state.voiceDuration>=110&&state.voiceDuration<=130&&$('#consent').checked}
function updateTrain(){const ok=validVoice();$('#train').disabled=!ok;$('#voiceTime').textContent=ok?'2:00':'Waiting';}
$('#consent').addEventListener('change',updateTrain);
$('#voiceFile').addEventListener('change',e=>{const f=e.target.files?.[0];state.voiceFile=f||null;state.voiceDuration=0;if(!f){updateTrain();return}const u=URL.createObjectURL(f),a=new Audio();a.preload='metadata';a.onloadedmetadata=()=>{state.voiceDuration=a.duration||0;$('#voiceTitle').textContent=f.name;$('#voiceInfo').textContent=state.voiceDuration.toFixed(1)+' sec '+(state.voiceDuration>=110&&state.voiceDuration<=130?'· ready':'· needs 110–130 sec');URL.revokeObjectURL(u);updateTrain()};a.onerror=()=>{URL.revokeObjectURL(u);$('#voiceInfo').textContent='Could not read this audio file';updateTrain()};a.src=u});
async function analyzeVoice(file){try{const ab=await file.arrayBuffer(),ctx=new (window.AudioContext||window.webkitAudioContext)(),buf=await ctx.decodeAudioData(ab.slice(0)),data=buf.getChannelData(0),step=Math.max(1,Math.floor(data.length/250000));let sum=0,z=0,prev=0,count=0,delta=0;for(let i=0;i<data.length;i+=step){const x=data[i];sum+=x*x;if((x>=0)!==(prev>=0))z++;delta+=Math.abs(x-prev);prev=x;count++}await ctx.close();const rms=Math.sqrt(sum/Math.max(1,count)),zcr=z/Math.max(1,count),brightness=Math.round(clamp(32+zcr*800+delta/count*180,20,95)),dynamics=Math.round(clamp(40+rms*210,30,96)),shift=clamp((brightness-58)/28,-1.8,1.8);return{brightness,dynamics,shift,created:Date.now()}}catch{return{brightness:58,dynamics:62,shift:0,created:Date.now()}}}
const TRAIN_SECONDS=new URLSearchParams(location.search).has('test')?2:120;
$('#train').addEventListener('click',()=>{if(!validVoice())return;$('#train').disabled=true;let elapsed=0;$('#voiceStep').textContent='Mapping low register';const labels=['Mapping low register','Mapping mid register','Mapping high register','Learning dynamics','Learning expression','Finalizing signature'];const timer=setInterval(async()=>{elapsed++;const pct=elapsed/TRAIN_SECONDS*100;$('#voiceProgress').style.width=pct+'%';$('#voiceTime').textContent=Math.max(0,TRAIN_SECONDS-elapsed)+'s';$('#voiceStep').textContent=labels[Math.min(labels.length-1,Math.floor(elapsed/(TRAIN_SECONDS/labels.length)))];if(elapsed>=TRAIN_SECONDS){clearInterval(timer);state.voice=await analyzeVoice(state.voiceFile);localStorage.setItem('novaVoiceV2',JSON.stringify(state.voice));$('#voiceProgress').style.width='100%';$('#voiceStep').textContent='Voice Signature ready';$('#voiceTime').textContent='Done';updateVoiceUI();$('#train').disabled=false;toast('Voice profile calibrated')}},1000)});
$('#record').addEventListener('click',async()=>{if(state.mediaRecorder&&state.mediaRecorder.state==='recording'){state.mediaRecorder.stop();return}try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});state.recorded=[];state.mediaRecorder=new MediaRecorder(stream);state.mediaRecorder.ondataavailable=e=>{if(e.data.size)state.recorded.push(e.data)};state.mediaRecorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());clearInterval(state.recordTimer);const blob=new Blob(state.recorded,{type:state.mediaRecorder.mimeType||'audio/webm'});state.voiceFile=new File([blob],'nova-voice-recording.webm',{type:blob.type});state.voiceDuration=(Date.now()-state.recordStart)/1000;$('#record').classList.remove('recording');$('#record').textContent='● Record 2:00 sample';$('#recordInfo').textContent=state.voiceDuration.toFixed(1)+' sec captured '+(state.voiceDuration>=110&&state.voiceDuration<=130?'· ready':'· record 110–130 sec');updateTrain()};state.mediaRecorder.start(500);state.recordStart=Date.now();$('#record').classList.add('recording');$('#record').textContent='■ Stop recording';state.recordTimer=setInterval(()=>{const sec=(Date.now()-state.recordStart)/1000;$('#recordInfo').textContent=Math.floor(sec/60)+':'+String(Math.floor(sec%60)).padStart(2,'0')+' recorded';if(sec>=120)state.mediaRecorder.stop()},500)}catch{$('#recordInfo').textContent='Microphone permission was not granted.'}});
window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='g'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))generate()});
})();
