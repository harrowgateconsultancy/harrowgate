import { useState, useEffect } from "react";
import { useAdminColors } from "../../contexts/AdminThemeContext";
import { Globe, Eye, EyeOff, ExternalLink, Download, RefreshCw } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }
function adminFetch(url: string, opts?: RequestInit) {
  const token = localStorage.getItem("admin_token");
  return fetch(url, {
    ...opts,
    headers: {
      ...(opts?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
}

const GOLD = "#c4a96e";

type Application = {
  id: number;
  formData: Record<string, string>;
  passportPath: string | null;
  photoPath: string | null;
  hotelPath: string | null;
  businessPath: string | null;
  status: string;
  createdAt: string;
};

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  pending:    { bg: "rgba(251,191,36,0.12)", color: "#d97706", border: "rgba(251,191,36,0.25)" },
  processing: { bg: "rgba(99,102,241,0.10)", color: "#6366f1", border: "rgba(99,102,241,0.25)" },
  approved:   { bg: "rgba(16,185,129,0.10)", color: "#10b981", border: "rgba(16,185,129,0.2)"  },
  rejected:   { bg: "rgba(248,113,113,0.10)", color: "#f87171", border: "rgba(248,113,113,0.2)"  },
};
const STATUS_OPTS = ["pending", "processing", "approved", "rejected"];

export default function Pages() {
  const C = useAdminColors();
  const [live, setLive] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [apps, setApps] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${getApiBase()}/api/settings/on-arrival`)
      .then(r => r.json())
      .then(d => setLive(d.live ?? false))
      .catch(() => setLive(false));
    loadApps();
  }, []);

  function loadApps() {
    setAppsLoading(true);
    adminFetch(`${getApiBase()}/api/admin/pages/on-arrival/applications`)
      .then(r => r.json())
      .then(d => setApps(Array.isArray(d) ? d : []))
      .catch(() => setApps([]))
      .finally(() => setAppsLoading(false));
  }

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

  async function updateStatus(id: number, status: string) {
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/pages/on-arrival/applications/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      if (res.ok) setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch {}
  }

  function fileUrl(id: number, type: string) {
    const token = localStorage.getItem("admin_token") ?? "";
    return `${getApiBase()}/api/admin/pages/on-arrival/file/${id}/${type}?token=${encodeURIComponent(token)}`;
  }

  const pageUrl = `${window.location.origin}${BASE}/on-arrival-visa`;

  return (
    <div className="p-6 lg:p-8 max-w-[1000px] mx-auto w-full space-y-6">
      {/* Header */}
      <div>
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
            <span className="font-mono px-2 py-0.5 rounded" style={{ background: C.n04, color: C.n60 }}>/on-arrival-visa</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: C.n45 }}>
            <span className="font-medium" style={{ color: C.n60 }}>Steps:</span> 5 (Personal · Travel · Business · Documents · Review)
          </div>
          <a href={pageUrl} target="_blank" rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 text-xs font-medium transition-all hover:opacity-80 px-3 py-1.5 rounded-lg"
            style={{ color: GOLD, background: "rgba(196,169,110,0.08)", border: "1px solid rgba(196,169,110,0.15)" }}>
            <ExternalLink size={11} /> Open Page
          </a>
          <button onClick={() => setShowPreview(v => !v)}
            className="flex items-center gap-1.5 text-xs font-medium transition-all hover:opacity-80 px-3 py-1.5 rounded-lg"
            style={{ color: C.n60, background: C.n04, border: `1px solid ${C.borderFaint}` }}>
            {showPreview ? <EyeOff size={11} /> : <Eye size={11} />}
            {showPreview ? "Hide Preview" : "Preview"}
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-6 mt-3 px-4 py-3 rounded-xl text-xs flex items-center gap-2"
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
              <li>When <strong>Offline</strong>, visitors see a "Page Not Available" message</li>
              <li>When <strong>Live</strong>, the full multi-step form is publicly accessible</li>
            </ul>
          </div>
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div className="border-t" style={{ borderColor: C.borderFaint }}>
            <div className="px-6 py-3 flex items-center justify-between" style={{ background: C.subtle }}>
              <span className="text-xs font-semibold" style={{ color: C.n50 }}>Live Preview</span>
              <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: C.n08, color: C.n45 }}>
                {live ? "Showing live page" : "Showing offline state"}
              </span>
            </div>
            <div style={{ height: 560 }}>
              <iframe key={String(live)} src={pageUrl} className="w-full h-full border-0" title="On-Arrival Visa Page Preview" style={{ display: "block" }} />
            </div>
          </div>
        )}
      </div>

      {/* Applications section */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: C.borderFaint, background: C.card }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: C.borderFaint }}>
          <div>
            <h2 className="font-bold text-base" style={{ color: C.navyText }}>Submitted Applications</h2>
            <p className="text-xs mt-0.5" style={{ color: C.n45 }}>
              {appsLoading ? "Loading…" : `${apps.length} application${apps.length !== 1 ? "s" : ""} received`}
            </p>
          </div>
          <button onClick={loadApps} disabled={appsLoading}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80 disabled:opacity-50"
            style={{ color: C.n60, background: C.n04, border: `1px solid ${C.borderFaint}` }}>
            <RefreshCw size={11} className={appsLoading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {appsLoading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
          </div>
        ) : apps.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm" style={{ color: C.n35 }}>No applications yet</p>
            <p className="text-xs mt-1" style={{ color: C.n30 }}>Submissions will appear here once the page is live and users start applying</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: C.borderFaint }}>
            {apps.map(app => {
              const fd = app.formData as Record<string, string>;
              const sc = STATUS_COLORS[app.status] ?? STATUS_COLORS.pending;
              const isOpen = expanded === app.id;
              const hasFile = (p: string | null) => !!p;

              return (
                <div key={app.id} style={{ borderColor: C.borderFaint }}>
                  {/* Row summary */}
                  <button
                    className="w-full px-6 py-4 flex flex-wrap items-center gap-3 text-left transition-all hover:opacity-80"
                    style={{ background: isOpen ? C.subtle : "transparent" }}
                    onClick={() => setExpanded(isOpen ? null : app.id)}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ background: "rgba(196,169,110,0.12)", color: GOLD }}>
                        {(fd.fullName || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: C.navyText }}>{fd.fullName || "—"}</p>
                        <p className="text-xs truncate" style={{ color: C.n45 }}>{fd.email || "—"} · {fd.company || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs" style={{ color: C.n40 }}>
                        {fd.arrivalDate ? `Arrival: ${fd.arrivalDate}` : ""}
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                        style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                        {app.status}
                      </span>
                      <span className="text-xs" style={{ color: C.n35 }}>
                        {new Date(app.createdAt).toLocaleDateString()}
                      </span>
                      <span style={{ color: C.n30, fontSize: 10 }}>{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="px-6 pb-6 space-y-5" style={{ background: C.subtle, borderTop: `1px solid ${C.borderFaint}` }}>
                      {/* Form data grid */}
                      <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {([
                          ["Full Name", fd.fullName], ["Date of Birth", fd.dob], ["Gender", fd.gender],
                          ["Nationality", fd.nationality], ["Passport No.", fd.passportNo], ["Passport Expiry", fd.passportExpiry],
                          ["Country of Issue", fd.issueCountry], ["Arrival Date", fd.arrivalDate], ["Departure Date", fd.departureDate],
                          ["Flight No.", fd.flightNo], ["Hotel", fd.hotel], ["HK Address", fd.hkAddress],
                          ["Company", fd.company], ["Business Address", fd.businessAddress], ["Phone", fd.phone],
                          ["Email", fd.email], ["Purpose", fd.purpose], ["First-time Visitor", fd.firstTime],
                        ] as [string, string][]).map(([k, v]) => v ? (
                          <div key={k} className="rounded-xl px-3 py-2.5" style={{ background: C.card, border: `1px solid ${C.borderFaint}` }}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: C.n35 }}>{k}</p>
                            <p className="text-xs font-medium break-words" style={{ color: C.navyText }}>{v}</p>
                          </div>
                        ) : null)}
                        {fd.comments && (
                          <div className="col-span-2 sm:col-span-3 rounded-xl px-3 py-2.5" style={{ background: C.card, border: `1px solid ${C.borderFaint}` }}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: C.n35 }}>Comments</p>
                            <p className="text-xs" style={{ color: C.navyText }}>{fd.comments}</p>
                          </div>
                        )}
                      </div>

                      {/* Documents */}
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: C.n50 }}>Documents</p>
                        <div className="flex flex-wrap gap-2">
                          {([
                            ["passport", "Passport Bio-Page", app.passportPath],
                            ["photo", "Passport Photo", app.photoPath],
                            ["hotel", "Hotel Booking", app.hotelPath],
                            ["business", "Business Card", app.businessPath],
                          ] as [string, string, string | null][]).map(([type, label, p]) => (
                            hasFile(p) ? (
                              <a key={type} href={fileUrl(app.id, type)} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all hover:opacity-80"
                                style={{ color: GOLD, background: "rgba(196,169,110,0.1)", border: "1px solid rgba(196,169,110,0.2)" }}>
                                <Download size={11} /> {label}
                              </a>
                            ) : (
                              <span key={type} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg"
                                style={{ color: C.n35, background: C.n04, border: `1px solid ${C.borderFaint}` }}>
                                {label} — not provided
                              </span>
                            )
                          ))}
                        </div>
                      </div>

                      {/* Status update */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold" style={{ color: C.n50 }}>Status:</span>
                        <div className="flex gap-2">
                          {STATUS_OPTS.map(s => {
                            const sc2 = STATUS_COLORS[s];
                            return (
                              <button key={s} onClick={() => updateStatus(app.id, s)}
                                className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all hover:opacity-80"
                                style={{
                                  background: app.status === s ? sc2.bg : C.n04,
                                  color: app.status === s ? sc2.color : C.n40,
                                  border: app.status === s ? `1px solid ${sc2.border}` : `1px solid ${C.borderFaint}`,
                                  fontWeight: app.status === s ? 700 : 500,
                                }}>
                                {s}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Placeholder for future pages */}
      <div className="rounded-2xl border border-dashed py-10 text-center" style={{ borderColor: C.n15 }}>
        <Globe size={20} className="mx-auto mb-2" style={{ color: C.n30 }} />
        <p className="text-sm" style={{ color: C.n35 }}>More pages can be added here</p>
      </div>
    </div>
  );
}
