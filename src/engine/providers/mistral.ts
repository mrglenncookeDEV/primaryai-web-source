import type { EngineProvider } from "../types";

export class MistralProvider implements EngineProvider {
  id = "mistral";

  isAvailable() {
    return Boolean(process.env.MISTRAL_API_KEY);
  }

  async generate(prompt: string, systemPrompt?: string) {
    const model = process.env.MISTRAL_MODEL ?? "mistral-small-latest";
    const messages = [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      { role: "user", content: prompt },
    ];
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.45,
        response_format: { type: "json_object" },
        messages,
      }),
    });

    if (!res.ok) {
      throw new Error(`Mistral request failed: ${res.status}`);
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content;
  }
}
