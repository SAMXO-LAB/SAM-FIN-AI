import Link from "next/link";
import {
  Accessibility, ArrowRight, HandCoins, Handshake, Landmark, Wallet, ChartPie, BadgeCheck, BellRing, Calculator, CreditCard, Database, Download, EyeOff, IndianRupee, KeyRound, Lock,
  MoonStar, Archive, ShieldCheck, Sparkles, Table2, TrendingUp, Zap, House, ArrowLeftRight, Plus, Target, Ellipsis, Signal, Wifi, BatteryFull,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HeroStage } from "@/features/landing/HeroStage";
import { CountUp } from "@/components/motion/CountUp";
import { LandingMotion } from "@/components/motion/LandingMotion";
import { createClient } from "@/lib/supabase/server";
import { amortise } from "@/lib/finance";
import { compactINR, formatINR } from "@/lib/money";

// Illustrative sample figures for the marketing page only.
const SPARK = [41, 43, 42, 45, 44, 47, 46, 49, 48, 47, 50, 52, 51, 54, 53, 52, 55, 57, 56, 58, 57, 60, 59, 61, 63, 62, 64, 66, 65, 68];
const MONTHS = [[145, 112], [145, 118], [163, 109], [145, 121], [149, 116], [145, 131], [187, 114], [145, 119], [150, 124], [145, 117], [172, 126], [148, 88]];
const LOAN = amortise(18000000, 11.25, 24, "2025-06-10");

function spark(vals: number[], w = 400, h = 110, pad = 10) {
  const mn = Math.min(...vals), mx = Math.max(...vals), rg = mx - mn || 1;
  const pts = vals.map((v, i) => [(i * w) / (vals.length - 1), pad + (h - 2 * pad) * (1 - (v - mn) / rg)]);
  let d = `M${pts[0][0]} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2; d += ` C${cx.toFixed(1)} ${y0.toFixed(1)} ${cx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`; }
  return { d, last: pts[pts.length - 1], w, h };
}

function Spark({ id, vals = SPARK }: { id: string; vals?: number[] }) {
  const s = spark(vals);
  return (
    <svg className="spark sp-clip" viewBox={`0 0 ${s.w} ${s.h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: "var(--accent)", stopOpacity: 0.28 }} /><stop offset="1" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} /></linearGradient></defs>
      <path d={`${s.d} L${s.w} ${s.h} L0 ${s.h}Z`} fill={`url(#${id})`} />
      <path d={s.d} fill="none" style={{ stroke: "var(--accent)" }} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      <circle className="sp-dot" cx={s.last[0]} cy={s.last[1]} r="4" style={{ fill: "var(--accent)" }} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const Segs = ({ n, on }: { n: number; on: number }) => (
  <div className="segs" style={{ ["--n" as string]: n }}>{Array.from({ length: n }, (_, i) => <i key={i} style={{ ["--k" as string]: i }} className={i < on ? "on" : i === on ? "next" : ""} />)}</div>
);

export default async function Home() {
  let signedIn = false;
  try { const s = await createClient(); signedIn = !!(await s.auth.getUser()).data.user; } catch { /* env not configured */ }
  const mx = Math.max(...MONTHS.flat());
  const cats = [["Housing", 2800000, 1], ["Food", 1462000, 2], ["Shopping", 935000, 3], ["Transport", 618000, 4], ["Everything else", 1085000, 7]] as const;
  const catTot = cats.reduce((s, c) => s + c[1], 0);
  return (
    <>
      <div className="scroll-progress" aria-hidden="true" />
      <LandingMotion />
      <header className="lp-nav">
        <nav className="bar g3" aria-label="Main">
          <Link href="/" aria-label="Finance Book home"><Brand /></Link>
          <div className="lp-links"><a href="#features">Product</a><a href="#assistant">Sam</a><a href="#emi">EMIs</a><a href="#security">Security</a><a href="#mobile">Mobile</a></div>
          <div className="right">
            <ThemeToggle />
            {signedIn ? <Link className="btn btn-primary btn-sm" href="/dashboard" style={{ height: 38, padding: "0 16px" }}>Open dashboard</Link> : <>
              <Link className="btn btn-ghost hide-sm" href="/login">Sign in</Link>
              <Link className="btn btn-primary btn-sm" href="/signup" style={{ height: 38, padding: "0 16px" }}>Get started</Link>
            </>}
          </div>
        </nav>
      </header>
      <main>
        <section className="wrap hero" id="top">
          <div>
            <div className="hero-badge g2 hi hi1"><b>NEW</b>EMIs, IOUs and everyday spending in one place</div>
            <h1 className="display" aria-label="Your money. Beautifully understood."><span className="w" aria-hidden="true"><span style={{ ["--i" as string]: 0 }}>Your</span></span>{" "}<span className="w" aria-hidden="true"><span style={{ ["--i" as string]: 1 }}>money.</span></span><br /><em aria-hidden="true"><span className="w"><span style={{ ["--i" as string]: 2 }}>Beautifully</span></span></em>{" "}<span className="w" aria-hidden="true"><span style={{ ["--i" as string]: 3 }}>understood.</span></span></h1>
            <p className="lede hi hi3">One intelligent place for your spending, savings, loans, goals and financial future.</p>
            <div className="hero-cta hi hi4">
              <Link className="btn btn-primary btn-lg shine" href={signedIn ? "/dashboard" : "/signup"}>{signedIn ? "Open dashboard" : "Get started"} <ArrowRight size={18} /></Link>
              <a className="btn btn-glass btn-lg" href="#features">See how it works</a>
            </div>
            <div className="hero-meta hi hi5"><span><ShieldCheck size={15} />Never asks for bank logins</span><span><IndianRupee size={15} />Built for lakhs, EMIs and UPI</span><span><Download size={15} />Export everything, anytime</span></div>
          </div>
          <HeroStage>
            <div className="s-main g3">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><span className="eyebrow">Net worth</span><span className="pill pos plain"><TrendingUp size={13} /> ₹38.2K · 30 days</span></div>
              <div className="big-num"><span className="cur">₹</span><CountUp to={482316} /></div>
              <Spark id="hsp" />
              <div className="mini-kpis"><div><div className="k">Income</div><div className="v">₹1.45 L</div></div><div><div className="k">Spent</div><div className="v">₹1.07 L</div></div><div><div className="k">Saved</div><div className="v pos-t">26%</div></div></div>
            </div>
            <div className="s-ai g4"><span className="ai-dot"><Sparkles size={16} /></span><div><div style={{ fontSize: 13.5, fontWeight: 560, lineHeight: 1.35 }}>Food is up <CountUp to={24} suffix="%" duration={1600} /> on your 3-month average</div><div style={{ marginTop: 6 }}><span className="tag calc">Calculated</span></div></div></div>
            <div className="s-emi g3">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span className="small muted">Personal Loan · HDFC Bank</span><span className="pill info plain">EMI</span></div>
              <div className="stat" style={{ fontSize: 26 }}>{formatINR(LOAN.emi)}<span className="muted" style={{ fontSize: 14, fontWeight: 450, letterSpacing: 0 }}>/month</span></div>
              <div className="hero-segs"><Segs n={24} on={16} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }} className="muted"><span>16 of 24 paid</span><span>Next 10 Oct</span></div>
            </div>
            <div className="s-owe g4"><span className="av">RM</span><div style={{ minWidth: 0 }}><div className="xs muted">Rahul owes you</div><div className="stat" style={{ fontSize: 19 }}><CountUp to={10000} prefix="₹" duration={1800} /></div></div></div>
          </HeroStage>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marq-track">
            {[0, 1].map((dup) => (
              <div className="marq-set" key={dup}>
                {([[Wallet, "Accounts"], [ArrowLeftRight, "Transactions"], [Landmark, "EMIs and loans"], [HandCoins, "Money lent"], [Handshake, "Money borrowed"], [ChartPie, "Budgets"], [Target, "Goals"], [Download, "CSV and JSON export"], [MoonStar, "Light and dark"]] as const).map(([Ic, label]) => (
                  <span className="marq-chip g2" key={label}><Ic size={16} />{label}</span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <section className="wrap section" id="features">
          <div className="sec-head" data-reveal="wipe"><span className="eyebrow">The whole picture</span><h2 className="h1">Everything you track, finally in one view.</h2><p className="lede">Accounts, EMIs, budgets and the ₹10,000 a friend still owes you. Sam keeps it all current, so money questions take seconds instead of a spreadsheet.</p></div>
          <div className="bento" data-stagger>
            <Link data-reveal="scale" className="tile spot g2 t4 wide" href="/signup"><span className="eyebrow">Cash flow</span><h3 className="h2">See where every rupee goes.</h3><p>Income against spending by day, week or month, from the transactions you record.</p>
              <div className="tile-vis">
                <svg viewBox="0 0 360 120" width="100%" height="120" aria-hidden="true">{MONTHS.map(([i, e], k) => <g key={k}><rect className="cf-bar" style={{ ["--k" as string]: k, fill: "var(--accent)" }} x={k * 30 + 6} y={114 - (i / mx) * 104} width="8" height={(i / mx) * 104} rx="3" opacity={k === 11 ? 0.5 : 1} /><rect className="cf-bar" style={{ ["--k" as string]: k + 0.5, fill: "var(--ink-3)" }} x={k * 30 + 16} y={114 - (e / mx) * 104} width="8" height={(e / mx) * 104} rx="3" opacity={k === 11 ? 0.45 : 0.8} /></g>)}</svg>
                <div className="legend" style={{ marginTop: 8 }}><span><i style={{ background: "var(--accent)" }} />Income</span><span><i style={{ background: "var(--ink-3)" }} />Spending</span></div>
              </div>
            </Link>
            <Link data-reveal="scale" className="tile spot g2 t2" href="/signup"><span className="eyebrow">EMIs</span><h3 className="h2">Every EMI, counted down.</h3>
              <div className="tile-vis" style={{ display: "grid", gap: 14 }}>
                <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}><b style={{ fontWeight: 560 }}>Personal Loan</b><span className="muted num">16/24</span></div><Segs n={24} on={16} /></div>
                <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}><b style={{ fontWeight: 560 }}>Phone on EMI</b><span className="muted num">7/12</span></div><Segs n={12} on={7} /></div>
              </div>
              <span className="go">Track your loans <ArrowRight size={14} /></span>
            </Link>
            <Link data-reveal="scale" className="tile spot g2 t2" href="/signup"><span className="eyebrow">Lent &amp; borrowed</span><h3 className="h2">Who owes whom.</h3>
              <div className="tile-vis rows">
                {[["Rahul Mehta", "Pending", "+₹10,000", "info"], ["Arjun Rao", "Overdue", "+₹15,000", "neg"], ["Suresh Kumar", "Partially paid", "−₹10,000", "warn"]].map(([n, s, a, t]) => (
                  <div className="row" style={{ padding: "9px 0" }} key={n}><span className="av" style={{ width: 30, height: 30, fontSize: 11 }}>{n.split(" ").map((w) => w[0]).join("")}</span><div className="bd"><div className="t" style={{ fontSize: 13 }}>{n}</div><div className="s" style={{ color: `var(--${t === "info" ? "accent" : t})` }}>{s}</div></div><div className={`amt ${a.startsWith("+") ? "pos-t" : "neg-t"}`} style={{ fontSize: 13.5 }}>{a}</div></div>
                ))}
              </div>
            </Link>
            <Link data-reveal="scale" className="tile spot g2 t2" href="/signup"><span className="eyebrow">Goals</span><h3 className="h2">Goals with a monthly number.</h3>
              <div className="tile-vis" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                {[["Emergency", 62], ["Europe", 25], ["Laptop", 69]].map(([n, p]) => (
                  <div key={n} style={{ display: "grid", justifyItems: "center", gap: 6, textAlign: "center" }}>
                    <div className="ring" style={{ width: 64, height: 64 }}><svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="none" style={{ stroke: "var(--track)" }} strokeWidth="7" /><circle className="ring-fill" cx="32" cy="32" r="26" fill="none" style={{ stroke: "var(--accent)" }} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(2 * Math.PI * 26 * Number(p)) / 100} 999`} transform="rotate(-90 32 32)" /></svg><span className="c" style={{ fontSize: 12.5 }}>{p}%</span></div>
                    <span className="xs muted">{n}</span>
                  </div>
                ))}
              </div>
            </Link>
            <Link data-reveal="scale" className="tile spot g2 t2" href="/signup"><span className="eyebrow">Budgets</span><h3 className="h2">Budgets that warn early.</h3>
              <div className="tile-vis" style={{ display: "grid", gap: 14 }}>
                {[["Food", 1462000, 1200000], ["Transport", 418000, 500000], ["Shopping", 535000, 800000]].map(([k, s, l]) => { const p = Number(s) / Number(l); return (
                  <div key={k}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><span>{k}</span><span className="num muted">{formatINR(Number(s))} / {compactINR(Number(l))}</span></div><div className={`bar thin ${p > 1 ? "neg" : p > 0.8 ? "warn" : "pos"}`}><i style={{ width: `${Math.min(100, p * 100)}%` }} /></div></div>
                ); })}
              </div>
            </Link>
            <Link data-reveal="scale" className="tile spot g2 t3" href="/signup"><span className="eyebrow">Accounts</span><h3 className="h2">Every account, one balance.</h3><p>Banks, cash, cards and wallets, added by name and balance. No logins, no screen-scraping.</p>
              <div className="tile-vis rows">
                {[["HDFC Salary", "Bank account", "₹1,42,860"], ["SBI Savings", "Savings account", "₹3,96,200"], ["Credit Card", "Credit card", "−₹18,412"]].map(([n, t, v]) => <div className="row" style={{ padding: "9px 0" }} key={n}><span className="ic" style={{ width: 32, height: 32 }}><CreditCard size={15} /></span><div className="bd"><div className="t" style={{ fontSize: 13 }}>{n}</div><div className="s">{t}</div></div><div className={`amt ${v.startsWith("−") ? "neg-t" : ""}`} style={{ fontSize: 13.5 }}>{v}</div></div>)}
              </div>
            </Link>
            <Link data-reveal="scale" className="tile spot g2 t3" href="/signup"><span className="eyebrow">Spending</span><h3 className="h2">Clear breakdowns, plain numbers.</h3><p>Last 30 days by category, with the share of each.</p>
              <div className="tile-vis">
                <div className="stackbar" style={{ display: "flex", height: 12, borderRadius: 999, overflow: "hidden", gap: 2 }}>{cats.map(([k, v, c]) => <span key={k} style={{ flex: v, background: `var(--c${c})` }} />)}</div>
                <div className="leg-list" style={{ marginTop: 14 }}>{cats.map(([k, v, c]) => <div className="leg-row" key={k}><span className="sw" style={{ background: `var(--c${c})` }} /><span className="n">{k}</span><span className="a">{formatINR(v)}</span><span className="p">{Math.round((v / catTot) * 100)}%</span></div>)}</div>
              </div>
            </Link>
          </div>
        </section>

        <section className="wrap section" id="assistant">
          <div className="split">
            <div data-reveal="left">
              <span className="eyebrow">Meet Sam</span>
              <h2 className="h1" style={{ marginTop: 14 }}>Numbers you can <em>check</em>, not guesses.</h2>
              <p className="lede" style={{ marginTop: 18 }}>Sam, your personal assistant inside Finance Book, explains your money in plain language. Every figure is calculated in code from what you’ve recorded, then labelled so you always know what’s a fact and what’s an estimate.</p>
              <ul className="points" data-stagger>
                <li data-reveal="left"><span className="pi"><Database size={18} /></span><div><b>From your records only</b><span>Sam never invents a transaction, a balance or a person.</span></div></li>
                <li data-reveal="left"><span className="pi"><Calculator size={18} /></span><div><b>Deterministic maths</b><span>EMIs, savings rates and goal plans are computed to the paisa and shown line by line.</span></div></li>
                <li data-reveal="left"><span className="pi"><BadgeCheck size={18} /></span><div><b>Labelled, not oversold</b><span>Estimates are marked as estimates. Finance Book is a money tool, not an adviser.</span></div></li>
              </ul>
            </div>
            <div className="chatmock g3" data-reveal="right">
              <div className="insight g3" style={{ borderRadius: 22 }}>
                <span className="glow" />
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="ai-dot"><Sparkles size={16} /></span><div><b className="h3">Sam’s insight</b><div className="xs muted">From your last 120 days</div></div></div>
                <div className="big">Your food spending is 24% higher than your 3-month average.</div>
                <div className="calcbox"><div className="ln"><span>Last 30 days</span><span>₹14,620</span></div><div className="ln"><span>3-month monthly average</span><span>₹11,790</span></div><div className="ln tot"><span>Difference</span><span>+₹2,830</span></div></div>
                <div className="tags" style={{ display: "flex", gap: 6 }}><span className="tag actual">Recorded data</span><span className="tag calc">Calculated</span></div>
              </div>
              <div className="g2" style={{ padding: 18, borderRadius: 22, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><b style={{ fontWeight: 600 }}>Europe Trip</b><span className="pill plain">₹62,000 of ₹2.5 L</span></div>
                <div className="calcbox" style={{ marginTop: 0 }}><div className="ln"><span>Suggested monthly saving</span><span>₹20,900</span></div><div className="ln" style={{ color: "var(--ink-3)" }}><span>₹1,88,000 ÷ 9 months</span><span>Estimate</span></div></div>
              </div>
            </div>
          </div>
        </section>

        <section className="wrap section" id="emi">
          <div className="split rev">
            <div data-reveal="left">
              <span className="eyebrow">Loans &amp; EMIs</span>
              <h2 className="h1" style={{ marginTop: 14 }}>EMIs, without the spreadsheet.</h2>
              <p className="lede" style={{ marginTop: 18 }}>Add a loan once. Sam builds the full amortisation schedule, records each payment and shows exactly how much principal and interest are left.</p>
              <ul className="points" data-stagger>
                <li data-reveal="left"><span className="pi"><Table2 size={18} /></span><div><b>Schedules to the paisa</b><span>Reducing-balance or flat-rate, with interest and principal split every month.</span></div></li>
                <li data-reveal="left"><span className="pi"><CreditCard size={18} /></span><div><b>Credit card EMIs alongside loans</b><span>One place for every monthly obligation.</span></div></li>
                <li data-reveal="left"><span className="pi"><BellRing size={18} /></span><div><b>Every due date in view</b><span>Upcoming EMIs and repayments sit at the top of your dashboard.</span></div></li>
              </ul>
            </div>
            <div className="g3" data-reveal="right" style={{ padding: 24, display: "grid", gap: 18, borderRadius: "var(--r-xl)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}><div><div className="small muted">HDFC Bank · Personal loan</div><div className="h2" style={{ marginTop: 2 }}>Personal Loan</div></div><span className="pill info">8 left</span></div>
              <div className="kv"><div><div className="k">Monthly EMI</div><div className="v">{formatINR(LOAN.emi)}</div></div><div><div className="k">Outstanding</div><div className="v">{formatINR(LOAN.rows[15].balance)}</div></div><div><div className="k">Interest left</div><div className="v">{formatINR(LOAN.rows.slice(16).reduce((s, r) => s + r.interest, 0))}</div></div></div>
              <Segs n={24} on={16} />
              <div style={{ overflowX: "auto" }}><table className="sched"><thead><tr><th>#</th><th>Interest</th><th>Principal</th><th>Balance</th></tr></thead><tbody>
                {LOAN.rows.slice(15, 20).map((r) => <tr key={r.n} className={r.n === 17 ? "cur" : ""}><td>{r.n}</td><td>{formatINR(r.interest)}</td><td>{formatINR(r.principal)}</td><td>{formatINR(r.balance)}</td></tr>)}
              </tbody></table></div>
            </div>
          </div>
        </section>

        <section className="wrap section" id="security">
          <div className="sec-head" data-reveal="wipe"><span className="eyebrow">Security</span><h2 className="h1">Private by design.</h2><p className="lede">Your financial life deserves the same care a bank gives it, with none of the access a bank would ask for.</p></div>
          <div className="sec-grid" data-stagger>
            <div data-reveal="scale" className="sec-card spot g2"><span className="pi"><KeyRound size={20} /></span><h3 className="h3">No bank credentials</h3><p>Finance Book never asks for net-banking passwords, card PINs or OTPs. Accounts are added by name and balance.</p></div>
            <div data-reveal="scale" className="sec-card spot g2"><span className="pi"><Lock size={20} /></span><h3 className="h3">Isolated by default</h3><p>Row-level security means your records are readable only by you, enforced in the database itself.</p></div>
            <div data-reveal="scale" className="sec-card spot g2"><span className="pi"><EyeOff size={20} /></span><h3 className="h3">No ads, no data sales</h3><p>Your data is used to serve you. It is never sold, rented or shared with advertisers.</p></div>
            <div data-reveal="scale" className="sec-card spot g2"><span className="pi"><Archive size={20} /></span><h3 className="h3">Yours to take</h3><p>Download a full CSV or JSON backup whenever you like, and delete your account in a single step.</p></div>
          </div>
        </section>

        <section className="wrap section" id="mobile">
          <div className="split">
            <div className="phone-wrap" data-reveal="up"><div className="phone" aria-hidden="true"><div className="phone-screen"><div className="ambient"><div className="orb o1" /><div className="orb o2" /></div><div className="ph-island" />
              <div className="ph-status"><span>9:41</span><span style={{ display: "flex", gap: 4 }}><Signal size={14} /><Wifi size={14} /><BatteryFull size={14} /></span></div>
              <div className="ph-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 4px 0" }}><div><div className="xs muted">Good evening</div><b style={{ fontSize: 17, letterSpacing: "-.02em" }}>Aarav</b></div><span className="av" style={{ width: 32, height: 32, fontSize: 11 }}>AS</span></div>
                <div className="ph-card g3"><div className="xs muted">Available cash</div><div className="stat" style={{ fontSize: 28 }}>₹1.24 L</div><div style={{ height: 46, marginTop: 6 }}><Spark id="psp" vals={SPARK.slice(-14)} /></div></div>
                <div className="ph-card g2" style={{ padding: "12px 14px" }}><div className="xs muted" style={{ marginBottom: 6 }}>Up next</div>{[["Personal Loan EMI", formatINR(LOAN.emi)], ["Repay Suresh", "₹10,000"], ["Phone on EMI", "₹6,499"]].map(([a, b]) => <div key={a} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "5px 0" }}><span>{a}</span><span className="num">{b}</span></div>)}</div>
              </div>
              <div className="ph-nav g4"><span><House size={17} />Home</span><span><ArrowLeftRight size={17} />Activity</span><span className="add"><Plus size={17} /></span><span><Target size={17} />Goals</span><span><Ellipsis size={17} />More</span></div>
            </div></div></div>
            <div data-reveal="right">
              <span className="eyebrow">Mobile</span>
              <h2 className="h1" style={{ marginTop: 14 }}>Made for the phone in your pocket.</h2>
              <p className="lede" style={{ marginTop: 18 }}>Log an expense in two taps from the bottom bar. Bottom sheets, large touch targets and a layout designed for one hand, not a shrunken desktop.</p>
              <ul className="points" data-stagger>
                <li data-reveal="left"><span className="pi"><Zap size={18} /></span><div><b>Two-tap entry</b><span>The amount comes first, with categories one tap away.</span></div></li>
                <li data-reveal="left"><span className="pi"><MoonStar size={18} /></span><div><b>Light and dark</b><span>Follows your system, or set it yourself.</span></div></li>
                <li data-reveal="left"><span className="pi"><Accessibility size={18} /></span><div><b>Accessible throughout</b><span>Keyboard, screen reader and reduced-motion support.</span></div></li>
              </ul>
            </div>
          </div>
        </section>

        <section className="wrap section"><div className="cta-band g3" data-reveal="scale">
          <span className="eyebrow">Start in a minute</span>
          <h2 className="h1" style={{ maxWidth: "16ch" }}>Your money, finally in one calm place.</h2>
          <p className="lede" style={{ textAlign: "center" }}>Create your account with Google or email. Free to start, no card required.</p>
          <div className="hero-cta" style={{ marginTop: 6, justifyContent: "center" }}>
            <Link className="btn btn-primary btn-lg shine" href={signedIn ? "/dashboard" : "/signup"}>{signedIn ? "Open dashboard" : "Get started"} <ArrowRight size={18} /></Link>
            {!signedIn && <Link className="btn btn-glass btn-lg" href="/login">Sign in</Link>}
          </div>
        </div></section>
      </main>
      <footer className="wrap footer" data-reveal="up">
        <div><div style={{ marginBottom: 14 }}><Brand /></div><p style={{ margin: 0, maxWidth: "36ch" }}>A personal finance manager for spending, savings, loans and the money between friends.</p></div>
        <div><h4>Product</h4><ul><li><a href="#features">Features</a></li><li><a href="#assistant">Meet Sam</a></li><li><a href="#emi">Loans &amp; EMIs</a></li></ul></div>
        <div><h4>Account</h4><ul><li><Link href="/signup">Create account</Link></li><li><Link href="/login">Sign in</Link></li><li><a href="#security">Security</a></li></ul></div>
        <div><h4>Legal</h4><ul><li><Link href="/privacy">Privacy Policy</Link></li><li><Link href="/terms">Terms of Service</Link></li></ul></div>
        <div className="legal"><span>© {new Date().getFullYear()} Finance Book</span><span>Finance Book is a money management tool, not a registered investment adviser. Product screens show sample data.</span></div>
      </footer>
    </>
  );
}
