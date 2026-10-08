import "server-only";
import { cache } from "react";
import { requireUser } from "./auth";
import type { AccountWithBalance, Budget, Category, Debt, DebtPayment, Goal, GoalContribution, Loan, LoanPayment, Transaction } from "@/types/db";

/** All loaders run as the signed-in user; Row Level Security limits results to their own rows. */

export const getAccounts = cache(async (): Promise<AccountWithBalance[]> => {
  const { supabase } = await requireUser();
  const [{ data: accts, error }, { data: bals }] = await Promise.all([
    supabase.from("accounts").select("*").eq("archived", false).order("created_at"),
    supabase.from("account_balances").select("account_id, balance"),
  ]);
  if (error) throw new Error("accounts");
  const m = new Map((bals ?? []).map((b) => [b.account_id as string, Number(b.balance)]));
  return (accts ?? []).map((a) => ({ ...a, opening_balance: Number(a.opening_balance), balance: m.get(a.id) ?? Number(a.opening_balance) }));
});

export const getCategories = cache(async (): Promise<Category[]> => {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("categories").select("*").order("sort").order("name");
  if (error) throw new Error("categories");
  return data as Category[];
});

export async function getTransactions(opts: { from?: string; to?: string; limit?: number } = {}): Promise<Transaction[]> {
  const { supabase } = await requireUser();
  let q = supabase.from("transactions").select("*").order("occurred_on", { ascending: false }).order("created_at", { ascending: false });
  if (opts.from) q = q.gte("occurred_on", opts.from);
  if (opts.to) q = q.lte("occurred_on", opts.to);
  q = q.limit(opts.limit ?? 5000);
  const { data, error } = await q;
  if (error) throw new Error("transactions");
  return (data ?? []).map((t) => ({ ...t, amount: Number(t.amount) })) as Transaction[];
}

export const getLoans = cache(async (): Promise<(Loan & { payments: LoanPayment[] })[]> => {
  const { supabase } = await requireUser();
  const [{ data: loans, error }, { data: pays }] = await Promise.all([
    supabase.from("loans").select("*").order("created_at"),
    supabase.from("loan_payments").select("*").order("installment_no"),
  ]);
  if (error) throw new Error("loans");
  return (loans ?? []).map((l) => ({
    ...l, principal: Number(l.principal), processing_fee: Number(l.processing_fee),
    payments: (pays ?? []).filter((p) => p.loan_id === l.id).map((p) => ({ ...p, amount: Number(p.amount) })),
  }));
});

export const getDebts = cache(async (): Promise<(Debt & { payments: DebtPayment[] })[]> => {
  const { supabase } = await requireUser();
  const [{ data: debts, error }, { data: pays }] = await Promise.all([
    supabase.from("debts").select("*").order("created_at", { ascending: false }),
    supabase.from("debt_payments").select("*").order("paid_on"),
  ]);
  if (error) throw new Error("debts");
  return (debts ?? []).map((d) => ({
    ...d, amount: Number(d.amount),
    payments: (pays ?? []).filter((p) => p.debt_id === d.id).map((p) => ({ ...p, amount: Number(p.amount) })),
  }));
});

export const getBudgets = cache(async (): Promise<Budget[]> => {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("budgets").select("*");
  if (error) throw new Error("budgets");
  return (data ?? []).map((b) => ({ ...b, amount: Number(b.amount) }));
});

export const getGoals = cache(async (): Promise<(Goal & { saved: number; contributions: GoalContribution[] })[]> => {
  const { supabase } = await requireUser();
  const [{ data: goals, error }, { data: cs }] = await Promise.all([
    supabase.from("goals").select("*").order("created_at"),
    supabase.from("goal_contributions").select("*").order("contributed_on"),
  ]);
  if (error) throw new Error("goals");
  return (goals ?? []).map((g) => {
    const contributions = (cs ?? []).filter((c) => c.goal_id === g.id).map((c) => ({ ...c, amount: Number(c.amount) }));
    return { ...g, target: Number(g.target), contributions, saved: contributions.reduce((s, c) => s + c.amount, 0) };
  });
});

/** Receipt image ids per transaction (never the images themselves). Empty if the receipts migration has not been run. */
export async function getReceiptIds(): Promise<Record<string, string[]>> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("transaction_receipts").select("id, transaction_id").order("created_at");
  if (error) return {};
  const out: Record<string, string[]> = {};
  for (const r of data ?? []) (out[r.transaction_id as string] ??= []).push(r.id as string);
  return out;
}
