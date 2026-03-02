import type { EngineProvider } from "../types";

export class HuggingfaceProvider implements EngineProvider {
  id = "huggingface";

  isAvailable() {
    return Boolean(process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_MODEL);
  }

  async generate(prompt: string) {
    const model = process.env.HUGGINGFACE_MODEL;
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
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
