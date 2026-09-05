# Audio sources — V11.16, sound revision 11.16.1

Gameplay sound effects are served from the game's own `audio/v11-8/` directory.
They require no external audio host while playing. The historical directory name
is retained for existing links. This does not make the entire game offline ready.

Original sound packs by Kenney, released under Creative Commons CC0 1.0:

- RPG Audio: https://kenney.nl/assets/rpg-audio
- Interface Sounds: https://kenney.nl/assets/interface-sounds

The original license texts are included beside the audio as `LICENSE-rpg.txt`
and `LICENSE-interface.txt`. Packs were downloaded from Kenney on 2026-09-05.

| Local file | Original pack | Original file |
| --- | --- | --- |
| step_pavement.wav | RPG Audio | footstep00.ogg |
| step_asphalt.wav | RPG Audio | footstep04.ogg |
| buy_coin.wav | RPG Audio | handleCoins.ogg |
| door.wav | RPG Audio | doorClose_1.ogg |
| interact.wav | Interface Sounds | click_001.ogg |
| reward.wav | Interface Sounds | confirmation_001.ogg |
| deny.wav | Interface Sounds | error_001.ogg |

Converted to mono, 22050 Hz, 16-bit PCM WAV with FFmpeg, with a 0.85 peak limiter
and no automatic gain boost. Source archives are identified by SHA-256:

- RPG Audio: `6dbeaf8544da958d8f2adcb4a4a4b76c1ade34a05f8ab9edccd327da7375f38b`
- Interface Sounds: `f2193d072726d6758a5f7871b2dcc54dcce0d5c35c6f0a62f92549b327c81232`

`node scripts/test-egypt-life-sfx-assets.mjs` checks complete RIFF/chunk lengths,
PCM format, sample duration, and non-silent, unclipped audio.
The browser regression checks real walking, interaction, purchase, muting and
unmuting on mobile and desktop, measuring gameplay media output through an
analyser while external audio hosts are blocked.
