import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cookie-less client for public, read-only data (directory pages).
// Uses the anon key, so Row Level Security still applies; no session means pages can be cached.
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
