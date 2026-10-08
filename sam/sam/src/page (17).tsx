import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, ChevronRight, Info, PiggyBank, Target, TrendingUp, TriangleAlert, Wallet } from "lucide-react";
import { getInsights } from "@/lib/insights";
import { fmtDate } from "@/lib/dates";
import { compactINR, formatINR, pct } from "@/lib/money";
import { Empty, PageHead, Stat } from "@/components/ui/Page";
import { ProjectionChart } from "@/components/charts/ProjectionChart";
import { RecCard } from "@/features/insights/RecCard";

export const metadata: Metadata = { title: "Forecast" };

const CONF = { low: "Low confidence", medium: "Medium confidence", high: "High confidence" } as const;
const CONF_TONE = { low: "warn", medium: "info", high: "pos" } as const;

export default async function ForecastPage() {
  const { forecast: f, recs } = await getInsights();
  if (!f.ready) {
    return (
      <>
        <PageHead eyebrow="Looking ahead" title="Forecast" sub="Estimates of your future savings, bills and goals, built from your own past months." />
        <section className="card g2">
          <Empty icon={<TrendingUp size={26} />} title="Your forecast is almost ready" body={f.reason ?? "Record a full month of income and spending to see it."}>
            <Link href="/transactions" className="btn btn-glass btn-sm">Add transactions</Link>
          </Empty>
        </section>
      </>
    );
  }
  const t = f.thisMonth, nx = f.next, short = nx.savings < 0;
  const top = recs.items.slice(0, 2);
  return (
    <>
      <PageHead eyebrow="Looking ahead" title="Forecast" sub={`Estimates from your last ${f.monthsUsed} full ${f.monthsUsed === 1 ? "month" : "months"}. They assume your income and habits stay about the same.`} />

      <section className="card g3 fc-hero" aria-label="Next month">
        <div className="fc-hero-top">
          <span className="ai-dot"><TrendingUp size={16} /></span>
          <span className="eyebrow">{nx.label}</span>
          <span className={`pill plain ${CONF_TONE[f.confidence]}`} title={f.confidence === "high" ? "Six months of history" : "More history makes this more reliable"}>{CONF[f.confidence]}</span>
        </div>
        <p className="fc-headline">{f.headline}</p>
        <p className="muted small" style={{ margin: 0 }}>Likely range <b className="num">{formatINR(nx.low)}</b> to <b className="num">{formatINR(nx.high)}</b>. {nx.income > 0 && <>That is a savings rate of about <b>{pct(Math.max(nx.savingsRate, 0))}</b>.</>}</p>
        <div className="calcbox fc-calc">
          <div className="ln"><span>Usual monthly income</span><span>{formatINR(nx.income)}</span></div>
          <div className="ln"><span>Usual everyday spending</span><span>− {formatINR(nx.variable)}</span></div>
          <div className="ln"><span>EMIs due {nx.label.split(" ")[0]}</span><span>− {formatINR(nx.emi)}</span></div>
          <div className="ln tot"><span>Expected savings</span><span className={short ? "neg-t" : "pos-t"}>{formatINR(nx.savings)}</span></div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><span className="tag calc">Calculated</span><span className="tag actual">From your records</span></div>
      </section>

      <div className="stat-row" style={{ marginTop: 20 }}>
        <Stat k="Expected savings" v={formatINR(nx.savings)} d={`${nx.label.split(" ")[0]} · likely ${compactINR(nx.low)} to ${compactINR(nx.high)}`} tone={short ? "neg" : "pos"} />
        <Stat k="EMIs and bills due next month" v={formatINR(f.recurring.total)} d={`EMIs ${compactINR(f.recurring.emi)} · rent ${compactINR(f.recurring.housing)} · bills ${compactINR(f.recurring.bills + f.recurring.subscriptions)}`} />
        <Stat k="Saved in 12 months" v={formatINR(f.projection.total)} d={`Balance could reach ${compactINR(f.projection.end)}`} tone={f.projection.total < 0 ? "neg" : undefined} />
        <Stat k={`Cash at end of ${t.label.split(" ")[0]}`} v={formatINR(t.endCash)} d={t.daysLeft ? `${t.daysLeft} days left if spending continues` : "Month closes today"} tone={t.endCash < 0 ? "neg" : undefined} />
      </div>

      {f.warnings.length > 0 && (
        <section className="card g2" style={{ marginTop: 20 }} aria-label="Heads up">
          <div className="card-head"><div><h2 className="h3">Heads up</h2><div className="sub">Things to watch, based on your pace</div></div></div>
          <div className="rows">
            {f.warnings.slice(0, 5).map((w) => (
              <Link key={w.id} href={w.href ?? "/forecast"} className="row click">
                <span className="ic" style={{ background: w.level === "high" ? "var(--neg-soft)" : "var(--warn-soft)", color: w.level === "high" ? "var(--neg)" : "var(--warn)" }}><TriangleAlert size={17} /></span>
                <div className="bd" style={{ whiteSpace: "normal" }}><div className="t" style={{ whiteSpace: "normal" }}>{w.title}</div><div className="s" style={{ whiteSpace: "normal" }}>{w.body}</div></div>
                <ChevronRight size={16} className="muted" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid" style={{ marginTop: 20 }}>
        <section className="card g2 s8">
          <div className="card-head"><div><h2 className="h3">The next 12 months</h2><div className="sub">Projected balance across your accounts, with the likely range shaded</div></div></div>
          <ProjectionChart start={f.projection.start} months={f.projection.months} />
          <p className="xs muted" style={{ margin: "10px 0 0" }}>Starts from {formatINR(f.projection.start)} today and adds your expected savings each month. EMIs drop out of the maths when a loan ends.</p>
        </section>

        <section className="card g2 s4">
          <div className="card-head"><div><h2 className="h3">Past months</h2><div className="sub">What you actually saved</div></div></div>
          <div className="rows">
            {[...f.history].reverse().map((h) => (
              <div className="row" key={h.key}>
                <div className="bd"><div className="t">{h.label}</div><div className="s">In {compactINR(h.income)} · out {compactINR(h.expenses)}</div></div>
                <div className={`amt ${h.savings < 0 ? "neg-t" : ""}`}>{formatINR(h.savings)}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card g2 s12">
          <div className="card-head"><div><h2 className="h3">{t.label}: where you are heading</h2><div className="sub">Day {t.daysElapsed} of {t.daysInMonth} · spent {formatINR(t.spentSoFar)} so far on everyday things</div></div><span className="tag calc">Estimate</span></div>
          <div className="pace-list">
            {t.categories.filter((c) => c.projected > 0).slice(0, 8).map((c) => {
              const ref = c.budget ?? c.usual, max = Math.max(c.projected, ref, 1);
              return (
                <div className="pace-row" key={c.name}>
                  <div className="pace-nm"><b>{c.name}</b><span className="xs muted">{c.budget ? `Budget ${formatINR(c.budget)}` : c.usual ? `Usual ${formatINR(c.usual)}` : "New this month"}</span></div>
                  <div className="pace-bar" role="img" aria-label={`${c.name}: spent ${formatINR(c.spent)}, likely ${formatINR(c.projected)}`}>
                    <i className={`pace-proj ${c.status}`} style={{ width: `${(c.projected / max) * 100}%` }} />
                    <i className="pace-spent" style={{ width: `${(c.spent / max) * 100}%` }} />
                    {ref > 0 && <i className="pace-mark" style={{ left: `${(ref / max) * 100}%` }} />}
                  </div>
                  <div className="pace-nums"><b className="num">{formatINR(c.spent)}</b><span className="xs muted">likely {formatINR(c.projected)}</span></div>
                </div>
              );
            })}
          </div>
          <div className="calcbox" style={{ marginTop: 18 }}>
            <div className="ln"><span>Available cash today (excludes savings accounts)</span><span>{formatINR(t.availableNow)}</span></div>
            {t.expectedIncome > 0 && <div className="ln"><span>Income you usually get that is not in yet</span><span>+ {formatINR(t.expectedIncome)}</span></div>}
            <div className="ln"><span>Everyday spending still to come</span><span>− {formatINR(t.remainingVariable)}</span></div>
            {t.remainingEmi > 0 && <div className="ln"><span>EMIs still due this month</span><span>− {formatINR(t.remainingEmi)}</span></div>}
            {t.remainingDebts > 0 && <div className="ln"><span>Repayments you owe this month</span><span>− {formatINR(t.remainingDebts)}</span></div>}
            <div className="ln tot"><span>Cash at month end</span><span className={t.endCash < 0 ? "neg-t" : ""}>{formatINR(t.endCash)}</span></div>
          </div>
        </section>

        <section className="card g2 s6">
          <div className="card-head"><div><h2 className="h3">Your goals</h2><div className="sub">When you could get there</div></div><Link className="link" href="/goals">Goals <ChevronRight size={14} /></Link></div>
          {f.goals.length ? (
            <div className="rows">
              {f.goals.slice(0, 5).map((g) => (
                <div className="row" key={g.id} style={{ alignItems: "flex-start" }}>
                  <span className="ic"><Target size={17} /></span>
                  <div className="bd" style={{ whiteSpace: "normal" }}>
                    <div className="t">{g.name}</div>
                    <div className="s" style={{ whiteSpace: "normal" }}>
                      {g.status === "reached" ? "Goal reached." : (
                        <>
                          {g.etaMonths !== null && g.etaDate
                            ? <>At your current pace of {formatINR(g.paceMonthly)} a month: about {g.etaMonths} {g.etaMonths === 1 ? "month" : "months"} ({fmtDate(g.etaDate, { month: "short", year: "numeric" })}).</>
                            : <>No savings added in the last 3 months.</>}
                          {g.etaAtSavings !== null && <> At your forecast savings of {formatINR(nx.savings)} a month: about {g.etaAtSavings} {g.etaAtSavings === 1 ? "month" : "months"}.</>}
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`pill plain ${g.status === "on_track" || g.status === "reached" ? "pos" : "warn"}`}>{g.status === "reached" ? "Reached" : g.status === "on_track" ? "On track" : "Behind"}</span>
                </div>
              ))}
            </div>
          ) : <Empty icon={<Target size={26} />} title="No goals yet" body="Create a goal and the forecast shows when you could reach it."><Link href="/goals" className="btn btn-glass btn-sm">Create a goal</Link></Empty>}
        </section>

        <section className="card g2 s6">
          <div className="card-head"><div><h2 className="h3">What to do about it</h2><div className="sub">Your top recommendations</div></div><Link className="link" href="/recommendations">All <ChevronRight size={14} /></Link></div>
          {top.length ? <div className="rec-list">{top.map((r) => <RecCard key={r.id} r={r} compact />)}</div> : <p className="muted small" style={{ margin: 0 }}>Nothing needs attention.</p>}
        </section>
      </div>

      <details className="card g2 fc-how" style={{ marginTop: 20 }}>
        <summary><Info size={16} />How this forecast is worked out</summary>
        <ul>
          <li><b>History:</b> your last {f.monthsUsed} full {f.monthsUsed === 1 ? "month" : "months"}. Recent months count more than older ones. The month you started recording is skipped if it was only partly recorded.</li>
          <li><b>Income and spending:</b> a weighted average of your usual monthly income and of each category. Transfers between your own accounts are ignored.</li>
          <li><b>EMIs:</b> taken from your loans&rsquo; repayment schedules, so they are exact and stop when a loan ends. They are not mixed into everyday spending.</li>
          <li><b>This month:</b> categories you pay once a month (rent, bills, subscriptions) are expected at their usual amount. Everyday categories blend your pace so far with your usual level.</li>
          <li><b>Month-end cash:</b> available cash plus income you usually receive that has not arrived (only if less than half is in), minus the spending, EMIs and repayments still to come. Money friends owe you is not counted.</li>
          <li><b>Range:</b> how much your savings varied from month to month. With fewer than 3 months it is a rough band.</li>
          <li><b>Confidence:</b> low with 1 to 2 months of history, medium with 3 to 5, high with 6.</li>
        </ul>
        <p className="xs muted" style={{ margin: "10px 0 0" }}>A forecast is an estimate, not a promise. A bonus, a big purchase or a new loan will change it.</p>
      </details>
    </>
  );
}
