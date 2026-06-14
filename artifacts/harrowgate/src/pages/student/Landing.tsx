import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useLang, LANG_LIST } from "../../i18n";
import { usePricing } from "../../hooks/usePricing";
import { usePageSEO } from "../../hooks/usePageSEO";

/* ── Hong Kong Skyline Background ── */
function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const tRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0;

    // Each building: [xFrac, widthFrac, heightFrac, tipStyle]
    // tipStyle: 0=flat, 1=pointed(spire), 2=antenna, 3=stepped
    // heightFrac = height from ground as fraction of H * 0.65
    type Tip = 0 | 1 | 2 | 3;
    interface Bldg { x: number; w: number; h: number; tip: Tip; windows?: boolean; }

    // Victoria Harbour skyline — HK Island (right-of-centre) + Kowloon (far left)
    const LAYER_BG: Bldg[] = [
      { x:.00, w:.05, h:.18, tip:0 }, { x:.06, w:.04, h:.22, tip:0 },
      { x:.11, w:.03, h:.28, tip:0 }, { x:.15, w:.05, h:.20, tip:0 },
      { x:.21, w:.04, h:.25, tip:0 }, { x:.26, w:.06, h:.30, tip:0 },
      { x:.33, w:.04, h:.35, tip:0 }, { x:.38, w:.05, h:.28, tip:0 },
      { x:.44, w:.04, h:.32, tip:0 }, { x:.49, w:.06, h:.38, tip:0 },
      { x:.56, w:.04, h:.45, tip:0 }, { x:.61, w:.05, h:.40, tip:0 },
      { x:.67, w:.04, h:.35, tip:0 }, { x:.72, w:.05, h:.28, tip:0 },
      { x:.78, w:.04, h:.22, tip:0 }, { x:.83, w:.05, h:.18, tip:0 },
      { x:.89, w:.06, h:.15, tip:0 }, { x:.96, w:.04, h:.12, tip:0 },
    ];

    const LAYER_MID: Bldg[] = [
      // Kowloon side (left)
      { x:.01, w:.03, h:.28, tip:2 }, { x:.045, w:.025, h:.32, tip:0 },
      { x:.075, w:.03, h:.36, tip:2 }, { x:.11, w:.025, h:.30, tip:0 },
      { x:.14, w:.02, h:.38, tip:1 },  // small spire
      // HK Island — rising toward centre-right
      { x:.18, w:.035, h:.42, tip:0 }, { x:.22, w:.03, h:.50, tip:2 },
      { x:.26, w:.025, h:.55, tip:1 }, // Bank of China style
      { x:.29, w:.04, h:.48, tip:0 },
      { x:.34, w:.035, h:.62, tip:2 }, // tall with antenna
      { x:.38, w:.04, h:.70, tip:0 },  // IFC 1 style
      { x:.43, w:.035, h:.80, tip:2 }, // IFC 2 — tallest
      { x:.47, w:.03, h:.65, tip:0 },
      { x:.51, w:.04, h:.58, tip:2 },
      { x:.56, w:.035, h:.52, tip:1 },
      { x:.60, w:.04, h:.45, tip:0 },
      { x:.65, w:.03, h:.38, tip:2 },
      { x:.69, w:.035, h:.32, tip:0 },
      { x:.73, w:.03, h:.28, tip:0 },
      { x:.77, w:.04, h:.22, tip:0 },
      { x:.82, w:.03, h:.18, tip:0 },
      { x:.86, w:.04, h:.14, tip:0 },
      { x:.91, w:.05, h:.12, tip:0 },
      { x:.97, w:.03, h:.10, tip:0 },
    ];

    const LAYER_FG: Bldg[] = [
      // Foreground accent buildings — densest around IFC area
      { x:.03, w:.025, h:.35, tip:0, windows:true },
      { x:.08, w:.02,  h:.40, tip:2, windows:true },
      { x:.27, w:.02,  h:.44, tip:1, windows:true }, // Bank of China spire
      { x:.36, w:.025, h:.55, tip:0, windows:true },
      { x:.41, w:.03,  h:.72, tip:2, windows:true }, // IFC 1
      { x:.45, w:.025, h:.88, tip:2, windows:true }, // IFC 2 — tallest
      { x:.50, w:.02,  h:.60, tip:0, windows:true },
      { x:.54, w:.025, h:.50, tip:2, windows:true },
      { x:.58, w:.02,  h:.42, tip:0, windows:true },
    ];

    function drawBuilding(
      b: Bldg, groundY: number, maxH: number,
      fillColor: string, lineColor: string, opacity: number
    ) {
      const bx = b.x * W;
      const bw = b.w * W;
      const bh = b.h * maxH;
      const top = groundY - bh;

      ctx!.globalAlpha = opacity;
      ctx!.fillStyle = fillColor;
      ctx!.beginPath();

      if (b.tip === 1) {
        // Spire / pointed top
        ctx!.moveTo(bx, groundY);
        ctx!.lineTo(bx, top + bw * 0.6);
        ctx!.lineTo(bx + bw / 2, top);
        ctx!.lineTo(bx + bw, top + bw * 0.6);
        ctx!.lineTo(bx + bw, groundY);
      } else if (b.tip === 2) {
        // Flat with thin antenna
        ctx!.rect(bx, top, bw, bh);
        ctx!.fill();
        ctx!.fillRect(bx + bw * 0.45, top - bh * 0.12, bw * 0.1, bh * 0.12);
        ctx!.globalAlpha = 0;
      } else {
        ctx!.rect(bx, top, bw, bh);
      }
      ctx!.fill();
      ctx!.globalAlpha = 1;

      // Window grid (foreground only)
      if (b.windows) {
        const rows = Math.floor(bh / 14);
        const cols = Math.max(1, Math.floor(bw / 9));
        ctx!.globalAlpha = opacity * 0.5;
        ctx!.fillStyle = lineColor;
        for (let r = 1; r < rows - 1; r++) {
          for (let c = 0; c < cols; c++) {
            if (Math.random() > 0.35) {
              ctx!.fillRect(
                bx + 3 + c * (bw / cols),
                top + 4 + r * 13,
                Math.max(2, bw / cols - 4),
                6
              );
            }
          }
        }
        ctx!.globalAlpha = 1;
      }
    }

    function render(t: number) {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, W, H);

      const groundY = H * 0.82;
      const maxH = H * 0.70;
      const R = 162, G = 137, B = 89;

      // Atmosphere glow above skyline
      const atmo = ctx.createLinearGradient(0, groundY - maxH * 0.5, 0, groundY);
      atmo.addColorStop(0, "transparent");
      atmo.addColorStop(1, `rgba(${R},${G},${B},0.04)`);
      ctx.fillStyle = atmo;
      ctx.fillRect(0, 0, W, H);

      // Far background layer — mountains / distant hills
      drawBuilding({ x:0, w:0.22, h:0.18, tip:0 } as Bldg, groundY, maxH, `rgba(${R},${G},${B},0.05)`, "", 0.05);
      drawBuilding({ x:0.18, w:0.35, h:0.25, tip:0 } as Bldg, groundY, maxH, `rgba(${R},${G},${B},0.05)`, "", 0.05);
      drawBuilding({ x:0.50, w:0.30, h:0.22, tip:0 } as Bldg, groundY, maxH, `rgba(${R},${G},${B},0.05)`, "", 0.05);
      drawBuilding({ x:0.78, w:0.22, h:0.18, tip:0 } as Bldg, groundY, maxH, `rgba(${R},${G},${B},0.05)`, "", 0.05);

      // Layer 1 — distant buildings
      for (const b of LAYER_BG) {
        drawBuilding(b, groundY, maxH, `rgba(${R},${G},${B},0.16)`, `rgba(${R},${G},${B},0.10)`, 0.16);
      }

      // Layer 2 — mid buildings
      for (const b of LAYER_MID) {
        drawBuilding(b, groundY, maxH, `rgba(${R},${G},${B},0.24)`, `rgba(${R},${G},${B},0.14)`, 0.24);
      }

      // Layer 3 — foreground with windows
      for (const b of LAYER_FG) {
        drawBuilding(b, groundY, maxH, `rgba(${R},${G},${B},0.32)`, `rgba(${R},${G},${B},0.40)`, 0.32);
      }

      // Waterline — Victoria Harbour
      ctx.strokeStyle = `rgba(${R},${G},${B},0.45)`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(W, groundY);
      ctx.stroke();

      // Shimmering harbour reflection
      const shimmerX = (Math.sin(t * 0.0012) * 0.5 + 0.5) * W;
      const shimmer = ctx.createRadialGradient(shimmerX, groundY, 0, shimmerX, groundY, W * 0.45);
      shimmer.addColorStop(0, `rgba(${R},${G},${B},0.22)`);
      shimmer.addColorStop(0.4, `rgba(${R},${G},${B},0.08)`);
      shimmer.addColorStop(1, "transparent");
      ctx.fillStyle = shimmer;
      ctx.fillRect(0, groundY, W, H - groundY);

      // Water reflection gradient fade
      const water = ctx.createLinearGradient(0, groundY, 0, H);
      water.addColorStop(0, `rgba(${R},${G},${B},0.12)`);
      water.addColorStop(1, "transparent");
      ctx.fillStyle = water;
      ctx.fillRect(0, groundY, W, H - groundY);

      // Night sky glow — Victoria Peak / harbour city lights
      const moon = ctx.createRadialGradient(W * 0.88, H * 0.12, 0, W * 0.88, H * 0.12, W * 0.28);
      moon.addColorStop(0, `rgba(${R},${G},${B},0.08)`);
      moon.addColorStop(1, "transparent");
      ctx.fillStyle = moon;
      ctx.fillRect(0, 0, W, H);

      // Horizon glow behind skyline
      const horizon = ctx.createLinearGradient(0, groundY - maxH * 0.3, 0, groundY);
      horizon.addColorStop(0, "transparent");
      horizon.addColorStop(1, `rgba(${R},${G},${B},0.08)`);
      ctx.fillStyle = horizon;
      ctx.fillRect(0, 0, W, H);

      frameRef.current = requestAnimationFrame((ts) => { tRef.current = ts; render(ts); });
    }

    function init() {
      W = canvas!.width = canvas!.offsetWidth;
      H = canvas!.height = canvas!.offsetHeight;
    }

    const ro = new ResizeObserver(() => { init(); });
    ro.observe(canvas!);
    init();
    frameRef.current = requestAnimationFrame((ts) => render(ts));

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0, display: "block" }} />
  );
}

const BG = "#0b2213";
const GOLD = "#a28959";
const GOLD_BRIGHT = "#c4a96e";
const CREAM = "#d4c5a2";          // warm cream — high contrast body text
const CREAM_DIM = "rgba(212,197,162,0.65)";  // secondary/caption text
const GOLD_DIM = CREAM;           // legacy alias so existing refs stay cream
const GOLD_FAINT = "rgba(162,137,89,0.15)";
const LABEL_COLOR = "rgba(162,137,89,0.75)"; // section eyebrow labels

/* ── Scroll-reveal (only for below-fold sections) ── */
function useReveal() {
  const [visible, setVisible] = useState<Set<number>>(new Set());
  const refs = useRef<Map<number, HTMLElement>>(new Map());

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const idx = parseInt((e.target as HTMLElement).dataset.revealIdx || "");
            if (!isNaN(idx)) setVisible(prev => new Set(prev).add(idx));
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    refs.current.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const setRef = useCallback((i: number) => (el: HTMLElement | null) => {
    if (el) {
      el.dataset.revealIdx = String(i);
      refs.current.set(i, el);
    } else {
      refs.current.delete(i);
    }
  }, []);

  return { setRef, visible };
}

const SERVICE_ICONS = [
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>,
];

const STATS_VALUES = ["500+", "98%", "5+", "24h"];

function LangOption({ l, active, onSelect }: { l: any; active: boolean; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onSelect}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left"
      style={{
        background: active ? "rgba(162,137,89,0.18)" : hovered ? "rgba(162,137,89,0.1)" : "transparent",
        color: active ? "#c4a96e" : hovered ? "#a28959" : "rgba(162,137,89,0.55)",
        borderLeft: active ? "2px solid rgba(162,137,89,0.6)" : "2px solid transparent",
        transition: "all 0.18s ease",
      }}>
      <span className="text-base">{l.flag}</span>
      <span className="font-medium">{l.name}</span>
      {active && <span className="ml-auto text-[10px] opacity-60">✓</span>}
    </button>
  );
}

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
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-medium"
        style={{ borderColor: "rgba(162,137,89,0.25)", color: GOLD_DIM, background: "rgba(162,137,89,0.07)", transition: "all 0.2s" }}>
        <span>{current?.flag}</span>
        <span className="hidden sm:inline">{current?.name}</span>
        <svg viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-2.5 h-2.5"><path d="M1 1l4 4 4-4" /></svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1.5 rounded-xl border shadow-2xl z-50 overflow-hidden"
          style={{ background: "#0a1f0e", borderColor: "rgba(162,137,89,0.2)", minWidth: 160 }}>
          {LANG_LIST.map((l: any) => (
            <LangOption key={l.code} l={l} active={l.code === lang} onSelect={() => { setLang(l.code); setOpen(false); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function GlowCard({ children, className = "", style = {} }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className={className}
      style={{
        ...style,
        transition: "transform 0.3s cubic-bezier(.22,.68,0,1.2), box-shadow 0.3s ease, border-color 0.3s ease, background 0.3s ease",
        transform: hovered ? "translateY(-8px) scale(1.01)" : "translateY(0) scale(1)",
        boxShadow: hovered ? "0 20px 60px rgba(162,137,89,0.18), 0 0 0 1px rgba(162,137,89,0.3)" : "none",
        borderColor: hovered ? "rgba(162,137,89,0.4)" : GOLD_FAINT,
        background: hovered ? "rgba(162,137,89,0.09)" : "rgba(162,137,89,0.04)",
      }}>
      {children}
    </div>
  );
}

function StatCard({ val, label }: { val: string; label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="rounded-2xl text-center border cursor-default flex flex-col items-center justify-center"
      style={{
        padding: "2rem 1.5rem",
        minHeight: 120,
        background: hovered ? "rgba(162,137,89,0.1)" : "rgba(162,137,89,0.05)",
        borderColor: hovered ? "rgba(162,137,89,0.45)" : GOLD_FAINT,
        boxShadow: hovered ? "0 8px 32px rgba(162,137,89,0.2)" : "none",
        transition: "all 0.25s ease",
        transform: hovered ? "scale(1.04)" : "scale(1)",
      }}>
      <p className="text-4xl font-black mb-1.5" style={{ color: hovered ? "#c4a96e" : GOLD, transition: "color 0.25s" }}>{val}</p>
      <p className="text-sm font-medium" style={{ color: CREAM_DIM }}>{label}</p>
    </div>
  );
}

/* Reveal wrapper — fades up when in view */
function Reveal({ children, idx, visible, setRef, delay = 0 }: {
  children: React.ReactNode; idx: number; visible: Set<number>;
  setRef: (i: number) => (el: HTMLElement | null) => void; delay?: number;
}) {
  const isVisible = visible.has(idx);
  return (
    <div ref={setRef(idx) as any}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.6s cubic-bezier(.22,.68,0,1.2) ${delay}ms, transform 0.6s cubic-bezier(.22,.68,0,1.2) ${delay}ms`,
      }}>
      {children}
    </div>
  );
}

export default function Landing() {
  const { lang, setLang, t, isRtl } = useLang();
  const pricing = usePricing();
  const { setRef, visible } = useReveal();
  const [viewAllHov, setViewAllHov] = useState(false);
  const [signInHov, setSignInHov] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  usePageSEO({
    title: "Harrowgate Consultancy — Hong Kong Education & University Placement",
    description: "Harrowgate Consultancy supports international students with Hong Kong university applications. Expert document preparation, application management, and dedicated advisor support.",
  });

  const serviceTitles = [t("services.s1"), t("services.s2"), t("services.s3"), t("services.s4"), t("services.s5"), t("services.s6")];
  const serviceDescs  = [t("services.d1"), t("services.d2"), t("services.d3"), t("services.d4"), t("services.d5"), t("services.d6")];
  const statsLabels   = [t("stats.placed"), t("stats.approval"), t("stats.years"), t("stats.response")];
  const testimonials  = [
    { q: t("testimonials.q1"), name: "Aisha M.",  school: "The University of Hong Kong" },
    { q: t("testimonials.q2"), name: "Daniel K.", school: "Hong Kong Polytechnic University" },
    { q: t("testimonials.q3"), name: "Priya S.",  school: "City University of Hong Kong" },
  ];

  return (
    <div className="min-h-screen" dir={isRtl ? "rtl" : "ltr"}
      style={{ background: BG, fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflowX: "clip" }}>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes shimmer-sweep {
          0%{background-position:-200% center}
          100%{background-position:200% center}
        }
        @keyframes orb-drift {
          0%,100%{transform:translate(0,0) scale(1)}
          33%{transform:translate(30px,-20px) scale(1.05)}
          66%{transform:translate(-20px,15px) scale(0.97)}
        }
        @keyframes hero-fade-up {
          from { opacity:0; transform:translateY(22px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes badge-pulse {
          0%,100%{box-shadow:0 0 0 0 rgba(162,137,89,0.35)}
          50%{box-shadow:0 0 0 8px rgba(162,137,89,0)}
        }
        @keyframes scroll-bounce {
          0%,100%{transform:translateY(0);opacity:0.8}
          50%{transform:translateY(8px);opacity:0.4}
        }
        .scroll-indicator { animation: scroll-bounce 1.8s ease-in-out infinite; }
        .hero-logo { animation: float 5s ease-in-out infinite; filter: drop-shadow(0 0 48px rgba(162,137,89,0.45)) brightness(1.08); }
        @keyframes btn-glow-pulse {
          0%,100% { box-shadow: 0 4px 24px rgba(196,169,110,0.45), 0 0 0 0 rgba(196,169,110,0.3); }
          50%      { box-shadow: 0 8px 40px rgba(196,169,110,0.75), 0 0 0 6px rgba(196,169,110,0); }
        }
        .shimmer-btn {
          background: linear-gradient(90deg, #b8965e 0%, #e0bc78 35%, #f0d090 50%, #e0bc78 65%, #b8965e 100%);
          background-size: 250% auto;
          animation: shimmer-sweep 2.4s linear infinite, btn-glow-pulse 2.4s ease-in-out infinite;
        }
        .shimmer-btn:hover {
          animation-duration: 1s, 1s;
          transform: scale(1.07);
          filter: brightness(1.15);
        }
        .orb { animation: orb-drift 14s ease-in-out infinite; }
        .orb2 { animation: orb-drift 18s ease-in-out infinite reverse; }
        .badge-pill { animation: badge-pulse 2.8s ease-in-out infinite; }
        .hero-item-1 { animation: hero-fade-up 0.65s cubic-bezier(.22,.68,0,1.2) 0.05s both; }
        .hero-item-2 { animation: hero-fade-up 0.65s cubic-bezier(.22,.68,0,1.2) 0.15s both; }
        .hero-item-3 { animation: hero-fade-up 0.65s cubic-bezier(.22,.68,0,1.2) 0.25s both; }
        .hero-item-4 { animation: hero-fade-up 0.65s cubic-bezier(.22,.68,0,1.2) 0.35s both; }
        .hero-item-5 { animation: hero-fade-up 0.65s cubic-bezier(.22,.68,0,1.2) 0.45s both; }
        .hero-item-6 { animation: hero-fade-up 0.65s cubic-bezier(.22,.68,0,1.2) 0.55s both; }
        .hero-item-7 { animation: hero-fade-up 0.65s cubic-bezier(.22,.68,0,1.2) 0.65s both; }
        .hero-logo-right { animation: hero-fade-up 0.5s cubic-bezier(.22,.68,0,1.2) 0s both; }
        .step-num { transition: color 0.3s, text-shadow 0.3s; }
        .step-card:hover .step-num { color: rgba(162,137,89,0.65) !important; text-shadow: 0 0 30px rgba(162,137,89,0.4); }
        .step-card { transition: transform 0.3s cubic-bezier(.22,.68,0,1.2), box-shadow 0.3s ease, border-color 0.3s ease, background 0.3s ease; }
        .step-card:hover { transform: translateY(-6px) scale(1.01); box-shadow: 0 16px 48px rgba(162,137,89,0.15); border-color: rgba(162,137,89,0.35) !important; background: rgba(162,137,89,0.08) !important; }
        .testi-card { transition: transform 0.3s cubic-bezier(.22,.68,0,1.2), box-shadow 0.3s ease, border-color 0.3s ease; }
        .testi-card:hover { transform: translateY(-8px) scale(1.01); box-shadow: 0 20px 60px rgba(162,137,89,0.18); border-color: rgba(162,137,89,0.4) !important; }
        .testi-card:hover .testi-quote { color: rgba(162,137,89,0.65) !important; }
        .price-card { transition: transform 0.28s cubic-bezier(.22,.68,0,1.2), box-shadow 0.28s ease, border-color 0.28s ease, background 0.28s ease; }
        .price-card:hover { transform: translateY(-6px) scale(1.04); box-shadow: 0 12px 40px rgba(162,137,89,0.2); border-color: rgba(162,137,89,0.45) !important; background: rgba(162,137,89,0.1) !important; }
        .nav-link-pill { transition: background 0.2s, border-color 0.2s; }
        .nav-link-pill:hover { background: rgba(162,137,89,0.14) !important; border-color: rgba(162,137,89,0.5) !important; }
        .svc-icon { transition: background 0.3s, transform 0.3s; }
        .svc-card:hover .svc-icon { background: rgba(162,137,89,0.25) !important; transform: scale(1.18); }
        .gradient-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(162,137,89,0.3) 20%, rgba(162,137,89,0.3) 80%, transparent); }
      `}</style>

      {/* Subtle background glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: "1000px", height: "700px", background: "radial-gradient(ellipse, rgba(162,137,89,0.045) 0%, rgba(162,137,89,0.01) 50%, transparent 75%)" }} />
        <div style={{ position: "absolute", top: "30%", left: "-10%", width: "600px", height: "600px", background: "radial-gradient(ellipse, rgba(162,137,89,0.025) 0%, transparent 65%)" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "-8%", width: "600px", height: "600px", background: "radial-gradient(ellipse, rgba(162,137,89,0.025) 0%, transparent 65%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Nav */}
        <nav style={{ borderBottom: `1px solid ${GOLD_FAINT}`, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", background: "rgba(11,34,19,0.92)", position: "sticky", top: 0, zIndex: 50 }}>
          <div className="flex items-center justify-between px-5 lg:px-10 xl:px-16 py-3 w-full">
            <Link href="/" onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}>
              <img src="/harrowgate-logo.png" alt="HARROWGATE Consultancy" className="h-16 sm:h-24 object-contain cursor-pointer"
                style={{ transition: "opacity 0.2s, transform 0.2s" }}
                onMouseEnter={e => { (e.target as HTMLImageElement).style.opacity = "0.82"; (e.target as HTMLImageElement).style.transform = "scale(1.04)"; }}
                onMouseLeave={e => { (e.target as HTMLImageElement).style.opacity = "1"; (e.target as HTMLImageElement).style.transform = "scale(1)"; }} />
            </Link>

            {/* Desktop links */}
            <div className="hidden sm:flex items-center gap-2">
              <LangPicker lang={lang} setLang={setLang} LANG_LIST={LANG_LIST} />
              <Link href="/packages" className="nav-link-pill text-sm font-medium px-4 py-2 rounded-full border inline-flex items-center gap-1.5"
                style={{ borderColor: "rgba(162,137,89,0.2)", color: GOLD, background: "rgba(162,137,89,0.05)" }}>Packages</Link>
              <Link href="/agent-signup" className="nav-link-pill text-sm font-medium px-4 py-2 rounded-full border inline-flex items-center gap-1.5"
                style={{ borderColor: "rgba(162,137,89,0.35)", color: GOLD, background: "rgba(162,137,89,0.08)" }}>Our Agents</Link>
              <Link
                href="/sign-in"
                onMouseEnter={() => setSignInHov(true)}
                onMouseLeave={() => setSignInHov(false)}
                className="text-sm font-semibold px-4 py-2 rounded-full border transition-all"
                style={{
                  color: signInHov ? "#f0d28c" : GOLD,
                  borderColor: signInHov ? "rgba(196,169,110,0.55)" : "rgba(162,137,89,0.25)",
                  background: signInHov ? "rgba(162,137,89,0.12)" : "rgba(162,137,89,0.04)",
                  boxShadow: signInHov ? "0 0 16px rgba(162,137,89,0.3)" : "none",
                  transition: "all 0.2s ease",
                }}>
                {t("nav.signIn")}
              </Link>
              <Link href="/sign-up" className="shimmer-btn text-sm font-semibold px-5 py-2.5 rounded-full"
                style={{ color: BG, boxShadow: "0 4px 20px rgba(162,137,89,0.4)" }}>
                {t("nav.getStarted")}
              </Link>
            </div>

            {/* Mobile right side */}
            <div className="flex sm:hidden items-center gap-2">
              <LangPicker lang={lang} setLang={setLang} LANG_LIST={LANG_LIST} />
              <button
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Menu"
                className="flex flex-col justify-center items-center w-10 h-10 rounded-full border"
                style={{ borderColor: "rgba(162,137,89,0.3)", background: "rgba(162,137,89,0.07)", gap: "5px" }}>
                <span style={{ display: "block", width: "18px", height: "1.5px", background: GOLD, borderRadius: "2px", transition: "transform 0.25s, opacity 0.25s", transform: menuOpen ? "translateY(6.5px) rotate(45deg)" : "none" }} />
                <span style={{ display: "block", width: "18px", height: "1.5px", background: GOLD, borderRadius: "2px", transition: "opacity 0.25s", opacity: menuOpen ? 0 : 1 }} />
                <span style={{ display: "block", width: "18px", height: "1.5px", background: GOLD, borderRadius: "2px", transition: "transform 0.25s, opacity 0.25s", transform: menuOpen ? "translateY(-6.5px) rotate(-45deg)" : "none" }} />
              </button>
            </div>
          </div>

          {/* Mobile dropdown menu */}
          <div style={{
            overflow: "hidden",
            maxHeight: menuOpen ? "320px" : "0",
            transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
            borderTop: menuOpen ? `1px solid ${GOLD_FAINT}` : "1px solid transparent",
          }}>
            <div className="flex flex-col px-5 py-4 gap-3">
              <Link href="/packages" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold"
                style={{ borderColor: "rgba(162,137,89,0.2)", color: GOLD, background: "rgba(162,137,89,0.06)" }}>
                <span style={{ fontSize: "1rem" }}>📋</span> Packages
              </Link>
              <Link href="/agent-signup" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold"
                style={{ borderColor: "rgba(162,137,89,0.2)", color: GOLD, background: "rgba(162,137,89,0.06)" }}>
                <span style={{ fontSize: "1rem" }}>🤝</span> Our Agents
              </Link>
              <Link href="/sign-in" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold"
                style={{ borderColor: "rgba(162,137,89,0.25)", color: GOLD, background: "rgba(162,137,89,0.06)" }}>
                <span style={{ fontSize: "1rem" }}>🔑</span> {t("nav.signIn")}
              </Link>
              <Link href="/sign-up" onClick={() => setMenuOpen(false)}
                className="shimmer-btn flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold"
                style={{ color: BG, boxShadow: "0 4px 20px rgba(162,137,89,0.4)" }}>
                {t("nav.getStarted")} →
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Hero — full-width two-column ── */}
        <section className="min-h-[92vh] flex flex-col w-full px-6 lg:px-16 xl:px-24" style={{ position: "relative", overflow: "hidden" }}>
          <HeroBackground />

          {/* Top: two-column text + logo */}
          <div className="flex-1 flex flex-col lg:flex-row items-center gap-10 lg:gap-0" style={{ position: "relative", zIndex: 1 }}>

            {/* Left: text */}
            <div className="flex-1 flex flex-col items-start lg:pr-12">
              <div className="hero-item-1 badge-pill inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full mb-10 border"
                style={{ background: "rgba(162,137,89,0.08)", borderColor: "rgba(162,137,89,0.25)" }}>
                <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: "#4ade80" }} />
                <p className="text-sm font-semibold tracking-[0.22em] uppercase" style={{ color: LABEL_COLOR }}>{t("hero.badge")}</p>
              </div>

              <h1 className="hero-item-2 text-6xl md:text-7xl xl:text-8xl font-bold tracking-tight mb-8 leading-[1.05]"
                style={{
                  background: `linear-gradient(135deg, #c4a96e 0%, ${GOLD} 45%, rgba(162,137,89,0.6) 100%)`,
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                  paddingBottom: "0.15em",
                }}>
                {t("hero.h1")}<br />{t("hero.h2")}
              </h1>

              <p className="hero-item-3 text-xl md:text-2xl leading-relaxed mb-9 max-w-2xl" style={{ color: GOLD_DIM }}>
                {t("hero.sub")}
              </p>

              {/* Feature pill 1 — Study & Build */}
              <div className="hero-item-4 inline-flex items-center gap-3 px-8 py-4 rounded-full mb-5 self-start"
                style={{
                  background: "linear-gradient(135deg, rgba(196,169,110,0.28) 0%, rgba(162,137,89,0.14) 100%)",
                  border: "1.5px solid rgba(240,210,140,0.7)",
                  boxShadow: "0 0 32px rgba(196,169,110,0.45), 0 0 8px rgba(196,169,110,0.25), inset 0 1px 0 rgba(240,210,140,0.35)",
                }}>
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 flex-shrink-0" style={{ color: "#f0d28c" }}>
                  <path d="M12 3L2 8l10 5 10-5-10-5z" fill="currentColor" opacity="0.95"/>
                  <path d="M2 8v6M6 10.5v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 8v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <p className="text-lg font-semibold tracking-wide" style={{ color: "#f0d28c" }}>{t("hero.pr")}</p>
              </div>

              {/* Feature pill 2 — Price proposition */}
              <div className="hero-item-5 inline-flex items-center gap-5 px-8 py-4 rounded-full mb-12 self-start"
                style={{
                  background: "linear-gradient(135deg, rgba(196,169,110,0.32) 0%, rgba(162,137,89,0.15) 100%)",
                  border: "1.5px solid rgba(240,210,140,0.75)",
                  boxShadow: "0 0 40px rgba(196,169,110,0.5), 0 0 12px rgba(196,169,110,0.3), inset 0 1px 0 rgba(240,210,140,0.4)",
                }}>
                <span style={{
                  fontSize: "1.65rem", fontWeight: 800, letterSpacing: "-0.01em",
                  background: "linear-gradient(135deg, #f5e09a 0%, #c4a96e 60%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                  lineHeight: 1, whiteSpace: "nowrap",
                }}>HKD$&nbsp;3,000</span>
                <span style={{ width: "1px", height: "2rem", background: "rgba(240,210,140,0.5)", flexShrink: 0 }} />
                <p className="text-base font-medium leading-snug" style={{ color: "#e8d08a", maxWidth: "18rem" }}>
                  {t("hero.pricePill")}
                </p>
              </div>

              <div className="hero-item-6 flex flex-col sm:flex-row gap-5 items-start">
                <Link href="/sign-up" className="shimmer-btn px-11 py-5 rounded-full text-lg font-semibold"
                  style={{ color: BG, boxShadow: "0 8px 36px rgba(162,137,89,0.4)" }}>
                  {t("hero.cta1")}
                </Link>
                <a href="#how-it-works"
                  className="px-11 py-5 rounded-full text-lg font-semibold border transition-all hover:opacity-90 hover:bg-[rgba(162,137,89,0.08)]"
                  style={{ borderColor: "rgba(162,137,89,0.3)", color: GOLD }}>
                  {t("hero.cta2")}
                </a>
              </div>
            </div>

            {/* Right: logo — fills the full height of the column, image centred */}
            <div className="hero-logo-right flex-shrink-0 flex self-stretch items-center justify-center lg:w-[44%] w-full">
              <Link href="/sign-in" className="cursor-pointer block w-full">
                <img src="/harrowgate-logo.png" alt="HARROWGATE"
                  className="w-full object-contain"
                  style={{
                    animation: "float 5s ease-in-out 0.3s infinite",
                    filter: "drop-shadow(0 0 40px rgba(162,137,89,0.3))",
                  }} />
              </Link>
            </div>
          </div>

          {/* Bottom: full-width stats */}
          <div className="hero-item-7 grid grid-cols-2 md:grid-cols-4 gap-4 w-full pb-3" style={{ position: "relative", zIndex: 1 }}>
            {STATS_VALUES.map((val, i) => <StatCard key={val} val={val} label={statsLabels[i]} />)}
          </div>

          {/* Scroll indicator — pinned to very bottom */}
          <div className="flex flex-col items-center pb-3 pt-1 gap-1" style={{ position: "relative", zIndex: 1 }}>
            <p className="text-xs font-medium tracking-[0.2em] uppercase" style={{ color: "rgba(162,137,89,0.4)" }}>Scroll</p>
            <div className="scroll-indicator flex flex-col items-center gap-1">
              <svg viewBox="0 0 20 12" fill="none" className="w-5 h-3" style={{ color: GOLD }}>
                <path d="M1 1l9 9 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <svg viewBox="0 0 20 12" fill="none" className="w-5 h-3" style={{ color: "rgba(162,137,89,0.35)" }}>
                <path d="M1 1l9 9 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </section>

        {/* ── Services (scroll reveal) ── */}
        <section className="py-24" style={{ background: "rgba(0,0,0,0.22)" }}>
          <div className="w-full px-6 lg:px-16 xl:px-24">
            <Reveal idx={0} visible={visible} setRef={setRef}><p className="text-xs font-semibold tracking-[0.3em] uppercase text-center mb-4" style={{ color: LABEL_COLOR }}>{t("services.title")}</p></Reveal>
            <Reveal idx={1} visible={visible} setRef={setRef} delay={80}><h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: GOLD }}>{t("services.heading")}</h2></Reveal>
            <Reveal idx={2} visible={visible} setRef={setRef} delay={140}><p className="text-center mb-14 text-base max-w-xl mx-auto" style={{ color: GOLD_DIM }}>{t("services.sub")}</p></Reveal>
            <div className="grid md:grid-cols-3 gap-5">
              {serviceTitles.map((title, i) => (
                <Reveal key={i} idx={3 + i} visible={visible} setRef={setRef} delay={i * 80}>
                  <GlowCard className="svc-card rounded-2xl p-6 border h-full cursor-default">
                    <div className="svc-icon w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(162,137,89,0.12)", color: GOLD }}>
                      {SERVICE_ICONS[i]}
                    </div>
                    <h3 className="text-base font-semibold mb-2" style={{ color: GOLD }}>{title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: GOLD_DIM }}>{serviceDescs[i]}</p>
                  </GlowCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <div className="gradient-divider" />

        {/* ── How It Works ── */}
        <section id="how-it-works" className="py-24 w-full px-6 lg:px-16 xl:px-24">
          <div className="w-full">
            <Reveal idx={10} visible={visible} setRef={setRef}><p className="text-xs font-semibold tracking-[0.3em] uppercase text-center mb-4" style={{ color: LABEL_COLOR }}>{t("how.label")}</p></Reveal>
            <Reveal idx={11} visible={visible} setRef={setRef} delay={80}><h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: GOLD }}>{t("how.title")}</h2></Reveal>
            <Reveal idx={12} visible={visible} setRef={setRef} delay={140}><p className="text-center mb-16 text-base max-w-xl mx-auto" style={{ color: GOLD_DIM }}>{t("how.sub")}</p></Reveal>

            <div className="grid md:grid-cols-3 gap-5 mb-5">
              {[{ num: "01", title: t("how.step1"), desc: t("how.d1") }, { num: "02", title: t("how.step2"), desc: t("how.d2") }, { num: "03", title: t("how.step3"), desc: t("how.d3") }].map((step, i) => (
                <Reveal key={step.num} idx={13 + i} visible={visible} setRef={setRef} delay={i * 80}>
                  <div className="step-card flex flex-col rounded-2xl p-7 border cursor-default" style={{ background: "rgba(162,137,89,0.03)", borderColor: GOLD_FAINT }}>
                    <p className="step-num text-5xl font-black mb-4" style={{ color: "rgba(162,137,89,0.2)", letterSpacing: "-0.02em" }}>{step.num}</p>
                    <h3 className="text-lg font-bold mb-2" style={{ color: GOLD }}>{step.title}</h3>
                    <p className="text-sm leading-relaxed flex-1" style={{ color: GOLD_DIM }}>{step.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-5 md:max-w-[66%] mx-auto">
              {[{ num: "04", title: t("how.step4"), desc: t("how.d4") }, { num: "05", title: t("how.step5"), desc: t("how.d5") }].map((step, i) => (
                <Reveal key={step.num} idx={16 + i} visible={visible} setRef={setRef} delay={i * 80}>
                  <div className="step-card flex flex-col rounded-2xl p-7 border cursor-default" style={{ background: "rgba(162,137,89,0.03)", borderColor: GOLD_FAINT }}>
                    <p className="step-num text-5xl font-black mb-4" style={{ color: "rgba(162,137,89,0.2)", letterSpacing: "-0.02em" }}>{step.num}</p>
                    <h3 className="text-lg font-bold mb-2" style={{ color: GOLD }}>{step.title}</h3>
                    <p className="text-sm leading-relaxed flex-1" style={{ color: GOLD_DIM }}>{step.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <div className="gradient-divider" />

        {/* ── Packages CTA ── */}
        <section className="py-20 px-6" style={{ background: "rgba(162,137,89,0.025)" }}>
          <div className="max-w-4xl mx-auto text-center">
            <Reveal idx={20} visible={visible} setRef={setRef}><p className="text-xs font-semibold tracking-[0.3em] uppercase mb-4" style={{ color: LABEL_COLOR }}>{t("pkg.badge")}</p></Reveal>
            <Reveal idx={21} visible={visible} setRef={setRef} delay={80}><h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: GOLD }}>{t("pricing.startJust")}</h2></Reveal>
            <Reveal idx={22} visible={visible} setRef={setRef} delay={130}><p className="text-base max-w-xl mx-auto mb-5" style={{ color: GOLD_DIM }}>{t("pricing.desc")}</p></Reveal>
            <Reveal idx={23} visible={visible} setRef={setRef} delay={180}>
              <p className="text-sm font-semibold max-w-lg mx-auto mb-8 px-5 py-3 rounded-full border" style={{ color: GOLD, borderColor: "rgba(162,137,89,0.3)", background: "rgba(162,137,89,0.08)" }}>✦ {t("how.payPill")}</p>
            </Reveal>
            <Reveal idx={24} visible={visible} setRef={setRef} delay={220}>
              <div className="flex flex-wrap gap-4 justify-center items-center mb-8">
                {[{ lk: "pkg.tier1", cost: pricing.mastersTotal }, { lk: "pkg.tier2", cost: pricing.bachelorTotal }, { lk: "pkg.tier3", cost: pricing.associateTotal }, { lk: "pkg.tier4", cost: pricing.diplomaTotal }].map(p => (
                  <div key={p.lk} className="price-card rounded-2xl px-7 py-5 border text-center min-w-[160px] cursor-default" style={{ background: "rgba(162,137,89,0.05)", borderColor: GOLD_FAINT }}>
                    <p className="text-xs font-medium mb-1.5" style={{ color: CREAM_DIM }}>{t(p.lk)}</p>
                    <p className="text-base font-bold" style={{ color: GOLD }}>{p.cost}</p>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal idx={25} visible={visible} setRef={setRef} delay={260}>
              <Link
                href="/packages"
                onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
                onMouseEnter={() => setViewAllHov(true)}
                onMouseLeave={() => setViewAllHov(false)}
                className="inline-flex items-center gap-3 px-12 py-5 rounded-full text-base font-bold border transition-all"
                style={{
                  borderColor: viewAllHov ? "rgba(196,169,110,0.8)" : "rgba(162,137,89,0.4)",
                  color: viewAllHov ? "#f0d28c" : GOLD,
                  background: viewAllHov ? "rgba(162,137,89,0.15)" : "rgba(162,137,89,0.07)",
                  boxShadow: viewAllHov
                    ? "0 0 40px rgba(196,169,110,0.5), 0 0 80px rgba(162,137,89,0.25), 0 8px 32px rgba(0,0,0,0.3)"
                    : "0 4px 20px rgba(162,137,89,0.1)",
                  transform: viewAllHov ? "scale(1.04)" : "scale(1)",
                  transition: "all 0.25s ease",
                  letterSpacing: "0.02em",
                }}>
                {t("pricing.viewAll")} →
              </Link>
            </Reveal>
          </div>
        </section>

        <div className="gradient-divider" />

        {/* ── Testimonials ── */}
        <section className="py-24 px-6 lg:px-16 xl:px-24" style={{ background: "rgba(0,0,0,0.22)" }}>
          <div className="w-full">
            <Reveal idx={30} visible={visible} setRef={setRef}><p className="text-xs font-semibold tracking-[0.3em] uppercase text-center mb-4" style={{ color: LABEL_COLOR }}>{t("testimonials.label")}</p></Reveal>
            <Reveal idx={31} visible={visible} setRef={setRef} delay={80}><h2 className="text-3xl md:text-4xl font-bold text-center mb-14" style={{ color: GOLD }}>{t("testimonials.title")}</h2></Reveal>
            <div className="grid md:grid-cols-3 gap-5">
              {testimonials.map((item, i) => (
                <Reveal key={item.name} idx={32 + i} visible={visible} setRef={setRef} delay={i * 100}>
                  <div className="testi-card rounded-2xl p-7 border flex flex-col gap-4" style={{ background: "rgba(162,137,89,0.04)", borderColor: GOLD_FAINT }}>
                    <p className="testi-quote text-4xl leading-none font-serif" style={{ color: "rgba(162,137,89,0.2)", transition: "color 0.3s" }}>"</p>
                    <p className="text-sm leading-relaxed flex-1" style={{ color: GOLD_DIM }}>{item.q}</p>
                    <div className="pt-2 border-t" style={{ borderColor: "rgba(162,137,89,0.1)" }}>
                      <p className="text-sm font-semibold" style={{ color: GOLD }}>{item.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: CREAM_DIM }}>{item.school}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <div className="gradient-divider" />

        {/* ── Final CTA ── */}
        <section className="py-28 text-center px-6">
          <div className="max-w-2xl mx-auto">
            <Reveal idx={40} visible={visible} setRef={setRef}><p className="text-xs font-semibold tracking-[0.3em] uppercase mb-6" style={{ color: LABEL_COLOR }}>{t("cta.label")}</p></Reveal>
            <Reveal idx={41} visible={visible} setRef={setRef} delay={80}>
              <h2 className="text-4xl md:text-5xl font-bold mb-5"
                style={{ background: `linear-gradient(135deg, #c4a96e 0%, ${GOLD} 50%, rgba(162,137,89,0.6) 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                {t("cta.heading")}
              </h2>
            </Reveal>
            <Reveal idx={42} visible={visible} setRef={setRef} delay={140}><p className="mb-10 text-base leading-relaxed" style={{ color: GOLD_DIM }}>{t("cta.sub")}</p></Reveal>
            <Reveal idx={43} visible={visible} setRef={setRef} delay={200}>
              <Link href="/sign-up" className="shimmer-btn inline-flex items-center gap-2 px-10 py-4 rounded-full text-base font-semibold"
                style={{ color: BG, boxShadow: "0 12px 48px rgba(162,137,89,0.45)" }}>
                {t("hero.cta1")} →
              </Link>
            </Reveal>
            <Reveal idx={44} visible={visible} setRef={setRef} delay={260}>
              <p className="mt-6 text-xs" style={{ color: CREAM_DIM }}>
                {t("cta.hasAccount")}{" "}
                <Link href="/sign-in" className="underline hover:opacity-80 transition-opacity" style={{ color: CREAM }}>{t("nav.signIn")}</Link>
              </p>
            </Reveal>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 lg:px-16 xl:px-24 border-t" style={{ borderColor: "rgba(162,137,89,0.1)" }}>
          <div className="w-full">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
              <img src="/harrowgate-logo.png" alt="HARROWGATE" className="h-14 object-contain" style={{ opacity: 0.45 }} />
              <p className="text-xs" style={{ color: CREAM_DIM }}>© {new Date().getFullYear()} HARROWGATE Consultancy, Hong Kong.</p>
            </div>
            <div className="rounded-xl border px-5 py-4 text-center" style={{ borderColor: "rgba(162,137,89,0.1)", background: "rgba(162,137,89,0.03)" }}>
              <p className="text-[11px] leading-relaxed" style={{ color: CREAM_DIM }}>
                <span className="font-semibold" style={{ color: CREAM }}>Legal Notice:</span> HARROWGATE Consultancy is an education consultancy only. We are <span className="font-semibold">not</span> a licensed immigration service provider under the Immigration Service Providers (Regulation) Ordinance (Cap. 658). We do not provide immigration advice or legal advice. For immigration matters, please consult a provider registered with the{" "}
                <a href="https://www.ispb.gov.hk" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70" style={{ color: CREAM }}>Immigration Service Providers Board</a>.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
