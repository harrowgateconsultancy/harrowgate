import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useLang, LANG_LIST } from "../../i18n";
import { usePageSEO } from "../../hooks/usePageSEO";

const BG         = "#0b2213";
const GOLD       = "#a28959";
const GOLD_BRIGHT = "#c4a96e";
const GOLD_LIGHT  = "#f0d28c";
const GOLD_FAINT  = "rgba(162,137,89,0.12)";
const GOLD_DIM    = "rgba(162,137,89,0.7)";
const CREAM_DIM   = "rgba(212,197,162,0.75)";

/* ─────────────────────────────────────────────
   Themed SVG Icons
───────────────────────────────────────────── */
const S = { strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const Icons: Record<string, (c: string) => JSX.Element> = {
  rankings: c => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" width="26" height="26" {...S}>
      <path d="M3 21h18M6 21V10M10 21V4M14 21V10M18 21V7" />
      <path d="M10 4l2-2 2 2" />
    </svg>
  ),
  language: c => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" width="26" height="26" {...S}>
      <path d="M5 8h14M5 12h9M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3z" />
      <path d="M12 3c-2.5 2.5-3.5 5.5-3.5 9s1 6.5 3.5 9" />
      <path d="M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9" />
    </svg>
  ),
  strategy: c => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" width="26" height="26" {...S}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.6 9h16.8M3.6 15h16.8" />
      <path d="M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9" />
      <path d="M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9" />
    </svg>
  ),
  finances: c => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" width="26" height="26" {...S}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v1.5M12 15.5V17" />
      <path d="M9.5 10a2.5 2 0 0 1 5 0c0 1.5-1 2-2.5 2.5S9.5 14 9.5 15.5a2.5 2 0 0 0 5 0" />
    </svg>
  ),
  careers: c => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" width="26" height="26" {...S}>
      <rect x="2" y="8" width="20" height="12" rx="2" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      <path d="M12 13v2M2 13h20" />
    </svg>
  ),
  safety: c => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" width="26" height="26" {...S}>
      <path d="M12 2l8 3.5v6C20 17 16.5 21 12 22 7.5 21 4 17 4 11.5v-6L12 2z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  culture: c => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" width="26" height="26" {...S}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 9c2 1 4 1.5 9 1.5S19 10 21 9" />
      <path d="M3 15c2-1 4-1.5 9-1.5S19 14 21 15" />
      <path d="M12 3v18" />
    </svg>
  ),
  research: c => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" width="26" height="26" {...S}>
      <path d="M9 3h6M12 3v5" />
      <path d="M8 8h8l2 9H6L8 8z" />
      <path d="M7 17l-2 4h14l-2-4" />
      <path d="M10 12h4M11 15h2" />
    </svg>
  ),
  pr: c => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" width="26" height="26" {...S}>
      <path d="M3 21V9l9-6 9 6v12H3z" />
      <path d="M9 21V12h6v9" />
      <path d="M12 6v1" />
    </svg>
  ),
  family: c => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" width="26" height="26" {...S}>
      <circle cx="9" cy="6" r="2" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="19" cy="8" r="1.5" />
      <path d="M5 21v-4a4 4 0 0 1 8 0v4" />
      <path d="M15 13a3 3 0 0 1 6 0v8h-6" />
      <path d="M9 11v10" />
    </svg>
  ),
  work: c => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" width="26" height="26" {...S}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
};

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

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
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const current = LANG_LIST.find(l => l.code === lang);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-medium"
        style={{
          borderColor: hov ? "rgba(196,169,110,0.6)" : "rgba(162,137,89,0.3)",
          color: hov ? GOLD_BRIGHT : GOLD_DIM,
          background: hov ? "rgba(162,137,89,0.14)" : "rgba(162,137,89,0.07)",
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
          {LANG_LIST.map(l => (
            <LangOption key={l.code} l={l} lang={lang} onSelect={() => { setLang(l.code); setOpen(false); }} />
          ))}
        </div>
      )}
    </div>
  );
}

type Advantage = {
  icon: string;
  title: string;
  body: string;
  tag: string;
  highlight?: boolean;
};

function AdvantageCard({ a, idx }: { a: Advantage; idx: number }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov
          ? a.highlight ? "rgba(196,169,110,0.18)" : "rgba(162,137,89,0.1)"
          : a.highlight ? "rgba(196,169,110,0.08)" : "rgba(162,137,89,0.04)",
        border: `1.5px solid ${hov
          ? a.highlight ? "rgba(240,210,140,0.7)" : "rgba(196,169,110,0.45)"
          : a.highlight ? "rgba(240,210,140,0.4)" : "rgba(162,137,89,0.18)"}`,
        borderRadius: "1.25rem",
        padding: "1.75rem 1.5rem",
        boxShadow: hov
          ? a.highlight
            ? "0 0 40px rgba(196,169,110,0.25), 0 8px 32px rgba(0,0,0,0.3)"
            : "0 8px 32px rgba(0,0,0,0.25), 0 0 20px rgba(162,137,89,0.1)"
          : "none",
        transform: hov ? "translateY(-4px) scale(1.01)" : "translateY(0) scale(1)",
        transition: "all 0.28s cubic-bezier(0.34,1.56,0.64,1)",
        cursor: "default",
        position: "relative",
        overflow: "hidden",
      }}>
      {a.highlight && (
        <div style={{
          position: "absolute", top: 0, right: 0, width: "120px", height: "120px",
          background: "radial-gradient(ellipse at top right, rgba(196,169,110,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
      )}

      <div className="flex items-start gap-4">
        <div style={{
          width: 52, height: 52, borderRadius: "0.875rem", flexShrink: 0,
          background: hov
            ? a.highlight ? "rgba(240,210,140,0.22)" : "rgba(196,169,110,0.18)"
            : a.highlight ? "rgba(240,210,140,0.14)" : "rgba(162,137,89,0.1)",
          border: `1px solid ${a.highlight ? "rgba(240,210,140,0.4)" : "rgba(162,137,89,0.2)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.25s, transform 0.25s",
          transform: hov ? "scale(1.1) rotate(-2deg)" : "scale(1) rotate(0deg)",
        }}>
          {(Icons[a.icon] ?? Icons.rankings)(
            hov
              ? a.highlight ? GOLD_LIGHT : GOLD_BRIGHT
              : a.highlight ? GOLD_LIGHT : GOLD
          )}
        </div>

        <div className="flex-1 min-w-0">
          <span style={{
            display: "inline-block", fontSize: "0.65rem", fontWeight: 700,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: a.highlight ? GOLD_LIGHT : GOLD_BRIGHT,
            background: a.highlight ? "rgba(240,210,140,0.12)" : "rgba(162,137,89,0.1)",
            border: `1px solid ${a.highlight ? "rgba(240,210,140,0.3)" : "rgba(162,137,89,0.2)"}`,
            borderRadius: "99px", padding: "2px 10px", marginBottom: "0.5rem",
          }}>
            {a.tag}
          </span>

          <h3 style={{
            fontSize: "1.05rem", fontWeight: 700, color: hov ? GOLD_LIGHT : GOLD,
            marginBottom: "0.5rem", lineHeight: 1.3, transition: "color 0.2s",
          }}>
            {a.title}
          </h3>

          <p style={{ fontSize: "0.875rem", lineHeight: 1.65, color: CREAM_DIM }}>
            {a.body}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatChip({ value, label }: { value: string; label: string }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        textAlign: "center", padding: "1.5rem 1rem",
        background: hov ? "rgba(162,137,89,0.12)" : "rgba(162,137,89,0.05)",
        border: `1px solid ${hov ? "rgba(196,169,110,0.5)" : "rgba(162,137,89,0.18)"}`,
        borderRadius: "1rem",
        boxShadow: hov ? "0 8px 28px rgba(162,137,89,0.18)" : "none",
        transform: hov ? "scale(1.05)" : "scale(1)",
        transition: "all 0.25s ease",
      }}>
      <p style={{
        fontSize: "1.9rem", fontWeight: 900, letterSpacing: "-0.02em",
        background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%)`,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        marginBottom: "0.3rem",
      }}>{value}</p>
      <p style={{ fontSize: "0.72rem", fontWeight: 600, color: CREAM_DIM, lineHeight: 1.4 }}>{label}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */

export default function WhyHongKong() {
  const { lang, setLang, t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);

  usePageSEO({
    title: "Why Study in Hong Kong? | HARROWGATE Consultancy",
    description: "Discover why thousands of international students choose Hong Kong — world-class universities, English medium teaching, PR pathway, work rights, and a gateway to Asia.",
  });

  const ADVANTAGES: Advantage[] = [
    { icon: "rankings", tag: t("whyhk.a1.tag"), title: t("whyhk.a1.title"), body: t("whyhk.a1.body") },
    { icon: "language", tag: t("whyhk.a2.tag"), title: t("whyhk.a2.title"), body: t("whyhk.a2.body") },
    { icon: "strategy", tag: t("whyhk.a3.tag"), title: t("whyhk.a3.title"), body: t("whyhk.a3.body") },
    { icon: "finances", tag: t("whyhk.a4.tag"), title: t("whyhk.a4.title"), body: t("whyhk.a4.body") },
    { icon: "careers",  tag: t("whyhk.a5.tag"), title: t("whyhk.a5.title"), body: t("whyhk.a5.body") },
    { icon: "safety",   tag: t("whyhk.a6.tag"), title: t("whyhk.a6.title"), body: t("whyhk.a6.body") },
    { icon: "culture",  tag: t("whyhk.a7.tag"), title: t("whyhk.a7.title"), body: t("whyhk.a7.body") },
    { icon: "research", tag: t("whyhk.a8.tag"), title: t("whyhk.a8.title"), body: t("whyhk.a8.body") },
    { icon: "pr",       tag: t("whyhk.a9.tag"),  title: t("whyhk.a9.title"),  body: t("whyhk.a9.body"),  highlight: true },
    { icon: "family",   tag: t("whyhk.a10.tag"), title: t("whyhk.a10.title"), body: t("whyhk.a10.body"), highlight: true },
    { icon: "work",     tag: t("whyhk.a11.tag"), title: t("whyhk.a11.title"), body: t("whyhk.a11.body"), highlight: true },
  ];

  const QUICK_STATS = [
    { value: "4",      label: t("whyhk.stat1") },
    { value: "100+",   label: t("whyhk.stat2") },
    { value: "7yr",    label: t("whyhk.stat3") },
    { value: "98%",    label: t("whyhk.stat4") },
    { value: "24h",    label: t("whyhk.stat5") },
    { value: "HKD 3K", label: t("whyhk.stat6") },
  ];

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#e5d9c8" }}>
      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fade-up 0.7s cubic-bezier(0.22,0.68,0,1.2) both; }
        .shimmer-btn {
          background: linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 55%, ${GOLD_BRIGHT} 100%);
          transition: all 0.25s ease;
        }
        .shimmer-btn:hover {
          background: linear-gradient(135deg, #fff9e6 0%, ${GOLD_LIGHT} 55%, ${GOLD} 100%);
          box-shadow: 0 0 40px rgba(196,169,110,0.55), 0 8px 24px rgba(0,0,0,0.3);
          transform: scale(1.04) translateY(-1px);
        }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{
        borderBottom: `1px solid ${GOLD_FAINT}`,
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        background: "rgba(11,34,19,0.92)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div className="flex items-center justify-between px-5 lg:px-10 xl:px-16 py-3">
          <Link href="/" onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}>
            <img src="/harrowgate-logo.png" alt="HARROWGATE" className="h-16 sm:h-20 object-contain cursor-pointer"
              style={{ transition: "opacity 0.2s, transform 0.2s" }}
              onMouseEnter={e => { (e.target as HTMLImageElement).style.opacity = "0.82"; (e.target as HTMLImageElement).style.transform = "scale(1.04)"; }}
              onMouseLeave={e => { (e.target as HTMLImageElement).style.opacity = "1"; (e.target as HTMLImageElement).style.transform = "scale(1)"; }} />
          </Link>

          {/* Desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <LangPicker lang={lang} setLang={setLang} />
            <Link href="/packages" className="text-sm font-medium px-4 py-2 rounded-full border"
              style={{ borderColor: "rgba(162,137,89,0.2)", color: GOLD, background: "rgba(162,137,89,0.05)" }}>
              {t("nav.packages")}
            </Link>
            <Link href="/agent-signup" className="text-sm font-medium px-4 py-2 rounded-full border"
              style={{ borderColor: "rgba(162,137,89,0.2)", color: GOLD, background: "rgba(162,137,89,0.05)" }}>
              {t("nav.agents")}
            </Link>
            <Link href="/sign-in" className="text-sm font-semibold px-4 py-2 rounded-full border"
              style={{ borderColor: "rgba(162,137,89,0.25)", color: GOLD, background: "rgba(162,137,89,0.04)" }}>
              {t("nav.signIn")}
            </Link>
            <Link href="/sign-up" className="shimmer-btn text-sm font-bold px-5 py-2.5 rounded-full"
              style={{ color: BG }}>
              {t("nav.getStarted")}
            </Link>
          </div>

          {/* Mobile */}
          <div className="flex sm:hidden items-center gap-2">
            <LangPicker lang={lang} setLang={setLang} />
            <button onClick={() => setMenuOpen(o => !o)} aria-label="Menu"
              className="flex flex-col justify-center items-center w-10 h-10 rounded-full border"
              style={{ borderColor: "rgba(162,137,89,0.3)", background: "rgba(162,137,89,0.07)", gap: "5px" }}>
              <span style={{ display: "block", width: "18px", height: "1.5px", background: GOLD, borderRadius: "2px", transition: "transform 0.25s", transform: menuOpen ? "translateY(6.5px) rotate(45deg)" : "none" }} />
              <span style={{ display: "block", width: "18px", height: "1.5px", background: GOLD, borderRadius: "2px", transition: "opacity 0.25s", opacity: menuOpen ? 0 : 1 }} />
              <span style={{ display: "block", width: "18px", height: "1.5px", background: GOLD, borderRadius: "2px", transition: "transform 0.25s", transform: menuOpen ? "translateY(-6.5px) rotate(-45deg)" : "none" }} />
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <div style={{
          overflow: "hidden", maxHeight: menuOpen ? "280px" : "0",
          transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
          borderTop: menuOpen ? `1px solid ${GOLD_FAINT}` : "1px solid transparent",
        }}>
          <div className="flex flex-col px-5 py-4 gap-3">
            <Link href="/packages" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold"
              style={{ borderColor: "rgba(162,137,89,0.2)", color: GOLD, background: "rgba(162,137,89,0.06)" }}>
              📋 {t("nav.packages")}
            </Link>
            <Link href="/agent-signup" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold"
              style={{ borderColor: "rgba(162,137,89,0.2)", color: GOLD, background: "rgba(162,137,89,0.06)" }}>
              🤝 {t("nav.agents")}
            </Link>
            <Link href="/sign-in" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold"
              style={{ borderColor: "rgba(162,137,89,0.25)", color: GOLD, background: "rgba(162,137,89,0.06)" }}>
              🔑 {t("nav.signIn")}
            </Link>
            <Link href="/sign-up" onClick={() => setMenuOpen(false)}
              className="shimmer-btn flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold"
              style={{ color: BG }}>
              {t("nav.getStarted")} →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position: "relative", overflow: "hidden", padding: "4rem 0 4rem" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)", width: "900px", height: "600px", background: "radial-gradient(ellipse, rgba(162,137,89,0.09) 0%, transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, transparent, rgba(162,137,89,0.3) 30%, rgba(162,137,89,0.3) 70%, transparent)` }} />
        </div>

        {/* BACK — top-left */}
        <div className="px-5 lg:px-10 xl:px-16" style={{ position: "relative", zIndex: 2, marginBottom: "2rem" }}>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase"
            style={{ color: GOLD_DIM, letterSpacing: "0.18em", transition: "color 0.2s" }}
            onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
            onMouseEnter={e => (e.currentTarget.style.color = GOLD_BRIGHT)}
            onMouseLeave={e => (e.currentTarget.style.color = GOLD_DIM)}>
            ← BACK
          </Link>
        </div>

        <div className="max-w-5xl mx-auto text-center px-5 lg:px-10" style={{ position: "relative", zIndex: 1 }}>
          <div className="fade-up inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border mb-8"
            style={{ background: "rgba(162,137,89,0.08)", borderColor: "rgba(162,137,89,0.25)", animationDelay: "0ms" }}>
            <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: "#4ade80" }} />
            <span className="text-sm font-semibold tracking-[0.2em] uppercase" style={{ color: GOLD_DIM }}>
              {t("whyhk.badge")}
            </span>
          </div>

          <h1 className="fade-up" style={{
            fontSize: "clamp(2.4rem, 6vw, 4.5rem)", fontWeight: 900,
            letterSpacing: "-0.02em", lineHeight: 1.08, marginBottom: "1.5rem",
            background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, rgba(162,137,89,0.6) 100%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            animationDelay: "80ms",
          }}>
            {t("whyhk.h1")}<br />{t("whyhk.h2")}
          </h1>

          <p className="fade-up" style={{
            fontSize: "clamp(1rem, 2.5vw, 1.2rem)", lineHeight: 1.7,
            color: CREAM_DIM, maxWidth: "640px", margin: "0 auto 2.5rem",
            animationDelay: "160ms",
          }}>
            {t("whyhk.sub")}
          </p>

          <div className="fade-up flex flex-wrap justify-center gap-3" style={{ animationDelay: "240ms" }}>
            <Link href="/sign-up" className="shimmer-btn px-8 py-4 rounded-full text-sm font-bold"
              style={{ color: BG, boxShadow: "0 6px 28px rgba(162,137,89,0.4)" }}>
              {t("whyhk.cta1")}
            </Link>
            <Link href="/packages" className="px-8 py-4 rounded-full text-sm font-semibold border"
              style={{ borderColor: "rgba(162,137,89,0.3)", color: GOLD, background: "rgba(162,137,89,0.06)" }}>
              {t("whyhk.cta2")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Quick Stats ── */}
      <section style={{ background: "rgba(0,0,0,0.2)", padding: "3rem 0", borderTop: `1px solid ${GOLD_FAINT}`, borderBottom: `1px solid ${GOLD_FAINT}` }}>
        <div className="max-w-screen-xl mx-auto px-5 lg:px-10 xl:px-16">
          <p style={{ textAlign: "center", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: GOLD_DIM, marginBottom: "1.75rem" }}>
            {t("whyhk.glance")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {QUICK_STATS.map(s => <StatChip key={s.value} value={s.value} label={s.label} />)}
          </div>
        </div>
      </section>

      {/* ── Advantages ── */}
      <section style={{ padding: "5rem 0" }}>
        <div className="max-w-screen-xl mx-auto px-5 lg:px-10 xl:px-16">
          <div className="text-center mb-12">
            <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: GOLD_DIM, marginBottom: "0.75rem" }}>
              {t("whyhk.reasons")}
            </p>
            <h2 style={{
              fontSize: "clamp(1.6rem, 4vw, 2.6rem)", fontWeight: 800, color: GOLD,
              letterSpacing: "-0.01em", marginBottom: "0.75rem",
            }}>
              {t("whyhk.section.h2")}
            </h2>
            <p style={{ color: CREAM_DIM, maxWidth: "520px", margin: "0 auto", lineHeight: 1.65, fontSize: "0.95rem" }}>
              {t("whyhk.section.sub")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {ADVANTAGES.slice(0, 8).map((a, i) => (
              <AdvantageCard key={i} a={a} idx={i} />
            ))}
          </div>

          <div style={{
            borderRadius: "1.5rem", padding: "1.5px",
            background: "linear-gradient(135deg, rgba(240,210,140,0.5) 0%, rgba(162,137,89,0.2) 50%, rgba(240,210,140,0.5) 100%)",
            marginTop: "0.5rem",
          }}>
            <div style={{ borderRadius: "calc(1.5rem - 1.5px)", background: "rgba(11,34,19,0.9)", padding: "1.5rem 1rem" }}>
              <div className="text-center mb-4">
                <span style={{
                  display: "inline-block", fontSize: "0.65rem", fontWeight: 700,
                  letterSpacing: "0.18em", textTransform: "uppercase", color: GOLD_LIGHT,
                  background: "rgba(240,210,140,0.12)", border: "1px solid rgba(240,210,140,0.3)",
                  borderRadius: "99px", padding: "3px 14px",
                }}>
                  {t("whyhk.exclusive")}
                </span>
                <p style={{ color: CREAM_DIM, fontSize: "0.8rem", marginTop: "0.5rem" }}>
                  {t("whyhk.exclusive.sub")}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ADVANTAGES.slice(8).map((a, i) => (
                  <AdvantageCard key={i + 8} a={a} idx={i + 8} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        background: "rgba(0,0,0,0.25)", borderTop: `1px solid ${GOLD_FAINT}`,
        padding: "5rem 0",
      }}>
        <div className="max-w-2xl mx-auto text-center px-5 lg:px-10">
          <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: GOLD_DIM, marginBottom: "1rem" }}>
            {t("whyhk.cta.label")}
          </p>
          <h2 style={{
            fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800,
            background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            letterSpacing: "-0.01em", marginBottom: "1rem",
          }}>
            {t("whyhk.cta.h2")}
          </h2>
          <p style={{ color: CREAM_DIM, lineHeight: 1.7, marginBottom: "2.5rem", fontSize: "1rem" }}>
            {t("whyhk.cta.sub")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up" className="shimmer-btn px-10 py-4 rounded-full text-base font-bold"
              style={{ color: BG, boxShadow: "0 8px 32px rgba(162,137,89,0.45)" }}>
              {t("whyhk.cta1")}
            </Link>
            <Link href="/packages" className="px-10 py-4 rounded-full text-base font-semibold border"
              style={{ borderColor: "rgba(162,137,89,0.35)", color: GOLD, background: "rgba(162,137,89,0.07)" }}>
              {t("whyhk.cta2")}
            </Link>
          </div>

          <p style={{ marginTop: "2rem", fontSize: "0.8rem", color: "rgba(162,137,89,0.45)" }}>
            {t("whyhk.trust")}
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: "2rem 1.5rem", borderTop: `1px solid ${GOLD_FAINT}`, textAlign: "center" }}>
        <Link href="/" onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}>
          <img src="/harrowgate-logo.png" alt="HARROWGATE" style={{ height: 56, objectFit: "contain", margin: "0 auto 0.75rem", opacity: 0.7 }} />
        </Link>
        <p style={{ fontSize: "0.75rem", color: "rgba(162,137,89,0.4)" }}>
          © {new Date().getFullYear()} HARROWGATE Consultancy. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
