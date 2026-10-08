import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/** Supabase client for Server Components, Server Actions and Route Handlers.
 *  Uses the signed-in user's session; every query is filtered by Row Level Security. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component: the middleware refreshes the session instead.
          }
        },
      },
    }
  );
}
