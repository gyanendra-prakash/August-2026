import express from "express";

const router = express.Router();


router.post("/", async (req, res) => {
  const { message, locale } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY .env mein set nahi hai");
    return res.status(500).json({ reply: "Server setup error: API key missing." });
  }

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
                  text: `Respond only in the language with locale code "${locale}". User message: ${message}`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return res.status(500).json({ reply: "Sorry, something went wrong." });
    }

    const data = await response.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, something went wrong.";

    res.json({ reply });
  } catch (err) {
    console.error("Chat route error:", err.message);
    res.status(500).json({ reply: "Sorry, something went wrong." });
  }
});

export default router;
