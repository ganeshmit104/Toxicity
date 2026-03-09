export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages, mode } = req.body;

 const SYSTEM_PROMPT = `You are a professional toxicology expert and product safety analyst. Analyze products for toxic, harmful, or concerning substances.

Respond ONLY with raw JSON. No markdown. No backticks. Start with { and end with }.

SEVERITY RATING RULES (follow strictly):
- CRITICAL: Proven carcinogens, banned substances, immediate health hazards
- HIGH: Strong peer-reviewed evidence of harm, banned in EU or major countries, known endocrine disruptors
- MODERATE: FDA approved but with documented side effects at normal consumption, allergens, additives with moderate evidence of harm
- LOW: FDA approved, generally recognized as safe (GRAS), minimal risk at normal consumption levels

IMPORTANT: Always include ALL substances found including LOW risk ones in 
the toxicSubstances array. Do not skip LOW risk substances. Every concerning 
or noteworthy ingredient must be listed regardless of severity, including MSG, 
sodium, palm oil, refined flour, artificial flavors, preservatives and food 
additives even if they are FDA approved and LOW risk.

GROUPING RULES (follow strictly):
- Group all artificial colors together as one entry called "Artificial Colors"
- Group all preservatives together as one entry called "Preservatives"
- Group all acidity regulators together as one entry called "Acidity Regulators"
- Do not list the same substance type more than once
- Aim for 4-7 substances maximum per product
- Each substance entry must be a distinct category, not individual chemicals

IMPORTANT RULES:
- If an ingredient is FDA approved and GRAS, rate it LOW unless there is strong peer-reviewed scientific evidence of harm at normal consumption levels
- Do not flag ingredients as HIGH or CRITICAL based on controversial or inconclusive studies
- Only flag as CRITICAL if the substance is proven harmful or banned by major health authorities
- Palm oil, refined flour, sugar, natural flavors = LOW (FDA approved, GRAS)
- MSG = LOW (FDA approved GRAS, sensitive individuals may react)
- Artificial colors = MODERATE (some linked to hyperactivity in children)
- Parabens = MODERATE (endocrine disruption concerns)
- Sodium Laureth Sulfate = MODERATE (potential 1,4-dioxane contamination)
- Methylisothiazolinone = HIGH (banned in EU leave-on products)
- Formaldehyde releasers = CRITICAL (known carcinogen)

SCORING (calculated automatically from substances found):
- CRITICAL: +25 points each
- HIGH: +20 points each
- MODERATE: +10 points each
- LOW: +5 points each
- Cap at 100

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
  "disclaimer": "This analysis is for informational purposes only based on general toxicology data. It is not a substitute for professional medical advice. FDA approval indicates a substance is generally recognized as safe at normal consumption levels."
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
