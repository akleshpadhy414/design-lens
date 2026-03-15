import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { callClaude } from "../lib/claude.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentPrompt = readFileSync(
  join(__dirname, "../prompts/prdParser.txt"),
  "utf-8"
);
const highriseContext = readFileSync(
  join(__dirname, "../prompts/highrise-context.txt"),
  "utf-8"
);
const systemPrompt = `You are working with the following design system and copy guidelines:\n\n${highriseContext}\n\n${agentPrompt}`;

export async function runPrdParser({ prdText, customPrompt = "" }) {
  const result = await callClaude({
    systemPrompt,
    userMessage: `Here is the PRD to analyze:\n\n${prdText}`,
    customInstructions: customPrompt,
  });
  return result;
}
