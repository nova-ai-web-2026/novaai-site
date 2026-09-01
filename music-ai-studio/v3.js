(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const modelCfg={
'1.0':{structure:84,expression:76,detail:74,stereo:70,polish:78,chordVoices:3,hatStep:.5,leadSteps:8,leadDensity:.50,fillDensity:0,padVoices:0,bassHarmonics:1,humanize:.0015,detune:.004,stereoWidth:.70,masterTarget:.84,transitionLayers:0},
'1.5':{structure:91,expression:92,detail:88,stereo:86,polish:88,chordVoices:4,hatStep:.333333,leadSteps:12,leadDensity:.69,fillDensity:.55,padVoices:2,bassHarmonics:2,humanize:.0055,detune:.008,stereoWidth:.86,masterTarget:.90,transitionLayers:1},
'1.5+':{structure:97,expression:97,detail:97,stereo:96,polish:97,chordVoices:5,hatStep:.25,leadSteps:16,leadDensity:.88,fillDensity:1,padVoices:3,bassHarmonics:3,humanize:.010,detune:.013,stereoWidth:.96,masterTarget:.94,transitionLayers:2}
};
const genreProfiles={
'Pop':{aliases:['pop','future pop','dance pop','بوب'],base:48,scale:[0,2,4,5,7,9,11],prog:[0,5,3,4],mode:'major',kick:[0,2,3.5],snare:[1,3],hat:.5,bass:[0,2,3.25],lead:'synth',chord:'synth',bpm:118,swing:0},
'Arabic Trap':{aliases:['arabic trap','arab trap','trap arabic','عربي تراب','تراب عربي','تراب','مهرجانات'],base:45,scale:[0,2,3,5,7,8,11],prog:[0,5,7,3],mode:'minor',kick:[0,1.75,2.75,3.5],snare:[1,3],hat:.25,bass:[0,1.5,2.75,3.5],lead:'oud',chord:'synth',bpm:96,swing:0},
'Hip-Hop':{aliases:['hip hop','hip-hop','boom bap','rap','راب'],base:43,scale:[0,3,5,7,10],prog:[0,3,7,5],mode:'minor',kick:[0,1.5,2.5,3.25],snare:[1,3],hat:.5,bass:[0,2,3.25],lead:'pluck',chord:'keys',bpm:88,swing:.04},
'R&B':{aliases:['r&b','rnb','neo soul','neo-soul','soul'],base:46,scale:[0,2,3,5,7,9,10],prog:[0,5,3,7],mode:'minor',kick:[0,2.5],snare:[1,3],hat:.5,bass:[0,.75,2.5,3.25],lead:'silk',chord:'keys',bpm:92,swing:.07},
'EDM':{aliases:['edm','festival','house','dance','electronic','electro','techno'],base:45,scale:[0,2,3,5,7,8,10],prog:[0,5,3,7],mode:'minor',kick:[0,1,2,3],snare:[1,3],hat:.5,bass:[0,1,2,3],lead:'supersaw',chord:'supersaw',bpm:128,swing:0},
'Cinematic':{aliases:['cinematic','orchestral','score','soundtrack','trailer','سينمائي'],base:41,scale:[0,2,3,5,7,8,10],prog:[0,3,5,7],mode:'minor',kick:[0,2],snare:[1,3],hat:1,bass:[0,2],lead:'strings',chord:'strings',bpm:84,swing:0},
'Lo-fi':{aliases:['lofi','lo-fi','chillhop','chill hop','study beats','chill'],base:44,scale:[0,2,3,5,7,9,10],prog:[0,5,3,6],mode:'minor',kick:[0,2.25],snare:[1,3],hat:.5,bass:[0,2.5,3.5],lead:'keys',chord:'keys',bpm:78,swing:.09},
'Piano Ballad':{aliases:['piano ballad','ballad','piano','بيانو'],base:48,scale:[0,2,3,5,7,8,10],prog:[0,5,3,7],mode:'minor',kick:[],snare:[],hat:1,bass:[0,2],lead:'piano',chord:'piano',bpm:76,swing:0},
'Rock':{aliases:['rock','alternative rock','indie rock','روك'],base:43,scale:[0,2,3,5,7,8,10],prog:[0,3,5,7],mode:'minor',kick:[0,2],snare:[1,3],hat:.5,bass:[0,1,2,3],lead:'guitar',chord:'guitar',bpm:116,swing:0},
'Drill':{aliases:['drill','uk drill','ny drill','دريل'],base:42,scale:[0,2,3,5,7,8,10],prog:[0,5,3,7],mode:'minor',kick:[0,1.75,2.5,3.5],snare:[1,3],hat:.25,bass:[0,1.5,2.75,3.5],lead:'bell',chord:'pad',bpm:142,swing:0},
'Afrobeat':{aliases:['afrobeat','afrobeats','afro pop','afropop'],base:47,scale:[0,2,4,5,7,9,10],prog:[0,4,5,3],mode:'major',kick:[0,1.5,2.75],snare:[1,3],hat:.5,bass:[0,.75,2,3.25],lead:'pluck',chord:'guitar',bpm:104,swing:.05}
};
const presets=[
{prompt:'Nocturnal city energy with a dramatic hook',style:'Arabic trap with oud and 808',bpm:96,energy:78},
{prompt:'Emotional late night heartbreak',style:'sad piano ballad, intimate and warm',bpm:74,energy:52},
{prompt:'Huge festival drop with a bright hook',style:'festival EDM supersaw, four on the floor',bpm:128,energy:90},
{prompt:'Dusty relaxed study beat',style:'lo-fi chillhop with mellow piano',bpm:78,energy:48},
{prompt:'Dark tense street energy',style:'UK drill with bell melody and sliding 808',bpm:142,energy:82}
];
const state={model:'1.0',blob:null,url:null,voice:null,voiceFile:null,voiceDuration:0,mediaRecorder:null,recorded:[],recordTimer:null,recordStart:0,lastAnalysis:null};
try{state.voice=JSON.parse(localStorage.getItem('novaVoiceV3')||localStorage.getItem('novaVoiceV2')||'null')}catch(e){}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),midi=m=>440*Math.pow(2,(m-69)/12);
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let x=seed||123456789;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%1000000)/1000000}}
function toast(msg){const el=$('#toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1900)}
function norm(s){return String(s||'').toLowerCase().replace(/[–—]/g,'-').trim()}
function hasAny(text,words){return words.some(w=>text.includes(w))}
function analyzeStyle(styleText,prompt){
 const style=norm(styleText),p=norm(prompt),combined=style+' | '+p;
 let winner='Pop',best=-1;
 for(const [name,g] of Object.entries(genreProfiles)){
   let score=0;for(const a of g.aliases){if(style.includes(a))score+=5;if(p.includes(a))score+=2}
   if(score>best){best=score;winner=name}
 }
 if(best<=0){if(hasAny(combined,['oud','عود','arabic','عربي']))winner='Arabic Trap';else if(hasAny(combined,['piano','بيانو']))winner='Piano Ballad';else if(hasAny(combined,['guitar','جيتار']))winner='Rock'}
 const base=genreProfiles[winner],profile={...base,scale:[...base.scale],prog:[...base.prog],kick:[...base.kick],snare:[...base.snare],bass:[...base.bass]};
 const sad=hasAny(combined,['sad','melanch','heartbreak','emotional','dark','moody','minor','حزين','حزينة','غامق','مظلم']);
 const happy=hasAny(combined,['happy','bright','uplifting','joy','sunny','major','فرح','سعيد','مبهج']);
 if(sad&&!happy){profile.mode='minor';profile.scale=[0,2,3,5,7,8,10]}
 if(happy&&!sad){profile.mode='major';profile.scale=[0,2,4,5,7,9,11]}
 const instruments={
   oud:hasAny(combined,['oud','عود']),piano:hasAny(combined,['piano','بيانو','keys','keyboard']),guitar:hasAny(combined,['guitar','جيتار','acoustic']),strings:hasAny(combined,['strings','violin','cello','orchestral','وتر','كمان']),flute:hasAny(combined,['flute','ney','ناي']),bell:hasAny(combined,['bell','bells','music box']),supersaw:hasAny(combined,['supersaw','saw lead']),synth:hasAny(combined,['synth','synthwave']),bass808:hasAny(combined,['808','sub bass','sub-bass']),brass:hasAny(combined,['brass','horns','trumpet'])
 };
 let lead=profile.lead,chord=profile.chord;
 if(instruments.oud)lead='oud';else if(instruments.piano)lead='piano';else if(instruments.guitar)lead='guitar';else if(instruments.flute)lead='flute';else if(instruments.strings)lead='strings';else if(instruments.bell)lead='bell';else if(instruments.supersaw)lead='supersaw';else if(instruments.synth)lead='synth';
 if(instruments.piano)chord='piano';else if(instruments.guitar)chord='guitar';else if(instruments.strings)chord='strings';else if(instruments.supersaw)chord='supersaw';
 const noDrums=hasAny(combined,['no drums','without drums','drumless','بدون درام','من غير درام']);
 if(noDrums){profile.kick=[];profile.snare=[];profile.hat=4}
 const sparse=hasAny(combined,['minimal','sparse','soft','gentle','calm','هادئ','ناعم']);
 const aggressive=hasAny(combined,['aggressive','hard','heavy','huge','massive','angry','قوي','عنيف']);
 const density=sparse&&!aggressive?.72:aggressive&&!sparse?1.18:1;
 const confidence=Math.max(20,Math.min(100,45+Math.max(0,best)*5+(Object.values(instruments).filter(Boolean).length*6)));
 return{label:winner,profile,lead,chord,instruments,mood:sad&&!happy?'dark/minor':happy&&!sad?'bright/major':'genre default',density,confidence,noDrums,rawStyle:styleText||''};
}
function chooseModel(m){state.model=m;$$('.model').forEach(x=>x.classList.toggle('active',x.dataset.model===m));$('#modelBadge').textContent='Nova '+m;renderMatrix()}
$$('.model').forEach(x=>x.addEventListener('click',()=>chooseModel(x.dataset.model)));
function renderMatrix(){const c=modelCfg[state.model];[['mx1',c.structure],['mx2',c.expression],['mx3',c.detail],['mx4',c.stereo],['mx5',c.polish]].forEach(([id,val])=>{const e=$('#'+id);if(!e)return;e.querySelector('i').style.width=val+'%';e.querySelector('b').textContent=val})}
renderMatrix();
$('#energy').addEventListener('input',e=>$('#energyV').textContent=e.target.value+'%');$('#bpm').addEventListener('input',e=>$('#bpmV').textContent=e.target.value);
$('#style').addEventListener('change',e=>{const a=analyzeStyle(e.target.value,$('#prompt').value);if(a.confidence>=60&&genreProfiles[a.label]){$('#bpm').value=genreProfiles[a.label].bpm;$('#bpmV').textContent=$('#bpm').value}toast('Detected: '+a.label+' · '+a.lead)});
$('#surprise').addEventListener('click',()=>{const p=presets[Math.floor(Math.random()*presets.length)];$('#prompt').value=p.prompt;$('#style').value=p.style;$('#bpm').value=p.bpm;$('#bpmV').textContent=p.bpm;$('#energy').value=p.energy;$('#energyV').textContent=p.energy+'%';toast('New style-aware idea loaded')});
$('#copyPrompt').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#prompt').value);toast('Prompt copied')}catch{toast('Copy unavailable')}});
function sectionAt(bar,bars,cfg){const x=bar/Math.max(1,bars-1);if(x<(cfg.structure>94?.10:.14))return'intro';if(x<(cfg.structure>89?.44:.48))return'verse';if(x<(cfg.structure>94?.64:.68))return'build';return'drop'}
function sectionGain(sec,cfg){const lift=(cfg.structure-84)/130;return sec==='intro'?.56:sec==='verse'?.76+lift:sec==='build'?.88+lift:1}
function panGains(p){p=clamp(p,-1,1);return[Math.sqrt((1-p)/2),Math.sqrt((1+p)/2)]}
function wave(t,f,type,detail,det=0){const w=2*Math.PI*f*(1+det)*t;
 if(type==='piano')return(Math.sin(w)+.55*Math.sin(2*w)+.28*Math.sin(3*w)+.12*Math.sin(4*w))*Math.exp(-t*1.8);
 if(type==='oud')return(Math.sin(w)+.48*Math.sin(2*w)+.32*Math.sin(3*w)+.14*Math.sin(5*w))*Math.exp(-t*4.3);
 if(type==='guitar')return(Math.sin(w)+.36*Math.sin(2*w)+.18*Math.sin(3*w)+.08*Math.sin(4*w))*Math.exp(-t*3.2);
 if(type==='flute')return Math.sin(w)+.12*Math.sin(2*w)+.04*Math.sin(3*w);
 if(type==='strings')return .76*Math.sin(w)+.22*Math.sin(2*w)+.12*Math.sin(3*w)+.06*Math.sin(w*.5);
 if(type==='bell')return Math.sin(w)+.42*Math.sin(2.7*w)+.24*Math.sin(4.1*w)+.12*Math.sin(6.3*w);
 if(type==='supersaw')return .44*Math.sin(w)+.28*Math.sin(w*1.006)+.24*Math.sin(w*.994)+.12*Math.sin(2*w);
 if(type==='keys')return Math.sin(w)+.22*Math.sin(2*w)+.08*Math.sin(3*w);
 if(type==='silk')return Math.sin(w)+.16*Math.sin(2*w)+.05*Math.sin(3*w);
 return Math.sin(w)+(.12+detail*.0012)*Math.sin(2*w)+.06*Math.sin(3*w);
}
function renderSong({model,bpm,energy,duration,styleText,prompt}){
 const sr=32000,N=Math.floor(sr*duration),L=new Float32Array(N),R=new Float32Array(N),cfg=modelCfg[model],analysis=analyzeStyle(styleText,prompt),sty=analysis.profile,rand=rng(hash(prompt+'|'+styleText+'|'+analysis.label+'|'+model+'|'+bpm)),beat=60/bpm,barLen=beat*4,bars=Math.ceil(duration/barLen),eng=energy/100,density=analysis.density;state.lastAnalysis=analysis;
 const jitter=()=>((rand()-.5)*2*cfg.humanize),add=(start,len,fn,amp=1,pan=0)=>{start=Math.max(0,start);const s=Math.floor(start*sr),e=Math.min(N,s+Math.floor(len*sr)),[gl,gr]=panGains(pan*cfg.stereoWidth);for(let i=s;i<e;i++){const t=(i-s)/sr,v=fn(t,i)*amp;L[i]+=v*gl;R[i]+=v*gr}},noise=i=>{const x=Math.sin((i+1)*12.9898+78.233)*43758.5453;return((x-Math.floor(x))*2-1)};
 function kick(t,a=1){add(t+jitter(),.46,x=>Math.sin(2*Math.PI*(47+92*Math.exp(-x*24))*x)*Math.exp(-x*13),.72*a*eng*density)}
 function snare(t,a=1){add(t+jitter(),.32,(x,i)=>noise(i)*.82*Math.exp(-x*16)+Math.sin(2*Math.PI*185*x)*.25*Math.exp(-x*20),.27*a*eng*density,(rand()-.5)*.16)}
 function hat(t,a=.65,open=false){add(t+jitter(),open?.18:.075,(x,i)=>(noise(i)-.65*noise(i-2))*Math.exp(-x*(open?18:55)),.11*a*(.65+.35*eng)*density,(rand()-.5)*.72)}
 function bass(t,d,n,a=1){const f=midi(n),phase=rand()*6.28;add(t+jitter(),d,x=>{const env=Math.max(0,Math.min(1,x/.018)*Math.min(1,(d-x)/.08));let y=Math.sin(2*Math.PI*f*x+phase);if(cfg.bassHarmonics>=2)y+=Math.sin(2*Math.PI*f*2*x+phase*.7)*.18;if(cfg.bassHarmonics>=3)y+=Math.sin(2*Math.PI*f*3*x+phase*.3)*.075;if(analysis.instruments.bass808)y=Math.tanh(y*1.65);return Math.tanh(y*(1.2+cfg.bassHarmonics*.08))*env},.29*a*eng*(analysis.instruments.bass808?1.18:1))}
 function chord(t,d,root,a=1){const ints=sty.mode==='major'?[0,4,7,11,14]:[0,3,7,10,14];for(let v=0;v<cfg.chordVoices;v++){const n=root+ints[v],f=midi(n),p=(v-(cfg.chordVoices-1)/2)*(.18+cfg.stereoWidth*.18),det=(rand()-.5)*cfg.detune;add(t+jitter(),d,x=>{let env;if(analysis.chord==='strings')env=Math.max(0,Math.min(1,x/.28)*Math.min(1,(d-x)/.35));else if(['piano','guitar'].includes(analysis.chord))env=Math.max(0,Math.min(1,x/.012)*Math.min(1,(d-x)/.12));else env=Math.max(0,Math.min(1,x/.11)*Math.min(1,(d-x)/.23));return wave(x,f,analysis.chord,cfg.detail,det)*env},.067*a*(.72+.28*eng),p)}}
 function lead(t,d,n,a=1,pan=0){const f=midi(n)*Math.pow(2,(state.voice?.shift||0)/24);add(t+jitter(),d,x=>{let env;if(['oud','guitar','piano','bell'].includes(analysis.lead))env=Math.exp(-x*(analysis.lead==='bell'?2.1:3.4-(cfg.expression-70)/90));else env=Math.max(0,Math.min(1,x/.035)*Math.min(1,(d-x)/.12));const vib=1+Math.sin(2*Math.PI*(4.6+cfg.expression/140)*x)*(.0006+cfg.expression*.000012);return wave(x,f*vib,analysis.lead,cfg.detail)*env},.16*a*eng,pan)}
 function pad(t,d,root,a=1){const wanted=analysis.instruments.strings?Math.max(1,cfg.padVoices):cfg.padVoices;if(!wanted)return;const offs=[0,7,12].slice(0,Math.min(3,wanted));offs.forEach((off,i)=>{const f=midi(root+off),pan=(i-(offs.length-1)/2)*.55;add(t,d,x=>{const env=Math.sin(Math.PI*clamp(x/d,0,1));return wave(x,f,analysis.instruments.strings?'strings':'synth',cfg.detail,cfg.detune*.2)*env},(.015+.004*wanted)*a,pan)})}
 function transition(t,sec,sg,root){if(!cfg.transitionLayers)return;if(sec==='build'&&!analysis.noDrums){for(let q=0;q<cfg.transitionLayers;q++)hat(t+(3.25+q*.25)*beat,.65+q*.15,true)}if(sec==='drop'&&cfg.transitionLayers>1){lead(t+.5*beat,beat*.8,root+19,.52,.62);lead(t+2.5*beat,beat*.55,root+17,.42,-.58)}}
 for(let b=0;b<bars;b++){const barStart=b*barLen;if(barStart>=duration)break;const sec=sectionAt(b,bars,cfg),sg=sectionGain(sec,cfg),root=sty.base+sty.prog[b%sty.prog.length];chord(barStart,Math.min(barLen,duration-barStart),root+12,sg);pad(barStart,Math.min(barLen,duration-barStart),root+12,sg);transition(barStart,sec,sg,root);
   if((sec!=='intro'||b>0)&&!analysis.noDrums){sty.kick.forEach(k=>{const t=barStart+(k+(b%2?sty.swing:0))*beat;if(t<duration)kick(t,sg*(sec==='drop'?1.1:1))});sty.snare.forEach(s=>{const t=barStart+(s+sty.swing)*beat;if(t<duration)snare(t,sg)});const step=Math.min(sty.hat,cfg.hatStep);for(let x=0;x<4;x+=step){const t=barStart+x*beat;if(t<duration&&rand()<Math.min(1,density*.95))hat(t,sg*(x%1===0?.95:.62),sec==='build'&&x>3)}}
   sty.bass.forEach((pos,q)=>{const t=barStart+(pos+(q%2?sty.swing*.5:0))*beat;if(t<duration)bass(t,beat*(analysis.label==='EDM'?.72:.9),root+(q%3===2?7:0),sg)});
   if(sec!=='intro'){for(let s=0;s<cfg.leadSteps;s++){if(rand()>cfg.leadDensity*sg*density)continue;const t=barStart+(s/cfg.leadSteps)*4*beat;if(t>=duration)continue;const n=root+12+sty.scale[Math.floor(rand()*sty.scale.length)]+(rand()>.80?12:0),accent=(s%4===0?1.12:.82)*(sec==='drop'?1.08:1);lead(t,beat*(.42+cfg.expression/500),n,accent,(rand()-.5)*.92)}}
   if(cfg.fillDensity&&!analysis.noDrums&&sec==='drop'&&b%2===1){const count=Math.round(2+cfg.fillDensity*4*density);for(let f=0;f<count;f++){const t=barStart+(3+f/count)*beat;if(t<duration)hat(t,.78+cfg.fillDensity*.28)}}
 }
 let peak=.001;const fade=Math.min(sr*.06,N/4),sat=1.24+cfg.polish/480,duckDepth=.055+cfg.polish/2400;for(let i=0;i<N;i++){const edge=Math.min(1,i/fade,(N-1-i)/fade),mono=(L[i]+R[i])*.5,duck=1-duckDepth*Math.max(0,mono),l=Math.tanh(L[i]*duck*sat)*edge,r=Math.tanh(R[i]*duck*sat)*edge;L[i]=l;R[i]=r;peak=Math.max(peak,Math.abs(l),Math.abs(r))}const gain=Math.min(1.5,cfg.masterTarget/peak);for(let i=0;i<N;i++){L[i]=clamp(L[i]*gain,-.985,.985);R[i]=clamp(R[i]*gain,-.985,.985)}return encodeWav(L,R,sr)
}
function encodeWav(L,R,sr){const N=L.length,buf=new ArrayBuffer(44+N*4),v=new DataView(buf),write=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));write(0,'RIFF');v.setUint32(4,36+N*4,true);write(8,'WAVE');write(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,sr,true);v.setUint32(28,sr*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);write(36,'data');v.setUint32(40,N*4,true);for(let i=0,o=44;i<N;i++,o+=4){v.setInt16(o,L[i]*32767,true);v.setInt16(o+2,R[i]*32767,true)}return new Blob([buf],{type:'audio/wav'})}
async function generate(){const prompt=$('#prompt').value.trim(),styleText=$('#style').value.trim();if(!prompt&&!styleText){$('#status').textContent='Add a song idea or style first.';$('#status').className='inlineStatus bad';return}const btn=$('#generate');btn.disabled=true;$('#status').className='inlineStatus';$('#status').textContent='Reading style…';$('#render').classList.add('show');$('#renderProgress').style.width='8%';$$('.renderStages span').forEach((x,i)=>x.classList.toggle('on',i===0));const analysis=analyzeStyle(styleText,prompt);state.lastAnalysis=analysis;for(let s=0;s<4;s++){await new Promise(r=>setTimeout(r,70));$('#renderProgress').style.width=(18+s*17)+'%';$$('.renderStages span').forEach((x,i)=>x.classList.toggle('on',i<=s))}try{await new Promise(r=>setTimeout(r,0));const blob=renderSong({model:state.model,bpm:Number($('#bpm').value),energy:Number($('#energy').value),duration:Number($('#length').value),styleText,prompt});if(state.url)URL.revokeObjectURL(state.url);state.blob=blob;state.url=URL.createObjectURL(blob);$('#player').src=state.url;$('#download').disabled=false;$('#renderProgress').style.width='100%';$$('.renderStages span').forEach(x=>x.classList.add('on'));const c=modelCfg[state.model];$('#trackTitle').textContent='Nova '+state.model+' · '+analysis.label;$('#trackInfo').textContent=$('#bpm').value+' BPM · '+$('#length').value+' sec · style '+analysis.confidence+'% · '+analysis.lead+' lead · '+analysis.mood;[['m1',c.structure],['m2',c.expression],['m3',c.detail],['m4',c.stereo],['m5',c.polish]].forEach(([id,v])=>$('#'+id).textContent=v+'%');$('#status').textContent='Matched '+analysis.label+' · '+analysis.lead+' / '+analysis.chord;$('#status').className='inlineStatus ok';toast('Style matched: '+analysis.label)}catch(err){console.error(err);$('#status').textContent='Render failed: '+err.message;$('#status').className='inlineStatus bad'}finally{btn.disabled=false}}
$('#generate').addEventListener('click',generate);
$('#download').addEventListener('click',()=>{if(!state.blob)return;const a=document.createElement('a');a.href=state.url;a.download='nova-'+state.model+'-'+(state.lastAnalysis?.label||'track').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.wav';a.click();toast('WAV download started')});
function updateVoiceUI(){if(state.voice){$('#voiceDot').className='voiceDot ok';$('#voiceTitle').textContent='Voice Signature ready';$('#voiceInfo').textContent='Brightness '+state.voice.brightness+'% · Dynamics '+state.voice.dynamics+'%'}else{$('#voiceDot').className='voiceDot';$('#voiceTitle').textContent='No voice profile';$('#voiceInfo').textContent='Upload or record 110–130 seconds.'}}
updateVoiceUI();
const tabs=$$('.tab');tabs.forEach(t=>t.addEventListener('click',()=>{tabs.forEach(x=>x.classList.toggle('active',x===t));$('#uploadPane').hidden=t.dataset.tab!=='upload';$('#recordPane').hidden=t.dataset.tab!=='record'}));
function validVoice(){return state.voiceFile&&state.voiceDuration>=110&&state.voiceDuration<=130&&$('#consent').checked}
function updateTrain(){const ok=validVoice();$('#train').disabled=!ok;$('#voiceTime').textContent=ok?'2:00':'Waiting'}
$('#consent').addEventListener('change',updateTrain);
$('#voiceFile').addEventListener('change',e=>{const f=e.target.files?.[0];state.voiceFile=f||null;state.voiceDuration=0;if(!f){updateTrain();return}const u=URL.createObjectURL(f),a=new Audio();a.preload='metadata';a.onloadedmetadata=()=>{state.voiceDuration=a.duration||0;$('#voiceTitle').textContent=f.name;$('#voiceInfo').textContent=state.voiceDuration.toFixed(1)+' sec '+(state.voiceDuration>=110&&state.voiceDuration<=130?'· ready':'· needs 110–130 sec');URL.revokeObjectURL(u);updateTrain()};a.onerror=()=>{URL.revokeObjectURL(u);$('#voiceInfo').textContent='Could not read this audio file';updateTrain()};a.src=u});
async function analyzeVoice(file){try{const ab=await file.arrayBuffer(),ctx=new (window.AudioContext||window.webkitAudioContext)(),buf=await ctx.decodeAudioData(ab.slice(0)),data=buf.getChannelData(0),step=Math.max(1,Math.floor(data.length/250000));let sum=0,z=0,prev=0,count=0,delta=0;for(let i=0;i<data.length;i+=step){const x=data[i];sum+=x*x;if((x>=0)!==(prev>=0))z++;delta+=Math.abs(x-prev);prev=x;count++}await ctx.close();const rms=Math.sqrt(sum/Math.max(1,count)),zcr=z/Math.max(1,count),brightness=Math.round(clamp(32+zcr*800+delta/count*180,20,95)),dynamics=Math.round(clamp(40+rms*210,30,96)),shift=clamp((brightness-58)/28,-1.8,1.8);return{brightness,dynamics,shift,created:Date.now()}}catch{return{brightness:58,dynamics:62,shift:0,created:Date.now()}}}
const TRAIN_SECONDS=new URLSearchParams(location.search).has('test')?2:120;
$('#train').addEventListener('click',()=>{if(!validVoice())return;$('#train').disabled=true;let elapsed=0;$('#voiceStep').textContent='Mapping low register';const labels=['Mapping low register','Mapping mid register','Mapping high register','Learning dynamics','Learning expression','Finalizing signature'];const timer=setInterval(async()=>{elapsed++;const pct=elapsed/TRAIN_SECONDS*100;$('#voiceProgress').style.width=pct+'%';$('#voiceTime').textContent=Math.max(0,TRAIN_SECONDS-elapsed)+'s';$('#voiceStep').textContent=labels[Math.min(labels.length-1,Math.floor(elapsed/(TRAIN_SECONDS/labels.length)))];if(elapsed>=TRAIN_SECONDS){clearInterval(timer);state.voice=await analyzeVoice(state.voiceFile);localStorage.setItem('novaVoiceV3',JSON.stringify(state.voice));$('#voiceProgress').style.width='100%';$('#voiceStep').textContent='Voice Signature ready';$('#voiceTime').textContent='Done';updateVoiceUI();$('#train').disabled=false;toast('Voice profile calibrated')}},1000)});
$('#record').addEventListener('click',async()=>{if(state.mediaRecorder&&state.mediaRecorder.state==='recording'){state.mediaRecorder.stop();return}try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});state.recorded=[];state.mediaRecorder=new MediaRecorder(stream);state.mediaRecorder.ondataavailable=e=>{if(e.data.size)state.recorded.push(e.data)};state.mediaRecorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());clearInterval(state.recordTimer);const blob=new Blob(state.recorded,{type:state.mediaRecorder.mimeType||'audio/webm'});state.voiceFile=new File([blob],'nova-voice-recording.webm',{type:blob.type});state.voiceDuration=(Date.now()-state.recordStart)/1000;$('#record').classList.remove('recording');$('#record').textContent='● Record 2:00 sample';$('#recordInfo').textContent=state.voiceDuration.toFixed(1)+' sec captured '+(state.voiceDuration>=110&&state.voiceDuration<=130?'· ready':'· record 110–130 sec');updateTrain()};state.mediaRecorder.start(500);state.recordStart=Date.now();$('#record').classList.add('recording');$('#record').textContent='■ Stop recording';state.recordTimer=setInterval(()=>{const sec=(Date.now()-state.recordStart)/1000;$('#recordInfo').textContent=Math.floor(sec/60)+':'+String(Math.floor(sec%60)).padStart(2,'0')+' recorded';if(sec>=120)state.mediaRecorder.stop()},500)}catch{$('#recordInfo').textContent='Microphone permission was not granted.'}});
window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='g'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))generate()});
window.__novaStyleDebug={analyzeStyle,getLastAnalysis:()=>state.lastAnalysis,getLastBlob:()=>state.blob,modelCfg};
})();
