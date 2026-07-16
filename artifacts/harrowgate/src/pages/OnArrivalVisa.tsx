import { useState, useEffect } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const GOLD = "#c4a96e";
const GOLD_DARK = "#a28959";
const NAVY = "#0b2213";
const NAVY2 = "#0f2d18";

// ── helpers ──────────────────────────────────────────────────────────────────
function apiBase() { return `${window.location.origin}${BASE}`; }

function Field({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold" style={{ color: NAVY }}>
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs" style={{ color: "#6b7280" }}>{hint}</p>}
    </div>
  );
}

const INPUT_CLS = "px-3 py-2.5 rounded-xl border text-sm outline-none transition-all w-full bg-gray-50 focus:bg-white";
const INPUT_STYLE = { borderColor: "#d1d5db", color: NAVY };
const INPUT_FOCUS = {
  borderColor: GOLD,
  boxShadow: `0 0 0 3px rgba(196,169,110,0.18)`,
};

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { gold?: boolean }) {
  const [focused, setFocused] = useState(false);
  const { gold: _g, ...rest } = props;
  return (
    <input
      {...rest}
      className={INPUT_CLS}
      style={{ ...INPUT_STYLE, ...(focused ? INPUT_FOCUS : {}) }}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      className={INPUT_CLS}
      style={{ ...INPUT_STYLE, ...(focused ? INPUT_FOCUS : {}) }}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      {...props}
      rows={3}
      className={INPUT_CLS + " resize-y"}
      style={{ ...INPUT_STYLE, ...(focused ? INPUT_FOCUS : {}) }}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
    />
  );
}

// ── types ─────────────────────────────────────────────────────────────────────
type FormData = {
  fullName: string; dob: string; gender: string; nationality: string;
  passportNo: string; passportExpiry: string; issueCountry: string;
  arrivalDate: string; departureDate: string; flightNo: string;
  hotel: string; hkAddress: string; company: string; businessAddress: string;
  phone: string; email: string; purpose: string; firstTime: string; comments: string;
};

const EMPTY: FormData = {
  fullName: "", dob: "", gender: "", nationality: "",
  passportNo: "", passportExpiry: "", issueCountry: "",
  arrivalDate: "", departureDate: "", flightNo: "",
  hotel: "", hkAddress: "", company: "", businessAddress: "",
  phone: "", email: "", purpose: "", firstTime: "Yes", comments: "",
};

type FileState = { passport: File | null; photo: File | null; hotel: File | null; business: File | null };

// ── main component ─────────────────────────────────────────────────────────────
export default function OnArrivalVisa() {
  const [isLive, setIsLive] = useState<boolean | null>(null);
  const [price, setPrice] = useState<number>(1000);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [files, setFiles] = useState<FileState>({ passport: null, photo: null, hotel: null, business: null });
  const [errors, setErrors] = useState<Partial<FormData & { passportFile: string; photoFile: string; hotelFile: string }>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [appId, setAppId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiBase()}/api/settings/on-arrival`)
      .then(r => r.json())
      .then(d => {
        setIsLive(d.live ?? false);
        if (typeof d.price === "number") setPrice(d.price);
      })
      .catch(() => setIsLive(false));
  }, []);

  function set(k: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
  }

  function validateStep(s: number): boolean {
    const e: typeof errors = {};
    if (s === 1) {
      if (!form.fullName.trim()) e.fullName = "Required";
      if (!form.dob) e.dob = "Required";
      if (!form.gender) e.gender = "Required";
      if (!form.nationality.trim()) e.nationality = "Required";
      if (!form.passportNo.trim()) e.passportNo = "Required";
      if (!form.passportExpiry) e.passportExpiry = "Required";
      if (!form.issueCountry.trim()) e.issueCountry = "Required";
    }
    if (s === 2) {
      if (!form.arrivalDate) e.arrivalDate = "Required";
      if (!form.departureDate) e.departureDate = "Required";
      else if (form.arrivalDate && new Date(form.arrivalDate) >= new Date(form.departureDate))
        e.departureDate = "Must be after arrival";
      if (!form.hotel.trim()) e.hotel = "Required";
      if (!form.hkAddress.trim()) e.hkAddress = "Required";
    }
    if (s === 3) {
      if (!form.company.trim()) e.company = "Required";
      if (!form.phone.trim()) e.phone = "Required";
      if (!form.email.trim()) e.email = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
      if (!form.purpose) e.purpose = "Required";
    }
    if (s === 4) {
      if (!files.passport) e.passportFile = "Required";
      if (!files.photo) e.photoFile = "Required";
      if (!files.hotel) e.hotelFile = "Required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validateStep(step)) return;
    setStep(s => Math.min(s + 1, 5));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function prev() {
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("formData", JSON.stringify(form));
      if (files.passport) fd.append("passport", files.passport);
      if (files.photo)    fd.append("photo",    files.photo);
      if (files.hotel)    fd.append("hotel",    files.hotel);
      if (files.business) fd.append("business", files.business);

      const res = await fetch(`${apiBase()}/api/on-arrival/submit`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Server error (${res.status})`);
      }
      const data = await res.json();
      setAppId(data.id ?? null);
      setSubmitError(null);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setSubmitError(err?.message || "Submission failed — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── loading ──
  if (isLive === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY2} 100%)` }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
      </div>
    );
  }

  // ── offline ──
  if (!isLive) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #163524 100%)` }}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(196,169,110,0.15)", border: `1px solid rgba(196,169,110,0.3)` }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: GOLD }}>Page Not Available</h1>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(196,169,110,0.65)" }}>
            The On-Arrival Visa Portal is currently offline. Please check back later or contact Harrowgate Consultancy for assistance.
          </p>
          <a href={`${BASE}/`} className="inline-block mt-6 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: "rgba(196,169,110,0.15)", color: GOLD, border: `1px solid rgba(196,169,110,0.25)` }}>
            ← Back to Home
          </a>
        </div>
      </div>
    );
  }

  // ── success ──
  if (submitted) {
    const refNo = appId
      ? `HG-OAV-${String(appId).padStart(6, "0")}`
      : `HG-OAV-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #163524 100%)` }}>
        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
          {/* Green top bar */}
          <div className="h-2 w-full" style={{ background: "linear-gradient(90deg, #10b981, #059669)" }} />

          <div className="p-8 sm:p-10 text-center">
            {/* Tick */}
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: "rgba(16,185,129,0.1)", border: "2px solid rgba(16,185,129,0.25)" }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold mb-1" style={{ color: NAVY }}>Application Submitted!</h2>
            <p className="text-sm mb-6" style={{ color: "#6b7280" }}>
              Thank you, <strong style={{ color: NAVY }}>{form.fullName}</strong>. We have received your application.
            </p>

            {/* Reference number — prominent */}
            <div className="rounded-2xl px-6 py-5 mb-6 text-center"
              style={{ background: `linear-gradient(135deg, rgba(196,169,110,0.12) 0%, rgba(162,137,89,0.06) 100%)`, border: `1.5px solid rgba(196,169,110,0.35)` }}>
              <p className="text-xs font-semibold tracking-[0.22em] uppercase mb-2" style={{ color: "rgba(162,137,89,0.7)" }}>
                Your Reference Number
              </p>
              <p className="text-2xl font-bold tracking-widest" style={{ color: NAVY, fontVariantNumeric: "tabular-nums" }}>
                {refNo}
              </p>
              <p className="text-xs mt-2" style={{ color: "#9ca3af" }}>
                Please keep this number for your records
              </p>
            </div>

            {/* Contact message */}
            <div className="rounded-xl px-4 py-3.5 mb-6 text-sm text-left"
              style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <p style={{ color: "#065f46" }}>
                <strong>HARROWGATE Consultancy</strong> will review your documents and contact you at{" "}
                <strong>{form.email}</strong> within <strong>1–2 business days</strong>.
              </p>
            </div>

            {/* Summary */}
            <div className="rounded-xl p-4 text-left mb-7 space-y-2" style={{ background: "#f9fafb", borderLeft: `4px solid ${GOLD}` }}>
              <p className="text-xs font-semibold mb-1" style={{ color: NAVY }}>Application Summary</p>
              {([
                ["Passport No.", form.passportNo],
                ["Arrival Date", form.arrivalDate],
                ["Departure Date", form.departureDate],
                ["Company", form.company],
                ["Phone", form.phone],
              ] as [string, string][]).map(([k, v]) => v ? (
                <div key={k} className="flex justify-between text-xs">
                  <span style={{ color: "#6b7280" }}>{k}</span>
                  <span className="font-medium" style={{ color: NAVY }}>{v}</span>
                </div>
              ) : null)}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href={`${BASE}/`}
                className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-80 text-center"
                style={{ background: "#f3f4f6", color: NAVY, border: "1px solid #e5e7eb" }}>
                ← Back to Home
              </a>
              <button onClick={() => { setSubmitted(false); setForm(EMPTY); setStep(1); setAppId(null); setFiles({ passport: null, photo: null, hotel: null, business: null }); }}
                className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: NAVY, color: "#f0d28c" }}>
                Submit Another Application
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const STEPS = ["Personal", "Travel", "Business", "Documents", "Review"];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #163524 100%)` }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-6 pb-6 text-center border-b" style={{ borderColor: "#e5e7eb" }}>
          {/* Back link */}
          <div className="flex justify-start mb-4">
            <a href={`${BASE}/`}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all hover:opacity-70"
              style={{ color: "#6b7280", background: "#f3f4f6", border: "1px solid #e5e7eb" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Back to Home
            </a>
          </div>
          <span className="inline-block text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-3"
            style={{ background: "rgba(196,169,110,0.12)", color: GOLD_DARK, border: `1px solid rgba(196,169,110,0.25)` }}>
            ✦ Hong Kong Trade Fair 2026
          </span>
          <h1 className="text-2xl font-bold mb-1" style={{ color: NAVY }}>On-Arrival Visa Portal</h1>
          <p className="text-sm mb-4" style={{ color: "#4b5563" }}>
            Secure your entry for the Jewellery &amp; Gem Fair · September 14–18, 2026
          </p>
          {/* Pricing badge */}
          <div className="inline-flex items-center gap-3 rounded-2xl px-5 py-3"
            style={{ background: "linear-gradient(135deg, rgba(196,169,110,0.12) 0%, rgba(162,137,89,0.06) 100%)", border: "1.5px solid rgba(196,169,110,0.3)" }}>
            <div className="text-left">
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: "rgba(162,137,89,0.65)" }}>Service Fee</p>
              <p className="text-xl font-bold leading-none" style={{ color: NAVY }}>
                HKD {price.toLocaleString()}
              </p>
            </div>
            <div className="w-px self-stretch" style={{ background: "rgba(196,169,110,0.2)" }} />
            <p className="text-xs text-left max-w-[160px] leading-snug" style={{ color: "#4b5563" }}>
              Complete document preparation &amp; visa assistance
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="px-8 pt-6 pb-2">
          <div className="flex items-start justify-between relative">
            <div className="absolute top-[17px] left-8 right-8 h-0.5" style={{ background: "#e5e7eb" }} />
            {STEPS.map((label, i) => {
              const n = i + 1;
              const isActive = n === step;
              const isDone = n < step;
              return (
                <div key={n} className="flex flex-col items-center z-10 flex-1">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all"
                    style={{
                      background: isDone ? "#10b981" : isActive ? GOLD : "#e5e7eb",
                      color: isDone ? "white" : isActive ? NAVY : "#6b7280",
                      borderColor: isDone ? "#10b981" : isActive ? GOLD : "white",
                      boxShadow: isActive ? `0 0 0 3px rgba(196,169,110,0.2)` : "none",
                    }}>
                    {isDone ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : n}
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider mt-1.5"
                    style={{ color: isActive ? NAVY : "#9ca3af" }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <div className="px-8 py-6">
          {/* Step 1 — Personal */}
          {step === 1 && (
            <div className="space-y-4">
              <SectionTitle icon="👤" title="Personal Information" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label="Full Name (as in Passport)" required>
                    <Input value={form.fullName} onChange={set("fullName")} placeholder="e.g. Rajesh Kumar Sharma" />
                    {errors.fullName && <ErrMsg msg={errors.fullName} />}
                  </Field>
                </div>
                <Field label="Date of Birth" required>
                  <Input type="date" value={form.dob} onChange={set("dob")} />
                  {errors.dob && <ErrMsg msg={errors.dob} />}
                </Field>
                <Field label="Gender" required>
                  <Select value={form.gender} onChange={set("gender")}>
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </Select>
                  {errors.gender && <ErrMsg msg={errors.gender} />}
                </Field>
                <Field label="Nationality" required>
                  <Input value={form.nationality} onChange={set("nationality")} placeholder="e.g. Indian" />
                  {errors.nationality && <ErrMsg msg={errors.nationality} />}
                </Field>
                <Field label="Passport Number" required>
                  <Input value={form.passportNo} onChange={set("passportNo")} placeholder="e.g. Z1234567" />
                  {errors.passportNo && <ErrMsg msg={errors.passportNo} />}
                </Field>
                <Field label="Passport Expiry Date" required>
                  <Input type="date" value={form.passportExpiry} onChange={set("passportExpiry")} />
                  {errors.passportExpiry && <ErrMsg msg={errors.passportExpiry} />}
                </Field>
                <Field label="Country of Issue" required>
                  <Input value={form.issueCountry} onChange={set("issueCountry")} placeholder="e.g. India" />
                  {errors.issueCountry && <ErrMsg msg={errors.issueCountry} />}
                </Field>
                <Field label="Phone (with Country Code)" required>
                  <Input type="tel" value={form.phone} onChange={set("phone")} placeholder="e.g. +91 98765 43210" />
                  {errors.phone && <ErrMsg msg={errors.phone} />}
                </Field>
                <Field label="Email Address" required>
                  <Input type="email" value={form.email} onChange={set("email")} placeholder="you@company.com" />
                  {errors.email && <ErrMsg msg={errors.email} />}
                </Field>
              </div>
            </div>
          )}

          {/* Step 2 — Travel */}
          {step === 2 && (
            <div className="space-y-4">
              <SectionTitle icon="✈️" title="Travel Itinerary" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label="Intended Date of Arrival in Hong Kong" required>
                    <Input type="date" value={form.arrivalDate} onChange={set("arrivalDate")} />
                    {errors.arrivalDate && <ErrMsg msg={errors.arrivalDate} />}
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Intended Date of Departure" required>
                    <Input type="date" value={form.departureDate} onChange={set("departureDate")} />
                    {errors.departureDate && <ErrMsg msg={errors.departureDate} />}
                  </Field>
                </div>
                <Field label="Flight Number (Arrival)">
                  <Input value={form.flightNo} onChange={set("flightNo")} placeholder="e.g. CX 694" />
                </Field>
                <Field label="Hotel / Accommodation" required>
                  <Input value={form.hotel} onChange={set("hotel")} placeholder="e.g. Regal Kowloon Hotel" />
                  {errors.hotel && <ErrMsg msg={errors.hotel} />}
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Full Address in Hong Kong" required>
                    <Input value={form.hkAddress} onChange={set("hkAddress")} placeholder="e.g. 71 Mody Road, Tsim Sha Tsui" />
                    {errors.hkAddress && <ErrMsg msg={errors.hkAddress} />}
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Business */}
          {step === 3 && (
            <div className="space-y-4">
              <SectionTitle icon="💼" title="Business & Fair Details" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label="Company / Business Name" required>
                    <Input value={form.company} onChange={set("company")} placeholder="e.g. Global Gems Pvt Ltd" />
                    {errors.company && <ErrMsg msg={errors.company} />}
                  </Field>
                </div>
                <Field label="Business Address">
                  <Input value={form.businessAddress} onChange={set("businessAddress")} placeholder="e.g. Mumbai, India" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Purpose of Visit" required>
                    <Select value={form.purpose} onChange={set("purpose")}>
                      <option value="">Select Purpose</option>
                      <option>Attending Jewellery &amp; Gem Fair as Visitor</option>
                      <option>Exhibiting at Jewellery &amp; Gem Fair</option>
                      <option>Business Negotiations with Suppliers</option>
                      <option>Product Sourcing for Retail</option>
                      <option>Other Business Activity</option>
                    </Select>
                    {errors.purpose && <ErrMsg msg={errors.purpose} />}
                  </Field>
                </div>
                <Field label="First-time visitor to this fair?">
                  <Select value={form.firstTime} onChange={set("firstTime")}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </Select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Additional comments or special requests">
                    <Textarea value={form.comments} onChange={set("comments")} placeholder="e.g. Need assistance with hotel booking or local transport..." />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Documents */}
          {step === 4 && (
            <div className="space-y-4">
              <SectionTitle icon="📄" title="Document Upload" />
              <p className="text-sm" style={{ color: "#4b5563" }}>
                Upload clear, colour scans of the following documents. We will verify and submit them on your behalf.
              </p>
              <div className="space-y-4">
                <UploadBox
                  label="1. Passport Bio-Page" required
                  icon="🪪" accept=".pdf,.jpg,.jpeg,.png"
                  file={files.passport}
                  error={errors.passportFile}
                  onChange={f => setFiles(s => ({ ...s, passport: f }))}
                />
                <UploadBox
                  label="2. Recent Passport-size Photo (White background)" required
                  icon="📷" accept=".jpg,.jpeg,.png"
                  file={files.photo}
                  error={errors.photoFile}
                  onChange={f => setFiles(s => ({ ...s, photo: f }))}
                />
                <UploadBox
                  label="3. Hotel Booking Confirmation" required
                  icon="🏨" accept=".pdf,.jpg,.jpeg,.png"
                  file={files.hotel}
                  error={errors.hotelFile}
                  onChange={f => setFiles(s => ({ ...s, hotel: f }))}
                />
                <UploadBox
                  label="4. Business Card or Company Letterhead (Optional)"
                  icon="🏢" accept=".pdf,.jpg,.jpeg,.png"
                  file={files.business}
                  onChange={f => setFiles(s => ({ ...s, business: f }))}
                />
              </div>
            </div>
          )}

          {/* Step 5 — Review */}
          {step === 5 && (
            <div className="space-y-4">
              <SectionTitle icon="✅" title="Review Your Application" />
              <p className="text-sm" style={{ color: "#4b5563" }}>Please verify all details are correct before submitting.</p>
              <div className="space-y-2">
                {([
                  ["Full Name", form.fullName], ["Date of Birth", form.dob], ["Gender", form.gender],
                  ["Nationality", form.nationality], ["Passport No.", form.passportNo],
                  ["Passport Expiry", form.passportExpiry], ["Country of Issue", form.issueCountry],
                  ["Arrival Date", form.arrivalDate], ["Departure Date", form.departureDate],
                  ["Flight No.", form.flightNo || "—"], ["Hotel", form.hotel], ["HK Address", form.hkAddress],
                  ["Company", form.company], ["Business Address", form.businessAddress || "—"],
                  ["Phone", form.phone], ["Email", form.email], ["Purpose", form.purpose],
                  ["First-time Visitor", form.firstTime], ["Comments", form.comments || "—"],
                  ["Passport Bio-Page", files.passport?.name || "—"],
                  ["Passport Photo", files.photo?.name || "—"],
                  ["Hotel Booking", files.hotel?.name || "—"],
                  ["Business Card", files.business?.name || "—"],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="flex justify-between items-start gap-4 px-4 py-2.5 rounded-xl"
                    style={{ background: "#f9fafb", borderLeft: `3px solid ${GOLD}` }}>
                    <span className="text-xs font-semibold shrink-0" style={{ color: NAVY }}>{k}</span>
                    <span className="text-xs text-right break-all" style={{ color: "#4b5563" }}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl p-4 mt-2" style={{ background: "rgba(196,169,110,0.08)", border: `1px solid rgba(196,169,110,0.25)` }}>
                <p className="text-xs leading-relaxed" style={{ color: NAVY }}>
                  <strong>ℹ Declaration:</strong> I confirm that all information provided is true and accurate.
                  I understand that visa approval is at the sole discretion of the Hong Kong Immigration Department.
                </p>
              </div>
            </div>
          )}

          {/* Submit error */}
          {submitError && step === 5 && (
            <div className="flex items-start gap-3 rounded-xl px-4 py-3.5 mt-6"
              style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" strokeLinecap="round" />
              </svg>
              <p className="text-sm font-medium" style={{ color: "#b91c1c" }}>{submitError}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button onClick={prev}
                className="px-5 py-2.5 rounded-full text-sm font-semibold border transition-all hover:bg-gray-50"
                style={{ borderColor: "#d1d5db", color: "#374151" }}>
                ← Back
              </button>
            )}
            {step < 5 && (
              <button onClick={next}
                className="ml-auto px-6 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: NAVY, color: "#f0d28c" }}>
                Next →
              </button>
            )}
            {step === 5 && (
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 py-3 rounded-full text-base font-bold transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: GOLD, color: NAVY }}>
                {submitting ? (
                  <><span className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: NAVY, borderTopColor: "transparent" }} /> Submitting…</>
                ) : "✦ Submit Application"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <h3 className="text-base font-bold flex items-center gap-2 mb-1" style={{ color: NAVY }}>
      <span>{icon}</span>{title}
    </h3>
  );
}

function ErrMsg({ msg }: { msg: string }) {
  return <p className="text-xs mt-0.5 text-red-500">{msg}</p>;
}

function UploadBox({
  label, required, icon, accept, file, error, onChange,
}: {
  label: string; required?: boolean; icon: string; accept: string;
  file: File | null; error?: string; onChange: (f: File | null) => void;
}) {
  const id = `upload-${label.replace(/\s+/g, "-")}`;
  return (
    <div>
      <p className="text-sm font-semibold mb-1.5" style={{ color: NAVY }}>
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </p>
      <label htmlFor={id}
        className="flex flex-col items-center gap-2 border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all"
        style={{ borderColor: file ? "#10b981" : error ? "#ef4444" : "#d1d5db", background: file ? "rgba(16,185,129,0.04)" : "#f9fafb" }}>
        <span className="text-2xl">{file ? "✅" : icon}</span>
        <span className="text-xs text-center" style={{ color: file ? "#10b981" : "#6b7280" }}>
          {file ? file.name : "Click to upload or drag & drop"}
        </span>
        <input id={id} type="file" accept={accept} className="hidden"
          onChange={e => onChange(e.target.files?.[0] ?? null)} />
      </label>
      {error && <p className="text-xs mt-1 text-red-500">{error}</p>}
    </div>
  );
}
