import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { runAssistant } from "@/lib/assistant/run";
import { systemPrompt } from "@/lib/assistant/prompt";
import { takeMessage } from "@/lib/assistant/limit";
import { aiConfigured } from "@/lib/assistant/config";

export const runtime = "nodejs";
export const maxDuration = 60;

const body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) })).min(1).max(30),
});

const json = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  // Cookie-authenticated endpoint: only accept same-origin browser requests.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin) { try { if (new URL(origin).host !== host) return json(403, "forbidden"); } catch { return json(403, "forbidden"); } }

  if (!aiConfigured()) return json(503, "not_configured");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json(401, "unauthorized");

  let parsed;
  try { parsed = body.parse(await req.json()); } catch { return json(400, "bad_request"); }
  const msgs = parsed.messages.slice(-12);
  if (msgs[0].role !== "user") msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return json(400, "bad_request");

  if (!(await takeMessage(supabase, user.id))) return json(429, "daily_limit");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const raw = ((profile?.full_name as string | null) || "").trim().split(" ")[0] || "there";
  const system = systemPrompt({ firstName: raw.charAt(0).toUpperCase() + raw.slice(1), now: new Date() });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of runAssistant({ system, messages: msgs, signal: req.signal })) controller.enqueue(enc.encode(JSON.stringify(ev) + "\n"));
      } finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } });
}
