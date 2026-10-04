"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { loanSummary } from "@/lib/finance";
import { iso, today } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import {
  accountSchema, budgetSchema, contributionSchema, debtSchema, fieldErrors, goalSchema, idSchema, loanSchema,
  parseForm, paymentSchema, transactionSchema,
} from "@/lib/validation";
import type { ActionState } from "@/types/db";

function ok(message: string): ActionState {
  revalidatePath("/", "layout");
  return { ok: true, message, at: Date.now() };
}
function fail(what: string, err?: { code?: string }): ActionState {
  // Log only the error code, never the payload (it contains financial data).
  if (err) console.error(`[sam] ${what} failed`, err.code ?? "unknown");
  return { error: `We couldn’t ${what}. Please try again.` };
}

/* ─── transactions ─── */
export async function saveTransaction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(transactionSchema, fd);
  if (!parsed.success) return fieldErrors(parsed.error);
  const d = parsed.data;
  const row = d.type === "transfer"
    ? { type: d.type, amount: d.amount, occurred_on: d.occurred_on, from_account_id: d.from_account_id, to_account_id: d.to_account_id, account_id: null, category_id: null, counterparty: null, payment_method: "bank_transfer", description: d.description, notes: d.notes }
    : { type: d.type, amount: d.amount, occurred_on: d.occurred_on, account_id: d.account_id, category_id: d.category_id, from_account_id: null, to_account_id: null, counterparty: d.counterparty, payment_method: d.payment_method, description: d.description, notes: d.notes };
  const { supabase } = await requireUser();
  const id = String(fd.get("id") || "");
  const { error } = id ? await supabase.from("transactions").update(row).eq("id", id) : await supabase.from("transactions").insert(row);
  if (error) return fail(id ? "update the transaction" : "add the transaction", error);
  return ok(id ? "Transaction updated" : `${d.type === "income" ? "Income" : d.type === "expense" ? "Expense" : "Transfer"} of ${formatINR(d.amount)} added`);
}

export async function deleteTransaction(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = idSchema.safeParse({ id: fd.get("id") });
  if (!p.success) return { error: "That transaction no longer exists." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("transactions").delete().eq("id", p.data.id);
  if (error) return fail("delete the transaction", error);
  return ok("Transaction deleted");
}

/* ─── accounts ─── */
export async function saveAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(accountSchema, fd);
  if (!parsed.success) return fieldErrors(parsed.error);
  const { balance, ...rest } = parsed.data;
  const { supabase } = await requireUser();
  const id = String(fd.get("id") || "");
  if (id) {
    // Editing: the user enters today's balance; adjust the opening balance so the computed balance matches.
    const [{ data: acc }, { data: bal }] = await Promise.all([
      supabase.from("accounts").select("opening_balance").eq("id", id).single(),
      supabase.from("account_balances").select("balance").eq("account_id", id).single(),
    ]);
    if (!acc || !bal) return { error: "That account no longer exists." };
    const opening = Number(acc.opening_balance) + (balance - Number(bal.balance));
    const { error } = await supabase.from("accounts").update({ ...rest, opening_balance: opening }).eq("id", id);
    if (error) return fail("update the account", error);
    return ok(`${rest.name} updated`);
  }
  const { error } = await supabase.from("accounts").insert({ ...rest, opening_balance: balance });
  if (error) return fail("add the account", error);
  return ok(`${rest.name} added`);
}

export async function deleteAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = idSchema.safeParse({ id: fd.get("id") });
  if (!p.success) return { error: "That account no longer exists." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("accounts").delete().eq("id", p.data.id);
  if (error) return fail("delete the account", error);
  return ok("Account deleted");
}

/* ─── loans & EMIs ─── */
export async function addLoan(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(loanSchema, fd);
  if (!parsed.success) return fieldErrors(parsed.error);
  const { paid_count, ...loan } = parsed.data;
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("loans").insert(loan).select("id").single();
  if (error || !data) return fail("add the loan", error ?? undefined);
  if (paid_count > 0) {
    // Record instalments already paid before the loan was added to Sam Fin AI (no transactions are created for them).
    const s = loanSummary({ ...loan, annual_rate: loan.annual_rate }, 0);
    const rows = s.rows.slice(0, paid_count).map((r) => ({ loan_id: data.id, installment_no: r.n, paid_on: r.date, amount: r.emi }));
    const { error: e2 } = await supabase.from("loan_payments").insert(rows);
    if (e2) return fail("record past EMIs", e2);
  }
  return ok(`${loan.name} added`);
}

export async function recordEmi(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(paymentSchema, fd);
  if (!parsed.success) return fieldErrors(parsed.error);
  const { id, amount, paid_on, account_id } = parsed.data;
  const { supabase } = await requireUser();
  const [{ data: loan }, { count }] = await Promise.all([
    supabase.from("loans").select("*").eq("id", id).single(),
    supabase.from("loan_payments").select("id", { count: "exact", head: true }).eq("loan_id", id),
  ]);
  if (!loan) return { error: "That loan no longer exists." };
  const n = (count ?? 0) + 1;
  if (n > loan.tenure_months) return { error: "All EMIs for this loan are already recorded." };
  let transaction_id: string | null = null;
  if (account_id) {
    const { data: cat } = await supabase.from("categories").select("id").is("user_id", null).eq("kind", "expense").eq("name", "EMI").maybeSingle();
    const { data: tx, error: te } = await supabase.from("transactions").insert({
      type: "expense", amount, occurred_on: paid_on, account_id, category_id: cat?.id ?? null, counterparty: loan.lender,
      description: `${loan.name} EMI ${n}/${loan.tenure_months}`, payment_method: "auto_debit", is_recurring: true, loan_id: loan.id,
    }).select("id").single();
    if (te) return fail("record the EMI", te);
    transaction_id = tx.id;
  }
  const { error } = await supabase.from("loan_payments").insert({ loan_id: id, installment_no: n, paid_on, amount, transaction_id });
  if (error) return fail("record the EMI", error);
  return ok(`EMI ${n} of ${loan.tenure_months} recorded`);
}

export async function deleteLoan(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = idSchema.safeParse({ id: fd.get("id") });
  if (!p.success) return { error: "That loan no longer exists." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("loans").delete().eq("id", p.data.id);
  if (error) return fail("remove the loan", error);
  return ok("Loan removed");
}

/* ─── money lent & borrowed ─── */
export async function addDebt(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(debtSchema, fd);
  if (!parsed.success) return fieldErrors(parsed.error);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("debts").insert(parsed.data);
  if (error) return fail("save the record", error);
  return ok(parsed.data.direction === "lent" ? `Recorded ${formatINR(parsed.data.amount)} lent to ${parsed.data.person_name}` : `Recorded ${formatINR(parsed.data.amount)} borrowed from ${parsed.data.person_name}`);
}

export async function recordDebtPayment(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(paymentSchema, fd);
  if (!parsed.success) return fieldErrors(parsed.error);
  const { id, amount, paid_on } = parsed.data;
  const { supabase } = await requireUser();
  const [{ data: debt }, { data: pays }] = await Promise.all([
    supabase.from("debts").select("amount, interest_pct").eq("id", id).single(),
    supabase.from("debt_payments").select("amount").eq("debt_id", id),
  ]);
  if (!debt) return { error: "That record no longer exists." };
  const due = Math.round(Number(debt.amount) * (1 + Number(debt.interest_pct) / 100));
  const remaining = due - (pays ?? []).reduce((s, p) => s + Number(p.amount), 0);
  if (amount > remaining) return { error: `That’s more than the ${formatINR(remaining)} outstanding.`, fields: { amount: "Too high" } };
  const { error } = await supabase.from("debt_payments").insert({ debt_id: id, amount, paid_on });
  if (error) return fail("record the repayment", error);
  return ok(amount === remaining ? "Fully repaid. Marked as paid." : `${formatINR(amount)} repayment recorded`);
}

export async function deleteDebt(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = idSchema.safeParse({ id: fd.get("id") });
  if (!p.success) return { error: "That record no longer exists." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("debts").delete().eq("id", p.data.id);
  if (error) return fail("delete the record", error);
  return ok("Record deleted");
}

/* ─── budgets ─── */
export async function saveBudget(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(budgetSchema, fd);
  if (!parsed.success) return fieldErrors(parsed.error);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("budgets").upsert({ ...parsed.data, period: "monthly" }, { onConflict: "user_id,category_id,period" });
  if (error) return fail("save the budget", error);
  return ok(`Budget set to ${formatINR(parsed.data.amount)} a month`);
}

export async function deleteBudget(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = idSchema.safeParse({ id: fd.get("id") });
  if (!p.success) return { error: "That budget no longer exists." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("budgets").delete().eq("id", p.data.id);
  if (error) return fail("remove the budget", error);
  return ok("Budget removed");
}

/* ─── goals ─── */
export async function addGoal(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(goalSchema, fd);
  if (!parsed.success) return fieldErrors(parsed.error);
  const { saved, ...goal } = parsed.data;
  if (goal.target_date <= iso(today())) return { error: "Choose a target date in the future.", fields: { target_date: "Must be in the future." } };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("goals").insert(goal).select("id").single();
  if (error || !data) return fail("create the goal", error ?? undefined);
  if (saved > 0) await supabase.from("goal_contributions").insert({ goal_id: data.id, amount: saved });
  return ok(`${goal.name} created`);
}

export async function contributeToGoal(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseForm(contributionSchema, fd);
  if (!parsed.success) return fieldErrors(parsed.error);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("goal_contributions").insert({ goal_id: parsed.data.id, amount: parsed.data.amount });
  if (error) return fail("add to the goal", error);
  return ok(`${formatINR(parsed.data.amount)} added`);
}

export async function deleteGoal(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = idSchema.safeParse({ id: fd.get("id") });
  if (!p.success) return { error: "That goal no longer exists." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("goals").delete().eq("id", p.data.id);
  if (error) return fail("remove the goal", error);
  return ok("Goal removed");
}
