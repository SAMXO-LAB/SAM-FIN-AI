import { compactINR, formatINR } from "@/lib/money";

interface Pt { label: string; balance: number; low: number; high: number }

/** 12-month balance projection: a line with a shaded "likely range". Server-rendered SVG, no client code. */
export function ProjectionChart({ start, months }: { start: number; months: Pt[] }) {
  const W = 680, H = 250, L = 56, R = 14, T = 14, B = 30;
  const pts = [{ label: "Now", balance: start, low: start, high: start }, ...months];
  const lo = Math.min(...pts.map((p) => p.low)), hi = Math.max(...pts.map((p) => p.high), lo + 1);
  const pad = (hi - lo) * 0.12 || 1;
  const y0 = lo - pad, y1 = hi + pad;
  const x = (i: number) => L + (i / (pts.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.balance).toFixed(1)}`).join(" ");
  const band = `${pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.high).toFixed(1)}`).join(" ")} ${[...pts].reverse().map((p, i) => `L${x(pts.length - 1 - i).toFixed(1)} ${y(p.low).toFixed(1)}`).join(" ")} Z`;
  const ticks = [lo, (lo + hi) / 2, hi].map((v) => Math.round(v / 100) * 100);
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Projected balance rising from ${formatINR(start)} to ${formatINR(last.balance)} over 12 months`} style={{ display: "block", maxWidth: "100%", height: "auto" }}>
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} style={{ stroke: "var(--line)" }} strokeWidth="1" />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" style={{ fill: "var(--ink-3)" }}>{compactINR(v)}</text>
        </g>
      ))}
      {lo < 0 && <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} style={{ stroke: "var(--neg)" }} strokeWidth="1" strokeDasharray="4 4" />}
      <path d={band} style={{ fill: "var(--accent-soft)" }} />
      <path d={line} fill="none" style={{ stroke: "var(--accent)" }} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.balance)} r={i === 0 || i === pts.length - 1 ? 4.5 : 2.5} style={{ fill: "var(--accent)", stroke: "var(--card, #fff)" }} strokeWidth="1.5">
          <title>{`${p.label}: ${formatINR(p.balance)}${i ? ` (likely ${formatINR(p.low)} to ${formatINR(p.high)})` : ""}`}</title>
        </circle>
      ))}
      {[0, 3, 6, 9, 12].map((i) => <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === 12 ? "end" : "middle"} fontSize="11" style={{ fill: "var(--ink-3)" }}>{pts[i].label}</text>)}
    </svg>
  );
}
