import { CerebrasProvider } from "./providers/cerebras";
import { CloudflareWorkerProvider } from "./providers/cloudflareWorker";
import { CohereProvider } from "./providers/cohere";
import { GeminiProvider } from "./providers/gemini";
import { GroqProvider } from "./providers/groq";
import { HuggingfaceProvider } from "./providers/huggingface";
import { MistralProvider } from "./providers/mistral";
import { OpenRouterProvider } from "./providers/openrouter";

const providers = [
  new CerebrasProvider(),   // llama-3.3-70b — very fast, free tier
  new GroqProvider(),        // llama-3.3-70b-versatile — fast, free tier
  new GeminiProvider(),      // gemini-2.0-flash — strong reasoning, free tier
  new MistralProvider(),     // mistral-small-latest — efficient, free tier
  new OpenRouterProvider(),  // llama-3.3-70b:free — free models via single key
  new CohereProvider(),      // command-r-plus — strong instruction following, free tier
  new CloudflareWorkerProvider(), // llama-3.1-8b — edge inference, free tier
  new HuggingfaceProvider(), // configurable model, free tier
];

// In-process cooldown registry: provider id -> timestamp when cooldown expires
const cooledDown = new Map<string, number>();

const RATE_LIMIT_COOLDOWN_MS = 5 * 60_000; // 5 minutes

export function markProviderRateLimited(id: string) {
  cooledDown.set(id, Date.now() + RATE_LIMIT_COOLDOWN_MS);
}

export function selectProviders() {
  const now = Date.now();
  return providers.filter((p) => {
    if (!p.isAvailable()) return false;
    const cooldownExpiry = cooledDown.get(p.id);
    return !cooldownExpiry || now >= cooldownExpiry;
  });
}

export function getProviderStatus() {
  const now = Date.now();
  return providers.map((provider) => {
    const cooldownExpiry = cooledDown.get(provider.id);
    const rateLimited = Boolean(cooldownExpiry && now < cooldownExpiry);
    return {
      id: provider.id,
      available: provider.isAvailable(),
      rateLimited,
      cooldownExpiresAt: rateLimited ? cooldownExpiry : undefined,
    };
  });
}
