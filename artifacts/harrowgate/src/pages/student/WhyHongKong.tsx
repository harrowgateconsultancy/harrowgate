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
   Data
───────────────────────────────────────────── */

const ADVANTAGES = [
  {
    emoji: "🏛️",
    title: "World-Class Universities",
    body: "Home to HKU, CUHK, HKUST, PolyU, and CityU — all ranked in the global top 100. Four universities sit in the QS Asia Top 10, rivalling the best in the UK and US.",
    tag: "Rankings",
  },
  {
    emoji: "🗣️",
    title: "English Medium + Trilingual Edge",
    body: "All top universities teach entirely in English. Living in Hong Kong lets you simultaneously acquire Cantonese and Mandarin — skills that open doors across Asia's largest economies.",
    tag: "Language",
  },
  {
    emoji: "🌏",
    title: "Gateway to Asia & Global Networks",
    body: "Hong Kong is Asia's financial and logistics hub. Students gain access to networks spanning China, Southeast Asia, and global markets — a strategic position no Western campus can match.",
    tag: "Strategy",
  },
  {
    emoji: "💰",
    title: "Generous Scholarships & Affordable Tuition",
    body: "Annual tuition at Hong Kong universities averages HKD 140,000–180,000 — significantly less than equivalent programmes in the US, UK, or Australia. Government and university scholarships are widely available.",
    tag: "Finances",
  },
  {
    emoji: "💼",
    title: "Internship & Career Ecosystem",
    body: "Global MNCs — HSBC, Goldman Sachs, Google, Alibaba, and hundreds more — actively recruit from Hong Kong campuses. The city's internship culture is among the most active in Asia.",
    tag: "Careers",
  },
  {
    emoji: "🛡️",
    title: "One of the World's Safest Cities",
    body: "Hong Kong consistently ranks as one of the safest metropolises on earth, with ultra-low crime rates, world-class healthcare, and infrastructure that makes daily life seamless.",
    tag: "Safety",
  },
  {
    emoji: "🌐",
    title: "Cultural Diversity & Global Community",
    body: "Over 100 nationalities call Hong Kong home. From Diwali to Dragon Boat, the city celebrates global culture year-round — students never feel far from home.",
    tag: "Culture",
  },
  {
    emoji: "🔬",
    title: "Research & Innovation Funding",
    body: "Hong Kong's InnoHK clusters and government-backed R&D grants fuel cutting-edge research in AI, biotech, and fintech. Students gain access to state-of-the-art labs and industry partnerships.",
    tag: "Research",
  },
  {
    emoji: "🏠",
    title: "Pathway to Permanent Residency",
    body: "Study years count toward Hong Kong's 7-year continuous residency rule. After 7 years (including your degree programme), you become eligible to apply for permanent residency — a globally respected status.",
    tag: "PR Pathway",
    highlight: true,
  },
  {
    emoji: "👨‍👩‍👧",
    title: "Bring Your Family as Dependants",
    body: "Student visa holders can sponsor their spouse and children to accompany them to Hong Kong. Your family stays together — no separation for the duration of your studies.",
    tag: "Family",
    highlight: true,
  },
  {
    emoji: "⏰",
    title: "Work While You Study",
    body: "International students are permitted to work part-time both on-campus and off-campus during term time, and full-time during holidays. Internship opportunities are counted within your study schedule.",
    tag: "Work Rights",
    highlight: true,
  },
];

const QUICK_STATS = [
  { value: "4",    label: "QS Asia Top 10 Universities" },
  { value: "100+", label: "Nationalities on Campus" },
  { value: "7yr",  label: "Pathway to Permanent Residency" },
  { value: "98%",  label: "Graduate Employment Rate" },
  { value: "24h",  label: "Expert Advisor Response Time" },
  { value: "HKD 3K", label: "To Start Your Application" },
];

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

function AdvantageCard({ a, idx }: { a: typeof ADVANTAGES[0]; idx: number }) {
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
      {/* Subtle glow top-right for highlight cards */}
      {a.highlight && (
        <div style={{
          position: "absolute", top: 0, right: 0, width: "120px", height: "120px",
          background: "radial-gradient(ellipse at top right, rgba(196,169,110,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
      )}

      <div className="flex items-start gap-4">
        {/* Emoji icon */}
        <div style={{
          width: 52, height: 52, borderRadius: "0.875rem", flexShrink: 0,
          background: hov
            ? a.highlight ? "rgba(240,210,140,0.22)" : "rgba(196,169,110,0.18)"
            : a.highlight ? "rgba(240,210,140,0.14)" : "rgba(162,137,89,0.1)",
          border: `1px solid ${a.highlight ? "rgba(240,210,140,0.4)" : "rgba(162,137,89,0.2)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.5rem",
          transition: "background 0.25s, transform 0.25s",
          transform: hov ? "scale(1.1) rotate(-2deg)" : "scale(1) rotate(0deg)",
        }}>
          {a.emoji}
        </div>

        <div className="flex-1 min-w-0">
          {/* Tag */}
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
  const { lang, setLang } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);

  usePageSEO({
    title: "Why Study in Hong Kong? | HARROWGATE Consultancy",
    description: "Discover why thousands of international students choose Hong Kong — world-class universities, English medium teaching, PR pathway, work rights, and a gateway to Asia.",
  });

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
              Packages
            </Link>
            <Link href="/agent-signup" className="text-sm font-medium px-4 py-2 rounded-full border"
              style={{ borderColor: "rgba(162,137,89,0.2)", color: GOLD, background: "rgba(162,137,89,0.05)" }}>
              Our Agents
            </Link>
            <Link href="/sign-in" className="text-sm font-semibold px-4 py-2 rounded-full border"
              style={{ borderColor: "rgba(162,137,89,0.25)", color: GOLD, background: "rgba(162,137,89,0.04)" }}>
              Sign In
            </Link>
            <Link href="/sign-up" className="shimmer-btn text-sm font-bold px-5 py-2.5 rounded-full"
              style={{ color: BG }}>
              Get Started
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
              📋 Packages
            </Link>
            <Link href="/agent-signup" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold"
              style={{ borderColor: "rgba(162,137,89,0.2)", color: GOLD, background: "rgba(162,137,89,0.06)" }}>
              🤝 Our Agents
            </Link>
            <Link href="/sign-in" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold"
              style={{ borderColor: "rgba(162,137,89,0.25)", color: GOLD, background: "rgba(162,137,89,0.06)" }}>
              🔑 Sign In
            </Link>
            <Link href="/sign-up" onClick={() => setMenuOpen(false)}
              className="shimmer-btn flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold"
              style={{ color: BG }}>
              Get Started →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position: "relative", overflow: "hidden", padding: "5rem 1.5rem 4rem" }}>
        {/* Background glow */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)", width: "900px", height: "600px", background: "radial-gradient(ellipse, rgba(162,137,89,0.09) 0%, transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, transparent, rgba(162,137,89,0.3) 30%, rgba(162,137,89,0.3) 70%, transparent)` }} />
        </div>

        <div className="max-w-4xl mx-auto text-center" style={{ position: "relative", zIndex: 1 }}>
          {/* Back link */}
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase mb-8"
            style={{ color: GOLD_DIM, letterSpacing: "0.2em" }}
            onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}>
            ← Back to Home
          </Link>

          {/* Badge */}
          <div className="fade-up inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border mb-8"
            style={{ background: "rgba(162,137,89,0.08)", borderColor: "rgba(162,137,89,0.25)", animationDelay: "0ms" }}>
            <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: "#4ade80" }} />
            <span className="text-sm font-semibold tracking-[0.2em] uppercase" style={{ color: GOLD_DIM }}>
              Hong Kong Education
            </span>
          </div>

          <h1 className="fade-up" style={{
            fontSize: "clamp(2.4rem, 6vw, 4.5rem)", fontWeight: 900,
            letterSpacing: "-0.02em", lineHeight: 1.08, marginBottom: "1.5rem",
            background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, rgba(162,137,89,0.6) 100%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            animationDelay: "80ms",
          }}>
            Why Study in<br />Hong Kong?
          </h1>

          <p className="fade-up" style={{
            fontSize: "clamp(1rem, 2.5vw, 1.2rem)", lineHeight: 1.7,
            color: CREAM_DIM, maxWidth: "640px", margin: "0 auto 2.5rem",
            animationDelay: "160ms",
          }}>
            Eleven compelling reasons why thousands of international students choose Hong Kong — and why it could be the best decision of your life.
          </p>

          <div className="fade-up flex flex-wrap justify-center gap-3" style={{ animationDelay: "240ms" }}>
            <Link href="/sign-up" className="shimmer-btn px-8 py-4 rounded-full text-sm font-bold"
              style={{ color: BG, boxShadow: "0 6px 28px rgba(162,137,89,0.4)" }}>
              Start Your Application →
            </Link>
            <Link href="/packages" className="px-8 py-4 rounded-full text-sm font-semibold border"
              style={{ borderColor: "rgba(162,137,89,0.3)", color: GOLD, background: "rgba(162,137,89,0.06)" }}>
              View Packages
            </Link>
          </div>
        </div>
      </section>

      {/* ── Quick Stats ── */}
      <section style={{ background: "rgba(0,0,0,0.2)", padding: "3rem 1.5rem", borderTop: `1px solid ${GOLD_FAINT}`, borderBottom: `1px solid ${GOLD_FAINT}` }}>
        <div className="max-w-5xl mx-auto">
          <p style={{ textAlign: "center", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: GOLD_DIM, marginBottom: "1.75rem" }}>
            Hong Kong at a Glance
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {QUICK_STATS.map(s => <StatChip key={s.value} value={s.value} label={s.label} />)}
          </div>
        </div>
      </section>

      {/* ── Advantages ── */}
      <section style={{ padding: "5rem 1.5rem" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: GOLD_DIM, marginBottom: "0.75rem" }}>
              11 Reasons
            </p>
            <h2 style={{
              fontSize: "clamp(1.6rem, 4vw, 2.6rem)", fontWeight: 800, color: GOLD,
              letterSpacing: "-0.01em", marginBottom: "0.75rem",
            }}>
              Everything you need to succeed
            </h2>
            <p style={{ color: CREAM_DIM, maxWidth: "520px", margin: "0 auto", lineHeight: 1.65, fontSize: "0.95rem" }}>
              From academic excellence to life-changing residency rights — Hong Kong delivers on every level.
            </p>
          </div>

          {/* Cards grid — first 8 standard, last 3 highlighted */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {ADVANTAGES.slice(0, 8).map((a, i) => (
              <AdvantageCard key={a.title} a={a} idx={i} />
            ))}
          </div>

          {/* Highlighted trio — PR, Family, Work */}
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
                  ✦ Exclusive Advantages
                </span>
                <p style={{ color: CREAM_DIM, fontSize: "0.8rem", marginTop: "0.5rem" }}>
                  Benefits most students don't know about
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ADVANTAGES.slice(8).map((a, i) => (
                  <AdvantageCard key={a.title} a={a} idx={i + 8} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        background: "rgba(0,0,0,0.25)", borderTop: `1px solid ${GOLD_FAINT}`,
        padding: "5rem 1.5rem",
      }}>
        <div className="max-w-2xl mx-auto text-center">
          <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: GOLD_DIM, marginBottom: "1rem" }}>
            Ready to Begin?
          </p>
          <h2 style={{
            fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800,
            background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            letterSpacing: "-0.01em", marginBottom: "1rem",
          }}>
            Your Hong Kong journey starts with HKD&nbsp;3,000
          </h2>
          <p style={{ color: CREAM_DIM, lineHeight: 1.7, marginBottom: "2.5rem", fontSize: "1rem" }}>
            One payment. One dedicated expert. Full guidance from application to arrival — and beyond.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up" className="shimmer-btn px-10 py-4 rounded-full text-base font-bold"
              style={{ color: BG, boxShadow: "0 8px 32px rgba(162,137,89,0.45)" }}>
              Start Your Application →
            </Link>
            <Link href="/packages" className="px-10 py-4 rounded-full text-base font-semibold border"
              style={{ borderColor: "rgba(162,137,89,0.35)", color: GOLD, background: "rgba(162,137,89,0.07)" }}>
              View Packages
            </Link>
          </div>

          {/* Trust line */}
          <p style={{ marginTop: "2rem", fontSize: "0.8rem", color: "rgba(162,137,89,0.45)" }}>
            500+ students placed · 98% university acceptance rate · Expert advisor assigned within 24h
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
