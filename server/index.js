import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { runPrdParser } from "./agents/prdParser.js";
import { runVisualHierarchy } from "./agents/visualHierarchy.js";
import { runUxCompliance } from "./agents/uxCompliance.js";
import { runCopyReviewer } from "./agents/copyReviewer.js";
import { runChecklistGen } from "./agents/checklistGen.js";
import { runLayoutScaffolder } from "./agents/layoutScaffolder.js";
import { runCopyWriter } from "./agents/copyWriter.js";
import { runReferenceRenderer } from "./agents/referenceRenderer.js";
import { DEFAULT_MODELS } from "./lib/provider.js";
import { requireUser } from "./lib/auth.js";
import { getKey, listKeysMeta } from "./lib/keystore.js";
import settingsRouter from "./routes/settings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from the repo root so server and Vite share one file.
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const isProduction = process.env.NODE_ENV === "production";

// Fail fast if required env is missing — better than a half-broken runtime.
const REQUIRED_ENV = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "MASTER_KEY"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`FATAL: ${key} env var is required.`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "200mb" }));

// Baseline security headers.
// NOTE: `req.body` must never be logged — it contains user-supplied content
// and historically transported API keys. Any future request-logging
// middleware must redact body fields.
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
});

// Health check — public, no auth required.
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    auth: "supabase",
    defaultModels: DEFAULT_MODELS,
  });
});

// Settings routes (all require auth).
app.use("/api/settings", settingsRouter);

function setupSSE(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  return (event, data) => {
    res.write(`data: ${JSON.stringify({ event, ...data })}\n\n`);
  };
}

/**
 * Resolve the stored provider+key for the authenticated user. Picks the
 * requested provider if supplied and that key is saved; otherwise picks
 * whichever single provider the user has. Errors if neither is set or if
 * both are set and no provider was chosen.
 */
async function resolveUserCredentials(userId, requestedProvider) {
  const meta = await listKeysMeta(userId);
  const available = [];
  if (meta.openai.set) available.push("openai");
  if (meta.anthropic.set) available.push("anthropic");

  if (available.length === 0) {
    throw new Error("No API keys saved. Add one in Settings.");
  }

  let provider;
  if (requestedProvider && available.includes(requestedProvider)) {
    provider = requestedProvider;
  } else if (available.length === 1) {
    provider = available[0];
  } else {
    throw new Error("Multiple keys saved — pick a provider in Settings.");
  }

  const apiKey = await getKey(userId, provider);
  if (!apiKey) throw new Error(`Stored ${provider} key could not be read`);
  return { provider, apiKey };
}

// Main review endpoint using Server-Sent Events
app.post("/api/review", requireUser, async (req, res) => {
  const { prdText, screens, images: legacyImages, customPrompt = "", provider, focus = "full" } = req.body;
  const includeVisual = focus === "full" || focus === "visual";
  const includeCopy = focus === "full" || focus === "copy";

  const resolvedScreens = screens
    ? screens
    : (legacyImages || []).map((url, i) => ({ index: i, label: `Screen ${i + 1}`, flowTag: null, url }));

  if (resolvedScreens.length === 0) {
    return res.status(400).json({ error: "At least one design image is required" });
  }

  let credentials;
  try {
    credentials = await resolveUserCredentials(req.user.id, provider);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const images = resolvedScreens.map((s) => s.url);
  const screenManifest = resolvedScreens
    .map((s, i) => `${i + 1}. "${s.label}"${s.flowTag ? ` [${s.flowTag}]` : ""}`)
    .join("\n");

  const sendEvent = setupSSE(res);

  try {
    let prdContext = null;
    if (prdText && prdText.trim().length > 0) {
      sendEvent("agent_start", { agent: "prd-parser" });
      prdContext = await runPrdParser({ prdText, customPrompt, credentials });
      sendEvent("agent_complete", { agent: "prd-parser", result: prdContext });
    }

    // Visual and copy tracks are independent — run them in parallel. Each
    // track is skipped entirely when the user picks a focus mode.
    const visualPromise = includeVisual
      ? (() => {
          sendEvent("agent_start", { agent: "visual-hierarchy" });
          const hp = runVisualHierarchy({
            images, prdContext, screenManifest, customPrompt, credentials,
          }).then((result) => {
            sendEvent("agent_complete", { agent: "visual-hierarchy", result });
            return result;
          });
          // UX Compliance depends on hierarchy; start as soon as VH is done.
          return hp.then(async (hierarchyResult) => {
            sendEvent("agent_start", { agent: "ux-compliance" });
            const uxResult = await runUxCompliance({
              images,
              prdContext,
              hierarchyFindings: hierarchyResult.findings || [],
              screenManifest,
              customPrompt,
              credentials,
            });
            sendEvent("agent_complete", { agent: "ux-compliance", result: uxResult });
            return { hierarchyResult, uxResult };
          });
        })()
      : Promise.resolve({
          hierarchyResult: { findings: [] },
          uxResult: { findings: [] },
        });

    const copyPromise = includeCopy
      ? (() => {
          sendEvent("agent_start", { agent: "copy-reviewer" });
          return runCopyReviewer({
            images, prdContext, screenManifest, customPrompt, credentials,
          }).then((result) => {
            sendEvent("agent_complete", { agent: "copy-reviewer", result });
            return result;
          });
        })()
      : Promise.resolve({ suggestions: [] });

    const [{ hierarchyResult, uxResult }, copyResult] = await Promise.all([
      visualPromise,
      copyPromise,
    ]);
    const hierarchyFindings = hierarchyResult.findings || [];
    const uxFindings = uxResult.findings || [];
    const copySuggestions = copyResult.suggestions || [];

    sendEvent("agent_start", { agent: "checklist-gen" });
    const checklistResult = await runChecklistGen({
      hierarchyFindings, uxFindings, copySuggestions, screenManifest, customPrompt, credentials,
    });
    sendEvent("agent_complete", { agent: "checklist-gen", result: checklistResult });

    const finalResult = {
      summary: checklistResult.summary || prdContext?.summary || "",
      hierarchy: hierarchyFindings,
      usability: uxFindings,
      copySuggestions,
      checklist: checklistResult.checklist || [],
      prdContext,
    };

    sendEvent("review_complete", { result: finalResult });
  } catch (error) {
    console.error("Review pipeline error:", error.message);
    sendEvent("error", { message: error.message || "An error occurred during the review" });
  } finally {
    res.end();
  }
});

// Generate endpoint — PRD to UI spec via SSE
app.post("/api/generate", requireUser, async (req, res) => {
  const { prdText, provider } = req.body;

  if (!prdText || prdText.trim().length === 0) {
    return res.status(400).json({ error: "PRD text is required for generation" });
  }

  let credentials;
  try {
    credentials = await resolveUserCredentials(req.user.id, provider);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const sendEvent = setupSSE(res);

  try {
    sendEvent("agent_start", { agent: "layout-scaffolder" });
    const scaffoldResult = await runLayoutScaffolder({ prdText, credentials });
    const scaffold = scaffoldResult.scaffold || scaffoldResult;
    sendEvent("agent_complete", { agent: "layout-scaffolder", result: scaffoldResult });

    sendEvent("agent_start", { agent: "copy-writer" });
    const copyResult = await runCopyWriter({ prdText, scaffold, credentials });
    const enrichedScaffold = copyResult.scaffold || copyResult;
    const copyNotes = copyResult.copyNotes || "";
    sendEvent("agent_complete", { agent: "copy-writer", result: copyResult });

    sendEvent("agent_start", { agent: "reference-renderer" });
    const renderResult = await runReferenceRenderer({ scaffold: enrichedScaffold, credentials });
    const html = renderResult.html || renderResult.raw || "";
    sendEvent("agent_complete", { agent: "reference-renderer", result: renderResult });

    sendEvent("generate_complete", {
      result: { scaffold: enrichedScaffold, copyNotes, html },
    });
  } catch (error) {
    console.error("Generate pipeline error:", error.message);
    sendEvent("error", { message: error.message || "An error occurred during generation" });
  } finally {
    res.end();
  }
});

// ─── Production: serve the built client from the same origin ───
if (isProduction) {
  const clientDist = path.resolve(__dirname, "../client/dist");
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`\n  DesignLens server running on port ${PORT} (${isProduction ? "production" : "dev"})`);
  console.log(`  Auth: Supabase  |  Key storage: server-side (AES-256-GCM)\n`);
});
