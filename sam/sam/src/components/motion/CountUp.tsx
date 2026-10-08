"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatINR } from "@/lib/money";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const nf = new Intl.NumberFormat("en-IN");

/** Counts up to `to` when scrolled into view. Server and no-JS render show the final value. 
 *  `paise` formats as ₹ with Indian grouping from an integer paise amount; otherwise plain Indian-grouped number. */
export function CountUp({ to, paise = false, prefix = "", suffix = "", duration = 1400 }: { to: number; paise?: boolean; prefix?: string; suffix?: string; duration?: number }) {
  const fmt = (v: number) => (paise ? formatINR(Math.round(v)) : prefix + nf.format(Math.round(v)) + suffix);
  const [text, setText] = useState(() => fmt(to));
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => { if (!reduced()) setText(fmt(0)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => {
    const el = ref.current; if (!el || reduced()) return;
    let raf = 0, started = false;
    const run = () => {
      started = true; const t0 = performance.now();
      const tick = (now: number) => { const p = Math.min(1, (now - t0) / duration); setText(fmt(to * easeOutExpo(p))); if (p < 1) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting) && !started) { io.disconnect(); run(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, paise, duration]);

  return <span ref={ref} className="countup" style={{ fontVariantNumeric: "tabular-nums" }}>{text}</span>;
}
