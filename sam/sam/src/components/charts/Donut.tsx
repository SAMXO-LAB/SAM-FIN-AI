import { formatINR } from "@/lib/money";

export function Donut({ items, size = 168 }: { items: { k: string; v: number; c: number }[]; size?: number }) {
  const total = items.reduce((s, x) => s + x.v, 0) || 1;
  const r = size / 2 - 10, C = 2 * Math.PI * r, c = size / 2;
  let off = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Spending by category">
      <circle cx={c} cy={c} r={r} fill="none" style={{ stroke: "var(--track)" }} strokeWidth="14" />
      {items.map((x) => {
        const len = (x.v / total) * C;
        const el = (
          <circle key={x.k} cx={c} cy={c} r={r} fill="none" style={{ stroke: `var(--c${x.c})` }} strokeWidth="14"
            strokeDasharray={`${Math.max(0, len - (items.length > 1 ? 2.5 : 0)).toFixed(2)} ${C.toFixed(2)}`} strokeDashoffset={(-off).toFixed(2)} transform={`rotate(-90 ${c} ${c})`}>
            <title>{`${x.k}: ${formatINR(x.v)}`}</title>
          </circle>
        );
        off += len;
        return el;
      })}
    </svg>
  );
}

export function Ring({ p, size = 76, tone = "accent" }: { p: number; size?: number; tone?: string }) {
  const r = size / 2 - 6, C = 2 * Math.PI * r, c = size / 2, v = Math.max(0, Math.min(1, p));
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
      <circle cx={c} cy={c} r={r} fill="none" style={{ stroke: "var(--track)" }} strokeWidth="7" />
      <circle cx={c} cy={c} r={r} fill="none" style={{ stroke: `var(--${tone})` }} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(C * v).toFixed(2)} ${C.toFixed(2)}`} transform={`rotate(-90 ${c} ${c})`} />
    </svg>
  );
}
