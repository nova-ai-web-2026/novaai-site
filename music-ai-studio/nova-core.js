(()=>{
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const norm=s=>String(s||'').toLowerCase().replace(/[–—]/g,'-').trim();
const has=(t,arr)=>arr.some(x=>t.includes(x));
function hash(s){let h=2166136261;for(const c of String(s||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let x=seed||123456789;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%1000000)/1000000}}

const MODEL={
 '1.0':{melodyGrid:8,chordDepth:3,variation:.22,ornaments:0,humanize:.002,drumDetail:.55,bassDetail:.55,transitionDetail:.3},
 '1.5':{melodyGrid:12,chordDepth:4,variation:.52,ornaments:1,humanize:.006,drumDetail:.78,bassDetail:.78,transitionDetail:.65},
 '1.5+':{melodyGrid:16,chordDepth:5,variation:.82,ornaments:2,humanize:.011,drumDetail:.96,bassDetail:.96,transitionDetail:.92}
};

const RHYTHMS={
 trap:{aliases:['trap','تراب','808','trap hats'],bpm:96,kick:[0,1.75,2.75,3.5],snare:[2],hatStep:.25,bass:[0,1.5,2.75,3.5],swing:0},
 drill:{aliases:['drill','دريل'],bpm:142,kick:[0,.75,2.25,3.25],snare:[2],hatStep:.333333,bass:[0,1.5,2.75,3.5],swing:0},
 house:{aliases:['edm','house','festival','techno','electro'],bpm:128,kick:[0,1,2,3],snare:[1,3],hatStep:.5,bass:[.5,1.5,2.5,3.5],swing:0},
 boomBap:{aliases:['boom bap','hip hop','hip-hop','راب','rap'],bpm:88,kick:[0,1.5,2.75],snare:[1,3],hatStep:.5,bass:[0,2,3.25],swing:.04},
 rnb:{aliases:['r&b','rnb','neo soul','neo-soul','soul'],bpm:92,kick:[0,2.5],snare:[1,3],hatStep:.5,bass:[0,.75,2.5,3.25],swing:.075},
 lofi:{aliases:['lofi','lo-fi','chillhop','study beat','chill hop'],bpm:78,kick:[0,2.25],snare:[1,3],hatStep:.5,bass:[0,2.5,3.5],swing:.095},
 rock:{aliases:['rock','روك','indie rock','alternative rock'],bpm:116,kick:[0,2,2.75],snare:[1,3],hatStep:.5,bass:[0,1,2,3],swing:0},
 afro:{aliases:['afrobeat','afrobeats','afropop','afro pop'],bpm:104,kick:[0,1.5,2.75],snare:[1,3],hatStep:.25,bass:[0,.75,2,3.25],swing:.045},
 dembow:{aliases:['reggaeton','dembow','ريغيتون'],bpm:96,kick:[0,2],snare:[.75,1.5,2.75,3.5],hatStep:.5,bass:[0,1.5,2.75],swing:0},
 amapiano:{aliases:['amapiano','log drum'],bpm:112,kick:[0,2.5],snare:[1,3],hatStep:.5,bass:[.75,1.75,2.75,3.5],swing:.03},
 ballad:{aliases:['ballad','solo piano','بيانو حزين','piano ballad'],bpm:74,kick:[],snare:[],hatStep:4,bass:[0,2],swing:0},
 cinematic:{aliases:['cinematic','orchestral','film score','soundtrack','trailer','سينمائي'],bpm:84,kick:[0],snare:[],hatStep:4,bass:[0,2],swing:0},
 pop:{aliases:['pop','بوب','dance pop','future pop'],bpm:118,kick:[0,2,3.5],snare:[1,3],hatStep:.5,bass:[0,2,3.25],swing:0}
};

const HARMONY={
 hijaz:{aliases:['arabic','عربي','hijaz','حجاز','maqam','مقام','oud','عود','mizmar','مزمار','mahraganat','مهرجان'],scale:[0,1,4,5,7,8,11],prog:[0,5,3,7],voicing:[0,7,12,16,19]},
 jazz:{aliases:['jazz','jazzy'],scale:[0,2,3,5,7,9,10],prog:[0,5,3,7],voicing:[0,3,7,10,14]},
 rnb:{aliases:['r&b','rnb','neo soul','neo-soul'],scale:[0,2,3,5,7,9,10],prog:[0,5,3,7],voicing:[0,3,7,10,14]},
 major:{aliases:['happy','bright','uplifting','major','سعيد','فرح','مبهج'],scale:[0,2,4,5,7,9,11],prog:[0,5,3,4],voicing:[0,4,7,11,14]},
 minor:{aliases:['sad','dark','moody','minor','melanch','حزين','كئيب','مظلم'],scale:[0,2,3,5,7,8,10],prog:[0,5,3,7],voicing:[0,3,7,10,14]}
};

const INSTRUMENT_WORDS=[
 ['oud',['oud','عود']],['piano',['piano','بيانو','keys']],['guitar',['guitar','جيتار','acoustic']],['strings',['strings','violin','cello','orchestral','كمان']],['flute',['flute','ney','ناي']],['bell',['bell','bells','music box']],['reed',['mizmar','مزمار','reed','shanai']],['supersaw',['supersaw','saw lead']],['synth',['synth','electronic']],['brass',['brass','horns','trumpet']]
];

function bestFamily(text,table,fallback){let best=fallback,score=-1;for(const [name,p] of Object.entries(table)){let s=0;for(const a of p.aliases||[])if(text.includes(a))s+=a.length+5;if(s>score){score=s;best=name}}return best}
function chooseInstrument(text,rhythm,harmony){for(const [name,words] of INSTRUMENT_WORDS)if(has(text,words))return name;if(harmony==='hijaz')return has(text,['mahraganat','مهرجان'])?'reed':'oud';if(rhythm==='drill')return'bell';if(rhythm==='house')return'supersaw';if(rhythm==='ballad')return'piano';if(rhythm==='rock'||rhythm==='afro')return'guitar';if(rhythm==='cinematic')return'strings';if(rhythm==='rnb'||rhythm==='lofi')return'piano';return'synth'}
function moodFrom(text,harmony){if(has(text,HARMONY.major.aliases))return'bright';if(has(text,HARMONY.minor.aliases))return'dark';if(harmony==='hijaz')return'dramatic';return'neutral'}
function titleCase(s){return s.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase()).trim()}

function parseStyle(style,prompt){const styleOnly=norm(style),all=styleOnly+' | '+norm(prompt);let rhythm=bestFamily(styleOnly,RHYTHMS,'pop');if(!styleOnly)rhythm=bestFamily(all,RHYTHMS,'pop');let harmony=bestFamily(all,HARMONY,'minor');if(harmony==='minor'&&!has(all,HARMONY.minor.aliases)&&has(all,HARMONY.major.aliases))harmony='major';const lead=chooseInstrument(all,rhythm,harmony);const chord=has(all,['piano','بيانو'])?'piano':has(all,['guitar','جيتار'])?'guitar':has(all,['strings','orchestral','كمان'])?'strings':rhythm==='house'?'supersaw':rhythm==='rnb'||rhythm==='lofi'?'piano':harmony==='hijaz'?'pad':'synth';const explicit=styleOnly.match(/\b(\d{2,3})\s*bpm\b/);const bpm=explicit?clamp(Number(explicit[1]),60,180):RHYTHMS[rhythm].bpm;const noDrums=has(all,['no drums','without drums','drumless','بدون درام','من غير درام'])||rhythm==='ballad';const noBass=has(all,['no bass','without bass','بدون باس']);const heavy=has(all,['heavy','hard','aggressive','massive','huge','قوي','عنيف']);const soft=has(all,['soft','gentle','minimal','sparse','intimate','هادئ','ناعم']);return{rhythm,harmony,lead,chord,bpm,noDrums,noBass,mood:moodFrom(all,harmony),density:heavy&&!soft?1.18:soft&&!heavy?.72:1,raw:style||'',label:`${titleCase(rhythm)} · ${titleCase(harmony)} · ${lead}`}}

function sectionPlan(totalBars){if(totalBars<=4)return[{name:'intro',bars:1,gain:.58},{name:'hook',bars:totalBars-1,gain:1}];if(totalBars<=7)return[{name:'intro',bars:1,gain:.55},{name:'verse',bars:Math.max(2,totalBars-3),gain:.78},{name:'hook',bars:2,gain:1}];const intro=Math.max(1,Math.round(totalBars*.12)),verse=Math.max(2,Math.round(totalBars*.36)),build=Math.max(1,Math.round(totalBars*.18)),hook=Math.max(2,totalBars-intro-verse-build);return[{name:'intro',bars:intro,gain:.52},{name:'verse',bars:verse,gain:.76},{name:'build',bars:build,gain:.9},{name:'hook',bars:hook,gain:1}]}
function jitter(rand,amount){return(rand()-.5)*2*amount}

function plan({style,prompt,model='1.0',duration=20,bpm,energy=76}){
 const spec=MODEL[model]||MODEL['1.0'],styleSpec=parseStyle(style,prompt),tempo=clamp(Number(bpm)||styleSpec.bpm,60,180),beat=60/tempo,barSec=beat*4,totalBars=Math.max(2,Math.floor(Number(duration||20)/barSec)),actualDuration=totalBars*barSec,rand=rng(hash([style,prompt,model,tempo,energy].join('|'))),harm=HARMONY[styleSpec.harmony]||HARMONY.minor,rhy=RHYTHMS[styleSpec.rhythm]||RHYTHMS.pop,root=[41,43,45,46,48][hash(style+'|'+prompt)%5],sections=sectionPlan(totalBars),events={chords:[],bass:[],melody:[],drums:[],fx:[]};
 let barIndex=0;const motif=[];for(let i=0;i<4;i++)motif.push(harm.scale[Math.floor(rand()*harm.scale.length)]);
 for(const sec of sections){for(let local=0;local<sec.bars;local++,barIndex++){
   const t0=barIndex*barSec,degree=harm.prog[barIndex%harm.prog.length],barRoot=root+degree,sectionGain=sec.gain*(Number(energy)/100*.55+.45);
   const depth=Math.min(spec.chordDepth,harm.voicing.length);const notes=harm.voicing.slice(0,depth).map(x=>barRoot+12+x);events.chords.push({t:t0,d:barSec*.94,notes,gain:.5*sectionGain,instrument:styleSpec.chord,section:sec.name});
   if(!styleSpec.noDrums&&sec.name!=='intro'){
     for(const x of rhy.kick)events.drums.push({t:t0+x*beat+jitter(rand,spec.humanize),kind:'kick',gain:.72*sectionGain});
     for(const x of rhy.snare)events.drums.push({t:t0+(x+rhy.swing)*beat+jitter(rand,spec.humanize),kind:'snare',gain:.62*sectionGain});
     const step=Math.max(.125,rhy.hatStep-(spec.drumDetail>.9&&['trap','drill'].includes(styleSpec.rhythm)?.125:0));for(let x=0;x<4;x+=step){if(rand()<Math.min(.98,.62+spec.drumDetail*.35*styleSpec.density))events.drums.push({t:t0+x*beat+jitter(rand,spec.humanize),kind:'hat',gain:.18*sectionGain*(x%1===0?1.2:1)})}
   }
   if(!styleSpec.noBass&&sec.name!=='intro')for(let i=0;i<rhy.bass.length;i++){const x=rhy.bass[i],slide=spec.bassDetail>.85&&['trap','drill','amapiano'].includes(styleSpec.rhythm)&&i===rhy.bass.length-1?-3:0;events.bass.push({t:t0+(x+(i%2?rhy.swing*.5:0))*beat,d:beat*.72,note:barRoot+(i%3===2?7:0),slide,gain:.58*sectionGain,instrument:has(norm(style),'808')||['trap','drill'].includes(styleSpec.rhythm)?'synth_bass':'bass'})}
   if(sec.name!=='intro'){
     const grid=spec.melodyGrid,prob=(.28+spec.variation*.34)*styleSpec.density*(sec.name==='hook'?1.22:1);for(let s=0;s<grid;s++){if(rand()>prob)continue;const mi=(s+barIndex)%motif.length,scaleDeg=(rand()<.64?motif[mi]:harm.scale[Math.floor(rand()*harm.scale.length)]),oct=rand()>.86?12:0,note=barRoot+24+scaleDeg+oct;events.melody.push({t:t0+(s/grid)*4*beat+jitter(rand,spec.humanize),d:beat*(styleSpec.lead==='oud'||styleSpec.lead==='bell'?.42:.58),note,gain:.42*sectionGain,instrument:styleSpec.lead,section:sec.name});if(spec.ornaments&&rand()<.05*spec.ornaments)events.melody.push({t:t0+(s/grid)*4*beat+beat*.12,d:beat*.18,note:note+(styleSpec.harmony==='hijaz'?1:2),gain:.24*sectionGain,instrument:styleSpec.lead,section:sec.name})}
   }
   if(sec.name==='build'&&local===sec.bars-1&&spec.transitionDetail>.55)events.fx.push({t:t0+barSec*.75,kind:'riser',d:barSec*.25,gain:.24*sectionGain});
  }}
 return{engine:'Nova Core',version:'5.1',model,style:styleSpec,tempo,energy:Number(energy),duration:actualDuration,barSeconds:barSec,bars:totalBars,root,scale:harm.scale,progression:harm.prog,sections,events,quality:spec,seed:hash([style,prompt,model].join('|')),ownership:{styleUnderstanding:'Nova',composition:'Nova',arrangement:'Nova',eventTiming:'Nova',externalRole:'instrument timbre samples only'}}
}
window.NovaCore={plan,parseStyle,MODEL,RHYTHMS,HARMONY};
})();