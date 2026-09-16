from pathlib import Path

p=Path("music-ai/models-v2.js")
s=p.read_text()

start=s.index("const humanTime=(r,a)=>(r()-.5)*a;")
end=s.index("function smoothEdges(buffer)")

new=r"""const humanTime=(r,a)=>(r()-.5)*a;
const STYLE_MOTIF={trap:[0,null,2,null,1,null,0,null],pop:[0,1,2,1,3,2,1,0],lofi:[0,null,2,null,null,1,null,null],edm:[0,2,1,3,2,4,3,1],cinematic:[0,null,null,2,null,null,1,null]};
function sectionName(phase){if(phase<.12)return'intro';if(phase<.38)return'verse';if(phase<.62)return'chorus';if(phase<.74)return'break';if(phase<.92)return'chorus';return'outro'}
function sectionGain(section){return section==='intro'?.58:section==='verse'?.82:section==='chorus'?1:section==='break'?.62:.48}
function instrumentNote(ctx,dest,t,dur,freq,gain,pan,style){
  const main=ctx.createOscillator(),harm=ctx.createOscillator(),g=ctx.createGain(),hg=ctx.createGain(),f=ctx.createBiquadFilter(),p=panNode(ctx,pan);
  const wave=style==='cinematic'?'sine':style==='lofi'?'triangle':style==='edm'?'triangle':'sine';
  main.type=wave;harm.type=style==='edm'?'sawtooth':'triangle';main.frequency.value=freq;harm.frequency.value=freq*2;
  f.type='lowpass';f.frequency.value=style==='lofi'?2200:style==='trap'?3000:style==='cinematic'?3600:style==='pop'?5200:6200;f.Q.value=.55;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  hg.gain.setValueAtTime(.0001,t);hg.gain.exponentialRampToValueAtTime(Math.max(.0002,gain*(style==='edm'?.15:.08)),t+.015);hg.gain.exponentialRampToValueAtTime(.0001,t+Math.min(dur,.22));
  main.connect(g);harm.connect(hg);g.connect(f);hg.connect(f);f.connect(p);p.connect(dest);main.start(t);harm.start(t);main.stop(t+dur+.03);harm.stop(t+Math.min(dur,.24)+.03)
}
async function renderTrack(opts){
  const model=MODELS[opts.model],style=STYLE[opts.style],mood=MOOD[opts.mood],rate=model.rate,channels=model.channels,frames=Math.ceil(opts.duration*rate),Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext,ctx=new Offline(channels,frames,rate),bus=createBus(ctx,opts.model),r=rng(opts.seed),beat=60/style.bpm,bar=beat*4,base=48+mood.root,prog=mood.prog,scale=mood.scale,end=opts.duration-.15,motif=STYLE_MOTIF[opts.style];

  for(let bt=0,barIdx=0;bt<end;bt+=bar,barIdx++){
    const phase=bt/opts.duration,section=sectionName(phase),sg=sectionGain(section),deg=prog[barIdx%prog.length]%scale.length,notes=chordNotes(base,scale,deg,opts.model==='ultra'&&opts.style!=='trap');
    const chordAmp=(opts.model==='lite'?.038:opts.model==='studio'?.048:.054)*style.chord*mood.chord*sg;
    const playChord=(st,dur,amp)=>notes.forEach((n,i)=>{const pn=channels===1?0:(i-(notes.length-1)/2)*.16;tone(ctx,bus,Math.max(0,st),Math.min(dur,end-st),midi(n),style.chordWave,amp/notes.length,pn,opts.model==='ultra'?(i%2?3:-3):0,style.chordCut)});
    if(opts.style==='edm'){
      if(section!=='intro'&&section!=='outro')for(let q=0;q<4;q++)playChord(bt+(q+.5)*beat,beat*.34,chordAmp*1.08);
      else playChord(bt,Math.min(bar*.94,end-bt),chordAmp*.72);
    }else if(opts.style==='trap'){
      playChord(bt,Math.min(beat*1.35,end-bt),chordAmp*.88);
      if(section==='chorus')playChord(bt+beat*2.5,Math.min(beat*.8,end-(bt+beat*2.5)),chordAmp*.68);
    }else if(opts.style==='pop'){
      playChord(bt,Math.min(beat*1.85,end-bt),chordAmp);
      playChord(bt+beat*2,Math.min(beat*1.8,end-(bt+beat*2)),chordAmp*.94);
    }else if(opts.style==='lofi'){
      playChord(bt,Math.min(bar*.92,end-bt),chordAmp*.86);
    }else{
      playChord(bt,Math.min(bar*.97,end-bt),chordAmp*1.06);
      if(opts.model==='ultra'&&section==='chorus')notes.slice(0,3).forEach((n,i)=>tone(ctx,bus,bt+.02,Math.min(bar*.95,end-bt),midi(n-12),'sine',chordAmp/(notes.length*3),channels===1?0:(i-1)*.12,0,1100));
    }

    if(section!=='intro'&&section!=='outro'){
      const root=base-12+scale[deg],bassAmp=(opts.model==='lite'?.082:opts.model==='studio'?.088:.094)*style.bassGain*sg;
      const hits=opts.style==='trap'?[0,1.5,2.75,3.5]:opts.style==='pop'?[0,1,2,3]:opts.style==='lofi'?[0,2.5]:opts.style==='edm'?[.5,1.5,2.5,3.5]:[0,2];
      hits.forEach((q,idx)=>{const st=bt+q*beat;if(st>=end)return;const len=opts.style==='cinematic'?beat*1.55:opts.style==='lofi'?beat*.9:opts.style==='trap'?(idx===0?beat*.95:beat*.5):beat*.42;const note=(opts.style==='pop'&&idx===3)?root+7:root;tone(ctx,bus,Math.max(0,st+humanTime(r,model.human*.55)),Math.min(len,end-st),midi(note),style.bass,bassAmp,0,0,style.bassCut);if(opts.model==='ultra'&&opts.style==='trap')tone(ctx,bus,st,Math.min(len*.95,end-st),midi(root-12),'sine',bassAmp*.35,0,0,320)});
    }

    if(section!=='intro'){
      const kickBase=(opts.model==='ultra'?.58:.52)*style.kickGain*sg,snBase=(opts.model==='ultra'?.18:.16)*style.snareGain*sg;
      style.kick.forEach(q=>{const st=bt+q*beat;if(st<end&&section!=='break')kick(ctx,bus,Math.max(0,st+humanTime(r,model.human*.45)),kickBase)});
      style.snare.forEach(q=>{const st=bt+q*beat;if(st<end&&section!=='outro')snare(ctx,bus,Math.max(0,st+humanTime(r,model.human*.45)),snBase,channels===1?0:.03)});
      if(opts.model!=='lite'&&section!=='outro'&&section!=='break'){
        const step=opts.style==='trap'?beat/4:opts.style==='edm'||opts.style==='pop'?beat/2:opts.style==='lofi'?beat:bar;
        if(opts.style!=='cinematic')for(let st=bt,h=0;st<Math.min(bt+bar,end);st+=step,h++)hat(ctx,bus,Math.max(0,st+humanTime(r,model.human*.5)),style.hatGain*(section==='chorus'?1:.78),channels===1?0:(h%2?-.22:.22));
      }
      if(opts.model==='ultra'&&style.shaker&&section==='chorus')for(let q=.75;q<4;q+=1)shaker(ctx,bus,bt+q*beat,opts.style==='edm'?.016:.011,q%2?-.3:.3);
    }

    if(section==='verse'||section==='chorus'){
      const leadBase=(opts.model==='lite'?.047:opts.model==='studio'?.054:.059)*style.leadGain*mood.lead*(section==='chorus'?1:.78);
      const spacing=opts.style==='cinematic'?beat:opts.style==='lofi'?beat:beat/2;
      for(let m=0;m<8;m++){
        const off=motif[m];if(off===null)continue;if(opts.style==='trap'&&section==='verse'&&m%2===1)continue;
        const st=bt+m*spacing;if(st>=Math.min(bt+bar,end))break;
        const degree=(deg+off)%scale.length,oct=opts.style==='cinematic'?0:(opts.style==='edm'&&section==='chorus'&&m>=4?12:0),note=60+mood.root+scale[degree]+oct;
        const len=opts.style==='cinematic'?beat*.78:opts.style==='lofi'?beat*.58:opts.style==='trap'?beat*.28:beat*.34;
        instrumentNote(ctx,bus,Math.max(0,st+humanTime(r,model.human*.4)),Math.min(len,end-st),midi(note),leadBase,channels===1?0:((m%2?-.16:.16)*(section==='chorus'?1:.7)),opts.style);
      }
    }
  }

  const buffer=await ctx.startRendering();smoothEdges(buffer);normalizeBuffer(buffer,opts.model==='ultra'?.90:.87);return buffer
}
"""

s=s[:start]+new+s[end:]
p.write_text(s)

t=Path("music-ai/e2e.spec.js")
ts=t.read_text()
marker="test('mobile layout loads and model controls remain usable'"
extra="""test('all five styles expose clearly different tempo identities', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/music-ai/');
  const expected = { trap: '90', pop: '116', lofi: '78', edm: '128', cinematic: '84' };
  for (const [style, bpm] of Object.entries(expected)) {
    await page.selectOption('#style', style);
    await page.locator('#duration').evaluate(el => { el.value = '15'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('#generate');
    await expect(page.locator('#result')).toHaveClass(/show/, { timeout: 30000 });
    await expect(page.locator('#bpmSpec')).toHaveText(bpm);
  }
});

"""
if "all five styles expose clearly different tempo identities" not in ts:
    ts=ts.replace(marker,extra+marker,1)
    t.write_text(ts)
