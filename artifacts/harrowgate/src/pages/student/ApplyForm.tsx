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

const DOC_CONFIG: { type: string; label: string; hint: string; required: boolean }[] = [
  {
    type: "passport_photo",
    label: "Passport Size Photo",
    hint: "Recent colour passport photo of the applicant",
    required: true,
  },
  {
    type: "passport_doc",
    label: "Passport / Travel Document",
    hint: "Showing personal particulars, date of issue and date of expiry",
    required: true,
  },
  {
    type: "birth_certificate",
    label: "Birth Certificate or National ID",
    hint: "Photocopy of birth certificate or national identity card (if any)",
    required: false,
  },
  {
    type: "cv",
    label: "Applicant's CV",
    hint: "Up-to-date curriculum vitae (if any)",
    required: false,
  },
  {
    type: "edu_results",
    label: "Educational Results",
    hint: "Most recent educational results / certificate",
    required: true,
  },
  {
    type: "edu_transcript",
    label: "Educational Transcript",
    hint: "Official academic transcript",
    required: true,
  },
  {
    type: "higher_edu_results",
    label: "Higher Education Result",
    hint: "Higher education qualification result (if any)",
    required: false,
  },
  {
    type: "higher_edu_transcript",
    label: "Higher Education Transcript",
    hint: "Higher education official transcript (if any)",
    required: false,
  },
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
  const [surname, setSurname] = useState("");
  const [givenName, setGivenName] = useState("");
  const [dob, setDob] = useState("");
  const [passport, setPassport] = useState("");
  const [docs, setDocs] = useState<UploadState[]>(Array.from({ length: DOC_CONFIG.length }, emptyUpload));
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
    if (!surname.trim() || !givenName.trim()) { setError("Please enter both your surname and given name."); return; }
    if (!dob) { setError("Please enter your date of birth."); return; }
    if (!passport.trim()) { setError("Please enter your passport number."); return; }
    const missingRequired = DOC_CONFIG
      .map((cfg, i) => cfg.required && !docs[i].url ? cfg.label : null)
      .filter(Boolean);
    if (missingRequired.length > 0) {
      setError(`Please upload the following required documents: ${missingRequired.join(", ")}.`);
      return;
    }
    if (docs.some(d => d.uploading)) { setError("Please wait for all uploads to finish."); return; }

    const fullName = `${surname.trim()} ${givenName.trim()}`;
    setSubmitting(true);
    try {
      const hdrs = await authHeaders();
      const res = await fetch(`${getApiBase()}/api/student/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...hdrs },
        credentials: "include",
        body: JSON.stringify({
          name: fullName,
          dateOfBirth: dob,
          passportNumber: passport.trim(),
          email: user?.primaryEmailAddress?.emailAddress,
        }),
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
            body: JSON.stringify({
              documentType: DOC_CONFIG[i].type,
              fileName: d.name,
              fileUrl: d.url,
              fileSize: d.file?.size,
              mimeType: d.file?.type,
            }),
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
          Complete the form below to submit your student visa application. Fields marked <span style={{ color: GOLD }}>*</span> are required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Personal Details */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(162,137,89,0.15)" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(162,137,89,0.15)" }}>
            <h2 className="text-base font-semibold" style={{ color: GOLD }}>Personal Information</h2>
            <p className="text-xs mt-0.5" style={{ color: "rgba(162,137,89,0.45)" }}>Enter your details exactly as they appear on your passport</p>
          </div>
          <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(162,137,89,0.65)" }}>Surname (Family Name) *</label>
              <input
                type="text" value={surname} onChange={e => setSurname(e.target.value)}
                placeholder="e.g. CHAN" required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none border transition-all"
                style={{ background: "rgba(162,137,89,0.06)", borderColor: "rgba(162,137,89,0.2)", color: GOLD }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(162,137,89,0.65)" }}>Given Name(s) *</label>
              <input
                type="text" value={givenName} onChange={e => setGivenName(e.target.value)}
                placeholder="e.g. TAI MAN" required
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
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(162,137,89,0.65)" }}>Email Address</label>
              <input
                type="email" value={user?.primaryEmailAddress?.emailAddress || ""} readOnly
                className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
                style={{ background: "rgba(162,137,89,0.03)", borderColor: "rgba(162,137,89,0.1)", color: "rgba(162,137,89,0.55)", cursor: "not-allowed" }}
              />
              <p className="text-xs mt-1" style={{ color: "rgba(162,137,89,0.35)" }}>Taken from your account — cannot be changed here</p>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(162,137,89,0.15)" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(162,137,89,0.15)" }}>
            <h2 className="text-base font-semibold" style={{ color: GOLD }}>Supporting Documents</h2>
            <p className="text-xs mt-0.5" style={{ color: "rgba(162,137,89,0.45)" }}>Upload your documents below (PDF, JPG, PNG — max 20 MB each). Items marked * are required.</p>
          </div>
          <div className="px-6 py-6 space-y-5">
            {DOC_CONFIG.map((cfg, i) => {
              const doc = docs[i];
              return (
                <div key={cfg.type} className="flex items-start gap-4">
                  <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                    style={{ background: cfg.required ? "rgba(162,137,89,0.18)" : "rgba(162,137,89,0.08)", color: GOLD }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold" style={{ color: cfg.required ? GOLD : "rgba(162,137,89,0.65)" }}>
                        {cfg.label}{cfg.required && <span className="ml-1" style={{ color: GOLD }}>*</span>}
                      </p>
                      {!cfg.required && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(162,137,89,0.07)", color: "rgba(162,137,89,0.45)" }}>
                          Optional
                        </span>
                      )}
                    </div>
                    <p className="text-xs mb-2" style={{ color: "rgba(162,137,89,0.4)" }}>{cfg.hint}</p>
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
                        style={{
                          background: "rgba(162,137,89,0.03)",
                          borderColor: cfg.required ? "rgba(162,137,89,0.18)" : "rgba(162,137,89,0.09)",
                          color: "rgba(162,137,89,0.45)",
                          borderStyle: "dashed",
                        }}>
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
              );
            })}
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
