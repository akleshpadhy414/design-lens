import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

const CONFIG = {
  success: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: <CheckCircle size={14} />,
    label: "Good",
  },
  warning: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: <AlertTriangle size={14} />,
    label: "Needs attention",
  },
  error: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    icon: <XCircle size={14} />,
    label: "Significant issue",
  },
};

export default function SeverityBadge({ severity }) {
  const c = CONFIG[severity];
  if (!c) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}
    >
      {c.icon} {c.label}
    </span>
  );
}
