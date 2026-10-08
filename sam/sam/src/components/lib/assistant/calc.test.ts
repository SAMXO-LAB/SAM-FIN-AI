import { describe, expect, it } from "vitest";
import { emiQuote, groupTotals, simulatePrepayment } from "./calc";

describe("assistant maths", () => {
  it("prepayment: ₹1,00,000 at 12%, EMI ₹10,000, prepay ₹25,000 (checked independently)", () => {
    const s = simulatePrepayment(10_000_000, 12, 1_000_000, 2_500_000)!;
    expect(s.base).toEqual({ months: 11, interest: 589_848 });
    expect(s.after).toEqual({ months: 8, interest: 335_756 });
    expect(s.monthsSaved).toBe(3);
    expect(s.interestSaved).toBe(589_848 - 335_756);
  });
  it("prepaying nothing changes nothing; prepaying everything clears the loan", () => {
    const none = simulatePrepayment(5_000_000, 10, 500_000, 0)!;
    expect(none.monthsSaved).toBe(0); expect(none.interestSaved).toBe(0);
    const all = simulatePrepayment(5_000_000, 10, 500_000, 9_999_999_999)!;
    expect(all.after).toEqual({ months: 0, interest: 0 });
  });
  it("returns null when the EMI cannot cover the interest", () => {
    expect(simulatePrepayment(10_000_000, 24, 100_000, 0)).toBeNull();
  });
  it("EMI quote matches the loan maths used elsewhere (₹1,80,000, 11.25%, 24 months = ₹8,410.32)", () => {
    expect(emiQuote(18_000_000, 11.25, 24, "reducing", "2026-11-01").emi).toBe(841_032);
  });
  it("groups totals, shares and counts, largest first", () => {
    const g = groupTotals([{ c: "Food", a: 300 }, { c: "Rent", a: 700 }, { c: "Food", a: 100 }, { c: "", a: 100 }], (x) => x.c, (x) => x.a);
    expect(g.map((x) => x.name)).toEqual(["Rent", "Food", "Uncategorised"]);
    expect(g[1]).toMatchObject({ total: 400, count: 2 });
    expect(g[0].share).toBeCloseTo(700 / 1200, 6);
  });
});
