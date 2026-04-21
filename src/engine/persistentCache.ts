import type { LessonPack } from "./schema";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: key ?? "",
    Authorization: `Bearer ${key ?? ""}`,
    "Content-Type": "application/json",
  };
}

function baseUrl() {
  return process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/rest/v1` : null;
}

export async function getPersistentPack(cacheKey: string): Promise<LessonPack | null> {
  const url = baseUrl();
  if (!url) return null;

  try {
    const res = await fetch(
      `${url}/engine_cache?cache_key=eq.${encodeURIComponent(cacheKey)}&select=pack,created_at&limit=1`,
      { headers: supabaseHeaders() }
    );
    if (!res.ok) return null;

    const rows: Array<{ pack: LessonPack; created_at: string }> = await res.json();
    if (!rows.length) return null;

    const age = Date.now() - new Date(rows[0].created_at).getTime();
    if (age > CACHE_TTL_MS) {
      // Expired — delete in background, don't await
      fetch(
        `${url}/engine_cache?cache_key=eq.${encodeURIComponent(cacheKey)}`,
        { method: "DELETE", headers: supabaseHeaders() }
      ).catch(() => {});
      return null;
    }

    return rows[0].pack;
  } catch {
    return null;
  }
}

export async function setPersistentPack(cacheKey: string, pack: LessonPack): Promise<void> {
  const url = baseUrl();
  if (!url) return;

  try {
    await fetch(`${url}/engine_cache`, {
      method: "POST",
      headers: {
        ...supabaseHeaders(),
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        cache_key: cacheKey,
        pack,
        created_at: new Date().toISOString(),
      }),
    });
  } catch {
    // Cache write failures are non-fatal
  }
}
