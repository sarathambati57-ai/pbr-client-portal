import { createBrowserClient } from "@supabase/ssr";

// Used inside components that run in the browser (forms, buttons, etc.)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
