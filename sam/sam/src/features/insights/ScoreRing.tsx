import type { HealthLabel } from "@/lib/health";

export const LABEL_TONE: Record<HealthLabel, "pos" | "info" | "warn" | "neg"> = {
  Excellent: "pos", Healthy: "pos", Fair: "info", "Needs attention": "warn", "At risk": "neg",
};

/** The score as a ring with the number in the middle. Pure SVG, no script. */
export function ScoreRing({ score, label, size = 168 }: { score: number; label: HealthLabel; size?: number }) {
  const r = 52, c = 2 * Math.PI * r, tone = LABEL_TONE[label];
  return (
    <div className={`sring sring-${tone}`} style={{ width: size, height: size }} role="img" aria-label={`Finance Book Score ${score} out of 100, ${label}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="sring-track" cx="60" cy="60" r={r} />
        <circle className="sring-val" cx="60" cy="60" r={r} strokeDasharray={`${(Math.max(0, Math.min(score, 100)) / 100) * c} ${c}`} transform="rotate(-90 60 60)" />
      </svg>
      <div className="sring-c"><b>{score}</b><span>/ 100</span></div>
    </div>
  );
}
