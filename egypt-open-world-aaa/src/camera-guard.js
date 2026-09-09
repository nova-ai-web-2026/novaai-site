(() => {
  'use strict';

  let attached = false;
  let streetSide = false;

  function attachGuard() {
    const engine = window.BABYLON?.Engine?.LastCreatedEngine;
    const scene = engine?.scenes?.[0];
    const camera = scene?.activeCamera;
    const player = scene?.getMeshByName('yassin-collider');

    if (!scene || !camera || !player) {
      requestAnimationFrame(attachGuard);
      return;
    }
    if (attached) return;
    attached = true;

    scene.onBeforeRenderObservable.add(() => {
      if (camera.name !== 'camera' || !player.isEnabled()) return;

      const p = player.position;
      const inApartmentX = p.x > -29.5 && p.x < -14.5;
      const justOutsideEntrance = inApartmentX && p.z > -10.32 && p.z < -5.35;
      const clearlyInside = inApartmentX && p.z < -10.58;
      const clearOfBuilding = p.z > -5.25 || !inApartmentX;

      if (justOutsideEntrance) streetSide = true;
      if (clearlyInside || clearOfBuilding) streetSide = false;

      if (streetSide) {
        // Keep the camera on the street side of the player so the apartment
        // facade can never sit between the camera and Yassin after exit.
        camera.rotationOffset = 0;
        camera.radius = Math.min(camera.radius, 2.9);
        camera.heightOffset = Math.min(camera.heightOffset, 2.05);
      } else if (clearlyInside) {
        camera.rotationOffset = 180;
      }
    });

    window.__SHWARE3_CAMERA_GUARD = {
      ready: true,
      state: () => ({streetSide, rotationOffset: camera.rotationOffset, radius: camera.radius})
    };
  }

  requestAnimationFrame(attachGuard);
})();
