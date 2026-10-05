import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownLeft, ArrowUpRight, CalendarCheck, ChartPie, ChevronRight, CircleCheck, HandCoins, Handshake, Landmark, PiggyBank, Plus, Sparkles, Target, TrendingUp, Wallet,
} from "lucide-react";
import { getProfile } from "@/lib/auth";
import { getAccounts, getBudgets, getCategories, getDebts, getGoals, getLoans, getTransactions } from "@/lib/data";
import { addDays, fmtDate, fmtShort, iso, parseISO, relDay, today } from "@/lib/dates";
import { debtSummary, loanSummary, spendByCategory, sumRange } from "@/lib/finance";
import { compactINR, formatINR, pct } from "@/lib/money";
import { CountUp } from "@/components/motion/CountUp";
import { cashflowSeries, spendingInsights } from "@/lib/analytics";
import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { Donut } from "@/components/charts/Donut";
import { Empty } from "@/components/ui/Page";
import { AccountButton, BudgetButton, LoanButton, TransactionButton } from "@/features/finance/forms";

export const metadata: Metadata = { title: "Dashboard" };

const greet = () => { const h = new Date().getHours(); return h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const ref = today(), t = iso(ref);
  const [profile, accounts, categories, tx, loans, debts, goals, budgets] = await Promise.all([
    getProfile(), getAccounts(), getCategories(), getTransactions({ from: iso(addDays(ref, -365)) }), getLoans(), getDebts(), getGoals(), getBudgets(),
  ]);
  const rawFirst = (profile?.full_name || "there").trim().split(" ")[0];
  const first = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const catName = (id: string | null) => (id && catById.get(id)?.name) || "Uncategorised";
  const txl = tx.map((x) => ({ ...x, category: catName(x.category_id) }));

  // Totals — all deterministic, from recorded data
  let balance = 0, available = 0;
  for (const a of accounts) { balance += a.balance; if (a.type !== "savings") available += a.balance; }
  const loanStats = loans.map((l) => ({ l, s: loanSummary(l, l.payments.length, ref) }));
  const loanOut = loanStats.reduce((s, x) => s + x.s.outstanding, 0);
  const emiMonthly = loanStats.reduce((s, x) => s + (x.s.next ? x.s.emi : 0), 0);
  const debtStats = debts.map((d) => ({ d, s: debtSummary(d, d.payments, ref) }));
  const owedToYou = debtStats.filter((x) => x.d.direction === "lent").reduce((s, x) => s + x.s.remaining, 0);
  const youOwe = debtStats.filter((x) => x.d.direction === "borrowed").reduce((s, x) => s + x.s.remaining, 0);
  const net = balance + owedToYou - youOwe - loanOut;
  const r30 = sumRange(txl, iso(addDays(ref, -29)), t), p30 = sumRange(txl, iso(addDays(ref, -59)), iso(addDays(ref, -30)));
  const rate = r30.income ? r30.net / r30.income : 0;
  const delta = (c: number, p: number) => (p ? `${c >= p ? "↑" : "↓"} ${pct(Math.abs((c - p) / p))} vs prior 30 days` : "No earlier data");

  // Spending breakdown
  const cats = spendByCategory(txl, iso(addDays(ref, -29)), t);
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5).map(([k, v], i) => ({ k, v, c: i + 1 }));
  if (sorted.length > 5) top.push({ k: "Everything else", v: sorted.slice(5).reduce((s, x) => s + x[1], 0), c: 7 });
  const catTotal = sorted.reduce((s, x) => s + x[1], 0);

  // Upcoming (next 30 days)
  const horizon = addDays(ref, 30);
  const upcoming = [
    ...loanStats.filter((x) => x.s.next && parseISO(x.s.next.date) <= horizon).map((x) => ({ key: x.l.id, icon: <Landmark size={17} />, title: x.l.name, date: parseISO(x.s.next!.date), amount: x.s.next!.emi, href: "/loans", overdue: x.s.overdue })),
    ...debtStats.filter((x) => x.d.direction === "borrowed" && x.s.remaining > 0 && x.d.due_date && parseISO(x.d.due_date) <= horizon).map((x) => ({ key: x.d.id, icon: <Handshake size={17} />, title: `Repay ${x.d.person_name}`, date: parseISO(x.d.due_date!), amount: x.s.remaining, href: "/borrowed", overdue: x.s.status === "Overdue" })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const insight = spendingInsights(tx, catName, ref)[0];
  const lentOpen = debtStats.filter((x) => x.d.direction === "lent" && x.s.remaining > 0);
  const borrowedOpen = debtStats.filter((x) => x.d.direction === "borrowed" && x.s.remaining > 0);
  const expenseCats = categories.filter((c) => c.kind === "expense" && c.name !== "EMI");

  const steps = [
    { done: accounts.length > 0, label: "Add your first account", node: <AccountButton triggerClass="btn btn-glass btn-sm" trigger="Add account" /> },
    { done: tx.length > 0, label: "Record a transaction", node: accounts.length ? <TransactionButton accounts={accounts} categories={categories} triggerClass="btn btn-glass btn-sm" trigger="Add transaction" /> : null },
    { done: loans.length > 0, label: "Track a loan or EMI", node: <LoanButton accounts={accounts} triggerClass="btn btn-glass btn-sm" trigger="Add loan" /> },
    { done: budgets.length > 0, label: "Set a monthly budget", node: <BudgetButton categories={expenseCats} triggerClass="btn btn-glass btn-sm" trigger="Set budget" /> },
  ];
  const setupLeft = steps.filter((s) => !s.done).length;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">{ref.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</div>
          <h1 className="page-title">{greet()}, {first}</h1>
        </div>
        {accounts.length > 0 && <div className="head-actions show-mob"><TransactionButton accounts={accounts} categories={categories} trigger={<><Plus size={16} />Add transaction</>} /></div>}
      </div>

      {sp.password === "updated" && <div className="notice ok"><CircleCheck size={17} />Your password has been updated.</div>}

      {setupLeft > 0 && (
        <section className="card g3" aria-label="Get set up">
          <div className="card-head"><div><h3 className="h3">{sp.welcome ? `Welcome to Finance Book AI, ${first}` : "Finish setting up"}</h3><div className="sub">{4 - setupLeft} of 4 done. Your dashboard fills in as you go.</div></div></div>
          <div className="rows">
            {steps.map((s) => (
              <div className="row" key={s.label}>
                <span className="ic" style={s.done ? { background: "var(--pos-soft)", color: "var(--pos)" } : undefined}>{s.done ? <CircleCheck size={17} /> : <Plus size={17} />}</span>
                <div className="bd"><div className="t" style={s.done ? { color: "var(--ink-3)", textDecoration: "line-through" } : undefined}>{s.label}</div></div>
                {!s.done && s.node}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid">
        <section className="overview g3 s12" aria-label="Financial overview">
          <div>
            <div className="eyebrow">Net worth</div>
            <div className="big-num" style={{ marginTop: 10 }}><CountUp to={net} paise /></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              <span className={`pill plain ${r30.net >= 0 ? "pos" : "neg"}`}>{formatINR(r30.net, { sign: true })} in 30 days</span>
              <span className="pill plain">Balance {compactINR(balance)}</span>
            </div>
            <p className="xs muted" style={{ margin: "14px 0 0" }}>Accounts {compactINR(balance)} + owed to you {compactINR(owedToYou)} − loans {compactINR(loanOut)} − borrowed {compactINR(youOwe)}</p>
          </div>
          <div className="kpis">
            <div className="kpi"><div className="k"><ArrowDownLeft size={14} />Income · 30d</div><div className="v"><CountUp to={r30.income} paise /></div><div className="d muted">{delta(r30.income, p30.income)}</div></div>
            <div className="kpi"><div className="k"><ArrowUpRight size={14} />Expenses · 30d</div><div className="v"><CountUp to={r30.expense} paise /></div><div className={`d ${p30.expense && r30.expense > p30.expense ? "warn-t" : "muted"}`}>{delta(r30.expense, p30.expense)}</div></div>
            <div className="kpi"><div className="k"><PiggyBank size={14} />Saved · 30d</div><div className={`v ${r30.net >= 0 ? "pos-t" : "neg-t"}`}><CountUp to={r30.net} paise /></div><div className="d muted">Savings rate {pct(rate, 1)}</div></div>
            <div className="kpi"><div className="k"><Wallet size={14} />Available cash</div><div className="v"><CountUp to={available} paise /></div><div className="d muted">Excludes savings accounts</div></div>
            <div className="kpi"><div className="k"><Landmark size={14} />EMIs per month</div><div className="v"><CountUp to={emiMonthly} paise /></div><div className="d muted">{loanStats.filter((x) => x.s.next).length} active loans</div></div>
            <div className="kpi"><div className="k"><TrendingUp size={14} />Owed to you</div><div className="v"><CountUp to={owedToYou} paise /></div><div className="d muted">{lentOpen.length} people</div></div>
          </div>
        </section>

        <section className="card g2 s8"><CashFlowChart series={cashflowSeries(tx, ref)} /></section>

        <section className="card g2 s4">
          <div className="card-head"><div><h3 className="h3">Spending breakdown</h3><div className="sub">Last 30 days</div></div><Link className="link" href="/budgets">Budgets <ChevronRight size={14} /></Link></div>
          {catTotal ? (
            <div className="donut-wrap">
              <div className="donut"><Donut items={top} /><div className="c"><span className="xs muted">Spent</span><b>{compactINR(catTotal)}</b></div></div>
              <div className="leg-list">{top.map((x) => (
                <div className="leg-row" key={x.k}><span className="sw" style={{ background: `var(--c${x.c})` }} /><span className="n">{x.k}</span><span className="a">{compactINR(x.v)}</span><span className="p">{Math.round((x.v / catTotal) * 100)}%</span></div>
              ))}</div>
            </div>
          ) : <Empty icon={<ChartPie size={26} />} title="No spending yet" body="Expenses from the last 30 days will appear here." />}
        </section>

        <section className="insight g3 s4 half">
          <span className="glow" />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="ai-dot"><Sparkles size={16} /></span><div><h3 className="h3">Sam’s insight</h3><div className="xs muted">From your last 120 days</div></div></div>
          {insight ? (
            <>
              <div className="big">Your {insight.cat.toLowerCase()} spending is {pct(insight.pct)} higher than your 3-month average.</div>
              <div className="calcbox">
                <div className="ln"><span>Last 30 days</span><span>{formatINR(insight.cur)}</span></div>
                <div className="ln"><span>3-month monthly average</span><span>{formatINR(insight.avg)}</span></div>
                <div className="ln tot"><span>Difference</span><span>{formatINR(insight.diff, { sign: true })}</span></div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><span className="tag actual">Recorded data</span><span className="tag calc">Calculated</span></div>
            </>
          ) : (
            <>
              <div className="big">{tx.length ? "Your spending is in line with your recent average." : "Insights appear once you’ve recorded a few weeks of spending."}</div>
              <p className="small muted" style={{ margin: 0 }}>Sam compares each category’s last 30 days with its previous 3-month average and flags meaningful jumps.</p>
            </>
          )}
          <Link href="/assistant" className="link" style={{ alignSelf: "end" }}>Ask Sam a question <ChevronRight size={14} /></Link>
        </section>

        <section className="card g2 s4 half">
          <div className="card-head"><div><h3 className="h3">Upcoming payments</h3><div className="sub">Next 30 days · {formatINR(upcoming.reduce((s, x) => s + x.amount, 0))}</div></div></div>
          {upcoming.length ? (
            <div className="rows">{upcoming.slice(0, 5).map((u) => (
              <Link href={u.href} className="row click" key={u.key}><span className="ic">{u.icon}</span><div className="bd"><div className="t">{u.title}</div><div className="s">{u.overdue ? <span className="neg-t">Overdue</span> : relDay(u.date, ref)} · {fmtShort(iso(u.date))}</div></div><div className="amt">{formatINR(u.amount)}</div></Link>
            ))}</div>
          ) : <Empty icon={<CalendarCheck size={26} />} title="Nothing due" body="EMIs and repayments due in the next 30 days show up here." />}
        </section>

        <section className="card g2 s4">
          <div className="card-head"><div><h3 className="h3">Savings goals</h3><div className="sub">{goals.length} active</div></div><Link className="link" href="/goals">Goals <ChevronRight size={14} /></Link></div>
          {goals.length ? (
            <div style={{ display: "grid", gap: 16 }}>{goals.slice(0, 4).map((g) => { const p = g.saved / g.target; return (
              <div key={g.id}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13.5, marginBottom: 7 }}><b style={{ fontWeight: 560 }}>{g.name}</b><span className="num muted">{compactINR(g.saved)} / {compactINR(g.target)}</span></div><div className={`bar ${p >= 1 ? "pos" : "acc"}`}><i style={{ width: `${Math.min(100, p * 100)}%` }} /></div></div>
            ); })}</div>
          ) : <Empty icon={<Target size={26} />} title="No goals yet" body="Set a target and Sam works out the monthly number."><Link href="/goals" className="btn btn-glass btn-sm">Create a goal</Link></Empty>}
        </section>

        <section className="card g2 s6">
          <div className="card-head"><div><h3 className="h3">Money owed to you</h3><div className="sub">{formatINR(owedToYou)} outstanding</div></div><Link className="link" href="/lent">Money lent <ChevronRight size={14} /></Link></div>
          {lentOpen.length ? <div className="rows">{lentOpen.map(({ d, s }) => (
            <Link href="/lent" className="row click" key={d.id}><span className="av">{d.person_name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</span><div className="bd"><div className="t">{d.person_name}</div><div className="s">{d.due_date ? `Expected ${fmtDate(d.due_date)}` : "No due date"}</div></div><span className={`pill hide-mob ${s.status === "Overdue" ? "neg" : s.status === "Partially paid" ? "warn" : "info"}`}>{s.status}</span><div className="amt pos-t">{formatINR(s.remaining)}</div></Link>
          ))}</div> : <Empty icon={<HandCoins size={26} />} title="Nobody owes you" body="Money you lend to friends and family shows up here." />}
        </section>

        <section className="card g2 s6">
          <div className="card-head"><div><h3 className="h3">Money you owe</h3><div className="sub">{formatINR(loanOut + youOwe)} across loans and people</div></div><Link className="link" href="/loans">Loans <ChevronRight size={14} /></Link></div>
          {loanStats.length || borrowedOpen.length ? <div className="rows">
            {loanStats.filter((x) => x.s.outstanding > 0).map(({ l, s }) => <Link href="/loans" className="row click" key={l.id}><span className="ic"><Landmark size={17} /></span><div className="bd"><div className="t">{l.name}</div><div className="s">{l.lender || "Loan"} · {s.remaining} EMIs left</div></div><div className="amt neg-t">{formatINR(s.outstanding)}</div></Link>)}
            {borrowedOpen.map(({ d, s }) => <Link href="/borrowed" className="row click" key={d.id}><span className="av">{d.person_name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</span><div className="bd"><div className="t">{d.person_name}</div><div className="s">{d.due_date ? `Due ${fmtDate(d.due_date)}` : "No due date"}</div></div><div className="amt neg-t">{formatINR(s.remaining)}</div></Link>)}
          </div> : <Empty icon={<Handshake size={26} />} title="You owe nothing" body="Loans and money you borrow will appear here." />}
        </section>
      </div>
    </>
  );
}
