import { describe, expect, it } from "vitest";
import type { FxInput, FxTx } from "./forecast";
import { asOf, buildHealth, labelFor, scoreHealth, WEIGHTS } from "./health";

const R = (n: number) => n * 100;
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

function month(y: number, m: number, cats: Record<string, number>, income = 50000, emi = 0): FxTx[] {
  const k = `${y}-${String(m).padStart(2, "0")}`;
  const out: FxTx[] = [{ type: "income", amount: R(income), occurred_on: `${k}-01`, category: "Salary", loan_linked: false }];
  let day = 2;
  for (const [c, a] of Object.entries(cats)) out.push({ type: "expense", amount: R(a), occurred_on: `${k}-${String(day++).padStart(2, "0")}`, category: c, loan_linked: false });
  if (emi) out.push({ type: "expense", amount: R(emi), occurred_on: `${k}-05`, category: "EMI", loan_linked: true });
  return out;
}
const months = (cats: Record<string, number>, from = 4, to = 9, income = 50000) => Array.from({ length: to - from + 1 }, (_, i) => month(2026, from + i, cats, income)).flat();
const base = (over: Partial<FxInput> = {}): FxInput => ({
  tx: months({ Housing: 12000, Food: 6000, Shopping: 4000 }), accounts: [{ type: "bank", balance: R(150000) }],
  loans: [], debts: [], goals: [], budgets: [], ref: d(2026, 10, 12), ...over,
});

describe("labels", () => {
  it.each([[100, "Excellent"], [85, "Excellent"], [84, "Healthy"], [82, "Healthy"], [70, "Healthy"], [69, "Fair"], [55, "Fair"], [54, "Needs attention"], [40, "Needs attention"], [39, "At risk"], [0, "At risk"]])("%i → %s", (n, l) => expect(labelFor(n)).toBe(l));
  it("weights add up to 100", () => expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100));
});

describe("score", () => {
  it("a saver with no debt and a big cushion scores well", () => {
    const s = scoreHealth(base());
    expect(s.ready).toBe(true);
    expect(s.score).toBeGreaterThanOrEqual(85);
    expect(s.label).toBe("Excellent");
    expect(s.components.find((c) => c.id === "savings")!.score).toBe(100); // saves 56%
    expect(s.components.find((c) => c.id === "debt")!.score).toBe(100);
    expect(s.components.find((c) => c.id === "emi")!.score).toBeNull(); // no EMIs: left out, not rewarded
  });
  it("leaves out parts it cannot measure and rescales the rest", () => {
    const s = scoreHealth(base());
    expect(s.components.find((c) => c.id === "goals")!.score).toBeNull(); // no goals
    expect(s.coverage).toBe(75); // no goals and no EMIs are both left out
    const s2 = scoreHealth(base({ tx: months({ Housing: 12000, Food: 6000 }, 8, 9) })); // two months only
    expect(s2.components.find((c) => c.id === "income")!.score).toBeNull();
  });
  it("a spender with thin savings and a thin cushion scores low", () => {
    const s = scoreHealth(base({ tx: months({ Housing: 15000, Food: 12000, Shopping: 20000, Travel: 2500 }), accounts: [{ type: "bank", balance: R(8000) }] }));
    expect(s.score).toBeLessThan(55);
    expect(s.components.find((c) => c.id === "savings")!.score!).toBeLessThan(10);
    expect(s.components.find((c) => c.id === "emergency")!.score!).toBeLessThan(20);
  });
  it("heavy EMIs lower the EMI score and the total", () => {
    const loan = { id: "x", name: "Big loan", principal: R(240000), annual_rate: 0, tenure_months: 12, first_emi_date: "2026-04-05", interest_type: "reducing" as const, paid: 6 }; // EMI 20,000 = 40%
    const emi = scoreHealth(base({ loans: [loan] })).components.find((c) => c.id === "emi")!;
    expect(emi.score).toBeLessThan(35);
    expect(emi.metric).toBe("40% of income");
  });
  it("costly debt and overdue payments pull the debt score down", () => {
    const card = { id: "c", name: "Card", principal: R(200000), annual_rate: 36, tenure_months: 24, first_emi_date: "2026-04-05", interest_type: "reducing" as const, paid: 5 }; // Oct 5 EMI unpaid → overdue
    const debt = scoreHealth(base({ loans: [card] })).components.find((c) => c.id === "debt")!;
    expect(debt.score!).toBeLessThan(70);
    expect(debt.detail).toContain("overdue");
    expect(debt.improve).toMatch(/overdue/);
  });
  it("scores goals by how well contributions match what is needed", () => {
    const goals = [
      { id: "a", name: "Done", target: R(1000), target_date: "2027-01-01", saved: R(1000), contributions: [] },
      { id: "b", name: "Idle", target: R(60000), target_date: "2027-04-01", saved: 0, contributions: [] },
    ];
    const g = scoreHealth(base({ goals })).components.find((c) => c.id === "goals")!;
    expect(g.score).toBe(Math.round((100 + 25) / 2));
    expect(g.metric).toBe("1 of 2 on track");
  });
  it("steady income scores higher than lumpy income", () => {
    const steady = scoreHealth(base()).components.find((c) => c.id === "income")!.score!;
    const lumpy = scoreHealth(base({ tx: [...months({ Housing: 12000 }, 4, 6, 20000), ...months({ Housing: 12000 }, 7, 9, 80000)] })).components.find((c) => c.id === "income")!.score!;
    expect(steady).toBe(100);
    expect(lumpy).toBeLessThan(steady - 30);
  });
  it("is not ready without a full month", () => {
    const s = scoreHealth(base({ tx: [] }));
    expect(s.ready).toBe(false);
    expect(s.reason).toBeTruthy();
  });
});

describe("as-of rebuilding", () => {
  it("rolls balances and records back to an earlier date", () => {
    const i = base({ goals: [{ id: "g", created: "2026-08-01", name: "G", target: R(50000), target_date: "2027-06-01", saved: R(10000), contributions: [{ amount: R(4000), contributed_on: "2026-06-10" }, { amount: R(6000), contributed_on: "2026-09-25" }] }] });
    const then = asOf(i, d(2026, 9, 12));
    expect(then.tx.every((t) => t.occurred_on <= "2026-09-12")).toBe(true);
    const total = then.accounts.reduce((a, x) => a + x.balance, 0);
    const laterNet = i.tx.filter((t) => t.occurred_on > "2026-09-12").reduce((a, t) => a + (t.type === "income" ? t.amount : -t.amount), 0);
    expect(total).toBe(R(150000) - laterNet);
    expect(then.goals[0].saved).toBe(R(4000));
    expect(asOf(i, d(2026, 7, 1)).goals).toHaveLength(0); // goal did not exist yet
  });
});

describe("why the score changed", () => {
  it("a worsening month shows what slipped, in order of impact", () => {
    // Steady until August; September: shopping explodes and savings fall.
    const tx = [...months({ Housing: 12000, Food: 6000, Shopping: 4000 }, 4, 8), ...month(2026, 9, { Housing: 12000, Food: 9000, Shopping: 30000 })];
    const h = buildHealth(base({ tx, ref: d(2026, 10, 3), accounts: [{ type: "bank", balance: R(60000) }] }));
    expect(h.change).not.toBeNull();
    expect(h.change!.points).toBeLessThan(0);
    expect(h.change!.summary).toMatch(/fell by \d+ points? since a month ago, mainly because of/);
    expect(h.change!.drivers[0].points).toBeLessThan(0);
    expect(h.change!.drivers[0].text).toMatch(/slipped: .* → /);
    const abs = h.change!.drivers.map((x) => Math.abs(x.points));
    expect([...abs].sort((a, b) => b - a)).toEqual(abs);
  });
  it("an improving month says the score rose", () => {
    const tx = [...months({ Housing: 12000, Food: 6000, Shopping: 30000 }, 4, 8), ...month(2026, 9, { Housing: 12000, Food: 6000, Shopping: 3000 })];
    const h = buildHealth(base({ tx, ref: d(2026, 10, 3) }));
    expect(h.change!.points).toBeGreaterThan(0);
    expect(h.change!.summary).toContain("rose");
  });
  it("returns a short history and the biggest opportunities", () => {
    const h = buildHealth(base({ tx: months({ Housing: 15000, Food: 12000, Shopping: 12000 }), accounts: [{ type: "bank", balance: R(20000) }] }));
    expect(h.history).toHaveLength(4);
    expect(h.history[3].label).toBe("Now");
    expect(h.opportunities.length).toBeGreaterThan(0);
    for (let i = 1; i < h.opportunities.length; i++) expect(h.opportunities[i - 1].gain).toBeGreaterThanOrEqual(h.opportunities[i].gain);
  });
  it("has no change to explain when there is no earlier score", () => {
    const h = buildHealth(base({ tx: month(2026, 9, { Housing: 12000 }), ref: d(2026, 10, 3) }));
    expect(h.now.ready).toBe(true);
    expect(h.change).toBeNull();
  });
});

describe("explanation is exact", () => {
  it("does not blame parts that did not change when a new part starts counting", () => {
    // a goal created this month: last month's score had no goal part, so the weights shifted
    const goal = { id: "g", created: "2026-10-02", name: "Trip", target: R(100000), target_date: "2027-10-01", saved: R(5000), contributions: [{ amount: R(5000), contributed_on: "2026-10-03" }] };
    const h = buildHealth(base({ goals: [goal] }));
    expect(h.change).not.toBeNull();
    const ids = h.change!.drivers.map((d) => d.id);
    expect(ids).toContain("goals");
    expect(ids).not.toContain("savings"); // 100 → 100, no real change
    expect(h.change!.drivers.find((d) => d.id === "goals")!.text).toContain("now part of your score");
  });
  it("driver points add up to the score change (within rounding)", () => {
    const h = buildHealth(base({ tx: [...months({ Housing: 12000, Food: 6000 }, 4, 8), ...month(2026, 9, { Housing: 12000, Food: 14000, Shopping: 9000 }), ...month(2026, 10, { Housing: 12000, Food: 9000 }).slice(0, 3)] }));
    const c = h.change!;
    expect(Math.abs(c.drivers.reduce((s, d) => s + d.points, 0) - c.points)).toBeLessThanOrEqual(2.5);
  });
});
