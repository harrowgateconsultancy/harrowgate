import { useEffect } from "react";
import { useLocation, useSearch } from "wouter";

const BG = "#0b2213";
const GOLD = "#c4a96e";

export default function OAuthCallback() {
  const [, setLocation] = useLocation();
  const search = useSearch();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");
    const userJson = params.get("user");
    const error = params.get("error");

    if (error || !token) {
      setLocation(`/sign-in?error=${encodeURIComponent(error || "OAuth failed")}`);
      return;
    }

    if (token) localStorage.setItem("student_token", token);
    if (userJson) {
      try { localStorage.setItem("student_user", userJson); } catch { /* ignore */ }
    }
    setLocation("/portal");
  }, []);

  return (
    <div
      className="flex items-center justify-center min-h-[100dvh]"
      style={{ background: BG }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: GOLD, borderTopColor: "transparent" }}
        />
        <p className="text-sm" style={{ color: "rgba(212,197,162,0.7)" }}>
          Signing you in…
        </p>
      </div>
    </div>
  );
}
