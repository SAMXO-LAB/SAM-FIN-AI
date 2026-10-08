/**
 * Personalised recommendations. Every card is built from the user's own numbers (see forecast.ts) with fixed rules,
 * so each figure can be traced back to their records. These are suggestions, not financial advice.
 */
import { simulatePrepayment } from "./assistant/calc";
import { debtSummary, loanSummary } from "./finance";
import { formatINR } from "./money";
import { parseISO, iso } from "./dates";
import type { Forecast, FxInput } from "./forecast";

export type RecKind = "spend" | "save" | "debt" | "goal" | "lent" | "emi" | "safety" | "good";
export interface Recommendation {
  id: string; priority: "high" | "medium" | "low"; kind: RecKind; title: string; body: string;
  impact?: { label: string; value: string }; /** yearly benefit in paise, used for ordering */ weight: number; href: string; cta: string;
}

const FIXED_LIKE = new Set(["Housing", "Bills", "Subscriptions", "EMI"]);
const pctI = (x: number) => `${Math.round(x * 100)}%`;
const r100 = (p: number) => Math.round(p / 100) * 100;
const shortDate = (s: string) => parseISO(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export function buildRecommendations(input: FxInput, f: Forecast): { ready: boolean; items: Recommendation[] } {
  const out: Recommendation[] = [];
  const { loans, debts, goals, budgets, accounts, ref } = input;
  const liquid = accounts.reduce((s, a) => s + a.balance, 0);
  const income = f.next.income, savings = f.next.savings, rate = f.next.savingsRate;
  const hasMonth = f.ready && income > 0;
  const today = iso(ref);

  // ── overdue EMIs ──
  const overdue = loans.map((l) => ({ l, s: loanSummary(l, l.paid, ref) })).filter((x) => x.s.overdue && x.s.next);
  for (const { l, s } of overdue) {
    out.push({ id: `overdue-${l.id}`, priority: "high", kind: "emi", title: `Clear your overdue ${l.name} EMI`, weight: s.next!.emi * 3,
      body: `The ${formatINR(s.next!.emi)} instalment due ${shortDate(s.next!.date)} has not been marked paid. Paying it first avoids late charges and protects your credit score. If you have already paid, mark it as paid so your forecast stays accurate.`,
      href: "/loans", cta: "Open loans" });
  }

  if (f.ready) {
    // ── spending more than earning ──
    const discretionary = f.thisMonth.categories.filter((c) => !FIXED_LIKE.has(c.name) && c.usual > 0).sort((a, b) => b.usual - a.usual);
    if (hasMonth && savings < 0) {
      const need = -savings, picks = discretionary.slice(0, 2);
      const room = picks.reduce((s, c) => s + c.usual * 0.25, 0);
      const names = picks.map((c) => c.name.toLowerCase()).join(" and ");
      out.push({ id: "overspend", priority: "high", kind: "spend", title: "You are on course to spend more than you earn", weight: need * 12 + 1,
        body: `Your usual month leaves you about ${formatINR(need)} short. ${picks.length ? `Trimming ${names} by a quarter would free about ${formatINR(r100(room))} a month${room >= need ? ", enough to close the gap" : ", which covers part of it"}.` : "Look at which regular expenses can be reduced."}`,
        impact: { label: "Gap to close", value: `${formatINR(need)}/month` }, href: "/transactions", cta: "Review spending" });
    }

    // ── categories running above the usual level this month ──
    const hot = new Set<string>();
    if (f.thisMonth.daysElapsed >= 10) {
      for (const c of discretionary) {
        const diff = c.projected - c.usual;
        if (diff >= Math.max(100000, c.usual * 0.2)) {
          hot.add(c.name);
          const up = diff / c.usual;
          out.push({ id: `hot-${c.name}`, priority: up >= 0.4 && f.thisMonth.daysElapsed >= 15 ? "high" : "medium", kind: "spend", title: `${c.name} spending is ${pctI(up)} above your usual`, weight: diff * 12,
            body: `At this pace your ${c.name.toLowerCase()} spending reaches about ${formatINR(c.projected)} this month, compared with ${formatINR(c.usual)} in a usual month. Getting back to your usual level would keep about ${formatINR(r100(diff))} in your pocket${hasMonth ? ` and lift this month’s savings rate by ${(diff / income * 100).toFixed(1)} points` : ""}.`,
            impact: { label: "This month", value: formatINR(r100(diff)) }, href: "/transactions", cta: "See transactions" });
        }
      }
    }

    // ── the biggest everyday categories ──
    if (hasMonth) {
      let n = 0;
      for (const c of discretionary) {
        if (n >= 2) break;
        if (hot.has(c.name) || c.usual < income * 0.1) continue;
        const cut = r100(c.usual * 0.2), after = (savings + cut) / income;
        out.push({ id: `trim-${c.name}`, priority: rate < 0.2 ? "medium" : "low", kind: "spend", title: `${c.name} is ${pctI(c.usual / income)} of your income`, weight: cut * 12,
          body: `You usually spend about ${formatINR(c.usual)} a month on ${c.name.toLowerCase()}. Bringing that down by a fifth to ${formatINR(c.usual - cut)} would save ${formatINR(cut)} a month, about ${formatINR(cut * 12)} a year, and move your savings rate from ${pctI(Math.max(rate, 0))} to ${pctI(Math.max(after, 0))}.`,
          impact: { label: "Per year", value: formatINR(cut * 12) }, href: "/budgets", cta: "Set a budget" });
        n++;
      }
    }

    // ── savings rate ──
    if (hasMonth && savings >= 0) {
      if (rate < 0.2) {
        const target = 0.2, extra = r100(income * target - savings);
        out.push({ id: "rate-low", priority: "medium", kind: "save", title: `You save ${pctI(rate)} of your income`, weight: extra * 12,
          body: `A common target is 20%. Reaching it means setting aside ${formatINR(extra)} more each month, about ${formatINR(extra * 12)} over a year.`,
          impact: { label: "Per year", value: formatINR(extra * 12) }, href: "/goals", cta: "Create a goal" });
      } else if (rate < 0.3) {
        const extra = r100(income * 0.05);
        out.push({ id: "rate-mid", priority: "low", kind: "save", title: `You save ${pctI(rate)}. Pushing to ${pctI(rate + 0.05)} is within reach`, weight: extra * 12,
          body: `Saving 5 points more of your income is ${formatINR(extra)} a month, or about ${formatINR(extra * 12)} extra over the next year.`,
          impact: { label: "Per year", value: formatINR(extra * 12) }, href: "/goals", cta: "Create a goal" });
      } else {
        out.push({ id: "rate-good", priority: "low", kind: "good", title: `Great: you save ${pctI(rate)} of your income`, weight: 1,
          body: `That is well above the usual 20% target. Give the surplus a job, such as a savings goal or paying down your highest-interest loan, so it does not drift into everyday spending.`,
          href: "/goals", cta: "Create a goal" });
      }
    }

    // ── emergency fund ──
    const monthly = f.next.expenses;
    if (hasMonth && monthly > 0) {
      const months = liquid / monthly;
      if (months < 3) {
        const goal = monthly * 3, gap = Math.max(0, goal - liquid), per = savings > 0 ? savings : 0;
        const eta = per > 0 ? Math.ceil(gap / per) : null;
        out.push({ id: "emergency", priority: months < 1 ? "high" : "medium", kind: "safety", title: `Your balances cover ${months.toFixed(1)} months of expenses`, weight: gap,
          body: `Across your accounts you have ${formatINR(liquid)} against about ${formatINR(monthly)} of monthly spending. Many people aim for 3 to 6 months as a cushion, which for you is ${formatINR(goal)}.${eta ? ` Putting aside your forecast savings of ${formatINR(per)} a month gets you there in about ${plural(eta, "month")}.` : ""}`,
          impact: { label: "Cushion target", value: formatINR(goal) }, href: "/goals", cta: "Create a goal" });
      }
    }

    // ── high-interest debt vs spare cash ──
    const buffer = monthly;
    const surplus = liquid - buffer;
    const costly = loans.map((l) => ({ l, s: loanSummary(l, l.paid, ref), rate: Number(l.annual_rate) })).filter((x) => x.s.next && x.rate >= 12).sort((a, b) => b.rate - a.rate)[0];
    if (hasMonth && costly && surplus > 0) {
      const prepay = Math.min(r100(surplus), costly.s.outstanding);
      if (prepay >= 500000 || prepay >= costly.s.outstanding * 0.25) {
        const sim = costly.l.interest_type === "reducing" ? simulatePrepayment(costly.s.outstanding, costly.rate, costly.s.emi, prepay) : null;
        out.push({ id: `prepay-${costly.l.id}`, priority: costly.rate >= 18 ? "high" : "medium", kind: "debt", title: `Consider prepaying ${costly.l.name} (${costly.rate}% a year)`, weight: sim?.interestSaved ?? prepay * (costly.rate / 100),
          body: `You have ${formatINR(liquid)} in your accounts and ${formatINR(costly.s.outstanding)} still owed on ${costly.l.name} at ${costly.rate}%. After keeping one month of expenses aside, paying ${formatINR(prepay)} now${sim ? ` could save about ${formatINR(sim.interestSaved)} in interest and finish ${plural(sim.monthsSaved, "month")} sooner` : " would reduce the interest you pay"}. Check the lender’s prepayment charges first.`,
          impact: sim ? { label: "Interest saved", value: formatINR(sim.interestSaved) } : undefined, href: "/loans", cta: "Open loans" });
      }
    }

    // ── EMI burden ──
    if (hasMonth && f.next.emi > 0) {
      const share = f.next.emi / income;
      if (share >= 0.3) out.push({ id: "emi-burden", priority: share >= 0.4 ? "high" : "medium", kind: "emi", title: `EMIs take ${pctI(share)} of your income`, weight: f.next.emi,
        body: `Your instalments come to ${formatINR(f.next.emi)} a month against an income of about ${formatINR(income)}. Lenders usually like this to stay under 40%. Avoid new loans for now, and consider prepaying the loan with the highest interest rate first.`,
        impact: { label: "Monthly EMIs", value: formatINR(f.next.emi) }, href: "/loans", cta: "Open loans" });
    }

    // ── no budgets yet ──
    if (hasMonth && budgets.length === 0 && discretionary.length) {
      const top = discretionary.slice(0, 3);
      out.push({ id: "budgets", priority: "low", kind: "spend", title: "Set budgets for your biggest categories", weight: 1,
        body: `You have no budgets yet. Based on your usual months, ${top.map((c) => `${c.name.toLowerCase()} (${formatINR(c.usual)})`).join(", ")} are good places to start. A budget lets Sam warn you before you overspend.`,
        href: "/budgets", cta: "Set a budget" });
    }

    // ── subscriptions ──
    const subs = f.recurring.subscriptions;
    if (hasMonth && subs >= 100000 && subs >= income * 0.03) {
      out.push({ id: "subs", priority: "low", kind: "spend", title: `Subscriptions cost about ${formatINR(subs)} a month`, weight: subs * 3,
        body: `That is ${formatINR(subs * 12)} a year. Cancel any you have not used in the last month; dropping a quarter of them would save about ${formatINR(r100(subs * 3))} a year.`,
        impact: { label: "Per year", value: formatINR(subs * 12) }, href: "/transactions", cta: "Review" });
    }
  }

  // ── goals ──
  const goalRows = (f.ready ? f.goals : []).filter((g) => g.status === "behind" || g.status === "no_pace");
  for (const g of goalRows.slice(0, 2)) {
    const monthsLeft = Math.max(1, Math.round((parseISO(g.targetDate).getTime() - ref.getTime()) / (30.4 * 86_400_000)));
    let body: string;
    if (savings > 0 && g.requiredMonthly <= savings) {
      body = `To reach ${formatINR(g.target)} by ${shortDate(g.targetDate)}, set aside ${formatINR(g.requiredMonthly)} a month. That is ${pctI(g.requiredMonthly / savings)} of the ${formatINR(savings)} you are forecast to save.`;
    } else if (savings > 0) {
      const m = g.etaAtSavings ?? 0;
      body = `You would need ${formatINR(g.requiredMonthly)} a month to reach ${formatINR(g.target)} by ${shortDate(g.targetDate)}, but you save about ${formatINR(savings)}. Even if all of it went to this goal, you would arrive in about ${plural(m, "month")}. Consider moving the date or lowering the target.`;
    } else {
      body = `You would need ${formatINR(g.requiredMonthly)} a month to reach ${formatINR(g.target)} by ${shortDate(g.targetDate)}. Free up some monthly savings first, then add to this goal.`;
    }
    if (g.paceMonthly > 0 && g.etaMonths) body += ` At your current pace of ${formatINR(g.paceMonthly)} a month it takes about ${plural(g.etaMonths, "month")}.`;
    out.push({ id: `goal-${g.id}`, priority: monthsLeft <= 3 ? "high" : "medium", kind: "goal", title: `${g.name}: ${g.status === "no_pace" ? "no savings added yet" : "behind schedule"}`, weight: g.requiredMonthly * 6,
      body, impact: { label: "Needed per month", value: formatINR(g.requiredMonthly) }, href: "/goals", cta: "Open goals" });
  }

  // ── money lent ──
  const lent = debts.filter((d) => d.direction === "lent").map((d) => ({ d, s: debtSummary(d, d.payments, ref) })).filter((x) => x.s.remaining > 0);
  if (lent.length) {
    const total = lent.reduce((a, x) => a + x.s.remaining, 0);
    const late = lent.filter((x) => x.s.status === "Overdue");
    const lateAmt = late.reduce((a, x) => a + x.s.remaining, 0);
    const week = iso(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + 7));
    const soon = lent.filter((x) => x.d.due_date && x.d.due_date >= today && x.d.due_date <= week);
    if (late.length) {
      out.push({ id: "lent-overdue", priority: lateAmt >= 0.25 * Math.max(income, 1) || lateAmt >= 2500000 ? "high" : "medium", kind: "lent", title: `${formatINR(lateAmt)} you lent is overdue`, weight: lateAmt,
        body: `You currently have ${formatINR(total)} lent to ${plural(lent.length, "person").replace("persons", "people")}. ${formatINR(lateAmt)} is overdue from ${late.slice(0, 3).map((x) => x.d.person).join(", ")}${late.length > 3 ? ` and ${late.length - 3} more` : ""}. Consider following up with a polite reminder.`,
        impact: { label: "Overdue", value: formatINR(lateAmt) }, href: "/lent", cta: "Open money lent" });
    } else if (soon.length) {
      const amt = soon.reduce((a, x) => a + x.s.remaining, 0);
      out.push({ id: "lent-soon", priority: "low", kind: "lent", title: `${formatINR(amt)} is due back to you this week`, weight: amt / 10,
        body: `${soon.map((x) => x.d.person).slice(0, 3).join(", ")} ${soon.length === 1 ? "is" : "are"} due to repay within 7 days. A friendly reminder a day or two before helps.`, href: "/lent", cta: "Open money lent" });
    }
  }

  if (!out.length && f.ready) out.push({ id: "steady", priority: "low", kind: "good", title: "Nothing needs attention right now", weight: 0, body: "Your spending, savings and repayments look steady. Keep recording transactions and these recommendations will sharpen as your history grows.", href: "/forecast", cta: "See forecast" });

  const rank = { high: 0, medium: 1, low: 2 } as const;
  out.sort((a, b) => rank[a.priority] - rank[b.priority] || b.weight - a.weight);
  return { ready: f.ready, items: out.slice(0, 10) };
}

