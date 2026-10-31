/* NOVA Local Quick Tasks — source-grounded summaries, no model, no API. */
(function(root,create){
 const api=create();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.NovaLocalTasks=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const STOPWORDS=new Set([
  'the','and','is','are','a','an','to','of','in','on','for','that','this',
  'with','as','it','at','was','were','from','be','by','which','or','into',
  'can','has','have','had','about','their','they','its','will','than','also',
  'من','في','على','عن','إلى','الى','هذا','هذه','ذلك','التي','الذي','الذين',
  'كان','كانت','هو','هي','أن','إن','لكن','مع','بأن','بعد','قبل','حيث',
  'بعض','لقد','لها','له','تم','قد','أو','او','ثم','عند','كل','أكثر','بسبب'
 ]);
 const WORD=/[\p{L}\p{N}]+/gu;
 function tokenize(sentence){
  return (String(sentence).toLocaleLowerCase().match(WORD)||[])
   .filter(w=>w.length>=3&&!STOPWORDS.has(w)).slice(0,140);
 }
 function extractSource(text){
  let source=String(text||'').trim();
  if(source.length>6000)source=source.slice(0,6000);
  const gap=source.indexOf('\n\n');
  if(gap>=0&&gap<260)source=source.slice(gap+2).trim();
  else{
   const intro=source.match(/^\s*(?:لخّص|لخص|تلخيص|summari[sz]e|summary)(?:\s+.{0,110})?[:：]\s*([\s\S]+)$/i);
   if(intro)source=intro[1].trim();
  }
  return source;
 }
 function sentenceSplit(text){
  const arr=[];
  for(const line of String(text).replace(/\r/g,'').split(/\n+/)){
   for(const sentence of line.split(/(?<=[.!?؟؛])\s+/u)){
    const clean=sentence.trim();
    if(clean.length>18&&clean.length<950)arr.push(clean);
    else if(clean.length>=950){
     for(let k=0;k<clean.length;k+=320){
      const part=clean.slice(k,k+320).trim();
      if(part.length>18)arr.push(part);
     }
    }
   }
  }
  return arr;
 }
 function summarize(text,maxSentences=4){
  const source=extractSource(text);
  if(source.length<100)return null;
  const sentences=sentenceSplit(source);
  if(sentences.length<2)return null;
  const freq=new Map();
  for(const sentence of sentences)for(const term of tokenize(sentence))
   freq.set(term,(freq.get(term)||0)+1);
  const target=Math.min(Math.max(2,Math.floor(maxSentences)||4),sentences.length,
   Math.max(2,Math.ceil(sentences.length*.42)));
  const scored=sentences.map((text,index)=>{
   const words=tokenize(text),unique=new Set(words);
   let relevance=0;
   for(const w of unique)relevance+=Math.min(5,freq.get(w)||0);
   const score=relevance/Math.sqrt(words.length+3)+
    (index===0?1.4:0)+(index===sentences.length-1?0.35:0)-
    (text.length>430?1:0);
   return {text,index,score};
  });
  scored.sort((a,b)=>b.score-a.score||a.index-b.index);
  const selected=[],seen=new Set();
  for(const item of scored){
   const norm=item.text.toLocaleLowerCase().replace(/\s+/g,' ').slice(0,240);
   if(seen.has(norm))continue;
   seen.add(norm);selected.push(item);
   if(selected.length>=target)break;
  }
  selected.sort((a,b)=>a.index-b.index);
  const excerpts=selected.map(x=>x.text.slice(0,440));
  if(excerpts.length<2)return null;
  return {text:excerpts.map(x=>'• '+x).join('\n'),sentences:excerpts,
   kind:'extractive-summary',sourceChars:source.length,originalSentences:sentences.length};
 }
 function tryQuickSummary(prompt,task){
   // Explicit AI rewrite mode must never become a quick extractive answer.
   if(task==='summarise_ai')return null;
  const text=String(prompt||'');
  if(!['summarise','summary'].includes(task)&&
   !/^\s*(?:لخّص|لخص|تلخيص|summari[sz]e|summary)(?:\s|[:：])/iu.test(text))
   return null;
  return summarize(text,4);
 }
 return Object.freeze({summarize,tryQuickSummary,extractSource,sentenceSplit,tokenize});
});
