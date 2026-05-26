import { useState, useRef } from "react";
import { useSession } from "@clerk/react";
import type { Submission } from "./Portal";

const BG = "#0b2213";
const GOLD = "#a28959";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }

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
  const { session } = useSession();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await session?.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const isSecond = paymentType === "second";
  const isFinal = paymentType === "final";

  const docType = isFinal ? "final_payment_receipt" : isSecond ? "second_payment_receipt" : "payment_receipt";
  const endpoint = isFinal ? "receipt3" : isSecond ? "receipt2" : "receipt";

  const existingReceipt = submission.documents.find(d => d.documentType === docType);
  const alreadySubmitted = isFinal
    ? (submission.status === "final_payment_received" || submission.status === "final_payment_confirmed")
    : isSecond
    ? (submission.status === "second_payment_received" || submission.status === "second_payment_confirmed")
    : (submission.status === "payment_received" || submission.status === "acknowledged");

  const title = isFinal ? "Final Payment Required" : isSecond ? "2nd Service Payment" : "Service Payment";
  const subtitle = isFinal
    ? "A final payment is required to collect your official university offer letter."
    : isSecond
    ? "A second payment is required before proceeding to your university interview."
    : "Your application has been approved — please complete payment to proceed.";

  const stepNum = isFinal ? "3rd" : isSecond ? "2nd" : "1st";

  const handleReceiptUpload = async (file: File) => {
    setUploading(true); setError(null);
    try {
      const { url } = await uploadToStorage(file);
      const hdrs = await authHeaders();
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

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-2xl overflow-hidden border" style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(251,146,60,0.18)" }}>
        <div className="h-0.5" style={{ background: "linear-gradient(to right, transparent, rgba(251,146,60,0.6), transparent)" }} />
        <div className="px-6 py-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(251,146,60,0.12)", color: "#fb923c" }}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold" style={{ color: "#fb923c" }}>{title}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: "rgba(251,146,60,0.1)", color: "#fb923c" }}>
                {stepNum} payment
              </span>
            </div>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: "rgba(251,146,60,0.55)" }}>{subtitle}</p>
          </div>
        </div>
      </div>

      {!alreadySubmitted ? (
        <>
          {/* Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { n: "1", title: "Contact Your Consultant", body: "Our team will provide the bank details and payment amount via WhatsApp or your portal messages." },
              { n: "2", title: "Make the Transfer", body: "Pay via Bank Transfer or FPS. Reference your full name on the transfer." },
              { n: "3", title: "Upload Your Receipt", body: "Take a screenshot of your payment confirmation and upload it below." },
            ].map(step => (
              <div key={step.n} className="rounded-2xl p-4 border"
                style={{ background: "rgba(251,146,60,0.04)", borderColor: "rgba(251,146,60,0.12)" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mb-3"
                  style={{ background: "rgba(251,146,60,0.12)", color: "#fb923c" }}>
                  {step.n}
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: "#fb923c" }}>{step.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(251,146,60,0.5)" }}>{step.body}</p>
              </div>
            ))}
          </div>

          {/* Payment info */}
          <div className="rounded-2xl border px-5 py-4"
            style={{ background: "rgba(251,146,60,0.04)", borderColor: "rgba(251,146,60,0.12)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "rgba(251,146,60,0.4)" }}>Payment Info</p>
            <div className="space-y-2 text-sm" style={{ color: "rgba(251,146,60,0.7)" }}>
              <div className="flex justify-between items-center">
                <span>Service Fee</span>
                <span className="font-semibold" style={{ color: "#fb923c" }}>To be confirmed</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Accepted Methods</span>
                <span className="font-semibold" style={{ color: "#fb923c" }}>Bank Transfer / FPS</span>
              </div>
            </div>
            <p className="text-xs mt-3 pt-3 border-t" style={{ borderColor: "rgba(251,146,60,0.1)", color: "rgba(251,146,60,0.4)" }}>
              Please include your full name in the payment reference. Bank details will be provided by your consultant.
            </p>
          </div>

          {/* Upload */}
          <div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-2xl py-5 border-2 text-sm font-semibold transition-all hover:opacity-85 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-2"
              style={{ background: "rgba(251,146,60,0.04)", borderColor: "rgba(251,146,60,0.22)", borderStyle: "dashed", color: "#fb923c" }}
            >
              {uploading ? (
                <>
                  <span className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#fb923c", borderTopColor: "transparent" }} />
                  <span>Uploading receipt…</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 opacity-60">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Upload Payment Receipt Screenshot</span>
                  <span className="text-xs font-normal" style={{ color: "rgba(251,146,60,0.45)" }}>PNG, JPG, or PDF accepted</span>
                </>
              )}
            </button>
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
            style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(96,165,250,0.2)" }}>
            <div className="px-5 py-4 flex items-center gap-3 border-b" style={{ borderColor: "rgba(96,165,250,0.12)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(96,165,250,0.1)" }}>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" style={{ color: "#60a5fa" }}>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#60a5fa" }}>Receipt Submitted</p>
                <p className="text-xs" style={{ color: "rgba(96,165,250,0.5)" }}>
                  Awaiting confirmation from your consultant.{existingReceipt && ` File: ${existingReceipt.fileName}`}
                </p>
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="w-4 h-4 rounded-full border-2 animate-spin shrink-0 mt-0.5" style={{ borderColor: "#60a5fa", borderTopColor: "transparent" }} />
                <p className="text-sm leading-relaxed" style={{ color: "rgba(96,165,250,0.6)" }}>
                  Your payment receipt has been received. Our consultant will confirm your payment shortly — usually within a few hours during business hours.
                </p>
              </div>
            </div>
          </div>

          {/* WhatsApp follow-up (first payment only, after acknowledged) */}
          {!isSecond && !isFinal && submission.status === "acknowledged" && (
            <a
              href="https://wa.me/85260606457?text=Hi%2C%20I%20have%20submitted%20my%20payment%20receipt%20for%20my%20student%20visa%20application."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full rounded-2xl py-3.5 border text-sm font-semibold transition-all hover:opacity-85 hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: "rgba(37,211,102,0.08)", borderColor: "rgba(37,211,102,0.28)", color: "#25d366" }}
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
