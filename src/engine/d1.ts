const D1_API_BASE = "https://api.cloudflare.com/client/v4";

type D1Response<T> = {
  success: boolean;
  errors?: Array<{ message?: string }>;
  result?: Array<{
    success: boolean;
    results?: T[];
    error?: string;
  }>;
};

function getD1Config() {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  const databaseId = process.env.CF_D1_DATABASE_ID;

  return { accountId, apiToken, databaseId };
}

export function isD1Available() {
  const { accountId, apiToken, databaseId } = getD1Config();
  return Boolean(accountId && apiToken && databaseId);
}

export async function d1Query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const { accountId, apiToken, databaseId } = getD1Config();
  if (!accountId || !apiToken || !databaseId) {
    throw new Error("Missing D1 configuration (CF_ACCOUNT_ID, CF_API_TOKEN, CF_D1_DATABASE_ID)");
  }

  const url = `${D1_API_BASE}/accounts/${accountId}/d1/database/${databaseId}/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!res.ok) {
    throw new Error(`D1 query failed: ${res.status}`);
  }

  const json = (await res.json()) as D1Response<T>;
  if (!json.success) {
    throw new Error(json.errors?.[0]?.message ?? "D1 API returned an error");
  }

  const statementResult = json.result?.[0];
  if (!statementResult?.success) {
    throw new Error(statementResult?.error ?? "D1 statement failed");
  }

  return statementResult.results ?? [];
}

export async function d1Exec(sql: string, params: unknown[] = []) {
  await d1Query(sql, params);
}
