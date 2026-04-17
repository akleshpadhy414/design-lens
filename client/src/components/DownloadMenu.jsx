import { useEffect, useRef, useState } from "react";
import { Download, ChevronDown, FileText, FileCode, ListChecks, Layout, Compass, Type, ClipboardCheck } from "lucide-react";
import { exportReview } from "../lib/export.js";

const SECTION_OPTIONS = [
  { id: "all", label: "Full review", icon: ListChecks },
  { id: "summary", label: "Summary only", icon: FileText },
  { id: "hierarchy", label: "Visual hierarchy only", icon: Layout },
  { id: "usability", label: "Usability & UX only", icon: Compass },
  { id: "copy", label: "Copy suggestions only", icon: Type },
  { id: "checklist", label: "Checklist only", icon: ClipboardCheck },
];

export default function DownloadMenu({ review, screens }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener("mousedown", onDocClick);
    return () => window.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function handleExport(format, section) {
    exportReview(format, [section], review, screens);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50"
      >
        <Download size={14} /> Download <ChevronDown size={12} className={open ? "rotate-180 transition" : "transition"} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-gray-200 shadow-xl p-1 z-20">
          {SECTION_OPTIONS.map((opt) => (
            <div key={opt.id} className="group flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50">
              <div className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
                <opt.icon size={13} className="text-gray-400 shrink-0" />
                <span className="truncate">{opt.label}</span>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => handleExport("markdown", opt.id)}
                  className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700"
                  title="Download as Markdown"
                >
                  <FileText size={11} className="inline" /> md
                </button>
                <button
                  onClick={() => handleExport("json", opt.id)}
                  className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700"
                  title="Download as JSON"
                >
                  <FileCode size={11} className="inline" /> json
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
