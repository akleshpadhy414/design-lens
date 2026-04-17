import { supabaseAdmin } from "./supabase.js";

/**
 * Express middleware: reads `Authorization: Bearer <jwt>`, verifies it
 * against Supabase, and attaches { id, email } to req.user. 401s otherwise.
 */
export async function requireUser(req, res, next) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    const { data, error } = await supabaseAdmin().auth.getUser(match[1]);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    req.user = { id: data.user.id, email: data.user.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Auth verification failed" });
  }
}
