// api/generate.js
// Proxies requests to Groq. Supports two modes:
//   type: "story"  → llama-3.3-70b-versatile  (smart, handles JSON + complex narrative)
//   type: "art"    → llama-3.1-8b-instant      (fast/cheap, just draws ASCII)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, type = 'story' } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  // Art calls use the small/fast model. Story calls use the big model.
  const model      = type === 'art' ? 'deepseek-r1-distill-qwen-32b' : 'llama-3.3-70b-versatile';
  const max_tokens = type === 'art' ? 250 : 500;
  const temp       = type === 'art' ? 0.3 : 0.9;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens,
        temperature: temp,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Groq API error:', data);
      return res.status(500).json({ error: data.error?.message ?? 'Groq API error' });
    }

    const text = data.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({ text });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
