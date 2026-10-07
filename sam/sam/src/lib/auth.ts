import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";
import { APP_TIMEZONE } from "./dates";
import type { Profile } from "@/types/db";

/** Returns the signed-in user and a scoped client, or redirects to /login. Cached per request. */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
});

// Everything except avatar_data (the photo itself), which is served by /api/avatar and would bloat every page.
const PROFILE_COLS = "id, full_name, currency, country, income_range, goals, notify_emi, notify_bills, notify_lent, notify_budget, onboarded, gender, avatar_kind, avatar_key, avatar_updated_at, timezone";
const NO_TZ_COLS = PROFILE_COLS.replace(", timezone", "");

const BASE_COLS = "id, full_name, currency, country, income_range, goals, notify_emi, notify_bills, notify_lent, notify_budget, onboarded";

export const getProfile = cache(async (): Promise<Profile | null> => {
  const { supabase, user } = await requireUser();
  let { data, error } = await supabase.from("profiles").select(PROFILE_COLS).eq("id", user.id).maybeSingle();
  if (error) {
    // The time zone migration has not been run yet: keep everything else working.
    ({ data, error } = await supabase.from("profiles").select(NO_TZ_COLS).eq("id", user.id).maybeSingle());
    if (data) data = { ...data, timezone: null };
  }
  if (error) {
    // The picture/gender migration has not been run yet either: keep the app working with defaults.
    ({ data } = await supabase.from("profiles").select(BASE_COLS).eq("id", user.id).maybeSingle());
    if (data) data = { ...data, gender: "unspecified", timezone: null, avatar_kind: "default", avatar_key: null, avatar_updated_at: null };
  }
  return (data as Profile | null) ?? null;
});

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Only allow same-site relative redirects (prevents open-redirect via ?next=). */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** The signed-in user's time zone (chosen with their country), or the app default. */
export async function getTimezone(): Promise<string> {
  const p = await getProfile();
  return p?.timezone || APP_TIMEZONE;
}
