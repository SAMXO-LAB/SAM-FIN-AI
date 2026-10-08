import type { Metadata } from "next";
import Link from "next/link";
import { BellRing } from "lucide-react";
import { getInsights } from "@/lib/insights";
import { Empty, PageHead } from "@/components/ui/Page";
import { AlertCard } from "@/features/insights/AlertCard";
import type { AlertLevel } from "@/lib/alerts";

export const metadata: Metadata = { title: "Alerts" };

const GROUPS: { level: AlertLevel; title: string; sub: string }[] = [
  { level: "urgent", title: "Needs action now", sub: "Payments due very soon, overdue or short on cash." },
  { level: "heads_up", title: "Coming up", sub: "Worth a look this week." },
  { level: "tip", title: "Ideas", sub: "Small moves that could help." },
];

export default async function AlertsPage() {
  const { alerts, forecast } = await getInsights();
  return (
    <>
      <PageHead eyebrow="Smart alerts" title="Alerts"
        sub={alerts.length ? "Specific to your own money: what is due, what is running high and what you could do with spare cash." : "Nothing needs your attention right now."} />
      {alerts.length ? GROUPS.map((g) => {
        const list = alerts.filter((a) => a.level === g.level);
        return list.length ? (
          <section key={g.level} aria-label={g.title} style={{ marginBottom: 26 }}>
            <div className="alert-group-h"><h2 className="h3">{g.title}</h2><span className="xs muted">{g.sub}</span></div>
            <div className="rec-list">{list.map((a) => <AlertCard key={a.id} a={a} />)}</div>
          </section>
        ) : null;
      }) : (
        <section className="card g2">
          <Empty icon={<BellRing size={26} />} title="All clear" body={forecast.ready ? "No payments are due soon and your spending is in line with your usual. New alerts appear here as things change." : "Alerts for EMIs, repayments and budgets appear as soon as you add them. Spending alerts start after your first full month."}>
            <Link href="/transactions" className="btn btn-glass btn-sm">Add transactions</Link>
          </Empty>
        </section>
      )}
      <p className="xs muted" style={{ marginTop: 18 }}>Alerts come from the numbers you have recorded and update on their own: once you pay an EMI or the month turns, they disappear. They are not financial advice.</p>
    </>
  );
}
