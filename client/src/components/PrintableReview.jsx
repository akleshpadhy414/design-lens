/**
 * Print-only view of a review. Rendered inside a `.print-only` wrapper in
 * ReviewResults — hidden on screen, unfolded for the browser's print dialog
 * so "Save as PDF" produces a clean, linear document.
 */

const FLOW_LABEL = {
  "happy-path": "Happy path",
  "error-state": "Error state",
  "empty-state": "Empty state",
  loading: "Loading",
  settings: "Settings",
};

const SEV_LABEL = {
  high: "HIGH",
  medium: "MED",
  low: "low",
};

const CHECK_LABEL = {
  success: "✓",
  warning: "⚠",
  error: "✕",
};

export default function PrintableReview({ review, screens = [] }) {
  if (!review) return null;
  const { summary, hierarchy = [], usability = [], copySuggestions = [], checklist = [] } = review;

  const ok = checklist.filter((c) => c.status === "success").length;
  const warn = checklist.filter((c) => c.status === "warning").length;
  const err = checklist.filter((c) => c.status === "error").length;

  return (
    <div style={{ color: "#111", fontFamily: "system-ui, sans-serif", fontSize: 12, lineHeight: 1.5 }}>
      <header style={{ borderBottom: "2px solid #111", paddingBottom: 8, marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, margin: 0, fontWeight: 700 }}>DesignLens review</h1>
        <p style={{ margin: "4px 0 0", color: "#555", fontSize: 11 }}>
          Generated {new Date().toLocaleString()} · {screens.length} screen{screens.length !== 1 ? "s" : ""} ·{" "}
          {checklist.length} checklist items ({ok} passing, {warn} attention, {err} issues)
        </p>
      </header>

      {screens.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <h2 style={sectionTitle}>Screens</h2>
          <ol style={{ paddingLeft: 18, margin: 0 }}>
            {screens.map((s, i) => (
              <li key={i} style={{ marginBottom: 2 }}>
                <strong>{s.label}</strong>
                {s.flowTag && (
                  <span style={tag}>{FLOW_LABEL[s.flowTag] || s.flowTag}</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {summary && (
        <section style={{ marginBottom: 16 }}>
          <h2 style={sectionTitle}>Summary</h2>
          <p style={{ margin: 0 }}>{summary}</p>
        </section>
      )}

      {hierarchy.length > 0 && (
        <Section title="Visual hierarchy" items={hierarchy} screens={screens} />
      )}
      {usability.length > 0 && (
        <Section title="Usability & UX" items={usability} screens={screens} />
      )}

      {copySuggestions.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <h2 style={sectionTitle}>Copy suggestions</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #999" }}>
                <th style={td}>Current</th>
                <th style={td}>Suggested</th>
                <th style={td}>Reason</th>
                {screens.length > 1 && <th style={td}>Screen</th>}
              </tr>
            </thead>
            <tbody>
              {copySuggestions.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #eee" }} className="print-break-inside-avoid">
                  <td style={{ ...td, color: "#a00" }}>{row.current}</td>
                  <td style={{ ...td, color: "#080" }}>{row.suggested}</td>
                  <td style={td}>{row.reason}</td>
                  {screens.length > 1 && (
                    <td style={td}>
                      {(row.screens || []).map((n) => `#${n}`).join(", ")}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {checklist.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <h2 style={sectionTitle}>Checklist</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {checklist.map((c, i) => (
              <li
                key={i}
                className="print-break-inside-avoid"
                style={{ padding: "4px 0", borderBottom: "1px dotted #ccc" }}
              >
                <span style={{ display: "inline-block", width: 14, fontWeight: 700 }}>
                  {CHECK_LABEL[c.status] || "•"}
                </span>
                <strong>{c.item}</strong>
                {c.note && <span style={{ color: "#555" }}> — {c.note}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Section({ title, items, screens }) {
  return (
    <section style={{ marginBottom: 16 }}>
      <h2 style={sectionTitle}>{title}</h2>
      {items.map((item, i) => (
        <div key={i} className="print-break-inside-avoid" style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
            {item.severity && (
              <span style={{ ...tag, background: "#eee", color: "#333" }}>
                {SEV_LABEL[item.severity?.toLowerCase()] || item.severity}
              </span>
            )}
            <strong style={{ fontSize: 12 }}>{item.title}</strong>
            {(item.screens || []).length > 0 && screens.length > 1 && (
              <span style={{ fontSize: 10, color: "#777" }}>
                — {(item.screens || []).map((n) => `#${n}`).join(", ")}
              </span>
            )}
          </div>
          {item.body && <p style={{ margin: "2px 0 0" }}>{item.body}</p>}
          {item.suggestion && (
            <p style={{ margin: "2px 0 0", color: "#034" }}>
              <em>Suggestion:</em> {item.suggestion}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}

const sectionTitle = {
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  color: "#333",
  borderBottom: "1px solid #999",
  paddingBottom: 3,
  marginBottom: 6,
  marginTop: 8,
};

const tag = {
  display: "inline-block",
  fontSize: 9,
  padding: "1px 6px",
  borderRadius: 3,
  background: "#eee",
  color: "#333",
  marginLeft: 6,
};

const td = { padding: "4px 6px", verticalAlign: "top" };
