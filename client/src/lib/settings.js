/**
 * Client-side settings store backed by server-side encrypted key storage.
 * The only thing persisted in the browser is the user's preferred provider
 * (when they have both an OpenAI and an Anthropic key saved). Keys
 * themselves never touch the browser's storage.
 */
import { useSyncExternalStore, useCallback, useEffect } from "react";
import { apiGet, apiPost, apiDelete } from "./api.js";

const PREF_KEY = "designlens.preferredProvider.v1";

// ── In-memory cache of the latest metadata from the server ──
const emptyMeta = {
  openai: { set: false, last4: null, updatedAt: null },
  anthropic: { set: false, last4: null, updatedAt: null },
};

let state = {
  meta: emptyMeta,
  loading: false,
  loaded: false,
  error: null,
  preferredProvider: readPref(),
};

function readPref() {
  try {
    const v = localStorage.getItem(PREF_KEY);
    return v === "openai" || v === "anthropic" ? v : null;
  } catch {
    return null;
  }
}

function writePref(v) {
  try {
    if (v) localStorage.setItem(PREF_KEY, v);
    else localStorage.removeItem(PREF_KEY);
  } catch {}
}

const listeners = new Set();
function emit() {
  listeners.forEach((l) => l());
}
function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return state;
}

export async function refreshKeysMeta() {
  state = { ...state, loading: true, error: null };
  emit();
  try {
    const meta = await apiGet("/api/settings/keys");
    state = { ...state, meta, loading: false, loaded: true };
  } catch (err) {
    state = { ...state, loading: false, error: err.message || "Failed to load" };
  }
  emit();
}

export async function saveKey(provider, apiKey) {
  const meta = await apiPost("/api/settings/keys", { provider, apiKey });
  state = { ...state, meta, loaded: true, error: null };
  emit();
}

export async function removeKey(provider) {
  const meta = await apiDelete(`/api/settings/keys/${provider}`);
  state = { ...state, meta, error: null };
  // If we just removed the preferred provider, clear the preference.
  if (state.preferredProvider === provider) {
    state = { ...state, preferredProvider: null };
    writePref(null);
  }
  emit();
}

export function setPreferredProvider(v) {
  state = { ...state, preferredProvider: v };
  writePref(v);
  emit();
}

/**
 * Decide which provider to send with the next API call. The server still
 * makes the authoritative decision — this just lets the client show the
 * right badge and avoid sending ambiguous requests.
 */
export function resolveActiveProvider(snapshot) {
  const providers = [];
  if (snapshot.meta.openai.set) providers.push("openai");
  if (snapshot.meta.anthropic.set) providers.push("anthropic");
  if (providers.length === 0) return { ok: false, reason: "no-keys" };
  if (providers.length === 1) return { ok: true, provider: providers[0] };
  if (snapshot.preferredProvider && providers.includes(snapshot.preferredProvider)) {
    return { ok: true, provider: snapshot.preferredProvider };
  }
  return { ok: false, reason: "pick-provider" };
}

export function useKeysStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Ensure the metadata has been fetched at least once. Safe to call from
 * multiple components — dedupes via the `loaded` flag.
 */
export function useAutoLoadKeys() {
  const snap = useKeysStore();
  useEffect(() => {
    if (!snap.loaded && !snap.loading) refreshKeysMeta();
  }, [snap.loaded, snap.loading]);
}

export { state as _debugState };
