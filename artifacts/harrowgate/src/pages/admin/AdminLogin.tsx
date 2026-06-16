import { useState, useEffect } from "react";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }

const GOLD = "#a28959";
const GOLD_DIM = "rgba(162,137,89,0.55)";
const GOLD_FAINT = "rgba(162,137,89,0.35)";
const BG = "#0b2213";

type View = "login" | "forgot" | "reset";

export default function AdminLogin() {
  const [, setLocation] = useLocation();

  // Parse reset token from URL
  const params = new URLSearchParams(window.location.search);
  const resetTokenFromUrl = params.get("reset_token");

  const [view, setView] = useState<View>(resetTokenFromUrl ? "reset" : "login");

  // ── Login state ──
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showLoginPass, setShowLoginPass] = useState(false);

  // ── Forgot password state ──
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // ── Reset password state ──
  const [resetToken] = useState(resetTokenFromUrl || "");
  const [resetUsername, setResetUsername] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [showResetPass, setShowResetPass] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Remove token from URL without reload
  useEffect(() => {
    if (resetTokenFromUrl) {
      const url = new URL(window.location.href);
      url.searchParams.delete("reset_token");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error || "Login failed"); return; }
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_role", data.role ?? "admin");
      localStorage.setItem("admin_name", data.name ?? "Admin");
      if (data.sessionId) localStorage.setItem("admin_session_id", data.sessionId);
      setLocation("/admin/submissions");
    } catch {
      setLoginError("Could not reach server. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotError(null);
    setForgotLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/admin/forgot-password`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setForgotError(d.error || "Failed to send reset email. Please try again.");
        return;
      }
      setForgotSent(true);
    } catch {
      setForgotError("Could not reach server. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    if (resetPassword !== resetConfirm) {
      setResetError("Passwords do not match.");
      return;
    }
    if (resetPassword.length < 6) {
      setResetError("Password must be at least 6 characters.");
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/admin/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, newUsername: resetUsername, newPassword: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setResetError(data.error || "Failed to reset password."); return; }
      setResetDone(true);
    } catch {
      setResetError("Could not reach server. Please try again.");
    } finally {
      setResetLoading(false);
    }
  }

  const inputStyle = {
    borderColor: "rgba(162,137,89,0.2)",
    color: GOLD,
    background: "rgba(162,137,89,0.04)",
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

        {/* ── LOGIN ─────────────────────────────────────────────────────────── */}
        {view === "login" && (
          <form onSubmit={handleLogin}
            className="rounded-2xl border p-8 space-y-5"
            style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(162,137,89,0.15)" }}>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: GOLD_DIM }}>Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                autoComplete="username" required
                className="w-full text-sm px-4 py-3 rounded-xl border bg-transparent outline-none"
                style={inputStyle} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: GOLD_DIM }}>Password</label>
              <div className="relative">
                <input type={showLoginPass ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password" required
                  className="w-full text-sm px-4 py-3 pr-11 rounded-xl border bg-transparent outline-none"
                  style={inputStyle} />
                <button type="button" onClick={() => setShowLoginPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80 text-xs"
                  style={{ color: GOLD }}>
                  {showLoginPass ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {loginError && (
              <p className="text-xs text-center rounded-xl px-4 py-2.5"
                style={{ background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
                {loginError}
              </p>
            )}

            <button type="submit" disabled={loginLoading}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "rgba(162,137,89,0.15)", color: GOLD, border: "1px solid rgba(162,137,89,0.3)" }}>
              {loginLoading
                ? <><span className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} /> Signing in…</>
                : "Sign In"}
            </button>

            <div className="text-center pt-1">
              <button type="button" onClick={() => { setView("forgot"); setForgotSent(false); setForgotError(null); }}
                className="text-xs hover:opacity-80 transition-opacity"
                style={{ color: GOLD_FAINT }}>
                Forgot password?
              </button>
            </div>
          </form>
        )}

        {/* ── FORGOT PASSWORD ───────────────────────────────────────────────── */}
        {view === "forgot" && (
          <div className="rounded-2xl border p-8"
            style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(162,137,89,0.15)" }}>

            {forgotSent ? (
              <div className="text-center space-y-5">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: "rgba(162,137,89,0.10)", border: "1px solid rgba(162,137,89,0.25)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7" style={{ color: GOLD }}>
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1" style={{ color: GOLD }}>Reset link sent</p>
                  <p className="text-xs leading-relaxed" style={{ color: GOLD_DIM }}>
                    A password reset link has been sent to the backup account
                    <span className="block font-semibold mt-1" style={{ color: GOLD }}>harrowgateconsultancy@gmail.com</span>
                  </p>
                  <p className="text-xs mt-3" style={{ color: "rgba(162,137,89,0.35)" }}>
                    The link expires in 1 hour.
                  </p>
                </div>
                <button onClick={() => setView("login")}
                  className="w-full py-2.5 rounded-xl text-xs font-medium border transition-all hover:opacity-80"
                  style={{ borderColor: "rgba(162,137,89,0.2)", color: GOLD_DIM }}>
                  ← Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-5">
                <div className="text-center">
                  <p className="font-semibold text-sm mb-1" style={{ color: GOLD }}>Forgot Password</p>
                  <p className="text-xs leading-relaxed" style={{ color: GOLD_DIM }}>
                    A reset link will be sent to the backup account:
                    <span className="block font-semibold mt-1" style={{ color: GOLD }}>harrowgateconsultancy@gmail.com</span>
                  </p>
                </div>

                {forgotError && (
                  <p className="text-xs text-center rounded-xl px-4 py-2.5"
                    style={{ background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
                    {forgotError}
                  </p>
                )}

                <button type="submit" disabled={forgotLoading}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, rgba(196,169,110,0.18), rgba(162,137,89,0.12))", color: GOLD, border: "1px solid rgba(162,137,89,0.3)" }}>
                  {forgotLoading
                    ? <><span className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} /> Sending…</>
                    : "Send Reset Link"}
                </button>

                <div className="text-center">
                  <button type="button" onClick={() => setView("login")}
                    className="text-xs hover:opacity-80 transition-opacity"
                    style={{ color: GOLD_FAINT }}>
                    ← Back to sign in
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── RESET PASSWORD ────────────────────────────────────────────────── */}
        {view === "reset" && (
          <div className="rounded-2xl border p-8"
            style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(162,137,89,0.15)" }}>

            {resetDone ? (
              <div className="text-center space-y-5">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7" style={{ color: "#4ade80" }}>
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-2" style={{ color: GOLD }}>Password updated</p>
                  <p className="text-xs leading-relaxed" style={{ color: GOLD_DIM }}>
                    Your admin credentials have been updated. Sign in with your new username and password.
                  </p>
                </div>
                <button onClick={() => setView("login")}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                  style={{ background: "rgba(162,137,89,0.15)", color: GOLD, border: "1px solid rgba(162,137,89,0.3)" }}>
                  Sign In →
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-5">
                <div className="text-center mb-2">
                  <p className="font-semibold text-sm mb-1" style={{ color: GOLD }}>Set New Credentials</p>
                  <p className="text-xs" style={{ color: GOLD_DIM }}>Choose a new username and password for your admin account.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: GOLD_DIM }}>New Username</label>
                  <input type="text" value={resetUsername} onChange={e => setResetUsername(e.target.value)}
                    placeholder="New username" required autoComplete="username"
                    className="w-full text-sm px-4 py-3 rounded-xl border bg-transparent outline-none"
                    style={inputStyle} />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: GOLD_DIM }}>New Password</label>
                  <div className="relative">
                    <input type={showResetPass ? "text" : "password"} value={resetPassword}
                      onChange={e => setResetPassword(e.target.value)}
                      placeholder="Min. 6 characters" required autoComplete="new-password"
                      className="w-full text-sm px-4 py-3 pr-11 rounded-xl border bg-transparent outline-none"
                      style={inputStyle} />
                    <button type="button" onClick={() => setShowResetPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80 text-xs"
                      style={{ color: GOLD }}>
                      {showResetPass ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: GOLD_DIM }}>Confirm Password</label>
                  <input type="password" value={resetConfirm} onChange={e => setResetConfirm(e.target.value)}
                    placeholder="Repeat new password" required autoComplete="new-password"
                    className="w-full text-sm px-4 py-3 rounded-xl border bg-transparent outline-none"
                    style={inputStyle} />
                </div>

                {resetError && (
                  <p className="text-xs text-center rounded-xl px-4 py-2.5"
                    style={{ background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
                    {resetError}
                  </p>
                )}

                <button type="submit" disabled={resetLoading}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, rgba(196,169,110,0.20), rgba(162,137,89,0.14))", color: GOLD, border: "1px solid rgba(162,137,89,0.3)" }}>
                  {resetLoading
                    ? <><span className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} /> Updating…</>
                    : "Update Credentials"}
                </button>
              </form>
            )}
          </div>
        )}

        <p className="text-xs text-center mt-6" style={{ color: "rgba(162,137,89,0.25)" }}>
          HARROWGATE Consultancy · Admin access only
        </p>
      </div>
    </div>
  );
}
