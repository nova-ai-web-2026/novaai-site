export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, prompt, lyrics, style, duration, bpm, energy, voiceProfile } = req.body || {};
  const allowedModels = new Set(['1.0', '1.5', '1.5+']);
  if (!allowedModels.has(model)) return res.status(400).json({ error: 'Invalid model' });

  const styleText = typeof style === 'string' ? style.trim() : '';
  const idea = typeof prompt === 'string' ? prompt.trim() : '';
  if (!styleText && !idea) return res.status(400).json({ error: 'Style or prompt is required' });

  const seconds = Math.max(3, Math.min(190, Number(duration) || 20));
  const requestedBpm = Math.max(60, Math.min(180, Number(bpm) || 118));
  const requestedEnergy = Math.max(0, Math.min(100, Number(energy) || 72));
  const quality = {
    '1.0': { steps: 4, cfgScale: 5 },
    '1.5': { steps: 6, cfgScale: 7 },
    '1.5+': { steps: 8, cfgScale: 9 }
  }[model];

  const neuralPrompt = [
    `STYLE IS THE HIGHEST PRIORITY: ${styleText || 'follow the song idea exactly'}.`,
    `Create a clearly recognizable piece in that exact musical style at about ${requestedBpm} BPM and ${requestedEnergy}% energy.`,
    'Match the genre-specific drum groove, bass language, harmony, scale or mode, lead instrumentation, phrasing, arrangement, sound palette, mix and production conventions.',
    'Do not substitute generic pop, generic EDM, or a different nearby genre.',
    idea ? `Song idea: ${idea}.` : '',
    typeof lyrics === 'string' && lyrics.trim() ? `Original lyrics supplied by the user: ${lyrics.trim()}` : 'Instrumental unless the provider naturally supports vocals.',
    voiceProfile ? 'A consented voice profile exists in the app, but do not imitate any unprovided third-party voice.' : ''
  ].filter(Boolean).join(' ');

  // Preferred production path: Stability AI Stable Audio 2.5.
  // This is a real neural text-to-music model. The key must stay server-side.
  const stabilityKey = process.env.STABILITY_API_KEY;
  if (stabilityKey) {
    try {
      const form = new FormData();
      form.append('prompt', neuralPrompt);
      form.append('output_format', 'mp3');
      form.append('duration', String(seconds));
      form.append('model', 'stable-audio-2.5');
      form.append('steps', String(quality.steps));
      form.append('cfg_scale', String(quality.cfgScale));

      const upstream = await fetch('https://api.stability.ai/v2beta/audio/stable-audio-2/text-to-audio', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${stabilityKey}`,
          accept: 'audio/*'
        },
        body: form
      });

      if (!upstream.ok) {
        let details;
        try { details = await upstream.json(); } catch { details = await upstream.text(); }
        return res.status(502).json({
          error: 'Stable Audio generation failed',
          providerStatus: upstream.status,
          details
        });
      }

      const bytes = Buffer.from(await upstream.arrayBuffer());
      return res.status(200).json({
        mode: 'production-provider',
        configured: true,
        provider: 'stable-audio-2.5',
        model,
        duration: seconds,
        mimeType: upstream.headers.get('content-type') || 'audio/mpeg',
        audioBase64: bytes.toString('base64'),
        style: styleText,
        quality
      });
    } catch (error) {
      return res.status(502).json({ error: 'Stable Audio request failed', message: error?.message || 'Unknown error' });
    }
  }

  // Optional generic provider adapter kept for existing deployments.
  const endpoint = process.env.MUSIC_GENERATION_ENDPOINT;
  const apiKey = process.env.MUSIC_GENERATION_API_KEY;
  if (endpoint) {
    try {
      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
        },
        body: JSON.stringify({
          model,
          prompt: neuralPrompt,
          originalPrompt: idea,
          lyrics: typeof lyrics === 'string' ? lyrics : '',
          style: styleText,
          duration: seconds,
          bpm: requestedBpm,
          energy: requestedEnergy,
          voiceProfile: Boolean(voiceProfile),
          strictStyle: true,
          qualityTier: model === '1.0' ? 'draft' : model === '1.5' ? 'enhanced' : 'studio'
        })
      });

      const text = await upstream.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!upstream.ok) return res.status(502).json({ error: 'Music provider failed', providerStatus: upstream.status, details: data });

      const audioUrl = data.audioUrl || data.audio_url || data.url || data.output_url ||
        (Array.isArray(data.output) ? data.output[0] : data.output) ||
        (Array.isArray(data.data) ? (data.data[0]?.url || data.data[0]?.audio_url) : null);
      if (!audioUrl || typeof audioUrl !== 'string') return res.status(502).json({ error: 'Provider returned no audio URL', details: data });

      return res.status(200).json({ mode: 'production-provider', configured: true, provider: data.provider || 'configured-endpoint', model, duration: seconds, audioUrl, style: styleText });
    } catch (error) {
      return res.status(502).json({ error: 'Provider request failed', message: error?.message || 'Unknown error' });
    }
  }

  // Do NOT silently fall back to the procedural synth for free-form Style.
  return res.status(200).json({
    mode: 'neural-unavailable',
    configured: false,
    model,
    requiresSecret: 'STABILITY_API_KEY',
    message: 'A real neural music provider is not connected. Local style imitation is intentionally disabled because it can misrepresent the requested Style.'
  });
}
