import { describe, expect, it } from "vitest";
import { buildForecast, type FxInput, type FxTx } from "./forecast";
import { buildRecommendations } from "./recommendations";

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
const mk = (over: Partial<FxInput> & { cats?: Record<string, number> } = {}): FxInput => {
  const cats = over.cats ?? { Food: 8000, Shopping: 7000 };
  return {
    tx: [...month(2026, 7, cats, 50000, 10000), ...month(2026, 8, cats, 50000, 10000), ...month(2026, 9, cats, 50000, 10000)],
    accounts: [{ type: "bank", balance: R(45000) }], loans: [], debts: [], goals: [], budgets: [], ref: d(2026, 10, 2), ...over,
  };
};
const run = (i: FxInput) => buildRecommendations(i, buildForecast(i));
const find = (r: ReturnType<typeof run>, id: RegExp) => r.items.find((x) => id.test(x.id));

describe("recommendations", () => {
  it("quantifies trimming a big category (food ₹8,000 → saves ₹1,600 a month)", () => {
    const r = run(mk({ cats: { Food: 8000, Shopping: 7000 } }));
    const t = find(r, /^trim-Food/)!;
    expect(t.title).toContain("16%");
    expect(t.body).toContain("₹1,600");
    expect(t.impact?.value).toBe("₹19,200");
  });
  it("shows the savings rate gap against the 20% rule", () => {
    // income 50,000, spend 15,000 + EMI 10,000 → saves 25,000 (50%) so use bigger spend
    const r = run(mk({ cats: { Food: 8000, Shopping: 7000, Housing: 15000, Travel: 3000 } })); // saves 7,000 = 14%
    const s = find(r, /^rate-low/)!;
    expect(s.title).toContain("14%");
    expect(s.body).toContain("₹3,000"); // 20% of 50,000 = 10,000 − 7,000
    expect(s.body).toContain("₹36,000");
  });
  it("praises a strong savings rate", () => {
    const r = run(mk({ cats: { Food: 3000 } }));
    expect(find(r, /^rate-good/)).toBeTruthy();
  });
  it("flags spending that is over income as high priority", () => {
    const r = run(mk({ cats: { Shopping: 45000, Food: 8000 } }));
    expect(r.items[0].priority).toBe("high");
    expect(find(r, /^overspend/)).toBeTruthy();
  });
  it("points high-interest debt out when there is spare cash", () => {
    const loan = { id: "cc", name: "Card EMI", principal: R(30000), annual_rate: 24, tenure_months: 12, first_emi_date: "2026-09-05", interest_type: "reducing" as const, paid: 1 };
    const i = mk({ loans: [loan], accounts: [{ type: "savings", balance: R(80000) }] });
    const p = find(run(i), /^prepay-cc/)!;
    expect(p.priority).toBe("high");
    expect(p.body).toContain("24%");
    expect(p.body).toMatch(/save about ₹[\d,]+ in interest/);
  });
  it("does not push prepayment of a cheap home loan", () => {
    const loan = { id: "h", name: "Home loan", principal: R(2000000), annual_rate: 8.5, tenure_months: 240, first_emi_date: "2026-04-05", interest_type: "reducing" as const, paid: 5 };
    expect(find(run(mk({ loans: [loan], accounts: [{ type: "savings", balance: R(500000) }] })), /^prepay-/)).toBeUndefined();
  });
  it("calls out a thin emergency cushion", () => {
    const e = find(run(mk({ accounts: [{ type: "bank", balance: R(20000) }] })), /^emergency/)!;
    expect(e.priority).toBe("high");
    expect(e.title).toMatch(/0\.\d months/);
  });
  it("flags overdue money lent and names the borrowers", () => {
    const debts = [
      { id: "1", direction: "lent" as const, person: "Rohan", amount: R(8000), interest_pct: 0, due_date: "2026-09-15", payments: [] },
      { id: "2", direction: "lent" as const, person: "Neha", amount: R(10700), interest_pct: 0, due_date: "2026-12-01", payments: [] },
    ];
    const l = find(run(mk({ debts })), /^lent-overdue/)!;
    expect(l.title).toBe("₹8,000 you lent is overdue");
    expect(l.body).toContain("₹18,700");
    expect(l.body).toContain("Rohan");
  });
  it("explains a goal in months: ₹2 lakh laptop at ₹12,000 a month ≈ 17 months", () => {
    const goals = [{ id: "g", name: "New laptop", target: R(200000), target_date: "2027-10-01", saved: 0, contributions: [{ amount: R(36000), contributed_on: "2026-09-20" }] }];
    const g = find(run(mk({ goals })), /^goal-g/)!;
    expect(g.body).toContain("17 months");
  });
  it("warns when EMIs take over 40% of income", () => {
    const loan = { id: "x", name: "Big loan", principal: R(240000), annual_rate: 0, tenure_months: 10, first_emi_date: "2026-04-05", interest_type: "reducing" as const, paid: 7 };
    const r = run(mk({ loans: [loan] })); // EMI ₹24,000 of ₹50,000 = 48%
    expect(find(r, /^emi-burden/)!.priority).toBe("high");
  });
  it("is empty and not ready without a full month of history", () => {
    const i = mk({ tx: [] });
    const r = run(i);
    expect(r.ready).toBe(false);
    expect(r.items).toEqual([]);
  });
  it("still surfaces overdue lending and EMIs without history", () => {
    const debts = [{ id: "1", direction: "lent" as const, person: "Rohan", amount: R(8000), interest_pct: 0, due_date: "2026-09-15", payments: [] }];
    const r = run(mk({ tx: [], debts }));
    expect(r.ready).toBe(false);
    expect(find(r, /^lent-overdue/)).toBeTruthy();
  });
  it("orders high before medium before low", () => {
    const rank = { high: 0, medium: 1, low: 2 } as const;
    const items = run(mk({ cats: { Food: 8000, Shopping: 7000, Housing: 15000 }, debts: [] })).items;
    for (let i = 1; i < items.length; i++) expect(rank[items[i - 1].priority]).toBeLessThanOrEqual(rank[items[i].priority]);
  });
});
