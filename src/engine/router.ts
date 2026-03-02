import { CloudflareWorkerProvider } from "./providers/cloudflareWorker";
import { HuggingfaceProvider } from "./providers/huggingface";
import { GeminiProvider } from "./providers/gemini";

const providers = [
  new CloudflareWorkerProvider(),
  new GeminiProvider(),
  new HuggingfaceProvider(),
];

export function selectProviders() {
  return providers.filter((p) => p.isAvailable());
}
