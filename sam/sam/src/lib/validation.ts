import { isValidZone } from "@/lib/countries";
import { z } from "zod";
import { toPaise, toSignedPaise } from "./money";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.");
const optText = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters.`).optional().transform((v) => (v ? v : null));
const amount = (label = "an amount") =>
  z.string().transform((v, ctx) => {
    const p = toPaise(v);
    if (p === null || p <= 0) { ctx.addIssue({ code: "custom", message: `Enter ${label} greater than zero, like 2500 or 2500.50.` }); return z.NEVER; }
    return p;
  });
const uuid = z.string().uuid("Choose an option.");

export const signUpSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").max(72).regex(/[A-Za-z]/, "Include at least one letter.").regex(/\d/, "Include at least one number."),
});
export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
export const emailSchema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email address.") });
export const newPasswordSchema = z.object({
  password: signUpSchema.shape.password,
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don’t match." });

export const timezoneSchema = z.string().trim().max(64).optional().transform((v) => (v && isValidZone(v) ? v : null));
export const genderSchema = z.enum(["male", "female", "unspecified"]).catch("unspecified");

export const onboardingSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your name.").max(80),
  gender: genderSchema,
  currency: z.enum(["INR", "USD", "EUR", "GBP", "AED", "SGD"]),
  country: optText(60),
  timezone: timezoneSchema,
  income_range: optText(40),
  goals: z.array(z.string().max(60)).max(10),
  notify_emi: z.boolean(),
  notify_bills: z.boolean(),
});

export const accountSchema = z.object({
  name: z.string().trim().min(1, "Give the account a name.").max(60),
  institution: optText(60),
  type: z.enum(["bank", "savings", "cash", "credit_card", "wallet", "other"]),
  balance: z.string().transform((v, ctx) => {
    if (!v.trim()) return 0;
    const p = toSignedPaise(v);
    if (p === null) { ctx.addIssue({ code: "custom", message: "Enter the balance as a number, like 25000 or −1200." }); return z.NEVER; }
    return p;
  }),
  currency: z.enum(["INR", "USD", "EUR", "GBP", "AED", "SGD"]),
  notes: optText(300),
});

export const transactionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("expense"), amount: amount(), occurred_on: isoDate, category_id: uuid, account_id: uuid,
    counterparty: optText(80), description: optText(120), notes: optText(500),
    payment_method: z.enum(["upi", "card", "debit_card", "cash", "bank_transfer", "auto_debit", "other"]),
  }),
  z.object({
    type: z.literal("income"), amount: amount(), occurred_on: isoDate, category_id: uuid, account_id: uuid,
    counterparty: optText(80), description: optText(120), notes: optText(500),
    payment_method: z.enum(["upi", "card", "debit_card", "cash", "bank_transfer", "auto_debit", "other"]),
  }),
  z.object({
    type: z.literal("transfer"), amount: amount(), occurred_on: isoDate, from_account_id: uuid, to_account_id: uuid,
    description: optText(120), notes: optText(500),
  }),
]).superRefine((d, ctx) => {
  if (d.type === "transfer" && d.from_account_id === d.to_account_id) ctx.addIssue({ code: "custom", path: ["to_account_id"], message: "Choose two different accounts." });
});

export const loanSchema = z.object({
  name: z.string().trim().min(1, "Name the loan.").max(60),
  lender: optText(60),
  loan_type: z.enum(["personal", "home", "vehicle", "education", "consumer", "credit_card_emi", "other"]),
  principal: amount("the loan amount"),
  annual_rate: z.coerce.number({ invalid_type_error: "Enter the interest rate." }).min(0, "Rate can’t be negative.").max(60, "Enter a rate below 60%."),
  tenure_months: z.coerce.number().int("Use whole months.").min(1, "At least 1 month.").max(480, "At most 480 months."),
  first_emi_date: isoDate,
  paid_count: z.coerce.number().int().min(0).default(0),
  processing_fee: z.string().optional().transform((v, ctx) => {
    if (!v || !v.trim()) return 0;
    const p = toPaise(v); if (p === null) { ctx.addIssue({ code: "custom", message: "Enter a valid fee." }); return z.NEVER; } return p;
  }),
  interest_type: z.enum(["reducing", "flat"]),
  account_id: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
}).refine((d) => d.paid_count <= d.tenure_months, { path: ["paid_count"], message: "EMIs paid can’t exceed the tenure." });

export const debtSchema = z.object({
  direction: z.enum(["lent", "borrowed"]),
  person_name: z.string().trim().min(1, "Enter a name.").max(80),
  contact: optText(120),
  amount: amount(),
  interest_pct: z.string().optional().transform((v, ctx) => {
    if (!v || !v.trim()) return 0; const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 100) { ctx.addIssue({ code: "custom", message: "Interest should be between 0 and 100%." }); return z.NEVER; } return n;
  }),
  start_date: isoDate,
  due_date: z.string().optional().transform((v) => (v ? v : null)),
  notes: optText(300),
}).refine((d) => !d.due_date || d.due_date >= d.start_date, { path: ["due_date"], message: "The due date is before the start date." });

export const paymentSchema = z.object({ id: uuid, amount: amount(), paid_on: isoDate, account_id: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null) });

export const budgetSchema = z.object({ category_id: uuid, amount: amount("a monthly limit") });

export const goalSchema = z.object({
  name: z.string().trim().min(1, "Name your goal.").max(60),
  target: amount("a target"),
  saved: z.string().optional().transform((v, ctx) => {
    if (!v || !v.trim()) return 0; const p = toPaise(v);
    if (p === null) { ctx.addIssue({ code: "custom", message: "Enter how much you’ve saved, or leave it blank." }); return z.NEVER; } return p;
  }),
  target_date: isoDate,
  priority: z.enum(["high", "medium", "low"]),
});
export const contributionSchema = z.object({ id: uuid, amount: amount() });
export const idSchema = z.object({ id: uuid });

/** Turn FormData into a plain object and validate it. */
export function parseForm<T extends z.ZodTypeAny>(schema: T, fd: FormData, extra: Record<string, unknown> = {}) {
  const obj: Record<string, unknown> = {};
  fd.forEach((v, k) => { if (!k.startsWith("$")) obj[k] = typeof v === "string" ? v : ""; });
  return schema.safeParse({ ...obj, ...extra });
}

export function fieldErrors(err: z.ZodError): { error: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  for (const i of err.issues) { const k = String(i.path[0] ?? "form"); if (!fields[k]) fields[k] = i.message; }
  return { error: err.issues[0]?.message ?? "Check the highlighted fields.", fields };
}
