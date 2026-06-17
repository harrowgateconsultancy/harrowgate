import { useState } from "react";
import { useLocation } from "wouter";

const BG = "#0b2213";
const GOLD = "#c4a96e";
const GOLD_L = "#f0d28c";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }

export default function StudentSignIn() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hovBack, setHovBack] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/student/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      localStorage.setItem("student_token", data.token);
      localStorage.setItem("student_user", JSON.stringify(data.student));
      setLocation("/portal");
    } catch {
      setError("Network error — please try again");
    } finally { setLoading(false); }
  }

  return (
    <div
      className="relative flex flex-col min-h-[100dvh]"
      style={{
        background: BG,
        backgroundImage: "radial-gradient(ellipse at 50% -5%, rgba(162,137,89,0.13) 0%, transparent 60%)",
      }}
    >
      <div className="fixed top-5 left-5 z-50">
        <button
          onClick={() => setLocation("/")}
          onMouseEnter={() => setHovBack(true)}
          onMouseLeave={() => setHovBack(false)}
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full border"
          style={{
            color: hovBack ? GOLD_L : GOLD,
            borderColor: hovBack ? "rgba(240,210,140,0.6)" : "rgba(196,169,110,0.35)",
            background: hovBack ? "rgba(162,137,89,0.16)" : "rgba(162,137,89,0.08)",
            transition: "all 0.2s ease",
          }}
        >
          ← Back
        </button>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 px-4 py-12">
        <div className="flex flex-col items-center mb-8">
          <img
            src={`${BASE}/harrowgate-logo.png`}
            alt="HARROWGATE"
            className="h-28 w-auto object-contain mb-5"
            style={{ filter: "drop-shadow(0 0 24px rgba(196,169,110,0.35))" }}
          />
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-center" style={{ color: GOLD }}>
            Welcome to HARROWGATE
          </h1>
          <p className="mt-2 text-sm sm:text-base text-center" style={{ color: "rgba(212,197,162,0.65)" }}>
            Sign in to access your student portal
          </p>
        </div>

        <div
          className="w-full sm:max-w-[480px] sm:rounded-3xl sm:p-[2px]"
          style={{
            background: "linear-gradient(145deg, rgba(196,169,110,0.38) 0%, rgba(162,137,89,0.12) 50%, rgba(196,169,110,0.28) 100%)",
            boxShadow: "0 0 80px rgba(162,137,89,0.2), 0 32px 80px rgba(0,0,0,0.5)",
          }}
        >
          <div className="w-full sm:rounded-[calc(1.5rem-2px)] overflow-hidden p-8" style={{ background: BG }}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-wide" style={{ color: "rgba(196,169,110,0.85)" }}>
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="px-4 py-3 rounded-full border outline-none transition-all text-sm"
                  style={{
                    background: "rgba(162,137,89,0.09)",
                    borderColor: "rgba(162,137,89,0.25)",
                    color: "#f0e8d0",
                  }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-wide" style={{ color: "rgba(196,169,110,0.85)" }}>
                  PASSWORD
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="px-4 py-3 rounded-full border outline-none transition-all text-sm"
                  style={{
                    background: "rgba(162,137,89,0.09)",
                    borderColor: "rgba(162,137,89,0.25)",
                    color: "#f0e8d0",
                  }}
                />
              </div>

              {error && (
                <div
                  className="text-sm px-4 py-3 rounded-2xl border"
                  style={{
                    background: "rgba(248,113,113,0.08)",
                    borderColor: "rgba(248,113,113,0.2)",
                    color: "#f87171",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full font-bold text-sm transition-all"
                style={{
                  background: "linear-gradient(135deg, #c4a96e, #a28959)",
                  color: "#0b2213",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t text-center text-sm" style={{ borderColor: "rgba(162,137,89,0.1)", color: "rgba(212,197,162,0.6)" }}>
              Don't have an account?{" "}
              <button
                onClick={() => setLocation("/sign-up")}
                className="font-bold"
                style={{ color: GOLD }}
              >
                Create one
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
