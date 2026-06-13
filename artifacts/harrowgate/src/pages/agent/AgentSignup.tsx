import { useState, useRef } from "react";
import { Link } from "wouter";

const GOLD = "#a28959";
const BG = "#071a10";
const CARD_BG = "#0c2217";
const BORDER = "rgba(162,137,89,0.25)";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function uploadFile(file: File): Promise<string> {
  const resp = await fetch(`${BASE}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "application/octet-stream" }),
  });
  if (!resp.ok) throw new Error("Upload URL request failed");
  const { uploadURL, objectPath } = await resp.json();
  const put = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!put.ok) throw new Error("File upload failed");
  return objectPath as string;
}

interface FileState {
  file: File | null;
  name: string;
}

export default function AgentSignup() {
  const [companyName, setCompanyName] = useState("");
  const [bizReg, setBizReg] = useState<FileState>({ file: null, name: "" });
  const [contactName, setContactName] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [whatsapp, setWhatsapp] = useState(false);
  const [idDoc, setIdDoc] = useState<FileState>({ file: null, name: "" });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const bizRef = useRef<HTMLInputElement>(null);
  const idRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!companyName || !contactName || !officeAddress || !email || !contactNumber || !username || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      let bizRegUrl = "";
      let bizRegName = "";
      if (bizReg.file) {
        bizRegUrl = await uploadFile(bizReg.file);
        bizRegName = bizReg.file.name;
      }
      let idDocUrl = "";
      let idDocName = "";
      if (idDoc.file) {
        idDocUrl = await uploadFile(idDoc.file);
        idDocName = idDoc.file.name;
      }

      const res = await fetch(`${BASE}/api/agents/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          companyName,
          businessRegUrl: bizRegUrl,
          businessRegName: bizRegName,
          contactName,
          officeAddress,
          email,
          contactNumber,
          whatsappAvailable: whatsapp ? "yes" : "no",
          idDocUrl,
          idDocName,
        }),
      });
      if (res.status === 409) {
        setError("That username is already taken. Please choose a different one.");
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError((j as any).error || "Submission failed. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: "10px 14px",
    color: "#e8dcc8",
    fontSize: 14,
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: GOLD,
    marginBottom: 6,
    letterSpacing: "0.03em",
  };

  const questionStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "rgba(162,137,89,0.15)",
    border: `1px solid rgba(162,137,89,0.4)`,
    color: GOLD,
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
    marginTop: 2,
  };

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>📋</div>
          <h2 style={{ color: GOLD, fontSize: 26, fontWeight: 700, marginBottom: 12, fontFamily: "Georgia, serif" }}>
            Application Received
          </h2>
          <p style={{ color: "#c9b99a", fontSize: 16, lineHeight: 1.7, marginBottom: 24 }}>
            Thank you for applying to become a HARROWGATE agent. We are reviewing your application and will be in touch with you shortly.
          </p>
          <div style={{
            background: "rgba(162,137,89,0.08)",
            border: `1px solid rgba(162,137,89,0.3)`,
            borderRadius: 12,
            padding: "20px 24px",
            marginBottom: 28,
          }}>
            <p style={{ color: GOLD, fontWeight: 600, fontSize: 15, margin: 0 }}>
              ⏳ Waiting for HARROWGATE to respond
            </p>
            <p style={{ color: "#b0a080", fontSize: 13, margin: "8px 0 0", lineHeight: 1.6 }}>
              HARROWGATE will contact you soon with further instructions regarding your agent account.
            </p>
          </div>
          <Link href="/" style={{ color: GOLD, fontSize: 14, textDecoration: "none", opacity: 0.8 }}>
            ← Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#e8dcc8", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <nav style={{ borderBottom: `1px solid rgba(162,137,89,0.15)`, background: "rgba(11,34,19,0.9)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <Link href="/">
            <img src="/harrowgate-logo.png" alt="HARROWGATE" className="h-16 object-contain cursor-pointer" />
          </Link>
          <Link href="/" style={{ color: GOLD, fontSize: 14, textDecoration: "none", opacity: 0.8 }}>
            ← Back to Home
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "3rem 1.5rem 4rem" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ color: GOLD, fontSize: 30, fontWeight: 700, marginBottom: 10, fontFamily: "Georgia, serif" }}>
            Agent Registration
          </h1>
          <p style={{ color: "#9a8a6a", fontSize: 15, lineHeight: 1.6, margin: 0 }}>
            Join the HARROWGATE network. Complete the form below and our team will review your application.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Q1 Company Name */}
            <div style={{ display: "flex", gap: 14 }}>
              <div style={questionStyle}>1</div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Your Company Name <span style={{ color: "#e05" }}>*</span></label>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="e.g. Global Education Consulting Ltd."
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Q2 Business Registration */}
            <div style={{ display: "flex", gap: 14 }}>
              <div style={questionStyle}>2</div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Attach your Company Business Registration</label>
                <input
                  ref={bizRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  style={{ display: "none" }}
                  onChange={e => {
                    const f = e.target.files?.[0] || null;
                    setBizReg({ file: f, name: f?.name || "" });
                  }}
                />
                <button
                  type="button"
                  onClick={() => bizRef.current?.click()}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.03)",
                    border: `1px dashed ${bizReg.file ? GOLD : "rgba(162,137,89,0.3)"}`,
                    borderRadius: 8,
                    padding: "14px 16px",
                    color: bizReg.file ? GOLD : "#7a6a4a",
                    fontSize: 14,
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 18 }}>📎</span>
                  <span>{bizReg.name || "Click to attach file (PDF, image, or document)"}</span>
                </button>
              </div>
            </div>

            {/* Q3 Your Name */}
            <div style={{ display: "flex", gap: 14 }}>
              <div style={questionStyle}>3</div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Your Name <span style={{ color: "#e05" }}>*</span></label>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="Full name"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Q4 Office Address */}
            <div style={{ display: "flex", gap: 14 }}>
              <div style={questionStyle}>4</div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Office Address <span style={{ color: "#e05" }}>*</span></label>
                <textarea
                  style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
                  placeholder="Full office address"
                  value={officeAddress}
                  onChange={e => setOfficeAddress(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Q5 Email Address */}
            <div style={{ display: "flex", gap: 14 }}>
              <div style={questionStyle}>5</div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Email Address <span style={{ color: "#e05" }}>*</span></label>
                <input
                  style={inputStyle}
                  type="email"
                  placeholder="agent@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Q6 Contact Number + WhatsApp */}
            <div style={{ display: "flex", gap: 14 }}>
              <div style={questionStyle}>6</div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Contact Number <span style={{ color: "#e05" }}>*</span></label>
                <input
                  style={inputStyle}
                  type="tel"
                  placeholder="+852 xxxx xxxx"
                  value={contactNumber}
                  onChange={e => setContactNumber(e.target.value)}
                  required
                />
                <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={whatsapp}
                    onChange={e => setWhatsapp(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: GOLD, cursor: "pointer" }}
                  />
                  <span style={{ color: "#c9b99a", fontSize: 13 }}>
                    Is WhatsApp available on this number?
                  </span>
                </label>
              </div>
            </div>

            {/* Q7 ID Card / Passport */}
            <div style={{ display: "flex", gap: 14 }}>
              <div style={questionStyle}>7</div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>ID Card / Passport</label>
                <input
                  ref={idRef}
                  type="file"
                  accept="image/*,.pdf"
                  style={{ display: "none" }}
                  onChange={e => {
                    const f = e.target.files?.[0] || null;
                    setIdDoc({ file: f, name: f?.name || "" });
                  }}
                />
                <button
                  type="button"
                  onClick={() => idRef.current?.click()}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.03)",
                    border: `1px dashed ${idDoc.file ? GOLD : "rgba(162,137,89,0.3)"}`,
                    borderRadius: 8,
                    padding: "14px 16px",
                    color: idDoc.file ? GOLD : "#7a6a4a",
                    fontSize: 14,
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 18 }}>🪪</span>
                  <span>{idDoc.name || "Click to attach ID card or passport scan (PDF or image)"}</span>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: `1px solid rgba(162,137,89,0.15)`, paddingTop: 24 }}>
              <p style={{ color: "#9a8a6a", fontSize: 13, marginBottom: 20 }}>
                Create your agent account credentials below. You will use these to access the agent portal once approved.
              </p>

              {/* Username */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Username <span style={{ color: "#e05" }}>*</span></label>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={e => setUsername(e.target.value.replace(/\s/g, ""))}
                  required
                  autoComplete="username"
                />
              </div>

              {/* Password */}
              <div>
                <label style={labelStyle}>Password <span style={{ color: "#e05" }}>*</span></label>
                <div style={{ position: "relative" }}>
                  <input
                    style={{ ...inputStyle, paddingRight: 48 }}
                    type={showPass ? "text" : "password"}
                    placeholder="Create a password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: GOLD, cursor: "pointer", fontSize: 14 }}
                  >
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: "rgba(220,50,50,0.1)", border: "1px solid rgba(220,50,50,0.3)", borderRadius: 8, padding: "12px 16px", color: "#ff8888", fontSize: 14 }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: submitting ? "rgba(162,137,89,0.4)" : GOLD,
                color: BG,
                border: "none",
                borderRadius: 10,
                padding: "14px 0",
                fontSize: 15,
                fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
                width: "100%",
                letterSpacing: "0.04em",
                transition: "opacity 0.2s",
              }}
            >
              {submitting ? "Submitting…" : "Submit Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
