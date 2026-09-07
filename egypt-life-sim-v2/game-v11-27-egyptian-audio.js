(() => {
  'use strict';
  const menu=document.getElementById('menu');
  const soundToggle=document.getElementById('soundToggle');
  if(!menu)return;

  const KEY='hayatMasr.menuAudio.v1127';
  const defaults={enabled:true,mode:'interaction',volume:.78};
  const LOOP='assets/egyptian-menu-loop.ogg?v=11.27';
  const STING='assets/egyptian-button-sting.ogg?v=11.27';
  let prefs=load();
  let unlocked=false,previewStopTimer=null;

  const music=new Audio(LOOP);
  music.loop=true;
  music.preload='auto';
  music.volume=Math.min(1,.82*prefs.volume);

  const buttonAudio=new Audio(STING);
  buttonAudio.preload='auto';
  buttonAudio.volume=Math.min(1,.95*prefs.volume);

  function load(){
    try{
      const r=JSON.parse(localStorage.getItem(KEY)||'null');
      if(!r||typeof r!=='object')return {...defaults};
      return {
        enabled:r.enabled!==false,
        mode:r.mode==='continuous'?'continuous':'interaction',
        volume:Number.isFinite(+r.volume)?Math.max(.2,Math.min(1,+r.volume)):.78
      };
    }catch(_){return {...defaults};}
  }
  function save(){
    try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch(_){}
    applyVolume();syncSettings();syncMusic();updateBadge();publish();
  }
  function applyVolume(){
    music.volume=Math.min(1,.82*prefs.volume);
    buttonAudio.volume=Math.min(1,.95*prefs.volume);
  }
  function muted(){
    const t=soundToggle?.textContent||'';
    return t.includes('مكتوم')||t.includes('🔇');
  }
  function started(){return document.body.classList.contains('game-started');}
  function visible(){
    const s=getComputedStyle(menu);
    return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0';
  }
  async function unlock(){
    unlocked=true;
    if(prefs.mode==='continuous')await startMusic();
    publish();
  }
  async function startMusic(){
    if(!prefs.enabled||prefs.mode!=='continuous'||muted()||started()||!visible())return false;
    try{
      if(music.ended||music.currentTime>=music.duration)music.currentTime=0;
      await music.play();
      unlocked=true;updateBadge();publish();return true;
    }catch(_){return false;}
  }
  function stopMusic(reset=false){
    music.pause();
    if(reset){try{music.currentTime=0;}catch(_){}}
    updateBadge();publish();
  }
  function syncMusic(){
    if(document.hidden||started()||!visible()||muted()||!prefs.enabled||prefs.mode!=='continuous')stopMusic(false);
    else if(unlocked)startMusic();
  }
  function playSting(){
    if(!prefs.enabled||muted()||started())return;
    try{buttonAudio.pause();buttonAudio.currentTime=0;}catch(_){}
    buttonAudio.play().then(()=>{unlocked=true;publish();}).catch(()=>{});
  }
  function preview(){
    if(!prefs.enabled||muted())return;
    if(previewStopTimer){clearTimeout(previewStopTimer);previewStopTimer=null;}
    try{music.pause();music.currentTime=0;}catch(_){}
    music.play().then(()=>{
      unlocked=true;
      if(prefs.mode!=='continuous'){
        previewStopTimer=setTimeout(()=>{music.pause();try{music.currentTime=0;}catch(_){}updateBadge();},3200);
      }
      updateBadge();publish();
    }).catch(()=>{});
  }

  function updateBadge(){
    const b=document.getElementById('menuAudioBadge');if(!b)return;
    const off=!prefs.enabled||muted();
    const label=off?'المزيكا مقفولة':prefs.mode==='continuous'?(music.paused?'مزيكا مصرية — المس الشاشة للتشغيل':'مزيكا مصرية شغالة'):'مزيكا مصرية عند الضغط';
    const html=`<strong>♫ ${label}</strong><span class="audioDetail">طبلة بلدي • رق • أورج • مزمار • بياتي ربع تون</span>`;
    if(b.innerHTML!==html)b.innerHTML=html;
    b.dataset.v1127='sampled';
  }

  function installSettings(){
    document.getElementById('v1126Settings')?.remove();
    document.getElementById('v1127Settings')?.remove();
    const o=document.createElement('div');
    o.id='v1127Settings';
    o.innerHTML=`<div id="v1127SettingsPanel" role="dialog" aria-modal="true" aria-label="إعدادات المزيكا المصرية">
      <div class="v1127Head"><h2>الإعدادات</h2><button id="v1127Close" class="v1127Close" aria-label="إغلاق">×</button></div>
      <div class="v1127Row"><div class="v1127Title">مزيكا الشاشة الرئيسية</div><div class="v1127Hint">تسجيل أصلي للعبة: طبلة بلدي، رق، أورج/أكورديون، مزمار/أرغول ومقام بياتي بربع تون.</div><button id="v1127Enabled" class="v1127Action">الموسيقى: شغالة</button></div>
      <div class="v1127Row"><div class="v1127Title">طريقة التشغيل</div><div class="v1127Seg"><button id="v1127Interaction">عند الضغط</button><button id="v1127Continuous">طول القائمة</button></div></div>
      <div class="v1127Row"><div class="v1127Title">الصوت</div><input id="v1127Volume" class="v1127Range" type="range" min="20" max="100" step="5"><button id="v1127Preview" class="v1127Action primary">♫ جرّب المزيكا المصرية</button></div>
    </div>`;
    menu.appendChild(o);
    const style=document.createElement('style');
    style.id='v1127-audio-style';
    style.textContent=`#v1127Settings{position:absolute;inset:0;z-index:9;display:none;align-items:center;justify-content:center;padding:14px;background:rgba(3,4,5,.64)}#v1127Settings.open{display:flex}#v1127SettingsPanel{width:min(420px,94vw);padding:18px;border-radius:18px;background:#171716;border:1px solid rgba(255,255,255,.12);color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.42)}.v1127Head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.v1127Head h2{margin:0;font-size:20px}.v1127Close{border:0;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font-size:18px}.v1127Row{padding:10px 0;border-top:1px solid rgba(255,255,255,.07)}.v1127Title{font-weight:900;font-size:12px}.v1127Hint{font-size:9px;line-height:1.55;opacity:.62;margin-top:3px}.v1127Seg{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.v1127Seg button,.v1127Action{border:1px solid rgba(255,255,255,.09);border-radius:9px;background:rgba(255,255,255,.05);color:#fff;padding:9px;font-weight:850}.v1127Seg button.active,.v1127Action.primary{background:#e6b44f;color:#17130d}.v1127Action{width:100%;margin-top:8px}.v1127Range{width:100%;accent-color:#e6b44f;margin-top:8px}`;
    document.head.appendChild(style);
    o.addEventListener('click',e=>{if(e.target===o)closeSettings();});
    document.getElementById('v1127Close')?.addEventListener('click',()=>{playSting();closeSettings();});
    document.getElementById('v1127Enabled')?.addEventListener('click',()=>{prefs.enabled=!prefs.enabled;save();if(prefs.enabled)playSting();else stopMusic(false);});
    document.getElementById('v1127Interaction')?.addEventListener('click',()=>{prefs.mode='interaction';save();playSting();});
    document.getElementById('v1127Continuous')?.addEventListener('click',()=>{prefs.mode='continuous';save();unlock();playSting();});
    document.getElementById('v1127Volume')?.addEventListener('input',e=>{prefs.volume=Math.max(.2,Math.min(1,+e.target.value/100));save();});
    document.getElementById('v1127Preview')?.addEventListener('click',preview);
    syncSettings();
  }
  function syncSettings(){
    const e=document.getElementById('v1127Enabled'),i=document.getElementById('v1127Interaction'),c=document.getElementById('v1127Continuous'),v=document.getElementById('v1127Volume');
    if(e)e.textContent=prefs.enabled?'الموسيقى: شغالة':'الموسيقى: مقفولة';
    i?.classList.toggle('active',prefs.mode==='interaction');
    c?.classList.toggle('active',prefs.mode==='continuous');
    if(v)v.value=String(Math.round(prefs.volume*100));
  }
  function openSettings(){document.getElementById('v1127Settings')?.classList.add('open');syncSettings();}
  function closeSettings(){document.getElementById('v1127Settings')?.classList.remove('open');}
  function publish(){
    window.__V1127_AUDIO={version:'11.27',sampled:true,loopAsset:LOOP,stingAsset:STING,style:'egyptian-baladi-bayati-quarter-tone',enabled:prefs.enabled,mode:prefs.mode,volume:prefs.volume,playing:!music.paused,menuOnly:true};
  }

  installSettings();applyVolume();updateBadge();publish();
  document.getElementById('settingsBtn')?.addEventListener('click',()=>{playSting();openSettings();});
  for(const id of ['newGameBtn','continueBtn','resetBtn'])document.getElementById(id)?.addEventListener('pointerdown',playSting,{capture:true});
  for(const id of ['newGameBtn','continueBtn'])document.getElementById(id)?.addEventListener('click',()=>stopMusic(true),{capture:true});

  const gesture=window.PointerEvent?'pointerdown':'touchstart';
  window.addEventListener(gesture,()=>unlock(),{capture:true,passive:true});
  window.addEventListener('keydown',()=>unlock(),{capture:true});
  document.addEventListener('visibilitychange',syncMusic);
  new MutationObserver(syncMusic).observe(document.body,{attributes:true,attributeFilter:['class']});
  if(soundToggle)new MutationObserver(()=>queueMicrotask(()=>{syncMusic();updateBadge();})).observe(soundToggle,{childList:true,subtree:true,characterData:true});
  const badge=document.getElementById('menuAudioBadge');if(badge)new MutationObserver(()=>queueMicrotask(updateBadge)).observe(badge,{childList:true,subtree:true});
  window.addEventListener('pagehide',()=>{stopMusic(false);buttonAudio.pause();});
  window.addEventListener('beforeunload',()=>{stopMusic(false);buttonAudio.pause();},{once:true});
})();
