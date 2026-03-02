import type { EngineProvider } from "../types";

export class GeminiProvider implements EngineProvider {
  id = "gemini";

  isAvailable() {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  async generate(prompt: string) {
    const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`Gemini request failed: ${res.status}`);
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text;
  }
}
