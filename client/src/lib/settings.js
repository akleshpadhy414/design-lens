/**
 * User settings (API keys + provider choice) — persisted in localStorage.
 * Keys never leave the user's browser except in the request body to our own
 * backend. Nothing is ever logged or stored server-side.
 */
import { useSyncExternalStore, useCallback } from "react";

const STORAGE_KEY = "designlens.settings.v1";

const defaults = {
  openaiKey: "",
  anthropicKey: "",
  preferredProvider: null, // "openai" | "anthropic" | null (auto)
};

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

const listeners = new Set();
let cache = read();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function write(next) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
  notify();
}

export function getSettings() {
  return cache;
}

export function setSettings(patch) {
  write({ ...cache, ...patch });
}

export function clearKeys() {
  write({ ...defaults });
}

/**
 * Decide which provider/key to send with the next API request.
 *
 * @param {{ env: { openai: boolean, anthropic: boolean } | null }} health
 * @returns {{ ok: true, provider: "openai"|"anthropic", apiKey?: string }
 *         | { ok: false, reason: string, needsSelection?: boolean }}
 *
 * apiKey is omitted when we want the server to use its env key.
 */
export function resolveActiveCredential(settings, health) {
  const available = {
    openai: !!settings.openaiKey || !!health?.env?.openai,
    anthropic: !!settings.anthropicKey || !!health?.env?.anthropic,
  };

  const providers = Object.entries(available)
    .filter(([, v]) => v)
    .map(([k]) => k);

  if (providers.length === 0) {
    return { ok: false, reason: "no-keys" };
  }

  let provider;
  if (providers.length === 1) {
    provider = providers[0];
  } else if (settings.preferredProvider && providers.includes(settings.preferredProvider)) {
    provider = settings.preferredProvider;
  } else {
    return { ok: false, reason: "pick-provider", needsSelection: true };
  }

  const userKey = provider === "openai" ? settings.openaiKey : settings.anthropicKey;
  return userKey ? { ok: true, provider, apiKey: userKey } : { ok: true, provider };
}

export function useSettings() {
  const snapshot = useSyncExternalStore(subscribe, getSettings, getSettings);
  const update = useCallback((patch) => setSettings(patch), []);
  return [snapshot, update];
}
