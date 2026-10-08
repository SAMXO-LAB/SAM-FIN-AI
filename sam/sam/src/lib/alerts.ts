/**
 * Smart alerts: specific, dated and actionable, built from the user's own records.
 * Each alert goes away by itself once the thing it describes is resolved.
 */
import { daysBetween, iso, parseISO } from "./dates";
import { debtSummary, loanSummary } from "./finance";
import { formatINR } from "./money";
import type { Forecast, FxInput } from "./forecast";
import { isEmiTx } from "./forecast";
import type { HealthReport } from "./health";

export type AlertLevel = "urgent" | "heads_up" | "tip";
export type AlertKind = "due" | "spend" | "cash" | "lent" | "budget" | "opportunity" | "score" | "unusual";
export interface Alert { id: string; level: AlertLevel; kind: AlertKind; title: string; body: string; href: string; cta: string }

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0; };
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const FIXED_LIKE = new Set(["Housing", "Bills", "Subscriptions", "EMI"]);
const when = (n: number) => (n < 0 ? `${-n} ${-n === 1 ? "day" : "days"} ago` : n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`);
const short = (s: string) => parseISO(s).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const lower = (s: string) => s.toLowerCase();
/** "Car loan" becomes "Car loan EMI", but "Phone on EMI" stays as it is. */
export const emiName = (name: string) => (/\bemis?\b/i.test(name) ? name : `${name} EMI`);

export function buildAlerts(input: FxInput, f: Forecast, health?: HealthReport | null): Alert[] {
  const out: Alert[] = [];
  const { loans, debts, budgets, tx, accounts, ref } = input;
  const day = (s: string) => daysBetween(ref, parseISO(s));
  const todayStr = iso(ref), monthStart = `${todayStr.slice(0, 7)}-01`;
  const available = sum(accounts.filter((a) => a.type !== "savings").map((a) => a.balance));

  // ── EMIs due soon or overdue ──
  for (const l of loans) {
    const s = loanSummary(l, l.paid, ref);
    if (!s.next) continue;
    const n = day(s.next.date), emi = s.next.emi;
    if (n > 7) continue;
    const short$ = available < emi ? ` Your available cash is ${formatINR(available)}, which is less than the EMI, so make sure the money is in your account.` : "";
    if (n < 0) out.push({ id: `emi-${l.id}`, level: "urgent", kind: "due", title: `Your ${formatINR(emi)} ${emiName(l.name)} is overdue`, body: `It was due on ${short(s.next.date)}, ${when(n)}. Pay it as soon as you can to avoid late charges, and mark it as paid once done.${short$}`, href: "/loans", cta: "Open loans" });
    else out.push({ id: `emi-${l.id}`, level: n <= 2 || short$ ? "urgent" : "heads_up", kind: "due", title: `Your ${formatINR(emi)} ${emiName(l.name)} is due ${when(n)}`, body: `Instalment ${s.next.n} of ${l.tenure_months} is due on ${short(s.next.date)}.${short$}`, href: "/loans", cta: "Open loans" });
  }

  // ── money you lent or owe ──
  let lentShown = 0;
  for (const d of debts) {
    const s = debtSummary(d, d.payments, ref);
    if (s.remaining <= 0 || !d.due_date) continue;
    const n = day(d.due_date);
    if (d.direction === "lent") {
      if (n > 3 || lentShown >= 4) continue;
      lentShown++;
      out.push({ id: `lent-${d.id}`, level: n < 0 ? "heads_up" : "tip", kind: "lent", title: n < 0 ? `${d.person} owes you ${formatINR(s.remaining)}, overdue by ${-n} ${-n === 1 ? "day" : "days"}` : `${d.person} is due to repay ${formatINR(s.remaining)} ${when(n)}`, body: n < 0 ? `It was expected on ${short(d.due_date)}. A polite reminder usually does the job.` : `Expected on ${short(d.due_date)}. A friendly reminder a day before helps.`, href: "/lent", cta: "Open money lent" });
    } else if (n <= 7) {
      out.push({ id: `owe-${d.id}`, level: n <= 2 ? "urgent" : "heads_up", kind: "due", title: n < 0 ? `You owe ${d.person} ${formatINR(s.remaining)}, overdue by ${-n} ${-n === 1 ? "day" : "days"}` : `You need to repay ${d.person} ${formatINR(s.remaining)} ${when(n)}`, body: `Due on ${short(d.due_date)}.${available < s.remaining ? ` Your available cash is ${formatINR(available)}.` : ""}`, href: "/borrowed", cta: "Open money borrowed" });
    }
  }

  // ── budgets ──
  const spent: Record<string, number> = {};
  for (const t of tx) if (t.type === "expense" && !isEmiTx(t) && t.occurred_on >= monthStart && t.occurred_on <= todayStr) spent[t.category ?? "Other"] = (spent[t.category ?? "Other"] ?? 0) + t.amount;
  const dim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate(), daysLeft = dim - ref.getDate();
  for (const b of budgets) {
    const sp = spent[b.category] ?? 0, p = b.amount ? sp / b.amount : 0;
    if (p >= 1) out.push({ id: `budget-${b.category}`, level: "heads_up", kind: "budget", title: `You are over your ${lower(b.category)} budget`, body: `You have spent ${formatINR(sp)} against a ${formatINR(b.amount)} budget, ${formatINR(sp - b.amount)} over, with ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left in the month.`, href: "/budgets", cta: "Open budgets" });
    else if (p >= 0.85) out.push({ id: `budget-${b.category}`, level: "heads_up", kind: "budget", title: `Your ${lower(b.category)} budget is ${Math.round(p * 100)}% used`, body: `${formatINR(b.amount - sp)} is left for the next ${daysLeft} ${daysLeft === 1 ? "day" : "days"}, about ${formatINR(Math.floor((b.amount - sp) / Math.max(daysLeft, 1) / 100) * 100)} a day.`, href: "/budgets", cta: "Open budgets" });
  }

  if (f.ready) {
    // ── a category running above its normal average ──
    const hot = f.thisMonth.categories
      .filter((c) => !FIXED_LIKE.has(c.name) && c.usual >= 100000)
      .map((c) => {
        const byPace = f.thisMonth.daysElapsed >= 10 ? (c.projected - c.usual) / c.usual : 0, byNow = f.thisMonth.daysElapsed >= 3 ? (c.spent - c.usual) / c.usual : 0;
        return { c, pct: Math.max(byPace, byNow), already: byNow >= byPace && byNow > 0 };
      })
      .filter((x) => x.pct >= 0.2 && Math.max(x.c.projected, x.c.spent) - x.c.usual >= 100000)
      .sort((a, b) => b.pct - a.pct).slice(0, 3);
    for (const { c, pct, already } of hot) {
      const diff = Math.round((Math.max(c.projected, c.spent) - c.usual) / 100) * 100;
      out.push({ id: `spend-${c.name}`, level: pct >= 0.4 ? "heads_up" : "tip", kind: "spend",
        title: `Your ${lower(c.name)} spending is ${Math.round(pct * 100)}% higher than your normal average`,
        body: `${already ? `You have already spent ${formatINR(c.spent)} this month` : `You have spent ${formatINR(c.spent)} so far and are heading for ${formatINR(c.projected)}`}, against ${formatINR(c.usual)} in a usual month. Staying near your usual keeps about ${formatINR(diff)} in your pocket.`,
        href: "/transactions", cta: "See transactions" });
    }

    // ── warnings from the forecast ──
    for (const w of f.warnings) {
      if (w.id === "eom-neg") out.push({ id: "cash-neg", level: "urgent", kind: "cash", title: w.title, body: w.body, href: w.href ?? "/forecast", cta: "See forecast" });
      else if (w.id === "eom-low") out.push({ id: "cash-low", level: "heads_up", kind: "cash", title: w.title, body: w.body, href: w.href ?? "/forecast", cta: "See forecast" });
      else if (w.id === "neg-save") out.push({ id: "short-next", level: "heads_up", kind: "cash", title: w.title, body: w.body, href: "/forecast", cta: "See forecast" });
      else if (w.id === "trend") out.push({ id: "trend", level: "heads_up", kind: "spend", title: w.title, body: w.body, href: "/forecast", cta: "See forecast" });
    }

    // ── money left over ──
    const surplus = f.thisMonth.surplus;
    if (surplus >= 500000 && f.thisMonth.daysLeft >= 1 && available > 0) {
      const move = Math.min(Math.floor((surplus * 0.6) / 100000) * 100000, Math.floor(available / 100000) * 100000);
      const g = f.goals.filter((x) => x.status === "behind" || x.status === "no_pace").sort((a, b) => (a.targetDate < b.targetDate ? -1 : 1))[0];
      const months = f.next.expenses > 0 ? sum(accounts.map((a) => a.balance)) / f.next.expenses : 99;
      const target = g ? g.name : months < 6 ? "your emergency fund" : "your savings";
      if (move >= 100000) out.push({ id: "unused", level: "tip", kind: "opportunity", title: `You have ${formatINR(Math.round(surplus / 100000) * 100000)} unused this month`, body: `After your usual spending and EMIs, about ${formatINR(surplus)} is left over. Consider moving ${formatINR(move)} toward ${target}${g ? ` (${formatINR(g.remaining)} still to go)` : ""} before it gets spent.`, href: g ? "/goals" : "/accounts", cta: g ? "Open goals" : "Open accounts" });
    }
  }

  // ── a purchase much bigger than usual, in the last 3 days ──
  const recentFrom = iso(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - 2));
  const byCat = new Map<string, number[]>();
  for (const t of tx) if (t.type === "expense" && !isEmiTx(t) && t.occurred_on < recentFrom) byCat.set(t.category ?? "Other", [...(byCat.get(t.category ?? "Other") ?? []), t.amount]);
  let big = 0;
  for (const t of tx.filter((x) => x.type === "expense" && !isEmiTx(x) && x.occurred_on >= recentFrom && x.occurred_on <= todayStr).sort((a, b) => b.amount - a.amount)) {
    const past = byCat.get(t.category ?? "Other") ?? [];
    if (past.length < 5 || FIXED_LIKE.has(t.category ?? "") || big >= 2) continue;
    const typical = median(past);
    if (t.amount >= 200000 && t.amount >= typical * 3) {
      big++;
      out.push({ id: `big-${t.occurred_on}-${t.amount}-${t.category}`, level: "tip", kind: "unusual", title: `A ${formatINR(t.amount)} ${lower(t.category ?? "other")} purchase on ${short(t.occurred_on)} is much larger than usual`, body: `Your typical ${lower(t.category ?? "other")} purchase is about ${formatINR(Math.round(typical / 100) * 100)}. If you did not make it, check your accounts.`, href: "/transactions", cta: "See transactions" });
    }
  }

  // ── the score moved a lot ──
  if (health?.change && health.change.points <= -5) out.push({ id: "score-drop", level: "heads_up", kind: "score", title: `Your Finance Book Score fell ${-health.change.points} points`, body: health.change.summary, href: "/health", cta: "See why" });

  const rank = { urgent: 0, heads_up: 1, tip: 2 } as const;
  const seen = new Set<string>();
  return out.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true))).sort((a, b) => rank[a.level] - rank[b.level]);
}

/** Alerts that need a look: shown as the number on the bell. */
export const alertCount = (alerts: Alert[]) => alerts.filter((a) => a.level !== "tip").length;
