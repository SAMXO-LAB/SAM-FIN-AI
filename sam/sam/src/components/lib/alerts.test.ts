import { describe, expect, it } from "vitest";
import { alertCount, buildAlerts } from "./alerts";
import { buildForecast, type FxInput, type FxTx } from "./forecast";
import { buildHealth } from "./health";

const R = (n: number) => n * 100;
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
function month(y: number, m: number, cats: Record<string, number>, income = 50000): FxTx[] {
  const k = `${y}-${String(m).padStart(2, "0")}`;
  const out: FxTx[] = [{ type: "income", amount: R(income), occurred_on: `${k}-01`, category: "Salary", loan_linked: false }];
  let day = 2;
  for (const [c, a] of Object.entries(cats)) out.push({ type: "expense", amount: R(a), occurred_on: `${k}-${String(day++).padStart(2, "0")}`, category: c, loan_linked: false });
  return out;
}
const hist = (cats: Record<string, number>) => [4, 5, 6, 7, 8, 9].flatMap((m) => month(2026, m, cats));
const base = (over: Partial<FxInput> = {}): FxInput => ({
  tx: hist({ Housing: 12000, Food: 6000, Shopping: 4000 }), accounts: [{ type: "bank", balance: R(150000) }],
  loans: [], debts: [], goals: [], budgets: [], ref: d(2026, 10, 12), ...over,
});
const run = (i: FxInput) => { const f = buildForecast(i); return buildAlerts(i, f, buildHealth(i)); };
// EMI of 12,000 for 12 months at 0% interest, the next one due on `due`.
const loan = (due: string, paid = 5, over = {}) => ({ id: "l1", name: "Car loan", principal: R(144000), annual_rate: 0, tenure_months: 12, first_emi_date: due, interest_type: "reducing" as const, paid, ...over });

describe("EMI alerts", () => {
  it("says the EMI is due in 3 days", () => {
    // first EMI 2026-05-15, five paid, next is 2026-10-15
    const a = run(base({ loans: [loan("2026-05-15")] })).find((x) => x.id === "emi-l1")!;
    expect(a.title).toBe("Your ₹12,000 Car loan EMI is due in 3 days");
    expect(a.level).toBe("heads_up");
    expect(a.href).toBe("/loans");
  });
  it("is urgent when due within two days or when cash is short", () => {
    expect(run(base({ loans: [loan("2026-05-13")] })).find((x) => x.id === "emi-l1")!.level).toBe("urgent");
    const poor = run(base({ loans: [loan("2026-05-17")], accounts: [{ type: "bank", balance: R(5000) }] })).find((x) => x.id === "emi-l1")!;
    expect(poor.level).toBe("urgent");
    expect(poor.body).toContain("less than the EMI");
  });
  it("flags an overdue EMI as urgent", () => {
    const a = run(base({ loans: [loan("2026-05-05")] })).find((x) => x.id === "emi-l1")!;
    expect(a.level).toBe("urgent");
    expect(a.title).toContain("overdue");
  });
  it("stays quiet when the EMI is more than a week away", () => {
    expect(run(base({ loans: [loan("2026-05-25")] })).some((x) => x.id === "emi-l1")).toBe(false);
  });
  it("still alerts for a due EMI when there is not enough history for a forecast", () => {
    const i = base({ tx: [], loans: [loan("2026-05-15")] });
    expect(buildForecast(i).ready).toBe(false);
    expect(run(i).some((x) => x.id === "emi-l1")).toBe(true);
  });
});

describe("spending alerts", () => {
  it("names the category and how far above normal it is", () => {
    const tx = [...hist({ Housing: 12000, Food: 6000, Shopping: 4000 }), ...month(2026, 10, { Housing: 12000, Food: 8000 }).slice(0, 3)];
    const a = run(base({ tx })).find((x) => x.id === "spend-Food");
    expect(a).toBeTruthy();
    expect(a!.title).toMatch(/^Your food spending is \d+% higher than your normal average$/);
    expect(a!.body).toContain("₹6,000");
  });
  it("does not nag when spending is normal", () => {
    expect(run(base()).some((x) => x.kind === "spend")).toBe(false);
  });
});

describe("unused money", () => {
  it("suggests moving part of the surplus toward a goal that is behind", () => {
    const goal = { id: "g", name: "Goa trip", target: R(200000), target_date: "2026-12-31", saved: R(10000), contributions: [{ amount: R(10000), contributed_on: "2026-06-01" }] };
    const a = run(base({ goals: [goal] })).find((x) => x.id === "unused");
    expect(a).toBeTruthy();
    expect(a!.level).toBe("tip");
    expect(a!.title).toMatch(/^You have ₹[\d,]+ unused this month$/);
    expect(a!.body).toContain("Consider moving");
    expect(a!.body).toContain("Goa trip");
  });
  it("points to the emergency fund when there is no goal and the cushion is small", () => {
    const a = run(base({ accounts: [{ type: "bank", balance: R(40000) }] })).find((x) => x.id === "unused");
    expect(a?.body).toContain("emergency fund");
  });
});

describe("people and budgets", () => {
  it("reminds about money lent that is overdue", () => {
    const debt = { id: "d", direction: "lent" as const, person: "Ravi", amount: R(5000), interest_pct: 0, due_date: "2026-10-05", payments: [] };
    const a = run(base({ debts: [debt] })).find((x) => x.id === "lent-d")!;
    expect(a.title).toBe("Ravi owes you ₹5,000, overdue by 7 days");
    expect(a.level).toBe("heads_up");
  });
  it("tells you to repay money you owe when it is due soon", () => {
    const debt = { id: "d", direction: "borrowed" as const, person: "Asha", amount: R(8000), interest_pct: 0, due_date: "2026-10-13", payments: [] };
    const a = run(base({ debts: [debt] })).find((x) => x.id === "owe-d")!;
    expect(a.title).toBe("You need to repay Asha ₹8,000 tomorrow");
    expect(a.level).toBe("urgent");
  });
  it("ignores debts that are fully paid", () => {
    const debt = { id: "d", direction: "lent" as const, person: "Ravi", amount: R(5000), interest_pct: 0, due_date: "2026-10-05", payments: [{ amount: R(5000) }] };
    expect(run(base({ debts: [debt] })).some((x) => x.id === "lent-d")).toBe(false);
  });
  it("warns at 85% of a budget and when over it", () => {
    const tx = [...hist({ Housing: 12000, Food: 6000 }), { type: "expense" as const, amount: R(5200), occurred_on: "2026-10-03", category: "Food", loan_linked: false }];
    expect(run(base({ tx, budgets: [{ category: "Food", amount: R(6000) }] })).find((x) => x.id === "budget-Food")!.title).toBe("Your food budget is 87% used");
    expect(run(base({ tx, budgets: [{ category: "Food", amount: R(5000) }] })).find((x) => x.id === "budget-Food")!.title).toBe("You are over your food budget");
    expect(run(base({ tx, budgets: [{ category: "Food", amount: R(9000) }] })).some((x) => x.id === "budget-Food")).toBe(false);
  });
});

describe("unusual purchases", () => {
  it("flags a purchase far above the usual size in its category", () => {
    const tx = [...hist({ Housing: 12000, Food: 6000, Shopping: 4000 }), { type: "expense" as const, amount: R(30000), occurred_on: "2026-10-11", category: "Shopping", loan_linked: false }];
    const a = run(base({ tx })).find((x) => x.kind === "unusual")!;
    expect(a.title).toContain("₹30,000 shopping purchase");
    expect(a.level).toBe("tip");
  });
  it("does not flag rent-like or small purchases", () => {
    const tx = [...hist({ Housing: 12000, Food: 6000 }), { type: "expense" as const, amount: R(30000), occurred_on: "2026-10-11", category: "Housing", loan_linked: false }];
    expect(run(base({ tx })).some((x) => x.kind === "unusual")).toBe(false);
  });
});

describe("ordering and count", () => {
  it("lists urgent first, then heads-up, then tips, without duplicates", () => {
    const debt = { id: "d", direction: "lent" as const, person: "Ravi", amount: R(5000), interest_pct: 0, due_date: "2026-10-05", payments: [] };
    const list = run(base({ loans: [loan("2026-05-05")], debts: [debt] }));
    const rank = { urgent: 0, heads_up: 1, tip: 2 };
    expect(list.map((a) => rank[a.level])).toEqual([...list.map((a) => rank[a.level])].sort());
    expect(new Set(list.map((a) => a.id)).size).toBe(list.length);
    expect(list[0].level).toBe("urgent");
  });
  it("counts only alerts that need a look", () => {
    const list = run(base({ loans: [loan("2026-05-05")] }));
    expect(alertCount(list)).toBe(list.filter((a) => a.level !== "tip").length);
  });
  it("is empty and calm for a brand-new user", () => {
    expect(run(base({ tx: [], accounts: [] }))).toEqual([]);
  });
});
