"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeftRight, ChevronLeft, ChevronRight, Paperclip, Pencil, Trash2 } from "lucide-react";
import { Icon } from "@/components/Icon";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmButton } from "@/components/ui/Form";
import { fmtDate } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { methodLabel } from "@/lib/labels";
import { TransactionButton } from "@/features/finance/forms";
import { deleteTransaction } from "@/features/finance/actions";
import type { AccountWithBalance, Category, Transaction } from "@/types/db";

export function TxList({ rows, accounts, categories, receipts, page, pages }: { rows: Transaction[]; accounts: AccountWithBalance[]; categories: Category[]; receipts: Record<string, string[]>; page: number; pages: number }) {
  const [open, setOpen] = useState<Transaction | null>(null);
  const sp = useSearchParams();
  const acc = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "Deleted account";
  const cat = (id: string | null) => categories.find((c) => c.id === id);
  const title = (t: Transaction) => t.description || t.counterparty || cat(t.category_id)?.name || (t.type === "transfer" ? "Transfer" : "Transaction");
  const icon = (t: Transaction) => (t.type === "transfer" ? <ArrowLeftRight size={16} /> : <Icon name={cat(t.category_id)?.icon ?? "circle-dashed"} size={16} />);
  const amt = (t: Transaction) => t.type === "income" ? <span className="pos-t">{formatINR(t.amount, { sign: true })}</span> : t.type === "expense" ? formatINR(-t.amount) : <span className="muted">{formatINR(t.amount)}</span>;
  const where = (t: Transaction) => (t.type === "transfer" ? `${acc(t.from_account_id)} → ${acc(t.to_account_id)}` : acc(t.account_id));
  const pageHref = (p: number) => { const n = new URLSearchParams(sp.toString()); n.set("page", String(p)); return `?${n.toString()}`; };
  let last = "";
  return (
    <>
      <div className="table-wrap only-lg">
        <table className="t">
          <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Account</th><th>Method</th><th className="r">Amount</th></tr></thead>
          <tbody>{rows.map((t) => (
            <tr key={t.id} tabIndex={0} onClick={() => setOpen(t)} onKeyDown={(e) => e.key === "Enter" && setOpen(t)}>
              <td className="muted num">{fmtDate(t.occurred_on)}</td>
              <td><div className="cell"><span className="ic">{icon(t)}</span><div><b>{title(t)}{receipts[t.id]?.length ? <Paperclip size={13} className="rcp-clip" aria-label="Has a receipt" /> : null}</b>{t.counterparty && t.description && <span>{t.counterparty}</span>}</div></div></td>
              <td>{t.type === "transfer" ? <span className="muted">Transfer</span> : cat(t.category_id)?.name ?? "—"}</td>
              <td className="muted">{where(t)}</td>
              <td className="muted">{methodLabel(t.payment_method)}</td>
              <td className="r num" style={{ fontWeight: 600 }}>{amt(t)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="only-sm rows">{rows.map((t) => {
        const sep = t.occurred_on !== last; last = t.occurred_on;
        return (
          <div key={t.id}>
            {sep && <div className="date-sep"><span>{fmtDate(t.occurred_on, { weekday: "short", day: "numeric", month: "short" })}</span></div>}
            <button className="row click" style={{ width: "100%", textAlign: "left" }} onClick={() => setOpen(t)}>
              <span className="ic">{icon(t)}</span><div className="bd"><div className="t">{title(t)}{receipts[t.id]?.length ? <Paperclip size={13} className="rcp-clip" aria-label="Has a receipt" /> : null}</div><div className="s">{t.type === "transfer" ? where(t) : `${cat(t.category_id)?.name ?? "—"} · ${where(t)}`}</div></div><div className="amt">{amt(t)}</div>
            </button>
          </div>
        );
      })}</div>
      <div className="pager">
        <span>Page {page} of {pages}</span>
        <div style={{ display: "flex", gap: 6 }}>
          {page > 1 ? <Link className="btn btn-glass btn-sm" href={pageHref(page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></Link> : <span className="btn btn-glass btn-sm" aria-disabled="true" style={{ opacity: .4 }}><ChevronLeft size={16} /></span>}
          {page < pages ? <Link className="btn btn-glass btn-sm" href={pageHref(page + 1)} aria-label="Next page"><ChevronRight size={16} /></Link> : <span className="btn btn-glass btn-sm" aria-disabled="true" style={{ opacity: .4 }}><ChevronRight size={16} /></span>}
        </div>
      </div>
      <Dialog open={!!open} onClose={() => setOpen(null)} title="Transaction">
        {open && (
          <>
            <div style={{ textAlign: "center", padding: "6px 0 14px" }}>
              <span className="ic" style={{ width: 52, height: 52, borderRadius: 17, display: "inline-grid", placeItems: "center", background: "var(--hover)", marginBottom: 10 }}>{icon(open)}</span>
              <div className="stat" style={{ fontSize: 40 }}>{open.type === "income" ? "+" : open.type === "expense" ? "−" : ""}{formatINR(open.amount, { decimals: true })}</div>
              <div className="small muted" style={{ marginTop: 4 }}>{title(open)}</div>
            </div>
            <div className="detail-list">
              <div><span className="k">Type</span><span className="v">{open.type[0].toUpperCase() + open.type.slice(1)}</span></div>
              <div><span className="k">Date</span><span className="v">{fmtDate(open.occurred_on, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span></div>
              {open.type === "transfer" ? <><div><span className="k">From</span><span className="v">{acc(open.from_account_id)}</span></div><div><span className="k">To</span><span className="v">{acc(open.to_account_id)}</span></div></>
                : <><div><span className="k">Category</span><span className="v">{cat(open.category_id)?.name ?? "—"}</span></div><div><span className="k">Account</span><span className="v">{acc(open.account_id)}</span></div><div><span className="k">Method</span><span className="v">{methodLabel(open.payment_method)}</span></div></>}
              {open.counterparty && <div><span className="k">{open.type === "income" ? "From" : "Merchant"}</span><span className="v">{open.counterparty}</span></div>}
              {open.notes && <div><span className="k">Notes</span><span className="v">{open.notes}</span></div>}
            </div>
            {receipts[open.id]?.length ? (
              <div className="rcp-view">
                <span className="lbl">Receipts</span>
                <div className="rcp-row">
                  {receipts[open.id].map((id, i) => (
                    <a key={id} className="rcp-thumb big" href={`/api/receipts/${id}`} target="_blank" rel="noreferrer" aria-label={`Open receipt ${i + 1} in a new tab`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/receipts/${id}`} alt={`Receipt ${i + 1}`} loading="lazy" />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="sheet-foot">
              <ConfirmButton action={deleteTransaction} id={open.id} title="Delete this transaction?" body={`${title(open)}, ${formatINR(open.amount)} on ${fmtDate(open.occurred_on)}. Account balances will update. This can’t be undone.`} trigger={<><Trash2 size={16} />Delete</>} triggerClass="btn btn-ghost" onDone={() => setOpen(null)} />
              <span style={{ flex: 1 }} />
              <TransactionButton accounts={accounts} categories={categories} tx={open} receipts={receipts[open.id] ?? []} trigger={<><Pencil size={16} />Edit</>} />
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
