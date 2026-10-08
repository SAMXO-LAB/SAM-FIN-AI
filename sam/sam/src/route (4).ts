import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

/** Handles Google OAuth returns, email confirmation and password-reset links. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const supabase = await createClient();

  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;

  const dest = url.clone();
  dest.search = "";
  if (ok) {
    dest.pathname = next;
  } else {
    dest.pathname = "/login";
    dest.searchParams.set("error", url.searchParams.get("error_description") ? "oauth" : "link");
  }
  return NextResponse.redirect(dest);
}
