import { useState, useEffect } from "react";
import { useAdminColors } from "../../contexts/AdminThemeContext";
import { Globe, Eye, EyeOff, ExternalLink } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }
function adminFetch(url: string, opts?: RequestInit) {
  const token = localStorage.getItem("admin_token");
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
}

const GOLD = "#c4a96e";
const NAVY = "#0b2213";

export default function Pages() {
  const C = useAdminColors();
  const [live, setLive] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${getApiBase()}/api/settings/on-arrival`)
      .then(r => r.json())
      .then(d => setLive(d.live ?? false))
      .catch(() => setLive(false));
  }, []);

  async function toggle() {
    if (live === null) return;
    setError(null);
    setSaving(true);
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/pages/on-arrival`, {
        method: "PUT",
        body: JSON.stringify({ live: !live }),
      });
      if (res.ok) {
        setLive(l => !l);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Request failed (${res.status})`);
      }
    } catch (e: any) {
      setError(e?.message || "Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  const pageUrl = `${window.location.origin}${BASE}/on-arrival-visa`;

  return (
    <div className="p-6 lg:p-8 max-w-[1000px] mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.navyText }}>Pages</h1>
        <p className="text-sm mt-1" style={{ color: C.n50 }}>Manage public-facing pages on your website</p>
      </div>

      {/* On-Arrival Visa card */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: C.borderFaint, background: C.card }}>
        {/* Card header */}
        <div className="px-6 py-5 flex items-start justify-between gap-4 border-b" style={{ borderColor: C.borderFaint }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(196,169,110,0.12)", border: "1px solid rgba(196,169,110,0.2)" }}>
              <Globe size={18} style={{ color: GOLD }} />
            </div>
            <div>
              <h2 className="font-bold text-base" style={{ color: C.navyText }}>On-Arrival Visa Portal</h2>
              <p className="text-xs mt-0.5" style={{ color: C.n45 }}>
                Multi-step application form for Hong Kong trade fair attendees
              </p>
            </div>
          </div>

          {/* Live toggle */}
          <div className="flex items-center gap-3 shrink-0">
            {live !== null && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: live ? "rgba(16,185,129,0.10)" : C.muted,
                  color: live ? "#10b981" : C.n40,
                  border: live ? "1px solid rgba(16,185,129,0.2)" : `1px solid ${C.borderFaint}`,
                }}>
                {live ? "● Live" : "○ Offline"}
              </span>
            )}
            <button
              onClick={toggle}
              disabled={saving || live === null}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 disabled:opacity-50"
              style={{ background: live ? "#10b981" : C.n20 }}
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200"
                style={{ transform: live ? "translateX(22px)" : "translateX(2px)" }}
              />
            </button>
          </div>
        </div>

        {/* Details row */}
        <div className="px-6 py-4 flex flex-wrap items-center gap-3" style={{ borderBottom: `1px solid ${C.borderFaint}` }}>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: C.n45 }}>
            <span className="font-medium" style={{ color: C.n60 }}>URL:</span>
            <span className="font-mono px-2 py-0.5 rounded" style={{ background: C.n04, color: C.n60 }}>
              /on-arrival-visa
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: C.n45 }}>
            <span className="font-medium" style={{ color: C.n60 }}>Steps:</span> 5 (Personal · Travel · Business · Documents · Review)
          </div>
          <a href={pageUrl} target="_blank" rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 text-xs font-medium transition-all hover:opacity-80 px-3 py-1.5 rounded-lg"
            style={{ color: GOLD, background: "rgba(196,169,110,0.08)", border: "1px solid rgba(196,169,110,0.15)" }}>
            <ExternalLink size={11} /> Open Page
          </a>
          <button
            onClick={() => setShowPreview(v => !v)}
            className="flex items-center gap-1.5 text-xs font-medium transition-all hover:opacity-80 px-3 py-1.5 rounded-lg"
            style={{ color: C.n60, background: C.n04, border: `1px solid ${C.borderFaint}` }}>
            {showPreview ? <EyeOff size={11} /> : <Eye size={11} />}
            {showPreview ? "Hide Preview" : "Preview"}
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-6 mb-0 mt-0 px-4 py-3 rounded-xl text-xs flex items-center gap-2"
            style={{ background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
            <span>⚠</span> {error}
            <button onClick={() => setError(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Info box */}
        <div className="px-6 py-4">
          <div className="rounded-xl p-4 text-sm leading-relaxed" style={{ background: C.subtle, border: `1px solid ${C.borderFaint}` }}>
            <p className="font-semibold mb-2" style={{ color: C.navyText }}>About this page</p>
            <ul className="space-y-1 text-xs list-disc list-inside" style={{ color: C.n50 }}>
              <li>5-step application form for the Hong Kong Jewellery &amp; Gem Fair (September 14–18, 2026)</li>
              <li>Collects personal, travel, business details and document uploads (passport, photo, hotel, business card)</li>
              <li>Matches the HARROWGATE website theme — forest green background, gold accents</li>
              <li>When <strong>Offline</strong>, visitors see a "Page Not Available" message</li>
              <li>When <strong>Live</strong>, the full multi-step form is publicly accessible</li>
            </ul>
          </div>
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div className="border-t" style={{ borderColor: C.borderFaint }}>
            <div className="px-6 py-3 flex items-center justify-between"
              style={{ background: C.subtle }}>
              <span className="text-xs font-semibold" style={{ color: C.n50 }}>Live Preview</span>
              <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: C.n08, color: C.n45 }}>
                {live ? "Showing live page" : "Showing offline state"}
              </span>
            </div>
            <div style={{ height: 560 }}>
              <iframe
                key={String(live)}
                src={pageUrl}
                className="w-full h-full border-0"
                title="On-Arrival Visa Page Preview"
                style={{ display: "block" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Placeholder for future pages */}
      <div className="mt-4 rounded-2xl border border-dashed py-10 text-center"
        style={{ borderColor: C.n15 }}>
        <Globe size={20} className="mx-auto mb-2" style={{ color: C.n30 }} />
        <p className="text-sm" style={{ color: C.n35 }}>More pages can be added here</p>
      </div>
    </div>
  );
}
