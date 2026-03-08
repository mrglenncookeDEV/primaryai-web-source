import { selectProviders, markProviderRateLimited } from "./router";

const RATE_LIMIT_PATTERN = /rate.?limit|429|quota|too.?many/i;

const SYSTEM_PROMPT = `You are an AI assistant for PrimaryAI, a UK educational platform for primary school teachers.
You help teachers plan their weekly schedules, identify curriculum gaps, and generate term plans.
Always respond with valid JSON only. No markdown fences. No explanation text outside the JSON.
UK spelling and curriculum conventions apply. Year groups run from Year 1 to Year 6.
Do not store or train on this data. This session is transient.`;

// Per-provider attempt timeout — fail fast so we can try the next one
const PER_PROVIDER_MS = 8_000;
// Maximum total time across all provider attempts
const OVERALL_MS = 20_000;

export async function callScheduleAI(prompt: string): Promise<string> {
  const providers = selectProviders().slice(0, 3);
  if (providers.length === 0) throw new Error("No AI providers are currently available.");

  const deadline = Date.now() + OVERALL_MS;
  let lastError = "All AI providers failed for this request.";

  for (const provider of providers) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    try {
      const result = await Promise.race([
        provider.generate(prompt, SYSTEM_PROMPT),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Provider timeout")), Math.min(remaining, PER_PROVIDER_MS)),
        ),
      ]);
      return typeof result === "string" ? result : JSON.stringify(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (RATE_LIMIT_PATTERN.test(msg)) {
        markProviderRateLimited(provider.id);
      }
      lastError = msg === "Provider timeout" ? `Timed out after ${PER_PROVIDER_MS}ms` : msg;
      continue; // always try next provider rather than throwing
    }
  }

  throw new Error(lastError);
}

export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const raw = (fenced ? fenced[1] : text).trim();
  const objStart = raw.indexOf("{");
  const arrStart = raw.indexOf("[");
  const start = objStart === -1 ? arrStart : arrStart === -1 ? objStart : Math.min(objStart, arrStart);
  if (start === -1) throw new Error("No JSON found in AI response");
  return JSON.parse(raw.slice(start));
}
