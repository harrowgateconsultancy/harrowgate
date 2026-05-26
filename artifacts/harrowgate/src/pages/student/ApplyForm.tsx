import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useSession } from "@clerk/react";

const BG = "#0b2213";
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
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
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

  const requiredFilled = [surname.trim(), givenName.trim(), dob, passport.trim()].every(Boolean);
  const requiredDocs = DOC_CONFIG.filter(c => c.required).length;
  const uploadedRequired = DOC_CONFIG.filter((c, i) => c.required && docs[i].url).length;
  const allRequiredUploaded = uploadedRequired === requiredDocs;

  return (
    <div>
      <button
        onClick={() => setLocation("/")}
        className="inline-flex items-center gap-1.5 text-sm mb-8 transition-opacity hover:opacity-70"
        style={{ color: "rgba(162,137,89,0.45)" }}
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M9.78 12.78a.75.75 0 01-1.06 0L4.47 8.53a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L6.06 8l3.72 3.72a.75.75 0 010 1.06z" clipRule="evenodd" />
        </svg>
        Back to Home
      </button>

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.25em] uppercase mb-3" style={{ color: "rgba(162,137,89,0.4)" }}>
          Student Portal
        </p>
        <h1 className="text-3xl font-bold mb-3" style={{ color: GOLD }}>Start Your Application</h1>
        <p className="text-sm leading-relaxed" style={{ color: "rgba(162,137,89,0.55)" }}>
          Complete the form below to begin your Hong Kong student visa application.<br />
          Fields marked <span style={{ color: GOLD }}>*</span> are required.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 border" style={{ background: "rgba(0,0,0,0.2)", borderColor: requiredFilled ? "rgba(74,222,128,0.2)" : "rgba(162,137,89,0.1)" }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: requiredFilled ? "rgba(74,222,128,0.15)" : "rgba(162,137,89,0.08)" }}>
              {requiredFilled
                ? <svg viewBox="0 0 12 12" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" className="w-3 h-3"><polyline points="1.5,6 4.5,9 10.5,3"/></svg>
                : <span className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(162,137,89,0.3)" }} />}
            </div>
            <p className="text-xs font-semibold" style={{ color: requiredFilled ? "#4ade80" : GOLD }}>Personal Details</p>
          </div>
          <p className="text-xs pl-7" style={{ color: "rgba(162,137,89,0.4)" }}>
            {requiredFilled ? "Complete" : "Fill in your name, DOB & passport"}
          </p>
        </div>
        <div className="rounded-2xl p-4 border" style={{ background: "rgba(0,0,0,0.2)", borderColor: allRequiredUploaded ? "rgba(74,222,128,0.2)" : "rgba(162,137,89,0.1)" }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: allRequiredUploaded ? "rgba(74,222,128,0.15)" : "rgba(162,137,89,0.08)" }}>
              {allRequiredUploaded
                ? <svg viewBox="0 0 12 12" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" className="w-3 h-3"><polyline points="1.5,6 4.5,9 10.5,3"/></svg>
                : <span className="text-xs font-bold" style={{ color: GOLD, fontSize: 9 }}>{uploadedRequired}/{requiredDocs}</span>}
            </div>
            <p className="text-xs font-semibold" style={{ color: allRequiredUploaded ? "#4ade80" : GOLD }}>Documents</p>
          </div>
          <p className="text-xs pl-7" style={{ color: "rgba(162,137,89,0.4)" }}>
            {allRequiredUploaded ? "All required docs uploaded" : `${uploadedRequired} of ${requiredDocs} required uploaded`}
          </p>
        </div>
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
                        <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0" style={{ color: GOLD }}>
                          <path fillRule="evenodd" d="M14.5 13.5V6.5a1 1 0 00-1-1H2.5a1 1 0 00-1 1v7a1 1 0 001 1h11a1 1 0 001-1zm-11.5-7h9v6h-9v-6zm5.5-4a.75.75 0 00-1.5 0v2.5h1.5V2.5z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm flex-1 truncate" style={{ color: GOLD }}>{doc.name}</span>
                        <button type="button" onClick={() => { setDocs(prev => { const n = [...prev]; n[i] = emptyUpload(); return n; }); }}
                          className="text-xs px-3 py-1 rounded-full border transition-all hover:opacity-80"
                          style={{ borderColor: "rgba(162,137,89,0.25)", color: "rgba(162,137,89,0.55)" }}>
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => !doc.uploading && inputRefs.current[i]?.click()}
                        onDragOver={e => { e.preventDefault(); if (!doc.uploading) setDragOverIndex(i); }}
                        onDragEnter={e => { e.preventDefault(); if (!doc.uploading) setDragOverIndex(i); }}
                        onDragLeave={e => { e.preventDefault(); setDragOverIndex(null); }}
                        onDrop={e => {
                          e.preventDefault();
                          setDragOverIndex(null);
                          if (doc.uploading) return;
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleFileChange(i, file);
                        }}
                        className="w-full rounded-xl px-4 py-2.5 border text-sm text-left transition-all flex items-center gap-2 select-none"
                        style={{
                          background: dragOverIndex === i ? "rgba(162,137,89,0.1)" : "rgba(162,137,89,0.03)",
                          borderColor: dragOverIndex === i
                            ? GOLD
                            : cfg.required ? "rgba(162,137,89,0.18)" : "rgba(162,137,89,0.09)",
                          color: dragOverIndex === i ? GOLD : "rgba(162,137,89,0.45)",
                          borderStyle: "dashed",
                          cursor: doc.uploading ? "not-allowed" : "pointer",
                          transform: dragOverIndex === i ? "scale(1.01)" : "scale(1)",
                          boxShadow: dragOverIndex === i ? `0 0 12px rgba(162,137,89,0.1)` : "none",
                        }}>
                        {doc.uploading ? (
                          <><span className="w-3 h-3 rounded-full border border-t-transparent animate-spin shrink-0" style={{ borderColor: GOLD, borderTopColor: "transparent" }} /> Uploading…</>
                        ) : dragOverIndex === i ? (
                          <><svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }}><path fillRule="evenodd" d="M8 1a.75.75 0 01.75.75v5.69l1.97-1.97a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 6.53a.75.75 0 011.06-1.06L7.25 7.44V1.75A.75.75 0 018 1zM1.75 14a.75.75 0 000 1.5h12.5a.75.75 0 000-1.5H1.75z" clipRule="evenodd" /></svg> Drop file here</>
                        ) : (
                          <><svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0"><path fillRule="evenodd" d="M13.5 3.5a2 2 0 00-2-2h-8a2 2 0 00-2 2v8.5a2 2 0 002 2h8a2 2 0 002-2V3.5zm-2 0h-8v8.5h8V3.5z" clipRule="evenodd" /></svg> Drag & drop or click to upload</>
                        )}
                      </div>
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
          className="w-full py-4 rounded-2xl text-base font-semibold transition-all hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: GOLD, color: BG, boxShadow: "0 8px 24px rgba(162,137,89,0.25)" }}>
          {submitting
            ? <><span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: BG, borderTopColor: "transparent" }} /> Submitting…</>
            : <>Submit Application →</>}
        </button>
      </form>
    </div>
  );
}
