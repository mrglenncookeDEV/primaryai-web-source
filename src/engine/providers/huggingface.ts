import type { EngineProvider } from "../types";

export class HuggingfaceProvider implements EngineProvider {
  id = "huggingface";

  isAvailable() {
    return Boolean(process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_MODEL);
  }

  async generate(prompt: string, systemPrompt?: string) {
    const model = process.env.HUGGINGFACE_MODEL;
    // HuggingFace Inference API varies by model; prepend system prompt as a header block
    const fullPrompt = systemPrompt ? `[SYSTEM]\n${systemPrompt}\n[/SYSTEM]\n\n${prompt}` : prompt;
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: fullPrompt }),
    });

    if (!res.ok) {
      throw new Error(`Hugging Face request failed: ${res.status}`);
    }

    const data = await res.json();
    if (Array.isArray(data) && data[0]?.generated_text) {
      return data[0].generated_text;
    }

    return data?.generated_text ?? data;
  }
}
