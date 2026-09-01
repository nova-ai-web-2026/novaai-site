# Nova Music AI V5.2 — Hybrid Architecture

## Ownership

Nova Core owns the musical decisions:

- Style parsing and composite-style interpretation
- Rhythm family and groove
- Harmony family, scale/mode and chord voicing
- BPM selection unless the user explicitly overrides it
- Bass notes and timing
- Melody notes, motifs, ornaments and phrasing
- Drum events and timing
- Section structure and transitions
- The quality ladder between Nova 1.0, 1.5 and 1.5+

The generated `Nova Blueprint` is the source of truth. Renderers are not allowed to rewrite it.

## External role

External resources are limited to instrument timbre samples. The current renderer can load FluidR3 General MIDI samples for piano, guitar, strings, flute, bell, bass and related timbres. If an external sample cannot load, the same Nova-authored note event is rendered with the internal WebAudio fallback.

External music-generation models are not used as the composer.

## Model ladder

- Nova 1.0: 8-step melody grid, 3-note chord depth, lower variation and detail.
- Nova 1.5: 12-step melody grid, 4-note chord depth, more variation, ornamentation and transitions.
- Nova 1.5+: 16-step melody grid, 5-note chord depth, highest drum/bass detail, humanization and transition density.

## Composite styles

Nova parses rhythm, harmony and lead instrument independently. Examples:

- `dark jazz piano with trap drums and 808` → Trap rhythm + Jazz harmony + Piano lead.
- `bright cinematic strings with afrobeat drums` → Afrobeat rhythm + bright/major harmony + Strings lead.
- `Arabic trap with oud, Hijaz melody and sliding 808` → Trap rhythm + Hijaz harmony + Oud lead.

## Licensing note

FluidR3 is used only as an external sample/timbre source. Keep the applicable FluidR3 attribution/license notices with any redistributed sample assets. Nova does not redistribute or claim ownership of those recordings.
