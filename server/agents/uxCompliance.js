import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { callClaude } from "../lib/claude.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const systemPrompt = readFileSync(
  join(__dirname, "../prompts/uxCompliance.txt"),
  "utf-8"
);

export async function runUxCompliance({
  images,
  prdContext,
  hierarchyFindings,
  customPrompt = "",
}) {
  const userMessage = `## PRD Context
${JSON.stringify(prdContext, null, 2)}

## Previous Visual Hierarchy Findings
${JSON.stringify(hierarchyFindings, null, 2)}

## Task
Evaluate the attached design screenshot(s) for usability and UX compliance against the PRD requirements. Flag any unmet P0 requirements as errors.`;

  const result = await callClaude({
    systemPrompt,
    userMessage,
    images,
    customInstructions: customPrompt,
  });
  return result;
}
