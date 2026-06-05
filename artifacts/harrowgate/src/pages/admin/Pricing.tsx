import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, AlertCircle, Save, RefreshCw } from "lucide-react";
import { DEFAULT_PRICING, type PricingConfig } from "../../hooks/usePricing";

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

function fmtNum(n: number) {
  return n.toLocaleString("en-HK");
}

const FIRST_PAYMENT = 3000;

const TIERS = [
  {
    id: "associate",
    label: "Associate Degree",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.06)",
    border: "rgba(74,222,128,0.2)",
    badge: false,
    totalKey: "associateTotal" as keyof PricingConfig,
    stage2Key: "associateStage2" as keyof PricingConfig,
    stage3Key: "associateLastPayment" as keyof PricingConfig,
    features: [
      "1st semester tuition support (6 months up to cap*)",
      "Admission strategy & document planning",
      "Full application & form filling",
      "Immigration / visa letter assistance",
      "All-time WhatsApp & email support",
    ],
    note: "HK$3,000 initial fee is for consultancy services only. Non-refundable once paid — separate from tuition.",
  },
  {
    id: "bachelor",
    label: "Bachelor's Degree",
    color: "#a28959",
    bg: "rgba(162,137,89,0.07)",
    border: "rgba(162,137,89,0.28)",
    badge: true,
    totalKey: "bachelorTotal" as keyof PricingConfig,
    stage2Key: "bachelorStage2" as keyof PricingConfig,
    stage3Key: "bachelorLastPayment" as keyof PricingConfig,
    features: [
      "1st semester tuition support (6 months up to cap*)",
      "Full consulting & mock interviews",
      "Application & document processing",
      "CAS / immigration letter support",
      "Priority WhatsApp & checklist tracking",
    ],
    note: "Initial HK$3,000 covers professional consultancy (non-refundable). Full payment schedule contractually binding per HK law.",
  },
  {
    id: "master",
    label: "Master's Degree",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.06)",
    border: "rgba(96,165,250,0.2)",
    badge: false,
    totalKey: "mastersTotal" as keyof PricingConfig,
    stage2Key: "mastersStage2" as keyof PricingConfig,
    stage3Key: "mastersLastPayment" as keyof PricingConfig,
    features: [
      "1st semester tuition support (6 months up to cap*)",
      "Premium consulting & interview prep",
      "Full application, forms & follow-up",
      "Immigration & visa letter guidance",
      "Dedicated senior consultant + unlimited WhatsApp",
    ],
    note: "The HK$3,000 initial fee is solely for consultancy services (non-refundable). Balance stages are binding after this payment.",
  },
];

interface TierDraft {
  total: string;
  stage2: string;
  stage3: string;
}

function parseDraft(v: string): number {
  return parseInt(v.replace(/[^0-9]/g, ""), 10) || 0;
}

function sumOk(d: TierDraft): boolean {
  return parseDraft(d.total) === FIRST_PAYMENT + parseDraft(d.stage2) + parseDraft(d.stage3);
}

export default function Pricing() {
  const qc = useQueryClient();
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [drafts, setDrafts] = useState<Record<string, TierDraft>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${getApiBase()}/api/settings/pricing`)
      .then(r => r.json())
      .then((p: PricingConfig) => {
        setPricing(p);
        const d: Record<string, TierDraft> = {};
        TIERS.forEach(tier => {
          d[tier.id] = {
            total:  String(p[tier.totalKey] ?? DEFAULT_PRICING[tier.totalKey]),
            stage2: String(p[tier.stage2Key] ?? DEFAULT_PRICING[tier.stage2Key]),
            stage3: String(p[tier.stage3Key] ?? DEFAULT_PRICING[tier.stage3Key]),
          };
        });
        setDrafts(d);
      })
      .catch(() => {
        const d: Record<string, TierDraft> = {};
        TIERS.forEach(tier => {
          d[tier.id] = {
            total:  String(DEFAULT_PRICING[tier.totalKey]),
            stage2: String(DEFAULT_PRICING[tier.stage2Key]),
            stage3: String(DEFAULT_PRICING[tier.stage3Key]),
          };
        });
        setDrafts(d);
      })
      .finally(() => setLoading(false));
  }, []);

  function updateDraft(tierId: string, field: keyof TierDraft, value: string) {
    setDrafts(prev => ({ ...prev, [tierId]: { ...prev[tierId], [field]: value } }));
    setSaved(prev => ({ ...prev, [tierId]: false }));
    setError(prev => ({ ...prev, [tierId]: "" }));
  }

  async function saveCard(tier: typeof TIERS[number]) {
    const d = drafts[tier.id];
    if (!d) return;

    const total  = parseDraft(d.total);
    const stage2 = parseDraft(d.stage2);
    const stage3 = parseDraft(d.stage3);

    if (!sumOk(d)) {
      setError(prev => ({
        ...prev,
        [tier.id]: `Amounts don't balance: HK$3,000 + HK$${fmtNum(stage2)} + HK$${fmtNum(stage3)} = HK$${fmtNum(FIRST_PAYMENT + stage2 + stage3)}, but total is HK$${fmtNum(total)}.`,
      }));
      return;
    }

    setSaving(prev => ({ ...prev, [tier.id]: true }));

    const updated: PricingConfig = {
      ...pricing,
      [tier.totalKey]:  total,
      [tier.stage2Key]: stage2,
      [tier.stage3Key]: stage3,
    };

    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/settings/pricing`, {
        method: "PUT",
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error("Server error");
      const saved = await res.json();
      setPricing(saved);
      qc.invalidateQueries({ queryKey: ["pricing"] });
      setSaved(prev => ({ ...prev, [tier.id]: true }));
      setError(prev => ({ ...prev, [tier.id]: "" }));
      setTimeout(() => setSaved(prev => ({ ...prev, [tier.id]: false })), 3000);
    } catch {
      setError(prev => ({ ...prev, [tier.id]: "Failed to save. Please try again." }));
    } finally {
      setSaving(prev => ({ ...prev, [tier.id]: false }));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const GOLD = "#a28959";
  const GOLD_DIM = "rgba(162,137,89,0.65)";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Package Pricing</h1>
        <p className="text-sm text-muted-foreground">
          Edit package totals and payment stage amounts. Changes apply immediately to the public pricing page.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-stretch">
        {TIERS.map(tier => {
          const d = drafts[tier.id] ?? { total: "", stage2: "", stage3: "" };
          const ok = sumOk(d);
          const isSaving = saving[tier.id];
          const isSaved = saved[tier.id];
          const errMsg = error[tier.id];

          const totalNum  = parseDraft(d.total);
          const stage2Num = parseDraft(d.stage2);
          const stage3Num = parseDraft(d.stage3);
          const computedSum = FIRST_PAYMENT + stage2Num + stage3Num;

          return (
            <div
              key={tier.id}
              className="relative flex flex-col rounded-2xl border"
              style={{ background: tier.bg, borderColor: tier.border }}
            >
              {tier.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase"
                    style={{ background: GOLD, color: "#0b2213" }}>
                    ⭐ Most Popular
                  </span>
                </div>
              )}

              <div className="p-6 flex-1 flex flex-col">
                <h2 className="text-xl font-bold mb-0.5" style={{ color: tier.color }}>{tier.label}</h2>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-5" style={{ color: "rgba(162,137,89,0.4)" }}>
                  Full Service Package
                </p>

                {/* Total price input */}
                <div className="mb-4">
                  <label className="block text-[10px] font-bold tracking-widest uppercase mb-1.5" style={{ color: "rgba(162,137,89,0.45)" }}>
                    Total Package Price (HKD$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: GOLD_DIM }}>HK$</span>
                    <input
                      type="number"
                      value={d.total}
                      onChange={e => updateDraft(tier.id, "total", e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl text-lg font-extrabold border outline-none transition-all"
                      style={{
                        background: "rgba(0,0,0,0.25)",
                        borderColor: ok ? tier.border : "rgba(248,113,113,0.4)",
                        color: tier.color,
                      }}
                    />
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-5">
                  {tier.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-xs" style={{ color: GOLD_DIM }}>
                      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: tier.color }}>
                        <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Payment schedule editor */}
                <div className="rounded-xl p-4 mb-4 border" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(251,100,48,0.22)" }}>
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "rgba(251,100,48,0.8)" }}>
                    ⭐ Balance Payment Schedule (Binding)
                  </p>

                  {/* First payment — fixed */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b" style={{ borderColor: "rgba(162,137,89,0.1)" }}>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: GOLD_DIM }}>First Payment</p>
                      <p className="text-[10px]" style={{ color: "rgba(162,137,89,0.4)" }}>non-refundable consultancy fee</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: tier.color }}>HK$3,000</p>
                      <p className="text-[10px]" style={{ color: "rgba(162,137,89,0.35)" }}>fixed</p>
                    </div>
                  </div>

                  {/* Stage 2 */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <p className="text-xs font-semibold" style={{ color: GOLD_DIM }}>Stage 2 — Application</p>
                        <p className="text-[10px]" style={{ color: "rgba(162,137,89,0.4)" }}>due before first submission</p>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: GOLD_DIM }}>HK$</span>
                      <input
                        type="number"
                        value={d.stage2}
                        onChange={e => updateDraft(tier.id, "stage2", e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg text-sm font-bold border outline-none transition-all"
                        style={{
                          background: "rgba(0,0,0,0.2)",
                          borderColor: "rgba(162,137,89,0.15)",
                          color: tier.color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Stage 3 */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <p className="text-xs font-semibold" style={{ color: GOLD_DIM }}>Stage 3 — Success Fee</p>
                        <p className="text-[10px]" style={{ color: "rgba(162,137,89,0.4)" }}>within 7 days of offer letter</p>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: GOLD_DIM }}>HK$</span>
                      <input
                        type="number"
                        value={d.stage3}
                        onChange={e => updateDraft(tier.id, "stage3", e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg text-sm font-bold border outline-none transition-all"
                        style={{
                          background: "rgba(0,0,0,0.2)",
                          borderColor: "rgba(162,137,89,0.15)",
                          color: tier.color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Sum check */}
                  <div className={`mt-3 pt-3 border-t flex items-center justify-between text-[11px] font-semibold ${ok ? "" : "opacity-80"}`}
                    style={{ borderColor: "rgba(162,137,89,0.1)", color: ok ? "#4ade80" : "#f87171" }}>
                    <span>{ok ? "✓ Amounts balance" : "⚠ Amounts don't balance"}</span>
                    <span>
                      3,000 + {fmtNum(stage2Num)} + {fmtNum(stage3Num)} = {fmtNum(computedSum)}
                    </span>
                  </div>
                </div>

                {/* Per-card note */}
                <div className="rounded-xl px-3 py-2.5 mb-5 border" style={{ background: "rgba(251,191,36,0.04)", borderColor: "rgba(251,191,36,0.12)" }}>
                  <p className="text-[10px] leading-relaxed" style={{ color: "rgba(251,191,36,0.5)" }}>
                    💡 {tier.note}
                  </p>
                </div>

                {/* Error */}
                {errMsg && (
                  <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 mb-4 border border-red-500/20 bg-red-500/05">
                    <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-red-400 leading-relaxed">{errMsg}</p>
                  </div>
                )}

                {/* Save button */}
                <button
                  onClick={() => saveCard(tier)}
                  disabled={isSaving || !ok}
                  className="mt-auto w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                  style={{
                    background: isSaved ? "rgba(74,222,128,0.15)" : tier.id === "bachelor" ? GOLD : "transparent",
                    color: isSaved ? "#4ade80" : tier.id === "bachelor" ? "#0b2213" : tier.color,
                    border: tier.id === "bachelor" && !isSaved ? "none" : `1.5px solid ${isSaved ? "rgba(74,222,128,0.3)" : tier.border}`,
                  }}
                >
                  {isSaving ? (
                    <><RefreshCw size={14} className="animate-spin" /> Saving…</>
                  ) : isSaved ? (
                    <><CheckCircle size={14} /> Saved</>
                  ) : (
                    <><Save size={14} /> Save Changes</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border px-5 py-4" style={{ borderColor: "rgba(162,137,89,0.12)", background: "rgba(162,137,89,0.04)" }}>
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Note:</span> Amounts must balance — Total must equal HK$3,000 (first payment) + Stage 2 + Stage 3. Changes take effect immediately on the public packages page. Each card saves independently.
        </p>
      </div>
    </div>
  );
}
