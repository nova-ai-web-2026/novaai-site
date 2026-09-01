# Nova Music AI Studio

A provider-ready AI music product prototype with three progressive models:

- **Nova 1.0** — strongest emphasis on speed and musical ideation.
- **Nova 1.5** — improves every area over 1.0, with the largest jump in phrasing and expression.
- **Nova 1.5+** — improves every area again, with the largest jump in arrangement, stereo detail and mastering polish.

## What works immediately

The browser contains a real procedural audio engine that renders stereo WAV files with drums, bass, chords and lead layers. The three model tiers use different arrangement depth, harmonic complexity, humanisation, stereo movement, sample rate and mastering settings.

The **Your Voice** workflow accepts an approximately two-minute sample (110–130 seconds), requires an explicit consent confirmation, measures a local Voice Signature and uses those characteristics to shape the synthetic lead. The two-minute calibration progress is intentionally part of the product experience.

This local Voice Signature is **not presented as neural voice cloning**. A real neural music or voice provider can be connected through the API adapters below.

## Production provider adapters

Set these environment variables in Vercel when a real inference backend is available:

```text
MUSIC_GENERATION_ENDPOINT=https://your-provider.example/generate
MUSIC_GENERATION_API_KEY=...
VOICE_CLONE_ENDPOINT=https://your-provider.example/voice-clone
VOICE_CLONE_API_KEY=...
```

`api/generate.js` expects the configured music provider to eventually return one of:

```json
{ "audioUrl": "https://..." }
```

or `audio_url`, `url`, or the first string in `output`.

`api/voice-clone.js` accepts a secure uploaded `audioUrl` and explicit `consent: true`, then expects a provider response containing `voiceId`, `voice_id`, or `id`.

## Vercel deployment

Import the GitHub repository into Vercel and set **Root Directory** to:

```text
music-ai-studio
```

No build command is required. The static UI is served from `index.html`, and `/api/*` uses Vercel Functions.

## Safety / consent

The voice-profile workflow is intentionally consent-gated. It should be used for the user's own voice or a speaker who clearly gave permission. The product must not be positioned as a tool for impersonating people without permission.
