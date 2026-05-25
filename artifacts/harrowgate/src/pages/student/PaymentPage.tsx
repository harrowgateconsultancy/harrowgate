import { useState, useRef } from "react";
import type { Submission } from "./Portal";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }

async function uploadToStorage(file: File): Promise<{ url: string }> {
  const res = await fetch(`${getApiBase()}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!res.ok) throw new Error("Upload URL failed");
  const { uploadURL, objectPath } = await res.json();
  await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  return { url: objectPath };
}

type Props = { submission: Submission; onUpdated: () => void };

export default function PaymentPage({ submission, onUpdated }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const existingReceipt = submission.documents.find(d => d.documentType === "payment_receipt");
  const alreadySubmitted = submission.status === "payment_received" || submission.status === "acknowledged";

  const handleReceiptUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadToStorage(file);
      const res = await fetch(`${getApiBase()}/api/student/submissions/${submission.id}/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fileName: file.name,
          fileUrl: url,
          fileSize: file.size,
          mimeType: file.type,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit receipt");
      setDone(true);
      onUpdated();
    } catch (e: any) {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment Instructions */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(251,146,60,0.2)" }}>
        <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: "rgba(251,146,60,0.15)" }}>
          <span className="text-xl">💳</span>
          <div>
            <h3 className="text-base font-semibold" style={{ color: "#fb923c" }}>Payment Required</h3>
            <p className="text-xs" style={{ color: "rgba(251,146,60,0.6)" }}>Your application has been approved — please complete payment to proceed</p>
          </div>
        </div>
        <div className="px-6 py-6">
          <div className="rounded-xl p-5 border mb-5" style={{ background: "rgba(251,146,60,0.06)", borderColor: "rgba(251,146,60,0.15)" }}>
            <p className="text-sm font-semibold mb-3" style={{ color: "#fb923c" }}>Payment Details</p>
            <div className="space-y-2 text-sm" style={{ color: "rgba(251,146,60,0.8)" }}>
              <div className="flex justify-between">
                <span>Service Fee</span>
                <span className="font-mono font-semibold">To be confirmed</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method</span>
                <span>Bank Transfer / FPS</span>
              </div>
            </div>
            <p className="text-xs mt-4 pt-4 border-t" style={{ borderColor: "rgba(251,146,60,0.15)", color: "rgba(251,146,60,0.5)" }}>
              Our consultant will contact you directly with bank details. Please reference your name on the transfer.
            </p>
          </div>

          {/* Receipt Upload */}
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
                style={{
                  background: "rgba(251,146,60,0.06)",
                  borderColor: "rgba(251,146,60,0.25)",
                  color: "#fb923c",
                  borderStyle: "dashed",
                }}
              >
                {uploading ? (
                  <><span className="w-3 h-3 rounded-full border border-t-transparent animate-spin" style={{ borderColor: "#fb923c", borderTopColor: "transparent" }} /> Uploading receipt…</>
                ) : (
                  <><span>📸</span> Upload Payment Receipt Screenshot</>
                )}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleReceiptUpload(f);
                }}
              />
              {error && <p className="text-xs mt-2" style={{ color: "#f87171" }}>{error}</p>}
            </div>
          ) : (
            <div className="rounded-xl p-4 border flex items-center gap-3" style={{ background: "rgba(96,165,250,0.06)", borderColor: "rgba(96,165,250,0.2)" }}>
              <span className="text-xl">✅</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#60a5fa" }}>Receipt Received</p>
                <p className="text-xs" style={{ color: "rgba(96,165,250,0.6)" }}>
                  Your payment receipt has been submitted. We'll confirm it shortly.
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
