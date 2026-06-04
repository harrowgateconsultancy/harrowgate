import { useRef, useState, useEffect, useCallback } from "react";

const BG = "#0b2213";
const GOLD = "#a28959";

const TERMS_TEXT = `IMPORTANT DISCLAIMER

Harrowgate Consultancy is an EDUCATION CONSULTANCY ONLY. We are NOT a licensed immigration service provider under the Immigration Service Providers (Regulation) Ordinance (Cap. 658) of Hong Kong. We do NOT provide immigration advice, immigration services, or act as a representative in any immigration matter. Nothing in these Terms or our services constitutes immigration advice.

If you require immigration advice or wish to engage a licensed immigration service provider, please consult a provider registered with the Immigration Service Providers Board (www.ispb.gov.hk).

────────────────────────────────────────

1. DEFINITIONS

"Harrowgate" / "We" / "Us" means Harrowgate Consultancy Limited, a company incorporated in Hong Kong.
"Student" / "You" / "User" means the individual engaging our services for overseas education placement.
"Institution" means any university, college, or educational provider outside Hong Kong.
"Service Fee" means the consultancy fee payable to Harrowgate as specified in your quotation.

2. SCOPE OF SERVICES

Harrowgate provides education consultancy and administrative support services including, but not limited to:
• University and course selection guidance
• Application processing and document preparation assistance
• Career guidance and counselling for students
• General information about student administrative requirements (NOT immigration advice)
• Pre-departure briefing and orientation support

We do NOT provide:
• Immigration advice of any kind
• Legal advice
• Representation before any immigration authority

Exclusions: Our Service Fee does NOT include:
• Airfare or flight tickets
• Accommodation costs
• Living expenses
• Health insurance premiums
• Any fees payable directly to the Institution

3. FEE STRUCTURE AND PAYMENT

3.1 First Semester Fee Arrangement
The Service Fee covers tuition and related charges for the FIRST SEMESTER ONLY. All fees for subsequent semesters must be paid DIRECTLY BY THE STUDENT TO THE INSTITUTION in accordance with the Institution's payment schedule.

3.2 Payment to Harrowgate
The full Service Fee must be remitted to Harrowgate Consultancy via the payment methods specified in your invoice. A valid receipt issued by Harrowgate must be obtained and retained as proof of payment. No application will be processed without receipt verification.

3.3 Currency
All fees are quoted and payable in Hong Kong Dollars (HKD) unless otherwise stated.

4. REFUND POLICY

4.1 Subject to Institution Policy
All refunds of tuition fees, deposits, or other charges paid to or through Harrowgate are STRICTLY SUBJECT TO THE OFFICIAL REFUND POLICY OF THE RELEVANT INSTITUTION. Harrowgate acts solely as an intermediary and has no authority to override or amend Institution refund decisions.

4.2 Consultancy Fee Non-Refundable
The Service Fee paid to Harrowgate is NON-REFUNDABLE except where:
• Harrowgate fails to submit the application through demonstrable negligence; or
• The Institution formally rejects the application and the Institution's policy provides for refund of tuition deposit.

4.3 Processing Time
Refund processing from Institutions typically takes 60 to 90 business days from the date of formal withdrawal or rejection. Harrowgate will facilitate but does not guarantee processing timelines.

5. PERSONAL DATA COLLECTION AND PRIVACY

5.1 Data Collection
By engaging our services, you consent to the collection, processing, and recording of your personal data including:
• Identity documents (passport, HKID)
• Academic records and transcripts
• Contact information and residential address
• Financial information for payment processing
• Any other data required by Institutions or immigration authorities

5.2 Purpose of Processing
Your personal data will be used for:
• Processing university applications
• Communicating with Institutions and relevant authorities
• Internal record-keeping and service improvement
• Compliance with legal and regulatory obligations

5.3 Data Retention
Personal data will be retained for SEVEN (7) YEARS from the completion of services or as required by applicable law, whichever is longer.

5.4 Third-Party Disclosure
We may disclose your personal data to:
• The Institution(s) to which you apply
• Government authorities (immigration, education departments)
• Payment processors and financial institutions
• Legal and regulatory bodies as required by law

6. LIMITATION OF LIABILITY

6.1 No Liability for Personal Data Incidents
To the fullest extent permitted by the Personal Data (Privacy) Ordinance (Cap. 486) and other applicable Hong Kong law, Harrowgate Consultancy SHALL NOT BE LIABLE for any damage, loss, or harm suffered by the Student arising from:
• Unauthorized access to personal data by third parties
• Data breaches occurring at the Institution or government level
• Loss of data due to circumstances beyond our reasonable control

6.2 No Guarantee of Admission
Harrowgate does not guarantee acceptance by any Institution. Admission decisions rest solely with the Institution.

6.3 No Liability for Institutional Actions
We are not liable for:
• Changes to Institution courses, fees, or policies
• Visa refusals by foreign governments
• Disruption to travel or study caused by geopolitical events, pandemics, or force majeure

6.4 Cap on Liability
Our total liability under these Terms shall not exceed the Service Fee paid by the Student.

7. STUDENT OBLIGATIONS

You agree to:
• Provide accurate, complete, and truthful information
• Submit all required documents within specified deadlines
• Comply with all applicable laws of Hong Kong and the destination country
• Notify Harrowgate promptly of any changes to your circumstances

8. GOVERNING LAW AND JURISDICTION

These Terms are governed by the laws of the Hong Kong Special Administrative Region. Any dispute arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Hong Kong.

9. AMENDMENTS

Harrowgate reserves the right to amend these Terms at any time. Material changes will be notified via email or website update. Continued use of our services constitutes acceptance of revised Terms.

10. SEVERABILITY

If any provision of these Terms is held invalid or unenforceable under Hong Kong law, the remaining provisions shall continue in full force.`;

type Props = {
  submissionId: number;
  studentName: string;
  authHeaders: () => Promise<Record<string, string>>;
  onAccepted: () => void;
};

export default function TermsModal({ submissionId, studentName, authHeaders, onAccepted }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [checked, setChecked] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 30) {
      setScrolledToBottom(true);
    }
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDrawing(true);
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    lastPos.current = pos;
    setHasSigned(true);
  };

  const stopDraw = () => {
    setDrawing(false);
    lastPos.current = null;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const handleSubmit = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSigned || !checked) return;
    setSubmitting(true);
    setError(null);
    try {
      const signatureData = canvas.toDataURL("image/png");
      const hdrs = await authHeaders();
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${window.location.origin}${BASE}/api/student/submissions/${submissionId}/accept-terms`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...hdrs },
        credentials: "include",
        body: JSON.stringify({ signatureData }),
      });
      if (!res.ok) throw new Error("Failed");
      onAccepted();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const canConfirm = scrolledToBottom && checked && hasSigned && !submitting;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <div style={{
        background: "#0d1f12",
        border: `1px solid rgba(162,137,89,0.3)`,
        borderRadius: 20,
        width: "100%", maxWidth: 680,
        maxHeight: "calc(100vh - 32px)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(162,137,89,0.15)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(162,137,89,0.12)", color: GOLD, flexShrink: 0,
            }}>
              <svg viewBox="0 0 20 20" fill="currentColor" width={18} height={18}>
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p style={{ color: GOLD, fontWeight: 700, fontSize: 15, margin: 0 }}>Terms &amp; Conditions</p>
              <p style={{ color: "rgba(162,137,89,0.5)", fontSize: 12, margin: 0 }}>Please read carefully before your first payment</p>
            </div>
          </div>
        </div>

        {/* Scrollable T&C text */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            flex: "1 1 auto",
            overflowY: "auto",
            padding: "20px 24px",
            minHeight: 0,
          }}
        >
          {!scrolledToBottom && (
            <div style={{
              position: "sticky", top: 0, zIndex: 10,
              background: "linear-gradient(to bottom, #0d1f12 60%, transparent)",
              paddingBottom: 8, marginBottom: -8,
            }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(162,137,89,0.1)", border: "1px solid rgba(162,137,89,0.2)",
                borderRadius: 20, padding: "4px 12px", fontSize: 11,
                color: "rgba(162,137,89,0.7)",
              }}>
                <svg viewBox="0 0 16 16" fill="currentColor" width={10} height={10}>
                  <path fillRule="evenodd" d="M8 1a.75.75 0 01.75.75v6.19l1.72-1.72a.75.75 0 111.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 111.06-1.06l1.72 1.72V1.75A.75.75 0 018 1zM1.5 11.75a.75.75 0 011.5 0v1.5a.25.25 0 00.25.25h9.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 0112.75 15h-9.5A1.75 1.75 0 011.5 13.25v-1.5z" clipRule="evenodd" />
                </svg>
                Scroll down to read all terms
              </div>
            </div>
          )}

          <div style={{ whiteSpace: "pre-wrap", fontSize: 12.5, lineHeight: 1.75, color: "rgba(162,137,89,0.7)" }}>
            <div style={{
              fontWeight: 700, fontSize: 15, color: GOLD,
              textAlign: "center", marginBottom: 20,
              letterSpacing: "0.08em",
            }}>
              HARROWGATE CONSULTANCY LIMITED<br />
              <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(162,137,89,0.6)" }}>
                Terms and Conditions of Service
              </span>
            </div>
            {TERMS_TEXT}
          </div>
        </div>

        {/* Checkbox + Signature section */}
        <div style={{ padding: "16px 24px 20px", borderTop: "1px solid rgba(162,137,89,0.15)", flexShrink: 0 }}>
          {/* Checkbox */}
          <label style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            cursor: scrolledToBottom ? "pointer" : "not-allowed",
            opacity: scrolledToBottom ? 1 : 0.4,
            marginBottom: 16,
          }}>
            <div
              onClick={() => scrolledToBottom && setChecked(v => !v)}
              style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                border: `2px solid ${checked ? GOLD : "rgba(162,137,89,0.35)"}`,
                background: checked ? GOLD : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s", cursor: scrolledToBottom ? "pointer" : "not-allowed",
              }}
            >
              {checked && (
                <svg viewBox="0 0 12 10" fill="none" width={10} height={10}>
                  <path d="M1 5l3.5 3.5L11 1" stroke="#0b2213" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span style={{ fontSize: 13, color: "rgba(162,137,89,0.8)", lineHeight: 1.5 }}>
              I, <strong style={{ color: GOLD }}>{studentName}</strong>, have read and fully understood the above Terms and Conditions and agree to be bound by them.
            </span>
          </label>

          {/* Signature pad */}
          {checked && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <p style={{ fontSize: 12, color: "rgba(162,137,89,0.6)", margin: 0 }}>
                  Sign below to confirm:
                </p>
                <button
                  onClick={clearSignature}
                  style={{
                    fontSize: 11, color: "rgba(162,137,89,0.5)", background: "transparent",
                    border: "1px solid rgba(162,137,89,0.2)", borderRadius: 6,
                    padding: "2px 10px", cursor: "pointer",
                  }}
                >
                  Clear
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={600}
                height={120}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
                style={{
                  width: "100%", height: 120,
                  border: `1.5px dashed ${hasSigned ? "rgba(162,137,89,0.5)" : "rgba(162,137,89,0.25)"}`,
                  borderRadius: 10,
                  background: "rgba(162,137,89,0.04)",
                  cursor: "crosshair",
                  touchAction: "none",
                  display: "block",
                }}
              />
              {!hasSigned && (
                <p style={{ fontSize: 11, color: "rgba(162,137,89,0.35)", marginTop: 6, textAlign: "center" }}>
                  Draw your signature above using your mouse or finger
                </p>
              )}
            </div>
          )}

          {error && (
            <p style={{ fontSize: 12, color: "#f87171", marginBottom: 10 }}>{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canConfirm}
            style={{
              width: "100%", padding: "13px 0",
              borderRadius: 12, border: "none",
              background: canConfirm ? GOLD : "rgba(162,137,89,0.15)",
              color: canConfirm ? BG : "rgba(162,137,89,0.3)",
              fontSize: 14, fontWeight: 700,
              cursor: canConfirm ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
          >
            {submitting ? "Saving…" : "Confirm & Proceed to Payment"}
          </button>

          {!scrolledToBottom && (
            <p style={{ fontSize: 11, color: "rgba(162,137,89,0.35)", textAlign: "center", marginTop: 8 }}>
              Please scroll through all the terms above to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
