import { CerebrasProvider } from "./providers/cerebras";
import { CloudflareWorkerProvider } from "./providers/cloudflareWorker";
import { CohereProvider } from "./providers/cohere";
import { GeminiProvider } from "./providers/gemini";
import { GroqProvider } from "./providers/groq";
import { HuggingfaceProvider } from "./providers/huggingface";
import { MistralProvider } from "./providers/mistral";
import { OpenRouterProvider } from "./providers/openrouter";
import type { EngineProvider } from "./types";

type ProviderTier = 1 | 2 | 3;

// Tier 1: Large models with fast inference — try these first, always
// Tier 2: Good models — used when Tier 1 has < 2 successes
// Tier 3: Small/edge models — fallback only
const PROVIDER_CONFIG: Array<{ provider: EngineProvider; tier: ProviderTier }> = [
  { provider: new GeminiProvider(),            tier: 1 }, // gemini-2.5-flash
  { provider: new CerebrasProvider(),          tier: 1 }, // llama-3.3-70b, very fast
  { provider: new GroqProvider(),              tier: 1 }, // llama-3.3-70b-versatile
  { provider: new OpenRouterProvider(),        tier: 2 }, // llama-3.3-70b:free
  { provider: new MistralProvider(),           tier: 2 }, // mistral-small-latest
  { provider: new CohereProvider(),            tier: 2 }, // command-r-plus
  { provider: new CloudflareWorkerProvider(),  tier: 3 }, // llama-3.1-8b
  { provider: new HuggingfaceProvider(),       tier: 3 }, // mistral-7b-instruct
];

// In-process cooldown registry: provider id -> timestamp when cooldown expires
const cooledDown = new Map<string, number>();

const RATE_LIMIT_COOLDOWN_MS = 5 * 60_000; // 5 minutes

export function markProviderRateLimited(id: string) {
  cooledDown.set(id, Date.now() + RATE_LIMIT_COOLDOWN_MS);
}

function isProviderReady(provider: EngineProvider): boolean {
  if (!provider.isAvailable()) return false;
  const expiry = cooledDown.get(provider.id);
  return !expiry || Date.now() >= expiry;
}

/** Returns all available, non-rate-limited providers for a given tier. */
export function selectTier(tier: ProviderTier): EngineProvider[] {
  return PROVIDER_CONFIG
    .filter((c) => c.tier === tier && isProviderReady(c.provider))
    .map((c) => c.provider);
}

/** Returns the single fastest available provider (Tier 1 → 2 → 3). Used for review passes. */
export function selectFastProvider(): EngineProvider | null {
  for (const tier of [1, 2, 3] as ProviderTier[]) {
    const available = selectTier(tier);
    if (available.length > 0) return available[0];
  }
  return null;
}

/** Legacy: returns all available providers across all tiers (used by schedule-ai). */
export function selectProviders(): EngineProvider[] {
  return PROVIDER_CONFIG
    .filter((c) => isProviderReady(c.provider))
    .map((c) => c.provider);
}

export function getProviderStatus() {
  const now = Date.now();
  return PROVIDER_CONFIG.map(({ provider, tier }) => {
    const cooldownExpiry = cooledDown.get(provider.id);
    const rateLimited = Boolean(cooldownExpiry && now < cooldownExpiry);
    return {
      id: provider.id,
      tier,
      available: provider.isAvailable(),
      rateLimited,
      cooldownExpiresAt: rateLimited ? cooldownExpiry : undefined,
    };
  });
}
