import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

const PROTECTED = ["/dashboard", "/assistant", "/transactions", "/accounts", "/loans", "/lent", "/borrowed", "/budgets", "/goals", "/settings", "/onboarding"];
const AUTH_ONLY_GUESTS = ["/login", "/signup", "/forgot-password"];

export async function updateSession(request: NextRequest) {
  // Safety net: if Supabase falls back to the Site URL (redirect URL not on its allow-list) it lands on
  // "/?code=…". Hand that code to the real callback so the sign-in still completes.
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/" && searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    url.searchParams.set("next", "/dashboard");
    return NextResponse.redirect(url);
  }

  // Supabase reports a failed or repeated Google sign-in as "/?error=…" on the Site URL. Show the sign-in page with a message.
  if (pathname === "/" && (searchParams.has("error") || searchParams.has("error_code"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("error", "oauth");
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // getUser() revalidates the token with Supabase Auth; never trust getSession() on the server.
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (!user && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && AUTH_ONLY_GUESTS.includes(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
