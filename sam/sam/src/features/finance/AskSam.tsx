"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";

const QUICK = ["How am I doing this month?", "What is my Finance Book Score?", "Anything due this week?", "Where did my money go?"];

/** A quick question box. It opens Ask Sam with the question already sent; without script the form still works as a plain GET. */
export function AskSam({ firstName }: { firstName: string }) {
  const r = useRouter();
  const [q, setQ] = useState("");
  const go = (text: string) => { const t = text.trim(); if (t) r.push(`/assistant?q=${encodeURIComponent(t.slice(0, 500))}`); };
  return (
    <section className="ask g3" aria-label="Ask Sam">
      <div className="ask-top"><span className="ai-dot"><Sparkles size={16} /></span><div><b className="h3">Ask Sam</b><div className="xs muted">Quick answers about your money, from your own records</div></div></div>
      <form action="/assistant" method="get" className="ask-form" onSubmit={(e) => { e.preventDefault(); go(q); }}>
        <label className="sr" htmlFor="ask-sam-q">Ask Sam a question</label>
        <input id="ask-sam-q" name="q" className="input ask-input" value={q} maxLength={500} autoComplete="off" onChange={(e) => setQ(e.target.value)} placeholder={`Ask anything, ${firstName}. For example: how much did I spend on food?`} />
        <button type="submit" className="btn btn-primary ask-send" disabled={!q.trim()} aria-label="Ask Sam"><ArrowUp size={18} /></button>
      </form>
      <div className="ask-chips">{QUICK.map((s) => <button key={s} type="button" className="chipbtn plain" onClick={() => go(s)}>{s}</button>)}</div>
    </section>
  );
}
