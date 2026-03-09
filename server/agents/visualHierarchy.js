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
  const userMessage = `## PRD Context
${JSON.stringify(prdContext, null, 2)}

## Task
Analyze the attached design screenshot(s) for visual hierarchy and layout quality. Reference specific elements you can see.`;

  const result = await callClaude({
    systemPrompt,
    userMessage,
    images,
    customInstructions: customPrompt,
  });
  return result;
}
