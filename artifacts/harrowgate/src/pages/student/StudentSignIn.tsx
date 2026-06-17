import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";

const BG = "#0b2213";
const GOLD = "#c4a96e";
const GOLD_L = "#f0d28c";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 814 1000" aria-hidden="true">
      <path fill="currentColor" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.3-164-39.3c-76.5 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 268.7-317.3 72.6 0 132.8 45.1 177 45.1 42.2 0 109.5-47.7 191.8-47.7 30.4 0 108.2 2.6 164.2 99.3zM504.4 72.1C527.8 44.1 544.8 4.5 544.8 0c0-.6 0-1.2-.1-1.8-26.7 1-58.1 17.7-78.2 39.5-20.1 21.7-38.9 57.9-38.9 97.4 0 .8.1 1.6.2 2.4.7.1 1.5.2 2.3.2 24.4 0 56.1-15.8 74.3-65.6z"/>
    </svg>
  );
}

export default function StudentSignIn() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hovBack, setHovBack] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const err = params.get("error");
    if (err) setError(err);
  }, [search]);

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

  const oauthBtnStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    width: "100%",
    padding: "11px 16px",
    borderRadius: "9999px",
    border: "1px solid rgba(196,169,110,0.25)",
    background: "rgba(255,255,255,0.05)",
    color: "#f0e8d0",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
  } as React.CSSProperties;

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

            {/* ── OAuth buttons ── */}
            <div className="flex flex-col gap-3 mb-6">
              <a
                href={`${getApiBase()}/api/student/auth/google`}
                style={oauthBtnStyle}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              >
                <GoogleIcon />
                Continue with Google
              </a>
            </div>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px" style={{ background: "rgba(196,169,110,0.15)" }} />
              <span className="text-xs font-medium" style={{ color: "rgba(196,169,110,0.45)" }}>or sign in with email</span>
              <div className="flex-1 h-px" style={{ background: "rgba(196,169,110,0.15)" }} />
            </div>

            {/* ── Email / Password form ── */}
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
