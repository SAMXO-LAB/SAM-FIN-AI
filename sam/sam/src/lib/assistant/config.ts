import "server-only";

export type Provider = "gemini" | "groq" | "cerebras" | "openrouter" | "mistral" | "anthropic";
export type AiConfig = { provider: Provider; key: string; model: string; baseURL?: string; retry?: boolean };

// Free tiers change often. Override any model with <PROVIDER>_MODEL (e.g. OPENROUTER_MODEL) or AI_MODEL for the first one.
const DEFAULT_MODEL: Record<Provider, string> = {
  gemini: "gemini-3.8-flash",
  groq: "llama-3.3-70b-versatile",
  cerebras: "gpt-oss-120b",
  openrouter: "meta-llama/llama-3.3-70b-instruct:free",
  mistral: "mistral-small-latest",
  anthropic: "claude-sonnet-5-5",
};
const BASE_URL: Partial<Record<Provider, string>> = {
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
  groq: "https://api.groq.com/openai/v1/",
  cerebras: "https://api.cerebras.ai/v1/",
  openrouter: "https://openrouter.ai/api/v1/",
  mistral: "https://api.mistral.ai/v1/",
};

// Free-tier quotas are counted per model, so a few different models behave like extra capacity.
const GEMINI_EXTRA = ["gemini-3.5-flash", "gemini-3.5-flash-lite"];
const ORDER: Provider[] = ["gemini", "groq", "cerebras", "openrouter", "mistral", "anthropic"];

const keyFor = (p: Provider) => {
  const e = process.env;
  return (e[`${p.toUpperCase()}_API_KEY`] || "").trim();
};

/**
 * Every service/model Sam may try, in order. If one is busy, rate limited or retired, the next is tried
 * automatically. Set more than one key (GEMINI_API_KEY, GROQ_API_KEY, CEREBRAS_API_KEY, OPENROUTER_API_KEY, MISTRAL_API_KEY, ANTHROPIC_API_KEY) for more headroom.
 *  - AI_PROVIDER: gemini | groq | cerebras | openrouter | mistral | anthropic: which one goes first (default: first one that has a key)
 *  - AI_API_KEY: key for AI_PROVIDER (or for Gemini when AI_PROVIDER is not set)
 *  - AI_MODEL: first model of the first provider; AI_FALLBACK_MODELS: comma list tried after it
 *  - AI_BASE_URL: optional (tests/proxies)
 */
export function aiChain(): AiConfig[] {
  const e = process.env;
  const asked = (e.AI_PROVIDER || "").trim().toLowerCase();
  if (asked && !ORDER.includes(asked as Provider)) return [];
  const generic = (e.AI_API_KEY || "").trim();

  const providers: { p: Provider; key: string }[] = [];
  if (asked) providers.push({ p: asked as Provider, key: generic || keyFor(asked as Provider) });
  else if (generic && !ORDER.some(keyFor)) providers.push({ p: "gemini", key: generic });
  for (const p of ORDER) if (keyFor(p) && !providers.some((x) => x.p === p)) providers.push({ p, key: keyFor(p) });

  const out: AiConfig[] = [];
  providers.filter((x) => x.key).forEach(({ p, key }, i) => {
    const first = i === 0;
    const list = [
      first ? (e.AI_MODEL || e[`${p.toUpperCase()}_MODEL`] || DEFAULT_MODEL[p]) : (e[`${p.toUpperCase()}_MODEL`] || DEFAULT_MODEL[p]),
      ...(first ? (e.AI_FALLBACK_MODELS || "").split(",") : []),
      ...(p === "gemini" ? GEMINI_EXTRA : []),
    ].map((m) => m.trim()).filter(Boolean);
    for (const model of [...new Set(list)]) out.push({ provider: p, key, model, baseURL: e.AI_BASE_URL?.trim() || BASE_URL[p] });
  });
  return out;
}

export const aiConfig = (): AiConfig | null => aiChain()[0] ?? null;
export const aiConfigured = () => aiChain().length > 0;
