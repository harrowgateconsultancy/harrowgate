import { Link } from "wouter";

const BG = "#0b2213";
const GOLD = "#a28959";
const GOLD_FAINT = "rgba(162,137,89,0.12)";
const GOLD_DIM = "rgba(162,137,89,0.7)";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const PACKAGES = [
  {
    tier: "Master's Degree",
    icon: "🎓",
    badge: "Most Popular",
    total: "HKD$ 140,000",
    firstPayment: "HKD$ 3,000",
    color: "#a28959",
    bg: "rgba(162,137,89,0.07)",
    border: "rgba(162,137,89,0.25)",
    highlight: true,
    features: [
      "1st semester tuition fees included (6 months)",
      "Consultation charges included",
      "Documentation charges included",
    ],
  },
  {
    tier: "Bachelor's Degree",
    icon: "📚",
    badge: null,
    total: "HKD$ 130,000",
    firstPayment: "HKD$ 3,000",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.05)",
    border: "rgba(96,165,250,0.18)",
    highlight: false,
    features: [
      "1st semester tuition fees included (6 months)",
      "Consultation charges included",
      "Documentation charges included",
    ],
  },
  {
    tier: "Associate Degree",
    icon: "🏫",
    badge: null,
    total: "HKD$ 90,000",
    firstPayment: "HKD$ 3,000",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.05)",
    border: "rgba(74,222,128,0.18)",
    highlight: false,
    features: [
      "1st semester tuition fees included (6 months)",
      "Consultation charges included",
      "Documentation charges included",
    ],
  },
];

export default function Packages() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: BG, fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
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
              <Link href="/" className="text-sm transition-opacity hover:opacity-70 px-4 py-2" style={{ color: GOLD_DIM }}>← Back</Link>
              <Link href="/sign-up"
                className="text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:opacity-90 hover:scale-105"
                style={{ background: GOLD, color: BG, boxShadow: "0 4px 16px rgba(162,137,89,0.3)" }}>
                Get Started
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
              Transparent Pricing
            </p>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight" style={{ color: GOLD }}>
            Our Service Packages
          </h1>
          <p className="text-lg max-w-xl mx-auto mb-2" style={{ color: GOLD_DIM }}>
            Start your Hong Kong student journey for just <span className="font-bold" style={{ color: GOLD }}>HKD$ 3,000</span>.
            An expert advisor will contact you to guide the complete process.
          </p>
        </section>

        {/* Packages Grid */}
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {PACKAGES.map((pkg) => (
              <div key={pkg.tier}
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
                      {pkg.badge}
                    </span>
                  </div>
                )}

                <div className="text-4xl mb-4">{pkg.icon}</div>
                <h2 className="text-3xl font-bold mb-1" style={{ color: pkg.color }}>{pkg.tier}</h2>
                <p className="text-xs font-semibold tracking-widest uppercase mb-6" style={{ color: "rgba(162,137,89,0.4)" }}>
                  Full Service Package
                </p>

                <div className="rounded-2xl p-5 mb-6 border" style={{ background: "rgba(0,0,0,0.15)", borderColor: "rgba(162,137,89,0.1)" }}>
                  <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "rgba(162,137,89,0.45)" }}>
                    Total Package Cost
                  </p>
                  <p className="text-3xl font-bold mb-4" style={{ color: pkg.color }}>{pkg.total}</p>

                  <div className="border-t pt-4" style={{ borderColor: "rgba(162,137,89,0.1)" }}>
                    <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "rgba(162,137,89,0.45)" }}>
                      First Payment to Start
                    </p>
                    <p className="text-xl font-bold" style={{ color: GOLD }}>{pkg.firstPayment}</p>
                    <p className="text-xs mt-1" style={{ color: "rgba(162,137,89,0.4)" }}>
                      Balance paid in stages throughout the process
                    </p>
                  </div>
                </div>

                <ul className="flex-1 space-y-3 mb-8">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: GOLD_DIM }}>
                      <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 shrink-0 mt-0.5" style={{ color: pkg.color }}>
                        <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link href="/sign-up"
                  className="w-full text-center py-4 rounded-2xl text-sm font-bold transition-all hover:opacity-90"
                  style={{ background: pkg.highlight ? GOLD : "transparent", color: pkg.highlight ? BG : pkg.color, border: pkg.highlight ? "none" : `1.5px solid ${pkg.border}` }}>
                  Start for {pkg.firstPayment} →
                </Link>
              </div>
            ))}
          </div>

          {/* Note */}
          <div className="mt-12 rounded-2xl p-6 border text-center max-w-2xl mx-auto" style={{ background: "rgba(162,137,89,0.04)", borderColor: GOLD_FAINT }}>
            <p className="text-base font-semibold mb-2" style={{ color: GOLD }}>What happens after your first payment?</p>
            <p className="text-sm leading-relaxed" style={{ color: GOLD_DIM }}>
              Once HKD$ 3,000 is received, a dedicated HARROWGATE expert advisor will contact you via WhatsApp within 24 hours to walk you through every step of the application and visa process.
            </p>
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
