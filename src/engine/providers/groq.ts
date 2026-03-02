import type { EngineProvider } from "../types";

export class GroqProvider implements EngineProvider {
  id = "groq";

  isAvailable() {
    return Boolean(process.env.GROQ_API_KEY);
  }

  async generate(prompt: string) {
    const model = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Groq request failed: ${res.status}`);
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content;
  }
}
