export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { audioUrl, consent, profileName } = req.body || {};
  if (consent !== true) {
    return res.status(400).json({ error: 'Explicit speaker consent is required.' });
  }
  if (typeof audioUrl !== 'string' || !/^https:\/\//i.test(audioUrl)) {
    return res.status(400).json({ error: 'A secure uploaded audio URL is required.' });
  }

  const endpoint = process.env.VOICE_CLONE_ENDPOINT;
  const apiKey = process.env.VOICE_CLONE_API_KEY;

  if (!endpoint) {
    return res.status(200).json({
      mode: 'local-signature',
      configured: false,
      message: 'No neural voice-clone provider configured. Use the local Voice Signature mode.'
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
        audioUrl,
        consent: true,
        profileName: typeof profileName === 'string' && profileName.trim() ? profileName.trim() : 'My Voice'
      })
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!upstream.ok) {
      return res.status(502).json({ error: 'Voice provider failed', providerStatus: upstream.status, details: data });
    }

    const voiceId = data.voiceId || data.voice_id || data.id;
    if (!voiceId) return res.status(502).json({ error: 'Provider returned no voice profile ID', details: data });

    return res.status(200).json({ mode: 'production-provider', configured: true, voiceId, provider: data.provider || 'configured-endpoint' });
  } catch (error) {
    return res.status(502).json({ error: 'Voice provider request failed', message: error?.message || 'Unknown error' });
  }
}
