# Egyptian Life 11.21 review — 6 September 2026

The reported problem was a mismatch between the introductory dialogue and the visible scene. The review first rendered all four scenes from 11.20 in Chrome with WebGL, then repeated the same route after changing the scene. JPEG evidence is retained in the GitHub Actions job logs under `VISUAL_EVIDENCE_*`.

## Opening: words and visible actions

| Beat | Observed in 11.20 | Revised scene |
| --- | --- | --- |
| Wake-up | An upright character behind a sofa while the text described waking up | Hero lying on the bed, closed eyes and a vibrating bedside clock |
| Getting up | Almost the same stationary pose | Hero sits at the foot of the bed and stretches; the camera shows bent knees |
| Mother's errand | Mother stands with arms down | Mother reaches out and passes banknotes to the hero while asking for four loaves and ful |
| Leaving | Both characters remain inside behind furniture | Door opens and hero walks across the threshold onto the apartment landing; the caption explicitly describes the later cut to the street |

Arabic captions use connected text, right-to-left layout, character-by-character typing and a short visible action description. Manual reading, revealing a full line, next, automatic progression, mute, skip and Continue are preserved. Dialogue has no recorded voices.

An intermediate visual check caught legs disappearing into the quilt and an exit that stopped short of the door. The poses, camera and route were revised. Tests now examine joint world positions, not just the presence of character meshes.

## Gameplay coverage

- Opening rendered in desktop Chrome and a 390 × 844 touch/mobile emulation. This is not a physical phone test.
- One real purchase from each of the nine core shop types: ful, koshary, cafe, juice, kiosk, groceries, kebda, bakery and produce. Each check opens the menu, buys through its button, checks the wallet deduction, and closes the menu. The 71 repeated core facades are not all individually clicked.
- Twelve additional food storefronts now connect to the existing shop menus. A bakery in that neighborhood is exercised through a four-loaf errand purchase. Eight unsupported service storefronts are visibly marked closed; those services are not implemented.
- The breakfast quest has separate desktop/mobile checks covering the real shopping and delivery sequence. Later market, paid work and home/rest stages are tested from a saved-game fixture; the fixture does not replace breakfast completion coverage.
- Indoor movement is exercised using keyboard input after returning home. The home floor previously counted as a wall in the expanded collision code; floors below player obstacle height are now excluded.
- Existing release checks also cover menu camera stability, touch look and release, movement, save/Continue, readable mounted signs, sound output, silent NPC dialogue close, mute/unmute, and absence of browser runtime errors.
- Release deployment waits for these checks. Public verification compares the deployed commit and every stamped asset hash, then exercises sound/gameplay and the breakfast route again.

The local browser available for this review could not initialize WebGL. The actual 3D runs and screenshots therefore come from Chrome on the GitHub Actions runner. Test camera positioning and teleport helpers are used to visit shops efficiently; movement itself has separate input-driven checks.

## Egyptian street comparison

These are specific visual references, not a claim that every Egyptian neighborhood has the same appearance:

1. [Ful cart photograph, El Watan, 16 January 2023](https://www.elwatannews.com/news/details/6406172): a painted cart, metal cooking pots, bread and serving dishes, outdoor seating and a lived-in urban background.
2. [Building photograph at 9 Toson Street, Shubra, listing dated 22 November 2022](https://aqaryamasr.com/realestate/25267-شقة-سكنية-130م-للايجار-الشهرى-بشبرا-القاهرة): varied balcony enclosures, wooden shutters, air conditioners, different ground-floor fronts and closely parked cars. Only the photograph is used; no inference about current rental availability or prices is made.
3. [Street report on Khlousy Street, Egypt Independent, 23 July 2011](https://www.egyptindependent.com/streets-cairo-khlousy-street-never-sleeps/): contextual evidence of vendors and cafes. It also describes a street grid, so a grid alone is not treated as an inauthentic feature.

| Visual feature | Comparison and decision |
| --- | --- |
| Ful cart | The model needed recognizable wheels, painted panels, rounded pots with narrower necks, a tray and bread. Those details are added without copying photographs into game assets. A close-up also exposed a suspended sign hiding the pots: it is now a plaque on the cart body. Invisible interaction volumes are no longer treated as physical supports for signs. |
| Shop fronts | Mounted Arabic signs, awnings, handles, counters and cafe seating help. Repeated flat shop textures and similar facade widths still limit variety. |
| Buildings and street activity | The reference photographs show more varied balconies, shutters and ground floors, plus more parked vehicles and people than the inspected game view. The game's repeated blocks and spacious, orderly street layout remain a visible limitation. |

The recommended next art pass is one carefully composed playable neighborhood with varied facades, curbside parking and denser activity. This release fixes the concrete story and interaction problems and adds selected cart details; it does not claim that the whole city now matches a real Egyptian street.
