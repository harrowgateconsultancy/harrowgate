import { Link } from "wouter";

const BG = "#0f2d18";
const GOLD = "#a28959";
const GOLD_DIM = "rgba(162,137,89,0.65)";
const GOLD_FAINT = "rgba(162,137,89,0.15)";

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto border-b" style={{ borderColor: GOLD_FAINT }}>
        <img
          src="/harrowgate-logo.png"
          alt="HARROWGATE Consultancy"
          className="h-14 object-contain"
        />
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: GOLD }}
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="text-sm font-semibold px-5 py-2 rounded-full transition-all hover:opacity-90"
            style={{ background: GOLD, color: BG }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 pt-20 pb-24 text-center max-w-4xl mx-auto">
        <Link href="/sign-in">
          <div className="mb-10 cursor-pointer transition-transform hover:scale-105">
            <img
              src="/harrowgate-logo.png"
              alt="HARROWGATE"
              className="h-40 object-contain mx-auto"
              style={{ filter: "drop-shadow(0 4px 24px rgba(162,137,89,0.25))" }}
            />
          </div>
        </Link>
        <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-5" style={{ color: GOLD, opacity: 0.6 }}>
          Hong Kong Student Visa Service
        </p>
        <h1
          className="text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-tight"
          style={{ color: GOLD }}
        >
          Study in<br />Hong Kong.
        </h1>
        <p className="text-lg md:text-xl leading-relaxed mb-10 max-w-2xl" style={{ color: GOLD_DIM }}>
          We handle your student visa application from start to finish — professionally, accurately, and on time.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="/sign-up"
            className="px-8 py-3.5 rounded-full text-base font-semibold transition-all hover:scale-105 hover:opacity-90 shadow-lg"
            style={{ background: GOLD, color: BG }}
          >
            Start Your Application
          </Link>
          <a
            href="#how-it-works"
            className="px-8 py-3.5 rounded-full text-base font-semibold border transition-all hover:opacity-80"
            style={{ borderColor: "rgba(162,137,89,0.35)", color: GOLD }}
          >
            How It Works
          </a>
        </div>
      </section>

      {/* Services */}
      <section className="py-24" style={{ background: "rgba(0,0,0,0.3)" }}>
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: GOLD }}>
            Everything you need, handled.
          </h2>
          <p className="text-center mb-16 text-base" style={{ color: GOLD_DIM }}>
            Our expert consultants manage every step of your student visa process.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "📋", title: "Form Preparation", desc: "We complete the Immigration Department's ID995A form on your behalf with accuracy and precision." },
              { icon: "📁", title: "Document Review", desc: "Our team reviews your education certificates and personal documents to ensure compliance." },
              { icon: "✅", title: "Application Tracking", desc: "Stay informed every step of the way with real-time status updates through your personal portal." },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl p-8 text-center border" style={{ background: "rgba(162,137,89,0.05)", borderColor: GOLD_FAINT }}>
                <div className="text-4xl mb-4">{s.icon}</div>
                <h3 className="text-lg font-semibold mb-3" style={{ color: GOLD }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: GOLD_DIM }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 max-w-4xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: GOLD }}>
          Simple. Clear. Fast.
        </h2>
        <p className="text-center mb-16 text-base" style={{ color: GOLD_DIM }}>
          Your visa journey in four steps.
        </p>
        <div className="space-y-px">
          {[
            { num: "01", title: "Create Account & Submit", desc: "Register with your email or Google account, fill in your personal details, and upload your education documents." },
            { num: "02", title: "Expert Review", desc: "Our consultants review your submission and prepare your immigration application form for official submission." },
            { num: "03", title: "Approval & Payment", desc: "Once approved, you'll receive payment instructions directly on your portal dashboard." },
            { num: "04", title: "Acknowledgement", desc: "After confirming your payment, we issue an official acknowledgement and proceed with your full application." },
          ].map((step) => (
            <div key={step.num} className="flex gap-8 items-start py-8 border-b last:border-b-0" style={{ borderColor: GOLD_FAINT }}>
              <span className="text-4xl font-bold shrink-0" style={{ color: "rgba(162,137,89,0.2)" }}>{step.num}</span>
              <div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: GOLD }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: GOLD_DIM }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center px-6" style={{ background: "rgba(0,0,0,0.3)" }}>
        <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: GOLD }}>Ready to begin?</h2>
        <p className="mb-10 text-base" style={{ color: GOLD_DIM }}>
          Create your free account and start your Hong Kong student visa application today.
        </p>
        <Link
          href="/sign-up"
          className="inline-block px-10 py-4 rounded-full text-base font-semibold transition-all hover:scale-105 hover:opacity-90 shadow-xl"
          style={{ background: GOLD, color: BG }}
        >
          Get Started — It's Free
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 text-center border-t" style={{ borderColor: GOLD_FAINT }}>
        <img src="/harrowgate-logo.png" alt="HARROWGATE" className="h-10 object-contain mx-auto mb-4 opacity-50" />
        <p className="text-xs" style={{ color: "rgba(162,137,89,0.35)" }}>
          © {new Date().getFullYear()} HARROWGATE Consultancy, Hong Kong. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
