import type { Metadata } from "next";
import { Download, Plus, ReceiptText, SearchX } from "lucide-react";
import { requireUser, getTimezone } from "@/lib/auth";
import { getAccounts, getCategories, getReceiptIds } from "@/lib/data";
import { addDays, iso, today } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { Empty, PageHead } from "@/components/ui/Page";
import { TransactionButton } from "@/features/finance/forms";
import { TxFilters } from "./TxFilters";
import { TxList } from "./TxList";
import type { Transaction } from "@/types/db";

export const metadata: Metadata = { title: "Transactions" };
const PER = 25;

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireUser();
  const [accounts, categories, receipts] = await Promise.all([getAccounts(), getCategories(), getReceiptIds()]);
  const page = Math.max(1, Number(sp.page) || 1);
  const type = ["income", "expense", "transfer"].includes(sp.type ?? "") ? sp.type! : "";
  const range = ["7", "30", "90", "365", "all"].includes(sp.range ?? "") ? sp.range! : "90";
  const sort = sp.sort === "amount" ? "amount" : "occurred_on";
  const q = (sp.q ?? "").replace(/[,()%*\\.:"']/g, " ").trim().slice(0, 60);

  let query = supabase.from("transactions").select("*", { count: "exact" });
  if (type) query = query.eq("type", type);
  if (sp.cat && /^[0-9a-f-]{36}$/.test(sp.cat)) query = query.eq("category_id", sp.cat);
  if (sp.acc && /^[0-9a-f-]{36}$/.test(sp.acc)) query = query.or(`account_id.eq.${sp.acc},from_account_id.eq.${sp.acc},to_account_id.eq.${sp.acc}`);
  if (range !== "all") query = query.gte("occurred_on", iso(addDays(today(await getTimezone()), -(Number(range) - 1))));
  if (q) query = query.or(`description.ilike.%${q}%,counterparty.ilike.%${q}%,notes.ilike.%${q}%`);
  const { data, count, error } = await query
    .order(sort, { ascending: false }).order("created_at", { ascending: false })
    .range((page - 1) * PER, page * PER - 1);
  if (error) throw new Error("transactions");
  const rows = (data ?? []).map((t) => ({ ...t, amount: Number(t.amount) })) as Transaction[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER));
  const filtered = !!(type || sp.cat || sp.acc || q || range !== "90");
  const inc = rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const exp = rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <PageHead eyebrow="Money in and out" title="Transactions" actions={<>
        <a className="btn btn-glass" href="/api/export?format=csv"><Download size={16} />Export CSV</a>
        {accounts.length > 0 && <TransactionButton accounts={accounts} categories={categories} trigger={<><Plus size={16} />Add</>} />}
      </>} />
      <section className="card g2">
        <TxFilters accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
        {rows.length ? (
          <>
            <div className="small muted" style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "14px 2px 4px" }}>
              <span>{count} transactions</span><span>This page: in <b className="pos-t num">{formatINR(inc)}</b></span><span>out <b className="num" style={{ color: "var(--ink)" }}>{formatINR(exp)}</b></span>
            </div>
            <TxList rows={rows} accounts={accounts} categories={categories} receipts={receipts} page={page} pages={pages} />
          </>
        ) : filtered ? (
          <Empty icon={<SearchX size={26} />} title="No matching transactions" body="Try a different search, or widen the date range and filters." />
        ) : (
          <Empty icon={<ReceiptText size={26} />} title="No transactions yet" body="Your financial timeline starts here. Add income, an expense or a transfer.">
            {accounts.length > 0 && <TransactionButton accounts={accounts} categories={categories} trigger={<><Plus size={16} />Add transaction</>} />}
          </Empty>
        )}
      </section>
    </>
  );
}
