export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, prompt, lyrics, style, duration, bpm, energy, voiceProfile, styleAnalysis } = req.body || {};
  const allowedModels = new Set(['1.0', '1.5', '1.5+']);
  if (!allowedModels.has(model)) return res.status(400).json({ error: 'Invalid model' });
  if ((typeof prompt !== 'string' || !prompt.trim()) && (typeof style !== 'string' || !style.trim())) {
    return res.status(400).json({ error: 'Prompt or style is required' });
  }

  const endpoint = process.env.MUSIC_GENERATION_ENDPOINT;
  const apiKey = process.env.MUSIC_GENERATION_API_KEY;
  if (!endpoint) {
    return res.status(200).json({
      mode: 'local-demo',
      configured: false,
      model,
      message: 'No neural music endpoint configured; use the strict local genre arranger.'
    });
  }

  const strictStyle = typeof style === 'string' && style.trim() ? style.trim() : 'unspecified';
  const idea = typeof prompt === 'string' ? prompt.trim() : '';
  const strictPrompt = [
    `STYLE REQUIREMENT (highest priority): ${strictStyle}.`,
    'The generated music must audibly follow this style. Match its characteristic rhythm, tempo feel, instrumentation, harmony, bass language, melodic phrasing, arrangement and production conventions.',
    styleAnalysis?.genre ? `Detected genre: ${styleAnalysis.genre}.` : '',
    styleAnalysis?.mood ? `Mood: ${styleAnalysis.mood}.` : '',
    styleAnalysis?.lead ? `Requested lead/timbre: ${styleAnalysis.lead}.` : '',
    idea ? `Song idea: ${idea}.` : '',
    'Do not substitute a generic pop/electronic arrangement when the requested style is different.'
  ].filter(Boolean).join(' ');

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        model,
        prompt: strictPrompt,
        originalPrompt: idea,
        lyrics: typeof lyrics === 'string' ? lyrics : '',
        style: strictStyle,
        stylePrompt: strictStyle,
        strictStyle: true,
        styleAnalysis: styleAnalysis || null,
        duration: Number(duration) || 20,
        bpm: Number(bpm) || 118,
        energy: Number(energy) || 72,
        voiceProfile: Boolean(voiceProfile),
        qualityTier: model === '1.0' ? 'draft' : model === '1.5' ? 'enhanced' : 'studio'
      })
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!upstream.ok) {
      return res.status(502).json({ error: 'Music provider failed', providerStatus: upstream.status, details: data });
    }

    const audioUrl = data.audioUrl || data.audio_url || data.url || data.output_url ||
      (Array.isArray(data.output) ? data.output[0] : data.output) ||
      (Array.isArray(data.data) ? (data.data[0]?.url || data.data[0]?.audio_url) : null);

    if (!audioUrl || typeof audioUrl !== 'string') {
      return res.status(502).json({ error: 'Provider returned no audio URL', details: data });
    }

    return res.status(200).json({
      mode: 'production-provider',
      configured: true,
      model,
      audioUrl,
      provider: data.provider || 'configured-endpoint',
      strictStyle
    });
  } catch (error) {
    return res.status(502).json({ error: 'Provider request failed', message: error?.message || 'Unknown error' });
  }
}
