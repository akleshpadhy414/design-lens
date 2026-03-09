import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

function ChecklistIcon({ status }) {
  if (status === "success")
    return <CheckCircle size={18} className="text-emerald-500" />;
  if (status === "warning")
    return <AlertTriangle size={18} className="text-amber-500" />;
  return <XCircle size={18} className="text-red-500" />;
}

export default function ChecklistItem({ item, note, status }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <div className="mt-0.5">
        <ChecklistIcon status={status} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{item}</p>
        {note && <p className="text-xs text-gray-500 mt-0.5">{note}</p>}
      </div>
    </div>
  );
}
