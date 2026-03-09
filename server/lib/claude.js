import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Call OpenAI with a system prompt + user message.
 * Supports text-only and vision (text + images) calls.
 * Always requests JSON output.
 */
export async function callClaude({ systemPrompt, userMessage, images = [], customInstructions = "" }) {
  const content = [];

  // Add images first (if any)
  for (const img of images) {
    // img should be a base64 data URL like "data:image/png;base64,..."
    if (img.startsWith("data:image/")) {
      content.push({
        type: "image_url",
        image_url: { url: img },
      });
    }
  }

  // Add text message
  content.push({ type: "text", text: userMessage });

  const fullSystemPrompt = customInstructions
    ? `${systemPrompt}\n\n## Additional Instructions from Reviewer\n${customInstructions}`
    : systemPrompt;

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      { role: "system", content: fullSystemPrompt },
      { role: "user", content },
    ],
  });

  const text = response.choices[0].message.content || "";

  // Try to parse as JSON
  try {
    // Look for JSON in code blocks first
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    // Try parsing the whole response
    return JSON.parse(text);
  } catch {
    // If not valid JSON, return as raw text
    return { raw: text };
  }
}
