"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext, siteUrl } from "@/lib/auth";
import { emailSchema, fieldErrors, newPasswordSchema, parseForm, signInSchema, signUpSchema } from "@/lib/validation";
import type { ActionState } from "@/types/db";

function friendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don’t match. Check them and try again.";
  if (m.includes("email not confirmed")) return "Confirm your email first. We sent a link to your inbox when you signed up.";
  if (m.includes("already registered")) return "An account with this email already exists. Sign in instead.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Wait a minute, then try again.";
  if (m.includes("weak") || m.includes("pwned")) return "This password is too easy to guess. Choose a stronger one.";
  return "We couldn’t complete that request. Please try again.";
}

export async function signIn(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(signInSchema, fd);
  if (!parsed.success) return fieldErrors(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: friendly(error.message) };
  redirect(safeNext(String(fd.get("next") ?? "")));
}

export async function signUp(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(signUpSchema, fd);
  if (!parsed.success) return fieldErrors(parsed.error);
  const { full_name, email, password } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name }, emailRedirectTo: `${siteUrl()}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: friendly(error.message) };
  if (data.session) redirect("/onboarding"); // email confirmation is turned off in Supabase
  return { ok: true, message: email };
}

export async function resendConfirmation(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(emailSchema, fd);
  if (!parsed.success) return fieldErrors(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: parsed.data.email, options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=/onboarding` } });
  if (error) return { error: friendly(error.message) };
  return { ok: true, message: "We sent a new confirmation link.", at: Date.now() };
}

export async function requestPasswordReset(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(emailSchema, fd);
  if (!parsed.success) return fieldErrors(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${siteUrl()}/auth/callback?next=/reset-password` });
  if (error && /rate|too many/i.test(error.message)) return { error: friendly(error.message) };
  // Same answer whether or not the account exists, so emails can't be enumerated.
  return { ok: true, message: parsed.data.email };
}

export async function updatePassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(newPasswordSchema, fd);
  if (!parsed.success) return fieldErrors(parsed.error);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link has expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: friendly(error.message) };
  redirect("/dashboard?password=updated");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
