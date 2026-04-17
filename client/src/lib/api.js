/**
 * API client for DesignLens backend.
 * - REST helpers for /api/settings/* (GET/POST/DELETE with JWT).
 * - SSE runners for /api/review and /api/generate, also JWT-authed.
 */
import { getAccessToken } from "./supabase.js";

export const AGENTS = [
  { id: "prd-parser", name: "PRD Parser", icon: "FileText",
    description: "Extracting requirements, KPIs, edge cases & scope",
    color: "from-blue-500 to-cyan-500" },
  { id: "visual-hierarchy", name: "Visual Hierarchy Analyst", icon: "Layout",
    description: "Analyzing focal points, spacing, weight & contrast",
    color: "from-purple-500 to-pink-500" },
  { id: "ux-compliance", name: "UX Compliance Checker", icon: "Compass",
    description: "Checking affordances, flow, cognitive load & states",
    color: "from-orange-500 to-amber-500" },
  { id: "copy-reviewer", name: "Copy Reviewer", icon: "Type",
    description: "Evaluating labels, microcopy & terminology consistency",
    color: "from-green-500 to-emerald-500" },
  { id: "checklist-gen", name: "Checklist Generator", icon: "ClipboardCheck",
    description: "Compiling final review checklist with severity ratings",
    color: "from-red-500 to-rose-500" },
];

export const GENERATE_AGENTS = [
  { id: "layout-scaffolder", name: "Layout Scaffolder", icon: "LayoutGrid",
    description: "Building component tree from PRD + design system",
    color: "from-violet-500 to-purple-500" },
  { id: "copy-writer", name: "Copy Writer", icon: "PenTool",
    description: "Filling in all UI text — labels, errors, empty states",
    color: "from-teal-500 to-cyan-500" },
  { id: "reference-renderer", name: "Reference Renderer", icon: "Monitor",
    description: "Generating visual HTML wireframe with Tailwind",
    color: "from-orange-500 to-red-500" },
];

async function authHeaders() {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet(path) {
  const res = await fetch(path, { headers: await authHeaders() });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  return await res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  return await res.json();
}

export async function apiDelete(path) {
  const res = await fetch(path, { method: "DELETE", headers: await authHeaders() });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  return await res.json();
}

export async function checkHealth() {
  try {
    const res = await fetch("/api/health");
    return await res.json();
  } catch {
    return { status: "error", message: "Backend not reachable" };
  }
}

async function streamSSE(path, body, handlers, controller) {
  const { onAgentStart, onAgentComplete, onComplete, onError, completionEvent } = handlers;
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      onError?.(errData.error || `Server error: ${res.status}`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        try {
          const event = JSON.parse(jsonStr);
          switch (event.event) {
            case "agent_start": onAgentStart?.(event.agent); break;
            case "agent_complete": onAgentComplete?.(event.agent, event.result); break;
            case "error": onError?.(event.message || "Unknown error"); break;
            default:
              if (event.event === completionEvent) onComplete?.(event.result);
          }
        } catch {
          // skip malformed JSON lines
        }
      }
    }
  } catch (err) {
    if (err.name !== "AbortError") onError?.(err.message || "Network error");
  }
}

export function startReview({
  prdText, screens, customPrompt = "", provider,
  onAgentStart, onAgentComplete, onComplete, onError,
}) {
  const controller = new AbortController();
  streamSSE(
    "/api/review",
    { prdText, screens, customPrompt, provider },
    { onAgentStart, onAgentComplete, onComplete, onError, completionEvent: "review_complete" },
    controller
  );
  return () => controller.abort();
}

export function startGenerate({
  prdText, provider,
  onAgentStart, onAgentComplete, onComplete, onError,
}) {
  const controller = new AbortController();
  streamSSE(
    "/api/generate",
    { prdText, provider },
    { onAgentStart, onAgentComplete, onComplete, onError, completionEvent: "generate_complete" },
    controller
  );
  return () => controller.abort();
}
