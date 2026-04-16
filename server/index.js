import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { runPrdParser } from "./agents/prdParser.js";
import { runVisualHierarchy } from "./agents/visualHierarchy.js";
import { runUxCompliance } from "./agents/uxCompliance.js";
import { runCopyReviewer } from "./agents/copyReviewer.js";
import { runChecklistGen } from "./agents/checklistGen.js";
import { runLayoutScaffolder } from "./agents/layoutScaffolder.js";
import { runCopyWriter } from "./agents/copyWriter.js";
import { runReferenceRenderer } from "./agents/referenceRenderer.js";
import { resolveCredentials, DEFAULT_MODELS } from "./lib/provider.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "200mb" }));

// Health check — reports which providers have a server-side env key, so the
// client can know whether the user needs to supply their own via Settings.
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    env: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
    },
    defaultModels: DEFAULT_MODELS,
  });
});

// Resolve provider+key from the request, or fail with an SSE error frame.
function credentialsFromRequest(req) {
  const { provider, apiKey } = req.body || {};
  return resolveCredentials({ requestProvider: provider, requestKey: apiKey });
}

function setupSSE(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  return (event, data) => {
    res.write(`data: ${JSON.stringify({ event, ...data })}\n\n`);
  };
}

// Main review endpoint using Server-Sent Events
app.post("/api/review", async (req, res) => {
  const { prdText, screens, images: legacyImages, customPrompt = "" } = req.body;

  const resolvedScreens = screens
    ? screens
    : (legacyImages || []).map((url, i) => ({ index: i, label: `Screen ${i + 1}`, flowTag: null, url }));

  if (resolvedScreens.length === 0) {
    return res.status(400).json({ error: "At least one design image is required" });
  }

  let credentials;
  try {
    credentials = credentialsFromRequest(req);
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

    sendEvent("agent_start", { agent: "visual-hierarchy" });
    const hierarchyResult = await runVisualHierarchy({
      images, prdContext, screenManifest, customPrompt, credentials,
    });
    const hierarchyFindings = hierarchyResult.findings || [];
    sendEvent("agent_complete", { agent: "visual-hierarchy", result: hierarchyResult });

    sendEvent("agent_start", { agent: "ux-compliance" });
    const uxResult = await runUxCompliance({
      images, prdContext, hierarchyFindings, screenManifest, customPrompt, credentials,
    });
    const uxFindings = uxResult.findings || [];
    sendEvent("agent_complete", { agent: "ux-compliance", result: uxResult });

    sendEvent("agent_start", { agent: "copy-reviewer" });
    const copyResult = await runCopyReviewer({
      images, prdContext, screenManifest, customPrompt, credentials,
    });
    const copySuggestions = copyResult.suggestions || [];
    sendEvent("agent_complete", { agent: "copy-reviewer", result: copyResult });

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
app.post("/api/generate", async (req, res) => {
  const { prdText } = req.body;

  if (!prdText || prdText.trim().length === 0) {
    return res.status(400).json({ error: "PRD text is required for generation" });
  }

  let credentials;
  try {
    credentials = credentialsFromRequest(req);
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

app.listen(PORT, () => {
  const envProviders = [
    process.env.OPENAI_API_KEY && "OpenAI",
    process.env.ANTHROPIC_API_KEY && "Anthropic",
  ].filter(Boolean);
  console.log(`\n  DesignLens server running on http://localhost:${PORT}`);
  console.log(
    `  Env API keys: ${envProviders.length ? envProviders.join(", ") : "none (users must supply via UI)"}\n`
  );
});
