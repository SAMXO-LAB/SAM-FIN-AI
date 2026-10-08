import { createClient } from "@/lib/supabase/server";
import { MAX_RECEIPT_CHARS, parsePhoto } from "@/lib/avatar";

export const runtime = "nodejs";

/** Returns one receipt image to its owner. Row Level Security means anyone else gets "not found". */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const none = (status: number, text: string) => new Response(text, { status, headers: { "Cache-Control": "no-store" } });
  if (!/^[0-9a-f-]{36}$/.test(id)) return none(404, "Not found");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return none(401, "Unauthorized");
  const { data } = await supabase.from("transaction_receipts").select("mime, data").eq("id", id).maybeSingle();
  const img = data ? parsePhoto(`data:${data.mime};base64,${data.data}`, MAX_RECEIPT_CHARS + 100) : null;
  if (!img) return none(404, "Not found");
  return new Response(new Uint8Array(img.bytes), {
    headers: {
      "Content-Type": img.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Disposition": "inline",
    },
  });
}
