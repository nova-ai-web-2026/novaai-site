export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, prompt, lyrics, style, duration, bpm, energy, voiceProfile } = req.body || {};
  const allowedModels = new Set(['1.0', '1.5', '1.5+']);
  if (!allowedModels.has(model)) return res.status(400).json({ error: 'Invalid model' });
  if (typeof prompt !== 'string' || !prompt.trim()) return res.status(400).json({ error: 'Prompt is required' });

  const endpoint = process.env.MUSIC_GENERATION_ENDPOINT;
  const apiKey = process.env.MUSIC_GENERATION_API_KEY;

  // No production provider configured: the web app will automatically use its
  // fully local procedural WAV engine instead of pretending a neural model ran.
  if (!endpoint) {
    return res.status(200).json({
      mode: 'local-demo',
      configured: false,
      model,
      message: 'No neural music endpoint configured; use the local browser engine.'
    });
  }

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        model,
        prompt: prompt.trim(),
        lyrics: typeof lyrics === 'string' ? lyrics : '',
        style: typeof style === 'string' ? style : 'Pop',
        duration: Number(duration) || 24,
        bpm: Number(bpm) || 118,
        energy: Number(energy) || 72,
        voiceProfile: Boolean(voiceProfile)
      })
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!upstream.ok) {
      return res.status(502).json({ error: 'Music provider failed', providerStatus: upstream.status, details: data });
    }

    const audioUrl = data.audioUrl || data.audio_url || data.url ||
      (Array.isArray(data.output) ? data.output[0] : data.output);

    if (!audioUrl || typeof audioUrl !== 'string') {
      return res.status(502).json({ error: 'Provider returned no audio URL', details: data });
    }

    return res.status(200).json({
      mode: 'production-provider',
      configured: true,
      model,
      audioUrl,
      provider: data.provider || 'configured-endpoint'
    });
  } catch (error) {
    return res.status(502).json({ error: 'Provider request failed', message: error?.message || 'Unknown error' });
  }
}
