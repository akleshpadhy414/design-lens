/**
 * Serialize a review result (or a slice of one) to Markdown or JSON for download.
 * Sections: summary, hierarchy, usability, copy, checklist.
 */

const SEVERITY_LABEL = {
  high: "**HIGH**",
  medium: "**MED**",
  low: "low",
  error: "**ERROR**",
  warning: "**WARN**",
  success: "OK",
};

function sev(s) {
  if (!s) return "";
  return SEVERITY_LABEL[s.toLowerCase()] || s;
}

function screensRef(nums, screens = []) {
  if (!nums || nums.length === 0 || screens.length <= 1) return "";
  const labels = nums.map((n) => {
    const s = screens[n - 1];
    return s ? `#${n} ${s.label}` : `#${n}`;
  });
  return ` _(${labels.join(", ")})_`;
}

function toMarkdown(review, sections, screens = []) {
  const lines = [];
  lines.push(`# DesignLens review`);
  lines.push("");
  lines.push(`_Generated ${new Date().toLocaleString()}_`);
  lines.push("");

  if (screens.length > 0 && (sections.includes("summary") || sections.includes("all"))) {
    lines.push(`## Screens (${screens.length})`);
    screens.forEach((s, i) => {
      const tag = s.flowTag ? ` _[${s.flowTag}]_` : "";
      lines.push(`${i + 1}. **${s.label}**${tag}`);
    });
    lines.push("");
  }

  if (review.summary && (sections.includes("summary") || sections.includes("all"))) {
    lines.push(`## Summary`);
    lines.push(review.summary);
    lines.push("");
  }

  if (sections.includes("hierarchy") || sections.includes("all")) {
    lines.push(`## Visual hierarchy`);
    if (!review.hierarchy?.length) lines.push("_No findings._");
    review.hierarchy?.forEach((item) => {
      lines.push(`- ${sev(item.severity)} **${item.title}**${screensRef(item.screens, screens)}`);
      if (item.body) lines.push(`  - ${item.body}`);
      if (item.suggestion) lines.push(`  - _Suggestion:_ ${item.suggestion}`);
    });
    lines.push("");
  }

  if (sections.includes("usability") || sections.includes("all")) {
    lines.push(`## Usability & UX`);
    if (!review.usability?.length) lines.push("_No findings._");
    review.usability?.forEach((item) => {
      lines.push(`- ${sev(item.severity)} **${item.title}**${screensRef(item.screens, screens)}`);
      if (item.body) lines.push(`  - ${item.body}`);
      if (item.suggestion) lines.push(`  - _Suggestion:_ ${item.suggestion}`);
    });
    lines.push("");
  }

  if (sections.includes("copy") || sections.includes("all")) {
    lines.push(`## Copy suggestions`);
    if (!review.copySuggestions?.length) lines.push("_No suggestions._");
    review.copySuggestions?.forEach((row) => {
      lines.push(`- **${row.current}** → **${row.suggested}**${screensRef(row.screens, screens)}`);
      if (row.reason) lines.push(`  - ${row.reason}`);
    });
    lines.push("");
  }

  if (sections.includes("checklist") || sections.includes("all")) {
    lines.push(`## Checklist`);
    if (!review.checklist?.length) lines.push("_No checklist items._");
    review.checklist?.forEach((c) => {
      const icon = c.status === "success" ? "✅" : c.status === "warning" ? "⚠️" : c.status === "error" ? "❌" : "•";
      lines.push(`- ${icon} ${c.item}${c.note ? ` — ${c.note}` : ""}`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

function toJSON(review, sections, screens) {
  const out = {
    generatedAt: new Date().toISOString(),
    screens: screens.map((s, i) => ({ index: i + 1, label: s.label, flowTag: s.flowTag || null })),
  };
  if (sections.includes("summary") || sections.includes("all")) out.summary = review.summary;
  if (sections.includes("hierarchy") || sections.includes("all")) out.hierarchy = review.hierarchy;
  if (sections.includes("usability") || sections.includes("all")) out.usability = review.usability;
  if (sections.includes("copy") || sections.includes("all")) out.copySuggestions = review.copySuggestions;
  if (sections.includes("checklist") || sections.includes("all")) out.checklist = review.checklist;
  return JSON.stringify(out, null, 2);
}

/** Trigger a browser download of a text blob. */
export function download(filename, content, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download a review (or selected sections).
 * @param {"markdown"|"json"} format
 * @param {string[]} sections - ["all"] or subset of ["summary","hierarchy","usability","copy","checklist"]
 * @param {object} review
 * @param {object[]} screens
 */
export function exportReview(format, sections, review, screens = []) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const suffix = sections.includes("all") ? "full" : sections.join("-");
  if (format === "json") {
    download(
      `designlens-${suffix}-${stamp}.json`,
      toJSON(review, sections, screens),
      "application/json"
    );
  } else {
    download(
      `designlens-${suffix}-${stamp}.md`,
      toMarkdown(review, sections, screens),
      "text/markdown"
    );
  }
}
