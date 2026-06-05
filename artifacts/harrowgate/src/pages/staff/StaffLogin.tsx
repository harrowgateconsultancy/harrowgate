import { useState } from "react";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }

export default function StaffLogin() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/staff/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Invalid credentials"); return; }
      localStorage.setItem("staff_token", data.token);
      localStorage.setItem("staff_user", JSON.stringify(data.staff));
      setLocation("/staff");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#0b1f10", fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src={`${BASE}/harrowgate-logo.png`} alt="HARROWGATE" className="h-20 object-contain mb-4" />
          <h1 className="text-xl font-bold" style={{ color: "#a28959" }}>Staff Portal</h1>
          <p className="text-xs mt-1" style={{ color: "rgba(162,137,89,0.5)" }}>Sign in to view your assigned tasks</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border p-6 space-y-4"
          style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(162,137,89,0.15)" }}>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(162,137,89,0.6)" }}>Username</label>
            <input type="text" required autoFocus value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
              style={{ background: "rgba(162,137,89,0.06)", borderColor: "rgba(162,137,89,0.2)", color: "#e8d5b0" }}
              placeholder="Your username" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(162,137,89,0.6)" }}>Password</label>
            <input type="password" required value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
              style={{ background: "rgba(162,137,89,0.06)", borderColor: "rgba(162,137,89,0.2)", color: "#e8d5b0" }}
              placeholder="Your password" />
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg text-center"
              style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "#a28959", color: "#0b1f10" }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: "rgba(162,137,89,0.3)" }}>
          This portal is for authorised staff only.
        </p>
      </div>
    </div>
  );
}
