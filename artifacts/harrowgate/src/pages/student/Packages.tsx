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

const PACKAGE_BASE = [
  { key: "tier1", icon: "🎓", badge: true,  firstPayment: "HKD$ 3,000", color: "#a28959", bg: "rgba(162,137,89,0.07)",  border: "rgba(162,137,89,0.25)", highlight: true  },
  { key: "tier2", icon: "📚", badge: false, firstPayment: "HKD$ 3,000", color: "#60a5fa", bg: "rgba(96,165,250,0.05)",  border: "rgba(96,165,250,0.18)",  highlight: false },
  { key: "tier3", icon: "🏫", badge: false, firstPayment: "HKD$ 3,000", color: "#4ade80", bg: "rgba(74,222,128,0.05)", border: "rgba(74,222,128,0.18)",  highlight: false },
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
    title: "Service Packages & Pricing — Harrowgate Consultancy Hong Kong",
    description: "View Harrowgate's Hong Kong student visa packages. Transparent pricing, full document support, and dedicated case management. Start your application from HKD 3,000.",
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
            {PACKAGE_BASE.map((pkg, i) => {
              const totals = [pricing.mastersTotal, pricing.bachelorTotal, pricing.associateTotal];
              const total = totals[i];
              return (
                <div key={pkg.key}
                  className="relative flex flex-col rounded-3xl p-8 border transition-all hover:scale-[1.02]"
                  style={{
                    background: pkg.bg,
                    borderColor: pkg.border,
                    boxShadow: pkg.highlight ? `0 0 40px rgba(162,137,89,0.12)` : "none",
                  }}>
                  {pkg.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
                        style={{ background: GOLD, color: BG }}>
                        {t("pkg.popular")}
                      </span>
                    </div>
                  )}

                  <div className="text-4xl mb-4">{pkg.icon}</div>
                  <h2 className="text-3xl font-bold mb-1" style={{ color: pkg.color }}>{t(`pkg.${pkg.key}`)}</h2>
                  <p className="text-xs font-semibold tracking-widest uppercase mb-6" style={{ color: "rgba(162,137,89,0.4)" }}>
                    {t("pkg.fullService")}
                  </p>

                  <div className="rounded-2xl p-5 mb-6 border" style={{ background: "rgba(0,0,0,0.15)", borderColor: "rgba(162,137,89,0.1)" }}>
                    <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "rgba(162,137,89,0.45)" }}>
                      {t("pkg.totalCost")}
                    </p>
                    <p className="text-3xl font-bold mb-4" style={{ color: pkg.color }}>{total}</p>

                    <div className="border-t pt-4" style={{ borderColor: "rgba(162,137,89,0.1)" }}>
                      <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "rgba(162,137,89,0.45)" }}>
                        {t("pkg.firstPayment")}
                      </p>
                      <p className="text-xl font-bold" style={{ color: GOLD }}>{pkg.firstPayment}</p>
                      <p className="text-xs mt-1" style={{ color: "rgba(162,137,89,0.4)" }}>
                        {t("pkg.balance")}
                      </p>
                    </div>
                  </div>

                  <ul className="flex-1 space-y-3 mb-8">
                    {(["pkg.f1", "pkg.f2", "pkg.f3"] as const).map((fKey) => (
                      <li key={fKey} className="flex items-start gap-2.5 text-sm" style={{ color: GOLD_DIM }}>
                        <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 shrink-0 mt-0.5" style={{ color: pkg.color }}>
                          <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {t(fKey)}
                      </li>
                    ))}
                  </ul>

                  <Link href="/sign-up"
                    className="w-full text-center py-4 rounded-2xl text-sm font-bold transition-all hover:opacity-90"
                    style={{ background: pkg.highlight ? GOLD : "transparent", color: pkg.highlight ? BG : pkg.color, border: pkg.highlight ? "none" : `1.5px solid ${pkg.border}` }}>
                    {t("pkg.startFor")} {pkg.firstPayment} →
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Note */}
          <div className="mt-12 rounded-2xl p-6 border text-center max-w-2xl mx-auto" style={{ background: "rgba(162,137,89,0.04)", borderColor: GOLD_FAINT }}>
            <p className="text-base font-semibold mb-2" style={{ color: GOLD }}>{t("pkg.afterTitle")}</p>
            <p className="text-sm leading-relaxed" style={{ color: GOLD_DIM }}>{t("pkg.afterSub")}</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-10 px-6 border-t" style={{ borderColor: GOLD_FAINT }}>
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <img src={`${basePath}/harrowgate-logo.png`} alt="HARROWGATE" className="h-12 object-contain opacity-50" />
            <p className="text-xs" style={{ color: "rgba(162,137,89,0.3)" }}>© {new Date().getFullYear()} HARROWGATE Consultancy, Hong Kong.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
