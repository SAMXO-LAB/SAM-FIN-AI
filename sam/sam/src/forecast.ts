/**
 * Financial forecast. Pure, deterministic maths over the user's own records (all amounts in paise).
 * Everything here is an estimate built from past months; it is labelled that way in the UI.
 */
import { addMonths, iso, parseISO } from "./dates";
import { debtSummary, goalPlan, loanSummary, type LoanInput } from "./finance";
import { formatINR, type Paise } from "./money";

export interface FxTx { type: "income" | "expense" | "transfer"; amount: Paise; occurred_on: string; category: string | null; loan_linked: boolean }
export interface FxAccount { type: string; balance: Paise }
export interface FxLoan extends LoanInput { id: string; name: string; paid: number; created?: string; paid_dates?: string[] }
export interface FxDebt { id: string; direction: "lent" | "borrowed"; person: string; amount: Paise; interest_pct: number | string; due_date: string | null; start?: string; payments: { amount: Paise; paid_on?: string }[] }
export interface FxGoal { id: string; created?: string; name: string; target: Paise; target_date: string; saved: Paise; contributions: { amount: Paise; contributed_on: string }[] }
export interface FxBudget { category: string; amount: Paise }
export interface FxInput { tx: FxTx[]; accounts: FxAccount[]; loans: FxLoan[]; debts: FxDebt[]; goals: FxGoal[]; budgets: FxBudget[]; ref: Date }

export type Confidence = "low" | "medium" | "high";
export interface Warning { id: string; level: "high" | "medium" | "low"; title: string; body: string; href?: string }
export interface CategoryPace { name: string; spent: Paise; usual: Paise; projected: Paise; budget: Paise | null; status: "on" | "watch" | "over" }
export interface GoalForecast {
  id: string; name: string; target: Paise; saved: Paise; remaining: Paise; targetDate: string;
  requiredMonthly: Paise; paceMonthly: Paise; etaMonths: number | null; etaDate: string | null;
  etaAtSavings: number | null; status: "reached" | "on_track" | "behind" | "no_pace";
}
export interface Forecast {
  ready: boolean;
  /** Why there is no forecast yet, when ready is false. */
  reason?: string;
  confidence: Confidence;
  monthsUsed: number;
  headline: string;
  next: { label: string; income: Paise; variable: Paise; emi: Paise; expenses: Paise; savings: Paise; low: Paise; high: Paise; savingsRate: number };
  recurring: { emi: Paise; housing: Paise; bills: Paise; subscriptions: Paise; total: Paise; debtsDue: Paise };
  nextCategories: { name: string; amount: Paise }[];
  thisMonth: {
    label: string; daysElapsed: number; daysLeft: number; daysInMonth: number;
    incomeSoFar: Paise; spentSoFar: Paise; expectedIncome: Paise; remainingEmi: Paise; remainingVariable: Paise; remainingDebts: Paise;
    availableNow: Paise; endCash: Paise; categories: CategoryPace[];
    /** Income, everyday spending and EMIs for the whole month (so far plus expected), and what is left over. */
    monthIncome: Paise; monthVariable: Paise; monthEmi: Paise; surplus: Paise;
  };
  projection: { start: Paise; months: { label: string; savings: Paise; balance: Paise; low: Paise; high: Paise }[]; total: Paise; end: Paise };
  goals: GoalForecast[];
  warnings: Warning[];
  /** Monthly history used (oldest first). */
  history: { key: string; label: string; income: Paise; expenses: Paise; savings: Paise }[];
}

const FIXED_LIKE = new Set(["Housing", "Bills", "Subscriptions"]);
const EMI = "EMI";
export const isEmiTx = (t: FxTx) => t.loan_linked || t.category === EMI;

const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const shiftKey = (key: string, n: number) => { const [y, m] = key.split("-").map(Number); return ym(new Date(y, m - 1 + n, 1)); };
const keyLabel = (key: string, long = true) => { const [y, m] = key.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: long ? "long" : "short", year: "numeric" }); };
const monthEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const round100 = (p: number) => Math.round(p / 100) * 100;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Weighted mean, newest value counts most. */
function weighted(values: number[]): number {
  if (!values.length) return 0;
  let n = 0, d = 0;
  values.forEach((v, i) => { const w = i + 1; n += v * w; d += w; });
  return n / d;
}
function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = sum(xs) / xs.length;
  return Math.sqrt(sum(xs.map((x) => (x - m) ** 2)) / (xs.length - 1));
}

interface MonthStat { key: string; income: Paise; variable: Paise; emi: Paise; byCat: Record<string, Paise> }

function monthStats(tx: FxTx[], keys: string[]): MonthStat[] {
  const m = new Map<string, MonthStat>(keys.map((k) => [k, { key: k, income: 0, variable: 0, emi: 0, byCat: {} }]));
  for (const t of tx) {
    if (t.type === "transfer") continue;
    const s = m.get(t.occurred_on.slice(0, 7));
    if (!s) continue;
    if (t.type === "income") { s.income += t.amount; continue; }
    if (isEmiTx(t)) { s.emi += t.amount; continue; }
    const c = t.category || "Other";
    s.variable += t.amount; s.byCat[c] = (s.byCat[c] ?? 0) + t.amount;
  }
  return keys.map((k) => m.get(k)!);
}

/** Which complete calendar months can be trusted as history (oldest first, at most 6). */
export function historyKeys(tx: FxTx[], ref: Date): string[] {
  const cur = ym(ref);
  const dated = tx.filter((t) => t.type !== "transfer").map((t) => t.occurred_on).sort();
  if (!dated.length) return [];
  const first = dated[0], firstKey = first.slice(0, 7);
  let keys = Array.from({ length: 6 }, (_, i) => shiftKey(cur, i - 6)).filter((k) => k >= firstKey);
  // The month the user started recording in is probably partial.
  if (keys.length > 1 && keys[0] === firstKey && Number(first.slice(8, 10)) > 10) keys = keys.slice(1);
  return keys;
}

/** Upcoming EMI rows per calendar month, from each loan's schedule. */
function emiByMonth(loans: FxLoan[], ref: Date) {
  const byKey = new Map<string, Paise>(), dueNow: { loan: string; date: string; emi: Paise }[] = [];
  let thisMonthTotal = 0;
  const eom = iso(monthEnd(ref)), curKey = ym(ref);
  for (const l of loans) {
    const s = loanSummary(l, l.paid, ref);
    for (const r of s.rows) if (r.date.slice(0, 7) === curKey) thisMonthTotal += r.emi;
    for (const r of s.rows.slice(s.paid)) {
      const k = r.date.slice(0, 7);
      if (k > curKey) byKey.set(k, (byKey.get(k) ?? 0) + r.emi);
      else if (r.date <= eom) dueNow.push({ loan: l.name, date: r.date, emi: r.emi });
    }
  }
  return { byKey, dueNow, thisMonthTotal };
}

const emptyForecast = (reason: string, ref: Date): Forecast => ({
  ready: false, reason, confidence: "low", monthsUsed: 0, headline: "",
  next: { label: keyLabel(shiftKey(ym(ref), 1)), income: 0, variable: 0, emi: 0, expenses: 0, savings: 0, low: 0, high: 0, savingsRate: 0 },
  recurring: { emi: 0, housing: 0, bills: 0, subscriptions: 0, total: 0, debtsDue: 0 },
  nextCategories: [],
  thisMonth: { label: keyLabel(ym(ref)), daysElapsed: ref.getDate(), daysLeft: 0, daysInMonth: monthEnd(ref).getDate(), incomeSoFar: 0, spentSoFar: 0, expectedIncome: 0, remainingEmi: 0, remainingVariable: 0, remainingDebts: 0, availableNow: 0, endCash: 0, categories: [], monthIncome: 0, monthVariable: 0, monthEmi: 0, surplus: 0 },
  projection: { start: 0, months: [], total: 0, end: 0 }, goals: [], warnings: [], history: [],
});

export function buildForecast(input: FxInput): Forecast {
  const { tx, accounts, loans, debts, goals, budgets, ref } = input;
  const keys = historyKeys(tx, ref);
  if (!keys.length) return emptyForecast("Add your income and spending for at least one full month and a forecast appears here.", ref);

  const stats = monthStats(tx, keys);
  const used = stats.slice(-3);
  const hasData = used.some((s) => s.income > 0 || s.variable > 0 || s.emi > 0);
  if (!hasData) return emptyForecast("There is no income or spending in your recent full months yet.", ref);

  const confidence: Confidence = keys.length >= 6 ? "high" : keys.length >= 3 ? "medium" : "low";
  const curKey = ym(ref), nextKey = shiftKey(curKey, 1);

  // ── what a normal month looks like ──
  const incomeEst = round100(weighted(used.map((s) => s.income)));
  const cats = new Set(used.flatMap((s) => Object.keys(s.byCat)));
  const usual: Record<string, Paise> = {};
  for (const c of cats) usual[c] = round100(weighted(used.map((s) => s.byCat[c] ?? 0)));
  const variableEst = sum(Object.values(usual));

  const { byKey: emiMonths, dueNow, thisMonthTotal } = emiByMonth(loans, ref);
  const hasLoans = loans.length > 0;
  const emiTxEst = round100(weighted(used.map((s) => s.emi)));
  const emiFor = (key: string) => (hasLoans ? emiMonths.get(key) ?? 0 : emiTxEst);

  const emiNext = emiFor(nextKey);
  const savingsNext = incomeEst - variableEst - emiNext;
  const netHistory = stats.map((s) => s.income - s.variable - s.emi);
  const sd = netHistory.length >= 3 ? stdev(netHistory) : Math.abs(savingsNext) * 0.15 + incomeEst * 0.03;
  const band = round100(Math.min(sd, Math.max(incomeEst * 0.4, 0)));
  const next = {
    label: keyLabel(nextKey), income: incomeEst, variable: variableEst, emi: emiNext, expenses: variableEst + emiNext,
    savings: savingsNext, low: savingsNext - band, high: savingsNext + band, savingsRate: incomeEst > 0 ? savingsNext / incomeEst : 0,
  };

  // ── recurring bills and obligations next month ──
  const nextStart = iso(parseISO(`${nextKey}-01`)), nextEnd = iso(monthEnd(parseISO(`${nextKey}-01`)));
  const debtsDue = sum(debts.filter((d) => d.direction === "borrowed" && d.due_date && d.due_date >= nextStart && d.due_date <= nextEnd).map((d) => debtSummary(d, d.payments, ref).remaining));
  const rec = { emi: emiNext, housing: usual["Housing"] ?? 0, bills: usual["Bills"] ?? 0, subscriptions: usual["Subscriptions"] ?? 0 };
  const recurring = { ...rec, total: rec.emi + rec.housing + rec.bills + rec.subscriptions, debtsDue };

  // ── this month so far, and where it is heading ──
  const dim = monthEnd(ref).getDate(), daysElapsed = ref.getDate(), daysLeft = dim - daysElapsed;
  const f = daysElapsed / dim;
  const curStart = `${curKey}-01`, today = iso(ref);
  const spentCat: Record<string, Paise> = {};
  let incomeSoFar = 0, spentSoFar = 0;
  for (const t of tx) {
    if (t.type === "transfer" || t.occurred_on < curStart || t.occurred_on > today) continue;
    if (t.type === "income") { incomeSoFar += t.amount; continue; }
    if (isEmiTx(t)) continue;
    const c = t.category || "Other";
    spentCat[c] = (spentCat[c] ?? 0) + t.amount; spentSoFar += t.amount;
  }
  const budgetOf = (c: string) => budgets.find((b) => b.category === c)?.amount ?? null;
  const names = new Set([...Object.keys(spentCat), ...Object.keys(usual)]);
  const categories: CategoryPace[] = [...names].map((name) => {
    const spent = spentCat[name] ?? 0, u = usual[name] ?? 0;
    let projected: number;
    if (FIXED_LIKE.has(name)) projected = Math.max(spent, u);
    else if (u === 0) projected = f >= 0.15 ? Math.max(spent, spent / f) : spent;
    else {
      const w = f < 0.15 ? 0 : Math.min(1, f / 0.5) * 0.6;
      projected = Math.max(spent, w * (spent / f) + (1 - w) * u);
    }
    projected = round100(projected);
    const budget = budgetOf(name), ref2 = budget ?? u;
    const status = ref2 > 0 && projected > ref2 * 1.1 ? "over" : ref2 > 0 && projected > ref2 * 0.95 ? "watch" : "on";
    return { name, spent, usual: u, projected, budget, status } as CategoryPace;
  }).filter((c) => c.spent > 0 || c.usual > 0).sort((a, b) => b.projected - a.projected);

  const remainingVariable = sum(categories.map((c) => Math.max(0, c.projected - c.spent)));
  const remainingEmi = sum(dueNow.map((d) => d.emi)) + (hasLoans ? 0 : Math.max(0, emiTxEst - sum(tx.filter((t) => t.type === "expense" && isEmiTx(t) && t.occurred_on >= curStart && t.occurred_on <= today).map((t) => t.amount))));
  const eomStr = iso(monthEnd(ref));
  const remainingDebts = sum(debts.filter((d) => d.direction === "borrowed" && d.due_date && d.due_date <= eomStr).map((d) => debtSummary(d, d.payments, ref).remaining));
  // Only count income that has not arrived yet if less than half of a usual month's income is in.
  const expectedIncome = incomeEst > 0 && incomeSoFar < incomeEst * 0.5 ? incomeEst - incomeSoFar : 0;
  const availableNow = sum(accounts.filter((a) => a.type !== "savings").map((a) => a.balance));
  const endCash = availableNow + expectedIncome - remainingVariable - remainingEmi - remainingDebts;
  const emiSoFarTx = sum(tx.filter((t) => t.type === "expense" && isEmiTx(t) && t.occurred_on >= curStart && t.occurred_on <= today).map((t) => t.amount));
  const monthIncome = incomeSoFar + expectedIncome, monthVariable = spentSoFar + remainingVariable;
  const monthEmi = hasLoans ? thisMonthTotal : emiSoFarTx + remainingEmi;
  const thisMonth = {
    label: keyLabel(curKey), daysElapsed, daysLeft, daysInMonth: dim, incomeSoFar, spentSoFar, expectedIncome,
    remainingEmi, remainingVariable, remainingDebts, availableNow, endCash, categories,
    monthIncome, monthVariable, monthEmi, surplus: monthIncome - monthVariable - monthEmi,
  };

  // ── next 12 months ──
  const start = sum(accounts.map((a) => a.balance));
  const months: Forecast["projection"]["months"] = [];
  let bal = start;
  for (let k = 1; k <= 12; k++) {
    const key = shiftKey(curKey, k), s = incomeEst - variableEst - emiFor(key);
    bal += s;
    const spread = band * Math.sqrt(k);
    months.push({ label: keyLabel(key, false), savings: s, balance: bal, low: bal - spread, high: bal + spread });
  }
  const projection = { start, months, total: sum(months.map((m) => m.savings)), end: bal };

  // ── goals ──
  const since = iso(addMonths(ref, -3));
  const goalsOut: GoalForecast[] = goals.map((g) => {
    const remaining = Math.max(0, g.target - g.saved);
    const plan = goalPlan(g.target, g.saved, g.target_date, ref);
    const pace = round100(Math.max(0, sum(g.contributions.filter((c) => c.contributed_on >= since).map((c) => c.amount)) / 3));
    const etaMonths = remaining === 0 ? 0 : pace > 0 ? Math.ceil(remaining / pace) : null;
    const etaAtSavings = remaining === 0 ? 0 : savingsNext > 0 ? Math.ceil(remaining / savingsNext) : null;
    const status: GoalForecast["status"] = remaining === 0 ? "reached" : pace === 0 ? "no_pace" : pace >= plan.monthly * 0.95 ? "on_track" : "behind";
    return {
      id: g.id, name: g.name, target: g.target, saved: g.saved, remaining, targetDate: g.target_date, requiredMonthly: plan.monthly, paceMonthly: pace,
      etaMonths, etaDate: etaMonths === null ? null : iso(addMonths(ref, etaMonths)), etaAtSavings, status,
    };
  }).sort((a, b) => (a.targetDate < b.targetDate ? -1 : 1));

  // ── warnings ──
  const warnings: Warning[] = [];
  for (const d of dueNow.filter((x) => x.date < today).slice(0, 3)) {
    warnings.push({ id: `emi-${d.loan}`, level: "high", title: `${d.loan} EMI is overdue`, body: `The ${formatINR(d.emi)} instalment due ${parseISO(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} has not been marked paid. Late payments can add charges and affect your credit score.`, href: "/loans" });
  }
  if (savingsNext < 0) warnings.push({ id: "neg-save", level: "high", title: "You may spend more than you earn next month", body: `Based on your usual pattern, ${next.label} could end about ${formatINR(-savingsNext)} short. Your income is around ${formatINR(incomeEst)} and your usual spending plus EMIs is about ${formatINR(next.expenses)}.`, href: "/recommendations" });
  if (endCash < 0) warnings.push({ id: "eom-neg", level: "high", title: "You may run out of cash before month end", body: `If this month continues as usual, your available cash could fall to about ${formatINR(endCash)} by the end of ${keyLabel(curKey).split(" ")[0]}.`, href: "/accounts" });
  else if (daysLeft > 0 && variableEst > 0 && endCash < variableEst * 0.15) warnings.push({ id: "eom-low", level: "medium", title: "Cash could get tight by month end", body: `You may have only about ${formatINR(endCash)} available by the end of the month if your current spending continues.`, href: "/accounts" });
  const mm = stats.map((s) => s.variable);
  if (mm.length >= 3 && mm[mm.length - 3] > 0) {
    const a = mm[mm.length - 3], c = mm[mm.length - 1], pct = (c - a) / a;
    if (pct >= 0.1 && c >= mm[mm.length - 2]) {
      const proj = savingsNext - Math.round(c * (pct / 2));
      warnings.push({ id: "trend", level: pct >= 0.2 ? "high" : "medium", title: `Your spending is up ${Math.round(pct * 100)}% over three months`, body: `Everyday spending rose from ${formatINR(a)} to ${formatINR(c)} a month. If that continues, your monthly savings could fall to about ${formatINR(proj)}.`, href: "/transactions" });
    }
  } else if (mm.length === 2 && mm[0] > 0 && (mm[1] - mm[0]) / mm[0] >= 0.15) {
    warnings.push({ id: "trend", level: "medium", title: `Spending rose ${Math.round(((mm[1] - mm[0]) / mm[0]) * 100)}% last month`, body: `Everyday spending went from ${formatINR(mm[0])} to ${formatINR(mm[1])}. Keep an eye on it.`, href: "/transactions" });
  }
  for (const c of categories) {
    if (c.budget && c.projected > c.budget && daysLeft > 0) warnings.push({ id: `budget-${c.name}`, level: "medium", title: `${c.name} may go over budget`, body: `At this pace ${c.name} reaches about ${formatINR(c.projected)} this month against your ${formatINR(c.budget)} budget.`, href: "/budgets" });
  }
  const top = categories.find((c) => !FIXED_LIKE.has(c.name) && c.usual >= 100000 && c.projected - c.usual >= Math.max(100000, c.usual * 0.2) && !c.budget);
  if (top && daysLeft > 0) warnings.push({ id: `pace-${top.name}`, level: "low", title: `${top.name} is running above your usual`, body: `Your ${top.name.toLowerCase()} spending is likely to reach about ${formatINR(top.projected)} this month, compared with ${formatINR(top.usual)} in a usual month.`, href: "/transactions" });
  const rank = { high: 0, medium: 1, low: 2 } as const;
  warnings.sort((a, b) => rank[a.level] - rank[b.level]);

  const headline = savingsNext >= 0
    ? `Based on your spending pattern, you may save approximately ${formatINR(savingsNext)} in ${next.label.split(" ")[0]}.`
    : `Based on your spending pattern, ${next.label.split(" ")[0]} could end about ${formatINR(-savingsNext)} short.`;

  const history = stats.map((s) => ({ key: s.key, label: keyLabel(s.key, false), income: s.income, expenses: s.variable + s.emi, savings: s.income - s.variable - s.emi }));
  return {
    ready: true, confidence, monthsUsed: keys.length, headline, next, recurring, nextCategories: Object.entries(usual).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
    thisMonth, projection, goals: goalsOut, warnings, history,
  };
}
