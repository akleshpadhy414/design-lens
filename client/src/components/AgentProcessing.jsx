import { Eye } from "lucide-react";
import AgentCard from "./AgentCard.jsx";
import { AGENTS } from "../lib/api.js";

export default function AgentProcessing({ agentStatuses, reviewReady, error, onViewResults }) {
  const completedCount = AGENTS.filter(
    (a) => agentStatuses[a.id] === "complete"
  ).length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Agents at work
        </h2>
        <p className="text-gray-500">
          {reviewReady
            ? "All agents have completed their analysis."
            : error
            ? "An error occurred during the review."
            : `Five specialized agents are analyzing your designs against the PRD. ${completedCount}/${AGENTS.length} complete.`}
        </p>
      </div>

      <div className="space-y-3">
        {AGENTS.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            status={agentStatuses[agent.id] || "idle"}
          />
        ))}
      </div>

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-sm text-red-700 font-medium">Review Error</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
          <p className="text-xs text-gray-500 mt-2">
            Make sure the backend is running and your API key is configured in{" "}
            <code className="bg-gray-100 px-1 rounded">server/.env</code>
          </p>
        </div>
      )}

      {reviewReady && (
        <div className="mt-8 text-center">
          <button
            onClick={onViewResults}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200 mx-auto transition-all"
          >
            <Eye size={16} /> View Review
          </button>
        </div>
      )}
    </div>
  );
}
