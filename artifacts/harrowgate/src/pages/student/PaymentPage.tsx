import { useState, useRef } from "react";
import { useSession } from "@clerk/react";
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
            <div className="space-y-3">
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
              {!isSecond && !isFinal && (
                <a
                  href="https://wa.me/85260606457?text=Hi%2C%20I%20have%20submitted%20my%20payment%20receipt%20for%20my%20student%20visa%20application."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full rounded-xl py-3 border flex items-center justify-center gap-2 text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
                  style={{ background: "rgba(37,211,102,0.12)", borderColor: "rgba(37,211,102,0.35)", color: "#25d366" }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Message us on WhatsApp
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
