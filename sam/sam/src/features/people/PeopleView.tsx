import Link from "next/link";
import { HandCoins, Handshake, Trash2, UserPlus, CirclePlus } from "lucide-react";
import { getDebts } from "@/lib/data";
import { fmtDate, fmtShort, today } from "@/lib/dates";
import { debtSummary } from "@/lib/finance";
import { formatINR } from "@/lib/money";
import { Empty, PageHead, Stat } from "@/components/ui/Page";
import { ConfirmButton } from "@/components/ui/Form";
import { DebtButton, RepayButton } from "@/features/finance/forms";
import { deleteDebt } from "@/features/finance/actions";
import { HistoryButton } from "./HistoryButton";

const tone = (s: string) => (s === "Paid" ? "pos" : s === "Overdue" ? "neg" : s === "Partially paid" ? "warn" : "info");
const initials = (n: string) => n.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export async function PeopleView({ direction, filter }: { direction: "lent" | "borrowed"; filter: string }) {
  const L = direction === "lent";
  const all = (await getDebts()).filter((d) => d.direction === direction).map((d) => ({ d, s: debtSummary(d, d.payments, today()) }));
  const f = ["open", "overdue", "paid", "all"].includes(filter) ? filter : "open";
  const list = all.filter(({ s }) => (f === "all" ? true : f === "open" ? s.remaining > 0 : f === "overdue" ? s.status === "Overdue" : s.status === "Paid"));
  const outstanding = all.reduce((a, x) => a + x.s.remaining, 0);
  const overdue = all.filter((x) => x.s.status === "Overdue");
  const add = <DebtButton direction={direction} trigger={<><UserPlus size={16} />{L ? "Record money lent" : "Record money borrowed"}</>} />;
  return (
    <>
      <PageHead eyebrow={L ? "Money you gave" : "Money you received"} title={L ? "Money Lent" : "Money Borrowed"} actions={add} />
      <div className="stat-row">
        <Stat k={L ? "Owed to you" : "You owe"} v={formatINR(outstanding)} d={`${all.filter((x) => x.s.remaining > 0).length} open`} tone={outstanding ? (L ? "pos" : "neg") : undefined} />
        <Stat k="Overdue" v={formatINR(overdue.reduce((a, x) => a + x.s.remaining, 0))} d={`${overdue.length} ${overdue.length === 1 ? "person" : "people"}`} tone={overdue.length ? "neg" : undefined} />
        <Stat k={L ? "Total lent" : "Total borrowed"} v={formatINR(all.reduce((a, x) => a + x.s.totalDue, 0))} d="Including any interest" />
        <Stat k={L ? "Repaid to you" : "You repaid"} v={formatINR(all.reduce((a, x) => a + x.s.repaid, 0))} d={`${all.reduce((a, x) => a + x.d.payments.length, 0)} payments`} />
      </div>
      <div className="seg" role="tablist" aria-label="Filter">
        {[["open", "Open"], ["overdue", "Overdue"], ["paid", "Paid"], ["all", "All"]].map(([k, l]) => (
          <Link key={k} role="tab" aria-selected={f === k} className={f === k ? "on" : ""} href={`?f=${k}`} style={{ height: 30, padding: "0 12px", borderRadius: 9, fontSize: 13, fontWeight: 560, display: "inline-flex", alignItems: "center" }}>{l}</Link>
        ))}
      </div>
      {list.length ? (
        <div className="cards-grid">{list.map(({ d, s }) => (
          <article className="person g3" key={d.id}>
            <div className="person-top"><span className="av">{initials(d.person_name)}</span><div className="bd"><div className="t">{d.person_name}</div><div className="xs muted">{d.notes || "No note"}</div></div><span className={`pill ${tone(s.status)}`}>{s.status}</span></div>
            <div><div className="xs muted">{s.remaining ? "Outstanding" : "Settled"}</div><div className={`rem ${s.remaining ? (L ? "pos-t" : "neg-t") : ""}`}>{formatINR(s.remaining || s.totalDue)}</div></div>
            <div className={`bar thin ${tone(s.status) === "info" ? "acc" : tone(s.status)}`}><i style={{ width: `${Math.min(100, s.progress * 100)}%` }} /></div>
            <div className="kv">
              <div><div className="k">{L ? "Given" : "Borrowed"}</div><div className="v">{fmtShort(d.start_date)}</div></div>
              <div><div className="k">{L ? "Expected" : "Due"}</div><div className={`v ${s.status === "Overdue" ? "neg-t" : ""}`}>{d.due_date ? fmtShort(d.due_date) : "—"}</div></div>
              <div><div className="k">Repaid</div><div className="v">{formatINR(s.repaid)}</div></div>
            </div>
            <div className="card-actions">
              {s.remaining > 0 && <RepayButton debtId={d.id} remaining={s.remaining} title={L ? `${d.person_name} paid you back` : `Repay ${d.person_name}`} triggerClass="btn btn-primary btn-sm" trigger={<><CirclePlus size={15} />Record repayment</>} />}
              <HistoryButton name={d.person_name} direction={direction} amount={d.amount} start={fmtDate(d.start_date)} note={d.notes} contact={d.contact} payments={d.payments.map((p) => ({ id: p.id, date: fmtDate(p.paid_on), amount: p.amount }))} totals={{ due: s.totalDue, repaid: s.repaid, remaining: s.remaining }} />
              <ConfirmButton action={deleteDebt} id={d.id} title={`Delete record for ${d.person_name}?`} body="The record and its repayment history will be deleted. This can’t be undone." label="Delete record" trigger={<Trash2 size={15} />} />
            </div>
          </article>
        ))}</div>
      ) : (
        <section className="card g2">
          {all.length
            ? <Empty icon={L ? <HandCoins size={26} /> : <Handshake size={26} />} title="Nothing here" body="No records match this filter." />
            : <Empty icon={L ? <HandCoins size={26} /> : <Handshake size={26} />} title={L ? "You haven’t lent money yet" : "You haven’t borrowed money"} body={L ? "Record money you give to friends, family or colleagues and track repayments." : "Track money you owe people, with due dates and part payments."}>{add}</Empty>}
        </section>
      )}
    </>
  );
}
