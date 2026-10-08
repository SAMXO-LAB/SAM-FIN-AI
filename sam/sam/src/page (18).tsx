import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Gauge, Info, Minus, Sparkles } from "lucide-react";
import { getInsights } from "@/lib/insights";
import { Empty, PageHead } from "@/components/ui/Page";
import { LABEL_TONE, ScoreRing } from "@/features/insights/ScoreRing";
import { WEIGHTS, NAMES, type ComponentId } from "@/lib/health";

export const metadata: Metadata = { title: "Health Score" };

const HREF: Record<ComponentId, string> = { savings: "/forecast", emergency: "/accounts", emi: "/loans", spending: "/budgets", debt: "/loans", goals: "/goals", income: "/transactions" };
const barTone = (s: number) => (s >= 70 ? "pos" : s >= 45 ? "warn" : "neg");

export default async function HealthPage() {
  const { health: h } = await getInsights();
  const n = h.now;
  if (!n.ready) {
    return (
      <>
        <PageHead eyebrow="Your money, scored" title="Finance Book Score" sub="One number for how healthy your finances are, with the reasons behind it." />
        <section className="card g2">
          <Empty icon={<Gauge size={26} />} title="Your score is almost ready" body="Add your income and spending for at least one full month and your score appears here, along with the reasons behind it.">
            <Link href="/transactions" className="btn btn-glass btn-sm">Add transactions</Link>
          </Empty>
        </section>
      </>
    );
  }
  const ch = h.change, tone = LABEL_TONE[n.label];
  const hist = h.history;
  const missing = n.components.filter((c) => c.score === null);
  return (
    <>
      <PageHead eyebrow="Your money, scored" title="Finance Book Score" sub="Seven parts of your finances, each worked out from your own records." />

      <section className="card g3 hs-hero" aria-label="Your score">
        <ScoreRing score={n.score} label={n.label} />
        <div className="hs-copy">
          <div className="hs-line"><span className="eyebrow">Finance Book Score</span><span className={`pill plain ${tone}`}>{n.label}</span></div>
          <p className="fc-headline">{n.score} / 100 — {n.label}</p>
          {ch ? (
            <p className={`hs-delta ${ch.points > 0 ? "pos-t" : ch.points < 0 ? "neg-t" : "muted"}`}>
              {ch.points > 0 ? <ArrowUpRight size={16} /> : ch.points < 0 ? <ArrowDownRight size={16} /> : <Minus size={16} />}
              {ch.points === 0 ? "No change since a month ago" : `${ch.points > 0 ? "+" : "−"}${Math.abs(ch.points)} ${Math.abs(ch.points) === 1 ? "point" : "points"} since a month ago`}
            </p>
          ) : <p className="muted small" style={{ margin: 0 }}>Come back next month to see how your score moves.</p>}
          {n.coverage < 100 && <p className="muted small" style={{ margin: 0 }}>Based on {missing.length ? `${7 - missing.length} of 7` : "the"} parts. {missing.map((c) => c.name.toLowerCase()).join(" and ")} {missing.length === 1 ? "is" : "are"} left out for now, so the rest count for more.</p>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><span className="tag calc">Calculated</span><span className="tag actual">From your records</span></div>
        </div>
      </section>

      <div className="hs-grid">
        <section className="card g2" aria-label="Why your score changed">
          <div className="card-head"><div><h3 className="h3">Why your score changed</h3><div className="sub">Compared with a month ago</div></div></div>
          {ch ? (
            <>
              <p className="hs-why">{ch.summary}</p>
              {ch.drivers.length > 0 ? (
                <div className="rows">{ch.drivers.map((d) => (
                  <div className="row" key={d.id}>
                    <span className="ic" style={{ color: d.points > 0 ? "var(--pos)" : "var(--neg)" }}>{d.points > 0 ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}</span>
                    <div className="bd"><div className="t">{d.name}</div><div className="s">{d.text.replace(/^[^:]+: /, "")}</div></div>
                    <div className={`amt ${d.points > 0 ? "pos-t" : "neg-t"}`}>{d.points > 0 ? "+" : "−"}{Math.abs(d.points)}</div>
                  </div>
                ))}</div>
              ) : <p className="small muted" style={{ margin: 0 }}>None of the seven parts moved by a meaningful amount.</p>}
            </>
          ) : <p className="small muted" style={{ margin: 0 }}>There is not enough earlier history to compare with yet. After another month of records, this shows exactly what moved your score and by how much.</p>}
        </section>

        <section className="card g2" aria-label="Score history">
          <div className="card-head"><div><h3 className="h3">Last few months</h3><div className="sub">Rebuilt from your records</div></div></div>
          <div className="hs-hist">
            {hist.map((x, i) => (
              <div className="hs-col" key={i}>
                <span className="num">{x.score ?? "–"}</span>
                <div className="hs-bar"><i className={x.score === null ? "" : barTone(x.score)} style={{ height: `${x.score ?? 0}%` }} /></div>
                <span className="xs muted">{x.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card g2" style={{ marginTop: 20 }} aria-label="What makes up your score">
        <div className="card-head"><div><h3 className="h3">What makes up your score</h3><div className="sub">Bigger weight means more effect on the total</div></div></div>
        <div className="hs-parts">
          {n.components.map((c) => (
            <div className="hs-part" key={c.id}>
              <div className="hs-part-top">
                <b>{c.name}</b>
                <span className="xs muted">{WEIGHTS[c.id]}% of score</span>
                <span className="hs-part-s num">{c.score === null ? "Not measured" : `${c.score} / 100`}</span>
              </div>
              <div className={`bar ${c.score === null ? "" : barTone(c.score)}`} aria-hidden="true"><i style={{ width: `${c.score ?? 0}%` }} /></div>
              <p className="hs-part-m"><b>{c.metric}.</b> {c.detail}</p>
              {c.improve && <Link className="link" href={HREF[c.id]}>{c.improve} <ChevronRight size={14} /></Link>}
            </div>
          ))}
        </div>
      </section>

      {h.opportunities.length > 0 && (
        <section className="card g2" style={{ marginTop: 20 }} aria-label="Where to gain next">
          <div className="card-head"><div><h3 className="h3">Where to gain next</h3><div className="sub">The biggest points available to you</div></div></div>
          <div className="rows">{h.opportunities.map((o) => (
            <Link href={HREF[o.id]} className="row click" key={o.id}><span className="ic"><Sparkles size={17} /></span><div className="bd"><div className="t">{o.name}</div><div className="s">{o.text}</div></div><div className="amt pos-t">up to +{o.gain}</div></Link>
          ))}</div>
        </section>
      )}

      <details className="card g2 fc-how" style={{ marginTop: 20 }}>
        <summary><Info size={16} />How the score is calculated</summary>
        <ul>
          <li>Each part is scored from 0 to 100, then combined using the weights: {(Object.keys(WEIGHTS) as ComponentId[]).map((id) => `${NAMES[id]} ${WEIGHTS[id]}%`).join(", ")}.</li>
          <li>Savings rate: saving 30% of income earns full marks. Emergency fund: 6 months of spending earns full marks and 3 months earns 70. EMI burden: under 15% of income is full marks and 50% or more is zero.</li>
          <li>Debt compares what you owe with a year of income, with extra weight on loans costing 12% or more and on overdue payments. Spending habits look for a steady month, no sharp rise across months and budgets kept.</li>
          <li>Parts that cannot be measured yet, such as goals when you have none or income stability with under three months of history, are left out and the rest count for more.</li>
          <li>Last month's score is rebuilt from your dated records (transactions, loan and repayment dates, goal savings), so the comparison uses the same method. It is an estimate, not a credit score, and nothing is shared with anyone.</li>
          <li>Labels: 85 and above Excellent, 70 to 84 Healthy, 55 to 69 Fair, 40 to 54 Needs attention, below 40 At risk.</li>
        </ul>
      </details>
      <p className="xs muted" style={{ marginTop: 18 }}>The Finance Book Score is a guide based on the numbers you record. It is not a credit score and not financial advice.</p>
    </>
  );
}
