"use client";
import { useMemo, useState } from "react";
import { FieldError, FormDialog } from "@/components/ui/Form";
import { Icon } from "@/components/Icon";
import { ReceiptField } from "./ReceiptField";
import { amortise, goalPlan } from "@/lib/finance";
import { formatINR, paiseToInput, toPaise } from "@/lib/money";
import { addMonths, iso, today } from "@/lib/dates";
import { ACCOUNT_TYPES, CURRENCIES, LOAN_TYPES, PAYMENT_METHODS } from "@/lib/labels";
import type { AccountWithBalance, ActionState, Category, Transaction } from "@/types/db";
import {
  addDebt, addGoal, addLoan, contributeToGoal, recordDebtPayment, recordEmi, saveAccount, saveBudget, saveTransaction,
} from "./actions";

type Trig = { trigger: React.ReactNode; triggerClass?: string; label?: string };
const inv = (s: ActionState, k: string) => (s.fields?.[k] ? true : undefined);

/* ─── transaction ─── */
export function TransactionButton({ accounts, categories, tx, receipts, ...t }: Trig & { accounts: AccountWithBalance[]; categories: Category[]; tx?: Transaction; receipts?: string[] }) {
  return (
    <FormDialog {...t} title={tx ? "Edit transaction" : "New transaction"} action={saveTransaction} submitLabel={tx ? "Save changes" : "Add transaction"}>
      {(s) => <TxFields s={s} accounts={accounts} categories={categories} tx={tx} receipts={receipts} />}
    </FormDialog>
  );
}

function TxFields({ s, accounts, categories, tx, receipts }: { s: ActionState; accounts: AccountWithBalance[]; categories: Category[]; tx?: Transaction; receipts?: string[] }) {
  const [type, setType] = useState<"expense" | "income" | "transfer">(tx?.type ?? "expense");
  const cats = categories.filter((c) => c.kind === (type === "income" ? "income" : "expense") && c.name !== "EMI");
  const defCat = tx?.category_id && cats.some((c) => c.id === tx.category_id) ? tx.category_id : cats[0]?.id;
  if (!accounts.length) return <div className="notice info">Add an account first. Transactions are recorded against a bank account, card or cash.</div>;
  return (
    <>
      {tx && <input type="hidden" name="id" value={tx.id} />}
      <input type="hidden" name="type" value={type} />
      <div className="seg full" role="radiogroup" aria-label="Type">
        {(["expense", "income", "transfer"] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={type === k} className={type === k ? "on" : ""} onClick={() => setType(k)}>{k[0].toUpperCase() + k.slice(1)}</button>
        ))}
      </div>
      <div>
        <div className="amount-wrap"><span className="cur">₹</span>
          <input className="amount-input" name="amount" inputMode="decimal" placeholder="0" defaultValue={paiseToInput(tx?.amount)} autoFocus aria-label="Amount in rupees" autoComplete="off" aria-invalid={inv(s, "amount")} />
        </div>
        <div style={{ textAlign: "center" }}><FieldError state={s} name="amount" /></div>
      </div>
      {type === "transfer" ? (
        <div className="form-grid">
          <div className="field"><label htmlFor="t-from">From</label><select className="select" id="t-from" name="from_account_id" defaultValue={tx?.from_account_id ?? accounts[0]?.id}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          <div className="field"><label htmlFor="t-to">To</label><select className="select" id="t-to" name="to_account_id" defaultValue={tx?.to_account_id ?? accounts[1]?.id ?? accounts[0]?.id}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select><FieldError state={s} name="to_account_id" /></div>
        </div>
      ) : (
        <>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="lbl" style={{ marginBottom: 8 }}>Category</legend>
            <div className="chips" key={type}>
              {cats.map((c) => <label key={c.id} className="chipbtn"><input type="radio" name="category_id" value={c.id} defaultChecked={c.id === defCat} /><Icon name={c.icon} size={15} />{c.name}</label>)}
            </div>
          </fieldset>
          <div className="form-grid">
            <div className="field"><label htmlFor="t-acc">Account</label><select className="select" id="t-acc" name="account_id" defaultValue={tx?.account_id ?? accounts[0]?.id}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div className="field"><label htmlFor="t-pm">Payment method</label><select className="select" id="t-pm" name="payment_method" defaultValue={tx?.payment_method ?? "upi"}>{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
            <div className="field full"><label htmlFor="t-cp">{type === "income" ? "From (payer)" : "Merchant or person"}</label><input className="input" id="t-cp" name="counterparty" defaultValue={tx?.counterparty ?? ""} maxLength={80} placeholder={type === "income" ? "e.g. Your employer" : "e.g. Swiggy"} /></div>
          </div>
        </>
      )}
      <div className="form-grid">
        <div className="field"><label htmlFor="t-date">Date</label><input className="input" type="date" id="t-date" name="occurred_on" defaultValue={tx?.occurred_on ?? iso(today())} required /><FieldError state={s} name="occurred_on" /></div>
        <div className="field"><label htmlFor="t-desc">Description</label><input className="input" id="t-desc" name="description" defaultValue={tx?.description ?? ""} maxLength={120} placeholder="Optional" /></div>
        <div className="field full"><label htmlFor="t-notes">Notes</label><textarea className="input" id="t-notes" name="notes" defaultValue={tx?.notes ?? ""} maxLength={500} placeholder="Optional" /></div>
        <ReceiptField existing={receipts} />
      </div>
    </>
  );
}

/* ─── account ─── */
export function AccountButton({ account, ...t }: Trig & { account?: AccountWithBalance }) {
  return (
    <FormDialog {...t} title={account ? "Edit account" : "Add account"} action={saveAccount} submitLabel={account ? "Save account" : "Add account"}>
      {(s) => (
        <div className="form-grid">
          {account && <input type="hidden" name="id" value={account.id} />}
          <div className="field full"><label htmlFor="a-name">Account name</label><input className="input" id="a-name" name="name" defaultValue={account?.name} maxLength={60} placeholder="e.g. HDFC Salary" autoFocus aria-invalid={inv(s, "name")} /><FieldError state={s} name="name" /></div>
          <div className="field"><label htmlFor="a-inst">Institution</label><input className="input" id="a-inst" name="institution" defaultValue={account?.institution ?? ""} maxLength={60} placeholder="e.g. HDFC Bank" /></div>
          <div className="field"><label htmlFor="a-type">Type</label><select className="select" id="a-type" name="type" defaultValue={account?.type ?? "bank"}>{ACCOUNT_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
          <div className="field"><label htmlFor="a-bal">{account ? "Current balance (₹)" : "Opening balance (₹)"}</label><input className="input num" id="a-bal" name="balance" inputMode="decimal" defaultValue={account ? paiseToInput(account.balance) : ""} placeholder="0" aria-invalid={inv(s, "balance")} /><FieldError state={s} name="balance" /><span className="hint">For a credit card, enter what you owe as a negative number.</span></div>
          <div className="field"><label htmlFor="a-cur">Currency</label><select className="select" id="a-cur" name="currency" defaultValue={account?.currency ?? "INR"}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="field full"><label htmlFor="a-notes">Notes</label><input className="input" id="a-notes" name="notes" defaultValue={account?.notes ?? ""} maxLength={300} placeholder="Optional" /></div>
          <p className="hint full" style={{ margin: 0 }}>Finance Book never asks for your login, password or OTP.</p>
        </div>
      )}
    </FormDialog>
  );
}

/* ─── loan ─── */
export function LoanButton({ accounts, ...t }: Trig & { accounts: AccountWithBalance[] }) {
  return (
    <FormDialog {...t} title="Add loan" action={addLoan} submitLabel="Add loan" wide>
      {(s) => <LoanFields s={s} accounts={accounts} />}
    </FormDialog>
  );
}
function LoanFields({ s, accounts }: { s: ActionState; accounts: AccountWithBalance[] }) {
  const [p, setP] = useState(""); const [r, setR] = useState(""); const [n, setN] = useState(""); const [m, setM] = useState<"reducing" | "flat">("reducing");
  const prev = useMemo(() => {
    const P = toPaise(p), R = Number(r), N = Number(n);
    if (!P || !(R >= 0) || r === "" || !(N >= 1 && N <= 480 && Number.isInteger(N))) return null;
    const a = amortise(P, R, N, iso(today()), m);
    const ti = a.rows.reduce((x, y) => x + y.interest, 0);
    return { emi: a.emi, ti, total: P + ti };
  }, [p, r, n, m]);
  return (
    <div className="form-grid">
      <div className="field"><label htmlFor="l-name">Loan name</label><input className="input" id="l-name" name="name" maxLength={60} placeholder="e.g. Car loan" autoFocus aria-invalid={inv(s, "name")} /><FieldError state={s} name="name" /></div>
      <div className="field"><label htmlFor="l-lender">Lender</label><input className="input" id="l-lender" name="lender" maxLength={60} placeholder="e.g. Axis Bank" /></div>
      <div className="field"><label htmlFor="l-type">Loan type</label><select className="select" id="l-type" name="loan_type">{LOAN_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
      <div className="field"><label htmlFor="l-p">Loan amount (₹)</label><input className="input num" id="l-p" name="principal" inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} placeholder="5,00,000" aria-invalid={inv(s, "principal")} /><FieldError state={s} name="principal" /></div>
      <div className="field"><label htmlFor="l-r">Interest rate (% a year)</label><input className="input num" id="l-r" name="annual_rate" inputMode="decimal" value={r} onChange={(e) => setR(e.target.value)} placeholder="10.5" aria-invalid={inv(s, "annual_rate")} /><FieldError state={s} name="annual_rate" /></div>
      <div className="field"><label htmlFor="l-n">Tenure (months)</label><input className="input num" id="l-n" name="tenure_months" inputMode="numeric" value={n} onChange={(e) => setN(e.target.value)} placeholder="36" aria-invalid={inv(s, "tenure_months")} /><FieldError state={s} name="tenure_months" /></div>
      <div className="field"><label htmlFor="l-it">Interest method</label><select className="select" id="l-it" name="interest_type" value={m} onChange={(e) => setM(e.target.value as "reducing" | "flat")}><option value="reducing">Reducing balance</option><option value="flat">Flat rate</option></select></div>
      <div className="field"><label htmlFor="l-first">First EMI date</label><input className="input" type="date" id="l-first" name="first_emi_date" defaultValue={iso(addMonths(today(), 1))} /><FieldError state={s} name="first_emi_date" /></div>
      <div className="field"><label htmlFor="l-paid">EMIs already paid</label><input className="input num" id="l-paid" name="paid_count" inputMode="numeric" defaultValue="0" /><FieldError state={s} name="paid_count" /></div>
      <div className="field"><label htmlFor="l-fee">Processing fee (₹)</label><input className="input num" id="l-fee" name="processing_fee" inputMode="decimal" placeholder="Optional" /></div>
      <div className="field full"><label htmlFor="l-acc">EMIs are paid from</label><select className="select" id="l-acc" name="account_id" defaultValue={accounts[0]?.id ?? ""}><option value="">Not linked to an account</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      <div className="calcbox full" aria-live="polite">
        <div className="ln"><span>Monthly EMI</span><span>{prev ? formatINR(prev.emi, { decimals: true }) : "—"}</span></div>
        <div className="ln"><span>Total interest</span><span>{prev ? formatINR(prev.ti) : "—"}</span></div>
        <div className="ln tot"><span>Total repayment</span><span>{prev ? formatINR(prev.total) : "—"}</span></div>
      </div>
    </div>
  );
}

export function EmiButton({ loanId, amount, label, accountId, accounts, ...t }: Trig & { loanId: string; amount: number; label: string; accountId: string | null; accounts: AccountWithBalance[] }) {
  return (
    <FormDialog {...t} title={label} action={recordEmi} submitLabel="Record payment">
      {(s) => (
        <>
          <input type="hidden" name="id" value={loanId} />
          <div className="amount-wrap"><span className="cur">₹</span><input className="amount-input" name="amount" inputMode="decimal" defaultValue={paiseToInput(amount)} aria-label="Amount paid" autoFocus /></div>
          <div style={{ textAlign: "center" }}><FieldError state={s} name="amount" /></div>
          <div className="form-grid">
            <div className="field"><label htmlFor="e-date">Paid on</label><input className="input" type="date" id="e-date" name="paid_on" defaultValue={iso(today())} /></div>
            <div className="field"><label htmlFor="e-acc">Paid from</label><select className="select" id="e-acc" name="account_id" defaultValue={accountId ?? ""}><option value="">Don’t record a transaction</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          </div>
        </>
      )}
    </FormDialog>
  );
}

/* ─── lent / borrowed ─── */
export function DebtButton({ direction, ...t }: Trig & { direction: "lent" | "borrowed" }) {
  const L = direction === "lent";
  return (
    <FormDialog {...t} title={L ? "Record money lent" : "Record money borrowed"} action={addDebt} submitLabel="Save">
      {(s) => (
        <div className="form-grid">
          <input type="hidden" name="direction" value={direction} />
          <div className="field full"><label htmlFor="d-name">{L ? "Who did you lend to?" : "Who did you borrow from?"}</label><input className="input" id="d-name" name="person_name" maxLength={80} placeholder="Full name" autoFocus aria-invalid={inv(s, "person_name")} /><FieldError state={s} name="person_name" /></div>
          <div className="field"><label htmlFor="d-amt">Amount (₹)</label><input className="input num" id="d-amt" name="amount" inputMode="decimal" placeholder="10,000" aria-invalid={inv(s, "amount")} /><FieldError state={s} name="amount" /></div>
          <div className="field"><label htmlFor="d-int">Interest (% of amount, optional)</label><input className="input num" id="d-int" name="interest_pct" inputMode="decimal" placeholder="0" /><FieldError state={s} name="interest_pct" /></div>
          <div className="field"><label htmlFor="d-start">{L ? "Date given" : "Date borrowed"}</label><input className="input" type="date" id="d-start" name="start_date" defaultValue={iso(today())} /></div>
          <div className="field"><label htmlFor="d-due">{L ? "Expected back by" : "Due date"}</label><input className="input" type="date" id="d-due" name="due_date" defaultValue={iso(addMonths(today(), 1))} /><FieldError state={s} name="due_date" /></div>
          <div className="field full"><label htmlFor="d-contact">Phone or email (optional)</label><input className="input" id="d-contact" name="contact" maxLength={120} /></div>
          <div className="field full"><label htmlFor="d-notes">What was it for?</label><input className="input" id="d-notes" name="notes" maxLength={300} placeholder="Optional" /></div>
        </div>
      )}
    </FormDialog>
  );
}

export function RepayButton({ debtId, remaining, title, ...t }: Trig & { debtId: string; remaining: number; title: string }) {
  return (
    <FormDialog {...t} title={title} action={recordDebtPayment} submitLabel="Record repayment">
      {(s) => (
        <>
          <input type="hidden" name="id" value={debtId} />
          <p className="small muted" style={{ margin: 0, textAlign: "center" }}>{formatINR(remaining)} outstanding</p>
          <div className="amount-wrap"><span className="cur">₹</span><input className="amount-input" name="amount" inputMode="decimal" defaultValue={paiseToInput(remaining)} aria-label="Amount repaid" autoFocus /></div>
          <div style={{ textAlign: "center" }}><FieldError state={s} name="amount" /></div>
          <div className="field"><label htmlFor="r-date">Date</label><input className="input" type="date" id="r-date" name="paid_on" defaultValue={iso(today())} /></div>
        </>
      )}
    </FormDialog>
  );
}

/* ─── budget ─── */
export function BudgetButton({ categories, current, ...t }: Trig & { categories: Category[]; current?: { category_id: string; amount: number; name: string } }) {
  return (
    <FormDialog {...t} title={current ? `Edit ${current.name} budget` : "Set a budget"} action={saveBudget} submitLabel="Save budget">
      {(s) => (
        <>
          {current ? <input type="hidden" name="category_id" value={current.category_id} /> : (
            <div className="field"><label htmlFor="b-cat">Category</label>
              <select className="select" id="b-cat" name="category_id">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </div>
          )}
          <div className="amount-wrap"><span className="cur">₹</span><input className="amount-input" name="amount" inputMode="decimal" defaultValue={paiseToInput(current?.amount)} placeholder="0" aria-label="Monthly limit" autoFocus={!!current} /></div>
          <div style={{ textAlign: "center" }}><FieldError state={s} name="amount" /></div>
          <p className="hint" style={{ textAlign: "center", margin: 0 }}>Monthly limit, compared with this calendar month’s spending.</p>
        </>
      )}
    </FormDialog>
  );
}

/* ─── goals ─── */
export function GoalButton(t: Trig) {
  return (
    <FormDialog {...t} title="New goal" action={addGoal} submitLabel="Create goal">
      {(s) => <GoalFields s={s} />}
    </FormDialog>
  );
}
function GoalFields({ s }: { s: ActionState }) {
  const [tg, setTg] = useState(""); const [sv, setSv] = useState(""); const [d, setD] = useState(iso(addMonths(today(), 12)));
  const plan = useMemo(() => { const T = toPaise(tg), S = sv ? toPaise(sv) : 0; return T && S !== null && d ? goalPlan(T, S, d) : null; }, [tg, sv, d]);
  return (
    <div className="form-grid">
      <div className="field full"><label htmlFor="g-name">Goal name</label><input className="input" id="g-name" name="name" maxLength={60} placeholder="e.g. Emergency fund" autoFocus aria-invalid={inv(s, "name")} /><FieldError state={s} name="name" /></div>
      <div className="field"><label htmlFor="g-t">Target amount (₹)</label><input className="input num" id="g-t" name="target" inputMode="decimal" value={tg} onChange={(e) => setTg(e.target.value)} placeholder="2,00,000" aria-invalid={inv(s, "target")} /><FieldError state={s} name="target" /></div>
      <div className="field"><label htmlFor="g-s">Saved so far (₹)</label><input className="input num" id="g-s" name="saved" inputMode="decimal" value={sv} onChange={(e) => setSv(e.target.value)} placeholder="0" /><FieldError state={s} name="saved" /></div>
      <div className="field"><label htmlFor="g-d">Target date</label><input className="input" type="date" id="g-d" name="target_date" value={d} onChange={(e) => setD(e.target.value)} min={iso(today())} /><FieldError state={s} name="target_date" /></div>
      <div className="field"><label htmlFor="g-p">Priority</label><select className="select" id="g-p" name="priority" defaultValue="medium"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
      <div className="calcbox full" aria-live="polite">
        <div className="ln"><span>Suggested monthly saving</span><span>{plan ? formatINR(plan.monthly) : "—"}</span></div>
        <div className="ln" style={{ color: "var(--ink-3)" }}><span>{plan ? `${formatINR(plan.remaining)} over ${plan.months} months` : "Enter a target and date"}</span><span>Estimate</span></div>
      </div>
    </div>
  );
}

export function ContributeButton({ goalId, name, ...t }: Trig & { goalId: string; name: string }) {
  return (
    <FormDialog {...t} title={`Add to ${name}`} action={contributeToGoal} submitLabel="Add money">
      {(s) => (
        <>
          <input type="hidden" name="id" value={goalId} />
          <div className="amount-wrap"><span className="cur">₹</span><input className="amount-input" name="amount" inputMode="decimal" placeholder="0" aria-label="Amount" autoFocus /></div>
          <div style={{ textAlign: "center" }}><FieldError state={s} name="amount" /></div>
        </>
      )}
    </FormDialog>
  );
}
