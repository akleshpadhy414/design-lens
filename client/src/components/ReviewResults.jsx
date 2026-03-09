import { useState } from "react";
import {
  Search,
  Layout,
  Compass,
  Type,
  ClipboardCheck,
  Zap,
  Coffee,
} from "lucide-react";
import SeverityBadge from "./SeverityBadge.jsx";
import ChecklistItem from "./ChecklistItem.jsx";

export default function ReviewResults({ review, onStartNew }) {
  const [activeTab, setActiveTab] = useState("hierarchy");

  if (!review) return null;

  const { summary, hierarchy = [], usability = [], copySuggestions = [], checklist = [] } = review;

  const errorCount = checklist.filter((c) => c.status === "error").length;
  const warningCount = checklist.filter((c) => c.status === "warning").length;
  const successCount = checklist.filter((c) => c.status === "success").length;
  const totalCount = checklist.length;

  const tabs = [
    { id: "hierarchy", label: "Visual Hierarchy", icon: Layout },
    { id: "usability", label: "Usability & UX", icon: Compass },
    { id: "copy", label: "Copy Suggestions", icon: Type },
    { id: "checklist", label: "Checklist", icon: ClipboardCheck },
  ];

  return (
    <div>
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

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
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

      {/* Tab content */}
      <div className="space-y-4">
        {activeTab === "hierarchy" &&
          hierarchy.map((item, i) => (
            <FindingCard key={i} item={item} />
          ))}

        {activeTab === "usability" &&
          usability.map((item, i) => (
            <FindingCard key={i} item={item} />
          ))}

        {activeTab === "copy" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {copySuggestions.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                No copy suggestions generated.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
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
                  {copySuggestions.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-100 last:border-0"
                    >
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
            )}
          </div>
        )}

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
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={onStartNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Zap size={16} /> Start New Review
        </button>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Coffee size={14} />
          <span>Reviewed by 5 AI agents</span>
        </div>
      </div>
    </div>
  );
}

// Sub-component for hierarchy/usability finding cards
function FindingCard({ item }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <h4 className="font-semibold text-gray-900 text-sm">{item.title}</h4>
        <SeverityBadge severity={item.severity} />
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
      {item.suggestion && (
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-700 mb-1">Suggestion</p>
          <p className="text-sm text-blue-800">{item.suggestion}</p>
        </div>
      )}
    </div>
  );
}
