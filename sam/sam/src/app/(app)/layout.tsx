import { redirect } from "next/navigation";
import { getProfile, requireUser } from "@/lib/auth";
import { getAccounts, getCategories } from "@/lib/data";
import { Shell } from "@/components/shell/Shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  const profile = await getProfile();
  if (!profile?.onboarded) redirect("/onboarding");
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);
  return (
    <Shell name={profile.full_name || user.email || "You"} email={user.email ?? ""} accounts={accounts} categories={categories}>
      {children}
    </Shell>
  );
}
