import "server-only";
import { cache } from "react";
import { getTimezone } from "./auth";
import { getAccounts, getBudgets, getCategories, getDebts, getGoals, getLoans, getTransactions } from "./data";
import { iso, today } from "./dates";
import { buildForecast, type FxInput } from "./forecast";
import { buildAlerts } from "./alerts";
import { buildHealth } from "./health";
import { buildRecommendations } from "./recommendations";

/** Loads the signed-in user's records and builds the forecast and recommendations. Cached for the request. */
export const getInsights = cache(async () => {
  const ref = today(await getTimezone());
  const from = iso(new Date(ref.getFullYear(), ref.getMonth() - 10, 1));
  const [categories, tx, accounts, loans, debts, goals, budgets] = await Promise.all([
    getCategories(), getTransactions({ from }), getAccounts(), getLoans(), getDebts(), getGoals(), getBudgets(),
  ]);
  const cat = new Map(categories.map((c) => [c.id, c.name]));
  const input: FxInput = {
    ref,
    tx: tx.map((t) => ({ type: t.type, amount: t.amount, occurred_on: t.occurred_on, category: t.category_id ? cat.get(t.category_id) ?? null : null, loan_linked: !!t.loan_id })),
    accounts: accounts.map((a) => ({ type: a.type, balance: a.balance })),
    loans: loans.map((l) => ({ id: l.id, name: l.name, principal: l.principal, annual_rate: l.annual_rate, tenure_months: l.tenure_months, first_emi_date: l.first_emi_date, interest_type: l.interest_type, paid: l.payments.length, created: l.first_emi_date, paid_dates: l.payments.map((p) => p.paid_on) })),
    debts: debts.map((d) => ({ id: d.id, direction: d.direction, person: d.person_name, amount: d.amount, interest_pct: d.interest_pct, due_date: d.due_date, start: d.start_date, payments: d.payments.map((p) => ({ amount: p.amount, paid_on: p.paid_on })) })),
    goals: goals.map((g) => ({ id: g.id, created: g.created_at?.slice(0, 10), name: g.name, target: g.target, target_date: g.target_date, saved: g.saved, contributions: g.contributions.map((c) => ({ amount: c.amount, contributed_on: c.contributed_on })) })),
    budgets: budgets.flatMap((b) => { const n = cat.get(b.category_id); return n ? [{ category: n, amount: b.amount }] : []; }),
  };
  const forecast = buildForecast(input);
  const recs = buildRecommendations(input, forecast);
  const health = buildHealth(input);
  const alerts = buildAlerts(input, forecast, health);
  return { input, forecast, recs, health, alerts };
});
