(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const modelMetrics={
 '1.0':[84,76,74,70,78],
 '1.5':[91,92,88,86,88],
 '1.5+':[97,97,97,96,97]
};
let currentObjectUrl=null,currentBlob=null,currentProvider=null;
function activeModel(){return $('.model.active')?.dataset.model||'1.0'}
function setStatus(text,kind=''){const el=$('#status');if(!el)return;el.textContent=text;el.className='inlineStatus'+(kind?' '+kind:'')}
function setProgress(v){const el=$('#renderProgress');if(el)el.style.width=v+'%'}
function setMetrics(model){const vals=modelMetrics[model]||modelMetrics['1.0'];['m1','m2','m3','m4','m5'].forEach((id,i)=>{const e=$('#'+id);if(e)e.textContent=vals[i]+'%'})}
function base64Blob(base64,mime){const raw=atob(base64),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Blob([bytes],{type:mime||'audio/mpeg'})}
async function generateNeural(){
 const style=$('#style')?.value.trim()||'',prompt=$('#prompt')?.value.trim()||'';
 if(!style&&!prompt){setStatus('Add a Style or song idea first.','bad');return}
 const model=activeModel(),button=$('#generate');button.disabled=true;$('#render')?.classList.add('show');setProgress(12);setStatus('Sending Style to neural music engine…');
 const payload={model,prompt,style,lyrics:$('#lyrics')?.value||'',duration:Number($('#length')?.value||20),bpm:Number($('#bpm')?.value||118),energy:Number($('#energy')?.value||76),voiceProfile:Boolean(localStorage.getItem('novaVoiceV4')||localStorage.getItem('novaVoiceV3'))};
 try{
  const r=await fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  const d=await r.json().catch(()=>({error:'Invalid provider response'}));
  if(!r.ok||!d.configured||d.mode!=='production-provider'){
   if(currentObjectUrl)URL.revokeObjectURL(currentObjectUrl);currentObjectUrl=null;currentBlob=null;currentProvider=null;$('#player').removeAttribute('src');$('#player').load();$('#download').disabled=true;setProgress(0);
   const why=d.message||d.error||'Neural music provider is not connected.';
   setStatus('Neural Style engine unavailable — local fake-style fallback is disabled.','bad');
   $('#trackTitle').textContent='Neural Music not connected';
   $('#trackInfo').textContent=why+' Add STABILITY_API_KEY on the deployed server to generate music that actually follows free-form Style.';
   return;
  }
  setProgress(82);
  if(currentObjectUrl)URL.revokeObjectURL(currentObjectUrl);
  if(d.audioBase64){currentBlob=base64Blob(d.audioBase64,d.mimeType||'audio/mpeg');currentObjectUrl=URL.createObjectURL(currentBlob);$('#player').src=currentObjectUrl}
  else if(d.audioUrl){currentBlob=null;currentObjectUrl=null;$('#player').src=d.audioUrl}
  else throw new Error('Provider returned no audio');
  currentProvider=d.provider||'neural-music';$('#download').disabled=false;$('#trackTitle').textContent='Nova '+model+' · Neural Music';$('#trackInfo').textContent=(d.duration||payload.duration)+' sec · '+currentProvider+' · Style priority: '+style;setMetrics(model);setProgress(100);setStatus('Neural generation complete · '+currentProvider,'ok');
 }catch(e){console.error(e);setProgress(0);setStatus('Neural generation failed.','bad');$('#trackTitle').textContent='Generation failed';$('#trackInfo').textContent=e.message}
 finally{button.disabled=false}
}
const oldGenerate=$('#generate');if(oldGenerate){const fresh=oldGenerate.cloneNode(true);oldGenerate.replaceWith(fresh);fresh.addEventListener('click',generateNeural)}
const oldDownload=$('#download');if(oldDownload){const fresh=oldDownload.cloneNode(true);oldDownload.replaceWith(fresh);fresh.addEventListener('click',()=>{if(currentBlob&&currentObjectUrl){const a=document.createElement('a');a.href=currentObjectUrl;a.download='nova-'+activeModel()+'-neural.mp3';a.click()}else if($('#player')?.src){window.open($('#player').src,'_blank')}})}
window.__novaNeuralMode={generate:generateNeural,activeModel};
})();
