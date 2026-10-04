import type { Metadata } from "next";
import { Check, Landmark, Plus, Trash2 } from "lucide-react";
import { getAccounts, getLoans } from "@/lib/data";
import { fmtDate, fmtShort, today } from "@/lib/dates";
import { loanSummary } from "@/lib/finance";
import { formatINR } from "@/lib/money";
import { loanTypeLabel } from "@/lib/labels";
import { Empty, PageHead, Stat } from "@/components/ui/Page";
import { ConfirmButton } from "@/components/ui/Form";
import { EmiButton, LoanButton } from "@/features/finance/forms";
import { deleteLoan } from "@/features/finance/actions";
import { ScheduleButton } from "./ScheduleButton";

export const metadata: Metadata = { title: "EMIs & Loans" };

export default async function LoansPage() {
  const [loans, accounts] = await Promise.all([getLoans(), getAccounts()]);
  const ref = today();
  const st = loans.map((l) => ({ l, s: loanSummary(l, l.payments.length, ref) }));
  const out = st.reduce((a, x) => a + x.s.outstanding, 0);
  const emi = st.reduce((a, x) => a + (x.s.next ? x.s.emi : 0), 0);
  const il = st.reduce((a, x) => a + x.s.interestLeft, 0);
  const nx = st.filter((x) => x.s.next).sort((a, b) => (a.s.next!.date < b.s.next!.date ? -1 : 1))[0];
  return (
    <>
      <PageHead eyebrow="Obligations" title="EMIs & Loans" sub="Schedules are calculated from the terms you enter. Your lender’s figures may differ by a few rupees due to rounding."
        actions={<LoanButton accounts={accounts} trigger={<><Plus size={16} />Add loan</>} />} />
      <div className="stat-row">
        <Stat k="Outstanding principal" v={formatINR(out)} d={`${loans.length} loans`} />
        <Stat k="EMIs per month" v={formatINR(emi)} d="Active loans" />
        <Stat k="Interest still to pay" v={formatINR(il)} d="If paid as scheduled" />
        <Stat k="Next EMI" v={nx ? fmtShort(nx.s.next!.date) : "—"} d={nx ? `${nx.l.name} · ${formatINR(nx.s.emi)}` : "Nothing due"} />
      </div>
      {loans.length ? (
        <div className="cards-grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,420px),1fr))" }}>{st.map(({ l, s }) => (
          <article className="loan g3" key={l.id}>
            <div className="loan-top">
              <div><div className="small muted">{l.lender || "Lender"} · {loanTypeLabel(l.loan_type)}</div><h2 className="h2" style={{ marginTop: 2 }}>{l.name}</h2></div>
              {s.next ? (s.overdue ? <span className="pill neg">Overdue</span> : <span className="pill info">{s.remaining} left</span>) : <span className="pill pos">Closed</span>}
            </div>
            <div className="emi">{formatINR(s.emi)}<small>/month</small></div>
            <div className="segs" style={{ ["--n" as string]: Math.min(l.tenure_months, 60) }} aria-label={`${s.paid} of ${l.tenure_months} paid`}>
              {Array.from({ length: Math.min(l.tenure_months, 60) }, (_, i) => { const k = Math.floor((i * l.tenure_months) / Math.min(l.tenure_months, 60)); return <i key={i} className={k < s.paid ? "on" : k === s.paid ? "next" : ""} />; })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, gap: 10, flexWrap: "wrap" }}>
              <span><b className="num">{s.paid} of {l.tenure_months}</b> <span className="muted">payments completed</span></span>
              <span className="muted">{s.next ? <>Next payment <b style={{ color: "var(--ink)" }}>{fmtDate(s.next.date)}</b></> : "Fully repaid"}</span>
            </div>
            <div className="kv">
              <div><div className="k">Outstanding</div><div className="v">{formatINR(s.outstanding)}</div></div>
              <div><div className="k">Interest left</div><div className="v">{formatINR(s.interestLeft)}</div></div>
              <div><div className="k">Rate</div><div className="v">{Number(l.annual_rate)}% {l.interest_type === "flat" ? "flat" : "p.a."}</div></div>
              <div><div className="k">Principal</div><div className="v">{formatINR(l.principal)}</div></div>
              <div><div className="k">Total repayment</div><div className="v">{formatINR(s.totalRepayment)}</div></div>
              <div><div className="k">Processing fee</div><div className="v">{formatINR(l.processing_fee)}</div></div>
            </div>
            <div className="card-actions">
              {s.next && <EmiButton loanId={l.id} amount={s.next.emi} label={`Record EMI ${s.paid + 1} of ${l.tenure_months}`} accountId={l.account_id} accounts={accounts} triggerClass="btn btn-primary btn-sm" trigger={<><Check size={15} />Record EMI</>} />}
              <ScheduleButton name={l.name} rows={s.rows} paid={s.paid} emi={s.emi} totalInterest={s.totalInterest} total={s.totalRepayment} />
              <ConfirmButton action={deleteLoan} id={l.id} title={`Remove ${l.name}?`} body="The loan and its payment history will be removed. EMI transactions already recorded stay in your history." cta="Remove loan" trigger={<><Trash2 size={15} />Remove</>} />
            </div>
          </article>
        ))}</div>
      ) : (
        <section className="card g2"><Empty icon={<Landmark size={26} />} title="No loans tracked" body="Add a personal, home, vehicle or credit card EMI to see its full schedule and what’s left to pay."><LoanButton accounts={accounts} trigger={<><Plus size={16} />Add loan</>} /></Empty></section>
      )}
    </>
  );
}
