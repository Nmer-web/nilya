import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts`; see
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
 *
 * This does two things and no more: it refreshes the Supabase session cookie,
 * and it bounces signed-out visitors to /login. The admin-role check is
 * deliberately NOT here — Next's own authentication guide warns that proxy runs
 * on every request including prefetches, so it should stay an optimistic check
 * rather than a database round trip. Authorisation happens in
 * `requireAdmin()`, which every dashboard page and every server action calls,
 * and ultimately in Postgres, where `is_admin()` gates each row.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and getUser: it refreshes the
  // auth token, and anything in between can leave the session half-written.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");

  if (!user && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
