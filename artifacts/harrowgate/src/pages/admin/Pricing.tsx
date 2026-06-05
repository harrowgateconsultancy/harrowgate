import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, AlertCircle, Save, RefreshCw, Building2 } from "lucide-react";
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

const SHARED_FEATURES: { text: string; bold?: boolean }[] = [
  { text: "1st semester tuition fee inclusive (paid by students)", bold: true },
  { text: "Application documents review" },
  { text: "University enrollment guidance" },
  { text: "Visa document checklist" },
  { text: "Full application & form filling guide" },
  { text: "Immigration letter assistance" },
  { text: "Visa form review & Guidance" },
  { text: "Pre-departure briefing session" },
  { text: "Phone plan setup guide" },
  { text: "Emergency contact protocols" },
  { text: "Priority WhatsApp support" },
  { text: "Service ends upon arrival at university", bold: true },
];

const TIERS = [
  {
    id: "associate",
    label: "Associate Degree",
    color: "#4ade80",
    accentBg: "rgba(74,222,128,0.12)",
    badge: false,
    totalKey: "associateTotal" as keyof PricingConfig,
    stage2Key: "associateStage2" as keyof PricingConfig,
    stage3Key: "associateLastPayment" as keyof PricingConfig,
    features: SHARED_FEATURES,
    note: "HK$3,000 initial fee is for consultancy services only. Non-refundable once paid — separate from tuition.",
  },
  {
    id: "bachelor",
    label: "Bachelor's Degree",
    color: "#a28959",
    accentBg: "rgba(162,137,89,0.15)",
    badge: true,
    totalKey: "bachelorTotal" as keyof PricingConfig,
    stage2Key: "bachelorStage2" as keyof PricingConfig,
    stage3Key: "bachelorLastPayment" as keyof PricingConfig,
    features: SHARED_FEATURES,
    note: "Initial HK$3,000 covers professional consultancy (non-refundable). Full payment schedule contractually binding per HK law.",
  },
  {
    id: "master",
    label: "Master's Degree",
    color: "#60a5fa",
    accentBg: "rgba(96,165,250,0.12)",
    badge: false,
    totalKey: "mastersTotal" as keyof PricingConfig,
    stage2Key: "mastersStage2" as keyof PricingConfig,
    stage3Key: "mastersLastPayment" as keyof PricingConfig,
    features: SHARED_FEATURES,
    note: "The HK$3,000 initial fee is solely for consultancy services (non-refundable). Balance stages are binding after this payment.",
  },
];

interface TierDraft {
  total: string;
  stage2: string;
  stage3: string;
}

interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  fps: string;
  additionalInfo: string;
}

const DEFAULT_BANK_DETAILS: BankDetails = {
  bankName: "",
  accountName: "",
  accountNumber: "",
  fps: "",
  additionalInfo: "",
};

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

  const [bankDetails, setBankDetails] = useState<BankDetails>(DEFAULT_BANK_DETAILS);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankSaved, setBankSaved] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${getApiBase()}/api/settings/pricing`)
      .then(r => r.json())
      .then((p: PricingConfig) => {
        setPricing(p);
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
          d[tier.id] = {
            total:  String(DEFAULT_PRICING[tier.totalKey]),
            stage2: String(DEFAULT_PRICING[tier.stage2Key]),
            stage3: String(DEFAULT_PRICING[tier.stage3Key]),
          };
        });
        setDrafts(d);
      })
      .finally(() => setLoading(false));

    fetch(`${getApiBase()}/api/settings/bank-details`)
      .then(r => r.json())
      .then((b: BankDetails) => setBankDetails(b))
      .catch(() => {});
  }, []);

  async function saveBankDetails() {
    setBankSaving(true);
    setBankError(null);
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/settings/bank-details`, {
        method: "PUT",
        body: JSON.stringify(bankDetails),
      });
      if (!res.ok) throw new Error("Server error");
      qc.invalidateQueries({ queryKey: ["bank-details"] });
      setBankSaved(true);
      setTimeout(() => setBankSaved(false), 3000);
    } catch {
      setBankError("Failed to save. Please try again.");
    } finally {
      setBankSaving(false);
    }
  }

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
        [tier.id]: `Must balance: HK$3,000 + HK$${fmtNum(stage2)} + HK$${fmtNum(stage3)} = HK$${fmtNum(FIRST_PAYMENT + stage2 + stage3)}, but total is HK$${fmtNum(total)}.`,
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
      const result = await res.json();
      setPricing(result);
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

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Package Pricing</h1>
        <p className="text-sm text-muted-foreground">
          Edit package totals and payment stage amounts. Changes apply immediately to the public pricing page.
        </p>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-3 gap-6 items-stretch">
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
            <div
              key={tier.id}
              className="relative flex flex-col rounded-2xl bg-card border border-border overflow-hidden"
            >
              {/* Coloured top bar */}
              <div className="h-1.5 w-full" style={{ background: tier.color }} />

              {/* Most Popular badge */}
              {tier.badge && (
                <div className="absolute top-5 left-1/2 -translate-x-1/2">
                  <span
                    className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase"
                    style={{ background: tier.color, color: "#0d1a3a" }}
                  >
                    ⭐ Most Popular
                  </span>
                </div>
              )}

              <div className={`p-6 flex-1 flex flex-col ${tier.badge ? "pt-10" : ""}`}>

                {/* Tier header */}
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-foreground">{tier.label}</h2>
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mt-0.5">
                    Full Service Package
                  </p>
                </div>

                {/* Total price input */}
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Total Package Price (HKD$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">HK$</span>
                    <input
                      type="number"
                      value={d.total}
                      onChange={e => updateDraft(tier.id, "total", e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl text-xl font-extrabold border-2 outline-none transition-all bg-muted text-foreground focus:ring-2"
                      style={{
                        borderColor: ok ? tier.color + "60" : "#f87171",
                      }}
                    />
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-5">
                  {tier.features.map((f, fi) => (
                    <li key={fi}
                      className="flex items-start gap-2.5 text-sm text-foreground"
                      style={{ color: f.bold ? tier.color : undefined, fontWeight: f.bold ? 700 : 400 }}>
                      <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 shrink-0 mt-0.5" style={{ color: tier.color }}>
                        <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {f.text}
                    </li>
                  ))}
                </ul>

                {/* Payment schedule */}
                <div className="rounded-xl bg-muted border border-border p-4 mb-4">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-foreground mb-3 flex items-center gap-1.5">
                    <span style={{ color: tier.color }}>★</span> Balance Payment Schedule
                  </p>

                  {/* First payment — fixed */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
                    <div>
                      <p className="text-xs font-semibold text-foreground">First Payment</p>
                      <p className="text-[11px] text-muted-foreground">non-refundable consultancy fee</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: tier.color }}>HK$3,000</p>
                      <p className="text-[10px] text-muted-foreground">fixed</p>
                    </div>
                  </div>

                  {/* Stage 2 */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-foreground">Stage 2 — Application</p>
                    <p className="text-[11px] text-muted-foreground mb-1.5">due before first submission</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">HK$</span>
                      <input
                        type="number"
                        value={d.stage2}
                        onChange={e => updateDraft(tier.id, "stage2", e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg text-sm font-bold border border-border outline-none transition-all bg-background text-foreground focus:border-current"
                      />
                    </div>
                  </div>

                  {/* Stage 3 */}
                  <div>
                    <p className="text-xs font-semibold text-foreground">Stage 3 — Success Fee</p>
                    <p className="text-[11px] text-muted-foreground mb-1.5">within 7 days of offer letter</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">HK$</span>
                      <input
                        type="number"
                        value={d.stage3}
                        onChange={e => updateDraft(tier.id, "stage3", e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg text-sm font-bold border border-border outline-none transition-all bg-background text-foreground focus:border-current"
                      />
                    </div>
                  </div>

                  {/* Balance indicator */}
                  <div className={`mt-3 pt-3 border-t border-border flex items-center justify-between gap-2 text-[11px] font-semibold`}
                    style={{ color: ok ? "#4ade80" : "#f87171" }}>
                    <span>{ok ? "✓ Amounts balance" : "⚠ Don't balance"}</span>
                    <span className="font-mono">
                      3k + {fmtNum(stage2Num)} + {fmtNum(stage3Num)} = {fmtNum(computedSum)}
                    </span>
                  </div>
                </div>

                {/* Per-card note */}
                <div className="rounded-xl bg-muted border border-border px-3.5 py-3 mb-5">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    💡 {tier.note}
                  </p>
                </div>

                {/* Error */}
                {errMsg && (
                  <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 mb-4 bg-destructive/10 border border-destructive/30">
                    <AlertCircle size={14} className="text-destructive mt-0.5 shrink-0" />
                    <p className="text-[11px] text-destructive leading-relaxed">{errMsg}</p>
                  </div>
                )}

                {/* Save button */}
                <button
                  onClick={() => saveCard(tier)}
                  disabled={isSaving || !ok}
                  className="mt-auto w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 border"
                  style={{
                    background: isSaved ? "rgba(74,222,128,0.15)" : tier.accentBg,
                    color: isSaved ? "#4ade80" : tier.color,
                    borderColor: isSaved ? "rgba(74,222,128,0.4)" : tier.color + "50",
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

      {/* Footer note */}
      <div className="mt-6 rounded-xl bg-muted border border-border px-5 py-4">
        <p className="text-sm text-foreground">
          <span className="font-semibold">Note:</span>{" "}
          <span className="text-muted-foreground">
            Amounts must balance — Total must equal HK$3,000 (first payment) + Stage 2 + Stage 3.
            Changes take effect immediately on the public packages page. Each card saves independently.
          </span>
        </p>
      </div>

      {/* Bank Details Editor */}
      <div className="mt-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted border border-border">
            <Building2 size={18} className="text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Payment Bank Details</h2>
            <p className="text-sm text-muted-foreground">
              Displayed on the student portal payment page. Update whenever account details change.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="h-1 w-full" style={{ background: "linear-gradient(to right, #a28959, #60a5fa)" }} />
          <div className="p-6 grid md:grid-cols-2 gap-5">
            {(
              [
                { key: "bankName",      label: "Bank Name",       placeholder: "e.g. Hang Seng Bank" },
                { key: "accountName",   label: "Account Name",    placeholder: "e.g. Harrowgate Consultancy Ltd" },
                { key: "accountNumber", label: "Account Number",  placeholder: "e.g. 123-456789-001" },
                { key: "fps",           label: "FPS ID / Phone",  placeholder: "e.g. 60606457" },
              ] as { key: keyof BankDetails; label: string; placeholder: string }[]
            ).map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                  {label}
                </label>
                <input
                  type="text"
                  value={bankDetails[key]}
                  onChange={e => { setBankDetails(prev => ({ ...prev, [key]: e.target.value })); setBankSaved(false); }}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/40"
                />
              </div>
            ))}

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Additional Info (optional)
              </label>
              <textarea
                rows={2}
                value={bankDetails.additionalInfo}
                onChange={e => { setBankDetails(prev => ({ ...prev, additionalInfo: e.target.value })); setBankSaved(false); }}
                placeholder="e.g. Please include your full name in the payment reference."
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground/40"
              />
            </div>
          </div>

          <div className="px-6 pb-6 flex items-center gap-4">
            {bankError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle size={14} />
                {bankError}
              </div>
            )}
            <button
              onClick={saveBankDetails}
              disabled={bankSaving}
              className="ml-auto flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 border"
              style={{
                background: bankSaved ? "rgba(74,222,128,0.15)" : "rgba(162,137,89,0.12)",
                color: bankSaved ? "#4ade80" : "#a28959",
                borderColor: bankSaved ? "rgba(74,222,128,0.4)" : "rgba(162,137,89,0.4)",
              }}
            >
              {bankSaving ? (
                <><RefreshCw size={14} className="animate-spin" /> Saving…</>
              ) : bankSaved ? (
                <><CheckCircle size={14} /> Saved</>
              ) : (
                <><Save size={14} /> Save Bank Details</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
