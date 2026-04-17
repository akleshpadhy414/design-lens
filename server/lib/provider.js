import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export const DEFAULT_MODELS = {
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-6",
};

const MAX_TOKENS = 4096;

function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
  if (!match) return null;
  return { media_type: match[1], data: match[2] };
}

function extractJson(text) {
  if (!text) return { raw: "" };
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : text.trim();
  try {
    return JSON.parse(candidate);
  } catch {
    return { raw: text };
  }
}

async function callOpenAI({ apiKey, model, systemPrompt, userMessage, images }) {
  const client = new OpenAI({ apiKey });
  const content = [];
  for (const img of images) {
    if (typeof img === "string" && img.startsWith("data:image/")) {
      content.push({ type: "image_url", image_url: { url: img } });
    }
  }
  content.push({ type: "text", text: userMessage });

  const response = await client.chat.completions.create({
    model: model || DEFAULT_MODELS.openai,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content },
    ],
  });
  return response.choices[0].message.content || "";
}

async function callAnthropic({ apiKey, model, systemPrompt, userMessage, images }) {
  const client = new Anthropic({ apiKey });
  const content = [];
  for (const img of images) {
    if (typeof img !== "string") continue;
    const parsed = parseDataUrl(img);
    if (!parsed) continue;
    content.push({
      type: "image",
      source: { type: "base64", media_type: parsed.media_type, data: parsed.data },
    });
  }
  content.push({ type: "text", text: userMessage });

  const response = await client.messages.create({
    model: model || DEFAULT_MODELS.anthropic,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text : "";
}

/**
 * Unified model call. Routes to OpenAI or Anthropic based on provider.
 * Always returns parsed JSON (or `{ raw: text }` if the response isn't JSON).
 *
 * @param {Object} params
 * @param {"openai"|"anthropic"} params.provider
 * @param {string} params.apiKey
 * @param {string} [params.model]
 * @param {string} params.systemPrompt
 * @param {string} params.userMessage
 * @param {string[]} [params.images] - base64 data URLs
 * @param {string} [params.customInstructions]
 */
export async function callModel({
  provider,
  apiKey,
  model,
  systemPrompt,
  userMessage,
  images = [],
  customInstructions = "",
}) {
  if (!provider) throw new Error("provider is required (openai or anthropic)");
  if (!apiKey) throw new Error(`Missing API key for ${provider}`);

  const fullSystemPrompt = customInstructions
    ? `${systemPrompt}\n\n## Additional Instructions from Reviewer\n${customInstructions}`
    : systemPrompt;

  const args = { apiKey, model, systemPrompt: fullSystemPrompt, userMessage, images };
  const text =
    provider === "anthropic" ? await callAnthropic(args) : await callOpenAI(args);
  return extractJson(text);
}

