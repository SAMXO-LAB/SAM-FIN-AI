"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fieldErrors, onboardingSchema } from "@/lib/validation";
import type { ActionState } from "@/types/db";

export async function saveOnboarding(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = onboardingSchema.safeParse({
    full_name: fd.get("full_name"), currency: fd.get("currency"), country: fd.get("country") || undefined,
    income_range: fd.get("income_range") || undefined, goals: fd.getAll("goals").map(String),
    notify_emi: fd.get("notify_emi") === "on", notify_bills: fd.get("notify_bills") === "on",
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ ...parsed.data, onboarded: true }).eq("id", user.id);
  if (error) return { error: "We couldn’t save your preferences. Please try again." };
  redirect("/dashboard?welcome=1");
}

const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your name.").max(80),
  currency: z.enum(["INR", "USD", "EUR", "GBP", "AED", "SGD"]),
  country: z.string().trim().max(60).optional().transform((v) => v || null),
});
export async function updateProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
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
