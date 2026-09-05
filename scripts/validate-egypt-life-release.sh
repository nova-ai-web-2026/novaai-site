#!/usr/bin/env bash
set -euo pipefail
test -s egypt-life-sim-v2/index.html
test -s egypt-life-sim-v2/v11-14.html
test -s egypt-life-sim-v2/v11-15.html
test -s egypt-life-sim-v2/v11-16.html
test -s egypt-life-sim-v2/game-v7.js
test -s egypt-life-sim-v2/game-v8-layout.js
test -s egypt-life-sim-v2/game-v9.js
test -s egypt-life-sim-v2/game-v9-gaitfix.js
test -s egypt-life-sim-v2/game-v9-character-polish.js
test -s egypt-life-sim-v2/game-v9-facades.js
test -s egypt-life-sim-v2/game-v10.js
test -s egypt-life-sim-v2/game-v11.js
test -s egypt-life-sim-v2/game-v11-1.js
test -s egypt-life-sim-v2/game-v11-audiofix.js
test -s egypt-life-sim-v2/game-v11-6-runtime.js
test -s egypt-life-sim-v2/game-v11-8-sfx.js
test -s egypt-life-sim-v2/game-v11-10-actual-sfx.js
test -s egypt-life-sim-v2/game-v11-11-egypt-details.js
test -s egypt-life-sim-v2/game-v11-11-egypt-details-base.js
test -s egypt-life-sim-v2/game-v11-12-ui.js
test -s egypt-life-sim-v2/game-v11-14-local-sfx.js
test -s egypt-life-sim-v2/game-v11-15-real-sfx.js
test -s egypt-life-sim-v2/game-v12-world.js
test -s egypt-life-sim-v2/AUDIO-CREDITS.md
test -s egypt-life-sim-v2/audio/v11-8/step_pavement.wav
test -s egypt-life-sim-v2/audio/v11-8/step_asphalt.wav
test -s egypt-life-sim-v2/audio/v11-8/interact.wav
test -s egypt-life-sim-v2/audio/v11-8/buy_coin.wav
test -s egypt-life-sim-v2/audio/v11-8/door.wav
test -s egypt-life-sim-v2/audio/v11-8/reward.wav
node --check egypt-life-sim-v2/game-v7.js
node --check egypt-life-sim-v2/game-v8-layout.js
node --check egypt-life-sim-v2/game-v9.js
node --check egypt-life-sim-v2/game-v9-gaitfix.js
node --check egypt-life-sim-v2/game-v9-character-polish.js
node --check egypt-life-sim-v2/game-v9-facades.js
node --check egypt-life-sim-v2/game-v10.js
node --check egypt-life-sim-v2/game-v11.js
node --check egypt-life-sim-v2/game-v11-1.js
node --check egypt-life-sim-v2/game-v11-audiofix.js
node --check egypt-life-sim-v2/game-v11-6-runtime.js
node --check egypt-life-sim-v2/game-v11-8-sfx.js
node --check egypt-life-sim-v2/game-v11-10-actual-sfx.js
node --check egypt-life-sim-v2/game-v11-11-egypt-details.js
node --check egypt-life-sim-v2/game-v11-11-egypt-details-base.js
node --check egypt-life-sim-v2/game-v11-12-ui.js
node --check egypt-life-sim-v2/game-v11-14-local-sfx.js
node --check egypt-life-sim-v2/game-v11-15-real-sfx.js
node --check egypt-life-sim-v2/game-v12-world.js
grep -Fq 'game-v11-6-runtime.js?v=11.10' egypt-life-sim-v2/index.html
grep -Fq 'game-v8-layout.js?v=11.10&visual=11.11' egypt-life-sim-v2/index.html
grep -Fq 'game-v11-14-local-sfx.js?v=11.14' egypt-life-sim-v2/v11-14.html
grep -Fq 'game-v11-15-real-sfx.js?v=11.15' egypt-life-sim-v2/v11-15.html
grep -Fq 'game-v11-12-ui.js?v=11.16' egypt-life-sim-v2/v11-15.html
grep -Fq 'game-v11-12-ui.js?v=11.16' egypt-life-sim-v2/v11-16.html
grep -Fq 'game-v11-15-real-sfx.js?v=11.15' egypt-life-sim-v2/v11-16.html
grep -Fq "hardeningVersion:'11.16'" egypt-life-sim-v2/game-v11-12-ui.js
grep -Fq 'dedicatedPreviewCamera:true' egypt-life-sim-v2/game-v11-12-ui.js
grep -Fq "previewTarget:'street--24'" egypt-life-sim-v2/game-v11-12-ui.js
grep -Fq 'game-v11-11-egypt-details.js?v=11.11' egypt-life-sim-v2/game-v11-audiofix.js
grep -Fq 'game-v11-11-egypt-details-base.js?v=11.11' egypt-life-sim-v2/game-v11-11-egypt-details.js
grep -Fq 'game-v12-world.js?v=12' egypt-life-sim-v2/game-v11-11-egypt-details.js
grep -Fq 'openWorld:true' egypt-life-sim-v2/game-v12-world.js
grep -Fq 'startsAtHome:true' egypt-life-sim-v2/game-v11-18-story.js
grep -Fq 'Greater Cairo mixed-use residential street cues' egypt-life-sim-v2/game-v12-world.js
grep -Fq '#v12Skip{display:none!important}' egypt-life-sim-v2/game-v11-11-egypt-details.js
grep -Fq 'same-origin-local-sfx' egypt-life-sim-v2/game-v11-14-local-sfx.js
grep -Fq "visualRelease:'11.13'" egypt-life-sim-v2/game-v11-audiofix.js
grep -Fq 'additiveOnly:true' egypt-life-sim-v2/game-v11-11-egypt-details.js
grep -Fq 'removedMeshes:0' egypt-life-sim-v2/game-v11-11-egypt-details.js
grep -Fq 'disabledLegacyMeshes:0' egypt-life-sim-v2/game-v11-11-egypt-details.js
grep -Fq 'checkCollisions=false' egypt-life-sim-v2/game-v11-11-egypt-details.js
grep -Fq 'CC0 1.0' egypt-life-sim-v2/AUDIO-CREDITS.md
if grep -Fq "classList.add('game-started')" egypt-life-sim-v2/index.html; then echo 'premature HTML start flag present'; exit 1; fi
# The active release uses one same-origin HTMLAudio layer. Its recorded output is
# verified by the reusable SFX workflow before deployment.
grep -Fq 'game-v11-15-real-sfx.js?v=11.16&fix=3' egypt-life-sim-v2/index.html
grep -Fq 'game-v11-15-real-sfx.js?v=11.16&fix=3' egypt-life-sim-v2/game-v11-audiofix.js
grep -Fq "release:'11.16'" egypt-life-sim-v2/game-v11-audiofix.js
grep -Fq "primary:'html-audio-same-origin'" egypt-life-sim-v2/game-v11-15-real-sfx.js
! grep -Eq '<script[^>]+src="game-v11-(8-sfx|10-actual-sfx|14-local-sfx)' egypt-life-sim-v2/index.html
node scripts/test-egypt-life-sfx-assets.mjs
node --input-type=module - <<'JS'
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const release=JSON.parse(readFileSync('egypt-life-sim-v2/release.json','utf8'));
assert.equal(release.version,'11.18.0');
assert.equal(release.audioRevision,release.version);
assert.ok(readFileSync('egypt-life-sim-v2/index.html','utf8').includes(`data-release="${release.version}"`));
JS

node --check egypt-life-sim-v2/game-v11-16-street.js

node --check egypt-life-sim-v2/game-v11-18-story.js
node --check egypt-life-sim-v2/game-v11-18-people.js
node --check egypt-life-sim-v2/game-v11-18-frontages.js
