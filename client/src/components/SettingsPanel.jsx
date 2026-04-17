import { useEffect, useState } from "react";
import { X, Eye, EyeOff, Trash2, Shield, Check, Loader2 } from "lucide-react";
import {
  useKeysStore,
  refreshKeysMeta,
  saveKey,
  removeKey,
  setPreferredProvider,
} from "../lib/settings.js";

export default function SettingsPanel({ open, onClose }) {
  const snap = useKeysStore();
  const [openAIInput, setOpenAIInput] = useState("");
  const [anthropicInput, setAnthropicInput] = useState("");
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [saving, setSaving] = useState(null); // "openai" | "anthropic" | null
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    if (open) refreshKeysMeta();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const bothSet = snap.meta.openai.set && snap.meta.anthropic.set;

  async function onSave(provider, value, clear) {
    const trimmed = (value || "").trim();
    if (trimmed.length < 10) {
      setActionError("That key looks too short to be valid.");
      return;
    }
    setSaving(provider);
    setActionError(null);
    try {
      await saveKey(provider, trimmed);
      clear();
    } catch (err) {
      setActionError(err.message || "Failed to save key");
    } finally {
      setSaving(null);
    }
  }

  async function onDelete(provider) {
    if (!confirm(`Remove the saved ${provider === "openai" ? "OpenAI" : "Anthropic"} key?`)) return;
    setActionError(null);
    try {
      await removeKey(provider);
    } catch (err) {
      setActionError(err.message || "Failed to delete key");
    }
  }

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
          <div className="flex gap-2 items-start text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <Shield size={14} className="mt-0.5 shrink-0 text-gray-500" />
            <span>
              Keys are encrypted with AES-256-GCM and stored server-side against your
              account. They're never returned to the browser and only decrypted in
              memory for each request.
            </span>
          </div>

          <KeyRow
            label="OpenAI API key"
            placeholder="sk-..."
            meta={snap.meta.openai}
            inputValue={openAIInput}
            onInputChange={setOpenAIInput}
            show={showOpenAI}
            onToggleShow={() => setShowOpenAI((s) => !s)}
            saving={saving === "openai"}
            onSave={() => onSave("openai", openAIInput, () => setOpenAIInput(""))}
            onDelete={() => onDelete("openai")}
            hintUrl="platform.openai.com/api-keys"
          />

          <KeyRow
            label="Anthropic API key"
            placeholder="sk-ant-..."
            meta={snap.meta.anthropic}
            inputValue={anthropicInput}
            onInputChange={setAnthropicInput}
            show={showAnthropic}
            onToggleShow={() => setShowAnthropic((s) => !s)}
            saving={saving === "anthropic"}
            onSave={() => onSave("anthropic", anthropicInput, () => setAnthropicInput(""))}
            onDelete={() => onDelete("anthropic")}
            hintUrl="console.anthropic.com/settings/keys"
          />

          {bothSet && (
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Active model provider
              </label>
              <div className="grid grid-cols-2 gap-2">
                <ProviderOption
                  selected={snap.preferredProvider === "openai"}
                  onClick={() => setPreferredProvider("openai")}
                  title="OpenAI"
                  subtitle="gpt-4o"
                />
                <ProviderOption
                  selected={snap.preferredProvider === "anthropic"}
                  onClick={() => setPreferredProvider("anthropic")}
                  title="Anthropic"
                  subtitle="claude-sonnet-4-6"
                />
              </div>
              {!snap.preferredProvider && (
                <p className="text-xs text-amber-600 mt-2">
                  Both keys saved — pick one to continue.
                </p>
              )}
            </div>
          )}

          {actionError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
              {actionError}
            </div>
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

function KeyRow({
  label, placeholder, meta, inputValue, onInputChange, show, onToggleShow,
  saving, onSave, onDelete, hintUrl,
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-gray-800">{label}</label>
        {meta.set && (
          <span className="inline-flex items-center gap-1 text-xs text-green-700">
            <Check size={12} /> saved: sk-…{meta.last4}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? "text" : "password"}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={meta.set ? "Enter new key to replace" : placeholder}
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
        <button
          type="button"
          onClick={onSave}
          disabled={saving || inputValue.trim().length < 10}
          className={`px-3 py-2 rounded-lg text-sm font-medium ${
            saving || inputValue.trim().length < 10
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : "Save"}
        </button>
        {meta.set && (
          <button
            type="button"
            onClick={onDelete}
            className="px-2.5 py-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
            aria-label="Remove key"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-1">Get one at {hintUrl}</p>
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
