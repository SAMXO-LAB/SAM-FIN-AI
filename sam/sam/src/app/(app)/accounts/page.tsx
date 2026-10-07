import type { Metadata } from "next";
import { getTimezone } from "@/lib/auth";
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { getAccounts, getTransactions } from "@/lib/data";
import { addDays, iso, today } from "@/lib/dates";
import { compactINR, formatINR } from "@/lib/money";
import { accountType } from "@/lib/labels";
import { Icon } from "@/components/Icon";
import { Empty, PageHead, Stat } from "@/components/ui/Page";
import { ConfirmButton } from "@/components/ui/Form";
import { AccountButton } from "@/features/finance/forms";
import { deleteAccount } from "@/features/finance/actions";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const [accounts, tx] = await Promise.all([getAccounts(), getTransactions({ from: iso(addDays(today(await getTimezone()), -29)) })]);
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const sum = (f: (t: string) => boolean) => accounts.filter((a) => f(a.type)).reduce((s, a) => s + a.balance, 0);
  const flow = (id: string) => {
    let i = 0, o = 0;
    for (const t of tx) {
      if (t.account_id === id) { if (t.type === "income") i += t.amount; else o += t.amount; }
      if (t.to_account_id === id) i += t.amount;
      if (t.from_account_id === id) o += t.amount;
    }
    return { i, o };
  };
  return (
    <>
      <PageHead eyebrow="Where your money lives" title="Accounts" sub="Finance Book AI never asks for bank passwords or OTPs. Add accounts by name and keep balances current by recording transactions."
        actions={<AccountButton trigger={<><Plus size={16} />Add account</>} />} />
      <div className="stat-row">
        <Stat k="Total balance" v={formatINR(total)} d={`${accounts.length} accounts`} />
        <Stat k="Bank, cash & wallets" v={formatINR(sum((t) => ["bank", "cash", "wallet", "other"].includes(t)))} d="Available to spend" />
        <Stat k="Savings" v={formatINR(sum((t) => t === "savings"))} d="Savings accounts" />
        <Stat k="Credit cards" v={formatINR(sum((t) => t === "credit_card"))} d="Negative means owed" tone={sum((t) => t === "credit_card") < 0 ? "neg" : undefined} />
      </div>
      {accounts.length ? (
        <div className="acct-grid">{accounts.map((a) => {
          const ty = accountType(a.type), f = flow(a.id);
          return (
            <article className="acct g3" key={a.id} style={{ ["--tc" as string]: `var(--c${ty.tone})` }}>
              <span className="tint" />
              <div className="acct-top">
                <span className="ic"><Icon name={ty.icon} /></span>
                <div style={{ display: "flex", gap: 2 }}>
                  <AccountButton account={a} triggerClass="icon-btn" label={`Edit ${a.name}`} trigger={<Pencil size={17} />} />
                  <ConfirmButton action={deleteAccount} id={a.id} title={`Delete ${a.name}?`} body="This removes the account and every transaction recorded against it. This can’t be undone." cta="Delete account" triggerClass="icon-btn" label={`Delete ${a.name}`} trigger={<Trash2 size={17} />} />
                </div>
              </div>
              <div><div className="small muted">{a.institution || ty.label} · {ty.label}</div><div className="h3" style={{ marginTop: 2 }}>{a.name}</div></div>
              <div className={`bal ${a.balance < 0 ? "neg-t" : ""}`}>{formatINR(a.balance)}</div>
              <div className="meta"><span>30d in <b className="pos-t num">{compactINR(f.i)}</b></span><span>out <b className="num" style={{ color: "var(--ink-2)" }}>{compactINR(f.o)}</b></span><span>{a.currency}</span></div>
            </article>
          );
        })}</div>
      ) : (
        <section className="card g2"><Empty icon={<Wallet size={26} />} title="No accounts yet" body="Add your bank accounts, cash and cards to see your balance in one place."><AccountButton trigger={<><Plus size={16} />Add account</>} /></Empty></section>
      )}
    </>
  );
}
