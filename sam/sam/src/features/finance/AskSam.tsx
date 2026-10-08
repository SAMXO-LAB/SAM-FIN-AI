"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";

const EXAMPLES = ["how much did I spend on food?", "what is my Finance Book Score?", "when does my next EMI fall due?", "can I afford a ₹20,000 purchase?", "who owes me money?", "how can I save more this month?"];
const QUICK = ["How am I doing this month?", "What is my Finance Book Score?", "Anything due this week?", "Where did my money go?"];

/** A quick question box. It opens Ask Sam with the question already sent; without script the form still works as a plain GET. */
export function AskSam({ firstName }: { firstName: string }) {
  const r = useRouter();
  const [q, setQ] = useState("");
  // The placeholder types out example questions, like other AI apps. It stops while you type and for people who prefer reduced motion.
  const [hint, setHint] = useState(`Ask anything, ${firstName}. For example: ${EXAMPLES[0]}`);
  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0, n = 0, dir = 1, wait = 0;
    const t = setInterval(() => {
      if (wait > 0) { wait--; return; }
      const full = EXAMPLES[i];
      n += dir;
      if (dir === 1 && n >= full.length) { dir = -1; wait = 22; }
      else if (dir === -1 && n <= 0) { dir = 1; i = (i + 1) % EXAMPLES.length; wait = 4; }
      setHint(`Ask anything, ${firstName}. For example: ${full.slice(0, Math.max(n, 0))}`);
    }, 55);
    return () => clearInterval(t);
  }, [firstName]);
  const go = (text: string) => { const t = text.trim(); if (t) r.push(`/assistant?q=${encodeURIComponent(t.slice(0, 500))}`); };
  return (
    <section className="ask g3" aria-label="Ask Sam">
      <div className="ask-top"><span className="ai-dot"><Sparkles size={16} /></span><div><b className="h3">Ask Sam</b><div className="xs muted">Quick answers about your money, from your own records</div></div></div>
      <form action="/assistant" method="get" className="ask-form" onSubmit={(e) => { e.preventDefault(); go(q); }}>
        <label className="sr" htmlFor="ask-sam-q">Ask Sam a question</label>
        <div className="ask-field">
          <input id="ask-sam-q" name="q" className="input ask-input" value={q} maxLength={500} autoComplete="off" onChange={(e) => setQ(e.target.value)} placeholder={hint} />
        </div>
        <button type="submit" className="btn btn-primary ask-send" disabled={!q.trim()} aria-label="Ask Sam"><ArrowUp size={18} /></button>
      </form>
      <div className="ask-chips">{QUICK.map((s) => <button key={s} type="button" className="chipbtn plain" onClick={() => go(s)}>{s}</button>)}</div>
    </section>
  );
}
