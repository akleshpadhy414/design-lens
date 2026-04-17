import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

// Storage choice: localStorage (persistent) unless the user opted into a
// session-only login, recorded in sessionStorage to survive hydration.
const SESSION_ONLY_FLAG = "designlens.sessionOnly";

function pickStorage() {
  try {
    if (window.sessionStorage.getItem(SESSION_ONLY_FLAG) === "1") {
      return window.sessionStorage;
    }
  } catch {}
  return window.localStorage;
}

export function setSessionOnly(on) {
  try {
    if (on) {
      window.sessionStorage.setItem(SESSION_ONLY_FLAG, "1");
    } else {
      window.sessionStorage.removeItem(SESSION_ONLY_FLAG);
    }
  } catch {}
}

export function isSessionOnly() {
  try {
    return window.sessionStorage.getItem(SESSION_ONLY_FLAG) === "1";
  } catch {
    return false;
  }
}

export const supabase = createClient(url, anon, {
  auth: {
    storage: pickStorage(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Return the current session's access token, or null if not signed in.
 * Used by the API layer to attach Authorization: Bearer headers.
 */
export async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}
