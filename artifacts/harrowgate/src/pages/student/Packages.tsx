import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useLang, LANG_LIST } from "../../i18n";
import { usePricing } from "../../hooks/usePricing";
import { usePageSEO } from "../../hooks/usePageSEO";

const BG        = "#0b2213";
const GOLD      = "#a28959";
const GOLD_BRIGHT = "#c4a96e";
const GOLD_LIGHT  = "#f0d28c";
const GOLD_FAINT  = "rgba(162,137,89,0.12)";
const GOLD_DIM    = "rgba(162,137,89,0.7)";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const FEATURE_KEYS: { key: string; bold?: boolean }[] = [
  { key: "pkg.feat1",  bold: true },
  { key: "pkg.feat2" },
  { key: "pkg.feat3" },
  { key: "pkg.feat4" },
  { key: "pkg.feat5" },
  { key: "pkg.feat6" },
  { key: "pkg.feat7" },
  { key: "pkg.feat8" },
  { key: "pkg.feat9" },
  { key: "pkg.feat10" },
  { key: "pkg.feat11" },
  { key: "pkg.feat12", bold: true },
];

const PACKAGES = [
  { tierKey: "tier3", badge: false, highlight: false, cardNoteKey: "pkg.note.tier3" },
  { tierKey: "tier2", badge: true,  highlight: true,  cardNoteKey: "pkg.note.tier2" },
  { tierKey: "tier1", badge: false, highlight: false, cardNoteKey: "pkg.note.tier1" },
  { tierKey: "tier4", badge: false, highlight: false, cardNoteKey: "pkg.note.tier4" },
];

function LangOption({ l, lang, onSelect }: { l: typeof LANG_LIST[0]; lang: string; onSelect: () => void }) {
  const [hov, setHov] = useState(false);
  const active = l.code === lang;
  return (
    <button onClick={onSelect}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left"
      style={{
        background: active ? "rgba(196,169,110,0.18)" : hov ? "rgba(162,137,89,0.12)" : "transparent",
        color: active ? GOLD_LIGHT : hov ? GOLD_BRIGHT : "rgba(162,137,89,0.6)",
        borderLeft: active || hov ? `2px solid ${active ? GOLD_BRIGHT : "rgba(162,137,89,0.4)"}` : "2px solid transparent",
        transition: "all 0.18s ease",
      }}>
      <span className="text-base">{l.flag}</span> {l.name}
    </button>
  );
}

function LangPicker({ lang, setLang }: { lang: string; setLang: (l: any) => void }) {
  const [open, setOpen] = useState(false);
  const [hov, setHov] = useState(false);
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
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-medium"
        style={{
          borderColor: hov ? "rgba(196,169,110,0.6)" : "rgba(162,137,89,0.3)",
          color: hov ? GOLD_BRIGHT : GOLD_DIM,
          background: hov ? "rgba(162,137,89,0.14)" : "rgba(162,137,89,0.07)",
          boxShadow: hov ? "0 0 14px rgba(162,137,89,0.2)" : "none",
          transition: "all 0.2s ease",
        }}>
        <span>{current?.flag}</span>
        <span className="hidden sm:inline">{current?.name}</span>
        <svg viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-2.5 h-2.5"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1.5 rounded-xl border shadow-2xl z-50 overflow-hidden"
          style={{ background: "#0a1f0e", borderColor: "rgba(162,137,89,0.25)", minWidth: 170 }}>
          {LANG_LIST.map((l) => (
            <LangOption key={l.code} l={l} lang={lang} onSelect={() => { setLang(l.code); setOpen(false); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function CTAButton({ highlight, label }: { highlight: boolean; label: string }) {
  const [hov, setHov] = useState(false);
  return (
    <Link href="/sign-up"
      className="block w-full text-center py-4 rounded-2xl text-sm font-bold"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: highlight
          ? hov
            ? `linear-gradient(135deg, #fff9e6, ${GOLD_LIGHT})`
            : `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`
          : hov ? "rgba(196,169,110,0.22)" : "rgba(162,137,89,0.08)",
        color: highlight ? BG : hov ? GOLD_LIGHT : GOLD_BRIGHT,
        border: highlight ? "none" : `1.5px solid ${hov ? "rgba(240,210,140,0.7)" : "rgba(162,137,89,0.25)"}`,
        boxShadow: highlight
          ? hov ? "0 6px 28px rgba(196,169,110,0.55), 0 2px 8px rgba(0,0,0,0.3)" : "0 4px 20px rgba(162,137,89,0.4)"
          : hov ? "0 0 20px rgba(162,137,89,0.3)" : "none",
        transform: hov ? "scale(1.03) translateY(-1px)" : "scale(1) translateY(0)",
        transition: "all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
        letterSpacing: hov ? "0.03em" : "0",
      }}>
      {label}
    </Link>
  );
}

function FeatureItem({ bold, accentColor, label }: { bold?: boolean; accentColor: string; label: string }) {
  const [hov, setHov] = useState(false);
  return (
    <li className="flex items-start gap-2.5 text-sm rounded-lg px-2 py-1 -mx-2"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        color: bold ? accentColor : hov ? "#f0e8d0" : "rgba(212,197,162,0.88)",
        fontWeight: bold ? 700 : 400,
        background: hov ? "rgba(162,137,89,0.1)" : "transparent",
        transition: "all 0.18s ease",
        cursor: "default",
      }}>
      <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 shrink-0 mt-0.5"
        style={{ color: hov ? GOLD_LIGHT : accentColor, transition: "color 0.18s ease" }}>
        <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {label}
    </li>
  );
}

export default function Packages() {
  const { lang, setLang, t, isRtl } = useLang();
  const pricing = usePricing();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoveredNote, setHoveredNote] = useState(false);

  usePageSEO({
    title: "Service Packages & Pricing — Harrowgate Education Consultancy Hong Kong",
    description: "View Harrowgate's Hong Kong university application packages. Transparent pricing, full document preparation support, and dedicated advisor management. Start from HKD 3,000.",
  });

  return (
    <div className="min-h-screen" dir={isRtl ? "rtl" : "ltr"} style={{ background: BG, fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflowX: "clip" }}>

      {/* Ambient background glows */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: "900px", height: "600px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(162,137,89,0.07) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "-5%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(162,137,89,0.05) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Nav */}
        <nav style={{ borderBottom: `1px solid ${GOLD_FAINT}`, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", background: "rgba(11,34,19,0.18)", position: "sticky", top: 0, zIndex: 50 }}>
          <div className="flex items-center justify-between px-6 lg:px-10 xl:px-16 py-3 w-full">
            <Link href="/">
              <img src={`${basePath}/harrowgate-logo.png`} alt="HARROWGATE" className="h-20 object-contain cursor-pointer" />
            </Link>
            <div className="flex items-center gap-3">
              <LangPicker lang={lang} setLang={setLang} />
              <Link href="/" className="text-sm transition-all hover:opacity-70 px-4 py-2" style={{ color: GOLD_DIM }}>{t("nav.back")}</Link>
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
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-6 border"
            style={{ background: "rgba(162,137,89,0.09)", borderColor: "rgba(196,169,110,0.35)", boxShadow: "0 0 18px rgba(162,137,89,0.15)" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#4ade80" }} />
            <p className="text-xs font-bold tracking-[0.25em] uppercase" style={{ color: GOLD_BRIGHT }}>
              {t("pkg.badge")}
            </p>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-5 tracking-tight"
            style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            {t("pkg.heading")}
          </h1>
          <p className="text-lg max-w-xl mx-auto mb-2" style={{ color: GOLD_DIM }}>
            {t("pkg.sub")} <span className="font-bold" style={{ color: GOLD_BRIGHT }}>HKD$ 3,000</span>. {t("pkg.sub2")}
          </p>
        </section>

        {/* Packages Grid */}
        <section className="max-w-[1800px] mx-auto px-6 lg:px-12 pb-20">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {PACKAGES.map((pkg) => {
              const totalMap: Record<string, string> = {
                tier1: pricing.mastersTotal, tier2: pricing.bachelorTotal,
                tier3: pricing.associateTotal, tier4: pricing.diplomaTotal,
              };
              const stage2Map: Record<string, string> = {
                tier1: pricing.mastersStage2, tier2: pricing.bachelorStage2,
                tier3: pricing.associateStage2, tier4: pricing.diplomaStage2,
              };
              const stage3Map: Record<string, string> = {
                tier1: pricing.mastersLastPayment, tier2: pricing.bachelorLastPayment,
                tier3: pricing.associateLastPayment, tier4: pricing.diplomaLastPayment,
              };
              const total          = totalMap[pkg.tierKey];
              const stage3Amount   = stage3Map[pkg.tierKey];
              const dynamicStage2  = stage2Map[pkg.tierKey];
              const isHovered      = hoveredCard === pkg.tierKey;
              const accentColor    = pkg.highlight ? GOLD_LIGHT : GOLD_BRIGHT;

              const cardBg = pkg.highlight
                ? "linear-gradient(160deg, rgba(196,169,110,0.18) 0%, rgba(162,137,89,0.09) 100%)"
                : isHovered
                  ? "linear-gradient(160deg, rgba(162,137,89,0.13) 0%, rgba(162,137,89,0.06) 100%)"
                  : "linear-gradient(160deg, rgba(162,137,89,0.08) 0%, rgba(162,137,89,0.03) 100%)";

              const cardBorder = pkg.highlight
                ? isHovered ? "rgba(240,210,140,0.8)" : "rgba(240,210,140,0.55)"
                : isHovered ? "rgba(196,169,110,0.6)" : "rgba(162,137,89,0.22)";

              const cardShadow = pkg.highlight
                ? isHovered
                  ? "0 0 60px rgba(196,169,110,0.45), 0 20px 60px rgba(0,0,0,0.5)"
                  : "0 0 40px rgba(162,137,89,0.25), 0 8px 32px rgba(0,0,0,0.3)"
                : isHovered
                  ? "0 0 36px rgba(162,137,89,0.3), 0 16px 48px rgba(0,0,0,0.45)"
                  : "0 2px 12px rgba(0,0,0,0.2)";

              return (
                <div key={pkg.tierKey}
                  className="relative flex flex-col rounded-3xl border"
                  style={{
                    background: cardBg,
                    borderColor: cardBorder,
                    boxShadow: cardShadow,
                    transform: isHovered ? "translateY(-6px) scale(1.015)" : "translateY(0) scale(1)",
                    transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={() => setHoveredCard(pkg.tierKey)}
                  onMouseLeave={() => setHoveredCard(null)}>

                  {/* Most Popular badge */}
                  {pkg.badge && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
                      style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, color: BG, boxShadow: "0 0 20px rgba(196,169,110,0.5)" }}>
                      <span>⭐</span> {t("pkg.popular")}
                    </div>
                  )}

                  <div className="p-7 pb-5">
                    {/* Title */}
                    <h2 className="text-2xl font-bold mb-0.5" style={{
                      background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${accentColor} 70%)`,
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                    }}>{t(`pkg.${pkg.tierKey}`)}</h2>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-5" style={{ color: "rgba(196,169,110,0.65)" }}>
                      {t("pkg.fullService")}
                    </p>

                    {/* Total price */}
                    <div className="mb-5">
                      <span className="text-4xl font-extrabold" style={{
                        background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${accentColor} 60%)`,
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                      }}>{total}</span>
                      <span className="text-sm ml-2" style={{ color: "rgba(196,169,110,0.7)" }}>{t("pkg.total")}</span>
                      <p className="text-[11px] mt-0.5" style={{ color: "rgba(196,169,110,0.55)" }}>{t("pkg.package")}</p>
                    </div>

                    {/* First payment chips */}
                    <div className="flex flex-col gap-1.5 mb-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold self-start"
                        style={{ background: "rgba(162,137,89,0.14)", color: GOLD_BRIGHT, border: "1px solid rgba(196,169,110,0.35)" }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD_BRIGHT }} />
                        {t("pkg.firstPay")}
                      </div>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-medium self-start"
                        style={{ background: "rgba(162,137,89,0.08)", color: "rgba(196,169,110,0.7)", border: "1px solid rgba(162,137,89,0.2)" }}>
                        🔒 {t("pkg.nonRefund")}
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-1 mb-6">
                      {FEATURE_KEYS.map((f, fi) => (
                        <FeatureItem key={fi} bold={f.bold} accentColor={accentColor} label={t(f.key)} />
                      ))}
                    </ul>

                    {/* Payment Schedule */}
                    <div className="rounded-xl p-4 mb-4 border"
                      style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(196,169,110,0.2)" }}>
                      <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-3 flex items-center gap-1.5"
                        style={{ color: GOLD_BRIGHT }}>
                        <span>✦</span> {t("pkg.balanceSchedule")}
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold" style={{ color: "rgba(212,197,162,0.9)" }}>{t("pkg.stage2")} –</p>
                            <p className="text-xs" style={{ color: "rgba(196,169,110,0.7)" }}>{t("pkg.stageApp")}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold" style={{ color: accentColor }}>{dynamicStage2}</p>
                            <p className="text-[10px]" style={{ color: "rgba(196,169,110,0.6)" }}>{t("pkg.stage2note")}</p>
                          </div>
                        </div>
                        <div className="border-t pt-2" style={{ borderColor: "rgba(162,137,89,0.15)" }}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold" style={{ color: "rgba(212,197,162,0.9)" }}>{t("pkg.stage3")} –</p>
                              <p className="text-xs" style={{ color: "rgba(196,169,110,0.7)" }}>{t("pkg.stageSuccess")}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold" style={{ color: accentColor }}>{stage3Amount}</p>
                              <p className="text-[10px]" style={{ color: "rgba(196,169,110,0.6)" }}>{t("pkg.stage3note")}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Per-card note */}
                    <div className="rounded-xl px-3.5 py-3 mb-6 border"
                      style={{ background: "rgba(162,137,89,0.08)", borderColor: "rgba(196,169,110,0.22)" }}>
                      <p className="text-[11px] leading-relaxed" style={{ color: "rgba(212,197,162,0.82)" }}>
                        💡 {t(pkg.cardNoteKey)}
                      </p>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="px-7 pb-7 mt-auto">
                    <CTAButton highlight={pkg.highlight} label={t("pkg.startWith")} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* After payment note */}
          <div className="mt-14 rounded-2xl p-7 border text-center max-w-2xl mx-auto"
            style={{
              background: hoveredNote
                ? "linear-gradient(135deg, rgba(196,169,110,0.18) 0%, rgba(162,137,89,0.09) 100%)"
                : "linear-gradient(135deg, rgba(162,137,89,0.09) 0%, rgba(162,137,89,0.05) 100%)",
              borderColor: hoveredNote ? "rgba(240,210,140,0.65)" : "rgba(196,169,110,0.3)",
              boxShadow: hoveredNote
                ? "0 0 50px rgba(196,169,110,0.35), 0 12px 40px rgba(0,0,0,0.4)"
                : "0 0 24px rgba(162,137,89,0.12)",
              transform: hoveredNote ? "translateY(-4px) scale(1.01)" : "translateY(0) scale(1)",
              transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
              cursor: "default",
            }}
            onMouseEnter={() => setHoveredNote(true)}
            onMouseLeave={() => setHoveredNote(false)}>
            <div className="flex justify-center mb-3">
              <span className="text-2xl">✦</span>
            </div>
            <p className="text-lg font-bold mb-2"
              style={{ color: hoveredNote ? GOLD_LIGHT : GOLD_BRIGHT }}>{t("pkg.afterTitle")}</p>
            <p className="text-sm leading-relaxed"
              style={{ color: hoveredNote ? "rgba(212,197,162,0.9)" : GOLD_DIM }}>{t("pkg.afterSub")}</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-10 px-6 lg:px-12 border-t" style={{ borderColor: GOLD_FAINT }}>
          <div className="max-w-[1800px] mx-auto">
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
