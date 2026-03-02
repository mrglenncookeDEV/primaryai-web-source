import { CloudflareWorkerProvider } from "./providers/cloudflareWorker";
import { HuggingfaceProvider } from "./providers/huggingface";
import { GeminiProvider } from "./providers/gemini";
import { GroqProvider } from "./providers/groq";

const providers = [
  new CloudflareWorkerProvider(),
  new GroqProvider(),
  new GeminiProvider(),
  new HuggingfaceProvider(),
];

export function selectProviders() {
  return providers.filter((p) => p.isAvailable());
}

export function getProviderStatus() {
  return providers.map((provider) => ({
    id: provider.id,
    available: provider.isAvailable(),
  }));
}
