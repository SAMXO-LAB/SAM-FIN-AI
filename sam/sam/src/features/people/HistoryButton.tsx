"use client";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, History } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { formatINR } from "@/lib/money";

export function HistoryButton({ name, direction, amount, start, note, contact, payments, totals }: {
  name: string; direction: "lent" | "borrowed"; amount: number; start: string; note: string | null; contact: string | null;
  payments: { id: string; date: string; amount: number }[]; totals: { due: number; repaid: number; remaining: number };
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-glass btn-sm" onClick={() => setOpen(true)}><History size={15} />History</button>
      <Dialog open={open} onClose={() => setOpen(false)} title={name}>
        <div className="kv" style={{ marginBottom: 12 }}>
          <div><div className="k">Total</div><div className="v">{formatINR(totals.due)}</div></div>
          <div><div className="k">Repaid</div><div className="v">{formatINR(totals.repaid)}</div></div>
          <div><div className="k">Remaining</div><div className="v">{formatINR(totals.remaining)}</div></div>
        </div>
        <div className="rows">
          <div className="row"><span className="ic">{direction === "lent" ? <ArrowUpRight size={17} /> : <ArrowDownLeft size={17} />}</span><div className="bd"><div className="t">{direction === "lent" ? "Money given" : "Money borrowed"}</div><div className="s">{start}{note ? ` · ${note}` : ""}</div></div><div className="amt">{formatINR(amount)}</div></div>
          {payments.map((p) => <div className="row" key={p.id}><span className="ic"><Check size={17} /></span><div className="bd"><div className="t">Repayment</div><div className="s">{p.date}</div></div><div className="amt pos-t">{formatINR(p.amount)}</div></div>)}
        </div>
        {contact && <p className="small muted">Contact: <span style={{ userSelect: "all" }}>{contact}</span></p>}
      </Dialog>
    </>
  );
}
