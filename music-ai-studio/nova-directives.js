(()=>{
'use strict';
if(!window.NovaCore)return;
function detectCue(style){const low=String(style||'').toLowerCase();for(const [name,p] of Object.entries(NovaCore.RHYTHMS||{})){for(const alias of p.aliases||[]){if(low.includes(alias+' drums')||low.includes(alias+' drum')||low.includes(alias+' beat')||low.includes(alias+' rhythm')||low.includes(alias+' groove')||low.includes('drums '+alias)||low.includes('beat '+alias)||low.includes('rhythm '+alias))return name}}return null}
function expand(style){const raw=String(style||''),cue=detectCue(raw);if(!cue)return raw;const aliases=(NovaCore.RHYTHMS[cue]?.aliases||[]).join(' | ');return raw+' | RHYTHM PRIORITY '+aliases}
const originalPlan=NovaCore.plan,originalParse=NovaCore.parseStyle;
NovaCore.plan=args=>{const raw=args?.style||'',cue=detectCue(raw),bp=originalPlan({...args,style:expand(raw)});bp.style.raw=raw;bp.style.rhythmDirective=cue;return bp};
NovaCore.parseStyle=(style,prompt)=>{const raw=style||'',out=originalParse(expand(raw),prompt);out.raw=raw;out.rhythmDirective=detectCue(raw);return out};
window.NovaCore.expandStyleDirectives=expand;
window.NovaCore.detectRhythmDirective=detectCue;
})();