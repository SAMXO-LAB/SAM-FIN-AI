import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { TOOLS, runTool } from "./tools";

export type Ev =
  | { t: "text"; d: string }
  | { t: "tool"; name: string }
  | { t: "done" }
  | { t: "error"; code: "busy" | "config" | "failed" };

export type Msg = { role: "user" | "assistant"; content: string };
const MAX_ROUNDS = 6;

export const assistantModel = () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

/** Runs the tool-using conversation and yields events for the browser. Nothing from the user's data is logged. */
export async function* runAssistant(opts: { system: string; messages: Msg[]; signal?: AbortSignal }): AsyncGenerator<Ev> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 45_000 });
  const convo: Anthropic.MessageParam[] = opts.messages.map((m) => ({ role: m.role, content: m.content }));
  let spoke = false;
  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const stream = client.messages.stream({
        model: assistantModel(),
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
    yield { t: "error", code: status === 429 || status === 529 || status === 503 ? "busy" : status === 401 || status === 403 || status === 404 ? "config" : "failed" };
  }
}
