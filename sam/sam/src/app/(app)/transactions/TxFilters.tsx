"use client";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function TxFilters({ accounts, categories }: { accounts: { id: string; name: string }[]; categories: { id: string; name: string }[] }) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [, start] = useTransition();
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp.toString());
    if (v) n.set(k, v); else n.delete(k);
    n.delete("page");
    start(() => router.replace(`${path}?${n.toString()}`, { scroll: false }));
  };
  useEffect(() => {
    const t = setTimeout(() => { if ((sp.get("q") ?? "") !== q) set("q", q); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  const type = sp.get("type") ?? "";
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="seg" role="tablist" aria-label="Type">
        {[["", "All"], ["income", "Income"], ["expense", "Expenses"], ["transfer", "Transfers"]].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={type === k} className={type === k ? "on" : ""} onClick={() => set("type", k)}>{l}</button>
        ))}
      </div>
      <div className="filters">
        <label className="search"><Search size={16} /><span className="sr">Search</span><input className="input" placeholder="Search merchant, description, notes…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <select className="select" aria-label="Category" value={sp.get("cat") ?? ""} onChange={(e) => set("cat", e.target.value)}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select className="select" aria-label="Account" value={sp.get("acc") ?? ""} onChange={(e) => set("acc", e.target.value)}><option value="">All accounts</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <select className="select" aria-label="Date range" value={sp.get("range") ?? "90"} onChange={(e) => set("range", e.target.value)}>
          <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 12 months</option><option value="all">All time</option>
        </select>
        <select className="select" aria-label="Sort" value={sp.get("sort") ?? ""} onChange={(e) => set("sort", e.target.value)}><option value="">Newest first</option><option value="amount">Largest first</option></select>
      </div>
    </div>
  );
}
