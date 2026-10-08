import Link from "next/link";
import { Bell, CalendarClock, ChevronRight, Gauge, Lightbulb, PiggyBank, ShoppingBag, TriangleAlert, Users, Wallet } from "lucide-react";
import type { Alert, AlertKind, AlertLevel } from "@/lib/alerts";

const ICON: Record<AlertKind, React.ComponentType<{ size?: number }>> = {
  due: CalendarClock, spend: ShoppingBag, cash: Wallet, lent: Users, budget: PiggyBank, opportunity: Lightbulb, score: Gauge, unusual: TriangleAlert,
};
export const LEVEL_LABEL: Record<AlertLevel, string> = { urgent: "Urgent", heads_up: "Heads up", tip: "Tip" };
const EMOJI: Record<AlertLevel, string> = { urgent: "🔔", heads_up: "⚠️", tip: "💡" };

export function AlertCard({ a, compact = false }: { a: Alert; compact?: boolean }) {
  const I = ICON[a.kind] ?? Bell;
  return (
    <article className={`alert alert-${a.level} ${compact ? "alert-compact" : "g2"}`}>
      <span className="alert-ic" aria-hidden="true"><I size={18} /></span>
      <div className="alert-bd">
        <div className="alert-top">
          <h3 className="alert-t"><span aria-hidden="true">{EMOJI[a.level]} </span>{a.title}</h3>
          {!compact && <span className={`pill plain ${a.level === "urgent" ? "neg" : a.level === "heads_up" ? "warn" : "info"}`}>{LEVEL_LABEL[a.level]}</span>}
        </div>
        {!compact && <p className="alert-p">{a.body}</p>}
        <Link className="link" href={a.href}>{a.cta} <ChevronRight size={14} /></Link>
      </div>
    </article>
  );
}
