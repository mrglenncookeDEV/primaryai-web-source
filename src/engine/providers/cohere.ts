import type { EngineProvider } from "../types";

/**
 * Cohere — Command R series via the v2 chat API.
 * Free tier: limited RPM, no credit card required.
 *
 * Cohere's API terms explicitly state that API data is not used
 * for model training without opt-in consent. The system message
 * reinforces this as an additional contractual layer.
 */
export class CohereProvider implements EngineProvider {
  id = "cohere";

  isAvailable() {
    return Boolean(process.env.COHERE_API_KEY);
  }

  async generate(prompt: string, systemPrompt?: string) {
    const model = process.env.COHERE_MODEL ?? "command-r-plus-08-2024";
    const messages = [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      { role: "user", content: prompt },
    ];
    const res = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.45,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      throw new Error(`Cohere request failed: ${res.status}`);
    }

    const data = await res.json();
    return data?.message?.content?.[0]?.text;
  }
}
