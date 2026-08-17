import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DEFAULT_PRICING, DEFAULT_FEATURES, type PricingConfig, type PricingFeature } from "../../hooks/usePricing";
import { useAdminTheme } from "../../contexts/AdminThemeContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }
function adminFetch(url: string, opts?: RequestInit) {
  const token = localStorage.getItem("admin_token");
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts?.headers ?? {}) } });
}

function fmtNum(n: number) { return n.toLocaleString("en-HK"); }

const FIRST_PAYMENT = 3000;
const GOLD   = "#a28959";
const GOLD_B = "#c4a96e";
const GOLD_L = "#f0d28c";

function useColors() {
  const { isDark } = useAdminTheme();
  return {
    isDark,
    card:      isDark ? "#0f2d18"               : "#ffffff",
    border:    isDark ? "rgba(162,137,89,0.12)" : "rgba(0,0,0,0.08)",
    borderMed: isDark ? "rgba(162,137,89,0.30)" : "rgba(0,0,0,0.14)",
    borderStr: isDark ? "rgba(196,169,110,0.55)": "rgba(162,137,89,0.40)",
    muted:     isDark ? "rgba(162,137,89,0.06)" : "rgba(0,0,0,0.03)",
    tFaint:    isDark ? "rgba(162,137,89,0.45)" : "rgba(0,0,0,0.38)",
    tMid:      isDark ? "rgba(162,137,89,0.68)" : "rgba(0,0,0,0.55)",
    tHead:     isDark ? GOLD_L                  : "#0f2d18",
    tBody:     isDark ? GOLD_B                  : "#1a3d20",
    inputBg:   isDark ? "rgba(162,137,89,0.07)" : "#f5f7f5",
    inputText: isDark ? GOLD_L                  : "#0f2d18",
    accentBg:  isDark ? "rgba(162,137,89,0.08)" : "rgba(162,137,89,0.08)",
  } as const;
}

const TIERS = [
  {
    id: "associate", label: "Associate Degree", badge: false,
    totalKey: "associateTotal" as keyof PricingConfig,
    stage2Key: "associateStage2" as keyof PricingConfig,
    stage3Key: "associateLastPayment" as keyof PricingConfig,
    note: "HK$3,000 initial fee is for consultancy services only. Non-refundable once paid — separate from tuition.",
  },
  {
    id: "bachelor", label: "Bachelor's Degree", badge: true,
    totalKey: "bachelorTotal" as keyof PricingConfig,
    stage2Key: "bachelorStage2" as keyof PricingConfig,
    stage3Key: "bachelorLastPayment" as keyof PricingConfig,
    note: "Initial HK$3,000 covers professional consultancy (non-refundable). Full payment schedule contractually binding per HK law.",
  },
  {
    id: "master", label: "Master's Degree", badge: false,
    totalKey: "mastersTotal" as keyof PricingConfig,
    stage2Key: "mastersStage2" as keyof PricingConfig,
    stage3Key: "mastersLastPayment" as keyof PricingConfig,
    note: "The HK$3,000 initial fee is solely for consultancy services (non-refundable). Balance stages are binding after this payment.",
  },
  {
    id: "diploma", label: "Diploma Courses", badge: false,
    totalKey: "diplomaTotal" as keyof PricingConfig,
    stage2Key: "diplomaStage2" as keyof PricingConfig,
    stage3Key: "diplomaLastPayment" as keyof PricingConfig,
    note: "HK$3,000 initial fee covers consultancy services only (non-refundable). Balance stages are contractually binding upon first payment per HK law.",
  },
];

interface TierDraft { total: string; stage2: string; stage3: string; }
interface BankDetails { bankName: string; accountName: string; accountNumber: string; fps: string; additionalInfo: string; }
const DEFAULT_BANK: BankDetails = { bankName: "", accountName: "", accountNumber: "", fps: "", additionalInfo: "" };

function parseDraft(v: string): number { return parseInt(v.replace(/[^0-9]/g, ""), 10) || 0; }
function sumOk(d: TierDraft): boolean { return parseDraft(d.total) === FIRST_PAYMENT + parseDraft(d.stage2) + parseDraft(d.stage3); }

export default function Pricing() {
  const C = useColors();
  const qc = useQueryClient();
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [drafts, setDrafts] = useState<Record<string, TierDraft>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [bankDetails, setBankDetails] = useState<BankDetails>(DEFAULT_BANK);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankSaved, setBankSaved] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const [featDraft, setFeatDraft] = useState<PricingFeature[]>(DEFAULT_FEATURES);
  const [featSaving, setFeatSaving] = useState(false);
  const [featSaved, setFeatSaved] = useState(false);
  const [featError, setFeatError] = useState<string | null>(null);
  const [pmConfig, setPmConfig] = useState({
    alipay: { enabled: false, accountName: "", accountId: "", qrCodeUrl: "", instructions: "" },
    card:   { enabled: false, paymentLink: "", instructions: "" },
  });
  const [pmSaving, setPmSaving] = useState(false);
  const [pmSaved, setPmSaved] = useState(false);
  const [pmError, setPmError] = useState<string | null>(null);
  const [usdRateDraft, setUsdRateDraft] = useState(String(DEFAULT_PRICING.usdRate));
  const [usdRateSaving, setUsdRateSaving] = useState(false);
  const [usdRateSaved, setUsdRateSaved] = useState(false);
  const [usdRateError, setUsdRateError] = useState<string | null>(null);

  const inputStyle: React.CSSProperties = { background: C.inputBg, borderColor: C.borderMed, color: C.inputText };

  useEffect(() => {
    fetch(`${getApiBase()}/api/settings/pricing`)
      .then(r => r.json())
      .then((p: PricingConfig) => {
        setPricing(p);
        setFeatDraft(p.features && p.features.length > 0 ? p.features : DEFAULT_FEATURES);
        setUsdRateDraft(String(p.usdRate ?? DEFAULT_PRICING.usdRate));
        const d: Record<string, TierDraft> = {};
        TIERS.forEach(tier => {
          d[tier.id] = {
            total:  String(p[tier.totalKey]  ?? DEFAULT_PRICING[tier.totalKey]),
            stage2: String(p[tier.stage2Key] ?? DEFAULT_PRICING[tier.stage2Key]),
            stage3: String(p[tier.stage3Key] ?? DEFAULT_PRICING[tier.stage3Key]),
          };
        });
        setDrafts(d);
      })
      .catch(() => {
        const d: Record<string, TierDraft> = {};
        TIERS.forEach(tier => {
          d[tier.id] = { total: String(DEFAULT_PRICING[tier.totalKey]), stage2: String(DEFAULT_PRICING[tier.stage2Key]), stage3: String(DEFAULT_PRICING[tier.stage3Key]) };
        });
        setDrafts(d);
      })
      .finally(() => setLoading(false));

    fetch(`${getApiBase()}/api/settings/bank-details`)
      .then(r => r.json()).then((b: BankDetails) => setBankDetails(b)).catch(() => {});
    fetch(`${getApiBase()}/api/settings/payment-methods`)
      .then(r => r.json()).then((pm: any) => setPmConfig(pm)).catch(() => {});
  }, []);

  async function saveUsdRate() {
    const rate = parseFloat(usdRateDraft);
    if (!Number.isFinite(rate) || rate <= 0) {
      setUsdRateError("Please enter a valid positive number."); return;
    }
    setUsdRateSaving(true); setUsdRateError(null);
    const updated: PricingConfig = { ...pricing, usdRate: rate };
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/settings/pricing`, { method: "PUT", body: JSON.stringify(updated) });
      if (!res.ok) throw new Error();
      const result = await res.json(); setPricing(result);
      qc.invalidateQueries({ queryKey: ["pricing"] });
      setUsdRateSaved(true); setTimeout(() => setUsdRateSaved(false), 3000);
    } catch { setUsdRateError("Failed to save. Please try again."); }
    finally { setUsdRateSaving(false); }
  }

  async function saveBankDetails() {
    setBankSaving(true); setBankError(null);
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/settings/bank-details`, { method: "PUT", body: JSON.stringify(bankDetails) });
      if (!res.ok) throw new Error();
      qc.invalidateQueries({ queryKey: ["bank-details"] });
      setBankSaved(true); setTimeout(() => setBankSaved(false), 3000);
    } catch { setBankError("Failed to save. Please try again."); }
    finally { setBankSaving(false); }
  }

  async function saveFeatures() {
    setFeatSaving(true); setFeatError(null);
    const updated: PricingConfig = { ...pricing, features: featDraft };
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/settings/pricing`, { method: "PUT", body: JSON.stringify(updated) });
      if (!res.ok) throw new Error();
      const result = await res.json(); setPricing(result);
      qc.invalidateQueries({ queryKey: ["pricing"] });
      setFeatSaved(true); setTimeout(() => setFeatSaved(false), 3000);
    } catch { setFeatError("Failed to save. Please try again."); }
    finally { setFeatSaving(false); }
  }

  async function savePaymentMethods() {
    setPmSaving(true); setPmError(null);
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/settings/payment-methods`, { method: "PUT", body: JSON.stringify(pmConfig) });
      if (!res.ok) throw new Error();
      const result = await res.json(); setPmConfig(result);
      setPmSaved(true); setTimeout(() => setPmSaved(false), 3000);
    } catch { setPmError("Failed to save. Please try again."); }
    finally { setPmSaving(false); }
  }

  function updateFeat(i: number, field: "text" | "bold", value: string | boolean) {
    setFeatDraft(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: value } : f));
    setFeatSaved(false);
  }

  function moveFeat(i: number, dir: -1 | 1) {
    setFeatDraft(prev => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setFeatSaved(false);
  }

  function deleteFeat(i: number) {
    setFeatDraft(prev => prev.filter((_, idx) => idx !== i));
    setFeatSaved(false);
  }

  function addFeat() {
    setFeatDraft(prev => [...prev, { text: "", bold: false }]);
    setFeatSaved(false);
  }

  function updateDraft(tierId: string, field: keyof TierDraft, value: string) {
    setDrafts(prev => ({ ...prev, [tierId]: { ...prev[tierId], [field]: value } }));
    setSaved(prev => ({ ...prev, [tierId]: false }));
    setError(prev => ({ ...prev, [tierId]: "" }));
  }

  async function saveCard(tier: typeof TIERS[number]) {
    const d = drafts[tier.id]; if (!d) return;
    const total = parseDraft(d.total); const stage2 = parseDraft(d.stage2); const stage3 = parseDraft(d.stage3);
    if (!sumOk(d)) {
      setError(prev => ({ ...prev, [tier.id]: `Must balance: HK$3,000 + HK$${fmtNum(stage2)} + HK$${fmtNum(stage3)} = HK$${fmtNum(FIRST_PAYMENT + stage2 + stage3)}, but total is HK$${fmtNum(total)}.` }));
      return;
    }
    setSaving(prev => ({ ...prev, [tier.id]: true }));
    const updated: PricingConfig = { ...pricing, [tier.totalKey]: total, [tier.stage2Key]: stage2, [tier.stage3Key]: stage3 };
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/settings/pricing`, { method: "PUT", body: JSON.stringify(updated) });
      if (!res.ok) throw new Error();
      const result = await res.json(); setPricing(result);
      qc.invalidateQueries({ queryKey: ["pricing"] });
      setSaved(prev => ({ ...prev, [tier.id]: true }));
      setError(prev => ({ ...prev, [tier.id]: "" }));
      setTimeout(() => setSaved(prev => ({ ...prev, [tier.id]: false })), 3000);
    } catch { setError(prev => ({ ...prev, [tier.id]: "Failed to save. Please try again." })); }
    finally { setSaving(prev => ({ ...prev, [tier.id]: false })); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
    </div>
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto w-full">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-0.5" style={{ color: C.tHead, letterSpacing: "-0.01em" }}>Package Pricing</h1>
        <p className="text-xs" style={{ color: C.tFaint }}>
          Edit package totals and payment stage amounts. Changes apply immediately to the public pricing page.
        </p>
      </div>

      {/* USD Conversion Rate */}
      <div className="mb-8 rounded-2xl border overflow-hidden" style={{ background: C.card, borderColor: C.borderMed, boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
        <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${GOLD}, transparent)` }} />
        <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-sm font-bold mb-0.5" style={{ color: C.tHead }}>USD Conversion Rate</h2>
            <p className="text-xs" style={{ color: C.tFaint }}>
              All package prices are stored in HKD. Set the rate used to display equivalent USD prices to visitors.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ background: C.muted, borderColor: C.borderMed }}>
              <span className="text-xs font-semibold" style={{ color: C.tFaint }}>1 USD =</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={usdRateDraft}
                onChange={e => { setUsdRateDraft(e.target.value); setUsdRateSaved(false); setUsdRateError(null); }}
                className="w-24 text-sm font-bold outline-none bg-transparent"
                style={{ color: C.inputText }}
              />
              <span className="text-xs font-semibold" style={{ color: C.tFaint }}>HKD</span>
            </div>
            <button
              onClick={saveUsdRate}
              disabled={usdRateSaving}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: usdRateSaved ? "rgba(74,222,128,0.15)" : "rgba(162,137,89,0.12)",
                color: usdRateSaved ? "#4ade80" : GOLD_B,
                border: `1px solid ${usdRateSaved ? "rgba(74,222,128,0.4)" : C.borderMed}`,
                opacity: usdRateSaving ? 0.6 : 1,
              }}>
              {usdRateSaving ? "Saving…" : usdRateSaved ? "✓ Saved" : "Save Rate"}
            </button>
          </div>
        </div>
        {usdRateError && (
          <div className="px-5 pb-4">
            <p className="text-xs" style={{ color: "#f87171" }}>{usdRateError}</p>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        {TIERS.map(tier => {
          const d = drafts[tier.id] ?? { total: "", stage2: "", stage3: "" };
          const ok = sumOk(d);
          const isSaving = saving[tier.id];
          const isSaved  = saved[tier.id];
          const errMsg   = error[tier.id];
          const stage2Num   = parseDraft(d.stage2);
          const stage3Num   = parseDraft(d.stage3);
          const computedSum = FIRST_PAYMENT + stage2Num + stage3Num;

          return (
            <div key={tier.id}
              className="relative flex flex-col rounded-2xl overflow-hidden"
              style={{
                background: C.card,
                border: `1.5px solid ${tier.badge ? C.borderStr : C.borderMed}`,
                boxShadow: tier.badge
                  ? `0 0 0 1px ${C.muted}, 0 4px 32px rgba(162,137,89,0.10)`
                  : `0 2px 16px rgba(0,0,0,0.08)`,
              }}>

              {/* Gold shimmer top bar */}
              <div className="h-px w-full" style={{ background: tier.badge
                ? `linear-gradient(to right, transparent, ${GOLD_B}, transparent)`
                : `linear-gradient(to right, transparent, ${GOLD}, transparent)` }} />

              {/* Most Popular badge */}
              {tier.badge && (
                <div className="flex justify-center pt-4 pb-1">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase"
                    style={{ background: "rgba(196,169,110,0.12)", color: C.tHead, border: `1px solid ${C.borderStr}` }}>
                    ✦ Most Popular
                  </span>
                </div>
              )}

              <div className={`p-5 flex-1 flex flex-col ${tier.badge ? "pt-3" : "pt-5"}`}>

                {/* Tier header */}
                <div className="mb-5">
                  <h2 className="text-base font-bold" style={{ color: C.tHead }}>{tier.label}</h2>
                  <p className="text-[10px] font-semibold tracking-widest uppercase mt-0.5" style={{ color: C.tFaint }}>
                    Full Service Package
                  </p>
                </div>

                {/* Total price input */}
                <div className="mb-5">
                  <label className="block text-[10px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: C.tFaint }}>
                    Total Package Price (HKD$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: GOLD_B }}>HK$</span>
                    <input type="number" value={d.total}
                      onChange={e => updateDraft(tier.id, "total", e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl text-xl font-extrabold border-2 outline-none transition-all"
                      style={{ ...inputStyle, borderColor: ok ? C.borderMed : "rgba(248,113,113,0.50)" }} />
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-1.5 mb-5">
                  {featDraft.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-xs"
                      style={{ color: f.bold ? GOLD_B : C.tMid, fontWeight: f.bold ? 600 : 400 }}>
                      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: f.bold ? GOLD_B : GOLD }}>
                        <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {f.text}
                    </li>
                  ))}
                </ul>

                {/* Payment schedule */}
                <div className="rounded-xl border p-4 mb-4" style={{ background: C.muted, borderColor: C.border }}>
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-3 flex items-center gap-1.5" style={{ color: GOLD_B }}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0">
                      <path d="M8 2l1.8 3.6L14 6.5l-3 2.9.7 4.1L8 11.4l-3.7 1.9.7-4.1-3-2.9 4.2-.9z" strokeLinejoin="round"/>
                    </svg>
                    Balance Payment Schedule
                  </p>

                  <div className="flex items-center justify-between mb-3 pb-3 border-b" style={{ borderColor: C.border }}>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: C.tBody }}>First Payment</p>
                      <p className="text-[11px]" style={{ color: C.tFaint }}>non-refundable consultancy fee</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: C.tHead }}>HK$3,000</p>
                      <p className="text-[10px]" style={{ color: C.tFaint }}>fixed</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs font-semibold mb-0.5" style={{ color: C.tBody }}>Stage 2 — Application</p>
                    <p className="text-[11px] mb-1.5" style={{ color: C.tFaint }}>due before first submission</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: GOLD }}>HK$</span>
                      <input type="number" value={d.stage2}
                        onChange={e => updateDraft(tier.id, "stage2", e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg text-sm font-bold border outline-none transition-all"
                        style={inputStyle} />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold mb-0.5" style={{ color: C.tBody }}>Stage 3 — Success Fee</p>
                    <p className="text-[11px] mb-1.5" style={{ color: C.tFaint }}>within 7 days of offer letter</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: GOLD }}>HK$</span>
                      <input type="number" value={d.stage3}
                        onChange={e => updateDraft(tier.id, "stage3", e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg text-sm font-bold border outline-none transition-all"
                        style={inputStyle} />
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2 text-[11px] font-semibold"
                    style={{ borderColor: C.border, color: ok ? GOLD_B : "#f87171" }}>
                    <span className="flex items-center gap-1.5">
                      {ok
                        ? <><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-3.5 h-3.5 shrink-0"><path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>Amounts balance</>
                        : <><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0"><path d="M8 2L1 14h14L8 2z" strokeLinejoin="round"/><path d="M8 7v3M8 12v.5" strokeLinecap="round"/></svg>Don't balance</>}
                    </span>
                    <span className="font-mono text-[10px]">
                      3k + {fmtNum(stage2Num)} + {fmtNum(stage3Num)} = {fmtNum(computedSum)}
                    </span>
                  </div>
                </div>

                {/* Per-card note */}
                <div className="rounded-xl border px-3.5 py-3 mb-4" style={{ background: C.muted, borderColor: C.border }}>
                  <p className="text-[11px] leading-relaxed flex items-start gap-1.5" style={{ color: C.tMid }}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: GOLD }}>
                      <circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5.5v.5" strokeLinecap="round"/>
                    </svg>
                    {tier.note}
                  </p>
                </div>

                {/* Error */}
                {errMsg && (
                  <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 mb-4"
                    style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#f87171" }}>
                      <circle cx="8" cy="8" r="6"/><path d="M8 5v3.5M8 11v.5" strokeLinecap="round"/>
                    </svg>
                    <p className="text-[11px] leading-relaxed" style={{ color: "#f87171" }}>{errMsg}</p>
                  </div>
                )}

                {/* Save button */}
                <button onClick={() => saveCard(tier)} disabled={isSaving || !ok}
                  className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 border"
                  style={{
                    background: isSaved ? "rgba(162,137,89,0.12)" : C.accentBg,
                    color: isSaved ? C.tHead : GOLD_B,
                    borderColor: isSaved ? C.borderStr : C.borderMed,
                  }}>
                  {isSaving ? (
                    <><span className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: GOLD_B, borderTopColor: "transparent" }} /> Saving…</>
                  ) : isSaved ? (
                    <><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-3.5 h-3.5 shrink-0"><path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>Saved</>
                  ) : (
                    <><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0"><path d="M2 11V13h11V11M7 2v7M4.5 6.5L7 9l2.5-2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Save Changes</>
                  )}
                </button>

              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="mt-5 rounded-xl border px-5 py-4" style={{ background: C.muted, borderColor: C.border }}>
        <p className="text-xs leading-relaxed" style={{ color: C.tMid }}>
          <span className="font-semibold" style={{ color: GOLD_B }}>Note:</span>{" "}
          Amounts must balance — Total must equal HK$3,000 (first payment) + Stage 2 + Stage 3.
          Changes take effect immediately on the public packages page. Each card saves independently.
        </p>
      </div>

      {/* Package Features Editor */}
      <div className="mt-10">
        <div className="mb-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: C.muted, border: `1px solid ${C.borderMed}` }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4" style={{ color: GOLD_B }}>
              <path d="M3 8l3.5 3.5L13 4.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: C.tHead }}>Package Features</h2>
            <p className="text-xs" style={{ color: C.tFaint }}>
              These bullet points appear on all four package cards. Edit, reorder, or toggle bold styling.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden" style={{ background: C.card, borderColor: C.borderMed }}>
          <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${GOLD_B}, transparent)` }} />

          <div className="p-5 space-y-2">
            {featDraft.map((feat, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-xl border" style={{ background: C.muted, borderColor: C.border }}>
                {/* Up/down */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => moveFeat(i, -1)} disabled={i === 0}
                    className="w-5 h-5 flex items-center justify-center rounded transition-opacity disabled:opacity-20 hover:opacity-70"
                    style={{ color: GOLD_B }}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M4 10l4-4 4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <button onClick={() => moveFeat(i, 1)} disabled={i === featDraft.length - 1}
                    className="w-5 h-5 flex items-center justify-center rounded transition-opacity disabled:opacity-20 hover:opacity-70"
                    style={{ color: GOLD_B }}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>

                {/* Checkmark */}
                <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }}>
                  <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>

                {/* Text input */}
                <input
                  type="text"
                  value={feat.text}
                  onChange={e => updateFeat(i, "text", e.target.value)}
                  placeholder="Feature description…"
                  className="flex-1 px-2.5 py-1.5 rounded-lg border text-xs outline-none transition-all placeholder:opacity-30"
                  style={{ ...inputStyle, fontWeight: feat.bold ? 700 : 400 }}
                />

                {/* Bold toggle */}
                <button
                  onClick={() => updateFeat(i, "bold", !feat.bold)}
                  title="Toggle bold"
                  className="w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-extrabold transition-all shrink-0"
                  style={{
                    background: feat.bold ? "rgba(196,169,110,0.2)" : C.muted,
                    borderColor: feat.bold ? C.borderStr : C.border,
                    color: feat.bold ? GOLD_B : C.tFaint,
                  }}>
                  B
                </button>

                {/* Delete */}
                <button onClick={() => deleteFeat(i)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border transition-all shrink-0 hover:opacity-70"
                  style={{ background: "rgba(248,113,113,0.07)", borderColor: "rgba(248,113,113,0.2)", color: "#f87171" }}>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                    <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="px-5 pb-5 flex items-center gap-3 flex-wrap">
            {/* Add feature */}
            <button onClick={addFeat}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: C.muted, borderColor: C.borderMed, color: C.tMid }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5"><path d="M8 3v10M3 8h10" strokeLinecap="round"/></svg>
              Add Feature
            </button>

            {/* Error */}
            {featError && (
              <div className="flex items-center gap-2 text-xs" style={{ color: "#f87171" }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5M8 11v.5" strokeLinecap="round"/></svg>
                {featError}
              </div>
            )}

            {/* Save */}
            <button onClick={saveFeatures} disabled={featSaving}
              className="ml-auto flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40 hover:opacity-90 border"
              style={{
                background: featSaved ? "rgba(162,137,89,0.12)" : C.accentBg,
                color: featSaved ? C.tHead : GOLD_B,
                borderColor: featSaved ? C.borderStr : C.borderMed,
              }}>
              {featSaving ? (
                <><span className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: GOLD_B, borderTopColor: "transparent" }} /> Saving…</>
              ) : featSaved ? (
                <><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-3.5 h-3.5"><path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>Saved</>
              ) : (
                <><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M2 11V13h11V11M7 2v7M4.5 6.5L7 9l2.5-2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Save Features</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className="mt-10">
        <div className="mb-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: C.muted, border: `1px solid ${C.borderMed}` }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4" style={{ color: GOLD_B }}>
              <path d="M2 14V7M6 14V7M10 14V7M14 14V7M1 7h14M8 2l7 5H1l7-5z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: C.tHead }}>Payment Bank Details</h2>
            <p className="text-xs" style={{ color: C.tFaint }}>
              Displayed on the student portal payment page. Update whenever account details change.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden" style={{ background: C.card, borderColor: C.borderMed }}>
          <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${GOLD_B}, transparent)` }} />
          <div className="p-6 grid md:grid-cols-2 gap-5">
            {([
              { key: "bankName",      label: "Bank Name",      placeholder: "e.g. Hang Seng Bank" },
              { key: "accountName",   label: "Account Name",   placeholder: "e.g. Harrowgate Consultancy Ltd" },
              { key: "accountNumber", label: "Account Number", placeholder: "e.g. 123-456789-001" },
              { key: "fps",           label: "FPS ID / Phone", placeholder: "e.g. 60606457" },
            ] as { key: keyof BankDetails; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-[10px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: C.tFaint }}>{label}</label>
                <input type="text" value={bankDetails[key]}
                  onChange={e => { setBankDetails(prev => ({ ...prev, [key]: e.target.value })); setBankSaved(false); }}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all placeholder:opacity-30"
                  style={inputStyle} />
              </div>
            ))}

            <div className="md:col-span-2">
              <label className="block text-[10px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: C.tFaint }}>Additional Info (optional)</label>
              <textarea rows={2} value={bankDetails.additionalInfo}
                onChange={e => { setBankDetails(prev => ({ ...prev, additionalInfo: e.target.value })); setBankSaved(false); }}
                placeholder="e.g. Please include your full name in the payment reference."
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all resize-none placeholder:opacity-30"
                style={inputStyle} />
            </div>
          </div>

          <div className="px-6 pb-6 flex items-center gap-4">
            {bankError && (
              <div className="flex items-center gap-2 text-xs" style={{ color: "#f87171" }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0">
                  <circle cx="8" cy="8" r="6"/><path d="M8 5v3.5M8 11v.5" strokeLinecap="round"/>
                </svg>
                {bankError}
              </div>
            )}
            <button onClick={saveBankDetails} disabled={bankSaving}
              className="ml-auto flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 hover:opacity-90 border"
              style={{
                background: bankSaved ? "rgba(162,137,89,0.12)" : C.accentBg,
                color: bankSaved ? C.tHead : GOLD_B,
                borderColor: bankSaved ? C.borderStr : C.borderMed,
              }}>
              {bankSaving ? (
                <><span className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: GOLD_B, borderTopColor: "transparent" }} />Saving…</>
              ) : bankSaved ? (
                <><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-3.5 h-3.5 shrink-0"><path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>Saved</>
              ) : (
                <><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0"><path d="M2 11V13h11V11M7 2v7M4.5 6.5L7 9l2.5-2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Save Bank Details</>
              )}
            </button>
          </div>
        </div>
      </div>
      {/* Payment Methods */}
      <div className="mt-10">
        <div className="mb-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: C.muted, border: `1px solid ${C.borderMed}` }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4" style={{ color: GOLD_B }}>
              <path d="M2 5a1 1 0 011-1h10a1 1 0 011 1v1H2V5zM2 8h12v4a1 1 0 01-1 1H3a1 1 0 01-1-1V8zm3 2h1.5m2 0h2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: C.tHead }}>Payment Methods</h2>
            <p className="text-xs" style={{ color: C.tFaint }}>
              Enable additional payment options for students alongside Bank / FPS.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Alipay */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: C.card, borderColor: C.borderMed }}>
            <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${GOLD_B}, transparent)` }} />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔵</span>
                  <span className="font-semibold text-sm" style={{ color: C.tHead }}>Alipay 支付宝</span>
                </div>
                <button onClick={() => { setPmConfig(p => ({ ...p, alipay: { ...p.alipay, enabled: !p.alipay.enabled } })); setPmSaved(false); }}
                  className="relative w-11 h-6 rounded-full border-2 transition-all"
                  style={{ background: pmConfig.alipay.enabled ? "rgba(162,137,89,0.30)" : C.muted, borderColor: pmConfig.alipay.enabled ? GOLD_B : C.border }}>
                  <span className="absolute top-0.5 transition-all w-4 h-4 rounded-full"
                    style={{ background: pmConfig.alipay.enabled ? GOLD_B : C.tFaint, left: pmConfig.alipay.enabled ? "calc(100% - 1.25rem)" : "0.125rem" }} />
                </button>
              </div>
              {pmConfig.alipay.enabled && (
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { key: "accountName" as const, label: "Account Holder Name", placeholder: "e.g. Harrowgate Consultancy" },
                    { key: "accountId"   as const, label: "Alipay ID / Phone",   placeholder: "e.g. +852 6060 6457" },
                    { key: "qrCodeUrl"   as const, label: "QR Code Image URL",   placeholder: "https://... (paste image URL)" },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className={key === "qrCodeUrl" ? "md:col-span-2" : ""}>
                      <label className="block text-[10px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: C.tFaint }}>{label}</label>
                      <input type="text" value={pmConfig.alipay[key]}
                        onChange={e => { setPmConfig(p => ({ ...p, alipay: { ...p.alipay, [key]: e.target.value } })); setPmSaved(false); }}
                        placeholder={placeholder}
                        className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all placeholder:opacity-30"
                        style={inputStyle} />
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: C.tFaint }}>Instructions (optional)</label>
                    <textarea rows={2} value={pmConfig.alipay.instructions}
                      onChange={e => { setPmConfig(p => ({ ...p, alipay: { ...p.alipay, instructions: e.target.value } })); setPmSaved(false); }}
                      placeholder="e.g. Include your full name in the Alipay transfer note."
                      className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all resize-none placeholder:opacity-30"
                      style={inputStyle} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Visa / Mastercard */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: C.card, borderColor: C.borderMed }}>
            <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${GOLD_B}, transparent)` }} />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-base">💳</span>
                  <span className="font-semibold text-sm" style={{ color: C.tHead }}>Visa / Mastercard</span>
                </div>
                <button onClick={() => { setPmConfig(p => ({ ...p, card: { ...p.card, enabled: !p.card.enabled } })); setPmSaved(false); }}
                  className="relative w-11 h-6 rounded-full border-2 transition-all"
                  style={{ background: pmConfig.card.enabled ? "rgba(162,137,89,0.30)" : C.muted, borderColor: pmConfig.card.enabled ? GOLD_B : C.border }}>
                  <span className="absolute top-0.5 transition-all w-4 h-4 rounded-full"
                    style={{ background: pmConfig.card.enabled ? GOLD_B : C.tFaint, left: pmConfig.card.enabled ? "calc(100% - 1.25rem)" : "0.125rem" }} />
                </button>
              </div>
              {pmConfig.card.enabled && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: C.tFaint }}>Payment Link URL</label>
                    <input type="text" value={pmConfig.card.paymentLink}
                      onChange={e => { setPmConfig(p => ({ ...p, card: { ...p.card, paymentLink: e.target.value } })); setPmSaved(false); }}
                      placeholder="https://pay.example.com/harrowgate"
                      className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all placeholder:opacity-30"
                      style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: C.tFaint }}>Instructions (optional)</label>
                    <textarea rows={2} value={pmConfig.card.instructions}
                      onChange={e => { setPmConfig(p => ({ ...p, card: { ...p.card, instructions: e.target.value } })); setPmSaved(false); }}
                      placeholder="e.g. A 2.5% processing fee applies to card payments."
                      className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all resize-none placeholder:opacity-30"
                      style={inputStyle} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-4 pt-1">
            {pmError && (
              <div className="flex items-center gap-2 text-xs" style={{ color: "#f87171" }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5M8 11v.5" strokeLinecap="round"/></svg>
                {pmError}
              </div>
            )}
            <button onClick={savePaymentMethods} disabled={pmSaving}
              className="ml-auto flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 hover:opacity-90 border"
              style={{
                background: pmSaved ? "rgba(162,137,89,0.12)" : C.accentBg,
                color: pmSaved ? C.tHead : GOLD_B,
                borderColor: pmSaved ? C.borderStr : C.borderMed,
              }}>
              {pmSaving ? (
                <><span className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: GOLD_B, borderTopColor: "transparent" }} />Saving…</>
              ) : pmSaved ? (
                <><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-3.5 h-3.5 shrink-0"><path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>Saved</>
              ) : (
                <><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0"><path d="M2 11V13h11V11M7 2v7M4.5 6.5L7 9l2.5-2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Save Payment Methods</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
