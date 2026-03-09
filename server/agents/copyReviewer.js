import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { callClaude } from "../lib/claude.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const systemPrompt = readFileSync(
  join(__dirname, "../prompts/copyReviewer.txt"),
  "utf-8"
);

export async function runCopyReviewer({ images, prdContext, customPrompt = "" }) {
  const userMessage = `## PRD Context
${JSON.stringify(prdContext, null, 2)}

## Task
Analyze all visible text in the attached screenshot(s) — labels, headers, descriptions, button text, column names, status labels, etc. Suggest concrete copy improvements with reasoning.`;

  const result = await callClaude({
    systemPrompt,
    userMessage,
    images,
    customInstructions: customPrompt,
  });
  return result;
}
