/** Deterministic, testable financial calculations. All amounts in paise. */
import { addMonths, iso, monthsBetween, parseISO, today as todayFn } from "./dates";
import type { Paise } from "./money";

export interface ScheduleRow { n: number; date: string; emi: Paise; interest: Paise; principal: Paise; balance: Paise }

/** Standard reducing-balance EMI: P·r·(1+r)^n / ((1+r)^n − 1), rounded to the paisa. */
export function emiAmount(principal: Paise, annualRatePct: number, months: number): Paise {
  const r = annualRatePct / 1200;
  if (r === 0) return Math.ceil(principal / months);
  const f = Math.pow(1 + r, months);
  return Math.round((principal * r * f) / (f - 1));
}

/** Full amortisation schedule. The last instalment absorbs rounding so the balance ends at exactly 0. */
export function amortise(principal: Paise, annualRatePct: number, months: number, firstDate: string, method: "reducing" | "flat" = "reducing"): { emi: Paise; rows: ScheduleRow[] } {
  const first = parseISO(firstDate);
  const rows: ScheduleRow[] = [];
  if (method === "flat") {
    const totalInt = Math.round(principal * (annualRatePct / 100) * (months / 12));
    const emi = Math.round((principal + totalInt) / months);
    let bal = principal, intLeft = totalInt;
    for (let i = 0; i < months; i++) {
      const last = i === months - 1;
      const interest = last ? intLeft : Math.round(totalInt / months);
      const prin = last ? bal : Math.min(bal, emi - interest);
      bal -= prin; intLeft -= interest;
      rows.push({ n: i + 1, date: iso(addMonths(first, i)), emi: prin + interest, interest, principal: prin, balance: bal });
    }
    return { emi, rows };
  }
  const r = annualRatePct / 1200;
  const emi = emiAmount(principal, annualRatePct, months);
  let bal = principal;
  for (let i = 0; i < months; i++) {
    const interest = Math.round(bal * r);
    let prin = emi - interest;
    if (i === months - 1 || prin > bal) prin = bal;
    bal -= prin;
    rows.push({ n: i + 1, date: iso(addMonths(first, i)), emi: prin + interest, interest, principal: prin, balance: bal });
  }
  return { emi, rows };
}

export interface LoanInput { principal: Paise; annual_rate: number | string; tenure_months: number; first_emi_date: string; interest_type: "reducing" | "flat" }

export function loanSummary(loan: LoanInput, paidCount: number, ref = todayFn()) {
  const { emi, rows } = amortise(loan.principal, Number(loan.annual_rate), loan.tenure_months, loan.first_emi_date, loan.interest_type);
  const paid = Math.max(0, Math.min(paidCount, loan.tenure_months));
  const outstanding = paid === 0 ? loan.principal : rows[paid - 1].balance;
  const totalInterest = rows.reduce((s, x) => s + x.interest, 0);
  const interestLeft = rows.slice(paid).reduce((s, x) => s + x.interest, 0);
  const next = paid < rows.length ? rows[paid] : null;
  return {
    emi, rows, paid, outstanding, totalInterest, interestLeft,
    totalRepayment: loan.principal + totalInterest,
    remaining: loan.tenure_months - paid,
    next,
    overdue: !!next && parseISO(next.date) < ref,
  };
}

export type DebtStatus = "Pending" | "Active" | "Partially paid" | "Paid" | "Overdue";

export function debtSummary(d: { direction: "lent" | "borrowed"; amount: Paise; interest_pct: number | string; due_date: string | null }, payments: { amount: Paise }[], ref = todayFn()) {
  const totalDue = Math.round(d.amount * (1 + Number(d.interest_pct || 0) / 100));
  const repaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, totalDue - repaid);
  let status: DebtStatus;
  if (remaining === 0) status = "Paid";
  else if (d.due_date && parseISO(d.due_date) < ref) status = "Overdue";
  else if (repaid > 0) status = "Partially paid";
  else status = d.direction === "borrowed" ? "Active" : "Pending";
  return { totalDue, repaid, remaining, status, progress: totalDue ? repaid / totalDue : 0 };
}

/** Suggested equal monthly saving to reach a goal by its date. An estimate, rounded up to the rupee. */
export function goalPlan(target: Paise, saved: Paise, targetDate: string, ref = todayFn()) {
  const remaining = Math.max(0, target - saved);
  const months = Math.max(1, monthsBetween(ref, parseISO(targetDate)));
  const monthly = remaining === 0 ? 0 : Math.ceil(remaining / months / 100) * 100;
  return { remaining, months, monthly, progress: target ? Math.min(1, saved / target) : 0 };
}

export interface TxLite { type: "income" | "expense" | "transfer"; amount: Paise; occurred_on: string; category?: string | null }

export function sumRange(tx: TxLite[], from: string, to: string) {
  let income = 0, expense = 0;
  for (const t of tx) {
    if (t.occurred_on < from || t.occurred_on > to) continue;
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") expense += t.amount;
  }
  return { income, expense, net: income - expense };
}

export function spendByCategory(tx: TxLite[], from: string, to: string): Record<string, Paise> {
  const m: Record<string, Paise> = {};
  for (const t of tx) {
    if (t.type !== "expense" || t.occurred_on < from || t.occurred_on > to) continue;
    const k = t.category || "Uncategorised";
    m[k] = (m[k] || 0) + t.amount;
  }
  return m;
}
