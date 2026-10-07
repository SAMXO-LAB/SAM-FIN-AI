import "server-only";
import { getTimezone } from "../auth";
import { getAccounts, getBudgets, getCategories, getDebts, getGoals, getLoans, getTransactions } from "../data";
import { addDays, fmtDate, iso, parseISO, today } from "../dates";
import { debtSummary, goalPlan, loanSummary, sumRange } from "../finance";
import { formatINR, toPaise, type Paise } from "../money";
import { emiQuote, groupTotals, rupees, simulatePrepayment } from "./calc";

/** Read-only tools. Each runs as the signed-in user, so Row Level Security limits every result to their own records. */
export const TOOLS = [
  { name: "get_overview", description: "Snapshot of the user's finances: account balances, net worth and what it is made of, income and spending for the last 30 days (with the 30 days before for comparison), monthly EMIs, money owed to and by the user. Start here for broad questions.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "get_transactions", description: "List the user's recorded transactions with optional filters. Returns exact totals over ALL matches plus up to `limit` rows. Use for questions about specific merchants, categories, accounts or dates.", input_schema: { type: "object", properties: {
    from: { type: "string", description: "Start date YYYY-MM-DD (default: 90 days ago)" }, to: { type: "string", description: "End date YYYY-MM-DD (default: today)" },
    type: { type: "string", enum: ["income", "expense", "transfer"] }, category: { type: "string", description: "Category name (partial match ok)" }, account: { type: "string", description: "Account name (partial match ok)" },
    search: { type: "string", description: "Text to look for in merchant, description, notes or category" }, min_amount: { type: "number", description: "Rupees" }, max_amount: { type: "number", description: "Rupees" },
    sort: { type: "string", enum: ["newest", "largest"] }, limit: { type: "integer", minimum: 1, maximum: 40 } }, additionalProperties: false } },
  { name: "spending_summary", description: "Totals of spending (expenses) grouped by category, month, merchant or account for a date range, with each group's share. Optionally compares with the previous period of equal length.", input_schema: { type: "object", properties: {
    from: { type: "string", description: "YYYY-MM-DD (default: 30 days ago)" }, to: { type: "string", description: "YYYY-MM-DD (default: today)" },
    group_by: { type: "string", enum: ["category", "month", "merchant", "account"] }, compare_previous_period: { type: "boolean" } }, required: ["group_by"], additionalProperties: false } },
  { name: "get_loans", description: "The user's loans and EMIs: EMI amount, outstanding balance, instalments paid and left, next due date, interest remaining.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "get_debts", description: "Money the user has lent to people or borrowed from people, with repayments, remaining amounts, due dates and status.", input_schema: { type: "object", properties: { direction: { type: "string", enum: ["lent", "borrowed"] } }, additionalProperties: false } },
  { name: "get_budgets", description: "Monthly budgets per category with this month's spending against each limit.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "get_goals", description: "Savings goals with progress and the suggested monthly saving to reach each by its date.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "calculate_emi", description: "Calculate the EMI, total interest and total payment for a hypothetical loan. Use for what-if questions about a new loan.", input_schema: { type: "object", properties: {
    principal_inr: { type: "number", description: "Loan amount in rupees" }, annual_rate_pct: { type: "number" }, months: { type: "integer", minimum: 1, maximum: 480 }, method: { type: "string", enum: ["reducing", "flat"] } },
    required: ["principal_inr", "annual_rate_pct", "months"], additionalProperties: false } },
  { name: "simulate_prepayment", description: "What happens to one of the user's existing reducing-balance loans if they prepay a lump sum now and keep paying the same EMI: months saved and interest saved.", input_schema: { type: "object", properties: {
    loan: { type: "string", description: "Loan name (partial match ok)" }, prepay_inr: { type: "number", description: "Lump sum in rupees" } }, required: ["loan", "prepay_inr"], additionalProperties: false } },
] as const;

export type ToolName = (typeof TOOLS)[number]["name"];
const KNOWN = new Set<string>(TOOLS.map((t) => t.name));
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const money = (p: Paise) => ({ amount: rupees(p), text: formatINR(p, { decimals: p % 100 !== 0 }) });
const str = (v: unknown, max = 80) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const day = (v: unknown, fallback: string) => { const s = str(v, 10); return DATE.test(s) && !isNaN(parseISO(s).getTime()) ? s : fallback; };
const pctOf = (x: number) => Math.round(x * 1000) / 10;
const MAX_CHARS = 14_000;

export async function runTool(name: string, raw: unknown): Promise<string> {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  try {
    if (!KNOWN.has(name)) return JSON.stringify({ error: "Unknown tool." });
    const out = await dispatch(name as ToolName, input);
    const s = JSON.stringify(out);
    return s.length > MAX_CHARS ? JSON.stringify({ error: "Result too large. Ask for a narrower date range or fewer rows." }) : s;
  } catch {
    return JSON.stringify({ error: "Could not read that data right now." });
  }
}

async function dispatch(name: ToolName, i: Record<string, unknown>) {
  const ref = today(await getTimezone()), t = iso(ref);
  switch (name) {
    case "get_overview": {
      const [accounts, loans, debts, tx, cats] = await Promise.all([getAccounts(), getLoans(), getDebts(), getTransactions({ from: iso(addDays(ref, -59)) }), getCategories()]);
      const cn = new Map(cats.map((c) => [c.id, c.name]));
      let balance = 0, available = 0;
      for (const a of accounts) { balance += a.balance; if (a.type !== "savings") available += a.balance; }
      const ls = loans.map((l) => ({ l, s: loanSummary(l, l.payments.length, ref) }));
      const loanOut = ls.reduce((s, x) => s + x.s.outstanding, 0), emiMonthly = ls.reduce((s, x) => s + (x.s.next ? x.s.emi : 0), 0);
      const ds = debts.map((d) => ({ d, s: debtSummary(d, d.payments, ref) }));
      const owedToYou = ds.filter((x) => x.d.direction === "lent").reduce((s, x) => s + x.s.remaining, 0);
      const youOwe = ds.filter((x) => x.d.direction === "borrowed").reduce((s, x) => s + x.s.remaining, 0);
      const lite = tx.map((x) => ({ type: x.type, amount: x.amount, occurred_on: x.occurred_on, category: cn.get(x.category_id ?? "") ?? null }));
      const c = sumRange(lite, iso(addDays(ref, -29)), t), p = sumRange(lite, iso(addDays(ref, -59)), iso(addDays(ref, -30)));
      return {
        as_of: t, currency: "INR",
        accounts: accounts.map((a) => ({ name: a.name, type: a.type, balance: money(a.balance) })),
        net_worth: money(balance + owedToYou - youOwe - loanOut),
        net_worth_formula: "account balances + owed to you - loans outstanding - borrowed from others",
        parts: { accounts_total: money(balance), available_cash_excluding_savings_accounts: money(available), owed_to_you: money(owedToYou), loans_outstanding: money(loanOut), borrowed_from_others: money(youOwe) },
        last_30_days: { income: money(c.income), expenses: money(c.expense), net: money(c.net), savings_rate_pct: c.income ? pctOf(c.net / c.income) : null },
        previous_30_days: { income: money(p.income), expenses: money(p.expense), net: money(p.net) },
        emis_per_month: money(emiMonthly), active_loans: ls.filter((x) => x.s.next).length,
      };
    }
    case "get_transactions": {
      const from = day(i.from, iso(addDays(ref, -89))), to = day(i.to, t);
      const [tx, cats, accts] = await Promise.all([getTransactions({ from, to }), getCategories(), getAccounts()]);
      const cn = new Map(cats.map((c) => [c.id, c.name])), an = new Map(accts.map((a) => [a.id, a.name]));
      const type = i.type === "income" || i.type === "expense" || i.type === "transfer" ? i.type : null;
      const cat = str(i.category).toLowerCase(), acc = str(i.account).toLowerCase(), q = str(i.search).toLowerCase();
      const min = num(i.min_amount), max = num(i.max_amount);
      const rows = tx.filter((x) => {
        if (type && x.type !== type) return false;
        const cname = cn.get(x.category_id ?? "") ?? "";
        if (cat && !cname.toLowerCase().includes(cat)) return false;
        const aname = an.get(x.account_id ?? x.from_account_id ?? "") ?? "";
        if (acc && !aname.toLowerCase().includes(acc) && !(an.get(x.to_account_id ?? "") ?? "").toLowerCase().includes(acc)) return false;
        if (q && ![x.counterparty, x.description, x.notes, cname].some((v) => (v ?? "").toLowerCase().includes(q))) return false;
        if (min !== null && x.amount < min * 100) return false;
        if (max !== null && x.amount > max * 100) return false;
        return true;
      });
      if (i.sort === "largest") rows.sort((a, b) => b.amount - a.amount);
      const lim = Math.max(1, Math.min(40, Math.round(num(i.limit) ?? 15)));
      const totals = { income: 0, expense: 0, transfer: 0 };
      for (const r of rows) totals[r.type] += r.amount;
      return {
        range: { from, to }, matched: rows.length, showing: Math.min(lim, rows.length),
        totals_of_all_matches: { income: money(totals.income), expenses: money(totals.expense), transfers: money(totals.transfer) },
        rows: rows.slice(0, lim).map((r) => ({
          date: r.occurred_on, type: r.type, amount: rupees(r.amount), category: cn.get(r.category_id ?? "") ?? null,
          account: an.get(r.account_id ?? r.from_account_id ?? "") ?? null, to_account: r.type === "transfer" ? an.get(r.to_account_id ?? "") ?? null : undefined,
          merchant: r.counterparty, description: r.description,
        })),
        note: rows.length > lim ? "More rows matched than shown; totals above cover all matches." : undefined,
      };
    }
    case "spending_summary": {
      const from = day(i.from, iso(addDays(ref, -29))), to = day(i.to, t);
      const by = ["category", "month", "merchant", "account"].includes(String(i.group_by)) ? String(i.group_by) : "category";
      const len = Math.max(1, Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86_400_000) + 1);
      const prevTo = iso(addDays(parseISO(from), -1)), prevFrom = iso(addDays(parseISO(from), -len));
      const [tx, cats, accts] = await Promise.all([getTransactions({ from: i.compare_previous_period ? prevFrom : from, to }), getCategories(), getAccounts()]);
      const cn = new Map(cats.map((c) => [c.id, c.name])), an = new Map(accts.map((a) => [a.id, a.name]));
      const key = (x: (typeof tx)[number]) => by === "category" ? cn.get(x.category_id ?? "") ?? "Uncategorised" : by === "month" ? x.occurred_on.slice(0, 7) : by === "merchant" ? x.counterparty || x.description || "Unspecified" : an.get(x.account_id ?? "") ?? "Unknown";
      const exp = (a: string, b: string) => tx.filter((x) => x.type === "expense" && x.occurred_on >= a && x.occurred_on <= b);
      const cur = groupTotals(exp(from, to), key, (x) => x.amount);
      const total = cur.reduce((s, g) => s + g.total, 0);
      const prev = i.compare_previous_period ? groupTotals(exp(prevFrom, prevTo), key, (x) => x.amount) : null;
      const pm = new Map((prev ?? []).map((g) => [g.name, g.total]));
      return {
        range: { from, to }, group_by: by, total_expenses: money(total),
        groups: cur.slice(0, 25).map((g) => ({ name: g.name, total: money(g.total), share_pct: pctOf(g.share), transactions: g.count,
          ...(prev ? { previous_period: money(pm.get(g.name) ?? 0), change_pct: pm.get(g.name) ? pctOf((g.total - pm.get(g.name)!) / pm.get(g.name)!) : null } : {}) })),
        ...(prev ? { previous_range: { from: prevFrom, to: prevTo }, previous_total_expenses: money(prev.reduce((s, g) => s + g.total, 0)) } : {}),
        note: "Transfers and income are excluded. Only expenses are counted.",
      };
    }
    case "get_loans": {
      const loans = await getLoans();
      return { as_of: t, loans: loans.map((l) => { const s = loanSummary(l, l.payments.length, ref); return {
        name: l.name, lender: l.lender, type: l.loan_type, principal: money(l.principal), annual_rate_pct: Number(l.annual_rate), interest_method: l.interest_type,
        tenure_months: l.tenure_months, emi: money(s.emi), instalments_paid: s.paid, instalments_left: s.remaining, outstanding: money(s.outstanding),
        interest_remaining: money(s.interestLeft), total_interest_over_life: money(s.totalInterest),
        next_emi: s.next ? { date: s.next.date, amount: money(s.next.emi) } : null, overdue: s.overdue };
      }) };
    }
    case "get_debts": {
      const debts = await getDebts();
      const dir = i.direction === "lent" || i.direction === "borrowed" ? i.direction : null;
      return { as_of: t, items: debts.filter((d) => !dir || d.direction === dir).map((d) => { const s = debtSummary(d, d.payments, ref); return {
        person: d.person_name, direction: d.direction, original_amount: money(d.amount), interest_pct: Number(d.interest_pct), total_due: money(s.totalDue),
        repaid: money(s.repaid), remaining: money(s.remaining), status: s.status, lent_or_borrowed_on: d.start_date, due_date: d.due_date }; }) };
    }
    case "get_budgets": {
      const [budgets, cats, tx] = await Promise.all([getBudgets(), getCategories(), getTransactions({ from: iso(new Date(ref.getFullYear(), ref.getMonth(), 1)) })]);
      const cn = new Map(cats.map((c) => [c.id, c.name]));
      const spent = new Map<string, number>();
      for (const x of tx) if (x.type === "expense" && x.category_id) spent.set(x.category_id, (spent.get(x.category_id) ?? 0) + x.amount);
      const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
      return { month: t.slice(0, 7), days_left_in_month: daysInMonth - ref.getDate(), budgets: budgets.map((b) => { const s = spent.get(b.category_id) ?? 0; return {
        category: cn.get(b.category_id) ?? "Unknown", limit: money(b.amount), spent: money(s), remaining: money(Math.max(0, b.amount - s)), over_by: s > b.amount ? money(s - b.amount) : null, used_pct: b.amount ? pctOf(s / b.amount) : null }; }) };
    }
    case "get_goals": {
      const goals = await getGoals();
      return { as_of: t, goals: goals.map((g) => { const p = goalPlan(g.target, g.saved, g.target_date, ref); return {
        name: g.name, priority: g.priority, target: money(g.target), saved: money(g.saved), remaining: money(p.remaining), target_date: g.target_date,
        target_date_text: fmtDate(g.target_date), months_left: p.months, suggested_monthly_saving: money(p.monthly), progress_pct: pctOf(p.progress),
        label: "suggested saving is an estimate" }; }) };
    }
    case "calculate_emi": {
      const P = toPaise(num(i.principal_inr)), r = num(i.annual_rate_pct), n = num(i.months);
      if (!P || r === null || r < 0 || r > 100 || !n || n < 1 || n > 480 || !Number.isInteger(n)) return { error: "Need a positive loan amount, a rate between 0 and 100, and 1 to 480 whole months." };
      const q = emiQuote(P, r, n, i.method === "flat" ? "flat" : "reducing", t);
      return { principal: money(P), annual_rate_pct: r, months: n, method: i.method === "flat" ? "flat" : "reducing", emi: money(q.emi), total_interest: money(q.totalInterest), total_payment: money(q.totalPayment), label: "calculated" };
    }
    case "simulate_prepayment": {
      const loans = await getLoans();
      const name = str(i.loan).toLowerCase(), pre = toPaise(num(i.prepay_inr));
      const l = loans.find((x) => x.name.toLowerCase().includes(name)) ?? (loans.length === 1 && !name ? loans[0] : undefined);
      if (!l) return { error: "No loan matched that name.", loans: loans.map((x) => x.name) };
      if (!pre) return { error: "Need a positive prepayment amount." };
      if (l.interest_type !== "reducing") return { error: "Prepayment simulation is only available for reducing-balance loans." };
      const s = loanSummary(l, l.payments.length, ref);
      if (!s.next) return { error: "That loan is already fully paid." };
      const sim = simulatePrepayment(s.outstanding, Number(l.annual_rate), s.emi, pre);
      if (!sim) return { error: "Could not simulate this loan." };
      return { loan: l.name, outstanding_now: money(s.outstanding), emi: money(s.emi), prepayment: money(Math.min(pre, s.outstanding)),
        without_prepayment: { months_left: sim.base.months, interest_remaining: money(sim.base.interest) },
        with_prepayment: { months_left: sim.after.months, interest_remaining: money(sim.after.interest) },
        months_saved: sim.monthsSaved, interest_saved: money(sim.interestSaved), label: "calculated; ignores prepayment charges or fees the lender may apply" };
    }
  }
}
