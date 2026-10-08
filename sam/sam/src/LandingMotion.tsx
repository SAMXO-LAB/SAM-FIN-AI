"use client";
import { useEffect } from "react";

/** Page-level motion for the marketing page: scroll reveals, progress bar, nav state, parallax, card spotlight.
 *  Renders nothing. Does nothing at all when the visitor prefers reduced motion. */
export function LandingMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;

    // stagger delays for [data-stagger] children
    document.querySelectorAll<HTMLElement>("[data-stagger]").forEach((p) => {
      Array.from(p.children).forEach((c, i) => (c as HTMLElement).style.setProperty("--d", `${i * 85}ms`));
    });

    // Anything already on screen is shown immediately (no flash); the rest waits to enter.
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const vh = window.innerHeight;
    els.forEach((el) => { if (el.getBoundingClientRect().top < vh * 0.9) el.classList.add("is-in"); });
    root.classList.add("motion-ready");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    els.filter((el) => !el.classList.contains("is-in")).forEach((el) => io.observe(el));

    // scroll progress, nav state, parallax
    const nav = document.querySelector<HTMLElement>(".lp-nav");
    let ticking = false;
    const onScroll = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY, max = root.scrollHeight - window.innerHeight;
        root.style.setProperty("--sp", String(max > 0 ? Math.min(1, y / max) : 0));
        root.style.setProperty("--sy", String(Math.round(y)));
        nav?.classList.toggle("scrolled", y > 24);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // cursor spotlight on glass cards
    let last: HTMLElement | null = null;
    const onMove = (e: PointerEvent) => {
      const t = (e.target as HTMLElement | null)?.closest<HTMLElement>(".spot");
      if (!t) return; last = t;
      const r = t.getBoundingClientRect();
      t.style.setProperty("--px", `${e.clientX - r.left}px`);
      t.style.setProperty("--py", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      io.disconnect(); window.removeEventListener("scroll", onScroll); document.removeEventListener("pointermove", onMove);
      root.classList.remove("motion-ready"); root.style.removeProperty("--sp"); root.style.removeProperty("--sy"); void last;
    };
  }, []);
  return null;
}
