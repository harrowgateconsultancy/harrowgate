import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useLang, LANG_LIST } from "../../i18n";
import { usePricing } from "../../hooks/usePricing";
import { usePageSEO } from "../../hooks/usePageSEO";

const BG = "#0b2213";
const GOLD = "#a28959";
const GOLD_FAINT = "rgba(162,137,89,0.12)";
const GOLD_DIM = "rgba(162,137,89,0.7)";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

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

const PACKAGES = [
  {
    tierKey:   "tier3",
    badge:     false,
    color:     "#4ade80",
    bg:        "rgba(74,222,128,0.05)",
    border:    "rgba(74,222,128,0.18)",
    highlight: false,
    features:  SHARED_FEATURES,
    stage2Amount: "HK$30,000",
    stage2Note:   "due before first submission",
    stage3Note:   "within 7 days of offer letter",
    cardNote: "HK$3,000 initial fee is for consultancy services only (eligibility, strategy, planning). Non-refundable once paid — separate from tuition. Remaining stages become binding upon deposit.",
  },
  {
    tierKey:   "tier2",
    badge:     true,
    color:     "#a28959",
    bg:        "rgba(162,137,89,0.07)",
    border:    "rgba(162,137,89,0.25)",
    highlight: true,
    features:  SHARED_FEATURES,
    stage2Amount: "HK$40,000",
    stage2Note:   "due before first submission",
    stage3Note:   "within 7 days of offer letter",
    cardNote: "Initial HK$3,000 covers professional consultancy (non-refundable). Not a deposit toward tuition. Once paid, the full payment schedule is contractually binding per HK law.",
  },
  {
    tierKey:   "tier1",
    badge:     false,
    color:     "#60a5fa",
    bg:        "rgba(96,165,250,0.05)",
    border:    "rgba(96,165,250,0.18)",
    highlight: false,
    features:  SHARED_FEATURES,
    stage2Amount: "HK$45,000",
    stage2Note:   "due before first submission",
    stage3Note:   "within 7 days of offer letter",
    cardNote: "The HK$3,000 initial fee is solely for consultancy services (non-refundable). It is earned upon delivery of strategy & eligibility work. Balance stages are binding after this payment.",
  },
];

function LangPicker({ lang, setLang }: { lang: string; setLang: (l: any) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const current = LANG_LIST.find((l) => l.code === lang);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-medium transition-all hover:opacity-80"
        style={{ borderColor: "rgba(162,137,89,0.2)", color: "rgba(162,137,89,0.7)", background: "rgba(162,137,89,0.05)" }}>
        <span>{current?.flag}</span>
        <span className="hidden sm:inline">{current?.name}</span>
        <svg viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-2.5 h-2.5"><path d="M1 1l4 4 4-4" /></svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1.5 rounded-xl border shadow-2xl z-50 overflow-hidden"
          style={{ background: "#0a1f0e", borderColor: "rgba(162,137,89,0.2)", minWidth: 160 }}>
          {LANG_LIST.map((l) => (
            <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-all hover:opacity-90 text-left"
              style={{ background: l.code === lang ? "rgba(162,137,89,0.12)" : "transparent", color: l.code === lang ? GOLD : "rgba(162,137,89,0.55)" }}>
              <span className="text-base">{l.flag}</span> {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Packages() {
  const { lang, setLang, t, isRtl } = useLang();
  const pricing = usePricing();

  usePageSEO({
    title: "Service Packages & Pricing — Harrowgate Education Consultancy Hong Kong",
    description: "View Harrowgate's Hong Kong university application packages. Transparent pricing, full document preparation support, and dedicated advisor management. Start from HKD 3,000.",
  });

  return (
    <div className="min-h-screen overflow-x-hidden" dir={isRtl ? "rtl" : "ltr"} style={{ background: BG, fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: "900px", height: "600px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(162,137,89,0.06) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "-5%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(162,137,89,0.04) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Nav */}
        <nav style={{ borderBottom: `1px solid ${GOLD_FAINT}`, backdropFilter: "blur(12px)", background: "rgba(11,34,19,0.85)", position: "sticky", top: 0, zIndex: 50 }}>
          <div className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto">
            <Link href="/">
              <img src={`${basePath}/harrowgate-logo.png`} alt="HARROWGATE" className="h-16 object-contain cursor-pointer"
                style={{ filter: "drop-shadow(0 0 14px rgba(162,137,89,0.7)) drop-shadow(0 0 5px rgba(162,137,89,0.4))" }} />
            </Link>
            <div className="flex items-center gap-3">
              <LangPicker lang={lang} setLang={setLang} />
              <Link href="/" className="text-sm transition-opacity hover:opacity-70 px-4 py-2" style={{ color: GOLD_DIM }}>{t("nav.back")}</Link>
              <Link href="/sign-up"
                className="text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:opacity-90 hover:scale-105"
                style={{ background: GOLD, color: BG, boxShadow: "0 4px 16px rgba(162,137,89,0.3)" }}>
                {t("nav.getStarted")}
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="pt-20 pb-12 text-center px-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border"
            style={{ background: "rgba(162,137,89,0.08)", borderColor: GOLD_FAINT }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#4ade80" }} />
            <p className="text-xs font-semibold tracking-[0.25em] uppercase" style={{ color: GOLD_DIM }}>
              {t("pkg.badge")}
            </p>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight" style={{ color: GOLD }}>
            {t("pkg.heading")}
          </h1>
          <p className="text-lg max-w-xl mx-auto mb-2" style={{ color: GOLD_DIM }}>
            {t("pkg.sub")} <span className="font-bold" style={{ color: GOLD }}>HKD$ 3,000</span>. {t("pkg.sub2")}
          </p>
        </section>

        {/* Packages Grid */}
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {PACKAGES.map((pkg) => {
              const totalMap: Record<string, string> = {
                tier1: pricing.mastersTotal,
                tier2: pricing.bachelorTotal,
                tier3: pricing.associateTotal,
              };
              const stage2Map: Record<string, string> = {
                tier1: pricing.mastersStage2,
                tier2: pricing.bachelorStage2,
                tier3: pricing.associateStage2,
              };
              const stage3Map: Record<string, string> = {
                tier1: pricing.mastersLastPayment,
                tier2: pricing.bachelorLastPayment,
                tier3: pricing.associateLastPayment,
              };
              const total        = totalMap[pkg.tierKey];
              const stage3Amount = stage3Map[pkg.tierKey];
              const dynamicStage2 = stage2Map[pkg.tierKey];

              return (
                <div key={pkg.tierKey}
                  className="relative flex flex-col rounded-3xl border transition-all hover:scale-[1.01]"
                  style={{
                    background: pkg.bg,
                    borderColor: pkg.border,
                    boxShadow: pkg.highlight ? "0 0 50px rgba(162,137,89,0.15)" : "none",
                  }}>

                  {/* Most Popular badge */}
                  {pkg.badge && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
                      style={{ background: GOLD, color: BG }}>
                      <span>⭐</span> {t("pkg.popular")}
                    </div>
                  )}

                  <div className="p-7 pb-5">
                    {/* Title */}
                    <h2 className="text-2xl font-bold mb-0.5" style={{ color: pkg.color }}>{t(`pkg.${pkg.tierKey}`)}</h2>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-5" style={{ color: "rgba(162,137,89,0.4)" }}>
                      {t("pkg.fullService")}
                    </p>

                    {/* Total price */}
                    <div className="mb-5">
                      <span className="text-4xl font-extrabold" style={{ color: pkg.color }}>{total}</span>
                      <span className="text-sm ml-2" style={{ color: "rgba(162,137,89,0.45)" }}>total</span>
                      <p className="text-[11px] mt-0.5" style={{ color: "rgba(162,137,89,0.35)" }}>package</p>
                    </div>

                    {/* First payment chips */}
                    <div className="flex flex-col gap-1.5 mb-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold self-start"
                        style={{ background: "rgba(96,165,250,0.12)", color: "#93c5fd", border: "1px solid rgba(96,165,250,0.2)" }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#60a5fa" }} />
                        First payment: HK$3,000
                      </div>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-medium self-start"
                        style={{ background: "rgba(251,191,36,0.08)", color: "rgba(251,191,36,0.7)", border: "1px solid rgba(251,191,36,0.15)" }}>
                        🔒 non-refundable consultancy fee
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2.5 mb-6">
                      {pkg.features.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2.5 text-sm"
                          style={{ color: f.bold ? pkg.color : GOLD_DIM, fontWeight: f.bold ? 700 : 400 }}>
                          <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 shrink-0 mt-0.5" style={{ color: pkg.color }}>
                            <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {f.text}
                        </li>
                      ))}
                    </ul>

                    {/* Payment Schedule */}
                    <div className="rounded-xl p-4 mb-4 border" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(251,100,48,0.22)" }}>
                      <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-3 flex items-center gap-1.5"
                        style={{ color: "rgba(251,100,48,0.85)" }}>
                        <span>⭐</span> Balance Payment Schedule (Binding)
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold" style={{ color: GOLD_DIM }}>Stage 2 –</p>
                            <p className="text-xs" style={{ color: "rgba(162,137,89,0.5)" }}>Application</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold" style={{ color: pkg.color }}>{dynamicStage2}</p>
                            <p className="text-[10px]" style={{ color: "rgba(162,137,89,0.4)" }}>{pkg.stage2Note}</p>
                          </div>
                        </div>
                        <div className="border-t pt-2" style={{ borderColor: "rgba(162,137,89,0.1)" }}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold" style={{ color: GOLD_DIM }}>Stage 3 –</p>
                              <p className="text-xs" style={{ color: "rgba(162,137,89,0.5)" }}>Success fee</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold" style={{ color: pkg.color }}>{stage3Amount}</p>
                              <p className="text-[10px]" style={{ color: "rgba(162,137,89,0.4)" }}>{pkg.stage3Note}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Per-card note */}
                    <div className="rounded-xl px-3.5 py-3 mb-6 border" style={{ background: "rgba(251,191,36,0.04)", borderColor: "rgba(251,191,36,0.12)" }}>
                      <p className="text-[11px] leading-relaxed" style={{ color: "rgba(251,191,36,0.55)" }}>
                        💡 {pkg.cardNote}
                      </p>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="px-7 pb-7 mt-auto">
                    <Link href="/sign-up"
                      className="block w-full text-center py-4 rounded-2xl text-sm font-bold transition-all hover:opacity-90 hover:scale-[1.02]"
                      style={{
                        background: pkg.highlight ? GOLD : "transparent",
                        color: pkg.highlight ? BG : pkg.color,
                        border: pkg.highlight ? "none" : `1.5px solid ${pkg.border}`,
                      }}>
                      Start with HK$3,000 →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* After payment note */}
          <div className="mt-12 rounded-2xl p-6 border text-center max-w-2xl mx-auto" style={{ background: "rgba(162,137,89,0.04)", borderColor: GOLD_FAINT }}>
            <p className="text-base font-semibold mb-2" style={{ color: GOLD }}>{t("pkg.afterTitle")}</p>
            <p className="text-sm leading-relaxed" style={{ color: GOLD_DIM }}>{t("pkg.afterSub")}</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-10 px-6 border-t" style={{ borderColor: GOLD_FAINT }}>
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-5">
              <img src={`${basePath}/harrowgate-logo.png`} alt="HARROWGATE" className="h-12 object-contain opacity-50" />
              <p className="text-xs" style={{ color: "rgba(162,137,89,0.3)" }}>© {new Date().getFullYear()} HARROWGATE Consultancy, Hong Kong.</p>
            </div>
            <div className="rounded-xl border px-5 py-4 text-center" style={{ borderColor: "rgba(162,137,89,0.12)", background: "rgba(162,137,89,0.04)" }}>
              <p className="text-[11px] leading-relaxed" style={{ color: "rgba(162,137,89,0.4)" }}>
                <span className="font-semibold" style={{ color: "rgba(162,137,89,0.6)" }}>Legal Notice:</span> HARROWGATE Consultancy is an education consultancy only. We are <span className="font-semibold">not</span> a licensed immigration service provider under the Immigration Service Providers (Regulation) Ordinance (Cap. 658). We do not provide immigration advice or legal advice. For immigration matters, please consult a provider registered with the{" "}
                <a href="https://www.ispb.gov.hk" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70" style={{ color: "rgba(162,137,89,0.55)" }}>Immigration Service Providers Board</a>.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
