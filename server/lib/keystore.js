import { supabaseAdmin } from "./supabase.js";
import { encrypt, decrypt, last4 } from "./crypto.js";

const PROVIDERS = ["openai", "anthropic"];

function assertProvider(provider) {
  if (!PROVIDERS.includes(provider)) {
    throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Save a user's plaintext API key. Encrypts before storing; keeps only the
 * last 4 chars in plaintext for display.
 */
export async function saveKey(userId, provider, plaintext) {
  assertProvider(provider);
  if (!plaintext || typeof plaintext !== "string") {
    throw new Error("API key must be a non-empty string");
  }
  const { ct, iv, tag } = encrypt(plaintext.trim());
  const now = new Date().toISOString();

  const patch = {
    user_id: userId,
    [`${provider}_ct`]: ct,
    [`${provider}_iv`]: iv,
    [`${provider}_tag`]: tag,
    [`${provider}_last4`]: last4(plaintext),
    [`${provider}_updated_at`]: now,
    updated_at: now,
  };

  const { error } = await supabaseAdmin()
    .from("user_api_keys")
    .upsert(patch, { onConflict: "user_id" });
  if (error) throw new Error(`Failed to save key: ${error.message}`);
}

/**
 * Fetch and decrypt a user's key for a given provider. Returns null if not set.
 */
export async function getKey(userId, provider) {
  assertProvider(provider);
  const { data, error } = await supabaseAdmin()
    .from("user_api_keys")
    .select(`${provider}_ct, ${provider}_iv, ${provider}_tag`)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch key: ${error.message}`);
  if (!data) return null;
  const ct = data[`${provider}_ct`];
  const iv = data[`${provider}_iv`];
  const tag = data[`${provider}_tag`];
  if (!ct || !iv || !tag) return null;
  return decrypt({ ct, iv, tag });
}

/**
 * Remove a user's key for one provider. Leaves the other provider alone.
 */
export async function deleteKey(userId, provider) {
  assertProvider(provider);
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin()
    .from("user_api_keys")
    .update({
      [`${provider}_ct`]: null,
      [`${provider}_iv`]: null,
      [`${provider}_tag`]: null,
      [`${provider}_last4`]: null,
      [`${provider}_updated_at`]: null,
      updated_at: now,
    })
    .eq("user_id", userId);
  if (error) throw new Error(`Failed to delete key: ${error.message}`);
}

/**
 * Return metadata about which keys are set, suitable for the client UI.
 * Never includes decrypted key material.
 */
export async function listKeysMeta(userId) {
  const { data, error } = await supabaseAdmin()
    .from("user_api_keys")
    .select(
      "openai_last4, openai_updated_at, anthropic_last4, anthropic_updated_at"
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load keys: ${error.message}`);
  const row = data || {};
  return {
    openai: {
      set: !!row.openai_last4,
      last4: row.openai_last4 || null,
      updatedAt: row.openai_updated_at || null,
    },
    anthropic: {
      set: !!row.anthropic_last4,
      last4: row.anthropic_last4 || null,
      updatedAt: row.anthropic_updated_at || null,
    },
  };
}
