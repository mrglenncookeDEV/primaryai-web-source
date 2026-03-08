import type { EngineProvider } from "../types";

export class CerebrasProvider implements EngineProvider {
  id = "cerebras";

  isAvailable() {
    return Boolean(process.env.CEREBRAS_API_KEY);
  }

  async generate(prompt: string, systemPrompt?: string) {
    const model = process.env.CEREBRAS_MODEL ?? "llama-3.3-70b";
    const messages = [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      { role: "user", content: prompt },
    ];
    const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}`,
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
      throw new Error(`Cerebras request failed: ${res.status}`);
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content;
  }
}
