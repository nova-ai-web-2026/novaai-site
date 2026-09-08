(() => {
  'use strict';

  window.__EGYPT_MENU_AUDIO_RESTORE_CONTEXT?.();

  if(window.__V1129_AUDIO_SINGLETON?.active){
    window.__V1129_AUDIO_SINGLETON.sync?.();
    return;
  }

  const menu=document.getElementById('menu');
  const soundToggle=document.getElementById('soundToggle');
  if(!menu)return;

  const KEY='hayatMasr.menuAudio.v1129';
  const defaults={enabled:true,mode:'interaction',volume:.78};
  const LOOP='assets/egyptian-menu-loop.ogg?v=11.29.0';
  const STING='assets/egyptian-button-sting.ogg?v=11.29.0';
  let prefs=load();
  let unlocked=false,previewStopTimer=null,playPromise=null;

  const music=new Audio(LOOP);
  music.loop=true;
  music.preload='auto';

  const buttonAudio=new Audio(STING);
  buttonAudio.preload='auto';

  const singleton=window.__V1129_AUDIO_SINGLETON={
    active:true,
    version:'11.29',
    music,
    buttonAudio,
    sync:()=>syncMusic(),
    stop:()=>stopMusic(true),
    state:()=>({enabled:prefs.enabled,mode:prefs.mode,volume:prefs.volume,playing:!music.paused,unlocked})
  };

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
    applyVolume();
    syncSettings();
    syncMusic();
    updateBadge();
    publish();
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
    return true;
  }

  async function startMusic(){
    if(!prefs.enabled||prefs.mode!=='continuous'||muted()||started()||!visible())return false;
    if(!music.paused&&!music.ended){
      unlocked=true;
      updateBadge();
      publish();
      return true;
    }
    if(playPromise)return playPromise;
    playPromise=(async()=>{
      try{
        if(music.ended||(Number.isFinite(music.duration)&&music.currentTime>=music.duration))music.currentTime=0;
        await music.play();
        unlocked=true;
        updateBadge();
        publish();
        return true;
      }catch(_){
        return false;
      }finally{
        playPromise=null;
      }
    })();
    return playPromise;
  }

  function stopMusic(reset=false){
    if(previewStopTimer){clearTimeout(previewStopTimer);previewStopTimer=null;}
    music.pause();
    playPromise=null;
    if(reset){try{music.currentTime=0;}catch(_){}}
    updateBadge();
    publish();
  }

  function syncMusic(){
    if(document.hidden||started()||!visible()||muted()||!prefs.enabled||prefs.mode!=='continuous'){
      stopMusic(false);
      return;
    }
    if(unlocked)startMusic();
  }

  function playSting(){
    if(!prefs.enabled||muted()||started())return;
    try{buttonAudio.pause();buttonAudio.currentTime=0;}catch(_){}
    buttonAudio.play().then(()=>{unlocked=true;publish();}).catch(()=>{});
  }

  async function preview(){
    if(!prefs.enabled||muted())return;
    unlocked=true;
    if(previewStopTimer){clearTimeout(previewStopTimer);previewStopTimer=null;}

    if(prefs.mode==='continuous'){
      await startMusic();
      updateBadge();
      publish();
      return;
    }

    try{music.pause();music.currentTime=0;}catch(_){}
    try{
      await music.play();
      previewStopTimer=setTimeout(()=>{
        music.pause();
        try{music.currentTime=0;}catch(_){}
        updateBadge();
        publish();
      },3200);
    }catch(_){}
    updateBadge();
    publish();
  }

  function updateBadge(){
    const b=document.getElementById('menuAudioBadge');
    if(!b)return;
    const off=!prefs.enabled||muted();
    const label=off?'المزيكا مقفولة':prefs.mode==='continuous'?(music.paused?'مزيكا مصرية — دوس مرة للتشغيل':'مزيكا مصرية شغالة'):'مزيكا مصرية عند الضغط';
    const html=`<strong>♫ ${label}</strong><span class="audioDetail">طبلة بلدي • رق • أورج • مزمار • بياتي</span>`;
    if(b.innerHTML!==html)b.innerHTML=html;
    b.dataset.v1129='single-owner';
  }

  function installSettings(){
    document.getElementById('v1126Settings')?.remove();
    document.getElementById('v1127Settings')?.remove();
    document.getElementById('v1129Settings')?.remove();

    const o=document.createElement('div');
    o.id='v1129Settings';
    o.innerHTML=`<div id="v1129SettingsPanel" role="dialog" aria-modal="true" aria-label="إعدادات المزيكا المصرية">
      <div class="v1129Head"><h2>الإعدادات</h2><button id="v1129Close" class="v1129Close" aria-label="إغلاق">×</button></div>
      <div class="v1129Row"><div class="v1129Title">مزيكا الشاشة الرئيسية</div><button id="v1129Enabled" class="v1129Action">الموسيقى: شغالة</button></div>
      <div class="v1129Row"><div class="v1129Title">طريقة التشغيل</div><div class="v1129Seg"><button id="v1129Interaction">عند الضغط</button><button id="v1129Continuous">طول القائمة</button></div></div>
      <div class="v1129Row"><div class="v1129Title">الصوت</div><input id="v1129Volume" class="v1129Range" type="range" min="20" max="100" step="5"><button id="v1129Preview" class="v1129Action primary">♫ جرّب المزيكا المصرية</button></div>
    </div>`;
    menu.appendChild(o);

    document.getElementById('v1129-audio-style')?.remove();
    const style=document.createElement('style');
    style.id='v1129-audio-style';
    style.textContent=`#v1129Settings{position:absolute;inset:0;z-index:9;display:none;align-items:center;justify-content:center;padding:14px;background:rgba(3,4,5,.64)}#v1129Settings.open{display:flex}#v1129SettingsPanel{width:min(420px,94vw);padding:18px;border-radius:18px;background:#171716;border:1px solid rgba(255,255,255,.12);color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.42)}.v1129Head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.v1129Head h2{margin:0;font-size:20px}.v1129Close{border:0;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font-size:18px}.v1129Row{padding:10px 0;border-top:1px solid rgba(255,255,255,.07)}.v1129Title{font-weight:900;font-size:12px}.v1129Seg{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.v1129Seg button,.v1129Action{border:1px solid rgba(255,255,255,.09);border-radius:9px;background:rgba(255,255,255,.05);color:#fff;padding:9px;font-weight:850}.v1129Seg button.active,.v1129Action.primary{background:#e6b44f;color:#17130d}.v1129Action{width:100%;margin-top:8px}.v1129Range{width:100%;accent-color:#e6b44f;margin-top:8px}`;
    document.head.appendChild(style);

    o.addEventListener('click',e=>{if(e.target===o)closeSettings();});
    document.getElementById('v1129Close')?.addEventListener('click',()=>{playSting();closeSettings();syncMusic();});
    document.getElementById('v1129Enabled')?.addEventListener('click',()=>{
      prefs.enabled=!prefs.enabled;
      save();
      if(prefs.enabled)playSting();
      else stopMusic(false);
    });
    document.getElementById('v1129Interaction')?.addEventListener('click',()=>{
      prefs.mode='interaction';
      save();
      playSting();
    });
    document.getElementById('v1129Continuous')?.addEventListener('click',async()=>{
      prefs.mode='continuous';
      save();
      await unlock();
      playSting();
    });
    document.getElementById('v1129Volume')?.addEventListener('input',e=>{
      prefs.volume=Math.max(.2,Math.min(1,+e.target.value/100));
      save();
    });
    document.getElementById('v1129Preview')?.addEventListener('click',preview);
    syncSettings();
  }

  function syncSettings(){
    const e=document.getElementById('v1129Enabled');
    const i=document.getElementById('v1129Interaction');
    const c=document.getElementById('v1129Continuous');
    const v=document.getElementById('v1129Volume');
    if(e)e.textContent=prefs.enabled?'الموسيقى: شغالة':'الموسيقى: مقفولة';
    i?.classList.toggle('active',prefs.mode==='interaction');
    c?.classList.toggle('active',prefs.mode==='continuous');
    if(v)v.value=String(Math.round(prefs.volume*100));
  }

  function openSettings(){
    document.getElementById('v1129Settings')?.classList.add('open');
    syncSettings();
  }

  function closeSettings(){
    document.getElementById('v1129Settings')?.classList.remove('open');
  }

  function publish(){
    window.__V1129_AUDIO={
      version:'11.29',
      singleton:true,
      sampled:true,
      loopAsset:LOOP,
      stingAsset:STING,
      style:'egyptian-baladi-bayati',
      enabled:prefs.enabled,
      mode:prefs.mode,
      volume:prefs.volume,
      playing:!music.paused,
      menuOnly:true
    };
  }

  applyVolume();
  installSettings();
  updateBadge();
  publish();

  document.getElementById('settingsBtn')?.addEventListener('click',()=>{playSting();openSettings();});
  for(const id of ['newGameBtn','continueBtn','resetBtn']){
    document.getElementById(id)?.addEventListener('pointerdown',playSting,{capture:true});
  }
  for(const id of ['newGameBtn','continueBtn']){
    document.getElementById(id)?.addEventListener('click',()=>stopMusic(true),{capture:true});
  }

  const gesture=window.PointerEvent?'pointerdown':'touchstart';
  window.addEventListener(gesture,()=>unlock(),{capture:true,passive:true});
  window.addEventListener('keydown',()=>unlock(),{capture:true});
  document.addEventListener('visibilitychange',syncMusic);
  new MutationObserver(syncMusic).observe(document.body,{attributes:true,attributeFilter:['class']});
  if(soundToggle)new MutationObserver(()=>queueMicrotask(()=>{syncMusic();updateBadge();})).observe(soundToggle,{childList:true,subtree:true,characterData:true});

  window.addEventListener('pagehide',()=>{stopMusic(false);buttonAudio.pause();singleton.active=false;});
  window.addEventListener('beforeunload',()=>{stopMusic(false);buttonAudio.pause();singleton.active=false;},{once:true});
})();
