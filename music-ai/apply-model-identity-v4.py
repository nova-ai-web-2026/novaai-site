from pathlib import Path

p=Path('music-ai/models-v2.js')
s=p.read_text()
start=s.index("const STYLE_MOTIF=")
end=s.index("function smoothEdges(buffer)")
new=r'''const STYLE_MOTIF={trap:[0,null,2,null,1,null,0,null],pop:[0,1,2,1,3,2,1,0],lofi:[0,null,2,null,null,1,null,null],edm:[0,2,1,3,2,4,3,1],cinematic:[0,null,null,2,null,null,1,null]};
const MODEL_PROFILE={
  lite:{chordVoices:3,chordGain:.74,bassGain:.78,drumGain:.76,leadGain:.68,leadDensity:.40,hatDensity:.50,stereo:0,sub:false,octave:false,ghost:false,counter:false,chorusLift:1.00,master:.84,label:'Essential mono arrangement'},
  studio:{chordVoices:3,chordGain:.94,bassGain:.94,drumGain:.92,leadGain:.90,leadDensity:.72,hatDensity:.78,stereo:.48,sub:false,octave:false,ghost:true,counter:false,chorusLift:1.09,master:.88,label:'Full stereo arrangement'},
  ultra:{chordVoices:4,chordGain:1.08,bassGain:1.04,drumGain:1.00,leadGain:1.02,leadDensity:1,hatDensity:1,stereo:1,sub:true,octave:true,ghost:true,counter:true,chorusLift:1.18,master:.91,label:'Layered wide arrangement'}
};
function sectionName(phase){if(phase<.12)return'intro';if(phase<.38)return'verse';if(phase<.62)return'chorus';if(phase<.74)return'break';if(phase<.92)return'chorus';return'outro'}
function sectionGain(section){return section==='intro'?.58:section==='verse'?.82:section==='chorus'?1:section==='break'?.62:.48}
function instrumentNote(ctx,dest,t,dur,freq,gain,pan,style,profile){
  const main=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter(),pn=panNode(ctx,pan);
  const wave=style==='cinematic'?'sine':style==='lofi'?'triangle':style==='edm'?'triangle':'sine';
  main.type=wave;main.frequency.value=freq;
  f.type='lowpass';f.frequency.value=(style==='lofi'?2200:style==='trap'?3000:style==='cinematic'?3600:style==='pop'?5200:6200)*(profile===MODEL_PROFILE.lite?.78:profile===MODEL_PROFILE.studio?.92:1);f.Q.value=.55;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  main.connect(g);g.connect(f);f.connect(pn);pn.connect(dest);main.start(t);main.stop(t+dur+.03);
  if(profile!==MODEL_PROFILE.lite){
    const harm=ctx.createOscillator(),hg=ctx.createGain(),hp=panNode(ctx,-pan*.55);harm.type=style==='edm'?'sawtooth':'triangle';harm.frequency.value=freq*2;harm.detune.value=profile===MODEL_PROFILE.ultra?(pan>=0?4:-4):0;
    const hGain=gain*(profile===MODEL_PROFILE.ultra?.12:.055);hg.gain.setValueAtTime(.0001,t);hg.gain.exponentialRampToValueAtTime(Math.max(.0002,hGain),t+.015);hg.gain.exponentialRampToValueAtTime(.0001,t+Math.min(dur,.24));harm.connect(hg);hg.connect(hp);hp.connect(dest);harm.start(t);harm.stop(t+Math.min(dur,.26)+.03)
  }
}
async function renderTrack(opts){
  const model=MODELS[opts.model],profile=MODEL_PROFILE[opts.model],style=STYLE[opts.style],mood=MOOD[opts.mood],rate=model.rate,channels=model.channels,frames=Math.ceil(opts.duration*rate),Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext,ctx=new Offline(channels,frames,rate),bus=createBus(ctx,opts.model),r=rng(opts.seed),beat=60/style.bpm,bar=beat*4,base=48+mood.root,prog=mood.prog,scale=mood.scale,end=opts.duration-.15,motif=STYLE_MOTIF[opts.style];

  for(let bt=0,barIdx=0;bt<end;bt+=bar,barIdx++){
    const phase=bt/opts.duration,section=sectionName(phase),baseSection=sectionGain(section),sg=baseSection*(section==='chorus'?profile.chorusLift:1),deg=prog[barIdx%prog.length]%scale.length;
    let notes=chordNotes(base,scale,deg,opts.model==='ultra'&&opts.style!=='trap');notes=notes.slice(0,profile.chordVoices);
    const chordAmp=(opts.model==='lite'?.036:opts.model==='studio'?.048:.052)*style.chord*mood.chord*sg*profile.chordGain;
    const playChord=(st,dur,amp,wide=1)=>notes.forEach((n,i)=>{const pan=channels===1?0:(i-(notes.length-1)/2)*.17*profile.stereo*wide;tone(ctx,bus,Math.max(0,st),Math.max(.04,Math.min(dur,end-st)),midi(n),style.chordWave,amp/notes.length,pan,opts.model==='ultra'?(i%2?4:-4):0,style.chordCut);if(profile.octave&&section==='chorus'&&i<3)tone(ctx,bus,Math.max(0,st+.008),Math.max(.04,Math.min(dur*.92,end-st)),midi(n+12),'triangle',amp/(notes.length*5.2),-pan*.7,(i%2?-6:6),Math.min(5200,style.chordCut+1200))});

    if(opts.model==='lite'){
      if(opts.style==='edm'&&section!=='intro'&&section!=='outro'){playChord(bt+.5*beat,beat*.32,chordAmp);playChord(bt+2.5*beat,beat*.32,chordAmp*.88)}
      else if(opts.style==='pop'&&section==='chorus'){playChord(bt,beat*1.6,chordAmp);playChord(bt+2*beat,beat*1.4,chordAmp*.82)}
      else playChord(bt,Math.min(opts.style==='trap'?beat*1.25:bar*.88,end-bt),chordAmp*.92);
    }else if(opts.style==='edm'){
      if(section!=='intro'&&section!=='outro')for(let q=0;q<4;q++)playChord(bt+(q+.5)*beat,beat*.34,chordAmp*(opts.model==='ultra'?1.08:1));
      else playChord(bt,Math.min(bar*.94,end-bt),chordAmp*.72);
    }else if(opts.style==='trap'){
      playChord(bt,Math.min(beat*1.35,end-bt),chordAmp*.88);
      if(section==='chorus')playChord(bt+beat*2.5,Math.min(beat*.8,end-(bt+beat*2.5)),chordAmp*.68);
    }else if(opts.style==='pop'){
      playChord(bt,Math.min(beat*1.85,end-bt),chordAmp);playChord(bt+beat*2,Math.min(beat*1.8,end-(bt+beat*2)),chordAmp*.94);
    }else if(opts.style==='lofi')playChord(bt,Math.min(bar*.92,end-bt),chordAmp*.86);
    else{playChord(bt,Math.min(bar*.97,end-bt),chordAmp*1.06);if(profile.counter&&section==='chorus')notes.slice(0,3).forEach((n,i)=>tone(ctx,bus,bt+.02,Math.min(bar*.95,end-bt),midi(n-12),'sine',chordAmp/(notes.length*3.4),channels===1?0:(i-1)*.14,0,1100))}

    if(section!=='intro'&&section!=='outro'){
      const root=base-12+scale[deg],bassAmp=(opts.model==='lite'?.080:opts.model==='studio'?.088:.094)*style.bassGain*sg*profile.bassGain;
      let hits=opts.style==='trap'?[0,1.5,2.75,3.5]:opts.style==='pop'?[0,1,2,3]:opts.style==='lofi'?[0,2.5]:opts.style==='edm'?[.5,1.5,2.5,3.5]:[0,2];
      if(opts.model==='lite')hits=hits.filter((_,i)=>i%2===0);
      hits.forEach((q,idx)=>{const st=bt+q*beat;if(st>=end)return;const len=opts.style==='cinematic'?beat*1.55:opts.style==='lofi'?beat*.9:opts.style==='trap'?(idx===0?beat*.95:beat*.5):beat*.42;const note=(opts.style==='pop'&&idx===hits.length-1&&opts.model!=='lite')?root+7:root;tone(ctx,bus,Math.max(0,st+humanTime(r,model.human*.45)),Math.min(len,end-st),midi(note),style.bass,bassAmp,0,0,style.bassCut);if(profile.sub&&opts.style!=='cinematic')tone(ctx,bus,Math.max(0,st+.004),Math.min(len*.94,end-st),midi(root-12),'sine',bassAmp*(opts.style==='trap'?.38:.24),0,0,340)});
    }

    if(section!=='intro'){
      const kickBase=(opts.model==='ultra'?.58:opts.model==='studio'?.53:.47)*style.kickGain*sg*profile.drumGain,snBase=(opts.model==='ultra'?.18:opts.model==='studio'?.165:.145)*style.snareGain*sg*profile.drumGain;
      style.kick.forEach((q,i)=>{if(opts.model==='lite'&&i>1)return;const st=bt+q*beat;if(st<end&&section!=='break')kick(ctx,bus,Math.max(0,st+humanTime(r,model.human*.38)),kickBase)});
      style.snare.forEach((q,i)=>{if(opts.model==='lite'&&i>0)return;const st=bt+q*beat;if(st<end&&section!=='outro')snare(ctx,bus,Math.max(0,st+humanTime(r,model.human*.38)),snBase,channels===1?0:.035*profile.stereo)});
      if(opts.model!=='lite'&&section!=='outro'&&section!=='break'){
        const stepBase=opts.style==='trap'?beat/4:opts.style==='edm'||opts.style==='pop'?beat/2:opts.style==='lofi'?beat:bar,step=stepBase/profile.hatDensity;
        if(opts.style!=='cinematic')for(let st=bt,h=0;st<Math.min(bt+bar,end);st+=step,h++)hat(ctx,bus,Math.max(0,st+humanTime(r,model.human*.42)),style.hatGain*(section==='chorus'?1:.76)*(opts.model==='studio'?.84:1),channels===1?0:(h%2?-.24:.24)*profile.stereo);
      }
      if(opts.model==='lite'&&opts.style!=='cinematic'&&opts.style!=='lofi'&&section==='chorus')for(let st=bt,h=0;st<Math.min(bt+bar,end);st+=beat,h++)hat(ctx,bus,st,style.hatGain*.48,0);
      if(profile.ghost&&section==='chorus'&&opts.style!=='cinematic'&&opts.style!=='lofi'&&bt+3.75*beat<end)snare(ctx,bus,bt+3.75*beat,snBase*(opts.model==='ultra'?.28:.16),channels===1?0:-.12*profile.stereo);
      if(opts.model==='ultra'&&style.shaker&&section==='chorus')for(let q=.75;q<4;q+=1)shaker(ctx,bus,bt+q*beat,opts.style==='edm'?.016:.011,q%2?-.34:.34);
    }

    if(section==='verse'||section==='chorus'){
      const leadBase=(opts.model==='lite'?.044:opts.model==='studio'?.054:.058)*style.leadGain*mood.lead*(section==='chorus'?1:.78)*profile.leadGain;
      const spacing=opts.style==='cinematic'?beat:opts.style==='lofi'?beat:beat/2;
      for(let m=0;m<8;m++){
        const off=motif[m];if(off===null)continue;
        if(opts.model==='lite'&&m%4!==0)continue;if(opts.model==='studio'&&m%2===1&&r()>.45)continue;if(profile.leadDensity<1&&r()>profile.leadDensity+.2)continue;
        const st=bt+m*spacing;if(st>=Math.min(bt+bar,end))break;
        const degree=(deg+off)%scale.length,oct=opts.style==='cinematic'?0:(opts.style==='edm'&&section==='chorus'&&m>=4&&opts.model!=='lite'?12:0),note=60+mood.root+scale[degree]+oct;
        const len=opts.style==='cinematic'?beat*.78:opts.style==='lofi'?beat*.58:opts.style==='trap'?beat*.28:beat*.34,pan=channels===1?0:((m%2?-.18:.18)*(section==='chorus'?1:.7)*profile.stereo);
        instrumentNote(ctx,bus,Math.max(0,st+humanTime(r,model.human*.34)),Math.min(len,end-st),midi(note),leadBase,pan,opts.style,profile);
        if(profile.counter&&section==='chorus'&&(m===2||m===6)){const cdeg=(degree+2)%scale.length,cNote=60+mood.root+scale[cdeg]-12;instrumentNote(ctx,bus,st+beat*.18,Math.min(len*.78,end-st),midi(cNote),leadBase*.30,-pan*.75,opts.style,profile)}
      }
    }
  }

  const buffer=await ctx.startRendering();smoothEdges(buffer);normalizeBuffer(buffer,profile.master);return buffer
}
'''
s=s[:start]+new+s[end:]
p.write_text(s)

# Add a stronger regression that renders the same musical brief with all 3 models.
t=Path('music-ai/e2e.spec.js')
ts=t.read_text()
marker="test('built-in audio self test reports non-silent Ultra 3 render'"
extra="""test('same brief renders three materially different model outputs', async ({ page }) => {\n  test.setTimeout(60000);\n  await page.goto('http://127.0.0.1:4173/music-ai/');\n  await page.fill('#prompt', 'نفس الاختبار للموديلات الثلاثة');\n  await page.selectOption('#style', 'pop');\n  await page.selectOption('#mood', 'uplifting');\n  await page.locator('#duration').evaluate(el => { el.value = '15'; el.dispatchEvent(new Event('input', { bubbles: true })); });\n  const outputs = [];\n  for (const model of ['lite','studio','ultra']) {\n    await page.click(`[data-nb2-model=\\"${model}\\"]`);\n    await page.click('#generate');\n    await expect(page.locator('#result')).toHaveClass(/show/, { timeout: 30000 });\n    outputs.push({\n      src: await page.locator('#audio').getAttribute('src'),\n      rate: await page.locator('#nb2RateSpec').textContent(),\n      mix: await page.locator('#nb2MixSpec').textContent(),\n      meta: await page.locator('#trackMeta').textContent()\n    });\n  }\n  expect(new Set(outputs.map(x => x.src)).size).toBe(3);\n  expect(outputs.map(x => x.rate)).toEqual(['24 kHz','44.1 kHz','48 kHz']);\n  expect(new Set(outputs.map(x => x.mix)).size).toBe(3);\n  expect(outputs[0].meta).toContain('Nova Lite 1');\n  expect(outputs[1].meta).toContain('Nova Studio 2');\n  expect(outputs[2].meta).toContain('Nova Ultra 3');\n});\n\n"""
if "same brief renders three materially different model outputs" not in ts:
    ts=ts.replace(marker,extra+marker,1)
    t.write_text(ts)
