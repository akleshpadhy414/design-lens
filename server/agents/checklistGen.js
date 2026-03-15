import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { callClaude } from "../lib/claude.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentPrompt = readFileSync(
  join(__dirname, "../prompts/checklistGen.txt"),
  "utf-8"
);
const highriseContext = readFileSync(
  join(__dirname, "../prompts/highrise-context.txt"),
  "utf-8"
);
const systemPrompt = `You are working with the following design system and copy guidelines:\n\n${highriseContext}\n\n${agentPrompt}`;

export async function runChecklistGen({
  hierarchyFindings,
  uxFindings,
  copySuggestions,
  customPrompt = "",
}) {
  const userMessage = `## Visual Hierarchy Findings
${JSON.stringify(hierarchyFindings, null, 2)}

## UX Compliance Findings
${JSON.stringify(uxFindings, null, 2)}

## Copy Review Suggestions
${JSON.stringify(copySuggestions, null, 2)}

## Task
Synthesize all findings above into a final design review checklist. Generate an overall summary and rate each checklist item.`;

  const result = await callClaude({
    systemPrompt,
    userMessage,
    customInstructions: customPrompt,
  });
  return result;
}
