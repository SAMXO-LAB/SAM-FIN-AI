/** Pure money maths used by the assistant tools. Kept free of I/O so it can be unit-tested. */
import { amortise } from "../finance";
import type { Paise } from "../money";

export const rupees = (p: Paise) => Math.round(p) / 100;

/** Group expense totals; returns rows sorted by amount with share of the whole. */
export function groupTotals<T>(items: T[], key: (t: T) => string, amount: (t: T) => Paise) {
  const m = new Map<string, { total: Paise; count: number }>();
  for (const it of items) {
    const k = key(it) || "Uncategorised";
    const g = m.get(k) ?? { total: 0, count: 0 };
    g.total += amount(it); g.count += 1; m.set(k, g);
  }
  const all = [...m.values()].reduce((s, g) => s + g.total, 0);
  return [...m.entries()]
    .map(([name, g]) => ({ name, total: g.total, count: g.count, share: all ? g.total / all : 0 }))
    .sort((a, b) => b.total - a.total);
}

/** Month-by-month schedule with a one-off prepayment; EMI stays the same so the loan ends sooner. */
export function simulatePrepayment(outstanding: Paise, annualRatePct: number, emi: Paise, prepay: Paise) {
  const run = (start: Paise) => {
    const r = annualRatePct / 1200;
    let bal = start, interest = 0, months = 0;
    while (bal > 0 && months < 1200) {
      const i = Math.round(bal * r);
      if (emi <= i) return null; // EMI never clears the balance
      const pay = Math.min(emi, bal + i);
      interest += i; bal = bal + i - pay; months += 1;
    }
    return { months, interest };
  };
  const base = run(outstanding);
  const after = run(Math.max(0, outstanding - Math.min(prepay, outstanding)));
  if (!base || !after) return null;
  return { base, after, interestSaved: base.interest - after.interest, monthsSaved: base.months - after.months };
}

export function emiQuote(principal: Paise, ratePct: number, months: number, method: "reducing" | "flat", firstDate: string) {
  const a = amortise(principal, ratePct, months, firstDate, method);
  const interest = a.rows.reduce((s, r) => s + r.interest, 0);
  return { emi: a.emi, totalInterest: interest, totalPayment: principal + interest };
}
