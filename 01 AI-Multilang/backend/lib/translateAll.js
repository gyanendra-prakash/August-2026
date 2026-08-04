import { locales } from "./locales.js";

// Ye function ek title + body leta hai aur ise SAARI supported languages
// mein translate karke ek object return karta hai.
// Original language ko dobara translate nahi karta (as-is copy kar deta hai)

export async function translateToAllLocales(title, body, sourceLocale) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY .env mein set nahi hai");
  }

  const results = {
    [sourceLocale]: { title, body },
  };

  const targetLocales = locales.filter((loc) => loc !== sourceLocale);

  await Promise.all(
    targetLocales.map(async (locale) => {
      const prompt = `Translate the following JSON to the language with locale code "${locale}".
Reply with ONLY valid JSON in this exact shape, nothing else, no markdown fences:
{"title": "...", "body": "..."}

Input:
{"title": ${JSON.stringify(title)}, "body": ${JSON.stringify(body)}}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          }),
        }
      );

      if (!response.ok) {
        console.error(`Translation failed for ${locale}:`, await response.text());
        results[locale] = { title, body };
        return;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      try {
        const cleaned = rawText.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        results[locale] = { title: parsed.title, body: parsed.body };
      } catch (e) {
        console.error(`Parse failed for ${locale}:`, rawText);
        results[locale] = { title, body };
      }
    })
  );

  return results;
}
