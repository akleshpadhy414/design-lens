import { Eye } from "lucide-react";
import AgentCard from "./AgentCard.jsx";
import { AGENTS } from "../lib/api.js";

const NUMBER_WORDS = { 3: "Three", 4: "Four", 5: "Five" };

export default function AgentProcessing({ agentStatuses, reviewReady, error, onViewResults, hasPrd = true, agentList }) {
  // If an explicit agentList is provided (generate mode), use it directly.
  // Otherwise, fall back to the review AGENTS list with PRD filtering.
  const visibleAgents = agentList
    ? agentList
    : hasPrd
      ? AGENTS
      : AGENTS.filter((a) => a.id !== "prd-parser");

  const completedCount = visibleAgents.filter(
    (a) => agentStatuses[a.id] === "complete"
  ).length;

  const isGenerateMode = !!agentList;
  const countWord = NUMBER_WORDS[visibleAgents.length] || visibleAgents.length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Agents at work
        </h2>
        <p className="text-gray-500">
          {reviewReady
            ? isGenerateMode
              ? "All agents have completed generation."
              : "All agents have completed their analysis."
            : error
            ? isGenerateMode
              ? "An error occurred during generation."
              : "An error occurred during the review."
            : isGenerateMode
            ? `${countWord} agents are generating your UI spec. ${completedCount}/${visibleAgents.length} complete.`
            : `${countWord} specialized agents are analyzing your designs${hasPrd ? " against the PRD" : ""}. ${completedCount}/${visibleAgents.length} complete.`}
        </p>
      </div>

      <div className="space-y-3">
        {visibleAgents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            status={agentStatuses[agent.id] || "idle"}
          />
        ))}
      </div>

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-sm text-red-700 font-medium">
            {isGenerateMode ? "Generation Error" : "Review Error"}
          </p>
          <p className="text-xs text-red-600 mt-1 break-words">{error}</p>
        </div>
      )}

      {reviewReady && (
        <div className="mt-8 text-center">
          <button
            onClick={onViewResults}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200 mx-auto transition-all"
          >
            <Eye size={16} /> {isGenerateMode ? "View Results" : "View Review"}
          </button>
        </div>
      )}
    </div>
  );
}
