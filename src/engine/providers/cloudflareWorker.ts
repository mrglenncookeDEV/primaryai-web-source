import type { EngineProvider } from "../types";

export class CloudflareWorkerProvider implements EngineProvider {
  id = "cloudflare-worker";

  isAvailable() {
    return Boolean(process.env.CF_API_TOKEN && process.env.CF_ACCOUNT_ID);
  }

  async generate(prompt: string) {
    const model = process.env.CF_MODEL ?? "@cf/meta/llama-3.1-8b-instruct";
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2500,
          temperature: 0.2,
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`Cloudflare Worker request failed: ${res.status}`);
    }

    const data = await res.json();
    return data?.result?.response ?? data?.response ?? data?.output_text;
  }
}
