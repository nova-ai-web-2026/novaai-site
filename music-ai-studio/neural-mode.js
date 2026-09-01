(()=>{
'use strict';
const $=s=>document.querySelector(s);
function load(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Failed to load '+src));document.head.appendChild(s)})}
async function boot(){
 const sideTitle=$('.sideCard b'),sideText=$('.sideCard p'),footer=$('.sideFooter'),heroEye=$('.heroCopy .eyebrow'),heroTitle=$('.heroCopy h3'),heroText=$('.heroCopy p'),renderHead=$('.renderPanel .sectionHead span');
 if(sideTitle)sideTitle.textContent='Nova-owned Hybrid engine';
 if(sideText)sideText.textContent='Nova understands the Style, writes the notes, rhythm, chords, bass, melody and sections. External audio is used only for instrument timbre samples.';
 if(footer)footer.textContent='Nova Studio V5.2 · Nova composition + sampled timbres';
 if(heroEye)heroEye.textContent='Nova Studio V5.2';
 if(heroTitle)heroTitle.textContent='Nova writes the music. External samples only improve the sound.';
 if(heroText)heroText.textContent='Style understanding, composition, arrangement and timing come from Nova Core. FluidR3 samples can replace oscillator timbres for piano, guitar, strings and other instruments without changing Nova’s notes.';
 if(renderHead)renderHead.textContent='Nova Core · sample-assisted renderer';
 const gen=$('#generate');if(gen)gen.textContent='✦ Generate Nova track';
 const info=$('#trackInfo');if(info)info.textContent='Nova Blueprint and renderer details will appear here.';
 try{
   if(!window.Soundfont)await load('https://cdn.jsdelivr.net/npm/soundfont-player@0.12.0/dist/soundfont-player.min.js');
   await load('./nova-core.js');
   await load('./nova-directives.js');
   await load('./nova-renderer.js');
   await load('./hybrid-mode.js');
   const status=$('#status');if(status){status.textContent='Nova Core ready.';status.className='inlineStatus ok'}
 }catch(e){console.error(e);const status=$('#status');if(status){status.textContent='Nova Core load failed: '+e.message;status.className='inlineStatus bad'}}
}
boot();
})();