import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { TOOLS, runTool } from "./tools";
import { aiChain, type AiConfig } from "./config";

export type Ev =
  | { t: "text"; d: string }
  | { t: "tool"; name: string }
  | { t: "done" }
  | { t: "error"; code: "busy" | "config" | "failed" };

export type Msg = { role: "user" | "assistant"; content: string };
const MAX_ROUNDS = 6;

type Opts = { system: string; messages: Msg[]; signal?: AbortSignal };
const codeFor = (status?: number, body = ""): "busy" | "config" | "failed" =>
  status === 429 || status === 529 || status === 503 ? "busy"
  : status === 401 || status === 403 || status === 404 || (status === 400 && /api[ _-]?key|permission|not found|unauthor/i.test(body)) ? "config"
  : "failed";

/** Runs the tool-using conversation and yields events for the browser. Nothing from the user's data is logged. */
export async function* runAssistant(opts: Opts): AsyncGenerator<Ev> {
  const chain = aiChain();
  if (!chain.length) { yield { t: "error", code: "config" }; return; }
  const codes: ("busy" | "config" | "failed")[] = [];
  for (let i = 0; i < chain.length; i++) {
    const cfg = { ...chain[i], retry: i === chain.length - 1 }; // only the last candidate waits and retries
    let spoke = false, failed: "busy" | "config" | "failed" | null = null;
    for await (const ev of cfg.provider === "anthropic" ? runAnthropic(cfg, opts) : runOpenAICompatible(cfg, opts)) {
      if (ev.t === "error") { failed = ev.code; break; }
      if (ev.t === "text") spoke = true;
      yield ev;
    }
    if (!failed) return;
    // Once an answer has started streaming we cannot switch; otherwise quietly try the next model.
    if (spoke || i === chain.length - 1 || opts.signal?.aborted) {
      codes.push(failed);
      yield { t: "error", code: codes.includes("busy") ? "busy" : codes[0] };
      return;
    }
    codes.push(failed);
  }
}

async function* runAnthropic(cfg: AiConfig, opts: Opts): AsyncGenerator<Ev> {
  const client = new Anthropic({ apiKey: cfg.key, maxRetries: 1, timeout: 45_000 });
  const convo: Anthropic.MessageParam[] = opts.messages.map((m) => ({ role: m.role, content: m.content }));
  let spoke = false;
  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const stream = client.messages.stream({
        model: cfg.model,
        max_tokens: 1024,
        system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
        tools: TOOLS as unknown as Anthropic.Tool[],
        messages: convo,
      }, { signal: opts.signal });

      let sep = spoke;
      for await (const ev of stream) {
        if (ev.type === "content_block_delta" && ev.delta.type === "text_delta" && ev.delta.text) {
          if (sep) { yield { t: "text", d: "\n\n" }; sep = false; }
          spoke = true;
          yield { t: "text", d: ev.delta.text };
        }
      }
      const msg = await stream.finalMessage();
      convo.push({ role: "assistant", content: msg.content });
      if (msg.stop_reason !== "tool_use") break;

      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const b of msg.content) {
        if (b.type !== "tool_use") continue;
        yield { t: "tool", name: b.name };
        results.push({ type: "tool_result", tool_use_id: b.id, content: `<data>\n${await runTool(b.name, b.input)}\n</data>` });
      }
      convo.push({ role: "user", content: results });
      if (round === MAX_ROUNDS - 1) yield { t: "text", d: "\n\nI hit my limit for looking things up in one go. Ask me again, a bit more specifically." };
    }
    yield { t: "done" };
  } catch (e) {
    if (opts.signal?.aborted) return;
    const status = (e as { status?: number })?.status;
    console.error("[assistant]", cfg.provider, status ?? (e as Error)?.name);
    yield { t: "error", code: codeFor(status) };
  }
}

// ---- Gemini / Groq (OpenAI-style chat completions) -------------------------------------------

type Call = { id: string; name: string; args: string; extra?: unknown };
type ChatMsg = Record<string, unknown>;
const stripSchema = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(stripSchema)
  : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== "additionalProperties").map(([k, x]) => [k, stripSchema(x)]))
  : v;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const OPENAI_TOOLS = TOOLS.map((t) => ({
  type: "function",
  function: {
    name: t.name,
    description: t.description,
    // tools without inputs get no schema at all; some providers reject empty object schemas
    ...(Object.keys(t.input_schema.properties).length ? { parameters: stripSchema(t.input_schema) } : {}),
  },
}));

async function post(cfg: AiConfig, body: unknown, signal?: AbortSignal): Promise<Response> {
  const url = new URL("chat/completions", cfg.baseURL!.endsWith("/") ? cfg.baseURL : cfg.baseURL + "/").toString();
  for (let attempt = 0; ; attempt++) {
    const timeout = AbortSignal.timeout(50_000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (res.ok) return res;
    const text = await res.text().catch(() => "");
    if (attempt === 0 && cfg.retry !== false && (res.status === 429 || res.status === 503)) { await sleep(1500); continue; }
    throw Object.assign(new Error("provider error"), { status: res.status, body: text.slice(0, 300) });
  }
}

async function* runOpenAICompatible(cfg: AiConfig, opts: Opts): AsyncGenerator<Ev> {
  const convo: ChatMsg[] = [{ role: "system", content: opts.system }, ...opts.messages.map((m) => ({ role: m.role, content: m.content }))];
  let spoke = false;
  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const res = await post(cfg, {
        model: cfg.model, messages: convo, tools: OPENAI_TOOLS, stream: true,
        ...(cfg.provider === "groq" ? { max_tokens: 1024 } : {}),
      }, opts.signal);

      const calls: Call[] = [];
      let text = "";
      let sep = spoke;
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      const handle = function* (line: string): Generator<Ev> {
        if (!line.startsWith("data:")) return;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") return;
        let j: { choices?: { delta?: { content?: string | null; tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string }; extra_content?: unknown }[] } }[] };
        try { j = JSON.parse(data); } catch { return; }
        const d = j.choices?.[0]?.delta;
        if (!d) return;
        if (typeof d.content === "string" && d.content) {
          if (sep) { yield { t: "text", d: "\n\n" }; sep = false; }
          spoke = true; text += d.content;
          yield { t: "text", d: d.content };
        }
        for (const tc of d.tool_calls ?? []) {
          let c = tc.id ? calls.find((x) => x.id === tc.id) : undefined;
          if (!c && !tc.id) c = tc.index != null ? calls[tc.index] : calls[calls.length - 1];
          // a name arriving for a slot that already has one means a new call (providers differ on indexes)
          if (c && tc.function?.name && c.name && c.name !== "" && !tc.id) c = undefined;
          if (!c) { c = { id: tc.id || `c${round}i${calls.length}xxxxxxxxx`.slice(0, 9), name: "", args: "" }; calls.push(c); }
          if (tc.function?.name) c.name = tc.function.name;
          if (tc.function?.arguments) c.args += tc.function.arguments;
          if (tc.extra_content) c.extra = tc.extra_content;
        }
      };
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const l of lines) yield* handle(l.trim());
      }
      if (buf.trim()) yield* handle(buf.trim());

      const used = calls.filter((c) => c.name);
      if (!used.length) break;
      convo.push({
        role: "assistant", content: text || null,
        tool_calls: used.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.args || "{}" }, ...(c.extra ? { extra_content: c.extra } : {}) })),
      });
      for (const c of used) {
        yield { t: "tool", name: c.name };
        let input: unknown = {};
        try { input = JSON.parse(c.args || "{}"); } catch { /* bad arguments from the model: run with defaults */ }
        convo.push({ role: "tool", tool_call_id: c.id, content: `<data>\n${await runTool(c.name, input)}\n</data>` });
      }
      if (round === MAX_ROUNDS - 1) yield { t: "text", d: "\n\nI hit my limit for looking things up in one go. Ask me again, a bit more specifically." };
    }
    yield { t: "done" };
  } catch (e) {
    if (opts.signal?.aborted) return;
    const x = e as { status?: number; body?: string; name?: string };
    console.error("[assistant]", cfg.provider, cfg.model, x.status ?? x.name, x.body ?? "");
    yield { t: "error", code: codeFor(x.status, x.body) };
  }
}
