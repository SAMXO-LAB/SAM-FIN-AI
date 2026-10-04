import type { AccountType } from "@/types/db";

export const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string; tone: number }[] = [
  { value: "bank", label: "Bank account", icon: "landmark", tone: 1 },
  { value: "savings", label: "Savings account", icon: "piggy-bank", tone: 6 },
  { value: "cash", label: "Cash", icon: "banknote", tone: 8 },
  { value: "credit_card", label: "Credit card", icon: "credit-card", tone: 3 },
  { value: "wallet", label: "Digital wallet", icon: "smartphone", tone: 2 },
  { value: "other", label: "Other", icon: "wallet", tone: 7 },
];
export const accountType = (t: string) => ACCOUNT_TYPES.find((x) => x.value === t) ?? ACCOUNT_TYPES[5];

export const PAYMENT_METHODS = [
  { value: "upi", label: "UPI" }, { value: "card", label: "Credit card" }, { value: "debit_card", label: "Debit card" },
  { value: "cash", label: "Cash" }, { value: "bank_transfer", label: "Bank transfer" }, { value: "auto_debit", label: "Auto-debit" },
  { value: "other", label: "Other" },
] as const;
export const methodLabel = (v: string | null) => PAYMENT_METHODS.find((m) => m.value === v)?.label ?? "—";

export const LOAN_TYPES = [
  { value: "personal", label: "Personal loan" }, { value: "home", label: "Home loan" }, { value: "vehicle", label: "Vehicle loan" },
  { value: "education", label: "Education loan" }, { value: "consumer", label: "Consumer loan" },
  { value: "credit_card_emi", label: "Credit card EMI" }, { value: "other", label: "Other" },
] as const;
export const loanTypeLabel = (v: string) => LOAN_TYPES.find((m) => m.value === v)?.label ?? "Loan";

export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"] as const;

export const CHART_TONES = 8;
