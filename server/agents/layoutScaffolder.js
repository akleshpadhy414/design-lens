import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { callModel } from "../lib/provider.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentPrompt = readFileSync(
  join(__dirname, "../prompts/layoutScaffolder.txt"),
  "utf-8"
);
const highriseContext = readFileSync(
  join(__dirname, "../prompts/highrise-context.txt"),
  "utf-8"
);
const systemPrompt = `You are working with the following design system and copy guidelines:\n\n${highriseContext}\n\n${agentPrompt}`;

export async function runLayoutScaffolder({ prdText, credentials }) {
  const userMessage = `## PRD\n${prdText}\n\n## Task\nGenerate a component tree for the UI described in this PRD using only Highrise components.`;

  return await callModel({
    ...credentials,
    systemPrompt,
    userMessage,
  });
}
