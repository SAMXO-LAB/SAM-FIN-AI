import type { Metadata } from "next";
import { getTimezone } from "@/lib/auth";
import { ChartPie, Pencil, Plus, Trash2 } from "lucide-react";
import { getBudgets, getCategories, getTransactions } from "@/lib/data";
import { iso, today } from "@/lib/dates";
import { formatINR, pct } from "@/lib/money";
import { Icon } from "@/components/Icon";
import { Empty, PageHead, Stat } from "@/components/ui/Page";
import { ConfirmButton } from "@/components/ui/Form";
import { BudgetButton } from "@/features/finance/forms";
import { deleteBudget } from "@/features/finance/actions";

export const metadata: Metadata = { title: "Budgets" };

export default async function BudgetsPage() {
  const ref = today(await getTimezone());
  const monthStart = iso(new Date(ref.getFullYear(), ref.getMonth(), 1));
  const [budgets, categories, tx] = await Promise.all([getBudgets(), getCategories(), getTransactions({ from: monthStart })]);
  const spent: Record<string, number> = {};
  for (const t of tx) if (t.type === "expense" && t.category_id) spent[t.category_id] = (spent[t.category_id] ?? 0) + t.amount;
  const rows = budgets.map((b) => { const c = categories.find((x) => x.id === b.category_id); const s = spent[b.category_id] ?? 0; return { b, c, s, p: s / b.amount }; }).sort((a, b) => b.p - a.p);
  const lim = rows.reduce((a, x) => a + x.b.amount, 0), sp = rows.reduce((a, x) => a + x.s, 0);
  const over = rows.filter((x) => x.p > 1);
  const free = categories.filter((c) => c.kind === "expense" && c.name !== "EMI" && !budgets.some((b) => b.category_id === c.id));
  const daysLeft = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate() - ref.getDate() + 1;
  const monthName = ref.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const add = free.length ? <BudgetButton categories={free} trigger={<><Plus size={16} />Set budget</>} /> : null;
  return (
    <>
      <PageHead eyebrow={`${monthName} · ${daysLeft} days left`} title="Budgets" actions={add} />
      <div className="stat-row">
        <Stat k="Budgeted" v={formatINR(lim)} d={`${rows.length} categories`} />
        <Stat k="Spent this month" v={formatINR(sp)} d={lim ? `${pct(sp / lim)} of budget` : "—"} />
        <Stat k="Remaining" v={formatINR(lim - sp)} d={lim - sp > 0 ? `About ${formatINR(Math.floor((lim - sp) / daysLeft))} a day` : "Across all budgets"} tone={lim - sp < 0 ? "neg" : "pos"} />
        <Stat k="Over budget" v={over.length} d={over.length ? over.map((x) => x.c?.name).join(", ") : "All on track"} tone={over.length ? "neg" : undefined} />
      </div>
      <section className="card g2">
        {rows.length ? rows.map(({ b, c, s, p }) => {
          const t = p > 1 ? "neg" : p > 0.8 ? "warn" : "pos";
          return (
            <div className="budget-row" key={b.id}>
              <div className="nm"><span className="ic" style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--hover)", flex: "none" }}><Icon name={c?.icon ?? "circle-dashed"} /></span><div style={{ minWidth: 0 }}><b>{c?.name}</b><div className={`xs ${t}-t`}>{p > 1 ? `Over by ${formatINR(s - b.amount)}` : p > 0.8 ? "Close to the limit" : "On track"}</div></div></div>
              <div className="bwrap"><div className={`bar ${t}`}><i style={{ width: `${Math.min(100, p * 100)}%` }} /></div><div className="nums"><span>{formatINR(s)} of {formatINR(b.amount)}</span><span>{pct(p)}</span></div></div>
              <div style={{ display: "flex", gap: 2 }}>
                <BudgetButton categories={[]} current={{ category_id: b.category_id, amount: b.amount, name: c?.name ?? "" }} triggerClass="icon-btn" label={`Edit ${c?.name} budget`} trigger={<Pencil size={17} />} />
                <ConfirmButton action={deleteBudget} id={b.id} title={`Remove ${c?.name} budget?`} body="Your transactions are not affected." cta="Remove" triggerClass="icon-btn" label={`Remove ${c?.name} budget`} trigger={<Trash2 size={17} />} />
              </div>
            </div>
          );
        }) : <Empty icon={<ChartPie size={26} />} title="No budgets yet" body="Set a monthly limit for a category and Sam shows how much is left before you go over.">{add}</Empty>}
      </section>
    </>
  );
}
