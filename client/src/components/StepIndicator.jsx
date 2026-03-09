import { CheckCircle, ChevronRight } from "lucide-react";

export default function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
              i === current
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                : i < current
                ? "bg-emerald-100 text-emerald-700"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {i < current ? (
              <CheckCircle size={14} />
            ) : (
              <span className="w-5 h-5 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-xs">
                {i + 1}
              </span>
            )}
            {step}
          </div>
          {i < steps.length - 1 && (
            <ChevronRight size={16} className="text-gray-300" />
          )}
        </div>
      ))}
    </div>
  );
}
