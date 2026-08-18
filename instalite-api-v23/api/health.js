export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    model: "qwen3.8-max-preview",
    configured: Boolean(process.env.DASHSCOPE_API_KEY)
  });
}
