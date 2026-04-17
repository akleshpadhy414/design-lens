import { useEffect, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const FLOW_TAG_COLORS = {
  "happy-path": "bg-emerald-100 text-emerald-700",
  "error-state": "bg-red-100 text-red-700",
  "empty-state": "bg-amber-100 text-amber-700",
  loading: "bg-blue-100 text-blue-700",
  settings: "bg-purple-100 text-purple-700",
};

/**
 * Full-size lightbox preview for uploaded screens.
 * Keyboard: Esc closes, ← and → navigate between screens.
 *
 * Props:
 *  - screens:    array of { url, label, flowTag, ... }
 *  - index:      current screen index, or null when closed
 *  - onClose:    () => void
 *  - onChange:   (newIndex) => void
 */
export default function ScreenLightbox({ screens, index, onClose, onChange }) {
  const open = typeof index === "number" && screens[index];

  const go = useCallback(
    (delta) => {
      if (!open) return;
      const next = (index + delta + screens.length) % screens.length;
      onChange(next);
    },
    [open, index, screens.length, onChange]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    // Lock body scroll while open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, go]);

  if (!open) return null;
  const screen = screens[index];

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/80 flex flex-col"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-3 text-white bg-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-mono text-white/60 shrink-0">
            {index + 1} / {screens.length}
          </span>
          <span className="text-sm font-medium truncate">{screen.label}</span>
          {screen.flowTag && (
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                FLOW_TAG_COLORS[screen.flowTag] || "bg-white/10 text-white/60"
              }`}
            >
              {screen.flowTag}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center p-6 relative"
        onClick={onClose}
      >
        {screens.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Previous screen"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        <img
          src={screen.url}
          alt={screen.label}
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        />

        {screens.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Next screen"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* Bottom thumbnail rail */}
      {screens.length > 1 && (
        <div
          className="bg-black/40 px-4 py-2 flex gap-2 overflow-x-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {screens.map((s, i) => (
            <button
              key={i}
              onClick={() => onChange(i)}
              className={`shrink-0 rounded border-2 transition-all ${
                i === index ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
              }`}
              aria-label={`View screen ${i + 1}: ${s.label}`}
            >
              <img
                src={s.url}
                alt={s.label}
                className="h-12 w-auto max-w-[120px] object-cover rounded"
              />
            </button>
          ))}
        </div>
      )}

      <p className="text-[11px] text-white/40 text-center pb-2">
        ← → to navigate · Esc to close
      </p>
    </div>
  );
}

/** Small hook that manages the lightbox open/close/active-index state. */
export function useLightbox() {
  const [index, setIndex] = useState(null);
  const openAt = useCallback((i) => setIndex(i), []);
  const close = useCallback(() => setIndex(null), []);
  return { index, openAt, close, setIndex };
}
