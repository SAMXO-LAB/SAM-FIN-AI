import Link from "next/link";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";

export const UPDATED = "4 October 2026";

/** Public contact address, set with NEXT_PUBLIC_CONTACT_EMAIL. Nothing is shown if it is not set. */
export function ContactLine() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  return email
    ? <p>Email us at <a href={`mailto:${email}`}>{email}</a>.</p>
    : <p>You can already do the most important things yourself in <b>Settings</b>: download all of your data, or delete your account.</p>;
}

export function LegalLayout({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="legal-page">
      <header className="wrap legal-top">
        <Link href="/" aria-label="Finance Book home"><Brand /></Link>
        <div className="legal-top-r">
          <ThemeToggle />
          <Link className="btn btn-glass btn-sm" href="/">Back to home</Link>
        </div>
      </header>
      <main className="wrap legal-main">
        <article className="legal-doc g2">
          <p className="eyebrow">Finance Book</p>
          <h1 className="h2">{title}</h1>
          <p className="legal-meta">Last updated: {UPDATED}</p>
          <p className="lede">{intro}</p>
          {children}
          <nav className="legal-links" aria-label="Legal">
            <Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms of Service</Link><Link href="/">Home</Link>
          </nav>
        </article>
      </main>
    </div>
  );
}
