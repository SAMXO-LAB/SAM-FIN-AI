"use client";
import { useRef } from "react";

/** Gentle parallax on the hero product shot. Disabled for reduced motion via CSS. */
export function HeroStage({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current; if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  const leave = () => { ref.current?.style.setProperty("--mx", "0"); ref.current?.style.setProperty("--my", "0"); };
  return <div className="stage" ref={ref} onPointerMove={move} onPointerLeave={leave} aria-label="Preview of the Finance Book AI dashboard with sample data">{children}</div>;
}
