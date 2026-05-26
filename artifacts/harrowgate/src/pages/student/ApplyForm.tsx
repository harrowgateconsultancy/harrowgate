import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useSession } from "@clerk/react";

const BG = "#0f2d18";
const GOLD = "#a28959";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getApiBase() {
  return `${window.location.origin}${BASE}`;
}

type Props = { user: any; onSubmitted: () => void };
type UploadState = { file: File | null; uploading: boolean; url: string | null; name: string | null; error: string | null };
const emptyUpload = (): UploadState => ({ file: null, uploading: false, url: null, name: null, error: null });

const docLabels = [
  "Latest Degree / Diploma Certificate",
  "Official Academic Transcript",
  "Previous Qualification Certificate",
  "Language Proficiency Certificate (if any)",
  "Additional Supporting Document (if any)",
];

async function uploadToStorage(file: File): Promise<{ url: string }> {
  const res = await fetch(`${getApiBase()}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!res.ok) throw new Error("Failed to get upload URL");
  const { uploadURL, objectPath } = await res.json();
  await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  return { url: objectPath };
}

export default function ApplyForm({ user, onSubmitted }: Props) {
  const { session } = useSession();
  const [, setLocation] = useLocation();
  const [name, setName] = useState(user?.fullName || "");
  const [dob, setDob] = useState("");
  const [passport, setPassport] = useState("");
  const [docs, setDocs] = useState<UploadState[]>(Array.from({ length: 5 }, emptyUpload));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await session?.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleFileChange = async (index: number, file: File | null) => {
    if (!file) return;
    setDocs(prev => { const n = [...prev]; n[index] = { ...n[index], file, uploading: true, error: null }; return n; });
    try {
      const { url } = await uploadToStorage(file);
      setDocs(prev => { const n = [...prev]; n[index] = { file, uploading: false, url, name: file.name, error: null }; return n; });
    } catch {
      setDocs(prev => { const n = [...prev]; n[index] = { ...n[index], uploading: false, error: "Upload failed. Please try again." }; return n; });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !dob || !passport.trim()) { setError("Please fill in all required fields."); return; }
    if (!docs[0].url) { setError("Please upload at least your first education document."); return; }
    if (docs.some(d => d.uploading)) { setError("Please wait for all uploads to finish."); return; }
    setSubmitting(true);
    try {
      const hdrs = await authHeaders();
      const res = await fetch(`${getApiBase()}/api/student/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...hdrs },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), dateOfBirth: dob, passportNumber: passport.trim(), email: user?.primaryEmailAddress?.emailAddress }),
      });
      if (!res.ok) throw new Error("Failed");
      const submission = await res.json();
      for (let i = 0; i < docs.length; i++) {
        const d = docs[i];
        if (d.url && d.name) {
          await fetch(`${getApiBase()}/api/student/submissions/${submission.id}/documents`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...hdrs },
            credentials: "include",
            body: JSON.stringify({ documentType: `edu_${i + 1}`, fileName: d.name, fileUrl: d.url, fileSize: d.file?.size, mimeType: d.file?.type }),
          });
        }
      }
      onSubmitted();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => setLocation("/")}
        className="flex items-center gap-2 text-sm mb-8 transition-opacity hover:opacity-70"
        style={{ color: "rgba(162,137,89,0.55)" }}
      >
        ← Back to Home
      </button>

      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "rgba(162,137,89,0.45)" }}>Student Portal</p>
        <h1 className="text-4xl font-bold mb-3" style={{ color: GOLD }}>Start Your Application</h1>
        <p className="text-base" style={{ color: "rgba(162,137,89,0.6)" }}>
          Complete the form below to submit your student visa application. All fields marked * are required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Details */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(162,137,89,0.15)" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(162,137,89,0.15)" }}>
            <h2 className="text-base font-semibold" style={{ color: GOLD }}>Personal Information</h2>
          </div>
          <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(162,137,89,0.65)" }}>Full Name *</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="As in passport" required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none border transition-all"
                style={{ background: "rgba(162,137,89,0.06)", borderColor: "rgba(162,137,89,0.2)", color: GOLD }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(162,137,89,0.65)" }}>Date of Birth *</label>
              <input
                type="date" value={dob} onChange={e => setDob(e.target.value)} required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none border transition-all"
                style={{ background: "rgba(162,137,89,0.06)", borderColor: "rgba(162,137,89,0.2)", color: GOLD, colorScheme: "dark" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(162,137,89,0.65)" }}>Passport Number *</label>
              <input
                type="text" value={passport} onChange={e => setPassport(e.target.value.toUpperCase())}
                placeholder="e.g. A12345678" required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none border transition-all tracking-widest font-mono"
                style={{ background: "rgba(162,137,89,0.06)", borderColor: "rgba(162,137,89,0.2)", color: GOLD }}
              />
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(162,137,89,0.15)" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(162,137,89,0.15)" }}>
            <h2 className="text-base font-semibold" style={{ color: GOLD }}>Education Documents *</h2>
            <p className="text-xs mt-0.5" style={{ color: "rgba(162,137,89,0.45)" }}>Upload your education certificates and transcripts (PDF, JPG, PNG — max 20MB each)</p>
          </div>
          <div className="px-6 py-6 space-y-4">
            {docs.map((doc, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(162,137,89,0.12)", color: GOLD }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium mb-1.5" style={{ color: "rgba(162,137,89,0.55)" }}>
                    {docLabels[i]}{i === 0 ? " *" : ""}
                  </p>
                  {doc.url ? (
                    <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 border" style={{ background: "rgba(162,137,89,0.07)", borderColor: "rgba(162,137,89,0.22)" }}>
                      <span className="text-sm">📄</span>
                      <span className="text-sm flex-1 truncate" style={{ color: GOLD }}>{doc.name}</span>
                      <button type="button" onClick={() => { setDocs(prev => { const n = [...prev]; n[i] = emptyUpload(); return n; }); }}
                        className="text-xs px-3 py-1 rounded-full border transition-all hover:opacity-80"
                        style={{ borderColor: "rgba(162,137,89,0.25)", color: "rgba(162,137,89,0.55)" }}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => inputRefs.current[i]?.click()} disabled={doc.uploading}
                      className="w-full rounded-xl px-4 py-2.5 border text-sm text-left transition-all hover:opacity-80 flex items-center gap-2"
                      style={{ background: "rgba(162,137,89,0.03)", borderColor: "rgba(162,137,89,0.12)", color: "rgba(162,137,89,0.45)", borderStyle: "dashed" }}>
                      {doc.uploading
                        ? <><span className="w-3 h-3 rounded-full border border-t-transparent animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} /> Uploading…</>
                        : <><span>📎</span> Click to upload</>}
                    </button>
                  )}
                  {doc.error && <p className="text-xs mt-1" style={{ color: "#f87171" }}>{doc.error}</p>}
                  <input ref={el => { inputRefs.current[i] = el; }} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
                    onChange={e => handleFileChange(i, e.target.files?.[0] || null)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm border" style={{ background: "rgba(248,113,113,0.07)", borderColor: "rgba(248,113,113,0.2)", color: "#f87171" }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting || docs.some(d => d.uploading)}
          className="w-full py-4 rounded-2xl text-base font-semibold transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: GOLD, color: BG }}>
          {submitting ? "Submitting…" : "Submit Application"}
        </button>
      </form>
    </div>
  );
}
