import type { Metadata } from "next";
import { Braces, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { getProfile, requireUser } from "@/lib/auth";
import { PageHead } from "@/components/ui/Page";
import { DeleteAccount, PrefsForm, ProfileForm } from "./SettingsForms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user } = await requireUser();
  const profile = (await getProfile())!;
  const google = user.app_metadata?.providers?.includes("google") || user.app_metadata?.provider === "google";
  return (
    <>
      <PageHead eyebrow="Preferences" title="Settings" />
      <div className="grid">
        <section className="card g2 s6"><div className="card-head"><h2 className="h3">Profile</h2></div><ProfileForm profile={profile} me={{ id: user.id, name: profile.full_name || user.email || "You", gender: profile.gender, avatar_kind: profile.avatar_kind, avatar_key: profile.avatar_key, avatar_updated_at: profile.avatar_updated_at }} /></section>
        <section className="card g2 s6">
          <div className="card-head"><h2 className="h3">Sign-in &amp; security</h2></div>
          <div className="set-row"><div><b>Email</b><span>{user.email}</span></div><span className={`pill ${user.email_confirmed_at ? "pos" : "warn"}`}>{user.email_confirmed_at ? "Verified" : "Unverified"}</span></div>
          <div className="set-row"><div><b>Sign-in methods</b><span>{google ? "Google" : ""}{google && user.app_metadata?.providers?.includes("email") ? " and " : ""}{user.app_metadata?.providers?.includes("email") || !google ? "Email and password" : ""}</span></div></div>
          <div className="set-row"><div><b>Password</b><span>We’ll email you a secure link to change it</span></div><a className="btn btn-glass btn-sm" href="/forgot-password">Change</a></div>
          <div className="set-row"><div><b>Bank credentials</b><span>Never requested or stored</span></div><span className="pill pos"><ShieldCheck size={13} />Protected</span></div>
        </section>
        <section className="card g2 s6"><div className="card-head"><h2 className="h3">Notifications</h2></div><PrefsForm profile={profile} /></section>
        <section className="card g2 s6">
          <div className="card-head"><div><h2 className="h3">Your data</h2><div className="sub">Download everything you’ve recorded in Finance Book AI.</div></div></div>
          <div className="set-row"><div><b>Transactions as CSV</b><span>Opens in Excel, Numbers or Google Sheets</span></div><a className="btn btn-glass btn-sm" href="/api/export?format=csv"><FileSpreadsheet size={15} />Download</a></div>
          <div className="set-row"><div><b>Full backup as JSON</b><span>Accounts, transactions, loans, people, budgets and goals</span></div><a className="btn btn-glass btn-sm" href="/api/export?format=json"><Braces size={15} />Download</a></div>
          <div className="set-row"><div><b>Delete account</b><span>Permanently removes your account and all data</span></div><DeleteAccount /></div>
        </section>
      </div>
    </>
  );
}
