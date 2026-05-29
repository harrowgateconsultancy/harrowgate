import { useState } from "react";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }

const GOLD = "#a28959";
const GOLD_DIM = "rgba(162,137,89,0.55)";
const BG = "#0b2213";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      localStorage.setItem("admin_token", data.token);
      setLocation("/admin/submissions");
    } catch {
      setError("Could not reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <img src={`${BASE}/harrowgate-logo.png`} alt="HARROWGATE" className="h-16 mx-auto mb-6 object-contain" />
          <p className="text-xs font-semibold tracking-[0.3em] uppercase" style={{ color: GOLD_DIM }}>
            Admin Portal
          </p>
        </div>

        <form onSubmit={handleSubmit}
          className="rounded-2xl border p-8 space-y-5"
          style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(162,137,89,0.15)" }}>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: GOLD_DIM }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
              className="w-full text-sm px-4 py-3 rounded-xl border bg-transparent outline-none transition-colors"
              style={{ borderColor: "rgba(162,137,89,0.2)", color: GOLD, background: "rgba(162,137,89,0.04)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: GOLD_DIM }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full text-sm px-4 py-3 rounded-xl border bg-transparent outline-none transition-colors"
              style={{ borderColor: "rgba(162,137,89,0.2)", color: GOLD, background: "rgba(162,137,89,0.04)" }}
            />
          </div>

          {error && (
            <p className="text-xs text-center rounded-xl px-4 py-2.5"
              style={{ background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "rgba(162,137,89,0.15)", color: GOLD, border: `1px solid rgba(162,137,89,0.3)` }}>
            {loading
              ? <><span className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} /> Signing in…</>
              : "Sign In"}
          </button>
        </form>

        <p className="text-xs text-center mt-6" style={{ color: "rgba(162,137,89,0.25)" }}>
          HARROWGATE Consultancy · Admin access only
        </p>
      </div>
    </div>
  );
}
