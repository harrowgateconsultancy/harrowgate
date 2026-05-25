import { useState, useRef } from "react";
import type { Submission } from "./Portal";

const BG = "#0f2d18";
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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  const title = isFinal ? "Final Payment Required" : isSecond ? "2nd Payment Required" : "Payment Required";
  const subtitle = isFinal
    ? "A final payment is required to collect your official university offer letter"
    : isSecond
    ? "A second payment is required before proceeding to your university interview"
    : "Your application has been approved — please complete payment to proceed";

  const handleReceiptUpload = async (file: File) => {
    setUploading(true); setError(null);
    try {
      const { url } = await uploadToStorage(file);
      const res = await fetch(`${getApiBase()}/api/student/submissions/${submission.id}/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
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
    <div className="space-y-6">
      <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(251,146,60,0.2)" }}>
        <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: "rgba(251,146,60,0.12)" }}>
          <span className="text-xl">💳</span>
          <div>
            <h3 className="text-base font-semibold" style={{ color: "#fb923c" }}>{title}</h3>
            <p className="text-xs" style={{ color: "rgba(251,146,60,0.55)" }}>{subtitle}</p>
          </div>
        </div>
        <div className="px-6 py-6">
          <div className="rounded-xl p-5 border mb-5" style={{ background: "rgba(251,146,60,0.05)", borderColor: "rgba(251,146,60,0.12)" }}>
            <p className="text-sm font-semibold mb-3" style={{ color: "#fb923c" }}>Payment Details</p>
            <div className="space-y-2 text-sm" style={{ color: "rgba(251,146,60,0.75)" }}>
              <div className="flex justify-between">
                <span>Service Fee</span>
                <span className="font-mono font-semibold">To be confirmed</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method</span>
                <span>Bank Transfer / FPS</span>
              </div>
            </div>
            <p className="text-xs mt-4 pt-4 border-t" style={{ borderColor: "rgba(251,146,60,0.12)", color: "rgba(251,146,60,0.45)" }}>
              Our consultant will contact you directly with bank details. Please reference your name on the transfer.
            </p>
          </div>

          {!alreadySubmitted ? (
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: "#fb923c" }}>
                After payment, upload your receipt screenshot here:
              </p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="w-full rounded-xl py-4 border text-sm font-medium transition-all hover:opacity-80 flex items-center justify-center gap-2"
                style={{ background: "rgba(251,146,60,0.05)", borderColor: "rgba(251,146,60,0.2)", color: "#fb923c", borderStyle: "dashed" }}
              >
                {uploading
                  ? <><span className="w-3 h-3 rounded-full border border-t-transparent animate-spin" style={{ borderColor: "#fb923c", borderTopColor: "transparent" }} /> Uploading receipt…</>
                  : <><span>📸</span> Upload Payment Receipt Screenshot</>}
              </button>
              <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleReceiptUpload(f); }} />
              {error && <p className="text-xs mt-2" style={{ color: "#f87171" }}>{error}</p>}
            </div>
          ) : (
            <div className="rounded-xl p-4 border flex items-center gap-3" style={{ background: "rgba(96,165,250,0.05)", borderColor: "rgba(96,165,250,0.18)" }}>
              <span className="text-xl">✅</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#60a5fa" }}>Pending Payment Confirmation</p>
                <p className="text-xs" style={{ color: "rgba(96,165,250,0.55)" }}>
                  Your receipt has been submitted and is awaiting confirmation from our consultant.
                  {existingReceipt && ` (${existingReceipt.fileName})`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
