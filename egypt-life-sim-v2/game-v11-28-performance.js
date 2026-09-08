(() => {
  'use strict';
  if (window.__EGYPT_PERF_1128?.installed) return;

  const VERSION = '11.28.0';
  const B = window.BABYLON;
  const state = window.__EGYPT_PERF_1128 = {
    installed: true,
    version: VERSION,
    collisionCache: false,
    collisionMeshes: 0,
    collisionBuckets: 0,
    staticWorldMatricesFrozen: 0,
    adaptiveResolution: false,
    hardwareScalingLevel: null,
    fps: 0,
    stressed: false,
    webglRecoveries: 0,
    notes: 'No gameplay content removed; performance-only runtime guard.'
  };

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const coarsePointer = matchMedia?.('(pointer: coarse)')?.matches ?? false;
  const mobile = coarsePointer || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '');

  // The legacy fallback collision shim scans every scene mesh and recomputes every
  // world matrix on every movement axis. Replace only that fallback implementation
  // with an equivalent cached spatial lookup. Babylon's native collision method,
  // when present, is left untouched.
  function installCollisionCache() {
    const proto = B?.UniversalCamera?.prototype;
    if (!proto || typeof proto.moveWithCollisions !== 'function') return false;
    const source = Function.prototype.toString.call(proto.moveWithCollisions);
    if (!source.includes('computeWorldMatrix') || !source.includes('checkCollisions')) return false;
    if (proto.moveWithCollisions.__egypt1128Cached) return true;

    const CELL = 8;
    let cachedScene = null;
    let meshCount = -1;
    let nextRefresh = 0;
    let buckets = new Map();
    let total = 0;

    const key = (x, z) => `${Math.floor(x / CELL)}:${Math.floor(z / CELL)}`;

    function rebuild(scene) {
      cachedScene = scene;
      meshCount = scene.meshes.length;
      nextRefresh = performance.now() + 1200;
      buckets = new Map();
      total = 0;

      for (const mesh of scene.meshes) {
        if (!mesh?.checkCollisions || !mesh.isEnabled?.() || !mesh.getBoundingInfo) continue;
        try {
          mesh.computeWorldMatrix(true);
          const bb = mesh.getBoundingInfo().boundingBox;
          const min = bb.minimumWorld, max = bb.maximumWorld;
          if (!min || !max || max.y < .08 || min.y > 2.45) continue;
          const item = { minX:min.x, maxX:max.x, minZ:min.z, maxZ:max.z };
          total++;
          const x0 = Math.floor(item.minX / CELL), x1 = Math.floor(item.maxX / CELL);
          const z0 = Math.floor(item.minZ / CELL), z1 = Math.floor(item.maxZ / CELL);
          for (let gx=x0; gx<=x1; gx++) for (let gz=z0; gz<=z1; gz++) {
            const k = `${gx}:${gz}`;
            let list = buckets.get(k);
            if (!list) buckets.set(k, list=[]);
            list.push(item);
          }
        } catch (_) {}
      }
      state.collisionCache = true;
      state.collisionMeshes = total;
      state.collisionBuckets = buckets.size;
    }

    function candidates(scene, x, z) {
      const now = performance.now();
      if (scene !== cachedScene || scene.meshes.length !== meshCount || now >= nextRefresh) rebuild(scene);
      return buckets.get(key(x,z)) || [];
    }

    function cachedMoveWithCollisions(delta) {
      const scene = this.getScene();
      const radius = .38;
      const blocked = (x,z) => {
        if (Math.abs(x) > 105.5 || Math.abs(z) > 105.5) return true;
        const list = candidates(scene,x,z);
        for (let i=0;i<list.length;i++) {
          const b=list[i];
          if (x+radius>b.minX && x-radius<b.maxX && z+radius>b.minZ && z-radius<b.maxZ) return true;
        }
        return false;
      };
      const nx = this.position.x + (delta.x || 0);
      if (!blocked(nx,this.position.z)) this.position.x = nx;
      const nz = this.position.z + (delta.z || 0);
      if (!blocked(this.position.x,nz)) this.position.z = nz;
      return this;
    }
    cachedMoveWithCollisions.__egypt1128Cached = true;
    cachedMoveWithCollisions.__egypt1128Original = proto.moveWithCollisions;
    proto.moveWithCollisions = cachedMoveWithCollisions;
    return true;
  }

  function attachContextRecovery(canvas) {
    if (!canvas || canvas.dataset.egypt1128ContextGuard) return;
    canvas.dataset.egypt1128ContextGuard = '1';
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      const now = Date.now();
      let last = 0;
      try { last = +(sessionStorage.getItem('egypt1128-last-webgl-reload') || 0); } catch (_) {}
      if (now-last < 30000) return;
      try { sessionStorage.setItem('egypt1128-last-webgl-reload', String(now)); } catch (_) {}
      state.webglRecoveries++;
      setTimeout(() => location.reload(), 900);
    }, { passive:false });
  }

  function freezeSafeStaticMeshes(scene) {
    const safe = /^(building$|ground$|road[HV]$|walk[HV]|v12_building_|street_(floorBand|drainpipe|planter|plant|roadRepair))/;
    let count = 0;
    for (const mesh of scene.meshes) {
      if (!safe.test(mesh.name || '') || mesh.parent || typeof mesh.freezeWorldMatrix !== 'function') continue;
      try { mesh.computeWorldMatrix(true); mesh.freezeWorldMatrix(); count++; } catch (_) {}
    }
    state.staticWorldMatricesFrozen = count;
  }

  function requestedScaling() {
    let quality = 'balanced';
    try { quality = localStorage.getItem('egypt-graphics') === 'high' ? 'high' : 'balanced'; } catch (_) {}
    const dpr = Math.min(devicePixelRatio || 1, quality === 'high' ? 2 : 1.25);
    return 1 / Math.max(.5, dpr);
  }

  function shadowGenerators(scene) {
    const result=[];
    for (const light of scene.lights) {
      try {
        const g = light.getShadowGenerator?.();
        if (g && !result.includes(g)) result.push(g);
      } catch (_) {}
    }
    return result;
  }

  async function installGovernor() {
    let engine = null, scene = null;
    for (let i=0;i<300;i++) {
      engine = B?.Engine?.LastCreatedEngine || null;
      scene = engine?.scenes?.[0] || null;
      if (engine && scene) break;
      await sleep(50);
    }
    if (!engine || !scene) return;

    state.adaptiveResolution = true;
    attachContextRecovery(document.getElementById('game'));

    // Wait until all visual passes finish moving/creating static scenery before
    // freezing only the known static world meshes.
    for (let i=0;i<300 && !window.__V119_READY;i++) await sleep(100);
    freezeSafeStaticMeshes(scene);

    let scale = engine.getHardwareScalingLevel();
    let smoothed = Math.max(30, engine.getFps?.() || 60);
    let low = 0, high = 0, lastChange = 0;
    const shadows = () => shadowGenerators(scene);

    const sample = () => {
      if (document.hidden || !document.body.classList.contains('game-started')) return;
      const fps = clamp(engine.getFps?.() || 60, 1, 120);
      smoothed = smoothed*.72 + fps*.28;
      state.fps = +smoothed.toFixed(1);

      let memoryPressure = false;
      try {
        const m = performance.memory;
        memoryPressure = !!m?.jsHeapSizeLimit && m.usedJSHeapSize / m.jsHeapSizeLimit > .82;
      } catch (_) {}

      const stressed = smoothed < 43 || memoryPressure;
      state.stressed = stressed;
      if (stressed) { low++; high=0; } else if (smoothed > 56) { high++; low=0; } else { low=Math.max(0,low-1); high=0; }

      const now = performance.now();
      const requested = requestedScaling();
      let desired = engine.getHardwareScalingLevel();

      // Lower render-target resolution gradually only when the device proves it
      // needs it. All geometry, textures, NPCs, traffic, shops and effects remain.
      if (low >= 2 && now-lastChange > 4500) {
        desired = Math.min(mobile ? 1.55 : 1.35, Math.max(desired, requested) + (memoryPressure ? .20 : .12));
        low = 0; lastChange = now;
      } else if (high >= 6 && now-lastChange > 9000) {
        desired = Math.max(requested, desired-.07);
        high = 0; lastChange = now;
      }

      if (Math.abs(desired-engine.getHardwareScalingLevel()) > .035) {
        try { engine.setHardwareScalingLevel(desired); scale=desired; } catch (_) {}
      } else scale=engine.getHardwareScalingLevel();

      for (const generator of shadows()) {
        try {
          const map=generator.getShadowMap?.();
          if (map) map.refreshRate = stressed ? 3 : (localStorage.getItem('egypt-graphics')==='high' ? 1 : 3);
        } catch (_) {}
      }
      state.hardwareScalingLevel = +scale.toFixed(2);
    };

    sample();
    const timer = setInterval(sample, 1500);
    window.addEventListener('beforeunload', () => clearInterval(timer), { once:true });

    // Street signal/UI bookkeeping does not need 60 updates per second. Preserve
    // accumulated dt so all timings and rules remain identical while reducing GC.
    for (let i=0;i<200 && !window.EgyptStreetLife?.ready;i++) await sleep(100);
    const street = window.EgyptStreetLife;
    if (street?.ready && typeof street.tick === 'function' && !street.tick.__egypt1128Throttled) {
      const original = street.tick.bind(street);
      let accumulated = 0;
      const wrapped = (dt, playing) => {
        accumulated += Math.max(0, dt || 0);
        if (playing && accumulated < 1/30) return;
        const use = Math.min(accumulated || dt || 0, .12);
        accumulated = 0;
        return original(use, playing);
      };
      wrapped.__egypt1128Throttled = true;
      street.tick = wrapped;
    }
  }

  try { installCollisionCache(); } catch (error) { console.warn('V11.28 collision optimization skipped', error); }
  installGovernor().catch(error => console.warn('V11.28 performance governor skipped', error));
})();
