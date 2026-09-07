(() => {
  'use strict';

  const menu=document.getElementById('menu');
  const soundToggle=document.getElementById('soundToggle');
  if(!menu)return;

  let previewScene=null,previewCamera=null,gameCamera=null,previewHandle=null,previewTimer=null,menuObserver=null,previewActive=false;

  /*
   * V11.25 main-menu refresh.
   * Music is original synthesis: Egyptian maqsoum-style percussion + Hijaz/mizmar-inspired lead.
   * It never runs during gameplay. Menu button stings use a separate short-lived audio bus.
   */
  const SETTINGS_KEY='hayatMasr.menuAudio.v1125';
  const defaultSettings={enabled:true,mode:'interaction',volume:.78};
  let menuAudioSettings=loadAudioSettings();
  let musicCtx=null,musicMaster=null,uiMaster=null,musicTimer=null,noiseBuffer=null;
  let nextStepTime=0,musicStep=0,musicPlaying=false,musicUnlocked=false;
  const BPM=108, STEP=(60/BPM)/4;

  function loadAudioSettings(){
    try{
      const raw=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null');
      if(!raw||typeof raw!=='object')return {...defaultSettings};
      return {
        enabled:raw.enabled!==false,
        mode:raw.mode==='continuous'?'continuous':'interaction',
        volume:Number.isFinite(+raw.volume)?Math.max(.2,Math.min(1,+raw.volume)):.78
      };
    }catch(_){return {...defaultSettings};}
  }
  function saveAudioSettings(){
    try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(menuAudioSettings));}catch(_){}
    updateSettingsUI();updateMenuAudioBadge();syncMenuMusic();publish();
  }
  function globalMuted(){
    const text=soundToggle?.textContent||'';
    return text.includes('مكتوم')||text.includes('🔇');
  }
  function menuVisible(){
    const s=getComputedStyle(menu);
    return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0';
  }
  function gameStarted(){return document.body.classList.contains('game-started');}

  function ensureAudio(){
    if(musicCtx)return musicCtx;
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)return null;
    musicCtx=new Ctx();
    musicMaster=musicCtx.createGain();uiMaster=musicCtx.createGain();
    musicMaster.gain.value=.0001;uiMaster.gain.value=.0001;
    musicMaster.connect(musicCtx.destination);uiMaster.connect(musicCtx.destination);
    const n=Math.max(1,Math.floor(musicCtx.sampleRate*.12));
    noiseBuffer=musicCtx.createBuffer(1,n,musicCtx.sampleRate);
    const data=noiseBuffer.getChannelData(0);
    for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*(1-i/n);
    applyAudioVolume();
    return musicCtx;
  }
  function applyAudioVolume(){
    if(!musicCtx||!musicMaster||!uiMaster)return;
    const t=musicCtx.currentTime,vol=menuAudioSettings.volume;
    try{
      uiMaster.gain.cancelScheduledValues(t);uiMaster.gain.setTargetAtTime(.27*vol,t,.025);
      if(musicPlaying){musicMaster.gain.cancelScheduledValues(t);musicMaster.gain.setTargetAtTime(.20*vol,t,.06);}
    }catch(_){}
  }

  function makeGain(target,start,duration,bus,attack=.008){
    const g=musicCtx.createGain();g.gain.setValueAtTime(.0001,start);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002,target),start+attack);
    g.gain.exponentialRampToValueAtTime(.0001,start+duration);
    g.connect(bus);return g;
  }
  function tablaDum(start,vol=.13,bus=musicMaster){
    if(!musicCtx||!bus)return;
    const o=musicCtx.createOscillator(),g=makeGain(vol,start,.19,bus,.004);
    o.type='sine';o.frequency.setValueAtTime(165,start);o.frequency.exponentialRampToValueAtTime(62,start+.14);
    o.connect(g);o.start(start);o.stop(start+.20);
  }
  function tablaTek(start,vol=.055,bus=musicMaster){
    if(!musicCtx||!bus)return;
    const o=musicCtx.createOscillator(),g=makeGain(vol,start,.085,bus,.003);
    o.type='triangle';o.frequency.setValueAtTime(610,start);o.frequency.exponentialRampToValueAtTime(265,start+.065);
    o.connect(g);o.start(start);o.stop(start+.09);
    if(noiseBuffer){
      const src=musicCtx.createBufferSource(),hp=musicCtx.createBiquadFilter(),ng=makeGain(vol*.28,start,.045,bus,.002);
      src.buffer=noiseBuffer;hp.type='highpass';hp.frequency.value=1900;src.connect(hp);hp.connect(ng);src.start(start);src.stop(start+.05);
    }
  }
  function riq(start,vol=.024,bus=musicMaster){
    if(!musicCtx||!bus||!noiseBuffer)return;
    const src=musicCtx.createBufferSource(),hp=musicCtx.createBiquadFilter(),g=makeGain(vol,start,.055,bus,.002);
    src.buffer=noiseBuffer;hp.type='highpass';hp.frequency.value=2600;src.connect(hp);hp.connect(g);src.start(start);src.stop(start+.06);
    for(const f of [2100,2870,3620]){
      const o=musicCtx.createOscillator(),og=makeGain(vol*.15,start,.04,bus,.001);o.type='square';o.frequency.value=f;o.connect(og);o.start(start);o.stop(start+.045);
    }
  }
  function drone(freq,start,duration=.45,vol=.018,bus=musicMaster){
    if(!musicCtx||!bus)return;
    const o=musicCtx.createOscillator(),lp=musicCtx.createBiquadFilter(),g=makeGain(vol,start,duration,bus,.02);
    o.type='triangle';o.frequency.value=freq;lp.type='lowpass';lp.frequency.value=340;o.connect(lp);lp.connect(g);o.start(start);o.stop(start+duration+.02);
  }
  function mizmar(freq,start,duration=.18,vol=.024,bus=musicMaster,ornament=false){
    if(!musicCtx||!bus)return;
    const filter=musicCtx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=1250;filter.Q.value=1.35;
    const out=makeGain(vol,start,duration,bus,.012);filter.connect(out);
    const lfo=musicCtx.createOscillator(),lfoGain=musicCtx.createGain();lfo.frequency.value=6.1;lfoGain.gain.value=8.5;lfo.connect(lfoGain);
    for(const [type,detune,level] of [['sawtooth',-6,.50],['square',6,.25]]){
      const o=musicCtx.createOscillator(),g=musicCtx.createGain();o.type=type;o.frequency.value=freq;o.detune.value=detune;g.gain.value=level;lfoGain.connect(o.detune);o.connect(g);g.connect(filter);o.start(start);o.stop(start+duration+.025);
    }
    lfo.start(start);lfo.stop(start+duration+.025);
    if(ornament&&duration>.12){
      const grace=musicCtx.createOscillator(),gg=makeGain(vol*.28,start,.055,bus,.004);grace.type='square';grace.frequency.value=freq*.9439;grace.connect(gg);grace.start(start);grace.stop(start+.06);
    }
  }

  // D Hijaz: D, Eb, F#, G, A, Bb, C, D.
  const HIJAZ=[293.66,311.13,369.99,392.00,440.00,466.16,523.25,587.33];
  const melody=[0,1,2,3,2,0,2,4,3,2,1,0,4,5,4,3];
  function scheduleEgyptianStep(step,start){
    const s=step%32,beatStep=s%16;
    // Maqsoum-flavoured dum / tak / riq pattern.
    if([0,8].includes(beatStep))tablaDum(start,beatStep===0?.14:.115);
    if([4,6,12,14].includes(beatStep))tablaTek(start,[6,14].includes(beatStep)?.045:.06);
    if([2,10].includes(beatStep))riq(start,.026);
    if([7,15].includes(beatStep)){tablaTek(start,.035);riq(start+.018,.018);}
    if(beatStep===0)drone(s<16?73.42:110,start,STEP*4,.019);
    if(s%2===0){
      const idx=melody[(s/2)%melody.length];
      mizmar(HIJAZ[idx],start,s%8===0?.25:.17,s%8===0?.028:.021,musicMaster,[2,4].includes(idx));
    }
  }
  function scheduler(){
    if(!musicCtx||!musicPlaying)return;
    while(nextStepTime<musicCtx.currentTime+.55){
      scheduleEgyptianStep(musicStep,nextStepTime);nextStepTime+=STEP;musicStep=(musicStep+1)%32;
    }
  }
  async function unlockAudio(){
    const ctx=ensureAudio();if(!ctx)return false;
    try{if(ctx.state==='suspended')await ctx.resume();}catch(_){}
    musicUnlocked=ctx.state==='running';
    if(musicUnlocked&&menuAudioSettings.mode==='continuous')startMenuMusic();
    publish();return musicUnlocked;
  }
  async function startMenuMusic(){
    if(!menuAudioSettings.enabled||menuAudioSettings.mode!=='continuous'||globalMuted()||gameStarted()||!menuVisible())return false;
    const ctx=ensureAudio();if(!ctx)return false;
    try{if(ctx.state==='suspended')await ctx.resume();}catch(_){}
    if(ctx.state!=='running')return false;
    musicUnlocked=true;if(musicPlaying)return true;
    musicPlaying=true;musicStep=0;nextStepTime=ctx.currentTime+.035;
    const t=ctx.currentTime;musicMaster.gain.cancelScheduledValues(t);musicMaster.gain.setValueAtTime(.0001,t);musicMaster.gain.exponentialRampToValueAtTime(.20*menuAudioSettings.volume,t+.42);
    scheduler();musicTimer=setInterval(scheduler,90);updateMenuAudioBadge();publish();return true;
  }
  function stopMenuMusic(fade=.20){
    musicPlaying=false;if(musicTimer){clearInterval(musicTimer);musicTimer=null;}
    if(musicCtx&&musicMaster){const t=musicCtx.currentTime;try{musicMaster.gain.cancelScheduledValues(t);musicMaster.gain.setValueAtTime(Math.max(.0001,musicMaster.gain.value),t);musicMaster.gain.exponentialRampToValueAtTime(.0001,t+fade);}catch(_){}}
    updateMenuAudioBadge();publish();
  }
  function syncMenuMusic(){
    if(document.hidden||gameStarted()||!menuVisible()||globalMuted()||!menuAudioSettings.enabled||menuAudioSettings.mode!=='continuous')stopMenuMusic(.16);
    else if(musicUnlocked)startMenuMusic();
  }

  function playButtonSting(kind='ui'){
    if(!menuAudioSettings.enabled||globalMuted()||gameStarted())return;
    unlockAudio().then(ok=>{
      if(!ok||!musicCtx||!uiMaster)return;
      const t=musicCtx.currentTime+.008;
      const phrases={
        new:[0,2,3,4],continue:[4,3,2,1,0],settings:[0,1,2,3],reset:[0,1,0],ui:[0,2,1]
      };
      const notes=phrases[kind]||phrases.ui;
      tablaDum(t,.075,uiMaster);riq(t+.06,.018,uiMaster);
      notes.forEach((idx,i)=>mizmar(HIJAZ[idx],t+.07+i*.085,i===notes.length-1?.17:.10,.055,uiMaster,i===1));
    });
  }
  function playEgyptianPreview(){
    if(!menuAudioSettings.enabled)return;
    unlockAudio().then(ok=>{
      if(!ok||!musicCtx||!uiMaster)return;
      const t=musicCtx.currentTime+.02;
      [0,.50,1.0,1.50].forEach((beatOffset,i)=>tablaDum(t+beatOffset*.28,i===0?.10:.07,uiMaster));
      [0,1,2,3,2,4,3,2,1,0].forEach((idx,i)=>mizmar(HIJAZ[idx],t+.04+i*.105,.13,.043,uiMaster,[1,2,4].includes(idx)));
      [2,4,6,8].forEach(i=>tablaTek(t+i*.105,.035,uiMaster));
    });
  }

  function installStyle(){
    if(document.getElementById('v1125-menu-style'))return;
    document.getElementById('v1112-ui-style')?.remove();
    document.getElementById('v1116-ui-style')?.remove();
    const style=document.createElement('style');style.id='v1125-menu-style';
    style.textContent=`
      #game{position:fixed!important;inset:0!important;z-index:0!important;opacity:1!important;visibility:visible!important}
      #menu{background:linear-gradient(90deg,rgba(6,7,8,.08) 0%,rgba(6,7,8,.16) 38%,rgba(6,7,8,.72) 70%,rgba(6,7,8,.93) 100%)!important}
      #menu:before{background:linear-gradient(0deg,rgba(4,5,6,.64),transparent 52%),radial-gradient(circle at 78% 32%,rgba(233,184,75,.13),transparent 34%)!important}
      #menuScene{z-index:0!important;background:transparent!important;box-shadow:inset 0 0 90px rgba(0,0,0,.24)!important}
      #menuScene:after{opacity:.018!important}
      #menuContent{z-index:2!important;width:min(520px,92vw)!important;min-height:auto!important;margin:6vh 4vw 6vh auto!important;padding:28px 30px 24px!important;align-self:center!important;border-radius:28px!important;border:1px solid rgba(255,255,255,.12)!important;background:linear-gradient(155deg,rgba(24,22,19,.86),rgba(10,11,12,.75))!important;backdrop-filter:blur(15px)!important;box-shadow:0 28px 80px rgba(0,0,0,.44)!important}
      .menuTopline{margin-bottom:14px!important}.kicker{color:#f0c76b!important;letter-spacing:1.5px!important}.menuLocation{opacity:.72!important}
      .logo{font-size:clamp(58px,7vw,84px)!important;line-height:.92!important;letter-spacing:-2px!important;text-shadow:0 8px 32px rgba(0,0,0,.30)!important}
      .tagline{max-width:440px!important;font-size:14px!important;line-height:1.72!important;margin-top:14px!important;color:#efe4d2!important}
      .menuRule{width:82px!important;height:3px!important;margin:20px 0 18px!important;background:linear-gradient(90deg,#e9b84b,#f6d784)!important}
      .menuButtons{width:100%!important;gap:8px!important}
      .menuBtn{min-height:54px!important;padding:11px 14px!important;border-radius:14px!important;background:rgba(255,255,255,.055)!important;border:1px solid rgba(255,255,255,.10)!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;transform:none!important;box-shadow:none!important}
      .menuBtn:hover,.menuBtn:focus-visible{background:rgba(255,255,255,.10)!important;border-color:rgba(233,184,75,.42)!important;transform:translateX(-3px)!important}
      .menuBtn.primary{background:linear-gradient(135deg,#e7b34a,#f2cf78)!important;color:#1b160f!important;border-color:#f5d68a!important;box-shadow:0 10px 26px rgba(213,158,45,.18)!important}
      .menuBtn.danger{color:#e8b6ad!important;background:rgba(112,48,40,.16)!important}
      .menuBtn small{display:block;font-size:9px;font-weight:500;opacity:.62;margin-top:2px}
      .menuBtn .menuBtnIcon{font-size:18px;opacity:.9}
      #menuAudioBadge{margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 11px;border-radius:12px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.08);font-size:11px;color:#e9ddc8}
      #menuAudioBadge strong{color:#f0c76b;font-size:11px}#menuAudioBars{display:flex;gap:2px;align-items:flex-end;height:13px}#menuAudioBars i{display:block;width:2px;background:#e9b84b;border-radius:2px;animation:menuBeat .8s ease-in-out infinite alternate}#menuAudioBars i:nth-child(2){height:11px;animation-delay:.16s}#menuAudioBars i:nth-child(1){height:6px}#menuAudioBars i:nth-child(3){height:8px;animation-delay:.3s}@keyframes menuBeat{to{transform:scaleY(.45);opacity:.55}}
      .menuMeta{margin-top:12px!important;gap:6px!important}.pill{background:rgba(255,255,255,.04)!important}
      #menuStatus{margin-top:10px!important;color:#d7c39e!important}.menuFoot{margin-top:12px!important}
      #v1125Settings{position:absolute;inset:0;z-index:7;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(3,4,5,.63);backdrop-filter:blur(8px)}#v1125Settings.open{display:flex}
      #v1125SettingsPanel{width:min(480px,94vw);padding:22px;border-radius:22px;background:linear-gradient(150deg,#211e1a,#111214);border:1px solid rgba(255,255,255,.13);box-shadow:0 28px 90px rgba(0,0,0,.5);color:#fff}
      .v1125SetHead{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px}.v1125SetHead h2{margin:0;font-size:23px}.v1125Close{border:0;width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font-size:18px;cursor:pointer}
      .v1125Setting{padding:13px 0;border-top:1px solid rgba(255,255,255,.08)}.v1125Setting:first-of-type{border-top:0}.v1125SettingTitle{font-weight:900;font-size:13px}.v1125SettingHint{font-size:10px;opacity:.58;margin-top:3px;line-height:1.5}
      .v1125Seg{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.v1125Seg button,.v1125Action{border:1px solid rgba(255,255,255,.10);border-radius:11px;background:rgba(255,255,255,.055);color:#fff;padding:10px;cursor:pointer;font-weight:800}.v1125Seg button.active{background:#e9b84b;color:#1b160f;border-color:#f2cf78}.v1125Action{width:100%;margin-top:10px}.v1125Action.primary{background:#e9b84b;color:#1b160f}
      #v1125MusicEnabled[aria-pressed="false"]{background:rgba(112,48,40,.24);color:#e8b6ad}.v1125Range{width:100%;accent-color:#e9b84b;margin-top:10px}
      @media(max-width:760px){
        #top{top:max(7px,env(safe-area-inset-top))!important;left:8px!important;right:8px!important;gap:6px!important}#stats{grid-template-columns:repeat(2,minmax(0,1fr))!important;width:46vw!important;min-width:0!important;gap:3px!important;padding:4px!important}.stat{padding:3px 5px!important}.lab{font-size:8px!important}.val{font-size:11px!important}.meter{height:2px!important}#clock{min-width:78px!important;padding:5px 7px!important}.clockMain{font-size:14px!important}.clockSub{font-size:8px!important}#soundToggle{top:63px!important;left:8px!important;width:36px!important;height:36px!important;padding:0!important;border-radius:50%!important;font-size:0!important;display:grid!important;place-items:center!important}#soundToggle:before{content:attr(data-v1112-icon);font-size:16px!important}#mission{right:8px!important;top:82px!important;width:min(46vw,190px)!important;padding:6px 8px!important}.mTitle{font-size:10px!important}.mText{font-size:9px!important}#mapWrap{width:82px!important;height:82px!important;left:8px!important;bottom:146px!important;padding:4px!important}#joy{left:14px!important;bottom:20px!important;width:104px!important;height:104px!important}#knob{left:34px!important;top:34px!important;width:36px!important;height:36px!important}#act{right:16px!important;bottom:28px!important;width:62px!important;height:62px!important}#run{right:27px!important;bottom:100px!important;width:44px!important;height:44px!important}
        #menu{overflow:hidden!important;background:linear-gradient(0deg,rgba(5,6,7,.88) 0%,rgba(5,6,7,.50) 46%,rgba(5,6,7,.08) 73%,rgba(5,6,7,0) 100%)!important}#menuContent{position:absolute!important;left:10px!important;right:10px!important;bottom:max(10px,env(safe-area-inset-bottom))!important;width:auto!important;margin:0!important;padding:16px!important;border-radius:22px!important;max-height:64vh!important;overflow:auto!important}.menuTopline{margin-bottom:7px!important}.kicker,.menuLocation{font-size:8px!important}.logo{font-size:43px!important;letter-spacing:-1px!important}.tagline{font-size:10px!important;line-height:1.45!important;margin:7px 0 0!important}.menuRule{width:48px!important;height:2px!important;margin:9px 0!important}.menuButtons{gap:5px!important}.menuBtn{min-height:43px!important;padding:8px 10px!important;border-radius:11px!important;font-size:11px!important}.menuBtn small{font-size:8px!important}.menuBtn .menuBtnIcon{font-size:15px!important}#menuAudioBadge{margin-top:7px!important;padding:6px 8px!important;font-size:9px!important}.menuMeta{display:none!important}#menuStatus{font-size:8px!important;margin-top:6px!important;min-height:10px!important}.menuFoot{display:none!important}#v1125SettingsPanel{padding:17px!important;border-radius:18px!important}.v1125SetHead h2{font-size:20px!important}
      }
    `;document.head.appendChild(style);
  }

  function setButtonCopy(el,title,sub,icon){
    if(!el)return;el.innerHTML=`<span><b>${title}</b>${sub?`<small>${sub}</small>`:''}</span><span class="menuBtnIcon">${icon}</span>`;
  }
  function installMenuUI(){
    const content=document.getElementById('menuContent'),buttons=content?.querySelector('.menuButtons');if(!content||!buttons)return;
    const kicker=content.querySelector('.kicker'),location=content.querySelector('.menuLocation'),tagline=content.querySelector('.tagline'),foot=content.querySelector('.menuFoot');
    if(kicker)kicker.textContent='HAYAT MASR • القاهرة';if(location)location.textContent='الصبح بدري • الحارة بتصحى';
    if(tagline)tagline.textContent='ابدأ يومك في مصر — شوارع، محلات، ناس ومشاوير بطابع مصري من أول لحظة.';
    if(foot)foot.textContent='V11.24 • Main Menu Refresh 11.25';
    setButtonCopy(document.getElementById('newGameBtn'),'ابدأ يوم جديد','ابدأ المشوار من الأول','←');
    setButtonCopy(document.getElementById('continueBtn'),'كمّل من آخر حفظ','ارجع لنفس اليوم والمكان','↩');
    let settingsBtn=document.getElementById('settingsBtn');
    if(!settingsBtn){settingsBtn=document.createElement('button');settingsBtn.id='settingsBtn';settingsBtn.className='menuBtn';buttons.insertBefore(settingsBtn,document.getElementById('resetBtn'));}
    setButtonCopy(settingsBtn,'الإعدادات','المزيكا وصوت القائمة','⚙');
    setButtonCopy(document.getElementById('resetBtn'),'مسح الحفظ','امسح التقدم وابدأ من جديد','×');
    let badge=document.getElementById('menuAudioBadge');
    if(!badge){badge=document.createElement('div');badge.id='menuAudioBadge';buttons.after(badge);}updateMenuAudioBadge();
    installSettingsPanel();
  }
  function updateMenuAudioBadge(){
    const badge=document.getElementById('menuAudioBadge');if(!badge)return;
    const off=!menuAudioSettings.enabled||globalMuted();
    const label=off?'المزيكا مقفولة':menuAudioSettings.mode==='continuous'?(musicPlaying?'مزيكا مصرية شغالة':'مزيكا مصرية طول القائمة'):'مزيكا مصرية عند الضغط';
    badge.innerHTML=`<span><strong>♫ ${label}</strong><br><span style="opacity:.55">مقسوم • طبلة • رق • حجاز</span></span><span id="menuAudioBars"><i></i><i></i><i></i></span>`;
    const bars=badge.querySelector('#menuAudioBars');if(bars)bars.style.opacity=off?'.25':'1';
  }
  function installSettingsPanel(){
    if(document.getElementById('v1125Settings'))return;
    const overlay=document.createElement('div');overlay.id='v1125Settings';
    overlay.innerHTML=`<div id="v1125SettingsPanel" role="dialog" aria-modal="true" aria-label="إعدادات القائمة">
      <div class="v1125SetHead"><div><h2>الإعدادات</h2><div class="v1125SettingHint">صوت ومزيكا الشاشة الرئيسية فقط</div></div><button class="v1125Close" id="v1125Close" aria-label="إغلاق">×</button></div>
      <div class="v1125Setting"><div class="v1125SettingTitle">موسيقى القائمة</div><div class="v1125SettingHint">مزيكا أصلية بطابع مصري: مقسوم، طبلة، رق وليد حجاز قريب من روح المزمار الشعبي.</div><button id="v1125MusicEnabled" class="v1125Action" aria-pressed="true">الموسيقى: شغالة</button></div>
      <div class="v1125Setting"><div class="v1125SettingTitle">طريقة التشغيل</div><div class="v1125SettingHint">اختار تظهر مع ضغطات الأزرار فقط، أو تفضل شغالة طول وجودك في القائمة.</div><div class="v1125Seg"><button id="v1125Interaction">عند الضغط</button><button id="v1125Continuous">طول القائمة</button></div></div>
      <div class="v1125Setting"><div class="v1125SettingTitle">مستوى صوت المزيكا</div><input id="v1125Volume" class="v1125Range" type="range" min="20" max="100" step="5" value="78"><button id="v1125Preview" class="v1125Action primary">♫ جرّب الطابع المصري</button></div>
    </div>`;
    menu.appendChild(overlay);
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeSettings();});
    document.getElementById('v1125Close')?.addEventListener('click',()=>{playButtonSting('ui');closeSettings();});
    document.getElementById('v1125MusicEnabled')?.addEventListener('click',()=>{menuAudioSettings.enabled=!menuAudioSettings.enabled;saveAudioSettings();if(menuAudioSettings.enabled)playButtonSting('settings');else stopMenuMusic(.08);});
    document.getElementById('v1125Interaction')?.addEventListener('click',()=>{menuAudioSettings.mode='interaction';saveAudioSettings();playButtonSting('settings');});
    document.getElementById('v1125Continuous')?.addEventListener('click',()=>{menuAudioSettings.mode='continuous';saveAudioSettings();unlockAudio().then(startMenuMusic);playButtonSting('settings');});
    document.getElementById('v1125Volume')?.addEventListener('input',e=>{menuAudioSettings.volume=Math.max(.2,Math.min(1,+e.target.value/100));applyAudioVolume();saveAudioSettings();});
    document.getElementById('v1125Preview')?.addEventListener('click',()=>{playButtonSting('settings');setTimeout(playEgyptianPreview,90);});
    updateSettingsUI();
  }
  function updateSettingsUI(){
    const enabled=document.getElementById('v1125MusicEnabled'),interaction=document.getElementById('v1125Interaction'),continuous=document.getElementById('v1125Continuous'),vol=document.getElementById('v1125Volume');
    if(enabled){enabled.setAttribute('aria-pressed',String(menuAudioSettings.enabled));enabled.textContent=menuAudioSettings.enabled?'الموسيقى: شغالة':'الموسيقى: مقفولة';}
    interaction?.classList.toggle('active',menuAudioSettings.mode==='interaction');continuous?.classList.toggle('active',menuAudioSettings.mode==='continuous');if(vol)vol.value=String(Math.round(menuAudioSettings.volume*100));
  }
  function openSettings(){document.getElementById('v1125Settings')?.classList.add('open');updateSettingsUI();}
  function closeSettings(){document.getElementById('v1125Settings')?.classList.remove('open');}

  function syncSoundIcon(){
    if(!soundToggle)return;const text=soundToggle.textContent||'';soundToggle.dataset.v1112Icon=(text.includes('مكتوم')||text.includes('🔇'))?'🔇':'🔊';syncMenuMusic();updateMenuAudioBadge();
  }
  function publish(extra={}){
    const canvas=document.getElementById('game');
    window.__V1112_UI={version:'11.12',hardeningVersion:'11.16',menuRefreshVersion:'11.25',liveStartScene:true,dedicatedPreviewCamera:true,compactMobileHud:true,previewActive,mobileStatsWidthVw:46,mobileMissionWidthVw:46,sceneMeshes:previewScene?.meshes?.length||0,previewCamera:previewCamera?{x:+previewCamera.position.x.toFixed(2),y:+previewCamera.position.y.toFixed(2),z:+previewCamera.position.z.toFixed(2)}:null,canvasVisible:canvas?getComputedStyle(canvas).visibility!=='hidden'&&getComputedStyle(canvas).display!=='none':false,menuMusic:{style:'egyptian-maqsoum-hijaz-mizmar-inspired',bpm:BPM,playing:musicPlaying,unlocked:musicUnlocked,menuOnly:true,mode:menuAudioSettings.mode,enabled:menuAudioSettings.enabled,buttonStings:true,settingsPanel:true},...extra};
    window.__V1116_START_SCENE=window.__V1112_UI;window.__V1125_MENU=window.__V1112_UI;
  }

  function stopPreview(){
    if(previewScene&&previewHandle){try{previewScene.onBeforeRenderObservable.remove(previewHandle);}catch(_){}}
    if(previewScene&&gameCamera&&previewScene.activeCamera===previewCamera){try{previewScene.activeCamera=gameCamera;}catch(_){}}
    try{previewCamera?.dispose();}catch(_){}
    previewHandle=null;previewCamera=null;gameCamera=null;previewScene=null;previewActive=false;publish({stopped:true});
  }
  function tryInstallPreview(){
    if(previewActive)return true;if(gameStarted()||!menuVisible())return false;
    const scene=window.BABYLON?.Engine?.LastCreatedEngine?.scenes?.[0],active=scene?.activeCamera;
    if(!scene||!active||!window.BABYLON?.UniversalCamera||!window.BABYLON?.Vector3||scene.meshes.length<40)return false;
    previewScene=scene;gameCamera=active;previewCamera=new BABYLON.UniversalCamera('v1125PreviewCamera',new BABYLON.Vector3(-24,2.1,-29),scene);previewCamera.minZ=.05;previewCamera.fov=.84;previewCamera.inertia=0;previewCamera.setTarget(new BABYLON.Vector3(-12,1.55,-16));previewCamera.inputs.clear();scene.activeCamera=previewCamera;
    previewHandle=scene.onBeforeRenderObservable.add(()=>{if(gameStarted()||!menuVisible()){stopPreview();stopMenuMusic(.16);return;}previewCamera.position.set(-24,2.1,-29);previewCamera.setTarget(new BABYLON.Vector3(-12,1.55,-16));if(scene.activeCamera!==previewCamera)scene.activeCamera=previewCamera;publish({previewTarget:'street--24',cameraMoving:false,stablePreview:true});});
    previewActive=true;publish({previewTarget:'street--24',cameraMoving:false,stablePreview:true});return true;
  }

  installStyle();installMenuUI();syncSoundIcon();publish();
  if(soundToggle)new MutationObserver(syncSoundIcon).observe(soundToggle,{childList:true,subtree:true,characterData:true});
  menuObserver=new MutationObserver(()=>{if(!menuVisible()){closeSettings();stopPreview();stopMenuMusic(.15);}else syncMenuMusic();});menuObserver.observe(menu,{attributes:true,attributeFilter:['style','class','hidden']});
  new MutationObserver(syncMenuMusic).observe(document.body,{attributes:true,attributeFilter:['class']});

  const gesture=window.PointerEvent?'pointerdown':'touchstart';
  window.addEventListener(gesture,()=>{unlockAudio();},{capture:true,passive:true});window.addEventListener('keydown',unlockAudio,{capture:true});
  const settingsBtn=document.getElementById('settingsBtn');settingsBtn?.addEventListener('click',()=>{playButtonSting('settings');openSettings();});
  document.getElementById('newGameBtn')?.addEventListener('pointerdown',()=>playButtonSting('new'),{capture:true});
  document.getElementById('continueBtn')?.addEventListener('pointerdown',()=>playButtonSting('continue'),{capture:true});
  document.getElementById('resetBtn')?.addEventListener('pointerdown',()=>playButtonSting('reset'),{capture:true});
  for(const id of ['newGameBtn','continueBtn'])document.getElementById(id)?.addEventListener('click',()=>{closeSettings();stopPreview();stopMenuMusic(.18);},{capture:true});

  previewTimer=setInterval(()=>{if(tryInstallPreview()&&previewTimer){clearInterval(previewTimer);previewTimer=null;}},100);tryInstallPreview();
  document.addEventListener('visibilitychange',syncMenuMusic);syncMenuMusic();
  window.__egyptDebug=window.__egyptDebug||{};window.__egyptDebug.v1116StartSceneState=()=>({...window.__V1116_START_SCENE});window.__egyptDebug.v1125MenuState=()=>({...window.__V1125_MENU});
  window.addEventListener('pagehide',()=>stopMenuMusic(.04));window.addEventListener('beforeunload',()=>{if(previewTimer)clearInterval(previewTimer);menuObserver?.disconnect();stopMenuMusic(.04);stopPreview();},{once:true});
})();
