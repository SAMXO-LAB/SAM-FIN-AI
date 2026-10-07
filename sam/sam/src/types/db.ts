export type AccountType = "bank" | "savings" | "cash" | "credit_card" | "wallet" | "other";
export type TxType = "income" | "expense" | "transfer";

export interface Profile {
  id: string; full_name: string | null; currency: string; country: string | null; income_range: string | null;
  goals: string[]; notify_emi: boolean; notify_bills: boolean; notify_lent: boolean; notify_budget: boolean; onboarded: boolean;
  gender: "male" | "female" | "unspecified"; timezone: string | null; avatar_kind: "default" | "preset" | "photo"; avatar_key: string | null; avatar_updated_at: string | null;
}
export interface Account {
  id: string; name: string; institution: string | null; type: AccountType; opening_balance: number;
  currency: string; notes: string | null; archived: boolean; created_at: string;
}
export interface AccountWithBalance extends Account { balance: number }
export interface Category { id: string; user_id: string | null; name: string; kind: "income" | "expense"; icon: string; sort: number }
export interface Transaction {
  id: string; type: TxType; amount: number; occurred_on: string; category_id: string | null; account_id: string | null;
  from_account_id: string | null; to_account_id: string | null; counterparty: string | null; description: string | null;
  payment_method: string | null; notes: string | null; tags: string[]; is_recurring: boolean; loan_id: string | null; created_at: string;
}
export interface Loan {
  id: string; name: string; lender: string | null; loan_type: string; principal: number; annual_rate: number | string;
  tenure_months: number; first_emi_date: string; processing_fee: number; interest_type: "reducing" | "flat";
  account_id: string | null; notes: string | null;
}
export interface LoanPayment { id: string; loan_id: string; installment_no: number; paid_on: string; amount: number }
export interface Debt {
  id: string; direction: "lent" | "borrowed"; person_name: string; contact: string | null; amount: number;
  interest_pct: number | string; start_date: string; due_date: string | null; notes: string | null; created_at: string;
}
export interface DebtPayment { id: string; debt_id: string; paid_on: string; amount: number; note: string | null }
export interface Budget { id: string; category_id: string; amount: number; period: "monthly" }
export interface Goal { id: string; name: string; target: number; target_date: string; priority: "high" | "medium" | "low"; created_at: string }
export interface GoalContribution { id: string; goal_id: string; amount: number; contributed_on: string }

export type ActionState = { ok?: boolean; error?: string; fields?: Record<string, string>; message?: string; at?: number };
