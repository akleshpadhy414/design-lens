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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.OPENAI_API_KEY,
  });
});

// Main review endpoint using Server-Sent Events
app.post("/api/review", async (req, res) => {
  const { prdText, screens, images: legacyImages, customPrompt = "" } = req.body;

  // Support both new screens format and legacy flat images array
  const resolvedScreens = screens
    ? screens
    : (legacyImages || []).map((url, i) => ({ index: i, label: `Screen ${i + 1}`, flowTag: null, url }));

  if (resolvedScreens.length === 0) {
    return res.status(400).json({
      error: "At least one design image is required",
    });
  }

  const images = resolvedScreens.map((s) => s.url);
  const screenManifest = resolvedScreens
    .map((s, i) => `${i + 1}. "${s.label}"${s.flowTag ? ` [${s.flowTag}]` : ""}`)
    .join("\n");

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error:
        "OPENAI_API_KEY not configured. Copy .env.example to .env and add your key.",
    });
  }

  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`data: ${JSON.stringify({ event, ...data })}\n\n`);
  };

  try {
    // ─── Agent 1: PRD Parser (skipped when no PRD provided) ───
    let prdContext = null;
    if (prdText && prdText.trim().length > 0) {
      sendEvent("agent_start", { agent: "prd-parser" });
      prdContext = await runPrdParser({ prdText, customPrompt });
      sendEvent("agent_complete", { agent: "prd-parser", result: prdContext });
    }

    // ─── Agent 2: Visual Hierarchy ───
    sendEvent("agent_start", { agent: "visual-hierarchy" });
    const hierarchyResult = await runVisualHierarchy({ images, prdContext, screenManifest, customPrompt });
    const hierarchyFindings = hierarchyResult.findings || [];
    sendEvent("agent_complete", {
      agent: "visual-hierarchy",
      result: hierarchyResult,
    });

    // ─── Agent 3: UX Compliance ───
    sendEvent("agent_start", { agent: "ux-compliance" });
    const uxResult = await runUxCompliance({
      images,
      prdContext,
      hierarchyFindings,
      screenManifest,
      customPrompt,
    });
    const uxFindings = uxResult.findings || [];
    sendEvent("agent_complete", {
      agent: "ux-compliance",
      result: uxResult,
    });

    // ─── Agent 4: Copy Reviewer ───
    sendEvent("agent_start", { agent: "copy-reviewer" });
    const copyResult = await runCopyReviewer({ images, prdContext, screenManifest, customPrompt });
    const copySuggestions = copyResult.suggestions || [];
    sendEvent("agent_complete", {
      agent: "copy-reviewer",
      result: copyResult,
    });

    // ─── Agent 5: Checklist Generator ───
    sendEvent("agent_start", { agent: "checklist-gen" });
    const checklistResult = await runChecklistGen({
      hierarchyFindings,
      uxFindings,
      copySuggestions,
      screenManifest,
      customPrompt,
    });
    sendEvent("agent_complete", {
      agent: "checklist-gen",
      result: checklistResult,
    });

    // ─── Final combined result ───
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
    console.error("Review pipeline error:", error);
    sendEvent("error", {
      message: error.message || "An error occurred during the review",
    });
  } finally {
    res.end();
  }
});

// Generate endpoint — PRD to UI spec via SSE
app.post("/api/generate", async (req, res) => {
  const { prdText } = req.body;

  if (!prdText || prdText.trim().length === 0) {
    return res.status(400).json({
      error: "PRD text is required for generation",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error:
        "OPENAI_API_KEY not configured. Copy .env.example to .env and add your key.",
    });
  }

  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`data: ${JSON.stringify({ event, ...data })}\n\n`);
  };

  try {
    // ─── Agent 1: Layout Scaffolder ───
    sendEvent("agent_start", { agent: "layout-scaffolder" });
    const scaffoldResult = await runLayoutScaffolder({ prdText });
    const scaffold = scaffoldResult.scaffold || scaffoldResult;
    sendEvent("agent_complete", { agent: "layout-scaffolder", result: scaffoldResult });

    // ─── Agent 2: Copy Writer ───
    sendEvent("agent_start", { agent: "copy-writer" });
    const copyResult = await runCopyWriter({ prdText, scaffold });
    const enrichedScaffold = copyResult.scaffold || copyResult;
    const copyNotes = copyResult.copyNotes || "";
    sendEvent("agent_complete", { agent: "copy-writer", result: copyResult });

    // ─── Agent 3: Reference Renderer ───
    sendEvent("agent_start", { agent: "reference-renderer" });
    const renderResult = await runReferenceRenderer({ scaffold: enrichedScaffold });
    const html = renderResult.html || renderResult.raw || "";
    sendEvent("agent_complete", { agent: "reference-renderer", result: renderResult });

    // ─── Final combined result ───
    const finalResult = {
      scaffold: enrichedScaffold,
      copyNotes,
      html,
    };

    sendEvent("generate_complete", { result: finalResult });
  } catch (error) {
    console.error("Generate pipeline error:", error);
    sendEvent("error", {
      message: error.message || "An error occurred during generation",
    });
  } finally {
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`\n  DesignLens server running on http://localhost:${PORT}`);
  console.log(
    `  API Key: ${process.env.OPENAI_API_KEY ? "configured" : "NOT SET — add to .env"}\n`
  );
});
