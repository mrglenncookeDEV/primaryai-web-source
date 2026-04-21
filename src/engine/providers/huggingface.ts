import type { EngineProvider } from "../types";

export class HuggingfaceProvider implements EngineProvider {
  id = "huggingface";

  isAvailable() {
    return Boolean(process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_MODEL);
  }

  async generate(prompt: string, systemPrompt?: string) {
    // HuggingFace router → featherless-ai provider (OpenAI-compatible)
    const model = process.env.HUGGINGFACE_MODEL ?? "Qwen/Qwen2.5-7B-Instruct";
    const res = await fetch(
      "https://router.huggingface.co/featherless-ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
            { role: "user", content: prompt },
          ],
          max_tokens: 4096,
          temperature: 0.45,
        }),
      }
    );

    if (!res.ok) {
      const details = await res.text().catch(() => "");
      throw new Error(`HuggingFace request failed: ${res.status}${details ? ` - ${details.slice(0, 200)}` : ""}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("HuggingFace returned empty content");
    return content;
  }
}
