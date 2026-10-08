import type { Metadata } from "next";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { getInsights } from "@/lib/insights";
import { Empty, PageHead } from "@/components/ui/Page";
import { RecCard } from "@/features/insights/RecCard";

export const metadata: Metadata = { title: "Recommendations" };

export default async function RecommendationsPage() {
  const { forecast, recs } = await getInsights();
  const high = recs.items.filter((r) => r.priority === "high").length;
  return (
    <>
      <PageHead eyebrow="Based on your finances" title="Recommended for you"
        sub={recs.ready ? `Built from your last ${forecast.monthsUsed} full ${forecast.monthsUsed === 1 ? "month" : "months"}, your loans, goals and money lent. ${high ? `${high} ${high === 1 ? "needs" : "need"} attention first.` : "Nothing urgent."}` : "These sharpen as you record more."} />
      {recs.items.length ? (
        <>
          <div className="rec-list">{recs.items.map((r) => <RecCard key={r.id} r={r} />)}</div>
          {!recs.ready && (
            <p className="notice info" style={{ marginTop: 16 }}><Lightbulb size={17} />{forecast.reason} More tailored tips, such as spending and savings advice, unlock after your first full month.</p>
          )}
        </>
      ) : (
        <section className="card g2">
          <Empty icon={<Lightbulb size={26} />} title="Recommendations are on their way" body={forecast.reason ?? "Record your income and spending for a full month and Finance Book AI will suggest where you can save."}>
            <Link href="/transactions" className="btn btn-glass btn-sm">Add transactions</Link>
          </Empty>
        </section>
      )}
      <p className="xs muted" style={{ marginTop: 18 }}>These are suggestions based on the numbers you have recorded, not financial advice. Every figure is calculated from your own records; estimates are marked as such.</p>
    </>
  );
}
