import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");

if (!fs.existsSync(envPath)) {
  console.error("Missing .env.local. Run: npm run setup:env");
  process.exit(1);
}

const raw = fs.readFileSync(envPath, "utf8");
const lines = raw.split(/\r?\n/);
const map = {};
for (const line of lines) {
  if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
  const [key, ...rest] = line.split("=");
  map[key.trim()] = rest.join("=").trim();
}

const required = [
  "NEXT_PUBLIC_APP_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STARTER",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const missing = required.filter((key) => !map[key]);
if (missing.length > 0) {
  console.error("Missing required .env.local values:");
  for (const key of missing) console.error(`- ${key}`);
  process.exit(1);
}

if (!map.STRIPE_PRICE_STARTER.startsWith("price_")) {
  console.error("STRIPE_PRICE_STARTER must start with 'price_'");
  process.exit(1);
}

if (!map.STRIPE_SECRET_KEY.startsWith("sk_")) {
  console.error("STRIPE_SECRET_KEY must start with 'sk_'");
  process.exit(1);
}

if (!map.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")) {
  console.error("STRIPE_WEBHOOK_SECRET must start with 'whsec_'");
  process.exit(1);
}

if (!map.SUPABASE_URL.startsWith("https://")) {
  console.error("SUPABASE_URL must be an https URL");
  process.exit(1);
}

console.log("Config check passed.");
