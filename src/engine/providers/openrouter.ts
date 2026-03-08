import type { EngineProvider } from "../types";

/**
 * OpenRouter — single API key giving access to many models, including free-tier ones.
 * Default: meta-llama/llama-3.3-70b-instruct:free (append ":free" suffix for free models).
 *
 * Privacy: HTTP-Referer and X-Title headers identify the app so OpenRouter can apply
 * the correct data-handling policy. Free-tier models route to providers whose terms
 * prohibit training on API inputs.
 */
export class OpenRouterProvider implements EngineProvider {
  id = "openrouter";

  isAvailable() {
    return Boolean(process.env.OPENROUTER_API_KEY);
  }

  async generate(prompt: string, systemPrompt?: string) {
    const model = process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free";
    const messages = [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      { role: "user", content: prompt },
    ];
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://primaryai.org.uk",
        "X-Title": "PrimaryAI",
      },
      body: JSON.stringify({
        model,
        temperature: 0.45,
        response_format: { type: "json_object" },
        messages,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenRouter request failed: ${res.status}`);
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content;
  }
}
