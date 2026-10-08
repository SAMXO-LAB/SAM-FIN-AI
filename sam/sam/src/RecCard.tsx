import Link from "next/link";
import { ChevronRight, CircleCheck, HandCoins, Landmark, Lightbulb, PiggyBank, ShieldCheck, ShoppingBag, Target, TriangleAlert } from "lucide-react";
import type { Recommendation, RecKind } from "@/lib/recommendations";

const ICON: Record<RecKind, React.ComponentType<{ size?: number }>> = {
  spend: ShoppingBag, save: PiggyBank, debt: Landmark, goal: Target, lent: HandCoins, emi: TriangleAlert, safety: ShieldCheck, good: CircleCheck,
};
export const PRIORITY_LABEL = { high: "Act now", medium: "Worth doing", low: "Nice to have" } as const;

export function RecCard({ r, compact = false }: { r: Recommendation; compact?: boolean }) {
  const I = ICON[r.kind] ?? Lightbulb;
  return (
    <article className={`rec rec-${r.priority} ${compact ? "rec-compact" : "g2"}`}>
      <span className="rec-ic" aria-hidden="true"><I size={18} /></span>
      <div className="rec-bd">
        <div className="rec-top">
          <h3 className="rec-t">{r.title}</h3>
          <span className={`pill plain ${r.priority === "high" ? "neg" : r.priority === "medium" ? "warn" : "info"}`}>{PRIORITY_LABEL[r.priority]}</span>
        </div>
        {!compact && <p className="rec-p">{r.body}</p>}
        <div className="rec-foot">
          {r.impact && <span className="rec-impact"><span>{r.impact.label}</span><b>{r.impact.value}</b></span>}
          <Link className="link" href={r.href}>{r.cta} <ChevronRight size={14} /></Link>
        </div>
      </div>
    </article>
  );
}
