export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, style, prompt } = req.body || {};
  const allowedModels = new Set(['1.0', '1.5', '1.5+']);
  if (model && !allowedModels.has(model)) return res.status(400).json({ error: 'Invalid model' });

  return res.status(200).json({
    mode: 'nova-hybrid-client',
    configured: true,
    externalComposer: false,
    model: model || '1.0',
    style: typeof style === 'string' ? style : '',
    prompt: typeof prompt === 'string' ? prompt : '',
    ownership: {
      styleUnderstanding: 'Nova Core',
      composition: 'Nova Core',
      arrangement: 'Nova Core',
      eventTiming: 'Nova Core',
      externalRole: 'instrument timbre samples only'
    },
    message: 'Generation is performed by Nova Core in the browser. External music-generation models are intentionally not used as the composer.'
  });
}
