import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// DANGER: this client uses the SECRET key and bypasses all security rules.
// Only ever import this inside app/api/*/route.ts files (server-only code).
// Never import this into any file that runs in the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}
