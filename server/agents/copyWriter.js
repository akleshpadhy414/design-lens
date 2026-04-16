import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { callModel } from "../lib/provider.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentPrompt = readFileSync(
  join(__dirname, "../prompts/copyWriter.txt"),
  "utf-8"
);
const highriseContext = readFileSync(
  join(__dirname, "../prompts/highrise-context.txt"),
  "utf-8"
);
const systemPrompt = `You are working with the following design system and copy guidelines:\n\n${highriseContext}\n\n${agentPrompt}`;

export async function runCopyWriter({ prdText, scaffold, credentials }) {
  const userMessage = `## PRD\n${prdText}\n\n## Component Tree from Layout Scaffolder\n${JSON.stringify(scaffold, null, 2)}\n\n## Task\nFill in all placeholder text with production-ready UI copy. Return the complete component tree with all strings filled in.`;

  return await callModel({
    ...credentials,
    systemPrompt,
    userMessage,
  });
}
