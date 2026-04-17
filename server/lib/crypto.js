import crypto from "crypto";

/**
 * AES-256-GCM helpers for encrypting user API keys at rest.
 * Master key is read from MASTER_KEY env — must be 32 bytes, base64-encoded.
 */

const ALGO = "aes-256-gcm";

let cachedKey = null;

function getKey() {
  if (cachedKey) return cachedKey;
  const raw = process.env.MASTER_KEY;
  if (!raw) throw new Error("MASTER_KEY env var is required");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      `MASTER_KEY must decode to 32 bytes (got ${buf.length}). Generate with: openssl rand -base64 32`
    );
  }
  cachedKey = buf;
  return buf;
}

export function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ct: ct.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decrypt({ ct, iv, tag }) {
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(ct, "base64")),
    decipher.final(),
  ]);
  return pt.toString("utf8");
}

export function last4(apiKey) {
  const trimmed = (apiKey || "").trim();
  return trimmed.length <= 4 ? "" : trimmed.slice(-4);
}
