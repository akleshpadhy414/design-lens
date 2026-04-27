import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { callModel } from "../lib/provider.js";

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

const FOCUS_INSTRUCTION = {
  full:
    "Include all four checklist sections from the prompt: Visual Hierarchy & Layout, Usability & UX, Design System Compliance, and Copy Guidelines Compliance.",
  visual:
    "FOCUS MODE = visual. The reviewer is intentionally skipping copy on this run. " +
    "Include ONLY: Visual Hierarchy & Layout, Usability & UX, and Design System Compliance. " +
    "DO NOT emit any Copy Guidelines Compliance items — no items about sentence case, button labels, error message tone, copy formatting, or any other text-quality concerns. " +
    "Keep the Flow Coverage section if the screen manifest has flow tags.",
  copy:
    "FOCUS MODE = copy. The reviewer is intentionally skipping the visual + UX agents on this run. " +
    "Include ONLY: Copy Guidelines Compliance (and Flow Coverage if flow tags are present). " +
    "DO NOT emit Visual Hierarchy & Layout, Usability & UX, or Design System Compliance items — no items about layout, hierarchy, components, color tokens, button variants, modal/drawer choices, or any non-copy concern. " +
    "The summary should focus exclusively on copy strengths and issues.",
};

export async function runChecklistGen({
  hierarchyFindings,
  uxFindings,
  copySuggestions,
  screenManifest = "",
  customPrompt = "",
  credentials,
  focus = "full",
}) {
  const manifestSection = screenManifest
    ? `## Screen Manifest\n${screenManifest}\n\n`
    : "";
  const focusInstruction =
    FOCUS_INSTRUCTION[focus] || FOCUS_INSTRUCTION.full;

  const userMessage = `${manifestSection}## Focus
${focusInstruction}

## Visual Hierarchy Findings
${JSON.stringify(hierarchyFindings, null, 2)}

## UX Compliance Findings
${JSON.stringify(uxFindings, null, 2)}

## Copy Review Suggestions
${JSON.stringify(copySuggestions, null, 2)}

## Task
Synthesize the findings into a final design review checklist that respects the Focus instruction above. Generate an overall summary and rate each checklist item. If a screen manifest with flow tags is provided, include a "Flow Coverage" section evaluating whether key states are represented (happy path, error, empty, loading).`;

  return await callModel({
    ...credentials,
    systemPrompt,
    userMessage,
    customInstructions: customPrompt,
  });
}
