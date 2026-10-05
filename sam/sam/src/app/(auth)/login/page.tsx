import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/forms";
import { safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const notice =
    sp.error === "link" ? { tone: "err" as const, text: "That link has expired or was already used. Sign in, or request a new link." }
    : sp.error === "oauth" ? { tone: "err" as const, text: "Google sign-in didn’t finish. Close other Finance Book AI tabs and try once more, or use your email." }
    : sp.next ? { tone: "info" as const, text: "Sign in to continue." }
    : undefined;
  return <LoginForm next={safeNext(sp.next)} notice={notice} />;
}
