import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Sparkles, Bot, AlertTriangle, Search, Wand2, Settings as SettingsIcon, LogOut, Plus } from "lucide-react";
import StepIndicator from "./components/StepIndicator.jsx";
import PrdUpload from "./components/PrdUpload.jsx";
import DesignUpload from "./components/DesignUpload.jsx";
import AgentProcessing from "./components/AgentProcessing.jsx";
import ReviewResults from "./components/ReviewResults.jsx";
import GenerateResults from "./components/GenerateResults.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import LoginGate from "./components/LoginGate.jsx";
import { startReview, startGenerate, checkHealth, GENERATE_AGENTS, visibleAgentsFor } from "./lib/api.js";
import {
  useKeysStore,
  useAutoLoadKeys,
  resolveActiveProvider,
} from "./lib/settings.js";
import { supabase, setSessionOnly } from "./lib/supabase.js";

const REVIEW_STEPS = ["PRD (Optional)", "Add Designs", "AI Review", "Results"];
const GENERATE_STEPS = ["Paste PRD", "AI Generation", "Results"];

export default function App() {
  const [session, setSession] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setSessionReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s || null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!sessionReady) return null;
  if (!session) return <LoginGate />;
  return <SignedInApp user={session.user} />;
}

function SignedInApp({ user }) {
  const [mode, setMode] = useState("review");
  const [step, setStep] = useState(0);
  const [prdText, setPrdText] = useState("");
  const [designs, setDesigns] = useState([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [focus, setFocus] = useState("full"); // "full" | "copy" | "visual"
  const [agentStatuses, setAgentStatuses] = useState({});
  const [reviewResult, setReviewResult] = useState(null);
  const [generateResult, setGenerateResult] = useState(null);
  const [reviewReady, setReviewReady] = useState(false);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const abortRef = useRef(null);

  useAutoLoadKeys();
  const keys = useKeysStore();

  useEffect(() => {
    checkHealth().then((res) => {
      setBackendStatus(res.status === "ok" ? "ok" : "offline");
    });
  }, []);

  const active = useMemo(() => resolveActiveProvider(keys), [keys]);
  const canRun = active.ok;

  // Open settings whenever the user can't run (and we've finished loading).
  useEffect(() => {
    if (keys.loaded && !canRun) setSettingsOpen(true);
  }, [keys.loaded, canRun]);

  const steps = mode === "review" ? REVIEW_STEPS : GENERATE_STEPS;

  const switchMode = useCallback((newMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setStep(0);
    setPrdText("");
    setDesigns([]);
    setCustomPrompt("");
    setAgentStatuses({});
    setReviewResult(null);
    setGenerateResult(null);
    setReviewReady(false);
    setError(null);
  }, [mode]);

  const runReview = useCallback(() => {
    if (!canRun) {
      setSettingsOpen(true);
      return;
    }
    setStep(2);
    setAgentStatuses({});
    setReviewResult(null);
    setReviewReady(false);
    setError(null);

    const screens = designs.map((d, i) => ({
      index: i,
      label: d.label || d.name.replace(/\.[^.]+$/, ""),
      flowTag: d.flowTag || null,
      url: d.url,
    }));

    abortRef.current = startReview({
      prdText, screens, customPrompt, focus,
      provider: active.provider,
      onAgentStart: (a) => setAgentStatuses((p) => ({ ...p, [a]: "running" })),
      onAgentComplete: (a) => setAgentStatuses((p) => ({ ...p, [a]: "complete" })),
      onComplete: (result) => { setReviewResult(result); setReviewReady(true); abortRef.current = null; },
      onError: (m) => { setError(m); abortRef.current = null; },
    });
  }, [prdText, designs, customPrompt, focus, canRun, active.provider]);

  const runGenerate = useCallback(() => {
    if (!canRun) {
      setSettingsOpen(true);
      return;
    }
    setStep(1);
    setAgentStatuses({});
    setGenerateResult(null);
    setReviewReady(false);
    setError(null);

    abortRef.current = startGenerate({
      prdText,
      provider: active.provider,
      onAgentStart: (a) => setAgentStatuses((p) => ({ ...p, [a]: "running" })),
      onAgentComplete: (a) => setAgentStatuses((p) => ({ ...p, [a]: "complete" })),
      onComplete: (result) => { setGenerateResult(result); setReviewReady(true); abortRef.current = null; },
      onError: (m) => { setError(m); abortRef.current = null; },
    });
  }, [prdText, canRun, active.provider]);

  const handleCancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }
    // Return to the appropriate input step (1 for review = designs,
    // 0 for generate = PRD).
    setStep(mode === "review" ? 1 : 0);
    setAgentStatuses({});
    setReviewReady(false);
    setError(null);
  }, [mode]);

  const handleStartNew = useCallback(() => {
    // Abort any in-flight SSE so leftover events can't race into fresh state.
    if (abortRef.current) { abortRef.current(); abortRef.current = null; }
    setStep(0); setPrdText(""); setDesigns([]); setCustomPrompt("");
    setFocus("full");
    setAgentStatuses({}); setReviewResult(null); setGenerateResult(null);
    setReviewReady(false); setError(null);
  }, []);

  const visibleReviewAgents = useMemo(
    () => visibleAgentsFor(focus, prdText.trim().length > 0),
    [focus, prdText]
  );

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setSessionOnly(false);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">DesignLens</h1>
              <p className="text-xs text-gray-500">AI-Powered Design Review</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => switchMode("review")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  mode === "review"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Search size={12} /> Review
              </button>
              <button
                onClick={() => switchMode("generate")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  mode === "generate"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Wand2 size={12} /> Generate
              </button>
            </div>

            {backendStatus === "offline" && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                <AlertTriangle size={12} />
                <span>Backend offline</span>
              </div>
            )}
            {keys.loaded && !canRun && (
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-md border border-amber-200"
              >
                <AlertTriangle size={12} />
                <span>{active.reason === "pick-provider" ? "Pick a provider" : "Add an API key"}</span>
              </button>
            )}
            {canRun && (
              <div className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-200">
                <span className="font-medium">
                  {active.provider === "anthropic" ? "Claude" : "GPT-4o"}
                </span>
              </div>
            )}
            {step > 0 && (
              <button
                onClick={handleStartNew}
                className="flex items-center gap-1.5 text-xs text-gray-700 bg-white hover:bg-gray-50 px-2 py-1 rounded-md border border-gray-200"
                title="Start a new review"
              >
                <Plus size={12} /> New
              </button>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              aria-label="Settings"
            >
              <SettingsIcon size={16} />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
              <Bot size={14} />
              <span>
                {mode === "generate"
                  ? "3 agents ready"
                  : `${prdText.trim().length > 0 ? "5" : "4"} agents ready`}
              </span>
            </div>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <span className="text-xs text-gray-500 max-w-[160px] truncate" title={user.email}>
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                aria-label="Log out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <StepIndicator steps={steps} current={step} />

        {mode === "review" && (
          <>
            {step === 0 && (
              <PrdUpload prdText={prdText} setPrdText={setPrdText} onNext={() => setStep(1)} />
            )}
            {step === 1 && (
              <DesignUpload
                designs={designs}
                setDesigns={setDesigns}
                onBack={() => setStep(0)}
                onRunReview={runReview}
                customPrompt={customPrompt}
                setCustomPrompt={setCustomPrompt}
                prdText={prdText}
                focus={focus}
                setFocus={setFocus}
              />
            )}
            {step === 2 && (
              <AgentProcessing
                agentStatuses={agentStatuses}
                reviewReady={reviewReady}
                error={error}
                onViewResults={() => setStep(3)}
                onCancel={handleCancel}
                hasPrd={prdText.trim().length > 0}
                agentList={visibleReviewAgents}
              />
            )}
            {step === 3 && (
              <ReviewResults review={reviewResult} onStartNew={handleStartNew} screens={designs} />
            )}
          </>
        )}

        {mode === "generate" && (
          <>
            {step === 0 && (
              <GeneratePrdStep prdText={prdText} setPrdText={setPrdText} onGenerate={runGenerate} />
            )}
            {step === 1 && (
              <AgentProcessing
                agentStatuses={agentStatuses}
                reviewReady={reviewReady}
                error={error}
                onViewResults={() => setStep(2)}
                onCancel={handleCancel}
                agentList={GENERATE_AGENTS}
              />
            )}
            {step === 2 && (
              <GenerateResults result={generateResult} onStartNew={handleStartNew} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function GeneratePrdStep({ prdText, setPrdText, onGenerate }) {
  const canProceed = prdText.trim().length > 20;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Describe what to build</h2>
        <p className="text-gray-500">
          Paste your PRD, feature spec, or requirements. The agents will generate
          a component tree, fill in all UI copy, and render a visual HTML reference.
        </p>
      </div>

      <div className="relative">
        <textarea
          value={prdText}
          onChange={(e) => setPrdText(e.target.value)}
          placeholder={`Paste your PRD content here...\n\nInclude:\n• What the feature does\n• Key user flows\n• Data fields and actions\n• Edge cases (empty states, errors)`}
          className="w-full h-64 p-4 rounded-xl border-2 border-gray-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 outline-none resize-none text-sm text-gray-800 bg-white transition-all placeholder-gray-300"
        />
        <div className="absolute bottom-3 right-3 text-xs text-gray-300">
          {prdText.length} characters
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={() => canProceed && onGenerate()}
          disabled={!canProceed}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
            canProceed
              ? "bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-200"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <Wand2 size={16} /> Generate UI Spec
        </button>
      </div>
    </div>
  );
}
