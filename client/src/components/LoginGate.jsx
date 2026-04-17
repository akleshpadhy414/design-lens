import { useState } from "react";
import { Sparkles, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { supabase, setSessionOnly } from "../lib/supabase.js";

export default function LoginGate() {
  const [email, setEmail] = useState("");
  const [sessionOnly, setSessionOnlyLocal] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState(null);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isValidEmail) return;
    setStatus("sending");
    setError(null);

    // Persist the session-only choice before the redirect so the SDK reads
    // it from the right storage on return.
    setSessionOnly(sessionOnly);

    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (err) {
      setStatus("error");
      setError(err.message);
    } else {
      setStatus("sent");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">DesignLens</h1>
            <p className="text-xs text-gray-500">Sign in to continue</p>
          </div>
        </div>

        {status === "sent" ? (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">Check your email</div>
              <div className="text-xs text-green-700 mt-0.5">
                We sent a magic link to <strong>{email}</strong>. Click it to finish signing in.
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                  disabled={status === "sending"}
                />
              </div>
            </div>

            <label className="flex items-start gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={sessionOnly}
                onChange={(e) => setSessionOnlyLocal(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <strong className="font-medium text-gray-800">Session only</strong> — sign me
                out when I close the tab (recommended on shared computers).
              </span>
            </label>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!isValidEmail || status === "sending"}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isValidEmail && status !== "sending"
                  ? "bg-gray-900 text-white hover:bg-gray-800"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {status === "sending" ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Sending…
                </>
              ) : (
                "Send magic link"
              )}
            </button>

            <p className="text-[11px] text-gray-400 text-center pt-2">
              No password needed. We'll email you a one-time sign-in link.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
