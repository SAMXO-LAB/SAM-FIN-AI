import { addDays, fmtDate, fmtShort, iso, today } from "./dates";
import type { FlowPoint, Range } from "@/components/charts/CashFlowChart";
import type { Transaction } from "@/types/db";

const RANGE_DAYS: Record<Range, number> = { "7D": 7, "30D": 30, "3M": 91, "6M": 182, "1Y": 365 };

export function cashflowSeries(tx: Transaction[], ref = today()): Record<Range, FlowPoint[]> {
  const daily = new Map<string, { inc: number; exp: number }>();
  for (const t of tx) {
    if (t.type === "transfer") continue;
    const m = daily.get(t.occurred_on) ?? { inc: 0, exp: 0 };
    if (t.type === "income") m.inc += t.amount; else m.exp += t.amount;
    daily.set(t.occurred_on, m);
  }
  const out = {} as Record<Range, FlowPoint[]>;
  for (const r of Object.keys(RANGE_DAYS) as Range[]) {
    const days = RANGE_DAYS[r], step = days > 120 ? 7 : 1, start = addDays(ref, -(days - 1));
    const pts: FlowPoint[] = [];
    let ci = 0, ce = 0;
    for (let i = 0; i < days; i += step) {
      let end = start;
      for (let j = 0; j < step && i + j < days; j++) {
        const d = addDays(start, i + j); end = d;
        const m = daily.get(iso(d)); if (m) { ci += m.inc; ce += m.exp; }
      }
      const s0 = iso(addDays(start, i)), e0 = iso(end);
      pts.push({ label: step === 1 ? fmtDate(s0, { weekday: "short", day: "numeric", month: "short" }) : `${fmtShort(s0)} – ${fmtShort(e0)}`, short: fmtShort(e0), inc: ci, exp: ce });
    }
    out[r] = pts;
  }
  return out;
}

/** Categories whose last-30-day spending is well above their previous 3-month monthly average. */
export function spendingInsights(tx: Transaction[], catName: (id: string | null) => string, ref = today()) {
  const f30 = iso(addDays(ref, -29)), f120 = iso(addDays(ref, -119)), t = iso(ref);
  const cur: Record<string, number> = {}, prev: Record<string, number> = {};
  for (const x of tx) {
    if (x.type !== "expense") continue;
    const k = catName(x.category_id);
    if (k === "EMI" || k === "Housing") continue;
    if (x.occurred_on >= f30 && x.occurred_on <= t) cur[k] = (cur[k] ?? 0) + x.amount;
    else if (x.occurred_on >= f120 && x.occurred_on < f30) prev[k] = (prev[k] ?? 0) + x.amount;
  }
  return Object.keys(cur)
    .map((k) => { const avg = Math.round((prev[k] ?? 0) / 3); return { cat: k, cur: cur[k], avg, diff: cur[k] - avg, pct: avg ? (cur[k] - avg) / avg : 0 }; })
    .filter((x) => x.avg >= 50000 && x.diff > 100000)
    .sort((a, b) => b.pct - a.pct);
}
