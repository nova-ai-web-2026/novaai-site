# Audio sources — V11.10

V11.10 uses actual sampled sound effects from Kenney asset packs under Creative Commons Zero (CC0 1.0).

## Kenney RPG Audio

Used for footsteps, door effects and coin handling.

- Creator: Kenney Vleugels / Kenney.nl
- License: CC0 1.0
- Source mirror: `ETdoFresh/kenney.nl`
- Pinned mirror commit: `45df48c4d45f8716216b1a9e22df0b69cd9f5932`
- Original pack: Kenney RPG Audio
- Files used: `footstep00.ogg` through `footstep07.ogg`, `doorClose_1.ogg`, `doorClose_3.ogg`, `handleCoins.ogg`, `handleCoins2.ogg`

## Kenney Interface Sounds

Used for interaction clicks, confirmations and denial/error feedback.

- Creator/distributor: Kenney / Kenney.nl
- License: CC0 1.0
- Source mirror: `ETdoFresh/kenney.nl`
- Pinned mirror commit: `45df48c4d45f8716216b1a9e22df0b69cd9f5932`
- Original pack: Kenney Interface Sounds
- Files used: `click_001.ogg`, `click_003.ogg`, `confirmation_001.ogg`, `confirmation_003.ogg`, `error_001.ogg`

The browser fetches these pinned samples and decodes them into the game's shared WebAudio context. The V11.9 procedural Foley bank remains only as an emergency fallback if a sample cannot be loaded.