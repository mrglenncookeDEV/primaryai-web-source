import type { EngineProvider } from "../types";

export class CloudflareWorkerProvider implements EngineProvider {
  id = "cloudflare-worker";

  isAvailable() {
    return Boolean(process.env.CF_API_TOKEN && process.env.CF_ACCOUNT_ID);
  }

  async generate(prompt: string) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/generate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      }
    );

    if (!res.ok) {
      throw new Error(`Cloudflare Worker request failed: ${res.status}`);
    }

    const data = await res.json();
    return data?.output_text ?? data?.result?.response;
  }
}
