import "server-only";

export type Provider = "gemini" | "groq" | "anthropic";
export type AiConfig = { provider: Provider; key: string; model: string; baseURL?: string };

const DEFAULT_MODEL: Record<Provider, string> = {
  gemini: "gemini-3.8-flash", // has a free tier; override with AI_MODEL (e.g. gemini-3.5-flash-lite)
  groq: "llama-3.3-70b-versatile",
  anthropic: "claude-sonnet-5-5",
};
const BASE_URL: Partial<Record<Provider, string>> = {
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
  groq: "https://api.groq.com/openai/v1/",
};

/**
 * Which AI service Sam talks to, from environment variables.
 *  - AI_PROVIDER: gemini | groq | anthropic (optional; guessed from whichever key is set)
 *  - AI_API_KEY, or GEMINI_API_KEY / GROQ_API_KEY / ANTHROPIC_API_KEY
 *  - AI_MODEL (optional), AI_BASE_URL (optional, tests/proxies)
 * Returns null when nothing usable is configured.
 */
export function aiConfig(): AiConfig | null {
  const e = process.env;
  const asked = (e.AI_PROVIDER || "").trim().toLowerCase();
  if (asked && asked !== "gemini" && asked !== "groq" && asked !== "anthropic") return null;
  const provider: Provider | "" = (asked as Provider) ||
    (e.GEMINI_API_KEY ? "gemini" : e.GROQ_API_KEY ? "groq" : e.ANTHROPIC_API_KEY ? "anthropic" : e.AI_API_KEY ? "gemini" : "");
  if (!provider) return null;
  const specific = provider === "gemini" ? e.GEMINI_API_KEY : provider === "groq" ? e.GROQ_API_KEY : e.ANTHROPIC_API_KEY;
  const key = (e.AI_API_KEY || specific || "").trim();
  if (!key) return null;
  const model = (e.AI_MODEL || (provider === "anthropic" ? e.ANTHROPIC_MODEL : "") || DEFAULT_MODEL[provider]).trim();
  return { provider, key, model, baseURL: e.AI_BASE_URL?.trim() || BASE_URL[provider] };
}

export const aiConfigured = () => aiConfig() !== null;
