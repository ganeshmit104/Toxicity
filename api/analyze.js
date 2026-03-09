export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages, mode } = req.body;

  const SYSTEM_PROMPT = `You are a toxicology expert and product safety analyst. Analyze products for toxic, harmful, or concerning substances.
Respond ONLY with a raw JSON object. No markdown. No backticks. No text before or after. Start with { and end with }.
{
  "productName": "string",
  "category": "string",
  "overallRisk": "LOW or MODERATE or HIGH or CRITICAL",
  "riskScore": 0,
  "summary": "string",
  "toxicSubstances": [{"name":"string","severity":"LOW","type":"string","description":"string","foundIn":"string"}],
  "safeIngredients": ["string"],
  "recommendations": ["string"],
  "regulatoryFlags": ["string"],
  "disclaimer": "string"
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    const rawText = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
    const clean = rawText.replace(/```json|```/gi, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: "No JSON in response", raw: rawText.slice(0, 300) });

    const parsed = JSON.parse(match[0]);
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
