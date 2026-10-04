import Link from "next/link";
import { BellRing, KeyRound, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-aside g1">
        <Link href="/" aria-label="Finance Book home"><Brand /></Link>
        <div style={{ display: "grid", gap: 28 }}>
          <p className="quote">Your money, <em>beautifully</em> understood.</p>
          <ul className="facts">
            <li><ShieldCheck size={18} />Finance Book never asks for bank logins, PINs or OTPs.</li>
            <li><KeyRound size={18} />Your records are readable only by you, enforced in the database.</li>
            <li><BellRing size={18} />Every EMI and repayment due date in one view.</li>
          </ul>
        </div>
        <span className="xs muted">© {new Date().getFullYear()} Finance Book · Developed by Chandra Shekar · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></span>
      </aside>
      <main className="auth-main">
        <Link href="/" className="auth-mobile-brand" aria-label="Finance Book home"><Brand /></Link>
        <div style={{ position: "absolute", top: 16, right: 16 }}><ThemeToggle /></div>
        {children}
      </main>
    </div>
  );
}
