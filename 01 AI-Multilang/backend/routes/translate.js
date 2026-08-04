import express from "express";

const router = express.Router();

// POST /api/translate — kisi ek text ko multiple locales mein translate karta hai
// (JSON files manually update karne ke liye helper)

router.post("/", async (req, res) => {
  const { text, targetLocales } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY missing in .env" });
  }

  const results = {};

  for (const locale of targetLocales) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Translate this UI text to locale "${locale}". Reply with ONLY the translated text, nothing else: "${text}"`,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        console.error("Gemini API error:", response.status, await response.text());
        results[locale] = "";
        continue;
      }

      const data = await response.json();
      results[locale] = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    } catch (err) {
      console.error(`Translate error for ${locale}:`, err.message);
      results[locale] = "";
    }
  }

  res.json({ translations: results });
});

export default router;
