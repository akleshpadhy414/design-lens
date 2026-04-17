import { Router } from "express";
import { requireUser } from "../lib/auth.js";
import { saveKey, deleteKey, listKeysMeta } from "../lib/keystore.js";

const router = Router();

// Return metadata about the current user's stored keys. Never returns
// plaintext key material.
router.get("/keys", requireUser, async (req, res) => {
  try {
    const meta = await listKeysMeta(req.user.id);
    res.json(meta);
  } catch (err) {
    res.status(500).json({ error: "Failed to load keys" });
  }
});

// Save or replace a provider key for the current user.
// Body: { provider: "openai"|"anthropic", apiKey: "sk-..." }
router.post("/keys", requireUser, async (req, res) => {
  const { provider, apiKey } = req.body || {};
  if (provider !== "openai" && provider !== "anthropic") {
    return res.status(400).json({ error: "provider must be openai or anthropic" });
  }
  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 10) {
    return res.status(400).json({ error: "apiKey looks invalid" });
  }
  try {
    await saveKey(req.user.id, provider, apiKey);
    const meta = await listKeysMeta(req.user.id);
    res.json(meta);
  } catch (err) {
    res.status(500).json({ error: "Failed to save key" });
  }
});

router.delete("/keys/:provider", requireUser, async (req, res) => {
  const { provider } = req.params;
  if (provider !== "openai" && provider !== "anthropic") {
    return res.status(400).json({ error: "Unknown provider" });
  }
  try {
    await deleteKey(req.user.id, provider);
    const meta = await listKeysMeta(req.user.id);
    res.json(meta);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete key" });
  }
});

export default router;
