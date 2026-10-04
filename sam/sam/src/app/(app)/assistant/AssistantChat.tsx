"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Copy, Check, RotateCcw, Sparkles, Square } from "lucide-react";
import { Md } from "./Md";

type Turn = { id: number; role: "user" | "assistant"; content: string; tools: string[]; state?: "streaming" | "done" | "error"; error?: string };

const TOOL_LABEL: Record<string, string> = {
  get_overview: "Your overview", get_transactions: "Transactions", spending_summary: "Spending", get_loans: "Loans & EMIs", get_debts: "Money lent & borrowed",
  get_budgets: "Budgets", get_goals: "Goals", calculate_emi: "EMI calculator", simulate_prepayment: "Prepayment calculator",
};
const SUGGESTIONS = [
  "How am I doing this month?", "Where did most of my money go in the last 30 days?", "How much do I still owe on my loans?",
  "Who owes me money?", "Am I on track with my budgets?", "What EMI would a ₹5 lakh loan at 10.5% for 3 years be?",
];
const ERRORS: Record<string, string> = {
  not_configured: "Sam isn’t switched on for this site yet. The site owner needs to add an AI key.",
  daily_limit: "You’ve used today’s messages with Sam. Try again tomorrow.",
  unauthorized: "Your session has ended. Sign in again to keep chatting.",
  busy: "Sam is busy right now. Give it a moment and try again.",
  config: "Sam can’t reach its AI service. The site owner should check the AI key and model settings.",
  failed: "Something went wrong on my side. Please try again.",
};

export function AssistantChat({ firstName, configured }: { firstName: string; configured: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const idc = useRef(0);
  const stick = useRef(true);

  useEffect(() => {
    const el = log.current; if (!el || !stick.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
  }, [turns]);
  useEffect(() => { const a = area.current; if (!a) return; a.style.height = "auto"; a.style.height = Math.min(a.scrollHeight, 140) + "px"; }, [input]);
  useEffect(() => () => abort.current?.abort(), []);

  const patch = (id: number, f: (t: Turn) => Turn) => setTurns((ts) => ts.map((t) => (t.id === id ? f(t) : t)));

  const send = useCallback(async (text: string, history: Turn[]) => {
    const q = text.trim(); if (!q || busy) return;
    const uid = ++idc.current, aid = ++idc.current;
    const next: Turn[] = [...history, { id: uid, role: "user", content: q, tools: [] }, { id: aid, role: "assistant", content: "", tools: [], state: "streaming" }];
    setTurns(next); setInput(""); setBusy(true); stick.current = true;
    const ctrl = new AbortController(); abort.current = ctrl;
    const payload = next.slice(0, -1).filter((t) => t.content && t.state !== "error").map((t) => ({ role: t.role, content: t.content }));
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: payload }), signal: ctrl.signal });
      if (!res.ok || !res.body) {
        const code = (await res.json().catch(() => ({}))).error as string | undefined;
        patch(aid, (t) => ({ ...t, state: "error", error: ERRORS[code === "forbidden" || code === "bad_request" ? "failed" : code ?? "failed"] ?? ERRORS.failed }));
        return;
      }
      const reader = res.body.getReader(), dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1); if (!line) continue;
          let ev: { t: string; d?: string; name?: string; code?: string };
          try { ev = JSON.parse(line); } catch { continue; }
          if (ev.t === "text" && ev.d) patch(aid, (t) => ({ ...t, content: t.content + ev.d }));
          else if (ev.t === "tool" && ev.name) patch(aid, (t) => ({ ...t, tools: t.tools.includes(ev.name!) ? t.tools : [...t.tools, ev.name!] }));
          else if (ev.t === "error") patch(aid, (t) => ({ ...t, state: "error", error: ERRORS[ev.code ?? "failed"] ?? ERRORS.failed }));
          else if (ev.t === "done") patch(aid, (t) => (t.state === "error" ? t : { ...t, state: "done" }));
        }
      }
      patch(aid, (t) => (t.state === "streaming" ? { ...t, state: t.content ? "done" : "error", error: t.content ? undefined : ERRORS.failed } : t));
    } catch (e) {
      if ((e as Error).name === "AbortError") patch(aid, (t) => ({ ...t, state: "done" }));
      else patch(aid, (t) => ({ ...t, state: "error", error: ERRORS.failed }));
    } finally { setBusy(false); abort.current = null; area.current?.focus(); }
  }, [busy]);

  const retry = (aid: number) => {
    const i = turns.findIndex((t) => t.id === aid); if (i < 1) return;
    send(turns[i - 1].content, turns.slice(0, i - 1));
  };
  const copy = async (t: Turn) => { try { await navigator.clipboard.writeText(t.content); setCopied(t.id); setTimeout(() => setCopied(null), 1500); } catch { /* clipboard blocked */ } };
  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input, turns); } };
  const onScroll = () => { const el = log.current; if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; };

  return (
    <section className="chat card g3" aria-label="Chat with Sam">
      <div className="chat-log" ref={log} onScroll={onScroll} role="log" aria-live="polite" aria-relevant="additions text">
        {turns.length === 0 ? (
          <div className="chat-empty">
            <span className="ai-dot big"><Sparkles /></span>
            <h2 className="h2">Hi {firstName}, I’m Sam.</h2>
            <p className="muted">Ask me about your spending, balances, loans, budgets or goals. I only use what you’ve recorded, and I do the maths in code.</p>
            <div className="chat-sugg">
              {SUGGESTIONS.map((s) => <button key={s} type="button" className="chipbtn plain" onClick={() => send(s, [])} disabled={!configured || busy}>{s}</button>)}
            </div>
            {!configured && <div className="notice info" role="status">Sam isn’t switched on for this site yet. The site owner needs to add an AI key.</div>}
          </div>
        ) : turns.map((t) => t.role === "user" ? (
          <div key={t.id} className="bubble me">{t.content}</div>
        ) : (
          <div key={t.id} className="ai-row">
            <span className="ai-dot" aria-hidden="true"><Sparkles /></span>
            <div className="bubble ai">
              {t.tools.length > 0 && <div className="used" aria-label="Sam looked at">{t.tools.map((n) => <span key={n} className="tag calc">{TOOL_LABEL[n] ?? n}</span>)}</div>}
              {t.content ? <div className="md"><Md text={t.content} /></div> : t.state === "streaming" ? <span className="typing" aria-label="Sam is thinking"><i /><i /><i /></span> : null}
              {t.state === "error" && <div className="notice err" role="alert">{t.error}<button type="button" className="text-link xs" onClick={() => retry(t.id)}><RotateCcw size={12} /> Try again</button></div>}
              {t.state === "done" && t.content && (
                <div className="bubble-foot">
                  <button type="button" className="icon-btn sm" onClick={() => copy(t)} aria-label="Copy answer">{copied === t.id ? <Check size={14} /> : <Copy size={14} />}</button>
                  <span className="xs muted">From your recorded data. Check important figures.</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="chat-foot">
        <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send(input, turns); }}>
          <label className="sr" htmlFor="sam-input">Message Sam</label>
          <textarea id="sam-input" ref={area} className="input chat-input" rows={1} value={input} maxLength={2000} placeholder={configured ? "Ask Sam about your money…" : "Sam isn’t switched on yet"} disabled={!configured}
            onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} />
          {busy
            ? <button type="button" className="btn btn-glass chat-send" onClick={() => abort.current?.abort()} aria-label="Stop"><Square size={14} fill="currentColor" /></button>
            : <button type="submit" className="btn btn-primary chat-send" disabled={!input.trim() || !configured} aria-label="Send"><ArrowUp size={18} /></button>}
        </form>
        <p className="chat-note xs muted">Sam can make mistakes and isn’t a financial adviser. {turns.length > 0 && <button type="button" className="text-link xs" onClick={() => { abort.current?.abort(); setTurns([]); }}>New chat</button>}</p>
      </div>
    </section>
  );
}
