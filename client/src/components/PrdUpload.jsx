import { Upload, ArrowRight } from "lucide-react";

export default function PrdUpload({ prdText, setPrdText, onNext }) {
  const canProceed = prdText.trim().length > 20;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Start with context
        </h2>
        <p className="text-gray-500">
          Paste your PRD, spec, or requirements doc. The agents will extract
          requirements, edge cases, and success metrics to evaluate your designs
          against.
        </p>
      </div>

      <div className="relative">
        <textarea
          value={prdText}
          onChange={(e) => setPrdText(e.target.value)}
          placeholder={`Paste your PRD content here...\n\nInclude:\n• Problem statement and goals\n• Feature requirements (P0/P1/P2)\n• User flows and edge cases\n• Success metrics`}
          className="w-full h-64 p-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none resize-none text-sm text-gray-800 bg-white transition-all placeholder-gray-300"
        />
        <div className="absolute bottom-3 right-3 text-xs text-gray-300">
          {prdText.length} characters
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-400 bg-gray-100 cursor-not-allowed"
        >
          <Upload size={16} /> Upload PDF
          <span className="text-xs opacity-60">(coming soon)</span>
        </button>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={() => canProceed && onNext()}
          disabled={!canProceed}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
            canProceed
              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          Next: Add Designs <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
