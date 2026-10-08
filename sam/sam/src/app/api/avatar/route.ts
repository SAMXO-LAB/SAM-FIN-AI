import { createClient } from "@/lib/supabase/server";
import { parsePhoto } from "@/lib/avatar";

export const runtime = "nodejs";

/** Returns the signed-in user's own uploaded photo (and nobody else's). */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  const { data } = await supabase.from("profiles").select("avatar_kind, avatar_data").eq("id", user.id).maybeSingle();
  const photo = data?.avatar_kind === "photo" && data.avatar_data ? parsePhoto(data.avatar_data) : null;
  if (!photo) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.mime,
      // The URL carries a version (?v=…) that changes whenever the photo does.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
