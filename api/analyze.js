export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages, mode } = req.body;

 const SYSTEM_PROMPT = `You are a toxicology expert. Analyze products for toxic substances.
Respond ONLY with raw JSON. No markdown. No backticks. Start with { end with }.

SCORING RULES (always follow exactly):
- Each CRITICAL substance found: +25 points
- Each HIGH substance found: +20 points
- Each MODERATE substance found: +10 points
- Each LOW substance found: +5 points
- Start from 0, cap at 100
- overallRisk must follow: 0-25=LOW, 26-50=MODERATE, 51-75=HIGH, 76-100=CRITICAL

Always identify the same substances for the same product consistently.

JSON structure:
{
  "productName": "string",
  "category": "string",
  "overallRisk": "LOW or MODERATE or HIGH or CRITICAL",
  "riskScore": 0,
  "summary": "string",
  "toxicSubstances": [{"name":"string","severity":"LOW or MODERATE or HIGH or CRITICAL","type":"string","description":"string","foundIn":"string"}],
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

// Recalculate score from substances
const points = { CRITICAL: 25, HIGH: 20, MODERATE: 10, LOW: 5 };
const calculatedScore = Math.min(100,
  (parsed.toxicSubstances || []).reduce((sum, s) => sum + (points[s.severity] || 0), 0)
);
parsed.riskScore = calculatedScore;

// Recalculate overall risk
if (calculatedScore <= 25) parsed.overallRisk = "LOW";
else if (calculatedScore <= 50) parsed.overallRisk = "MODERATE";
else if (calculatedScore <= 75) parsed.overallRisk = "HIGH";
else parsed.overallRisk = "CRITICAL";

res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
