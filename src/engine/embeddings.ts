export async function embedText(text: string): Promise<number[]> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_API_TOKEN;

  if (!accountId || !token) {
    throw new Error("Missing Cloudflare credentials for embeddings");
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/baai/bge-base-en-v1.5`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    }
  );

  if (!res.ok) {
    throw new Error(`Embedding request failed: ${res.status}`);
  }

  const json = await res.json();
  const embedding = json?.result?.data?.[0] ?? json?.data?.[0];

  if (!Array.isArray(embedding)) {
    throw new Error("Embedding response did not include vector data");
  }

  return embedding.map((value: unknown) => Number(value));
}
