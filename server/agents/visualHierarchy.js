import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { callModel } from "../lib/provider.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentPrompt = readFileSync(
  join(__dirname, "../prompts/visualHierarchy.txt"),
  "utf-8"
);
const highriseContext = readFileSync(
  join(__dirname, "../prompts/highrise-context.txt"),
  "utf-8"
);
const systemPrompt = `You are working with the following design system and copy guidelines:\n\n${highriseContext}\n\n${agentPrompt}`;

export async function runVisualHierarchy({ images, prdContext, screenManifest = "", customPrompt = "", credentials }) {
  const manifestSection = screenManifest
    ? `## Screen Manifest\nImages are provided in this order. Reference screens by number and label in your findings.\n${screenManifest}\n\n`
    : "";

  const userMessage = prdContext
    ? `${manifestSection}## PRD Context\n${JSON.stringify(prdContext, null, 2)}\n\n## Task\nAnalyze the attached design screenshot(s) for visual hierarchy and layout quality. Reference specific elements you can see, and tag each finding with the screen number(s) it applies to.`
    : `${manifestSection}## Task\nAnalyze the attached design screenshot(s) for visual hierarchy and layout quality. No PRD was provided — evaluate purely based on visual design principles: focal point clarity, visual weight distribution, spacing and density, alignment consistency, and readability. Reference specific elements you can see, and tag each finding with the screen number(s) it applies to.`;

  return await callModel({
    ...credentials,
    systemPrompt,
    userMessage,
    images,
    customInstructions: customPrompt,
  });
}
