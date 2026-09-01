(()=>{
'use strict';
if(!window.NovaCore)return;
const rhythmTerms=['trap','drill','edm','house','boom bap','hip hop','r&b','rnb','lofi','lo-fi','rock','afrobeat','afrobeats','reggaeton','dembow','amapiano','ballad','cinematic'];
function expand(style){let s=String(style||''),low=s.toLowerCase(),cue='';for(const term of rhythmTerms){if(low.includes(term+' drums')||low.includes(term+' drum')||low.includes(term+' beat')||low.includes(term+' rhythm')||low.includes(term+' groove')||low.includes('drums '+term)||low.includes('beat '+term)){cue=term;break}}return cue?s+' | rhythm priority: '+cue+' '+cue+' '+cue:s}
const originalPlan=NovaCore.plan,originalParse=NovaCore.parseStyle;
NovaCore.plan=args=>{const raw=args?.style||'',bp=originalPlan({...args,style:expand(raw)});bp.style.raw=raw;bp.style.rhythmDirective=expand(raw)!==raw?expand(raw).split('rhythm priority: ')[1]?.split(' ')[0]||null:null;return bp};
NovaCore.parseStyle=(style,prompt)=>{const out=originalParse(expand(style),prompt);out.raw=style||'';return out};
window.NovaCore.expandStyleDirectives=expand;
})();