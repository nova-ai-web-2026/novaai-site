(() => {
  'use strict';

  const errorBox = document.getElementById('errorBox');

  function fail(message, err) {
    console.error(message, err || '');
    if (errorBox) {
      errorBox.style.display = 'block';
      errorBox.textContent = message + (err?.message ? ': ' + err.message : '');
    }
  }

  function replaceOrThrow(source, pattern, replacement, label) {
    const next = source.replace(pattern, replacement);
    if (next === source) throw new Error('V5 patch target missing: ' + label);
    return next;
  }

  async function boot() {
    try {
      const response = await fetch('game.js', { cache: 'no-store' });
      if (!response.ok) throw new Error('تعذر تحميل كود اللعبة الأصلي');
      let source = await response.text();

      source = replaceOrThrow(
        source,
        /  function updateVehicles\(dt\)\{[\s\S]*?\n  function nearestRoad/,
`  function updateVehicles(dt){
    for(const v of world.vehicles){
      if(v.vertical){
        v.root.position.z+=v.speed*v.dir*dt;
        if(v.root.position.z>101){v.root.position.z=101;v.dir=-1;}
        else if(v.root.position.z<-101){v.root.position.z=-101;v.dir=1;}
        v.root.rotation.y=v.dir>0?Math.PI:0;
      }else{
        v.root.position.x+=v.speed*v.dir*dt;
        if(v.root.position.x>101){v.root.position.x=101;v.dir=-1;}
        else if(v.root.position.x<-101){v.root.position.x=-101;v.dir=1;}
        v.root.rotation.y=v.dir>0?-Math.PI/2:Math.PI/2;
      }
    }
  }
  function nearestRoad`,
        'vehicle continuity'
      );

      source = replaceOrThrow(
        source,
        /  function updatePeople\(dt\)\{[\s\S]*?\n\n  function itemPos/,
`  function updatePeople(dt){
    for(let i=0;i<world.people.length;i++){
      const p=world.people[i];
      if(p.lane===undefined){
        const side=(Math.floor(i/2)%2===0?1:-1)*6.8;
        p.lane=p.axis===0?nearestRoad(p.root.position.z)+side:nearestRoad(p.root.position.x)+side;
      }
      p.phase+=.08*dt;
      const sw=Math.sin(p.phase*5)*.38;
      p.legL.rotation.x=sw;p.legR.rotation.x=-sw;p.armL.rotation.x=-sw*.62;p.armR.rotation.x=sw*.62;
      if(p.axis===0){
        p.root.position.x+=p.speed*p.dir*dt;
        p.root.position.z=p.lane;
        if(p.root.position.x>100){p.root.position.x=100;p.dir=-1;}
        else if(p.root.position.x<-100){p.root.position.x=-100;p.dir=1;}
        p.root.rotation.y=p.dir>0?Math.PI/2:-Math.PI/2;
      }else{
        p.root.position.z+=p.speed*p.dir*dt;
        p.root.position.x=p.lane;
        if(p.root.position.z>100){p.root.position.z=100;p.dir=-1;}
        else if(p.root.position.z<-100){p.root.position.z=-100;p.dir=1;}
        p.root.rotation.y=p.dir>0?0:Math.PI;
      }
    }
  }

  function itemPos`,
        'pedestrian continuity'
      );

      source = replaceOrThrow(
        source,
        /  function startAudio\(\)\{[\s\S]*?\n\n  window\.__egyptDebug=/,
`  function startAudio(){
    if(!audio.enabled)return;
    try{
      if(!audio.ctx){
        const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
        audio.ctx=new AC();
        audio.master=audio.ctx.createGain();
        audio.master.gain.value=.16;
        audio.master.connect(audio.ctx.destination);

        const len=audio.ctx.sampleRate*4,buf=audio.ctx.createBuffer(1,len,audio.ctx.sampleRate),data=buf.getChannelData(0);
        let brown=0;
        for(let i=0;i<len;i++){
          const white=Math.random()*2-1;
          brown=brown*.985+white*.015;
          data[i]=brown*.55;
        }
        const traffic=audio.ctx.createBufferSource(),lp=audio.ctx.createBiquadFilter(),g=audio.ctx.createGain();
        traffic.buffer=buf;traffic.loop=true;lp.type='lowpass';lp.frequency.value=260;lp.Q.value=.45;g.gain.value=.055;
        traffic.connect(lp);lp.connect(g);g.connect(audio.master);traffic.start();audio.noise=traffic;
        audio.hum=null;
      }
      audio.ctx.resume();
      nextHorn=performance.now()+6500+Math.random()*5000;
    }catch(e){console.warn('Audio unavailable',e);}
  }
  function toggleAudio(){audio.enabled=!audio.enabled;if(audio.master)audio.master.gain.value=audio.enabled?.16:0;if(audio.enabled)startAudio();updateHUD();showToast(audio.enabled?'الصوت اشتغل 🔊':'الصوت اتكتم 🔇');}
  function tone(freq,dur=.12,vol=.025,type='sine',delay=0){
    if(!audio.enabled||!audio.ctx||!audio.master)return;
    const t=audio.ctx.currentTime+delay,o=audio.ctx.createOscillator(),g=audio.ctx.createGain(),f=audio.ctx.createBiquadFilter();
    o.type=type;o.frequency.setValueAtTime(freq,t);f.type='lowpass';f.frequency.value=950;f.Q.value=.35;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.018);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(f);f.connect(g);g.connect(audio.master);o.start(t);o.stop(t+dur+.04);
  }
  function playHorn(){tone(205,.16,.024,'triangle');tone(245,.13,.014,'sine',.025);}
  function playStep(){
    if(!audio.enabled||!audio.ctx||!audio.master)return;
    const len=Math.floor(audio.ctx.sampleRate*.032),buf=audio.ctx.createBuffer(1,len,audio.ctx.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);
    const s=audio.ctx.createBufferSource(),g=audio.ctx.createGain(),f=audio.ctx.createBiquadFilter();s.buffer=buf;f.type='lowpass';f.frequency.value=260;g.gain.value=.025;s.connect(f);f.connect(g);g.connect(audio.master);s.start();
  }
  function playInteract(){tone(410,.06,.018,'triangle');}
  function playBuy(){tone(520,.055,.018,'sine');tone(650,.065,.014,'sine',.06);}
  function updateAudio(){
    if(!audio.enabled||!audio.ctx)return;
    const now=performance.now();
    if(now>nextHorn){
      let nearest=999;for(const v of world.vehicles)nearest=Math.min(nearest,Math.hypot(v.root.position.x-camera.position.x,v.root.position.z-camera.position.z));
      if(nearest<32&&Math.random()>.35)playHorn();
      nextHorn=now+8000+Math.random()*10000;
    }
  }

  window.__egyptDebug=`,
        'audio mix'
      );

      source += `\n//# sourceURL=game-v5-patched-core.js`;
      (0, eval)(source);

      window.__V5_PATCH = { version: 5, pedestrians: 'continuous-lanes', vehicles: 'continuous-turnaround', audio: 'soft-city-mix' };
      if (window.__egyptDebug) {
        window.__egyptDebug.v5State = () => ({...window.__V5_PATCH});
      }

      const kicker=document.querySelector('.kicker');
      if(kicker)kicker.textContent='EGYPTIAN OPEN-WORLD LIFE SIMULATOR — V5';
    } catch (err) {
      fail('V5 ما اشتغلتش بالشكل المطلوب', err);
    }
  }

  boot();
})();
