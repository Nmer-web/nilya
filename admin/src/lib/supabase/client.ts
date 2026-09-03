import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client. Only ever holds the publishable anon key — every privileged
 * read is gated by `is_admin()` in RLS, and every privileged write goes through
 * a SECURITY DEFINER RPC. There is no service-role key in this application.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
