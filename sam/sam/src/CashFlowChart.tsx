"use client";
import { useEffect, useRef, useState } from "react";
import { compactINR, formatINR } from "@/lib/money";

export type FlowPoint = { label: string; short: string; inc: number; exp: number };
export type Range = "7D" | "30D" | "3M" | "6M" | "1Y";
const RANGES: Range[] = ["7D", "30D", "3M", "6M", "1Y"];

function nice(v: number) {
  if (v <= 0) return 100;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
}

/** Cumulative income vs spending for the selected period. */
export function CashFlowChart({ series }: { series: Record<Range, FlowPoint[]> }) {
  const [range, setRange] = useState<Range>("30D");
  const [w, setW] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, e.contentRect.width)));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  const data = series[range];
  const H = 260, narrow = w < 520, pl = narrow ? 46 : 60, pr = 8, pt = 12, pb = 26, iw = w - pl - pr, ih = H - pt - pb;
  const max = nice(Math.max(1, ...data.map((d) => Math.max(d.inc, d.exp))));
  const n = data.length;
  const x = (i: number) => pl + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v: number) => pt + ih - (v / max) * ih;
  const path = (k: "inc" | "exp") => data.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p[k]).toFixed(1)}`).join("");
  const ticks = narrow ? 4 : 6;
  const last = data[n - 1];
  const net = last ? last.inc - last.exp : 0;
  const hp = hover !== null ? data[hover] : null;
  const onMove = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    const sx = ((clientX - r.left) / r.width) * w;
    setHover(Math.max(0, Math.min(n - 1, Math.round((sx - pl) / (iw / Math.max(1, n - 1))))));
  };
  return (
    <>
      <div className="card-head">
        <div><h3 className="h3">Cash flow</h3><div className="sub">Cumulative income and spending</div></div>
        <div className="seg" role="tablist" aria-label="Range">
          {RANGES.map((r) => <button key={r} role="tab" aria-selected={range === r} className={range === r ? "on" : ""} onClick={() => { setRange(r); setHover(null); }}>{r}</button>)}
        </div>
      </div>
      <div className="chart" ref={box} onMouseLeave={() => setHover(null)} onMouseMove={(e) => onMove(e.clientX)} onTouchMove={(e) => onMove(e.touches[0].clientX)} onTouchEnd={() => setHover(null)}>
        <svg viewBox={`0 0 ${w} ${H}`} role="img" aria-label={`Income ${formatINR(last?.inc ?? 0)} and spending ${formatINR(last?.exp ?? 0)} over ${range}`}>
          <defs><linearGradient id="cfg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: "var(--accent)", stopOpacity: 0.22 }} /><stop offset="1" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} /></linearGradient></defs>
          {[0, 1, 2, 3, 4].map((g) => {
            const v = (max * g) / 4, yy = y(v);
            return <g key={g}><line x1={pl} x2={w - pr} y1={yy} y2={yy} style={{ stroke: "var(--line)" }} strokeDasharray={g ? "3 4" : undefined} /><text x={pl - 10} y={yy + 4} textAnchor="end" fontSize="11" style={{ fill: "var(--ink-3)" }}>{compactINR(v)}</text></g>;
          })}
          {n > 0 && <path d={`${path("inc")} L${x(n - 1)} ${y(0)} L${x(0)} ${y(0)}Z`} fill="url(#cfg)" />}
          <path key={range + "i"} className="draw" style={{ ["--len" as string]: Math.ceil(iw * 2.4), stroke: "var(--accent)" }} d={path("inc")} fill="none" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
          <path key={range + "e"} className="draw" style={{ ["--len" as string]: Math.ceil(iw * 2.4), stroke: "var(--ink-2)" }} d={path("exp")} fill="none" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
          {Array.from({ length: ticks }, (_, k) => {
            const i = Math.round((k * (n - 1)) / (ticks - 1));
            return data[i] ? <text key={k} x={x(i)} y={H - 6} textAnchor={k === 0 ? "start" : k === ticks - 1 ? "end" : "middle"} fontSize="11" style={{ fill: "var(--ink-3)" }}>{data[i].short}</text> : null;
          })}
          {hp && hover !== null && <>
            <line x1={x(hover)} x2={x(hover)} y1={pt} y2={pt + ih} style={{ stroke: "var(--line-strong)" }} />
            <circle cx={x(hover)} cy={y(hp.inc)} r="4.5" style={{ fill: "var(--accent)", stroke: "var(--bg)" }} strokeWidth="2" />
            <circle cx={x(hover)} cy={y(hp.exp)} r="4.5" style={{ fill: "var(--ink-2)", stroke: "var(--bg)" }} strokeWidth="2" />
          </>}
        </svg>
        {hp && hover !== null && (
          <div className="tip g4 on" style={{ transform: `translate(${Math.max(0, Math.min((x(hover) / w) * (box.current?.clientWidth ?? w) - 90, (box.current?.clientWidth ?? w) - 190))}px, 0px)` }}>
            <div className="tl">{hp.label}</div>
            <div className="tr"><span>Income to date</span><b>{formatINR(hp.inc)}</b></div>
            <div className="tr"><span>Spent to date</span><b>{formatINR(hp.exp)}</b></div>
            <div className="tr"><span>Net</span><b className={hp.inc - hp.exp >= 0 ? "pos-t" : "neg-t"}>{formatINR(hp.inc - hp.exp, { sign: true })}</b></div>
          </div>
        )}
      </div>
      <div className="legend" style={{ marginTop: 10 }}>
        <span><i style={{ background: "var(--accent)" }} />Income</span>
        <span><i style={{ background: "var(--ink-2)" }} />Spending</span>
        <span>Net for period <b className={`num ${net >= 0 ? "pos-t" : "neg-t"}`}>{formatINR(net, { sign: true })}</b></span>
      </div>
    </>
  );
}
