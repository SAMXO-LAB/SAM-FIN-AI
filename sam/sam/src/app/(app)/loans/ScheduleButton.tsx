"use client";
import { useState } from "react";
import { Table2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { fmtDate } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import type { ScheduleRow } from "@/lib/finance";

export function ScheduleButton({ name, rows, paid, emi, totalInterest, total }: { name: string; rows: ScheduleRow[]; paid: number; emi: number; totalInterest: number; total: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-glass btn-sm" onClick={() => setOpen(true)}><Table2 size={15} />Schedule</button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`${name} schedule`} wide>
        <div className="kv" style={{ marginBottom: 16 }}>
          <div><div className="k">EMI</div><div className="v">{formatINR(emi, { decimals: true })}</div></div>
          <div><div className="k">Total interest</div><div className="v">{formatINR(totalInterest)}</div></div>
          <div><div className="k">Total repayment</div><div className="v">{formatINR(total)}</div></div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="sched">
            <thead><tr><th>#</th><th>Due date</th><th>EMI</th><th>Interest</th><th>Principal</th><th>Balance</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.n} className={r.n === paid + 1 ? "cur" : ""} style={r.n <= paid ? { color: "var(--ink-3)" } : undefined}>
                <td>{r.n <= paid ? "✓ " : ""}{r.n}</td><td>{fmtDate(r.date)}</td><td>{formatINR(r.emi, { decimals: true })}</td><td>{formatINR(r.interest, { decimals: true })}</td><td>{formatINR(r.principal, { decimals: true })}</td><td>{formatINR(r.balance, { decimals: true })}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className="hint" style={{ margin: "14px 0 0" }}>Calculated to the paisa each month. The final instalment absorbs rounding so the balance ends at exactly zero.</p>
      </Dialog>
    </>
  );
}
