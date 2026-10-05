"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile, requireUser } from "@/lib/auth";
import { parsePhoto } from "@/lib/avatar";
import { isPresetKey } from "@/components/avatar/presets";
import { fieldErrors, genderSchema, onboardingSchema } from "@/lib/validation";
import type { ActionState } from "@/types/db";

const NEW_COLS = ["gender", "avatar_kind", "avatar_key", "avatar_data", "avatar_updated_at"];
/** Updates the profile row. If the picture/gender migration has not been run yet, saves everything else. */
async function saveProfileRow(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], id: string, patch: Record<string, unknown>) {
  const first = await supabase.from("profiles").update(patch).eq("id", id);
  if (!first.error || !["42703", "PGRST204"].includes(first.error.code)) return first.error;
  const rest = Object.fromEntries(Object.entries(patch).filter(([k]) => !NEW_COLS.includes(k)));
  return (await supabase.from("profiles").update(rest).eq("id", id)).error;
}

export async function saveOnboarding(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = onboardingSchema.safeParse({
    full_name: fd.get("full_name"), gender: fd.get("gender") ?? "unspecified", currency: fd.get("currency"), country: fd.get("country") || undefined,
    income_range: fd.get("income_range") || undefined, goals: fd.getAll("goals").map(String),
    notify_emi: fd.get("notify_emi") === "on", notify_bills: fd.get("notify_bills") === "on",
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  const { supabase, user } = await requireUser();
  const error = await saveProfileRow(supabase, user.id, { ...parsed.data, onboarded: true });
  if (error) return { error: "We couldn’t save your preferences. Please try again." };
  redirect("/dashboard?welcome=1");
}

const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your name.").max(80),
  currency: z.enum(["INR", "USD", "EUR", "GBP", "AED", "SGD"]),
  country: z.string().trim().max(60).optional().transform((v) => v || null),
  gender: genderSchema,
  avatar_kind: z.enum(["default", "preset", "photo"]).catch("default"),
  avatar_key: z.string().max(4).optional(),
  avatar_photo: z.string().max(120_000).optional(),
});
export async function updateProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { full_name, currency, country, gender, avatar_kind, avatar_key, avatar_photo } = parsed.data;
  const { supabase, user } = await requireUser();
  const current = await getProfile();

  const patch: Record<string, unknown> = { full_name, currency, country, gender };
  const stamp = new Date().toISOString();
  if (avatar_kind === "preset") {
    if (!isPresetKey(avatar_key)) return { error: "Choose one of the pictures shown." };
    if (current?.avatar_kind !== "preset" || current.avatar_key !== avatar_key) Object.assign(patch, { avatar_kind: "preset", avatar_key, avatar_data: null, avatar_updated_at: stamp });
  } else if (avatar_kind === "photo") {
    if (avatar_photo) {
      if (!parsePhoto(avatar_photo)) return { error: "We couldn’t use that photo. Please choose a JPG, PNG or WebP image." };
      Object.assign(patch, { avatar_kind: "photo", avatar_key: null, avatar_data: avatar_photo, avatar_updated_at: stamp });
    } else if (current?.avatar_kind !== "photo") {
      return { error: "Choose a photo to upload first." };
    }
  } else if (current?.avatar_kind !== "default") {
    Object.assign(patch, { avatar_kind: "default", avatar_key: null, avatar_data: null, avatar_updated_at: stamp });
  }

  const error = await saveProfileRow(supabase, user.id, patch);
  if (error) return { error: "We couldn’t save your profile. Please try again." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved", at: Date.now() };
}

const PREFS = ["notify_emi", "notify_bills", "notify_lent", "notify_budget"] as const;
export async function updatePrefs(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const patch = Object.fromEntries(PREFS.map((k) => [k, fd.get(k) === "on"]));
  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return { error: "We couldn’t save your notification settings." };
  revalidatePath("/settings");
  return { ok: true, message: "Notification settings saved", at: Date.now() };
}

export async function deleteMyAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  if (String(fd.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") return { error: "Type DELETE to confirm.", fields: { confirm: "Type DELETE to confirm." } };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: "We couldn’t delete your account. Please try again or contact support." };
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
