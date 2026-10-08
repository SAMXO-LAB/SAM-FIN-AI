import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/features/auth/forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New password" };

export default async function ResetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="auth-card g3">
        <div><h1>This link has expired</h1><p className="sub">Reset links work once and expire after an hour. Request a new one to continue.</p></div>
        <Link href="/forgot-password" className="btn btn-primary btn-block">Request a new link</Link>
      </div>
    );
  }
  return <ResetForm />;
}
