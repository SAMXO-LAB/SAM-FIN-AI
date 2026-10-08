/**
 * Finance Book Score: a 0 to 100 view of financial health built from seven weighted parts.
 * Pure and deterministic. Past scores are rebuilt from the user's own records "as of" an earlier date,
 * which is how we can say why the score changed.
 */
import { addMonths, iso } from "./dates";
import { buildForecast, historyKeys, type Forecast, type FxInput } from "./forecast";
import { debtSummary, loanSummary } from "./finance";
import { formatINR } from "./money";

export type HealthLabel = "Excellent" | "Healthy" | "Fair" | "Needs attention" | "At risk";
export type ComponentId = "savings" | "emergency" | "emi" | "debt" | "spending" | "goals" | "income";

export interface HealthComponent {
  id: ComponentId; name: string; weight: number;
  /** 0 to 100, or null when it cannot be measured yet (it is left out and the others are rescaled). */
  score: number | null;
  /** The measured value in words, for example "22% of income saved". */
  metric: string;
  detail: string;
  improve: string | null;
}
export interface HealthScore {
  ready: boolean; reason?: string;
  score: number; label: HealthLabel; coverage: number; asOf: string;
  components: HealthComponent[];
}
export interface ScoreChange { points: number; summary: string; drivers: { id: ComponentId; name: string; points: number; text: string }[] }
export interface HealthReport {
  now: HealthScore;
  history: { label: string; asOf: string; score: number | null }[];
  change: ScoreChange | null;
  /** Where the next points would come from, biggest first. */
  opportunities: { id: ComponentId; name: string; gain: number; text: string }[];
}

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const FIXED_LIKE = new Set(["Housing", "Bills", "Subscriptions", "EMI"]);

export const WEIGHTS: Record<ComponentId, number> = { savings: 25, emergency: 15, emi: 15, spending: 15, debt: 10, goals: 10, income: 10 };
export const NAMES: Record<ComponentId, string> = { savings: "Savings rate", emergency: "Emergency fund", emi: "EMI burden", spending: "Spending habits", debt: "Debt", goals: "Goal progress", income: "Income stability" };

export function labelFor(score: number): HealthLabel {
  return score >= 85 ? "Excellent" : score >= 70 ? "Healthy" : score >= 55 ? "Fair" : score >= 40 ? "Needs attention" : "At risk";
}

/** Rebuilds what the user's records looked like on an earlier date. */
export function asOf(input: FxInput, ref: Date): FxInput {
  const d = iso(ref);
  const later = input.tx.filter((t) => t.occurred_on > d && t.type !== "transfer");
  const net = sum(later.map((t) => (t.type === "income" ? t.amount : -t.amount)));
  return {
    ref,
    tx: input.tx.filter((t) => t.occurred_on <= d),
    // The total across accounts then = total now minus what came in and went out since.
    accounts: [...input.accounts, { type: "bank", balance: -net }],
    loans: input.loans.filter((l) => !l.created || l.created <= d).map((l) => ({ ...l, paid: l.paid_dates ? l.paid_dates.filter((x) => x <= d).length : l.paid })),
    debts: input.debts.filter((x) => !x.start || x.start <= d).map((x) => ({ ...x, payments: x.payments.filter((p) => !p.paid_on || p.paid_on <= d) })),
    goals: input.goals.filter((g) => !g.created || g.created <= d).map((g) => {
      const afterSum = sum(g.contributions.filter((c) => c.contributed_on > d).map((c) => c.amount));
      return { ...g, saved: g.saved - afterSum, contributions: g.contributions.filter((c) => c.contributed_on <= d) };
    }),
    budgets: input.budgets,
  };
}

export function scoreHealth(input: FxInput, f: Forecast = buildForecast(input)): HealthScore {
  const asOfStr = iso(input.ref);
  if (!f.ready) return { ready: false, reason: f.reason, score: 0, label: "At risk", coverage: 0, asOf: asOfStr, components: [] };
  const { loans, debts, goals, budgets, accounts, ref } = input;
  const income = f.next.income, monthly = f.next.expenses;
  const liquid = sum(accounts.map((a) => a.balance));
  const comps: HealthComponent[] = [];
  const add = (c: HealthComponent) => comps.push(c);

  // 1. Savings rate: 30% of income saved is a full score.
  {
    const rate = income > 0 ? f.next.savingsRate : 0;
    const score = income > 0 ? Math.round(clamp(rate / 0.3) * 100) : 0;
    const need = Math.max(0, Math.round((income * 0.3 - f.next.savings) / 100) * 100);
    add({ id: "savings", name: NAMES.savings, weight: WEIGHTS.savings, score, metric: income > 0 ? `${pct(rate)} of income saved` : "No income recorded",
      detail: income > 0 ? `You are on course to keep ${pct(Math.max(rate, 0))} of your income, about ${formatINR(f.next.savings)} a month. Saving 30% earns the full marks.` : "No income was recorded in your recent months.",
      improve: score < 100 && income > 0 ? `Saving ${formatINR(need)} more each month would reach the 30% mark.` : null });
  }

  // 2. Emergency fund: 6 months of spending is a full score, 3 months is 70.
  if (monthly > 0) {
    const months = liquid / monthly;
    const score = Math.round((months >= 6 ? 1 : months >= 3 ? 0.7 + 0.3 * ((months - 3) / 3) : 0.7 * (Math.max(months, 0) / 3)) * 100);
    add({ id: "emergency", name: NAMES.emergency, weight: WEIGHTS.emergency, score, metric: `${months.toFixed(1)} months of expenses`,
      detail: `Your accounts hold ${formatINR(liquid)}, enough for about ${months.toFixed(1)} months of your usual ${formatINR(monthly)} spending. Aim for 3 to 6 months.`,
      improve: months < 6 ? `Building up to ${formatINR(monthly * 6)} (6 months) would max this out.` : null });
  }

  // 3. EMI burden: under 15% of income is a full score, 50% or more is zero.
  {
    const emi = f.next.emi;
    if (emi === 0) add({ id: "emi", name: NAMES.emi, weight: WEIGHTS.emi, score: null, metric: "No EMIs", detail: "You have no EMIs due next month, so this is left out and the other parts count for more.", improve: null });
    else if (income > 0) {
      const share = emi / income, score = Math.round(clamp((0.5 - share) / 0.35) * 100);
      add({ id: "emi", name: NAMES.emi, weight: WEIGHTS.emi, score, metric: `${pct(share)} of income`,
        detail: `Your EMIs are ${formatINR(emi)} a month, ${pct(share)} of your income. Under 15% is comfortable; over 40% is stretched.`,
        improve: share > 0.15 ? "Avoid new loans and prepay the highest-rate loan when you can." : null });
    }
  }

  // 4. Debt: total owed compared with a year of income, with extra weight on costly loans and anything overdue.
  {
    const live = loans.map((l) => ({ l, s: loanSummary(l, l.paid, ref), rate: Number(l.annual_rate) })).filter((x) => x.s.next);
    const owedLoans = sum(live.map((x) => x.s.outstanding));
    const owedPeople = sum(debts.filter((d) => d.direction === "borrowed").map((d) => debtSummary(d, d.payments, ref).remaining));
    const total = owedLoans + owedPeople;
    const costly = sum(live.filter((x) => x.rate >= 12).map((x) => x.s.outstanding));
    const late = live.filter((x) => x.s.overdue).length + debts.filter((d) => d.direction === "borrowed" && debtSummary(d, d.payments, ref).status === "Overdue").length;
    if (total === 0) add({ id: "debt", name: NAMES.debt, weight: WEIGHTS.debt, score: 100, metric: "Debt free", detail: "You do not owe anything on loans or to people.", improve: null });
    else if (income > 0) {
      const yearly = income * 12, ratio = total / yearly;
      let score = ratio <= 0.5 ? 100 : ratio >= 4 ? 20 : 100 - ((ratio - 0.5) / 3.5) * 80;
      score -= Math.min(30, (costly / yearly) * 100) + late * 15;
      score = Math.round(clamp(score / 100) * 100);
      add({ id: "debt", name: NAMES.debt, weight: WEIGHTS.debt, score, metric: `${formatINR(total)} owed`,
        detail: `You owe ${formatINR(total)}, about ${(ratio * 12).toFixed(1)} months of income.${costly ? ` ${formatINR(costly)} of it costs 12% a year or more.` : ""}${late ? ` ${late} ${late === 1 ? "payment is" : "payments are"} overdue.` : ""}`,
        improve: late ? "Clear the overdue payment first." : costly ? "Pay down the loans that charge 12% or more first." : ratio > 0.5 ? "Prepaying a little each year brings this down." : null });
    }
  }

  // 5. Spending habits: a steady month, no jump across months, budgets respected.
  {
    const penalties: string[] = [];
    let score = 100;
    const mm = f.history.map((h) => h.expenses);
    if (mm.length >= 3 && mm[mm.length - 3] > 0) {
      const g = (mm[mm.length - 1] - mm[mm.length - 3]) / mm[mm.length - 3];
      if (g >= 0.1) { score -= Math.min(40, Math.round(g * 100)); penalties.push(`spending is up ${Math.round(g * 100)}% over three months`); }
    }
    const over = f.thisMonth.categories.filter((c) => c.budget && c.projected > c.budget);
    if (over.length) { score -= Math.min(30, over.length * 12); penalties.push(`${over.map((c) => c.name).slice(0, 2).join(" and ")} ${over.length === 1 ? "is" : "are"} heading over budget`); }
    const hot = f.thisMonth.categories.filter((c) => !FIXED_LIKE.has(c.name) && !c.budget && c.usual >= 100000 && c.projected > c.usual * 1.2 && f.thisMonth.daysElapsed >= 10);
    if (hot.length) { score -= Math.min(24, hot.length * 8); penalties.push(`${hot.map((c) => c.name.toLowerCase()).slice(0, 2).join(" and ")} above your usual`); }
    score = Math.max(0, score);
    add({ id: "spending", name: NAMES.spending, weight: WEIGHTS.spending, score, metric: penalties.length ? penalties[0] : "Steady",
      detail: penalties.length ? `Watch out: ${penalties.join("; ")}.` : "Your spending is steady and in line with your usual months.",
      improve: penalties.length ? "Bring the categories that are running high back to your usual level." : null });
  }

  // 6. Goals: how closely contributions match what each goal needs. Not measured when there are no goals.
  if (f.goals.length) {
    const open = f.goals.filter((g) => g.status !== "reached");
    const parts = f.goals.map((g) => (g.status === "reached" || g.status === "on_track" ? 100 : g.status === "no_pace" ? 25 : Math.round(clamp(g.paceMonthly / Math.max(g.requiredMonthly, 1)) * 100)));
    const score = Math.round(sum(parts) / parts.length);
    const onTrack = f.goals.filter((g) => g.status === "reached" || g.status === "on_track").length;
    add({ id: "goals", name: NAMES.goals, weight: WEIGHTS.goals, score, metric: `${onTrack} of ${f.goals.length} on track`,
      detail: `${onTrack} of your ${f.goals.length} ${f.goals.length === 1 ? "goal is" : "goals are"} on track.${open.some((g) => g.status === "no_pace") ? " Some have had no savings added in the last 3 months." : ""}`,
      improve: onTrack < f.goals.length ? "Add money to the goals that are behind schedule." : null });
  }

  // 7. Income stability: how much monthly income moved. Needs three months.
  {
    const incomes = f.history.map((h) => h.income);
    if (incomes.length >= 3) {
      const mean = sum(incomes) / incomes.length;
      const sd = Math.sqrt(sum(incomes.map((x) => (x - mean) ** 2)) / (incomes.length - 1));
      const cv = mean > 0 ? sd / mean : 1;
      const score = Math.round(clamp((0.5 - cv) / 0.45) * 100);
      add({ id: "income", name: NAMES.income, weight: WEIGHTS.income, score, metric: cv < 0.05 ? "Very steady" : `varies by ${pct(cv)}`,
        detail: cv < 0.05 ? "Your income has been almost the same each month." : `Your monthly income moves by about ${pct(cv)}, so plan around the lower months.`,
        improve: cv >= 0.1 ? "Keep a larger cushion to cover months when income is lower." : null });
    }
  }

  const live = comps.filter((c) => c.score !== null);
  const wsum = sum(live.map((c) => c.weight));
  const total = wsum ? sum(live.map((c) => (c.score as number) * c.weight)) / wsum : 0;
  const score = Math.round(total);
  const ordered = (Object.keys(WEIGHTS) as ComponentId[]).map((id) => comps.find((c) => c.id === id) ?? { id, name: NAMES[id], weight: WEIGHTS[id], score: null, metric: "Not measured yet", detail: id === "goals" ? "Create a savings goal to include this." : "Needs at least 3 full months of history.", improve: null } as HealthComponent);
  return { ready: true, score, label: labelFor(score), coverage: wsum, asOf: asOfStr, components: ordered };
}

function explain(now: HealthScore, prev: HealthScore): ScoreChange {
  // Exact split of the change: parts measured both times count (score change x current weight);
  // a part that is newly measured counts by how far it sits from last month's total.
  const drivers = now.components.flatMap((c) => {
    if (c.score === null) return [];
    const p = prev.components.find((x) => x.id === c.id);
    const share = c.weight / now.coverage;
    if (!p || p.score === null) {
      const points = share * (c.score - prev.score);
      return [{ id: c.id, name: c.name, points: Math.round(points * 10) / 10, text: `${c.name} is now part of your score (${c.score} out of 100)` }];
    }
    const points = share * (c.score - p.score);
    if (Math.abs(points) < 0.5) return [];
    const better = points > 0;
    return [{ id: c.id, name: c.name, points: Math.round(points * 10) / 10,
      text: p.metric === c.metric ? `${c.name} ${better ? "improved" : "slipped"}: ${p.score} → ${c.score} out of 100` : `${c.name} ${better ? "improved" : "slipped"}: ${p.metric} → ${c.metric}` }];
  }).filter((d) => Math.abs(d.points) >= 0.5).sort((a, b) => Math.abs(b.points) - Math.abs(a.points)).slice(0, 4);
  const points = now.score - prev.score;
  let summary: string;
  if (points === 0 && !drivers.length) summary = "Your score is the same as a month ago.";
  else {
    const dir = points > 0 ? "rose" : points < 0 ? "fell" : "held steady";
    const main = drivers.filter((d) => (points >= 0 ? d.points > 0 : d.points < 0)).slice(0, 2).map((d) => d.name.toLowerCase().replace(/\bemi\b/, "EMI"));
    summary = `Your score ${dir}${points ? ` by ${Math.abs(points)} ${Math.abs(points) === 1 ? "point" : "points"}` : ""} since a month ago${main.length ? `, mainly because of ${main.join(" and ")}` : ""}.`;
  }
  return { points, summary, drivers };
}

/** The full report: today's score, the last few months, what changed and where to gain next. */
export function buildHealth(input: FxInput, months = 4): HealthReport {
  const f = buildForecast(input);
  const now = scoreHealth(input, f);
  const history: HealthReport["history"] = [];
  const scores: (HealthScore | null)[] = [];
  for (let i = months - 1; i >= 1; i--) {
    const ref = addMonths(input.ref, -i);
    const past = historyKeys(input.tx.filter((t) => t.occurred_on <= iso(ref)), ref).length ? scoreHealth(asOf(input, ref)) : null;
    const ok = past && past.ready ? past : null;
    scores.push(ok);
    history.push({ label: ref.toLocaleDateString("en-IN", { month: "short" }), asOf: iso(ref), score: ok ? ok.score : null });
  }
  history.push({ label: "Now", asOf: iso(input.ref), score: now.ready ? now.score : null });
  const prev = scores[scores.length - 1] ?? null;
  const change = now.ready && prev ? explain(now, prev) : null;
  const opportunities = now.ready ? now.components
    .filter((c) => c.score !== null && c.score < 90 && c.improve)
    .map((c) => ({ id: c.id, name: c.name, gain: Math.round(((100 - (c.score as number)) * c.weight) / now.coverage), text: c.improve as string }))
    .filter((o) => o.gain >= 1).sort((a, b) => b.gain - a.gain).slice(0, 3) : [];
  return { now, history, change, opportunities };
}

