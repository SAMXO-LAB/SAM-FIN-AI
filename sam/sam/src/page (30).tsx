import type { Metadata } from "next";
import { Brand } from "@/components/Brand";

export const metadata: Metadata = { title: "You’re offline", robots: { index: false } };

export default function Offline() {
  return (
    <main className="wrap" style={{ minHeight: "100dvh", display: "grid", placeItems: "center", textAlign: "center" }}>
      <div className="g2" style={{ padding: "40px 28px", maxWidth: 440, display: "grid", gap: 14, justifyItems: "center" }}>
        <Brand />
        <h1 className="h2" style={{ margin: 0 }}>You’re offline</h1>
        <p className="muted" style={{ margin: 0 }}>Finance Book AI needs an internet connection to show your latest records. Check your connection and try again.</p>
        <a className="btn btn-primary" href="/dashboard">Try again</a>
      </div>
    </main>
  );
}
