import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { callClaude } from "../lib/claude.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentPrompt = readFileSync(
  join(__dirname, "../prompts/referenceRenderer.txt"),
  "utf-8"
);
const highriseContext = readFileSync(
  join(__dirname, "../prompts/highrise-context.txt"),
  "utf-8"
);
const systemPrompt = `You are working with the following design system and copy guidelines:\n\n${highriseContext}\n\n${agentPrompt}`;

export async function runReferenceRenderer({ scaffold }) {
  const userMessage = `## Enriched Component Tree\n${JSON.stringify(scaffold, null, 2)}\n\n## Task\nRender this component tree as a self-contained HTML wireframe using Tailwind CDN. Every component in the tree must be visually represented.`;

  const result = await callClaude({
    systemPrompt,
    userMessage,
  });
  return result;
}
