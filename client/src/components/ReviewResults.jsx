import { useState, useMemo, useCallback } from "react";
import {
  Search,
  Layout,
  Compass,
  Type,
  ClipboardCheck,
  Zap,
  Coffee,
  Monitor,
  Layers,
  List,
  Copy as CopyIcon,
  Check as CheckIcon,
  Maximize2,
} from "lucide-react";
import SeverityBadge from "./SeverityBadge.jsx";
import ChecklistItem from "./ChecklistItem.jsx";
import ScreenLightbox, { useLightbox } from "./ScreenLightbox.jsx";
import DownloadMenu from "./DownloadMenu.jsx";

const FLOW_TAG_COLORS = {
  "happy-path": "bg-emerald-100 text-emerald-700",
  "error-state": "bg-red-100 text-red-700",
  "empty-state": "bg-amber-100 text-amber-700",
  "loading": "bg-blue-100 text-blue-700",
  "settings": "bg-purple-100 text-purple-700",
};

export default function ReviewResults({ review, onStartNew, screens = [] }) {
  const [activeTab, setActiveTab] = useState("hierarchy");
  const [viewMode, setViewMode] = useState("all"); // "all" | "by-screen" | "by-flow"
  const lightbox = useLightbox();

  const openScreen = useCallback((i) => lightbox.openAt(i), [lightbox]);

  if (!review) return null;

  const { summary, hierarchy = [], usability = [], copySuggestions = [], checklist = [] } = review;

  const errorCount = checklist.filter((c) => c.status === "error").length;
  const warningCount = checklist.filter((c) => c.status === "warning").length;
  const successCount = checklist.filter((c) => c.status === "success").length;
  const totalCount = checklist.length;

  const hasMultipleScreens = screens.length > 1;
  const hasFlowTags = screens.some((s) => s.flowTag);

  const tabs = [
    { id: "hierarchy", label: "Visual Hierarchy", icon: Layout },
    { id: "usability", label: "Usability & UX", icon: Compass },
    { id: "copy", label: "Copy Suggestions", icon: Type },
    { id: "checklist", label: "Checklist", icon: ClipboardCheck },
  ];

  // Get findings for current tab
  const currentFindings = activeTab === "hierarchy" ? hierarchy : activeTab === "usability" ? usability : [];

  // Group findings by screen
  const findingsByScreen = useMemo(() => {
    if (!hasMultipleScreens) return {};
    const grouped = {};
    screens.forEach((s, i) => {
      grouped[i + 1] = [];
    });
    currentFindings.forEach((item) => {
      const screenNums = item.screens || [];
      if (screenNums.length === 0) {
        // No screen attribution — add to all
        screens.forEach((_, i) => {
          if (grouped[i + 1]) grouped[i + 1].push(item);
        });
      } else {
        screenNums.forEach((num) => {
          if (grouped[num]) grouped[num].push(item);
        });
      }
    });
    return grouped;
  }, [currentFindings, screens, hasMultipleScreens]);

  // Group findings by flow tag
  const findingsByFlow = useMemo(() => {
    if (!hasFlowTags) return {};
    const grouped = {};
    screens.forEach((s, i) => {
      const tag = s.flowTag || "untagged";
      if (!grouped[tag]) grouped[tag] = { screens: [], findings: [] };
      grouped[tag].screens.push({ ...s, screenNum: i + 1 });
    });
    currentFindings.forEach((item) => {
      const screenNums = item.screens || [];
      const addedToFlows = new Set();
      screenNums.forEach((num) => {
        const screen = screens[num - 1];
        if (screen) {
          const tag = screen.flowTag || "untagged";
          if (!addedToFlows.has(tag)) {
            grouped[tag]?.findings.push(item);
            addedToFlows.add(tag);
          }
        }
      });
      if (screenNums.length === 0) {
        Object.keys(grouped).forEach((tag) => grouped[tag].findings.push(item));
      }
    });
    return grouped;
  }, [currentFindings, screens, hasFlowTags]);

  // Group copy suggestions by screen
  const copyByScreen = useMemo(() => {
    if (!hasMultipleScreens) return {};
    const grouped = {};
    screens.forEach((_, i) => { grouped[i + 1] = []; });
    copySuggestions.forEach((row) => {
      const screenNums = row.screens || [];
      if (screenNums.length === 0) {
        screens.forEach((_, i) => grouped[i + 1].push(row));
      } else {
        screenNums.forEach((num) => {
          if (grouped[num]) grouped[num].push(row);
        });
      }
    });
    return grouped;
  }, [copySuggestions, screens, hasMultipleScreens]);

  return (
    <div>
      {/* Screens rail — click to preview full-size */}
      {screens.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Monitor size={14} className="text-gray-400" />
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Screens ({screens.length})
            </h3>
            <span className="text-[11px] text-gray-400">— click to preview</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {screens.map((s, i) => (
              <button
                key={i}
                onClick={() => openScreen(i)}
                className="shrink-0 group relative"
                title={`${i + 1}. ${s.label}`}
              >
                <img
                  src={s.url}
                  alt={s.label}
                  className="h-20 w-auto max-w-[140px] object-cover rounded-lg border border-gray-200 group-hover:border-blue-400 transition-colors"
                />
                <div className="absolute top-1 left-1 text-[10px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">
                  {i + 1}
                </div>
                <div className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity">
                  <Maximize2 size={16} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Score summary */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="col-span-1 bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {totalCount}
          </div>
          <p className="text-xs text-gray-500">Total checks</p>
        </div>
        <div className="col-span-1 bg-emerald-50 rounded-xl border border-emerald-200 p-5">
          <div className="text-3xl font-bold text-emerald-600 mb-1">
            {successCount}
          </div>
          <p className="text-xs text-emerald-600">Passing</p>
        </div>
        <div className="col-span-1 bg-amber-50 rounded-xl border border-amber-200 p-5">
          <div className="text-3xl font-bold text-amber-600 mb-1">
            {warningCount}
          </div>
          <p className="text-xs text-amber-600">Needs attention</p>
        </div>
        <div className="col-span-1 bg-red-50 rounded-xl border border-red-200 p-5">
          <div className="text-3xl font-bold text-red-600 mb-1">
            {errorCount}
          </div>
          <p className="text-xs text-red-600">Significant issues</p>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Search size={16} className="text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Summary</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Tabs + View Mode Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* View mode toggle — only show when multiple screens */}
        {hasMultipleScreens && activeTab !== "checklist" && (
          <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("all")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                viewMode === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <List size={11} /> All
            </button>
            <button
              onClick={() => setViewMode("by-screen")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                viewMode === "by-screen" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Monitor size={11} /> By screen
            </button>
            {hasFlowTags && (
              <button
                onClick={() => setViewMode("by-flow")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  viewMode === "by-flow" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Layers size={11} /> By flow
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="space-y-4">
        {/* ═══ Hierarchy & Usability tabs ═══ */}
        {(activeTab === "hierarchy" || activeTab === "usability") && (
          <>
            {viewMode === "all" && currentFindings.map((item, i) => (
              <FindingCard key={i} item={item} screens={screens} onOpenScreen={openScreen} />
            ))}

            {viewMode === "by-screen" && hasMultipleScreens && (
              Object.entries(findingsByScreen).map(([screenNum, findings]) => {
                const screen = screens[screenNum - 1];
                if (!screen) return null;
                return (
                  <ScreenGroup
                    key={screenNum}
                    screen={screen}
                    screenNum={parseInt(screenNum)}
                    findings={findings}
                    onOpenScreen={openScreen}
                  />
                );
              })
            )}

            {viewMode === "by-flow" && hasFlowTags && (
              Object.entries(findingsByFlow).map(([tag, { screens: flowScreens, findings }]) => (
                <FlowGroup key={tag} tag={tag} screens={flowScreens} findings={findings} onOpenScreen={openScreen} />
              ))
            )}
          </>
        )}

        {/* ═══ Copy tab ═══ */}
        {activeTab === "copy" && (
          <>
            {viewMode === "all" && (
              <CopyTable suggestions={copySuggestions} screens={screens} onOpenScreen={openScreen} />
            )}

            {viewMode === "by-screen" && hasMultipleScreens && (
              Object.entries(copyByScreen).map(([screenNum, suggestions]) => {
                const screen = screens[screenNum - 1];
                if (!screen || suggestions.length === 0) return null;
                return (
                  <div key={screenNum}>
                    <ScreenHeader screen={screen} screenNum={parseInt(screenNum)} onOpenScreen={openScreen} />
                    <CopyTable suggestions={suggestions} screens={screens} compact onOpenScreen={openScreen} />
                  </div>
                );
              })
            )}

            {viewMode === "by-flow" && hasFlowTags && (
              Object.entries(findingsByFlow).map(([tag, { screens: flowScreens }]) => {
                const flowSuggestions = copySuggestions.filter((row) => {
                  const nums = row.screens || [];
                  return nums.length === 0 || nums.some((n) => flowScreens.some((s) => s.screenNum === n));
                });
                if (flowSuggestions.length === 0) return null;
                return (
                  <div key={tag}>
                    <FlowHeader tag={tag} screenCount={flowScreens.length} />
                    <CopyTable suggestions={flowSuggestions} screens={screens} compact onOpenScreen={openScreen} />
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ═══ Checklist tab ═══ */}
        {activeTab === "checklist" && (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {checklist.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                No checklist items generated.
              </div>
            ) : (
              checklist.map((item, i) => (
                <ChecklistItem
                  key={i}
                  item={item.item}
                  note={item.note}
                  status={item.status}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          onClick={onStartNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Zap size={16} /> Start New Review
        </button>
        <div className="flex items-center gap-3">
          <DownloadMenu review={review} screens={screens} />
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
            <Coffee size={14} />
            <span>Reviewed by {review.prdContext ? "5" : "4"} AI agents</span>
          </div>
        </div>
      </div>

      <ScreenLightbox
        screens={screens}
        index={lightbox.index}
        onClose={lightbox.close}
        onChange={lightbox.setIndex}
      />
    </div>
  );
}

// ─── Screen badges shown on finding cards; clickable to open the lightbox ───
function ScreenBadges({ screenNums = [], screens = [], onOpenScreen }) {
  if (!screenNums.length || screens.length <= 1) return null;
  return (
    <div className="flex gap-1 flex-wrap">
      {screenNums.map((num) => {
        const screen = screens[num - 1];
        const label = screen ? screen.label : `Screen ${num}`;
        const classes =
          "inline-flex items-center gap-1 text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded";
        const body = (
          <>
            <span className="font-bold">{num}</span>
            <span className="max-w-[80px] truncate">{label}</span>
          </>
        );
        return onOpenScreen && screen ? (
          <button
            key={num}
            onClick={() => onOpenScreen(num - 1)}
            className={`${classes} hover:bg-blue-100 hover:text-blue-700 transition-colors`}
            title={`Preview ${label}`}
          >
            {body}
          </button>
        ) : (
          <span key={num} className={classes} title={label}>
            {body}
          </span>
        );
      })}
    </div>
  );
}

// ─── Finding card with screen badges + copy button ───
function FindingCard({ item, screens = [], onOpenScreen }) {
  const [copied, setCopied] = useState(false);
  const copyText = useCallback(() => {
    const parts = [
      `${item.title}${item.severity ? ` [${item.severity}]` : ""}`,
      item.body || "",
    ];
    if (item.suggestion) parts.push(`Suggestion: ${item.suggestion}`);
    navigator.clipboard.writeText(parts.filter(Boolean).join("\n\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [item]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 group relative">
      <button
        onClick={copyText}
        className="absolute top-3 right-3 p-1.5 rounded-md text-gray-300 hover:text-gray-700 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
        title={copied ? "Copied!" : "Copy finding"}
      >
        {copied ? <CheckIcon size={13} className="text-emerald-500" /> : <CopyIcon size={13} />}
      </button>
      <div className="flex items-center gap-3 mb-2 pr-8">
        <h4 className="font-semibold text-gray-900 text-sm">{item.title}</h4>
        <SeverityBadge severity={item.severity} />
      </div>
      <ScreenBadges screenNums={item.screens} screens={screens} onOpenScreen={onOpenScreen} />
      <p className="text-sm text-gray-600 leading-relaxed mt-2">{item.body}</p>
      {item.suggestion && (
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-700 mb-1">Suggestion</p>
          <p className="text-sm text-blue-800">{item.suggestion}</p>
        </div>
      )}
    </div>
  );
}

// ─── Screen group header with clickable thumbnail ───
function ScreenHeader({ screen, screenNum, onOpenScreen }) {
  const thumb = (
    <img
      src={screen.url}
      alt={screen.label}
      className="w-12 h-8 rounded border border-gray-200 object-cover"
    />
  );
  return (
    <div className="flex items-center gap-3 mb-3 mt-6 first:mt-0">
      {onOpenScreen ? (
        <button
          onClick={() => onOpenScreen(screenNum - 1)}
          className="hover:opacity-80 transition-opacity"
          title={`Preview ${screen.label}`}
        >
          {thumb}
        </button>
      ) : (
        thumb
      )}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-gray-400">#{screenNum}</span>
        <h3 className="text-sm font-semibold text-gray-900">{screen.label}</h3>
        {screen.flowTag && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${FLOW_TAG_COLORS[screen.flowTag] || "bg-gray-100 text-gray-500"}`}>
            {screen.flowTag}
          </span>
        )}
      </div>
    </div>
  );
}

function ScreenGroup({ screen, screenNum, findings, onOpenScreen }) {
  return (
    <div>
      <ScreenHeader screen={screen} screenNum={screenNum} onOpenScreen={onOpenScreen} />
      {findings.length === 0 ? (
        <p className="text-xs text-gray-400 ml-15 mb-4">No findings for this screen.</p>
      ) : (
        <div className="space-y-3 mb-6">
          {findings.map((item, i) => (
            <FindingCard key={i} item={item} screens={[]} onOpenScreen={onOpenScreen} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Flow group header ───
function FlowHeader({ tag, screenCount }) {
  const label = tag === "untagged" ? "Untagged screens" : tag.replace(/-/g, " ");
  return (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${FLOW_TAG_COLORS[tag] || "bg-gray-100 text-gray-500"}`}>
        {label}
      </span>
      <span className="text-[11px] text-gray-400">{screenCount} screen{screenCount !== 1 ? "s" : ""}</span>
    </div>
  );
}

function FlowGroup({ tag, screens: flowScreens, findings, onOpenScreen }) {
  return (
    <div>
      <FlowHeader tag={tag} screenCount={flowScreens.length} />
      {findings.length === 0 ? (
        <p className="text-xs text-gray-400 mb-4">No findings for this flow.</p>
      ) : (
        <div className="space-y-3 mb-6">
          {findings.map((item, i) => (
            <FindingCard key={i} item={item} screens={flowScreens} onOpenScreen={onOpenScreen} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Copy suggestions table ───
function CopyTable({ suggestions, screens = [], compact = false, onOpenScreen }) {
  if (suggestions.length === 0) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400 ${compact ? "mb-4" : ""}`}>
        No copy suggestions generated.
      </div>
    );
  }
  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${compact ? "mb-4" : ""}`}>
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {screens.length > 1 && (
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">
                Screen
              </th>
            )}
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Current
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Suggested
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Reason
            </th>
          </tr>
        </thead>
        <tbody>
          {suggestions.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-0">
              {screens.length > 1 && (
                <td className="px-4 py-3">
                  <ScreenBadges screenNums={row.screens} screens={screens} onOpenScreen={onOpenScreen} />
                </td>
              )}
              <td className="px-5 py-3">
                <code className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded">
                  {row.current}
                </code>
              </td>
              <td className="px-5 py-3">
                <code className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                  {row.suggested}
                </code>
              </td>
              <td className="px-5 py-3 text-xs text-gray-500">
                {row.reason}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
