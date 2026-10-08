"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    setDark(attr ? attr === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    try { localStorage.setItem("sam.theme", next ? "dark" : "light"); } catch {}
  };
  return (
    <button className="icon-btn" onClick={toggle} aria-label="Toggle light and dark mode">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
