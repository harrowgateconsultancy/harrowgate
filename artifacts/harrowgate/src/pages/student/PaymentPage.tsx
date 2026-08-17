import { useState, useRef, useEffect } from "react";
import { getStudentAuthHeaders } from "../../lib/studentAuth";
import type { Submission } from "./Portal";
import TermsModal from "./TermsModal";
import { usePricing } from "../../hooks/usePricing";

const BG   = "#0b2213";
const GOLD  = "#a28959";
const GOLD_B = "#c4a96e";
const GOLD_L = "#f0d28c";
const BASE  = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }

interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  fps: string;
  additionalInfo: string;
}

interface PaymentMethods {
  alipay: { enabled: boolean; accountName: string; accountId: string; qrCodeUrl: string; instructions: string };
  card:   { enabled: boolean; paymentLink: string; instructions: string };
}
const DEFAULT_PM: PaymentMethods = {
  alipay: { enabled: false, accountName: "", accountId: "", qrCodeUrl: "", instructions: "" },
  card:   { enabled: false, paymentLink: "", instructions: "" },
};

async function uploadToStorage(file: File): Promise<{ url: string }> {
  const res = await fetch(`${getApiBase()}/api/storage/uploads/request-url`, {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!res.ok) throw new Error("Upload URL failed");
  const { uploadURL, objectPath } = await res.json();
  await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  return { url: objectPath };
}

type Props = { submission: Submission; onUpdated: () => void; paymentType?: "first" | "second" | "final" };

export default function PaymentPage({ submission, onUpdated, paymentType = "first" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [globalBankDetails, setGlobalBankDetails] = useState<BankDetails | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods>(DEFAULT_PM);
  const [selectedMethod, setSelectedMethod] = useState<"bank" | "alipay" | "card">("bank");
  const pricing = usePricing();

  useEffect(() => {
    fetch(`${getApiBase()}/api/settings/bank-details`)
      .then(r => r.json())
      .then((b: BankDetails) => setGlobalBankDetails(b))
      .catch(() => {});
    fetch(`${getApiBase()}/api/settings/payment-methods`)
      .then(r => r.json())
      .then((pm: PaymentMethods) => setPaymentMethods(pm))
      .catch(() => {});
  }, []);

  const bankDetails: BankDetails | null = (submission as any).customBankDetails?.accountNumber || (submission as any).customBankDetails?.bankName
    ? (submission as any).customBankDetails as BankDetails
    : globalBankDetails;

  const needsTerms = paymentType === "first" && !submission.termsAcceptedAt;

  const authHeaders = (): Record<string, string> => getStudentAuthHeaders();

  const isSecond = paymentType === "second";
  const isFinal  = paymentType === "final";

  const docType       = isFinal ? "final_payment_receipt" : isSecond ? "second_payment_receipt" : "payment_receipt";
  const endpoint      = isFinal ? "receipt3" : isSecond ? "receipt2" : "receipt";
  const existingReceipt = submission.documents.find(d => d.documentType === docType);
  const alreadySubmitted = isFinal
    ? (submission.status === "final_payment_received"  || submission.status === "final_payment_confirmed")
    : isSecond
    ? (submission.status === "second_payment_received" || submission.status === "second_payment_confirmed")
    : (submission.status === "payment_received"        || submission.status === "acknowledged");

  const title    = isFinal ? "Final Payment Required" : isSecond ? "2nd Service Payment" : "Service Payment";
  const subtitle = isFinal
    ? "A final payment is required to collect your official university offer letter."
    : isSecond
    ? "A second payment is required before proceeding to your university interview."
    : "Your application has been approved — please complete payment to proceed.";
  const stepNum  = isFinal ? "3rd" : isSecond ? "2nd" : "1st";

  const printDemandNote = () => {
    const logoUrl = `${window.location.origin}${BASE}/harrowgate-logo.png`;
    const date = new Date().toLocaleDateString("en-HK", { year: "numeric", month: "long", day: "numeric" });
    const paymentLabel = isFinal ? "Final Payment" : isSecond ? "2nd Service Payment" : "1st Service Payment";
    const refCode = `HG-${submission.id}-${paymentType.toUpperCase().slice(0,3)}`;

    const progType = (submission as any).programmeType as string | null | undefined;
    const allSecond = [
      { key: "masters",   label: "Master's Degree",   amount: pricing.mastersStage2 },
      { key: "bachelor",  label: "Bachelor's Degree",  amount: pricing.bachelorStage2 },
      { key: "associate", label: "Associate Degree",   amount: pricing.associateStage2 },
      { key: "diploma",   label: "Diploma",            amount: pricing.diplomaStage2 },
    ];
    const allFinal = [
      { key: "masters",   label: "Master's Degree",   amount: pricing.mastersLastPayment },
      { key: "bachelor",  label: "Bachelor's Degree",  amount: pricing.bachelorLastPayment },
      { key: "associate", label: "Associate Degree",   amount: pricing.associateLastPayment },
      { key: "diploma",   label: "Diploma",            amount: pricing.diplomaLastPayment },
    ];

    let amountHtml = "";
    if (paymentType === "first") {
      amountHtml = `
        <div class="info-row">
          <span class="info-label">Amount Due</span>
          <span class="amount-value">${pricing.firstPayment}</span>
        </div>
        <div class="info-row" style="margin-top:2px">
          <span class="info-label"></span>
          <span class="info-note">Non-refundable consultancy fee</span>
        </div>`;
    } else {
      const allTiers = paymentType === "second" ? allSecond : allFinal;
      const tiers = progType ? allTiers.filter(t => t.key === progType) : allTiers;
      if (tiers.length === 1) {
        amountHtml = `
          <div class="info-row">
            <span class="info-label">Amount Due</span>
            <span class="amount-value">${tiers[0].amount}</span>
          </div>
          <div class="info-row" style="margin-top:2px">
            <span class="info-label"></span>
            <span class="info-note">${tiers[0].label}</span>
          </div>`;
      } else {
        amountHtml = `
          <div class="info-row">
            <span class="info-label">Amount Due</span>
            <span></span>
          </div>
          <table class="tier-table">
            <thead><tr><th>Programme</th><th>Amount</th></tr></thead>
            <tbody>${tiers.map(t => `<tr><td>${t.label}</td><td>${t.amount}</td></tr>`).join("")}</tbody>
          </table>`;
      }
    }

    const bankHtml = bankDetails ? `
      ${bankDetails.bankName ? `<div class="info-row"><span class="info-label">Bank</span><span class="info-value">${bankDetails.bankName}</span></div>` : ""}
      ${bankDetails.accountName ? `<div class="info-row"><span class="info-label">Account Name</span><span class="info-value">${bankDetails.accountName}</span></div>` : ""}
      ${bankDetails.accountNumber ? `<div class="info-row"><span class="info-label">Account No.</span><span class="info-value mono">${bankDetails.accountNumber}</span></div>` : ""}
      ${bankDetails.fps ? `<div class="info-row"><span class="info-label">FPS</span><span class="info-value mono">${bankDetails.fps}</span></div>` : ""}
    ` : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Demand Note — ${paymentLabel}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Georgia', serif;
    background: #fff;
    color: #1a1a1a;
    padding: 48px 56px;
    max-width: 680px;
    margin: 0 auto;
  }
  .header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 32px;
    padding-bottom: 20px;
    border-bottom: 2px solid #a28959;
  }
  .logo {
    height: 64px;
    object-fit: contain;
    margin-bottom: 12px;
  }
  .company-name {
    font-size: 15px;
    font-weight: bold;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #6b4f22;
  }
  .doc-title {
    margin-top: 6px;
    font-size: 20px;
    font-weight: bold;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #1a1a1a;
  }
  .meta {
    display: flex;
    justify-content: space-between;
    margin-bottom: 24px;
    font-size: 12px;
    color: #555;
  }
  .to-block {
    background: #faf7f1;
    border-left: 3px solid #a28959;
    padding: 12px 16px;
    margin-bottom: 24px;
    border-radius: 0 6px 6px 0;
  }
  .to-block .to-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 4px; }
  .to-block .to-name  { font-size: 16px; font-weight: bold; color: #1a1a1a; }
  .to-block .to-ref   { font-size: 11px; color: #888; margin-top: 2px; }
  .section-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #a28959;
    font-weight: bold;
    margin: 20px 0 10px;
    padding-bottom: 4px;
    border-bottom: 1px solid #e8dfc0;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 6px 0;
    border-bottom: 1px solid #f0e8d0;
    font-size: 13px;
  }
  .info-label { color: #666; flex-shrink: 0; margin-right: 16px; }
  .info-value { font-weight: 600; color: #1a1a1a; text-align: right; }
  .info-note  { font-size: 11px; color: #999; text-align: right; }
  .amount-value {
    font-size: 22px;
    font-weight: bold;
    color: #6b4f22;
    letter-spacing: 0.02em;
  }
  .mono { font-family: 'Courier New', monospace; }
  .tier-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    font-size: 13px;
  }
  .tier-table th {
    text-align: left;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #888;
    padding: 4px 8px;
    background: #faf7f1;
  }
  .tier-table th:last-child, .tier-table td:last-child { text-align: right; }
  .tier-table td {
    padding: 6px 8px;
    border-bottom: 1px solid #f0e8d0;
    color: #1a1a1a;
    font-weight: 600;
  }
  .footer {
    margin-top: 36px;
    padding-top: 16px;
    border-top: 1px solid #e8dfc0;
    font-size: 11px;
    color: #888;
    text-align: center;
    line-height: 1.6;
  }
  .stamp {
    display: inline-block;
    margin-top: 24px;
    border: 2px solid #a28959;
    border-radius: 6px;
    padding: 8px 24px;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #a28959;
  }
  @media print {
    body { padding: 32px 40px; }
    button { display: none !important; }
  }
</style>
</head>
<body>
  <div class="header">
    <img class="logo" src="${logoUrl}" alt="Harrowgate Consultancy" onerror="this.style.display='none'"/>
    <div class="company-name">Harrowgate Consultancy</div>
    <div class="doc-title">Payment Demand Note</div>
  </div>

  <div class="meta">
    <span>Date: ${date}</span>
    <span>Ref: ${refCode}</span>
  </div>

  <div class="to-block">
    <div class="to-label">Issued To</div>
    <div class="to-name">${submission.name}</div>
    <div class="to-ref">Payment Type: ${paymentLabel}</div>
  </div>

  <div class="section-title">Payment Information</div>
  ${amountHtml}
  <div class="info-row">
    <span class="info-label">Accepted Methods</span>
    <span class="info-value">Bank Transfer / FPS</span>
  </div>

  <div class="section-title">Bank Details</div>
  ${bankHtml}
  <p style="font-size:11px;color:#999;margin-top:10px;">${bankDetails?.additionalInfo || "Please include your full name in the payment reference."}</p>

  <div style="text-align:center; margin-top:32px;">
    <div class="stamp">Pending Payment</div>
  </div>

  <div class="footer">
    This demand note is issued by Harrowgate Consultancy for internal reference only.<br/>
    For queries, please contact your assigned consultant.
  </div>

  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=720,height=960,scrollbars=yes");
    if (!win) { alert("Please allow pop-ups to print the demand note."); return; }
    win.document.write(html);
    win.document.close();
  };

  const handleReceiptUpload = async (file: File) => {
    setUploading(true); setError(null);
    try {
      const { url } = await uploadToStorage(file);
      const hdrs = authHeaders();
      const res = await fetch(`${getApiBase()}/api/student/submissions/${submission.id}/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json", ...hdrs }, credentials: "include",
        body: JSON.stringify({ fileName: file.name, fileUrl: url, fileSize: file.size, mimeType: file.type }),
      });
      if (!res.ok) throw new Error("Failed");
      onUpdated();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (needsTerms) {
    return (
      <TermsModal
        submissionId={submission.id}
        studentName={submission.name}
        authHeaders={authHeaders}
        onAccepted={onUpdated}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header card ── */}
      <div className="rounded-2xl overflow-hidden border" style={{ background: "rgba(0,0,0,0.35)", borderColor: "rgba(162,137,89,0.30)" }}>
        <div className="h-0.5" style={{ background: `linear-gradient(to right, transparent, ${GOLD_B}, transparent)` }} />
        <div className="px-6 py-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(162,137,89,0.14)", color: GOLD_L }}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold" style={{ color: GOLD_L }}>{title}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: "rgba(162,137,89,0.12)", color: GOLD_B }}>
                {stepNum} payment
              </span>
            </div>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: "rgba(162,137,89,0.65)" }}>{subtitle}</p>
          </div>
        </div>
      </div>

      {!alreadySubmitted ? (
        <>
          {/* ── Steps ── */}
          {(() => {
            const stepsMap = {
              bank:   [
                { n: "1", title: "Review Bank Details",   body: "Bank details are shown below. Use Bank Transfer or FPS to make the payment." },
                { n: "2", title: "Make the Transfer",     body: "Pay via Bank Transfer or FPS. Include your full name in the payment reference." },
                { n: "3", title: "Upload Your Receipt",   body: "Take a screenshot of your payment confirmation and upload it below." },
              ],
              alipay: [
                { n: "1", title: "Open Alipay",           body: "Open your Alipay app and go to Transfer or Scan QR." },
                { n: "2", title: "Scan QR / Transfer",    body: "Scan the QR code shown below, or transfer to the Alipay account ID listed." },
                { n: "3", title: "Upload Your Receipt",   body: "Take a screenshot of the Alipay confirmation screen and upload it below." },
              ],
              card:   [
                { n: "1", title: "Click Payment Link",    body: "Use the secure payment link provided below to proceed to card checkout." },
                { n: "2", title: "Complete Payment",      body: "Enter your Visa or Mastercard details on the secure payment page." },
                { n: "3", title: "Upload Your Receipt",   body: "Take a screenshot of the payment confirmation and upload it below." },
              ],
            };
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {stepsMap[selectedMethod].map(step => (
                  <div key={step.n} className="rounded-2xl p-4 border"
                    style={{ background: "rgba(162,137,89,0.05)", borderColor: "rgba(162,137,89,0.15)" }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mb-3"
                      style={{ background: "rgba(162,137,89,0.14)", color: GOLD_B }}>
                      {step.n}
                    </div>
                    <p className="text-sm font-semibold mb-1" style={{ color: GOLD_L }}>{step.title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: "rgba(162,137,89,0.55)" }}>{step.body}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── Payment info card — bank-statement style ── */}
          <div className="rounded-2xl border overflow-hidden"
            style={{ background: "linear-gradient(160deg, #0d1f12 0%, #0a1a0e 100%)", borderColor: "rgba(162,137,89,0.28)" }}>

            {/* Section: Payment Info */}
            <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: "rgba(162,137,89,0.12)" }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(162,137,89,0.45)" }}>
                Payment Info
              </p>
              <div className="space-y-3">
                {paymentType === "first" && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: "rgba(162,137,89,0.70)" }}>Amount Due</span>
                    <div className="text-right">
                      <span className="text-xl font-extrabold tracking-tight"
                        style={{ color: GOLD_L, textShadow: `0 0 18px rgba(240,210,140,0.25)` }}>
                        {pricing.firstPayment}
                      </span>
                      <span className="block text-xs mt-0.5" style={{ color: "rgba(162,137,89,0.50)" }}>
                        non-refundable consultancy fee
                      </span>
                    </div>
                  </div>
                )}
                {(paymentType === "second" || paymentType === "final") && (() => {
                  const progType = (submission as any).programmeType as string | null | undefined;
                  const allSecond = [
                    { key: "masters",   label: "Master's Degree",   amount: pricing.mastersStage2 },
                    { key: "bachelor",  label: "Bachelor's Degree",  amount: pricing.bachelorStage2 },
                    { key: "associate", label: "Associate Degree",   amount: pricing.associateStage2 },
                    { key: "diploma",   label: "Diploma",            amount: pricing.diplomaStage2 },
                  ];
                  const allFinal = [
                    { key: "masters",   label: "Master's Degree",   amount: pricing.mastersLastPayment },
                    { key: "bachelor",  label: "Bachelor's Degree",  amount: pricing.bachelorLastPayment },
                    { key: "associate", label: "Associate Degree",   amount: pricing.associateLastPayment },
                    { key: "diploma",   label: "Diploma",            amount: pricing.diplomaLastPayment },
                  ];
                  const allTiers = paymentType === "second" ? allSecond : allFinal;
                  const tiers    = progType ? allTiers.filter(t => t.key === progType) : allTiers;
                  return (
                    <div className="space-y-2">
                      <span className="text-sm" style={{ color: "rgba(162,137,89,0.70)" }}>
                        {progType ? "Amount Due" : "Amount Due (by degree)"}
                      </span>
                      <div className="flex flex-wrap gap-3 mt-1">
                        {tiers.map(({ label, amount }) => (
                          <div key={label} className="flex flex-col items-center px-5 py-3 rounded-xl border text-center"
                            style={{ background: "rgba(162,137,89,0.10)", borderColor: "rgba(196,169,110,0.35)" }}>
                            <span className="font-extrabold text-2xl tracking-tight"
                              style={{ color: "#f0d28c", textShadow: "0 0 22px rgba(240,210,140,0.55), 0 0 8px rgba(240,210,140,0.30)" }}>
                              {amount}
                            </span>
                            <span className="text-xs mt-1 font-semibold tracking-wide" style={{ color: "rgba(162,137,89,0.70)" }}>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {/* Payment method selector */}
                {(paymentMethods.alipay.enabled || paymentMethods.card.enabled) && (
                  <div>
                    <span className="text-xs" style={{ color: "rgba(162,137,89,0.55)" }}>Choose Payment Method</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {([
                        { id: "bank"  as const, label: "Bank / FPS",       icon: "🏦" },
                        ...(paymentMethods.alipay.enabled ? [{ id: "alipay" as const, label: "Alipay 支付宝",   icon: "🔵" }] : []),
                        ...(paymentMethods.card.enabled   ? [{ id: "card"   as const, label: "Visa / Mastercard", icon: "💳" }] : []),
                      ]).map(m => (
                        <button key={m.id} onClick={() => setSelectedMethod(m.id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all"
                          style={{
                            background: selectedMethod === m.id ? "rgba(196,169,110,0.18)" : "rgba(162,137,89,0.05)",
                            borderColor: selectedMethod === m.id ? GOLD_B : "rgba(162,137,89,0.20)",
                            color: selectedMethod === m.id ? GOLD_L : GOLD_B,
                            boxShadow: selectedMethod === m.id ? `0 0 12px rgba(196,169,110,0.12)` : "none",
                          }}>
                          <span>{m.icon}</span>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section: Bank / FPS Details */}
            {selectedMethod === "bank" && bankDetails && (bankDetails.bankName || bankDetails.accountName || bankDetails.accountNumber || bankDetails.fps) && (
              <div className="px-5 pt-4 pb-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(162,137,89,0.45)" }}>
                  Bank Details
                </p>
                {bankDetails.bankName && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "rgba(162,137,89,0.60)" }}>Bank</span>
                    <span className="font-bold" style={{ color: GOLD_L }}>{bankDetails.bankName}</span>
                  </div>
                )}
                {bankDetails.accountName && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "rgba(162,137,89,0.60)" }}>Account Name</span>
                    <span className="font-bold" style={{ color: GOLD_L }}>{bankDetails.accountName}</span>
                  </div>
                )}
                {bankDetails.accountNumber && (
                  <div className="flex justify-between items-center text-sm">
                    <span style={{ color: "rgba(162,137,89,0.60)" }}>Account No.</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold" style={{ color: GOLD_L }}>{bankDetails.accountNumber}</span>
                      <button onClick={() => navigator.clipboard.writeText(bankDetails.accountNumber)}
                        className="text-xs px-2 py-0.5 rounded border transition-opacity hover:opacity-70"
                        style={{ borderColor: "rgba(162,137,89,0.25)", color: GOLD, background: "rgba(162,137,89,0.07)" }}>
                        Copy
                      </button>
                    </div>
                  </div>
                )}
                {bankDetails.fps && (
                  <div className="flex justify-between items-center text-sm">
                    <span style={{ color: "rgba(162,137,89,0.60)" }}>FPS</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold" style={{ color: GOLD_L }}>{bankDetails.fps}</span>
                      <button onClick={() => navigator.clipboard.writeText(bankDetails.fps)}
                        className="text-xs px-2 py-0.5 rounded border transition-opacity hover:opacity-70"
                        style={{ borderColor: "rgba(162,137,89,0.25)", color: GOLD, background: "rgba(162,137,89,0.07)" }}>
                        Copy
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-xs pt-3 border-t" style={{ borderColor: "rgba(162,137,89,0.10)", color: "rgba(162,137,89,0.45)" }}>
                  {bankDetails?.additionalInfo || "Please include your full name in the payment reference."}
                </p>
              </div>
            )}

            {/* Section: Alipay Details */}
            {selectedMethod === "alipay" && paymentMethods.alipay.enabled && (
              <div className="px-5 pt-4 pb-5 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(162,137,89,0.45)" }}>
                  Alipay 支付宝
                </p>
                {paymentMethods.alipay.accountName && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "rgba(162,137,89,0.60)" }}>Account Name</span>
                    <span className="font-bold" style={{ color: GOLD_L }}>{paymentMethods.alipay.accountName}</span>
                  </div>
                )}
                {paymentMethods.alipay.accountId && (
                  <div className="flex justify-between items-center text-sm">
                    <span style={{ color: "rgba(162,137,89,0.60)" }}>Alipay ID</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold" style={{ color: GOLD_L }}>{paymentMethods.alipay.accountId}</span>
                      <button onClick={() => navigator.clipboard.writeText(paymentMethods.alipay.accountId)}
                        className="text-xs px-2 py-0.5 rounded border transition-opacity hover:opacity-70"
                        style={{ borderColor: "rgba(162,137,89,0.25)", color: GOLD, background: "rgba(162,137,89,0.07)" }}>
                        Copy
                      </button>
                    </div>
                  </div>
                )}
                {paymentMethods.alipay.qrCodeUrl && (
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <span className="text-xs" style={{ color: "rgba(162,137,89,0.50)" }}>Scan to Pay</span>
                    <div className="p-3 rounded-2xl border" style={{ background: "#fff", borderColor: "rgba(162,137,89,0.25)" }}>
                      <img src={paymentMethods.alipay.qrCodeUrl} alt="Alipay QR Code"
                        className="w-44 h-44 object-contain" />
                    </div>
                  </div>
                )}
                {paymentMethods.alipay.instructions && (
                  <p className="text-xs pt-2 border-t" style={{ borderColor: "rgba(162,137,89,0.10)", color: "rgba(162,137,89,0.50)" }}>
                    {paymentMethods.alipay.instructions}
                  </p>
                )}
              </div>
            )}

            {/* Section: Card Payment Details */}
            {selectedMethod === "card" && paymentMethods.card.enabled && (
              <div className="px-5 pt-4 pb-5 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(162,137,89,0.45)" }}>
                  Visa / Mastercard
                </p>
                {paymentMethods.card.paymentLink && (
                  <a href={paymentMethods.card.paymentLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-3 rounded-xl border font-semibold text-sm transition-all hover:opacity-80"
                    style={{ background: "rgba(162,137,89,0.12)", borderColor: GOLD_B, color: GOLD_L }}>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                      <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
                    </svg>
                    Pay by Card
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 opacity-60">
                      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </a>
                )}
                {paymentMethods.card.instructions && (
                  <p className="text-xs pt-2 border-t" style={{ borderColor: "rgba(162,137,89,0.10)", color: "rgba(162,137,89,0.50)" }}>
                    {paymentMethods.card.instructions}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Print Demand Note ── */}
          <div className="flex justify-end">
            <button onClick={printDemandNote}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold border transition-all hover:opacity-80"
              style={{ borderColor: "rgba(162,137,89,0.30)", color: GOLD_B, background: "rgba(162,137,89,0.07)" }}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v4a2 2 0 002 2h1v1a2 2 0 002 2h6a2 2 0 002-2v-1h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0v3H7V4h6zm-7 8v4h6v-4H6zm8-4a1 1 0 110 2 1 1 0 010-2z" clipRule="evenodd"/>
              </svg>
              Print Demand Note
            </button>
          </div>

          {/* ── Upload zone ── */}
          <div>
            <div
              onClick={() => !uploading && inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); if (!uploading) setDragOver(true); }}
              onDragEnter={e => { e.preventDefault(); if (!uploading) setDragOver(true); }}
              onDragLeave={e => { e.preventDefault(); setDragOver(false); }}
              onDrop={e => {
                e.preventDefault(); setDragOver(false);
                if (uploading) return;
                const file = e.dataTransfer.files?.[0];
                if (file) handleReceiptUpload(file);
              }}
              className="w-full rounded-2xl border-2 text-sm font-semibold transition-all flex flex-col items-center justify-center gap-2 select-none"
              style={{
                padding: dragOver ? "28px 20px" : "20px",
                background: dragOver ? "rgba(162,137,89,0.10)" : "rgba(162,137,89,0.04)",
                borderColor: dragOver ? GOLD_B : "rgba(162,137,89,0.25)",
                borderStyle: "dashed",
                color: GOLD_B,
                cursor: uploading ? "not-allowed" : "pointer",
                opacity: uploading ? 0.5 : 1,
                transform: dragOver ? "scale(1.01)" : "scale(1)",
                boxShadow: dragOver ? "0 0 20px rgba(162,137,89,0.12)" : "none",
              }}
            >
              {uploading ? (
                <>
                  <span className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: GOLD_B, borderTopColor: "transparent" }} />
                  <span>Uploading receipt…</span>
                </>
              ) : dragOver ? (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="font-bold">Drop to upload</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 opacity-60">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Upload Payment Receipt Screenshot</span>
                  <span className="text-xs font-normal" style={{ color: "rgba(162,137,89,0.50)" }}>
                    Drag &amp; drop here, or click to browse · PNG, JPG, PDF
                  </span>
                </>
              )}
            </div>
            <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleReceiptUpload(f); }} />
            {error && (
              <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: "#f87171" }}>
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
                  <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm8-3.5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4.5zm0 7a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          {/* Success state */}
          <div className="rounded-2xl border overflow-hidden"
            style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(162,137,89,0.25)" }}>
            <div className="px-5 py-4 flex items-center gap-3 border-b" style={{ borderColor: "rgba(162,137,89,0.12)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(162,137,89,0.12)" }}>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" style={{ color: GOLD_L }}>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: GOLD_L }}>Receipt Submitted</p>
                <p className="text-xs" style={{ color: "rgba(162,137,89,0.55)" }}>
                  Awaiting confirmation from your consultant.{existingReceipt && ` File: ${existingReceipt.fileName}`}
                </p>
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="w-4 h-4 rounded-full border-2 animate-spin shrink-0 mt-0.5"
                  style={{ borderColor: GOLD_B, borderTopColor: "transparent" }} />
                <p className="text-sm leading-relaxed" style={{ color: "rgba(162,137,89,0.70)" }}>
                  Your payment receipt has been received. Our consultant will confirm your payment shortly — usually within a few hours during business hours.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={printDemandNote}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold border transition-all hover:opacity-80"
              style={{ borderColor: "rgba(162,137,89,0.30)", color: GOLD_B, background: "rgba(162,137,89,0.07)" }}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v4a2 2 0 002 2h1v1a2 2 0 002 2h6a2 2 0 002-2v-1h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0v3H7V4h6zm-7 8v4h6v-4H6zm8-4a1 1 0 110 2 1 1 0 010-2z" clipRule="evenodd"/>
              </svg>
              Print Demand Note
            </button>
          </div>

          {!isSecond && !isFinal && submission.status === "acknowledged" && (
            <a
              href="https://wa.me/85260606457?text=Hi%2C%20I%20have%20submitted%20my%20payment%20receipt%20for%20my%20student%20visa%20application."
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full rounded-2xl py-3.5 border text-sm font-semibold transition-all hover:opacity-85 hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: "rgba(162,137,89,0.08)", borderColor: "rgba(162,137,89,0.30)", color: GOLD_B }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Message us on WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );
}
