import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useLang, LANG_LIST } from "../../i18n";
import { usePricing } from "../../hooks/usePricing";

const BG = "#0b2213";
const GOLD = "#a28959";
const GOLD_DIM = "rgba(162,137,89,0.7)";
const GOLD_FAINT = "rgba(162,137,89,0.12)";

const SERVICE_ICONS = [
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>,
];

const STEP_ICONS = ["🔐", "📋", "🔍", "🎓", "🏆"];
const STATS_VALUES = ["500+", "98%", "5+", "24h"];

function LangPicker({ lang, setLang, LANG_LIST }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const current = LANG_LIST.find((l: any) => l.code === lang);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-medium transition-all hover:opacity-80"
        style={{ borderColor: "rgba(162,137,89,0.2)", color: "rgba(162,137,89,0.7)", background: "rgba(162,137,89,0.05)" }}>
        <span>{current?.flag}</span>
        <span className="hidden sm:inline">{current?.name}</span>
        <svg viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-2.5 h-2.5"><path d="M1 1l4 4 4-4" /></svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1.5 rounded-xl border shadow-2xl z-50 overflow-hidden"
          style={{ background: "#0a1f0e", borderColor: "rgba(162,137,89,0.2)", minWidth: 160 }}>
          {LANG_LIST.map((l: any) => (
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

export default function Landing() {
  const { lang, setLang, t, isRtl } = useLang();
  const pricing = usePricing();

  const serviceTitles = [t("services.s1"), t("services.s2"), t("services.s3"), t("services.s4"), t("services.s5"), t("services.s6")];
  const serviceDescs  = [t("services.d1"), t("services.d2"), t("services.d3"), t("services.d4"), t("services.d5"), t("services.d6")];
  const stepTitles    = [t("how.step1"), t("how.step2"), t("how.step3"), t("how.step4"), t("how.step5")];
  const stepDescs     = [t("how.d1"), t("how.d2"), t("how.d3"), t("how.d4"), t("how.d5")];
  const statsLabels   = [t("stats.placed"), t("stats.approval"), t("stats.years"), t("stats.response")];
  const testimonials  = [
    { q: t("testimonials.q1"), name: "Aisha M.",    school: "The University of Hong Kong" },
    { q: t("testimonials.q2"), name: "Daniel K.",   school: "Hong Kong Polytechnic University" },
    { q: t("testimonials.q3"), name: "Priya S.",    school: "City University of Hong Kong" },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden" dir={isRtl ? "rtl" : "ltr"} style={{ background: BG, fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Background glow effects */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: "800px", height: "500px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(162,137,89,0.07) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: "30%", left: "-5%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(162,137,89,0.04) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "20%", right: "-5%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(162,137,89,0.04) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Nav */}
        <nav style={{ borderBottom: `1px solid ${GOLD_FAINT}`, backdropFilter: "blur(12px)", background: "rgba(11,34,19,0.85)", position: "sticky", top: 0, zIndex: 50 }}>
          <div className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto">
            <img src="/harrowgate-logo.png" alt="HARROWGATE Consultancy" className="h-20 object-contain" style={{ filter: "drop-shadow(0 0 18px rgba(162,137,89,0.75)) drop-shadow(0 0 6px rgba(162,137,89,0.5))" }} />
            <div className="flex items-center gap-2">
              <LangPicker lang={lang} setLang={setLang} LANG_LIST={LANG_LIST} />
              <Link href="/packages"
                className="text-sm font-medium px-4 py-2 rounded-full border transition-all hover:opacity-80 hidden sm:inline-flex items-center gap-1.5"
                style={{ borderColor: "rgba(162,137,89,0.2)", color: GOLD, background: "rgba(162,137,89,0.05)" }}>
                Packages
              </Link>
              <Link href="/sign-in"
                className="text-sm font-medium px-4 py-2 rounded-full transition-all hover:opacity-80"
                style={{ color: GOLD }}>
                {t("nav.signIn")}
              </Link>
              <Link href="/sign-up"
                className="text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:opacity-90 hover:scale-105"
                style={{ background: GOLD, color: BG, boxShadow: "0 4px 16px rgba(162,137,89,0.3)" }}>
                {t("nav.getStarted")}
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="flex flex-col items-center justify-center px-6 pt-24 pb-20 text-center max-w-5xl mx-auto">
          <Link href="/sign-in">
            <div className="mb-8 cursor-pointer transition-transform hover:scale-105">
              <img src="/harrowgate-logo.png" alt="HARROWGATE" className="h-52 object-contain mx-auto"
                style={{ filter: "drop-shadow(0 0 40px rgba(162,137,89,0.85)) drop-shadow(0 0 16px rgba(162,137,89,0.6)) drop-shadow(0 8px 32px rgba(162,137,89,0.4))" }} />
            </div>
          </Link>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border"
            style={{ background: "rgba(162,137,89,0.08)", borderColor: GOLD_FAINT }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#4ade80" }} />
            <p className="text-xs font-semibold tracking-[0.25em] uppercase" style={{ color: GOLD_DIM }}>
              {t("hero.badge")}
            </p>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.08]" style={{ color: GOLD }}>
            {t("hero.h1")}<br />
            <span style={{ color: "rgba(162,137,89,0.5)" }}>{t("hero.h2")}</span>
          </h1>
          <p className="text-lg md:text-xl leading-relaxed mb-6 max-w-2xl" style={{ color: GOLD_DIM }}>
            {t("hero.sub")}
          </p>

          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border mb-10"
            style={{ background: "rgba(162,137,89,0.07)", borderColor: "rgba(162,137,89,0.22)" }}>
            <span className="text-base">🏛️</span>
            <p className="text-sm font-medium" style={{ color: GOLD }}>
              {t("hero.pr")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center mb-16">
            <Link href="/sign-up"
              className="px-9 py-4 rounded-full text-base font-semibold transition-all hover:scale-105 hover:opacity-95"
              style={{ background: GOLD, color: BG, boxShadow: "0 8px 32px rgba(162,137,89,0.35)" }}>
              {t("hero.cta1")}
            </Link>
            <a href="#how-it-works"
              className="px-9 py-4 rounded-full text-base font-semibold border transition-all hover:opacity-80"
              style={{ borderColor: "rgba(162,137,89,0.3)", color: GOLD }}>
              {t("hero.cta2")}
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
            {STATS_VALUES.map((val, i) => (
              <div key={val} className="rounded-2xl p-4 text-center border"
                style={{ background: "rgba(162,137,89,0.05)", borderColor: GOLD_FAINT }}>
                <p className="text-2xl font-bold mb-0.5" style={{ color: GOLD }}>{val}</p>
                <p className="text-xs" style={{ color: "rgba(162,137,89,0.45)" }}>{statsLabels[i]}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Services */}
        <section className="py-24" style={{ background: "rgba(0,0,0,0.2)", borderTop: `1px solid ${GOLD_FAINT}`, borderBottom: `1px solid ${GOLD_FAINT}` }}>
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-center mb-4" style={{ color: "rgba(162,137,89,0.4)" }}>
              {t("services.title")}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: GOLD }}>
              {t("services.heading")}
            </h2>
            <p className="text-center mb-14 text-base max-w-xl mx-auto" style={{ color: GOLD_DIM }}>
              {t("services.sub")}
            </p>
            <div className="grid md:grid-cols-3 gap-5">
              {serviceTitles.map((title, i) => (
                <div key={i}
                  className="rounded-2xl p-6 border transition-all hover:scale-[1.02] hover:border-opacity-40 group cursor-default"
                  style={{ background: "rgba(162,137,89,0.04)", borderColor: GOLD_FAINT }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(162,137,89,0.1)", color: GOLD }}>
                    {SERVICE_ICONS[i]}
                  </div>
                  <h3 className="text-base font-semibold mb-2" style={{ color: GOLD }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: GOLD_DIM }}>{serviceDescs[i]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-24 max-w-5xl mx-auto px-6">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-center mb-4" style={{ color: "rgba(162,137,89,0.4)" }}>
            {t("how.label")}
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: GOLD }}>
            {t("how.title")}
          </h2>
          <p className="text-center mb-16 text-base" style={{ color: GOLD_DIM }}>
            {t("how.sub")}
          </p>

          <div className="relative">
            <div className="absolute left-8 top-5 bottom-5 w-px hidden md:block" style={{ background: `linear-gradient(to bottom, transparent, ${GOLD_FAINT} 10%, ${GOLD_FAINT} 90%, transparent)` }} />
            <div className="space-y-4">
              {stepTitles.map((title, i) => (
                <div key={i} className="flex gap-6 items-start group">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl transition-all group-hover:scale-105"
                      style={{ background: "rgba(162,137,89,0.08)", border: `1px solid ${GOLD_FAINT}` }}>
                      {STEP_ICONS[i]}
                    </div>
                  </div>
                  <div className="flex-1 rounded-2xl p-5 border transition-all hover:border-opacity-40"
                    style={{ background: "rgba(162,137,89,0.03)", borderColor: GOLD_FAINT }}>
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-xs font-bold tracking-widest" style={{ color: "rgba(162,137,89,0.3)" }}>
                        0{i + 1}
                      </span>
                      <h3 className="text-base font-semibold" style={{ color: GOLD }}>{title}</h3>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: GOLD_DIM }}>{stepDescs[i]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Payment Journey */}
        <section className="py-24 max-w-4xl mx-auto px-6">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-center mb-4" style={{ color: "rgba(162,137,89,0.4)" }}>
            {t("journey.label")}
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: GOLD }}>
            {t("journey.heading")}
          </h2>
          <p className="text-center mb-14 text-base max-w-xl mx-auto" style={{ color: GOLD_DIM }}>
            {t("journey.sub")}
          </p>
          <div className="relative">
            <div className="absolute left-[18px] top-5 bottom-5 w-px hidden sm:block" style={{ background: `linear-gradient(to bottom, transparent, ${GOLD_FAINT} 8%, ${GOLD_FAINT} 92%, transparent)` }} />
            <div className="space-y-3">
              {[
                { num: 1, lk: "journey.s1", amount: null as string|null, nk: null as string|null, final: false, tiers: false },
                { num: 2, lk: "journey.s2", amount: "HKD$ 3,000",        nk: "journey.nonRefundable", final: false, tiers: false },
                { num: 3, lk: "journey.s3", amount: null,                nk: null, final: false, tiers: false },
                { num: 4, lk: "journey.s4", amount: "HKD$ 12,000",       nk: null, final: false, tiers: false },
                { num: 5, lk: "journey.s5", amount: null,                nk: null, final: false, tiers: false },
                { num: 6, lk: "journey.s6", amount: null,                nk: null, final: false, tiers: true },
                { num: 7, lk: "journey.s7", amount: null,                nk: null, final: false, tiers: false },
                { num: 8, lk: "journey.s8", amount: null,                nk: null, final: true,  tiers: false },
              ].map((step) => (
                <div key={step.num} className="flex gap-4 items-start">
                  <div className="shrink-0" style={{ minWidth: 36 }}>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border"
                      style={{
                        background: step.final ? "rgba(74,222,128,0.12)" : "rgba(162,137,89,0.08)",
                        borderColor: step.final ? "rgba(74,222,128,0.35)" : GOLD_FAINT,
                        color: step.final ? "#4ade80" : GOLD,
                      }}>
                      {step.num}
                    </div>
                  </div>
                  <div
                    className="flex-1 rounded-2xl px-5 py-4 border"
                    style={{
                      background: step.final ? "rgba(74,222,128,0.04)" : "rgba(162,137,89,0.03)",
                      borderColor: step.final ? "rgba(74,222,128,0.18)" : GOLD_FAINT,
                    }}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-sm font-semibold" style={{ color: step.final ? "#4ade80" : GOLD }}>
                        {t(step.lk)}
                      </p>
                      {step.amount && (
                        <span className="text-sm font-bold px-4 py-1.5 rounded-xl border shrink-0"
                          style={{ background: "rgba(162,137,89,0.1)", borderColor: "rgba(162,137,89,0.25)", color: GOLD }}>
                          {step.amount}
                          {step.nk && <span className="ml-1.5 text-xs font-normal opacity-60">({t(step.nk)})</span>}
                        </span>
                      )}
                    </div>
                    {step.tiers && (
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {[
                            { lk: "pkg.tier1", amount: pricing.mastersLastPayment },
                            { lk: "pkg.tier2", amount: pricing.bachelorLastPayment },
                            { lk: "pkg.tier3", amount: pricing.associateLastPayment },
                          ].map(tier => (
                            <div key={tier.lk} className="flex flex-col items-center px-4 py-2.5 rounded-xl border text-center"
                              style={{ background: "rgba(162,137,89,0.07)", borderColor: "rgba(162,137,89,0.2)" }}>
                              <p className="text-sm font-bold" style={{ color: GOLD }}>{tier.amount}</p>
                              <p className="text-xs mt-0.5" style={{ color: GOLD_DIM }}>{t(tier.lk)}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs" style={{ color: "rgba(162,137,89,0.4)" }}>* {t("journey.tierNote")}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Packages CTA */}
        <section className="py-16 px-6" style={{ background: "rgba(162,137,89,0.03)", borderTop: `1px solid ${GOLD_FAINT}`, borderBottom: `1px solid ${GOLD_FAINT}` }}>
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-4" style={{ color: "rgba(162,137,89,0.4)" }}>{t("pkg.badge")}</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: GOLD }}>{t("pricing.startJust")}</h2>
            <p className="text-base max-w-xl mx-auto mb-8" style={{ color: GOLD_DIM }}>
              {t("pricing.desc")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
              {[
                { lk: "pkg.tier1", cost: pricing.mastersTotal },
                { lk: "pkg.tier2", cost: pricing.bachelorTotal },
                { lk: "pkg.tier3", cost: pricing.associateTotal },
              ].map(p => (
                <div key={p.lk} className="rounded-2xl px-6 py-4 border text-center min-w-[160px]"
                  style={{ background: "rgba(162,137,89,0.05)", borderColor: GOLD_FAINT }}>
                  <p className="text-xs font-medium mb-1" style={{ color: "rgba(162,137,89,0.5)" }}>{t(p.lk)}</p>
                  <p className="text-base font-bold" style={{ color: GOLD }}>{p.cost}</p>
                </div>
              ))}
            </div>
            <Link href="/packages"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold border transition-all hover:opacity-80"
              style={{ borderColor: "rgba(162,137,89,0.3)", color: GOLD }}>
              {t("pricing.viewAll")}
            </Link>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 px-6" style={{ background: "rgba(0,0,0,0.2)", borderTop: `1px solid ${GOLD_FAINT}`, borderBottom: `1px solid ${GOLD_FAINT}` }}>
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-center mb-4" style={{ color: "rgba(162,137,89,0.4)" }}>
              {t("testimonials.label")}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-14" style={{ color: GOLD }}>
              {t("testimonials.title")}
            </h2>
            <div className="grid md:grid-cols-3 gap-5">
              {testimonials.map(item => (
                <div key={item.name} className="rounded-2xl p-6 border flex flex-col gap-4"
                  style={{ background: "rgba(162,137,89,0.04)", borderColor: GOLD_FAINT }}>
                  <p className="text-xl leading-relaxed" style={{ color: "rgba(162,137,89,0.25)" }}>"</p>
                  <p className="text-sm leading-relaxed flex-1" style={{ color: GOLD_DIM }}>{item.q}</p>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: GOLD }}>{item.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(162,137,89,0.4)" }}>{item.school}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-28 text-center px-6">
          <div className="max-w-2xl mx-auto">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-6" style={{ color: "rgba(162,137,89,0.4)" }}>
              {t("cta.label")}
            </p>
            <h2 className="text-4xl md:text-5xl font-bold mb-5" style={{ color: GOLD }}>
              {t("cta.heading")}
            </h2>
            <p className="mb-10 text-base leading-relaxed" style={{ color: GOLD_DIM }}>
              {t("cta.sub")}
            </p>
            <Link href="/sign-up"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-full text-base font-semibold transition-all hover:scale-105 hover:opacity-95"
              style={{ background: GOLD, color: BG, boxShadow: "0 12px 40px rgba(162,137,89,0.35)" }}>
              {t("hero.cta1")}
            </Link>
            <p className="mt-5 text-xs" style={{ color: "rgba(162,137,89,0.35)" }}>
              {t("cta.hasAccount")}{" "}
              <Link href="/sign-in" className="underline hover:opacity-80 transition-opacity" style={{ color: "rgba(162,137,89,0.55)" }}>
                {t("nav.signIn")}
              </Link>
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 border-t" style={{ borderColor: GOLD_FAINT }}>
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <img src="/harrowgate-logo.png" alt="HARROWGATE" className="h-14 object-contain opacity-50" />
              <p className="text-xs" style={{ color: "rgba(162,137,89,0.3)" }}>
                © {new Date().getFullYear()} HARROWGATE Consultancy, Hong Kong.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
