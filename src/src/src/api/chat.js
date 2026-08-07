const SYSTEM_PROMPT = `You are JM Nexus, a powerful, intelligent, and friendly AI assistant. You are sharp, helpful, and slightly futuristic in tone — like a personal AI from the near future. You remember everything in the current conversation. You answer questions clearly and thoroughly. When a user asks you to generate or create an image, respond with: [IMAGE_REQUEST: a detailed image prompt based on what they asked for]. Otherwise, have a natural conversation. Keep responses concise but complete.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
  }

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages
      })
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      return res.status(anthropicRes.status).json({ error: data?.error?.message || "Anthropic API error" });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Failed to reach Anthropic API" });
  }
}
