(() => {
  'use strict';

  if(window.__V1130_AUDIO_SINGLETON?.active){
    window.__V1130_AUDIO_SINGLETON.sync?.();
    return;
  }

  const menu=document.getElementById('menu');
  const soundToggle=document.getElementById('soundToggle');
  if(!menu)return;

  const KEY='hayatMasr.menuAudio.v1130';
  const defaults={enabled:true,mode:'interaction',volume:.78};
  const LOOP='assets/egyptian-menu-loop.ogg?v=11.30.0';
  const STING='assets/egyptian-button-sting.ogg?v=11.30.0';
  let prefs=load();
  let unlocked=false,previewStopTimer=null,playPromise=null;

  for(const key of ['__V1129_AUDIO_SINGLETON','__V1127_AUDIO_SINGLETON']){
    try{
      const old=window[key];
      old?.stop?.(); old?.music?.pause?.(); old?.buttonAudio?.pause?.();
      if(old)old.active=false;
    }catch(_){}
  }

  const music=new Audio(LOOP);
  music.loop=true;
  music.preload='auto';
  const buttonAudio=new Audio(STING);
  buttonAudio.preload='auto';

  const singleton=window.__V1130_AUDIO_SINGLETON={
    active:true,version:'11.30',music,buttonAudio,
    sync:()=>syncMusic(),stop:()=>stopMusic(true),
    state:()=>({enabled:prefs.enabled,mode:prefs.mode,volume:prefs.volume,playing:!music.paused,unlocked})
  };

  function load(){
    try{
      const r=JSON.parse(localStorage.getItem(KEY)||'null');
      if(!r||typeof r!=='object')return {...defaults};
      return {enabled:r.enabled!==false,mode:r.mode==='continuous'?'continuous':'interaction',volume:Number.isFinite(+r.volume)?Math.max(.2,Math.min(1,+r.volume)):.78};
    }catch(_){return {...defaults};}
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch(_){}applyVolume();syncSettings();syncMusic();updateBadge();publish();}
  function applyVolume(){music.volume=Math.min(1,.82*prefs.volume);buttonAudio.volume=Math.min(1,.95*prefs.volume);}
  function muted(){const t=soundToggle?.textContent||'';return t.includes('مكتوم')||t.includes('🔇');}
  function started(){return document.body.classList.contains('game-started');}
  function visible(){const s=getComputedStyle(menu);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0';}
  function restoreGameplayAudioContext(){if(!started())return;try{window.__EGYPT_MENU_AUDIO_RESTORE_CONTEXT?.();}catch(_){}}

  async function unlock(){unlocked=true;if(prefs.mode==='continuous')await startMusic();publish();return true;}
  async function startMusic(){
    if(!prefs.enabled||prefs.mode!=='continuous'||muted()||started()||!visible())return false;
    if(!music.paused&&!music.ended){unlocked=true;updateBadge();publish();return true;}
    if(playPromise)return playPromise;
    playPromise=(async()=>{try{if(music.ended||(Number.isFinite(music.duration)&&music.currentTime>=music.duration))music.currentTime=0;await music.play();unlocked=true;updateBadge();publish();return true;}catch(_){return false;}finally{playPromise=null;}})();
    return playPromise;
  }
  function stopMusic(reset=false){
    if(previewStopTimer){clearTimeout(previewStopTimer);previewStopTimer=null;}
    music.pause();playPromise=null;
    if(reset){try{music.currentTime=0;}catch(_){}
    }
    updateBadge();publish();
  }
  function syncMusic(){
    restoreGameplayAudioContext();
    if(document.hidden||started()||!visible()||muted()||!prefs.enabled||prefs.mode!=='continuous'){stopMusic(false);return;}
    if(unlocked)startMusic();
  }
  function playSting(){
    if(!prefs.enabled||muted()||started()||prefs.mode==='continuous')return;
    try{buttonAudio.pause();buttonAudio.currentTime=0;}catch(_){}
    buttonAudio.play().then(()=>{unlocked=true;publish();}).catch(()=>{});
  }
  async function preview(){
    if(!prefs.enabled||muted())return;
    unlocked=true;
    if(previewStopTimer){clearTimeout(previewStopTimer);previewStopTimer=null;}
    if(prefs.mode==='continuous'){await startMusic();updateBadge();publish();return;}
    try{music.pause();music.currentTime=0;await music.play();previewStopTimer=setTimeout(()=>{music.pause();try{music.currentTime=0;}catch(_){}updateBadge();publish();},3200);}catch(_){}
    updateBadge();publish();
  }

  function updateBadge(){
    const b=document.getElementById('menuAudioBadge');if(!b)return;
    const off=!prefs.enabled||muted();
    const label=off?'المزيكا مقفولة':prefs.mode==='continuous'?(music.paused?'مزيكا مصرية — دوس مرة للتشغيل':'مزيكا مصرية شغالة'):'مزيكا مصرية عند الضغط';
    const html=`<strong>♫ ${label}</strong><span class="audioDetail">مسار واحد • بدون تراك دبل</span>`;
    if(b.innerHTML!==html)b.innerHTML=html;b.dataset.v1130='hard-single-owner';
  }

  function installSettings(){
    for(const id of ['v1126Settings','v1127Settings','v1129Settings','v1130Settings'])document.getElementById(id)?.remove();
    const o=document.createElement('div');o.id='v1130Settings';
    o.innerHTML=`<div id="v1130SettingsPanel" role="dialog" aria-modal="true" aria-label="إعدادات المزيكا"><div class="v1130Head"><h2>الإعدادات</h2><button id="v1130Close" class="v1130Close">×</button></div><div class="v1130Row"><div class="v1130Title">مزيكا الشاشة الرئيسية</div><button id="v1130Enabled" class="v1130Action">الموسيقى: شغالة</button></div><div class="v1130Row"><div class="v1130Title">طريقة التشغيل</div><div class="v1130Seg"><button id="v1130Interaction">عند الضغط</button><button id="v1130Continuous">طول القائمة</button></div></div><div class="v1130Row"><div class="v1130Title">الصوت</div><input id="v1130Volume" class="v1130Range" type="range" min="20" max="100" step="5"><button id="v1130Preview" class="v1130Action primary">♫ جرّب المزيكا</button></div></div>`;
    menu.appendChild(o);
    document.getElementById('v1130-audio-style')?.remove();
    const s=document.createElement('style');s.id='v1130-audio-style';s.textContent=`#v1130Settings{position:absolute;inset:0;z-index:9;display:none;align-items:center;justify-content:center;padding:14px;background:rgba(3,4,5,.64)}#v1130Settings.open{display:flex}#v1130SettingsPanel{width:min(420px,94vw);padding:18px;border-radius:18px;background:#171716;border:1px solid rgba(255,255,255,.12);color:#fff}.v1130Head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.v1130Head h2{margin:0;font-size:20px}.v1130Close{border:0;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font-size:18px}.v1130Row{padding:10px 0;border-top:1px solid rgba(255,255,255,.07)}.v1130Title{font-weight:900;font-size:12px}.v1130Seg{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.v1130Seg button,.v1130Action{border:1px solid rgba(255,255,255,.09);border-radius:9px;background:rgba(255,255,255,.05);color:#fff;padding:9px;font-weight:850}.v1130Seg button.active,.v1130Action.primary{background:#e6b44f;color:#17130d}.v1130Action{width:100%;margin-top:8px}.v1130Range{width:100%;accent-color:#e6b44f;margin-top:8px}`;document.head.appendChild(s);
    o.addEventListener('click',e=>{if(e.target===o)closeSettings();});
    document.getElementById('v1130Close')?.addEventListener('click',()=>{playSting();closeSettings();syncMusic();});
    document.getElementById('v1130Enabled')?.addEventListener('click',()=>{prefs.enabled=!prefs.enabled;save();if(prefs.enabled)playSting();else stopMusic(false);});
    document.getElementById('v1130Interaction')?.addEventListener('click',()=>{prefs.mode='interaction';save();playSting();});
    document.getElementById('v1130Continuous')?.addEventListener('click',async()=>{prefs.mode='continuous';save();await unlock();});
    document.getElementById('v1130Volume')?.addEventListener('input',e=>{prefs.volume=Math.max(.2,Math.min(1,+e.target.value/100));save();});
    document.getElementById('v1130Preview')?.addEventListener('click',preview);syncSettings();
  }
  function syncSettings(){const e=document.getElementById('v1130Enabled'),i=document.getElementById('v1130Interaction'),c=document.getElementById('v1130Continuous'),v=document.getElementById('v1130Volume');if(e)e.textContent=prefs.enabled?'الموسيقى: شغالة':'الموسيقى: مقفولة';i?.classList.toggle('active',prefs.mode==='interaction');c?.classList.toggle('active',prefs.mode==='continuous');if(v)v.value=String(Math.round(prefs.volume*100));}
  function openSettings(){document.getElementById('v1130Settings')?.classList.add('open');syncSettings();}
  function closeSettings(){document.getElementById('v1130Settings')?.classList.remove('open');}
  function publish(){window.__V1130_AUDIO={version:'11.30',singleton:true,hardSingleOwner:true,loopAsset:LOOP,stingAsset:STING,enabled:prefs.enabled,mode:prefs.mode,volume:prefs.volume,playing:!music.paused,menuOnly:true,stingDuringContinuous:false};}

  applyVolume();installSettings();updateBadge();publish();
  document.getElementById('settingsBtn')?.addEventListener('click',()=>{playSting();openSettings();});
  for(const id of ['newGameBtn','continueBtn','resetBtn'])document.getElementById(id)?.addEventListener('pointerdown',playSting,{capture:true});
  for(const id of ['newGameBtn','continueBtn'])document.getElementById(id)?.addEventListener('click',()=>{stopMusic(true);queueMicrotask(restoreGameplayAudioContext);},{capture:true});
  const gesture=window.PointerEvent?'pointerdown':'touchstart';window.addEventListener(gesture,()=>unlock(),{capture:true,passive:true});window.addEventListener('keydown',()=>unlock(),{capture:true});
  document.addEventListener('visibilitychange',syncMusic);
  new MutationObserver(()=>{syncMusic();restoreGameplayAudioContext();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  if(soundToggle)new MutationObserver(()=>queueMicrotask(()=>{syncMusic();updateBadge();})).observe(soundToggle,{childList:true,subtree:true,characterData:true});
  window.addEventListener('pagehide',()=>{stopMusic(false);buttonAudio.pause();singleton.active=false;});
  window.addEventListener('beforeunload',()=>{stopMusic(false);buttonAudio.pause();singleton.active=false;},{once:true});
})();
