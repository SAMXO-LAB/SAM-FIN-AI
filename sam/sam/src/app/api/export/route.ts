import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Lets a signed-in user download their own data. RLS guarantees only their rows are returned. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to export your data." }, { status: 401 });
  const format = request.nextUrl.searchParams.get("format") === "json" ? "json" : "csv";
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    const tables = ["profiles", "accounts", "categories", "transactions", "loans", "loan_payments", "debts", "debt_payments", "budgets", "goals", "goal_contributions"] as const;
    const out: Record<string, unknown> = { exported_at: new Date().toISOString(), money_unit: "paise (1/100 INR)" };
    for (const t of tables) {
      const q = supabase.from(t).select("*");
      const { data, error } = t === "categories" ? await q.eq("user_id", user.id) : await q;
      if (error) return NextResponse.json({ error: "We couldn’t prepare your export. Please try again." }, { status: 500 });
      out[t === "categories" ? "custom_categories" : t] = data;
    }
    return new NextResponse(JSON.stringify(out, null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="sam-backup-${stamp}.json"`, "Cache-Control": "no-store" },
    });
  }

  const [{ data: tx, error }, { data: accts }, { data: cats }] = await Promise.all([
    supabase.from("transactions").select("*").order("occurred_on", { ascending: false }),
    supabase.from("accounts").select("id,name"),
    supabase.from("categories").select("id,name"),
  ]);
  if (error) return NextResponse.json({ error: "We couldn’t prepare your export. Please try again." }, { status: 500 });
  const an = new Map((accts ?? []).map((a) => [a.id, a.name]));
  const cn = new Map((cats ?? []).map((c) => [c.id, c.name]));
  // Prefix cells that start with formula characters so spreadsheets don't execute them.
  const cell = (v: unknown) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = ["Date,Type,Amount (INR),Category,Account,From account,To account,Merchant or person,Description,Payment method,Notes"];
  for (const t of tx ?? []) {
    lines.push([t.occurred_on, t.type, (Number(t.amount) / 100).toFixed(2), cn.get(t.category_id) ?? "", an.get(t.account_id) ?? "", an.get(t.from_account_id) ?? "", an.get(t.to_account_id) ?? "", t.counterparty, t.description, t.payment_method, t.notes].map(cell).join(","));
  }
  return new NextResponse("﻿" + lines.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="sam-transactions-${stamp}.csv"`, "Cache-Control": "no-store" },
  });
}
