import {
  FileText,
  Layout,
  Compass,
  Type,
  ClipboardCheck,
  Loader,
  CheckCircle,
} from "lucide-react";

const ICON_MAP = {
  FileText,
  Layout,
  Compass,
  Type,
  ClipboardCheck,
};

export default function AgentCard({ agent, status }) {
  const IconComponent = ICON_MAP[agent.icon] || FileText;
  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-500 ${
        status === "running"
          ? "border-blue-300 bg-blue-50 shadow-lg shadow-blue-100"
          : status === "complete"
          ? "border-emerald-300 bg-emerald-50"
          : status === "error"
          ? "border-red-300 bg-red-50"
          : "border-gray-200 bg-white"
      }`}
    >
      {status === "running" && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100 to-transparent animate-pulse opacity-50" />
      )}
      <div className="relative flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center text-white flex-shrink-0`}
        >
          <IconComponent size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900 text-sm">
              {agent.name}
            </h4>
            {status === "running" && (
              <Loader size={14} className="text-blue-500 animate-spin" />
            )}
            {status === "complete" && (
              <CheckCircle size={14} className="text-emerald-500" />
            )}
            {status === "error" && (
              <span className="text-xs text-red-500 font-medium">Failed</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{agent.description}</p>
        </div>
      </div>
    </div>
  );
}
