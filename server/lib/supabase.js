import { createClient } from "@supabase/supabase-js";

let cached = null;

/**
 * Server-only Supabase client using the service_role key. Bypasses RLS and
 * is used for all reads/writes to `user_api_keys`. Never ship this key to
 * the browser.
 */
export function supabaseAdmin() {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
