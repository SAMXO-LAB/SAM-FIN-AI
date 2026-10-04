import { describe, expect, it } from "vitest";
import { amortise, debtSummary, emiAmount, goalPlan, loanSummary, spendByCategory, sumRange } from "./finance";
import { compactINR, formatINR, toPaise, toSignedPaise } from "./money";
import { addMonths, parseISO } from "./dates";

describe("money parsing", () => {
  it("parses rupees into exact paise", () => {
    expect(toPaise("1,23,456.50")).toBe(12345650);
    expect(toPaise("₹ 500")).toBe(50000);
    expect(toPaise("0.1")).toBe(10);
    expect(toPaise("0.07")).toBe(7);
    expect(toPaise("19.99")).toBe(1999);
  });
  it("rejects invalid input", () => {
    for (const v of ["", "abc", "1.234", "-5", "1e5", null, undefined, "12.3.4"]) expect(toPaise(v)).toBeNull();
  });
  it("supports signed balances", () => {
    expect(toSignedPaise("-2500")).toBe(-250000);
    expect(toSignedPaise("−10.5")).toBe(-1050);
  });
  it("formats Indian grouping", () => {
    expect(formatINR(12345650)).toBe("₹1,23,457");
    expect(formatINR(12345650, { decimals: true })).toBe("₹1,23,456.50");
    expect(formatINR(-50000)).toBe("−₹500");
    expect(compactINR(25000000)).toBe("₹2.5 L");
    expect(compactINR(1500000000)).toBe("₹1.5 Cr");
  });
});

describe("EMI", () => {
  it("matches the standard formula (₹1,80,000 @ 11.25% for 24 months)", () => {
    expect(emiAmount(18000000, 11.25, 24)).toBe(841032);
  });
  it("schedule repays exactly the principal and ends at zero", () => {
    const { rows } = amortise(18000000, 11.25, 24, "2025-06-10");
    expect(rows).toHaveLength(24);
    expect(rows.reduce((s, r) => s + r.principal, 0)).toBe(18000000);
    expect(rows[23].balance).toBe(0);
    expect(rows[1].date).toBe("2025-07-10");
    for (const r of rows) expect(Number.isInteger(r.interest) && Number.isInteger(r.principal)).toBe(true);
  });
  it("handles zero interest", () => {
    const { emi, rows } = amortise(1000000, 0, 3, "2026-01-31");
    expect(emi).toBe(333334);
    expect(rows.reduce((s, r) => s + r.emi, 0)).toBe(1000000);
    expect(rows[1].date).toBe("2026-02-28");
  });
  it("flat-rate interest totals principal × rate × years", () => {
    const { rows } = amortise(1200000, 10, 12, "2026-01-05", "flat");
    expect(rows.reduce((s, r) => s + r.interest, 0)).toBe(120000);
    expect(rows.reduce((s, r) => s + r.principal, 0)).toBe(1200000);
  });
  it("summarises progress and detects overdue instalments", () => {
    const loan = { principal: 18000000, annual_rate: 11.25, tenure_months: 24, first_emi_date: "2025-01-10", interest_type: "reducing" as const };
    const s = loanSummary(loan, 16, parseISO("2026-10-04"));
    expect(s.remaining).toBe(8);
    expect(s.next?.n).toBe(17);
    expect(s.overdue).toBe(true); // instalment 17 was due 10 May 2026
    expect(s.outstanding).toBe(s.rows[15].balance);
  });
});

describe("money lent and borrowed", () => {
  const ref = parseISO("2026-10-04");
  it("tracks partial repayments", () => {
    const s = debtSummary({ direction: "lent", amount: 2500000, interest_pct: 0, due_date: "2026-12-31" }, [{ amount: 1000000 }], ref);
    expect(s.remaining).toBe(1500000);
    expect(s.status).toBe("Partially paid");
  });
  it("marks overdue and paid", () => {
    expect(debtSummary({ direction: "lent", amount: 100, interest_pct: 0, due_date: "2026-09-01" }, [], ref).status).toBe("Overdue");
    expect(debtSummary({ direction: "borrowed", amount: 100, interest_pct: 0, due_date: "2026-09-01" }, [{ amount: 100 }], ref).status).toBe("Paid");
    expect(debtSummary({ direction: "borrowed", amount: 100, interest_pct: 0, due_date: null }, [], ref).status).toBe("Active");
  });
  it("applies simple interest to the amount due", () => {
    expect(debtSummary({ direction: "lent", amount: 1000000, interest_pct: 5, due_date: null }, [], ref).totalDue).toBe(1050000);
  });
});

describe("goals", () => {
  it("₹2,00,000 target, ₹50,000 saved, 12 months → ₹12,500 a month", () => {
    const ref = parseISO("2026-10-04");
    const g = goalPlan(20000000, 5000000, "2027-10-04", ref);
    expect(g.months).toBe(12);
    expect(g.monthly).toBe(1250000);
  });
  it("reached goals need nothing more", () => {
    expect(goalPlan(100, 150, "2027-01-01").monthly).toBe(0);
  });
});

describe("aggregation", () => {
  const tx = [
    { type: "income" as const, amount: 10000000, occurred_on: "2026-09-01" },
    { type: "expense" as const, amount: 30000, occurred_on: "2026-09-02", category: "Food" },
    { type: "expense" as const, amount: 20000, occurred_on: "2026-09-03", category: "Food" },
    { type: "transfer" as const, amount: 99999, occurred_on: "2026-09-03" },
    { type: "expense" as const, amount: 500, occurred_on: "2026-10-01", category: "Transport" },
  ];
  it("ignores transfers in income and spending", () => {
    expect(sumRange(tx, "2026-09-01", "2026-09-30")).toEqual({ income: 10000000, expense: 50000, net: 9950000 });
  });
  it("groups spending by category", () => {
    expect(spendByCategory(tx, "2026-09-01", "2026-10-31")).toEqual({ Food: 50000, Transport: 500 });
  });
  it("addMonths clamps to month end", () => {
    expect(addMonths(parseISO("2026-01-31"), 1).getDate()).toBe(28);
  });
});
