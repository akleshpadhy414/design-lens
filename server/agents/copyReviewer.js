import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { callClaude } from "../lib/claude.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentPrompt = readFileSync(
  join(__dirname, "../prompts/copyReviewer.txt"),
  "utf-8"
);
const highriseContext = readFileSync(
  join(__dirname, "../prompts/highrise-context.txt"),
  "utf-8"
);
const systemPrompt = `You are working with the following design system and copy guidelines:\n\n${highriseContext}\n\n${agentPrompt}`;

export async function runCopyReviewer({ images, prdContext, screenManifest = "", customPrompt = "" }) {
  const manifestSection = screenManifest
    ? `## Screen Manifest\nImages are provided in this order. Reference screens by number and label in your suggestions.\n${screenManifest}\n\n`
    : "";

  const userMessage = prdContext
    ? `${manifestSection}## PRD Context\n${JSON.stringify(prdContext, null, 2)}\n\n## Task\nAnalyze all visible text in the attached screenshot(s) — labels, headers, descriptions, button text, column names, status labels, etc. Suggest concrete copy improvements with reasoning. Tag each suggestion with the screen number(s) it applies to.`
    : `${manifestSection}## Task\nAnalyze all visible text in the attached screenshot(s) — labels, headers, descriptions, button text, column names, status labels, etc. No PRD was provided — focus on clarity, scannability, action-orientation, and tone consistency within the UI itself. Suggest concrete copy improvements with reasoning. Tag each suggestion with the screen number(s) it applies to.`;

  const result = await callClaude({
    systemPrompt,
    userMessage,
    images,
    customInstructions: customPrompt,
  });
  return result;
}
