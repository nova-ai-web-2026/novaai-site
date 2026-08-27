const ALLOWED_MODELS = new Set(['flux','qwen-image','gptimage','seedream5','ideogram-v4-quality','nova-canvas']);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.POLLINATIONS_API_KEY;
  if (!key) return res.status(503).json({ error: 'AI image generation is not configured. Local Image Studio still works.' });

  const prompt = String(req.body?.prompt || '').trim().slice(0, 1600);
  if (!prompt) return res.status(400).json({ error: 'Prompt is empty.' });

  const requested = String(req.body?.model || 'flux');
  const model = ALLOWED_MODELS.has(requested) ? requested : 'flux';
  const width = Math.min(1536, Math.max(512, Number(req.body?.width) || 1024));
  const height = Math.min(1536, Math.max(512, Number(req.body?.height) || 1024));

  const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}&width=${width}&height=${height}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  try {
    const upstream = await fetch(url, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}` }
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      return res.status(502).json({ error: detail.slice(0, 500) || `Image provider error ${upstream.status}` });
    }
    const type = upstream.headers.get('content-type') || 'image/jpeg';
    const bytes = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', type);
    res.setHeader('Content-Length', String(bytes.length));
    return res.status(200).send(bytes);
  } catch (error) {
    if (error?.name === 'AbortError') return res.status(504).json({ error: 'Image generation timed out.' });
    console.error(error);
    return res.status(500).json({ error: 'Could not reach the image provider.' });
  } finally {
    clearTimeout(timer);
  }
}
