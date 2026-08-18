const CHARACTERS = {
  "mariam.photo": `You are Mariam, 21, in Sydney. You like photography, coffee and walking. Warm, relaxed, observant. Text naturally and casually.`,
  "youssef.trips": `You are Youssef, 22, in Sydney. You like travel and spontaneous outings. Casual, confident, sometimes brief.`,
  "food.with.sara": `You are Sara, 20, in Parramatta. You like food and trying restaurants. Expressive, warm and natural.`,
  "omar.city": `You are Omar, 23, in Sydney. You like cars, streets and music. Concise, dry humour, not rude.`,
  "lina.art": `You are Lina, 21, in Sydney. You like art and films. Thoughtful, calm and curious.`,
  "adam.fit": `You are Adam, 22, in Sydney. You like gym and football. Casual, friendly, sometimes distracted.`
};

function systemPrompt(character) {
  const persona = CHARACTERS[character] || `You are ${character}, a fictional social-media character.`;
  return `${persona}

Text like a real person:
- Reply to the user's exact message and use the recent conversation as context.
- Arabic user message => reply naturally in Arabic; Egyptian Arabic when it fits.
- English user message => casual natural English.
- Mixed Arabic/English => natural mixing is okay.
- Never answer with a generic unrelated sentence.
- If the user says yes/no/okay, infer what it refers to from the previous turn.
- Do not repeat your previous sentence or question.
- Do not force a question at the end of every reply.
- Vary length naturally.
- Avoid customer-service/assistant wording.
- If genuinely unclear, ask one specific clarification tied to the confusing part.
- Keep normal replies concise unless the user asks for detail.`;
}

function cleanHistory(history) {
  return (Array.isArray(history) ? history : [])
    .slice(-24)
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map(m => ({ role: m.role, content: m.content.slice(0, 5000) }));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) {
    return res.status(503).json({ error: "Qwen 3.8 is not connected yet" });
  }

  const body = req.body || {};
  const character = String(body.character || "mariam.photo");
  const message = String(body.message || "").trim();

  if (!message) return res.status(400).json({ error: "Empty message" });

  const messages = [
    { role: "system", content: systemPrompt(character) },
    ...cleanHistory(body.history),
    { role: "user", content: message.slice(0, 5000) }
  ];

  const baseUrl = (process.env.DASHSCOPE_BASE_URL || "https://coding.dashscope.aliyuncs.com/v1").replace(/\/+$/, "");

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "qwen3.8-max-preview",
        messages,
        temperature: 0.82,
        top_p: 0.9,
        max_tokens: 260
      })
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const detail = data?.error?.message || data?.message || `Qwen error ${upstream.status}`;
      console.error("Qwen upstream error:", detail);
      return res.status(502).json({ error: detail });
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (!reply || typeof reply !== "string") {
      return res.status(502).json({ error: "Qwen returned an empty response" });
    }

    return res.status(200).json({
      reply: reply.trim(),
      model: "qwen3.8-max-preview"
    });
  } catch (err) {
    console.error("Qwen request failed", err);
    return res.status(500).json({ error: "Could not reach Qwen 3.8" });
  }
}
