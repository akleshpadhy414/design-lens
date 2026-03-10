import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { callClaude } from "../lib/claude.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const systemPrompt = readFileSync(
  join(__dirname, "../prompts/visualHierarchy.txt"),
  "utf-8"
);

export async function runVisualHierarchy({ images, prdContext, customPrompt = "" }) {
  const userMessage = prdContext
    ? `## PRD Context\n${JSON.stringify(prdContext, null, 2)}\n\n## Task\nAnalyze the attached design screenshot(s) for visual hierarchy and layout quality. Reference specific elements you can see.`
    : `## Task\nAnalyze the attached design screenshot(s) for visual hierarchy and layout quality. No PRD was provided — evaluate purely based on visual design principles: focal point clarity, visual weight distribution, spacing and density, alignment consistency, and readability. Reference specific elements you can see.`;

  const result = await callClaude({
    systemPrompt,
    userMessage,
    images,
    customInstructions: customPrompt,
  });
  return result;
}
