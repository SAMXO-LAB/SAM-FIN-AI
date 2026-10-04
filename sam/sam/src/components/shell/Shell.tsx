"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeftRight, ChartPie, ChevronRight, Ellipsis, HandCoins, Handshake, House, Landmark, LayoutDashboard, LogOut, Plus, Settings, Target, Wallet,
} from "lucide-react";
import { Brand, LogoMark } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Dialog } from "@/components/ui/Dialog";
import { TransactionButton } from "@/features/finance/forms";
import { signOut } from "@/features/auth/actions";
import type { AccountWithBalance, Category } from "@/types/db";
import { NAV } from "./nav";

const ICONS = { LayoutDashboard, ArrowLeftRight, Wallet, Landmark, HandCoins, Handshake, ChartPie, Target, Settings } as const;
const initials = (n: string) => n.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

export function Shell({ name, email, accounts, categories, children }: {
  name: string; email: string; accounts: AccountWithBalance[]; categories: Category[]; children: React.ReactNode;
}) {
  const path = usePathname();
  const [more, setMore] = useState(false);
  const active = (h: string) => path === h || path.startsWith(h + "/");
  return (
    <div className="app">
      <aside className="side g1" aria-label="Sections">
        <Link href="/dashboard" aria-label="Sam Fin AI dashboard"><Brand /></Link>
        {NAV.map((g, i) => (
          <nav className="nav-group" key={i} aria-label={g.group || "Account"}>
            {g.group && <div className="nav-label">{g.group}</div>}
            {g.items.map((it) => {
              const I = ICONS[it.icon];
              return <Link key={it.href} href={it.href} className={`nav-item${active(it.href) ? " active" : ""}`} aria-current={active(it.href) ? "page" : undefined}><I size={18} strokeWidth={1.75} /><span>{it.label}</span></Link>;
            })}
          </nav>
        ))}
        <div className="side-foot">
          <span className="av" aria-hidden="true">{initials(name)}</span>
          <div className="who"><b>{name}</b><span className="xs muted" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span></div>
          <form action={signOut}><button className="icon-btn" aria-label="Sign out" title="Sign out"><LogOut size={18} /></button></form>
        </div>
      </aside>
      <div className="main">
        <header className="topbar g1">
          <Link href="/dashboard" className="mob-brand" aria-label="Sam Fin AI dashboard"><LogoMark /></Link>
          <span className="sp" />
          <ThemeToggle />
          <span className="hide-mob">
            <TransactionButton accounts={accounts} categories={categories} trigger={<><Plus size={16} />Add transaction</>} />
          </span>
        </header>
        <main className="view" id="main">{children}</main>
      </div>
      <nav className="bottom-nav g4" aria-label="Primary">
        <Link href="/dashboard" className={`bn-item${active("/dashboard") ? " active" : ""}`}><House size={20} />Home</Link>
        <Link href="/transactions" className={`bn-item${active("/transactions") ? " active" : ""}`}><ArrowLeftRight size={20} />Activity</Link>
        <TransactionButton accounts={accounts} categories={categories} triggerClass="bn-add" label="Add transaction" trigger={<Plus size={24} />} />
        <Link href="/goals" className={`bn-item${active("/goals") ? " active" : ""}`}><Target size={20} />Goals</Link>
        <button className={`bn-item${["/dashboard", "/transactions", "/goals"].some(active) ? "" : " active"}`} onClick={() => setMore(true)}><Ellipsis size={20} />More</button>
      </nav>
      <Dialog open={more} onClose={() => setMore(false)} title="All sections">
        <div className="rows">
          {NAV.flatMap((g) => g.items).map((it) => {
            const I = ICONS[it.icon];
            return <Link key={it.href} href={it.href} className="row click" onClick={() => setMore(false)}><span className="ic"><I size={17} /></span><div className="bd"><div className="t">{it.label}</div></div><ChevronRight size={16} className="muted" /></Link>;
          })}
          <form action={signOut}><button className="row click" style={{ width: "100%", textAlign: "left" }}><span className="ic"><LogOut size={17} /></span><div className="bd"><div className="t">Sign out</div></div></button></form>
        </div>
      </Dialog>
    </div>
  );
}
