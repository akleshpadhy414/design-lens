import { useState, useCallback, useEffect } from "react";
import { Sparkles, Bot, AlertTriangle, Search, Wand2 } from "lucide-react";
import StepIndicator from "./components/StepIndicator.jsx";
import PrdUpload from "./components/PrdUpload.jsx";
import DesignUpload from "./components/DesignUpload.jsx";
import AgentProcessing from "./components/AgentProcessing.jsx";
import ReviewResults from "./components/ReviewResults.jsx";
import GenerateResults from "./components/GenerateResults.jsx";
import { startReview, startGenerate, checkHealth, GENERATE_AGENTS } from "./lib/api.js";

const REVIEW_STEPS = ["PRD (Optional)", "Add Designs", "AI Review", "Results"];
const GENERATE_STEPS = ["Paste PRD", "AI Generation", "Results"];

export default function App() {
  const [mode, setMode] = useState("review"); // "review" | "generate"
  const [step, setStep] = useState(0);
  const [prdText, setPrdText] = useState("");
  const [designs, setDesigns] = useState([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [agentStatuses, setAgentStatuses] = useState({});
  const [reviewResult, setReviewResult] = useState(null);
  const [generateResult, setGenerateResult] = useState(null);
  const [reviewReady, setReviewReady] = useState(false);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState(null);

  // Check backend health on mount
  useEffect(() => {
    checkHealth().then((res) => {
      if (res.status === "ok") {
        setBackendStatus(res.hasApiKey ? "ok" : "no-key");
      } else {
        setBackendStatus("offline");
      }
    });
  }, []);

  const steps = mode === "review" ? REVIEW_STEPS : GENERATE_STEPS;

  // Switch mode and reset
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

  // Run the AI review pipeline
  const runReview = useCallback(() => {
    setStep(2);
    setAgentStatuses({});
    setReviewResult(null);
    setReviewReady(false);
    setError(null);

    const images = designs.map((d) => d.url);

    startReview({
      prdText,
      images,
      customPrompt,
      onAgentStart: (agentId) => {
        setAgentStatuses((prev) => ({ ...prev, [agentId]: "running" }));
      },
      onAgentComplete: (agentId, _result) => {
        setAgentStatuses((prev) => ({ ...prev, [agentId]: "complete" }));
      },
      onComplete: (result) => {
        setReviewResult(result);
        setReviewReady(true);
      },
      onError: (message) => {
        setError(message);
      },
    });
  }, [prdText, designs, customPrompt]);

  // Run the AI generate pipeline
  const runGenerate = useCallback(() => {
    setStep(1);
    setAgentStatuses({});
    setGenerateResult(null);
    setReviewReady(false);
    setError(null);

    startGenerate({
      prdText,
      onAgentStart: (agentId) => {
        setAgentStatuses((prev) => ({ ...prev, [agentId]: "running" }));
      },
      onAgentComplete: (agentId, _result) => {
        setAgentStatuses((prev) => ({ ...prev, [agentId]: "complete" }));
      },
      onComplete: (result) => {
        setGenerateResult(result);
        setReviewReady(true);
      },
      onError: (message) => {
        setError(message);
      },
    });
  }, [prdText]);

  // Reset everything
  const handleStartNew = useCallback(() => {
    setStep(0);
    setPrdText("");
    setDesigns([]);
    setCustomPrompt("");
    setAgentStatuses({});
    setReviewResult(null);
    setGenerateResult(null);
    setReviewReady(false);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
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
            {/* Mode Toggle */}
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

            {backendStatus === "no-key" && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                <AlertTriangle size={12} />
                <span>No API key configured</span>
              </div>
            )}
            {backendStatus === "offline" && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                <AlertTriangle size={12} />
                <span>Backend offline</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-200">
              <span className="font-medium">Highrise v1</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Bot size={14} />
              <span>
                {mode === "generate"
                  ? "3 agents ready"
                  : `${prdText.trim().length > 0 ? "5" : "4"} agents ready`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <StepIndicator steps={steps} current={step} />

        {/* ═══════════════════ REVIEW MODE ═══════════════════ */}
        {mode === "review" && (
          <>
            {step === 0 && (
              <PrdUpload
                prdText={prdText}
                setPrdText={setPrdText}
                onNext={() => setStep(1)}
              />
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
              />
            )}

            {step === 2 && (
              <AgentProcessing
                agentStatuses={agentStatuses}
                reviewReady={reviewReady}
                error={error}
                onViewResults={() => setStep(3)}
                hasPrd={prdText.trim().length > 0}
              />
            )}

            {step === 3 && (
              <ReviewResults review={reviewResult} onStartNew={handleStartNew} />
            )}
          </>
        )}

        {/* ═══════════════════ GENERATE MODE ═══════════════════ */}
        {mode === "generate" && (
          <>
            {step === 0 && (
              <GeneratePrdStep
                prdText={prdText}
                setPrdText={setPrdText}
                onGenerate={runGenerate}
              />
            )}

            {step === 1 && (
              <AgentProcessing
                agentStatuses={agentStatuses}
                reviewReady={reviewReady}
                error={error}
                onViewResults={() => setStep(2)}
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

// ─── Inline component for Generate PRD step ───
function GeneratePrdStep({ prdText, setPrdText, onGenerate }) {
  const canProceed = prdText.trim().length > 20;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Describe what to build
        </h2>
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
