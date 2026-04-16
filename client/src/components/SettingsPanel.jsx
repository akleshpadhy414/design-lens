import { useEffect, useState } from "react";
import { X, Eye, EyeOff, Trash2, Shield } from "lucide-react";
import { useSettings, clearKeys } from "../lib/settings.js";

export default function SettingsPanel({ open, onClose, envKeys }) {
  const [settings, update] = useSettings();
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const haveOpenAI = !!settings.openaiKey || envKeys?.openai;
  const haveAnthropic = !!settings.anthropicKey || envKeys?.anthropic;
  const bothAvailable = haveOpenAI && haveAnthropic;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Settings</h2>
            <p className="text-xs text-gray-500 mt-0.5">Model provider & API keys</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Privacy note */}
          <div className="flex gap-2 items-start text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <Shield size={14} className="mt-0.5 shrink-0 text-gray-500" />
            <span>
              Keys are stored only in <strong>this browser's local storage</strong> and
              sent with each request to DesignLens' own backend. They are not logged or
              persisted server-side.
            </span>
          </div>

          {/* OpenAI */}
          <KeyField
            label="OpenAI API key"
            placeholder="sk-..."
            hint={
              envKeys?.openai && !settings.openaiKey
                ? "Using the server's configured key. Override by entering your own."
                : "Get one at platform.openai.com/api-keys"
            }
            value={settings.openaiKey}
            onChange={(v) => update({ openaiKey: v.trim() })}
            show={showOpenAI}
            onToggleShow={() => setShowOpenAI((s) => !s)}
          />

          {/* Anthropic */}
          <KeyField
            label="Anthropic API key"
            placeholder="sk-ant-..."
            hint={
              envKeys?.anthropic && !settings.anthropicKey
                ? "Using the server's configured key. Override by entering your own."
                : "Get one at console.anthropic.com/settings/keys"
            }
            value={settings.anthropicKey}
            onChange={(v) => update({ anthropicKey: v.trim() })}
            show={showAnthropic}
            onToggleShow={() => setShowAnthropic((s) => !s)}
          />

          {/* Provider selector (only when both are available) */}
          {bothAvailable && (
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Active model provider
              </label>
              <div className="grid grid-cols-2 gap-2">
                <ProviderOption
                  selected={settings.preferredProvider === "openai"}
                  onClick={() => update({ preferredProvider: "openai" })}
                  title="OpenAI"
                  subtitle="gpt-4o"
                />
                <ProviderOption
                  selected={settings.preferredProvider === "anthropic"}
                  onClick={() => update({ preferredProvider: "anthropic" })}
                  title="Anthropic"
                  subtitle="claude-sonnet-4-6"
                />
              </div>
              {!settings.preferredProvider && (
                <p className="text-xs text-amber-600 mt-2">
                  Both keys available — pick one to continue.
                </p>
              )}
            </div>
          )}

          {/* Clear */}
          {(settings.openaiKey || settings.anthropicKey) && (
            <button
              onClick={() => {
                if (confirm("Remove all saved API keys from this browser?")) clearKeys();
              }}
              className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700"
            >
              <Trash2 size={12} /> Clear saved keys
            </button>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function KeyField({ label, placeholder, hint, value, onChange, show, onToggleShow }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-800 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-mono"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
          aria-label={show ? "Hide" : "Show"}
          tabIndex={-1}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function ProviderOption({ selected, onClick, title, subtitle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-3 rounded-lg border-2 transition-all ${
        selected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="text-sm font-medium text-gray-900">{title}</div>
      <div className="text-xs text-gray-500 font-mono mt-0.5">{subtitle}</div>
    </button>
  );
}
