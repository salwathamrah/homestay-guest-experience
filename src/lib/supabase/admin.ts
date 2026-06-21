import { createClient } from "@supabase/supabase-js";

// Server-only. Bypasses RLS — never import this from a Client Component,
// and never send its key to the browser. Used for the guest-session flow
// (guests aren't Supabase Auth users) and for admin write operations.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
