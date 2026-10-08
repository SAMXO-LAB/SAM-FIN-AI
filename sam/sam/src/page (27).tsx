import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile, requireUser } from "@/lib/auth";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const { user } = await requireUser();
  const profile = await getProfile();
  if (profile?.onboarded) redirect("/dashboard");
  const name = profile?.full_name || (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || "";
  return <div className="onb"><OnboardingForm name={name} /></div>;
}
