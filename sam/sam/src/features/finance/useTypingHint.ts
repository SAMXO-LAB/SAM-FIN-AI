"use client";
import { useEffect, useState } from "react";

/** A placeholder that types out example questions one after another. Static for people who prefer reduced motion. */
export function useTypingHint(prefix: string, examples: string[]) {
  const [hint, setHint] = useState(`${prefix}${examples[0] ?? ""}`);
  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !examples.length) return;
    let i = 0, n = 0, dir = 1, wait = 0;
    const t = setInterval(() => {
      if (wait > 0) { wait--; return; }
      const full = examples[i];
      n += dir;
      if (dir === 1 && n >= full.length) { dir = -1; wait = 22; }
      else if (dir === -1 && n <= 0) { dir = 1; i = (i + 1) % examples.length; wait = 4; }
      setHint(`${prefix}${full.slice(0, Math.max(n, 0))}`);
    }, 55);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix, examples.join("|")]);
  return hint;
}
