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
    total: "HKD$ 130,000",
    firstPayment: "HKD$ 3,000",
    color: "#a28959",
    bg: "rgba(162,137,89,0.07)",
    border: "rgba(162,137,89,0.25)",
    highlight: true,
    features: [
      "Full student visa application support",
      "Expert document preparation & review",
      "Mock interview coaching session",
      "University placement assistance",
      "Dedicated case officer assigned",
      "WhatsApp support throughout",
    ],
  },
  {
    tier: "Bachelor's Degree",
    icon: "📚",
    badge: null,
    total: "HKD$ 120,000",
    firstPayment: "HKD$ 3,000",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.05)",
    border: "rgba(96,165,250,0.18)",
    highlight: false,
    features: [
      "Full student visa application support",
      "Expert document preparation & review",
      "Mock interview coaching session",
      "University placement assistance",
      "Dedicated case officer assigned",
      "WhatsApp support throughout",
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
      "Full student visa application support",
      "Expert document preparation & review",
      "Mock interview coaching session",
      "University placement assistance",
      "Dedicated case officer assigned",
      "WhatsApp support throughout",
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
                <h2 className="text-xl font-bold mb-1" style={{ color: pkg.color }}>{pkg.tier}</h2>
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
            <a href="https://wa.me/85260606457" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ color: GOLD }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Chat with us on WhatsApp first
            </a>
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
