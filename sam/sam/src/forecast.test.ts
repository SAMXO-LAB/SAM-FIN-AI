import { afterEach, describe, expect, it } from "vitest";
import { buildForecast, historyKeys, type FxInput, type FxTx } from "./forecast";

const R = (n: number) => n * 100; // rupees → paise
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

/** Three full months (Jul–Sep 2026) of the example in the brief: ₹50,000 income, rent 12k, food 6k, shopping 4k, travel 3k, EMI 5k. */
function month(y: number, m: number, extra: Partial<Record<string, number>> = {}): FxTx[] {
  const k = `${y}-${String(m).padStart(2, "0")}`;
  const e = (cat: string, amt: number, day: number): FxTx => ({ type: "expense", amount: R(extra[cat] ?? amt), occurred_on: `${k}-${String(day).padStart(2, "0")}`, category: cat, loan_linked: false });
  return [
    { type: "income", amount: R(50000), occurred_on: `${k}-01`, category: "Salary", loan_linked: false },
    e("Housing", 12000, 2), e("Food", 6000, 10), e("Shopping", 4000, 12), e("Travel", 3000, 20),
    { type: "expense", amount: R(5000), occurred_on: `${k}-05`, category: "EMI", loan_linked: true },
  ];
}
const loan = { id: "l1", name: "Bike loan", principal: R(120000), annual_rate: 0, tenure_months: 24, first_emi_date: "2026-04-05", interest_type: "reducing" as const, paid: 6 };
const base = (over: Partial<FxInput> = {}): FxInput => ({
  tx: [...month(2026, 7), ...month(2026, 8), ...month(2026, 9)],
  accounts: [{ type: "bank", balance: R(40000) }, { type: "savings", balance: R(100000) }],
  loans: [loan], debts: [], goals: [], budgets: [], ref: d(2026, 10, 15), ...over,
});

describe("history", () => {
  it("uses complete months only and drops a partial first month", () => {
    const tx: FxTx[] = [{ type: "income", amount: 1, occurred_on: "2026-08-25", category: null, loan_linked: false }, { type: "income", amount: 1, occurred_on: "2026-09-02", category: null, loan_linked: false }];
    expect(historyKeys(tx, d(2026, 10, 3))).toEqual(["2026-09"]);
    expect(historyKeys([], d(2026, 10, 3))).toEqual([]);
  });
});

describe("next month forecast (the ₹50,000 example)", () => {
  const f = buildForecast(base());
  it("is ready and medium confidence with three months", () => { expect(f.ready).toBe(true); expect(f.confidence).toBe("medium"); expect(f.monthsUsed).toBe(3); });
  it("income − usual spending − EMI = ₹20,000", () => {
    expect(f.next.income).toBe(R(50000));
    expect(f.next.variable).toBe(R(25000));
    expect(f.next.emi).toBe(R(5000));
    expect(f.next.savings).toBe(R(20000));
    expect(f.next.savingsRate).toBeCloseTo(0.4, 5);
    expect(f.headline).toContain("₹20,000");
  });
  it("lists recurring bills and EMIs due next month", () => { expect(f.recurring.emi).toBe(R(5000)); expect(f.recurring.housing).toBe(R(12000)); expect(f.recurring.total).toBe(R(17000)); });
  it("projects 12 months of savings on top of today's balance", () => {
    expect(f.projection.months).toHaveLength(12);
    expect(f.projection.start).toBe(R(140000));
    expect(f.projection.total).toBe(R(20000) * 12);
    expect(f.projection.end).toBe(R(140000) + R(240000));
  });
  it("savings rise when a loan finishes inside the year", () => {
    const ending = { ...loan, first_emi_date: "2025-02-05", paid: 20 }; // last instalment is Jan 2027
    const short = buildForecast(base({ loans: [ending] }));
    expect(short.projection.months[0].savings).toBe(R(20000));
    expect(short.projection.months[11].savings).toBe(R(25000));
    expect(short.projection.total).toBe(R(20000) * 3 + R(25000) * 9);
  });
  it("widens the range as months pass", () => {
    const v = buildForecast(base({ tx: [...month(2026, 7), ...month(2026, 8, { Food: 9000 }), ...month(2026, 9, { Shopping: 1000 })] }));
    expect(v.next.high).toBeGreaterThan(v.next.low);
    const m = v.projection.months;
    expect(m[11].high - m[11].low).toBeGreaterThan(m[0].high - m[0].low);
  });
});

describe("this month", () => {
  it("projects category spend and month-end cash", () => {
    // 15 Oct: salary in, rent paid, food ₹4,000 so far (half-month pace would be ₹8,000 vs usual ₹6,000)
    const tx = [...base().tx, { type: "income" as const, amount: R(50000), occurred_on: "2026-10-01", category: "Salary", loan_linked: false },
      { type: "expense" as const, amount: R(12000), occurred_on: "2026-10-02", category: "Housing", loan_linked: false },
      { type: "expense" as const, amount: R(4000), occurred_on: "2026-10-08", category: "Food", loan_linked: false }];
    const f = buildForecast(base({ tx, loans: [{ ...loan, paid: 6 }] }));
    const food = f.thisMonth.categories.find((c) => c.name === "Food")!;
    expect(food.spent).toBe(R(4000));
    expect(food.usual).toBe(R(6000));
    expect(food.projected).toBeGreaterThan(R(6000));
    expect(food.projected).toBeLessThan(R(8001));
    const rent = f.thisMonth.categories.find((c) => c.name === "Housing")!;
    expect(rent.projected).toBe(R(12000));
    expect(f.thisMonth.expectedIncome).toBe(0); // salary already arrived
    expect(f.thisMonth.remainingEmi).toBe(R(5000)); // Oct instalment (due 5 Oct) not yet marked paid
    expect(f.thisMonth.endCash).toBe(R(40000) - f.thisMonth.remainingVariable - R(5000));
  });
  it("expects salary that has not arrived yet", () => {
    const f = buildForecast(base({ ref: d(2026, 10, 20) }));
    expect(f.thisMonth.expectedIncome).toBe(R(50000));
  });
});

describe("warnings", () => {
  it("flags an overdue EMI", () => {
    const f = buildForecast(base());
    expect(f.warnings.some((w) => w.id.startsWith("emi-") && w.level === "high")).toBe(true);
  });
  it("flags rising spending over three months", () => {
    const tx = [...month(2026, 7), ...month(2026, 8, { Shopping: 6000 }), ...month(2026, 9, { Shopping: 9000, Food: 8000 })];
    const w = buildForecast(base({ tx })).warnings.find((x) => x.id === "trend")!;
    expect(w).toBeTruthy();
    expect(w.title).toMatch(/up \d+% over three months/);
  });
  it("flags a shortfall when spending exceeds income", () => {
    const tx = [...month(2026, 7, { Shopping: 30000 }), ...month(2026, 8, { Shopping: 30000 }), ...month(2026, 9, { Shopping: 30000 })];
    const f = buildForecast(base({ tx }));
    expect(f.next.savings).toBeLessThan(0);
    expect(f.warnings[0].id).toMatch(/emi-|neg-save/);
    expect(f.warnings.some((w) => w.id === "neg-save")).toBe(true);
  });
  it("warns when a budget is on course to be exceeded", () => {
    const tx = [...base().tx, { type: "expense" as const, amount: R(9000), occurred_on: "2026-10-08", category: "Food", loan_linked: false }];
    const f = buildForecast(base({ tx, budgets: [{ category: "Food", amount: R(7000) }] }));
    expect(f.warnings.some((w) => w.id === "budget-Food")).toBe(true);
  });
});

describe("goals", () => {
  it("estimates arrival from recent contributions and from forecast savings", () => {
    const goals = [{ id: "g", name: "Laptop", target: R(200000), target_date: "2027-12-01", saved: R(40000), contributions: [{ amount: R(12000), contributed_on: "2026-09-20" }, { amount: R(12000), contributed_on: "2026-08-20" }, { amount: R(12000), contributed_on: "2026-07-20" }] }];
    const g = buildForecast(base({ goals })).goals[0];
    expect(g.remaining).toBe(R(160000));
    expect(g.paceMonthly).toBe(R(12000));
    expect(g.etaMonths).toBe(14); // 160,000 / 12,000 = 13.3 → 14
    expect(g.etaAtSavings).toBe(8); // 160,000 / 20,000
    expect(["on_track", "behind"]).toContain(g.status);
  });
  it("handles reached goals and goals with no contributions", () => {
    const goals = [
      { id: "a", name: "Done", target: R(1000), target_date: "2027-01-01", saved: R(1000), contributions: [] },
      { id: "b", name: "Idle", target: R(50000), target_date: "2027-01-01", saved: 0, contributions: [] },
    ];
    const out = buildForecast(base({ goals })).goals;
    expect(out.find((g) => g.id === "a")!.status).toBe("reached");
    const idle = out.find((g) => g.id === "b")!;
    expect(idle.status).toBe("no_pace");
    expect(idle.etaMonths).toBeNull();
    expect(idle.etaAtSavings).toBe(3); // 50,000 / 20,000
  });
});

describe("not enough data", () => {
  it("returns a clear reason instead of numbers", () => {
    const f = buildForecast(base({ tx: [] }));
    expect(f.ready).toBe(false);
    expect(f.reason).toBeTruthy();
    expect(f.warnings).toEqual([]);
  });
  it("works with only one full month, as low confidence", () => {
    const f = buildForecast(base({ tx: month(2026, 9) }));
    expect(f.ready).toBe(true);
    expect(f.confidence).toBe("low");
  });
});

afterEach(() => undefined);
