import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { callClaude } from "../lib/claude.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentPrompt = readFileSync(
  join(__dirname, "../prompts/uxCompliance.txt"),
  "utf-8"
);
const highriseContext = readFileSync(
  join(__dirname, "../prompts/highrise-context.txt"),
  "utf-8"
);
const systemPrompt = `You are working with the following design system and copy guidelines:\n\n${highriseContext}\n\n${agentPrompt}`;

export async function runUxCompliance({
  images,
  prdContext,
  hierarchyFindings,
  customPrompt = "",
}) {
  const userMessage = prdContext
    ? `## PRD Context\n${JSON.stringify(prdContext, null, 2)}\n\n## Previous Visual Hierarchy Findings\n${JSON.stringify(hierarchyFindings, null, 2)}\n\n## Task\nEvaluate the attached design screenshot(s) for usability and UX compliance against the PRD requirements. Flag any unmet P0 requirements as errors.`
    : `## Previous Visual Hierarchy Findings\n${JSON.stringify(hierarchyFindings, null, 2)}\n\n## Task\nEvaluate the attached design screenshot(s) for usability and UX quality. No PRD was provided — evaluate based on established UX heuristics: clarity of purpose, affordances, navigation flow, cognitive load, feedback states, and consistency.`;

  const result = await callClaude({
    systemPrompt,
    userMessage,
    images,
    customInstructions: customPrompt,
  });
  return result;
}
