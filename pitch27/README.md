# PITCH 27 3D

Original mobile football prototype using WebGL/Three.js. It does not include EA SPORTS, FIFA, real club, real player, league, or proprietary game assets.

## 3D upgrade
- True WebGL 3D renderer
- Follow camera with perspective
- 3D humanoid players with simple run animation
- 3D ball with vertical shot arc and rotation
- 3D pitch, goals, stands, floodlights, shadows and fog
- Mobile joystick + shoot/pass/sprint/switch
- Quick Match, 3-match Cup Run, Training
- Auto quality scaling for lower-memory phones
- Landscape PWA shell

The Three.js module is pinned to version 0.185.1 and loaded from jsDelivr on first load. The service worker caches game files for repeat visits.
