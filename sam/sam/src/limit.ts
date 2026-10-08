import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Per-instance fallback used only if the database function isn't installed yet. */
const mem = new Map<string, { day: string; n: number }>();

export const dailyLimit = () => Math.max(1, Number(process.env.ASSISTANT_DAILY_LIMIT) || 40);

/** Counts one message against the user's daily allowance. Returns false when they have used it up. */
export async function takeMessage(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const limit = dailyLimit();
  const { data, error } = await supabase.rpc("assistant_take", { p_limit: limit });
  if (!error && typeof data === "boolean") return data;
  console.error("[assistant] usage limit function unavailable; using in-memory fallback", error?.code ?? "unknown");
  const day = new Date().toISOString().slice(0, 10), cur = mem.get(userId);
  const n = cur && cur.day === day ? cur.n : 0;
  if (n >= limit) return false;
  mem.set(userId, { day, n: n + 1 });
  return true;
}
