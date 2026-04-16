/**
 * API client for DesignLens backend.
 * Uses Server-Sent Events (SSE) via POST /api/review to stream agent progress.
 */

export const AGENTS = [
  {
    id: "prd-parser",
    name: "PRD Parser",
    icon: "FileText",
    description: "Extracting requirements, KPIs, edge cases & scope",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "visual-hierarchy",
    name: "Visual Hierarchy Analyst",
    icon: "Layout",
    description: "Analyzing focal points, spacing, weight & contrast",
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "ux-compliance",
    name: "UX Compliance Checker",
    icon: "Compass",
    description: "Checking affordances, flow, cognitive load & states",
    color: "from-orange-500 to-amber-500",
  },
  {
    id: "copy-reviewer",
    name: "Copy Reviewer",
    icon: "Type",
    description: "Evaluating labels, microcopy & terminology consistency",
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "checklist-gen",
    name: "Checklist Generator",
    icon: "ClipboardCheck",
    description: "Compiling final review checklist with severity ratings",
    color: "from-red-500 to-rose-500",
  },
];

export const GENERATE_AGENTS = [
  {
    id: "layout-scaffolder",
    name: "Layout Scaffolder",
    icon: "LayoutGrid",
    description: "Building component tree from PRD + design system",
    color: "from-violet-500 to-purple-500",
  },
  {
    id: "copy-writer",
    name: "Copy Writer",
    icon: "PenTool",
    description: "Filling in all UI text — labels, errors, empty states",
    color: "from-teal-500 to-cyan-500",
  },
  {
    id: "reference-renderer",
    name: "Reference Renderer",
    icon: "Monitor",
    description: "Generating visual HTML wireframe with Tailwind",
    color: "from-orange-500 to-red-500",
  },
];

/**
 * Check backend health
 */
export async function checkHealth() {
  try {
    const res = await fetch("/api/health");
    return await res.json();
  } catch {
    return { status: "error", message: "Backend not reachable" };
  }
}

/**
 * Start a design review via SSE.
 *
 * @param {Object} params
 * @param {string} params.prdText - The PRD text content
 * @param {Object[]} params.screens - Array of {index, label, flowTag, url} for design screenshots
 * @param {Function} params.onAgentStart - Called when an agent starts: (agentId) => void
 * @param {Function} params.onAgentComplete - Called when an agent completes: (agentId, result) => void
 * @param {Function} params.onComplete - Called when entire review is done: (fullResult) => void
 * @param {Function} params.onError - Called on error: (errorMessage) => void
 * @returns {Function} abort - Call to cancel the request
 */
export function startReview({ prdText, screens, customPrompt = "", credentials, onAgentStart, onAgentComplete, onComplete, onError }) {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prdText, screens, customPrompt, ...credentials }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        onError?.(errData.error || `Server error: ${res.status}`);
        return;
      }

      // Read SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            switch (event.event) {
              case "agent_start":
                onAgentStart?.(event.agent);
                break;
              case "agent_complete":
                onAgentComplete?.(event.agent, event.result);
                break;
              case "review_complete":
                onComplete?.(event.result);
                break;
              case "error":
                onError?.(event.message || "Unknown error");
                break;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        onError?.(err.message || "Network error");
      }
    }
  })();

  return () => controller.abort();
}

/**
 * Start a UI generation via SSE.
 *
 * @param {Object} params
 * @param {string} params.prdText - The PRD text content
 * @param {Function} params.onAgentStart - Called when an agent starts: (agentId) => void
 * @param {Function} params.onAgentComplete - Called when an agent completes: (agentId, result) => void
 * @param {Function} params.onComplete - Called when entire generation is done: (fullResult) => void
 * @param {Function} params.onError - Called on error: (errorMessage) => void
 * @returns {Function} abort - Call to cancel the request
 */
export function startGenerate({ prdText, credentials, onAgentStart, onAgentComplete, onComplete, onError }) {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prdText, ...credentials }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        onError?.(errData.error || `Server error: ${res.status}`);
        return;
      }

      // Read SSE stream
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
              case "agent_start":
                onAgentStart?.(event.agent);
                break;
              case "agent_complete":
                onAgentComplete?.(event.agent, event.result);
                break;
              case "generate_complete":
                onComplete?.(event.result);
                break;
              case "error":
                onError?.(event.message || "Unknown error");
                break;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        onError?.(err.message || "Network error");
      }
    }
  })();

  return () => controller.abort();
}
