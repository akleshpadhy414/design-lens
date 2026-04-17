import { useCallback } from "react";
import { Image, ChevronLeft, Zap, X, SlidersHorizontal } from "lucide-react";
import { prepareImage } from "../lib/image.js";

const FLOW_TAGS = [
  { value: "", label: "No tag", color: "bg-gray-100 text-gray-500" },
  { value: "happy-path", label: "Happy path", color: "bg-emerald-100 text-emerald-700" },
  { value: "error-state", label: "Error state", color: "bg-red-100 text-red-700" },
  { value: "empty-state", label: "Empty state", color: "bg-amber-100 text-amber-700" },
  { value: "loading", label: "Loading", color: "bg-blue-100 text-blue-700" },
  { value: "settings", label: "Settings", color: "bg-purple-100 text-purple-700" },
];

export default function DesignUpload({ designs, setDesigns, onBack, onRunReview, customPrompt, setCustomPrompt, prdText = "" }) {
  const canProceed = designs.length > 0;

  const handleDesignUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      try {
        const url = await prepareImage(file);
        setDesigns((prev) => [
          ...prev,
          {
            name: file.name,
            url,
            label: file.name.replace(/\.[^.]+$/, ""),
            flowTag: "",
          },
        ]);
      } catch (err) {
        console.error(`Failed to process ${file.name}:`, err);
      }
    }
    // Reset input so the same file can be picked again after removal.
    e.target.value = "";
  }, [setDesigns]);

  const removeDesign = useCallback(
    (index) => {
      setDesigns((prev) => prev.filter((_, i) => i !== index));
    },
    [setDesigns]
  );

  const updateLabel = useCallback(
    (index, label) => {
      setDesigns((prev) => prev.map((d, i) => (i === index ? { ...d, label } : d)));
    },
    [setDesigns]
  );

  const updateFlowTag = useCallback(
    (index, flowTag) => {
      setDesigns((prev) => prev.map((d, i) => (i === index ? { ...d, flowTag } : d)));
    },
    [setDesigns]
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Upload your designs
        </h2>
        <p className="text-gray-500">
          {prdText.trim().length > 0
            ? "Add screenshots, mockups, or wireframes. The agents will analyze each screen against your PRD requirements."
            : "Add screenshots, mockups, or wireframes. The agents will analyze each screen for visual hierarchy, usability, and copy quality."}
        </p>
      </div>

      <label className="block">
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group">
          <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center mx-auto mb-3 transition-colors">
            <Image
              size={24}
              className="text-gray-400 group-hover:text-blue-500"
            />
          </div>
          <p className="text-sm font-medium text-gray-600 group-hover:text-blue-600">
            Drop screenshots here or click to browse
          </p>
          <p className="text-xs text-gray-400 mt-1">
            PNG, JPG, or WebP up to 10MB each
          </p>
        </div>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleDesignUpload}
          className="hidden"
        />
      </label>

      {designs.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          {designs.map((d, i) => {
            const tagInfo = FLOW_TAGS.find((t) => t.value === d.flowTag) || FLOW_TAGS[0];
            return (
              <div
                key={i}
                className="relative group rounded-lg overflow-hidden border border-gray-200 bg-white"
              >
                <img
                  src={d.url}
                  alt={d.name}
                  className="w-full h-32 object-cover"
                />
                {/* Flow tag pill on thumbnail */}
                {d.flowTag && (
                  <span className={`absolute top-2 left-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${tagInfo.color}`}>
                    {tagInfo.label}
                  </span>
                )}
                {/* Screen number badge */}
                <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black bg-opacity-50 text-white" style={d.flowTag ? { left: "auto", right: 32 } : {}}>
                  {i + 1}
                </span>
                <div className="p-2 space-y-1.5">
                  {/* Editable label */}
                  <input
                    type="text"
                    value={d.label}
                    onChange={(e) => updateLabel(i, e.target.value)}
                    placeholder="Screen label..."
                    className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
                  />
                  {/* Flow tag dropdown */}
                  <select
                    value={d.flowTag}
                    onChange={(e) => updateFlowTag(i, e.target.value)}
                    className="w-full text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 outline-none focus:border-blue-400"
                  >
                    {FLOW_TAGS.map((tag) => (
                      <option key={tag.value} value={tag.value}>
                        {tag.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => removeDesign(i)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black bg-opacity-50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Instructions */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal size={15} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Review Instructions</span>
          <span className="ml-1 text-xs text-gray-400">(optional)</span>
        </div>
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder={`Add any specific focus areas or constraints for this review...\n\nExamples:\n• Focus on accessibility and contrast ratios\n• This is a mobile-first design, prioritize touch targets\n• Ignore navigation — it's out of scope for this sprint`}
          className="w-full h-36 p-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none resize-none text-sm text-gray-800 bg-gray-50 transition-all placeholder-gray-300"
        />
        {customPrompt.length > 0 && (
          <p className="mt-1.5 text-xs text-gray-400 text-right">{customPrompt.length} characters</p>
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <button
          onClick={() => canProceed && onRunReview()}
          disabled={!canProceed}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
            canProceed
              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <Zap size={16} /> Run AI Review
        </button>
      </div>
    </div>
  );
}
