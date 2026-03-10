import { useState, useCallback, useEffect } from "react";
import { Sparkles, Bot, AlertTriangle } from "lucide-react";
import StepIndicator from "./components/StepIndicator.jsx";
import PrdUpload from "./components/PrdUpload.jsx";
import DesignUpload from "./components/DesignUpload.jsx";
import AgentProcessing from "./components/AgentProcessing.jsx";
import ReviewResults from "./components/ReviewResults.jsx";
import { startReview, checkHealth } from "./lib/api.js";

const STEPS = ["PRD (Optional)", "Add Designs", "AI Review", "Results"];

export default function App() {
  const [step, setStep] = useState(0);
  const [prdText, setPrdText] = useState("");
  const [designs, setDesigns] = useState([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [agentStatuses, setAgentStatuses] = useState({});
  const [reviewResult, setReviewResult] = useState(null);
  const [reviewReady, setReviewReady] = useState(false);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState(null); // null | "ok" | "no-key" | "offline"

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

  // Reset everything for a new review
  const handleStartNew = useCallback(() => {
    setStep(0);
    setPrdText("");
    setDesigns([]);
    setCustomPrompt("");
    setAgentStatuses({});
    setReviewResult(null);
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
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Bot size={14} />
              <span>{prdText.trim().length > 0 ? "5" : "4"} agents ready</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <StepIndicator steps={STEPS} current={step} />

        {/* Step 0: PRD Upload */}
        {step === 0 && (
          <PrdUpload
            prdText={prdText}
            setPrdText={setPrdText}
            onNext={() => setStep(1)}
          />
        )}

        {/* Step 1: Design Upload */}
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

        {/* Step 2: Agent Processing */}
        {step === 2 && (
          <AgentProcessing
            agentStatuses={agentStatuses}
            reviewReady={reviewReady}
            error={error}
            onViewResults={() => setStep(3)}
            hasPrd={prdText.trim().length > 0}
          />
        )}

        {/* Step 3: Results */}
        {step === 3 && (
          <ReviewResults review={reviewResult} onStartNew={handleStartNew} />
        )}
      </div>
    </div>
  );
}
