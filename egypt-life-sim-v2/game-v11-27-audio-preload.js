(() => {
  'use strict';
  const NEW_KEY='hayatMasr.menuAudio.v1127';
  const OLD_KEY='hayatMasr.menuAudio.v1126';
  const OLDER_KEY='hayatMasr.menuAudio.v1125';
  try {
    if(!localStorage.getItem(NEW_KEY)){
      const prior=JSON.parse(localStorage.getItem(OLD_KEY)||localStorage.getItem(OLDER_KEY)||'null');
      const migrated={
        enabled:prior?.enabled!==false,
        mode:prior?.mode==='continuous'?'continuous':'interaction',
        volume:Number.isFinite(+prior?.volume)?Math.max(.2,Math.min(1,+prior.volume)):.78
      };
      localStorage.setItem(NEW_KEY,JSON.stringify(migrated));
    }
    // V11.26 synthesizer reads this before it starts. Keep it silent so the sampled
    // Egyptian recording is the only menu music the player hears.
    localStorage.setItem(OLD_KEY,JSON.stringify({enabled:false,mode:'interaction',volume:.2}));
  } catch (_) {}
})();
