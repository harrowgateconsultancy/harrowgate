import { useState, useRef } from "react";
import { useSession } from "@clerk/react";

const GOLD = "#a28959";
const BG = "#0f2d18";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }

type Doc = { id: number; submissionId: number; documentType: string; fileName: string; fileUrl: string; mimeType?: string | null };
type Props = {
  submissionId: number;
  documents: Doc[];
  onResubmit: () => void;
  onDocsChanged: () => void;
};

const DOC_SLOTS = [
  { type: "edu_1", label: "Latest Degree / Diploma Certificate" },
  { type: "edu_2", label: "Official Academic Transcript" },
  { type: "edu_3", label: "Previous Qualification Certificate" },
  { type: "edu_4", label: "Language Proficiency Certificate (if any)" },
  { type: "edu_5", label: "Additional Supporting Document (if any)" },
];

function isImage(f: string, m?: string | null) { return m?.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(f); }
function isPdf(f: string, m?: string | null) { return m === "application/pdf" || /\.pdf$/i.test(f); }

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

export default function StudentDocManager({ submissionId, documents, onResubmit, onDocsChanged }: Props) {
  const { session } = useSession();
  const [uploading, setUploading] = useState<string | null>(null);
  const [preview, setPreview] = useState<Doc | null>(null);
  const [resubmitting, setResubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await session?.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const studentDocs = documents.filter(d => !d.documentType.startsWith("admin_") && d.documentType !== "payment_receipt");

  const handleUpload = async (type: string, file: File) => {
    setUploading(type); setError(null);
    try {
      const { url } = await uploadToStorage(file);
      const hdrs = await authHeaders();
      const res = await fetch(`${getApiBase()}/api/student/submissions/${submissionId}/documents`, {
        method: "POST", headers: { "Content-Type": "application/json", ...hdrs }, credentials: "include",
        body: JSON.stringify({ documentType: type, fileName: file.name, fileUrl: url, fileSize: file.size, mimeType: file.type }),
      });
      if (!res.ok) throw new Error("Failed");
      onDocsChanged();
    } catch { setError("Upload failed. Please try again."); }
    finally { setUploading(null); if (inputRefs.current[type]) inputRefs.current[type]!.value = ""; }
  };

  const handleDelete = async (doc: Doc) => {
    if (!confirm(`Remove "${doc.fileName}"?`)) return;
    try {
      const hdrs = await authHeaders();
      await fetch(`${getApiBase()}/api/student/submissions/${submissionId}/documents/${doc.id}`, {
        method: "DELETE", credentials: "include", headers: hdrs,
      });
      onDocsChanged();
      if (preview?.id === doc.id) setPreview(null);
    } catch { setError("Delete failed. Please try again."); }
  };

  const handleResubmit = async () => {
    const hasDoc = studentDocs.some(d => d.documentType === "edu_1");
    if (!hasDoc) { setError("Please upload at least Document 1 before re-submitting."); return; }
    setResubmitting(true); setError(null);
    try {
      const hdrs = await authHeaders();
      const res = await fetch(`${getApiBase()}/api/student/submissions/${submissionId}/resubmit`, {
        method: "POST", credentials: "include", headers: hdrs,
      });
      if (!res.ok) throw new Error("Failed");
      onResubmit();
    } catch { setError("Re-submission failed. Please try again."); }
    finally { setResubmitting(false); }
  };

  const viewUrl = (doc: Doc) =>
    `${getApiBase()}/api/student/submissions/${submissionId}/documents/${doc.id}/view`;

  return (
    <div className="space-y-5">
      {/* Instruction banner */}
      <div className="rounded-2xl p-5 border" style={{ background: "rgba(251,146,60,0.05)", borderColor: "rgba(251,146,60,0.22)" }}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">📎</span>
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: "#fb923c" }}>Additional Documents Required</p>
            <p className="text-sm" style={{ color: "rgba(251,146,60,0.7)" }}>
              Our consultant has requested additional documents. Please review, add or replace your documents below, then click <strong>Re-submit Application</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Document slots */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(162,137,89,0.15)" }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(162,137,89,0.12)" }}>
          <h3 className="text-base font-semibold" style={{ color: GOLD }}>Your Documents</h3>
          <p className="text-xs mt-0.5" style={{ color: "rgba(162,137,89,0.45)" }}>Click a document to preview it · Use Replace to swap a file</p>
        </div>
        <div className="px-6 py-5 space-y-3">
          {DOC_SLOTS.map(slot => {
            const doc = studentDocs.find(d => d.documentType === slot.type);
            const isUp = uploading === slot.type;
            return (
              <div key={slot.type}>
                <div className="flex items-center gap-3 rounded-xl border p-3 transition-all"
                  style={{ background: doc ? "rgba(162,137,89,0.06)" : "rgba(162,137,89,0.02)", borderColor: doc ? "rgba(162,137,89,0.22)" : "rgba(162,137,89,0.08)" }}>
                  <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(162,137,89,0.12)", color: GOLD }}>
                    {DOC_SLOTS.indexOf(slot) + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium" style={{ color: "rgba(162,137,89,0.55)" }}>{slot.label}</p>
                    {doc && <p className="text-sm font-semibold truncate mt-0.5" style={{ color: GOLD }}>{doc.fileName}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {doc ? (
                      <>
                        <button onClick={() => setPreview(preview?.id === doc.id ? null : doc)}
                          className="text-xs px-3 py-1.5 rounded-lg border transition-all hover:opacity-80"
                          style={{ background: preview?.id === doc.id ? "rgba(162,137,89,0.15)" : "transparent", borderColor: "rgba(162,137,89,0.2)", color: GOLD }}>
                          {preview?.id === doc.id ? "Hide" : "View"}
                        </button>
                        <button onClick={() => inputRefs.current[`replace_${slot.type}`]?.click()}
                          disabled={isUp}
                          className="text-xs px-3 py-1.5 rounded-lg border transition-all hover:opacity-80 disabled:opacity-50"
                          style={{ borderColor: "rgba(162,137,89,0.2)", color: GOLD }}>
                          {isUp ? "…" : "Replace"}
                        </button>
                        <button onClick={() => handleDelete(doc)}
                          className="text-xs px-2 py-1.5 rounded-lg border transition-all hover:opacity-80"
                          style={{ borderColor: "rgba(248,113,113,0.2)", color: "#f87171" }}>
                          ✕
                        </button>
                      </>
                    ) : (
                      <button onClick={() => inputRefs.current[slot.type]?.click()} disabled={isUp}
                        className="text-xs px-4 py-1.5 rounded-lg border transition-all hover:opacity-80 disabled:opacity-50 flex items-center gap-1.5"
                        style={{ borderColor: "rgba(162,137,89,0.22)", color: "rgba(162,137,89,0.55)", borderStyle: "dashed" }}>
                        {isUp ? <><span className="w-3 h-3 rounded-full border border-t-transparent animate-spin inline-block" style={{ borderColor: GOLD, borderTopColor: "transparent" }} /> Uploading…</> : "＋ Upload"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline preview */}
                {preview?.id === doc?.id && doc && (
                  <div className="mt-2 rounded-xl border overflow-hidden" style={{ borderColor: "rgba(162,137,89,0.15)", background: "rgba(0,0,0,0.3)" }}>
                    {isImage(doc.fileName, doc.mimeType) ? (
                      <img src={viewUrl(doc)} alt={doc.fileName} className="max-w-full mx-auto rounded-xl p-2" style={{ maxHeight: 320, objectFit: "contain" }} />
                    ) : isPdf(doc.fileName, doc.mimeType) ? (
                      <iframe src={viewUrl(doc)} className="w-full" style={{ height: 360, border: "none" }} title={doc.fileName} />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <span className="text-4xl">📎</span>
                        <p className="text-sm" style={{ color: "rgba(162,137,89,0.5)" }}>Preview not available</p>
                        <a href={viewUrl(doc)} target="_blank" rel="noopener noreferrer"
                          className="text-xs px-4 py-2 rounded-full border" style={{ borderColor: "rgba(162,137,89,0.25)", color: GOLD }}>
                          Open file ↗
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Hidden inputs */}
                <input ref={el => { inputRefs.current[slot.type] = el; }} type="file" className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(slot.type, f); }} />
                <input ref={el => { inputRefs.current[`replace_${slot.type}`] = el; }} type="file" className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(slot.type, f); }} />
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm border" style={{ background: "rgba(248,113,113,0.07)", borderColor: "rgba(248,113,113,0.2)", color: "#f87171" }}>
          {error}
        </div>
      )}

      <button onClick={handleResubmit} disabled={resubmitting}
        className="w-full py-4 rounded-2xl text-base font-semibold transition-all hover:opacity-90 disabled:opacity-50"
        style={{ background: GOLD, color: BG }}>
        {resubmitting ? "Submitting…" : "Re-submit Application"}
      </button>
    </div>
  );
}
