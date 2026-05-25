import { Link } from "wouter";

const HKBadge = () => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <circle cx="60" cy="60" r="58" stroke="#a28959" strokeWidth="2" fill="none"/>
    <circle cx="60" cy="60" r="50" fill="#a28959" fillOpacity="0.08"/>
    {[0, 72, 144, 216, 288].map((angle, i) => {
      const rad = (angle - 90) * Math.PI / 180;
      const x1 = 60 + 32 * Math.cos(rad);
      const y1 = 60 + 32 * Math.sin(rad);
      const x2 = 60 + 22 * Math.cos(rad + 0.6);
      const y2 = 60 + 22 * Math.sin(rad + 0.6);
      const x3 = 60 + 22 * Math.cos(rad - 0.6);
      const y3 = 60 + 22 * Math.sin(rad - 0.6);
      return (
        <path
          key={i}
          d={`M60,60 Q${x2},${y2} ${x1},${y1} Q${x3},${y3} 60,60`}
          fill="#a28959"
          opacity="0.7"
        />
      );
    })}
    <circle cx="60" cy="60" r="8" fill="#a28959" opacity="0.9"/>
    <text x="60" y="95" textAnchor="middle" fill="#a28959" fontSize="9" fontFamily="-apple-system, sans-serif" letterSpacing="2" fontWeight="600">HONG KONG</text>
  </svg>
);

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ background: "#a13300" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="HARROWGATE" className="h-8" />
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "#a28959" }}
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="text-sm font-semibold px-5 py-2 rounded-full border transition-all hover:opacity-90"
            style={{ color: "#a13300", background: "#a28959", borderColor: "#a28959" }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 pt-16 pb-24 text-center max-w-4xl mx-auto">
        <Link href="/sign-in">
          <div
            className="w-28 h-28 mb-10 cursor-pointer transition-transform hover:scale-105"
            title="Sign in to start your application"
          >
            <HKBadge />
          </div>
        </Link>
        <p className="text-sm font-semibold tracking-[0.25em] uppercase mb-6" style={{ color: "#a28959", opacity: 0.8 }}>
          HARROWGATE Visa Consultancy
        </p>
        <h1
          className="text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-tight"
          style={{ color: "#a28959" }}
        >
          Study in<br />Hong Kong.
        </h1>
        <p className="text-lg md:text-xl leading-relaxed mb-10 max-w-2xl" style={{ color: "rgba(162,137,89,0.75)" }}>
          We handle your student visa application from start to finish — professionally, accurately, and on time.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="/sign-up"
            className="px-8 py-3.5 rounded-full text-base font-semibold transition-all hover:scale-105 hover:opacity-90 shadow-lg"
            style={{ background: "#a28959", color: "#a13300" }}
          >
            Start Your Application
          </Link>
          <a
            href="#how-it-works"
            className="px-8 py-3.5 rounded-full text-base font-semibold border transition-all hover:opacity-80"
            style={{ borderColor: "rgba(162,137,89,0.4)", color: "#a28959" }}
          >
            How It Works
          </a>
        </div>
      </section>

      {/* Services */}
      <section className="py-24" style={{ background: "rgba(0,0,0,0.25)" }}>
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: "#a28959" }}>
            Everything you need, handled.
          </h2>
          <p className="text-center mb-16 text-base" style={{ color: "rgba(162,137,89,0.65)" }}>
            Our expert consultants manage every step of your student visa process.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "📋",
                title: "Form Preparation",
                desc: "We complete the Immigration Department's ID995A form on your behalf with accuracy and precision.",
              },
              {
                icon: "📁",
                title: "Document Review",
                desc: "Our team reviews your education certificates and personal documents to ensure compliance.",
              },
              {
                icon: "✅",
                title: "Application Tracking",
                desc: "Stay informed every step of the way with real-time status updates through your personal portal.",
              },
            ].map((s) => (
              <div
                key={s.title}
                className="rounded-2xl p-8 text-center border"
                style={{ background: "rgba(162,137,89,0.06)", borderColor: "rgba(162,137,89,0.15)" }}
              >
                <div className="text-4xl mb-4">{s.icon}</div>
                <h3 className="text-lg font-semibold mb-3" style={{ color: "#a28959" }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(162,137,89,0.65)" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 max-w-4xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: "#a28959" }}>
          Simple. Clear. Fast.
        </h2>
        <p className="text-center mb-16 text-base" style={{ color: "rgba(162,137,89,0.65)" }}>
          Your visa journey in four steps.
        </p>
        <div className="space-y-px">
          {[
            { num: "01", title: "Create Account & Submit", desc: "Register with your email or Google account, fill in your personal details, and upload your education documents." },
            { num: "02", title: "Expert Review", desc: "Our consultants review your submission and prepare your immigration application form for official submission." },
            { num: "03", title: "Approval & Payment", desc: "Once approved, you'll receive payment instructions directly on your portal dashboard." },
            { num: "04", title: "Acknowledgement", desc: "After confirming your payment, we issue an official acknowledgement and proceed with your full application." },
          ].map((step) => (
            <div
              key={step.num}
              className="flex gap-8 items-start py-8 border-b last:border-b-0"
              style={{ borderColor: "rgba(162,137,89,0.15)" }}
            >
              <span className="text-4xl font-bold shrink-0" style={{ color: "rgba(162,137,89,0.25)" }}>
                {step.num}
              </span>
              <div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: "#a28959" }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(162,137,89,0.65)" }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center px-6" style={{ background: "rgba(0,0,0,0.25)" }}>
        <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "#a28959" }}>
          Ready to begin?
        </h2>
        <p className="mb-10 text-base" style={{ color: "rgba(162,137,89,0.65)" }}>
          Create your free account and start your Hong Kong student visa application today.
        </p>
        <Link
          href="/sign-up"
          className="inline-block px-10 py-4 rounded-full text-base font-semibold transition-all hover:scale-105 hover:opacity-90 shadow-xl"
          style={{ background: "#a28959", color: "#a13300" }}
        >
          Get Started — It's Free
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 text-center border-t" style={{ borderColor: "rgba(162,137,89,0.15)" }}>
        <p className="text-xs" style={{ color: "rgba(162,137,89,0.4)" }}>
          © {new Date().getFullYear()} HARROWGATE Visa Consultancy, Hong Kong. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
