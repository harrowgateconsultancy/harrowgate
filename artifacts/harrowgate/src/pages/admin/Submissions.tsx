import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

const BG = "#0f2d18";
const GOLD = "#a28959";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }

type Document = { id: number; documentType: string; fileName: string; fileUrl: string; mimeType?: string | null };
type Submission = {
  id: number; name: string; email: string | null; dateOfBirth: string;
  passportNumber: string; status: string; adminNotes: string | null;
  createdAt: string; documents: Document[];
  interviewZoomLink?: string | null; interviewDateTime?: string | null;
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending:              { label: "Pending",              color: GOLD,        bg: "rgba(162,137,89,0.12)" },
  approved:             { label: "Approved",             color: "#4ade80",   bg: "rgba(74,222,128,0.12)" },
  docs_requested:       { label: "Docs Requested",       color: "#fb923c",   bg: "rgba(251,146,60,0.12)" },
  payment_pending:      { label: "Payment Pending",      color: "#fb923c",   bg: "rgba(251,146,60,0.12)" },
  payment_received:     { label: "Receipt Received",     color: "#60a5fa",   bg: "rgba(96,165,250,0.12)" },
  acknowledged:         { label: "Acknowledged",         color: "#4ade80",   bg: "rgba(74,222,128,0.12)" },
  interview_arranged:              { label: "Interview Arranged",    color: "#a78bfa",   bg: "rgba(167,139,250,0.12)" },
  interview_completed:             { label: "Pending Uni Interview",  color: "#4ade80",   bg: "rgba(74,222,128,0.12)" },
  university_interview_arranged:   { label: "Uni Interview Arranged", color: "#38bdf8",  bg: "rgba(56,189,248,0.12)" },
  university_interview_completed:  { label: "Uni Interview Done",    color: "#4ade80",   bg: "rgba(74,222,128,0.12)" },
  rejected:                        { label: "Rejected",              color: "#f87171",   bg: "rgba(248,113,113,0.12)" },
};

const nextActions: Record<string, { label: string; nextStatus: string; color: string; icon: string }[]> = {
  pending: [
    { label: "Approve",                   nextStatus: "approved",        color: "#4ade80", icon: "✅" },
    { label: "Request Additional Docs",   nextStatus: "docs_requested",  color: "#fb923c", icon: "📎" },
    { label: "Reject",                    nextStatus: "rejected",        color: "#f87171", icon: "✕" },
  ],
  approved: [
    { label: "Request Payment",           nextStatus: "payment_pending", color: "#fb923c", icon: "💳" },
  ],
  docs_requested: [
    { label: "Approve",                   nextStatus: "approved",        color: "#4ade80", icon: "✅" },
    { label: "Reject",                    nextStatus: "rejected",        color: "#f87171", icon: "✕" },
  ],
  rejected: [
    { label: "Unreject — Move to Pending", nextStatus: "pending",        color: GOLD,      icon: "↩" },
  ],
  payment_received: [
    { label: "Confirm Payment & Acknowledge", nextStatus: "acknowledged", color: GOLD,     icon: "✅" },
  ],
  interview_arranged: [],
  interview_completed: [],
  university_interview_arranged: [],

  university_interview_completed: [],
};



function isImage(f: string, m?: string | null) { return m?.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(f); }
function isPdf(f: string, m?: string | null) { return m === "application/pdf" || /\.pdf$/i.test(f); }
function fileIcon(f: string, m?: string | null) { return isPdf(f, m) ? "📄" : isImage(f, m) ? "🖼️" : "📎"; }

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

export default function Submissions() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<Submission | null>(null);
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState("all");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadDocType, setUploadDocType] = useState("admin_doc");
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const adminFileRef = useRef<HTMLInputElement | null>(null);
  const [interviewForm, setInterviewForm] = useState<{ zoomLink: string; dateTime: string; notes: string } | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState<number | null>(null);
  const [uniInterviewForm, setUniInterviewForm] = useState<{ platform: "zoom" | "teams"; link: string; dateTime: string; notes: string } | null>(null);
  const [sendingUniInvite, setSendingUniInvite] = useState(false);
  const [uniInviteSent, setUniInviteSent] = useState<number | null>(null);

  const { data: submissions = [], isLoading } = useQuery<Submission[]>({
    queryKey: ["admin-student-submissions"],
    queryFn: async () => {
      const res = await fetch(`${getApiBase()}/api/admin/student-submissions`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: number; status: string; adminNotes?: string }) => {
      const res = await fetch(`${getApiBase()}/api/admin/student-submissions/${id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["admin-student-submissions"] });
      setSelected(prev => prev ? { ...prev, status: updated.status, adminNotes: updated.adminNotes } : null);
    },
  });

  const deleteDoc = useMutation({
    mutationFn: async ({ submissionId, docId }: { submissionId: number; docId: number }) => {
      await fetch(`${getApiBase()}/api/admin/student-submissions/${submissionId}/documents/${docId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-student-submissions"] });
      qc.fetchQuery({ queryKey: ["admin-student-submissions"], queryFn: async () => {
        const res = await fetch(`${getApiBase()}/api/admin/student-submissions`);
        return res.json();
      }}).then((all: Submission[]) => {
        if (selected) { const fresh = all.find(s => s.id === selected.id); if (fresh) setSelected(fresh); }
      });
    },
  });

  const handleSendInvite = async () => {
    if (!selected || !interviewForm) return;
    setSendingInvite(true);
    try {
      const res = await fetch(`${getApiBase()}/api/admin/student-submissions/${selected.id}/send-interview-invite`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(interviewForm),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setInviteSent(selected.id);
      setInterviewForm(null);
      setSelected(prev => prev ? { ...prev, status: updated.status, interviewZoomLink: updated.interviewZoomLink, interviewDateTime: updated.interviewDateTime } : null);
      qc.invalidateQueries({ queryKey: ["admin-student-submissions"] });
    } catch { alert("Failed to send interview invite. Please check the student has an email on file."); }
    finally { setSendingInvite(false); }
  };

  const handleSendUniInvite = async () => {
    if (!selected || !uniInterviewForm) return;
    setSendingUniInvite(true);
    try {
      const res = await fetch(`${getApiBase()}/api/admin/student-submissions/${selected.id}/send-university-interview-invite`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uniInterviewForm),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setUniInviteSent(selected.id);
      setUniInterviewForm(null);
      setSelected(prev => prev ? { ...prev, status: updated.status, uniInterviewLink: updated.uniInterviewLink, uniInterviewDateTime: updated.uniInterviewDateTime, uniInterviewPlatform: updated.uniInterviewPlatform } : null);
      qc.invalidateQueries({ queryKey: ["admin-student-submissions"] });
    } catch { alert("Failed to send university interview invite."); }
    finally { setSendingUniInvite(false); }
  };

  const handleCompleteInterview = async () => {
    if (!selected) return;
    try {
      const res = await fetch(`${getApiBase()}/api/admin/student-submissions/${selected.id}/complete-interview`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setSelected(prev => prev ? { ...prev, status: updated.status } : null);
      qc.invalidateQueries({ queryKey: ["admin-student-submissions"] });
    } catch { alert("Failed to mark interview as completed."); }
  };

  const handleAdminUpload = async (file: File) => {
    if (!selected) return;
    setUploadingDoc(true);
    try {
      const { url } = await uploadToStorage(file);
      const res = await fetch(`${getApiBase()}/api/admin/student-submissions/${selected.id}/documents`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType: uploadDocType, fileName: file.name, fileUrl: url, fileSize: file.size, mimeType: file.type }),
      });
      if (!res.ok) throw new Error("Failed");
      const newDoc: Document = await res.json();
      setSelected(prev => prev ? { ...prev, documents: [...prev.documents, newDoc] } : null);
      qc.invalidateQueries({ queryKey: ["admin-student-submissions"] });
    } catch { alert("Upload failed."); }
    finally { setUploadingDoc(false); if (adminFileRef.current) adminFileRef.current.value = ""; }
  };

  const filtered = filter === "all" ? submissions : submissions.filter(s => s.status === filter);
  const pendingCount = submissions.filter(s => ["pending", "payment_received"].includes(s.status)).length;

  const viewUrl = (doc: Document) => `${getApiBase()}/api/admin/student-submissions/${selected?.id}/documents/${doc.id}/view`;
  const downloadUrl = (doc: Document) => `${getApiBase()}/api/admin/student-submissions/${selected?.id}/documents/${doc.id}/download`;

  const filterKeys = ["all", "pending", "approved", "docs_requested", "payment_pending", "payment_received", "acknowledged", "rejected"];

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(162,137,89,0.15)" }}>
        <div className="flex items-center gap-4">
          <button onClick={() => setLocation("/admin")} className="text-sm transition-opacity hover:opacity-70" style={{ color: "rgba(162,137,89,0.5)" }}>← Back</button>
          <img src="/harrowgate-logo.png" alt="HARROWGATE" className="h-10 object-contain" />
          <span className="text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full" style={{ background: "rgba(162,137,89,0.1)", color: GOLD }}>Admin Panel</span>
        </div>
        <a href={`${BASE}/admin`} className="text-xs transition-opacity hover:opacity-70" style={{ color: "rgba(162,137,89,0.5)" }}>Consultant Portal →</a>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: GOLD }}>Student Submissions</h1>
            <p className="text-sm" style={{ color: "rgba(162,137,89,0.55)" }}>{submissions.length} total · {pendingCount} requiring action</p>
          </div>
          {pendingCount > 0 && (
            <div className="px-4 py-2 rounded-full text-sm font-semibold" style={{ background: "rgba(251,146,60,0.12)", color: "#fb923c" }}>
              ⚡ {pendingCount} need{pendingCount === 1 ? "s" : ""} your attention
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {filterKeys.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold border transition-all"
              style={filter === f ? { background: GOLD, color: BG, borderColor: GOLD } : { background: "transparent", color: "rgba(162,137,89,0.55)", borderColor: "rgba(162,137,89,0.18)" }}>
              {f === "all" ? "All" : (statusConfig[f]?.label || f)}
              {f !== "all" && <span className="ml-1.5 opacity-50">{submissions.filter(s => s.status === f).length}</span>}
            </button>
          ))}
        </div>

        {isLoading && <div className="text-center py-20"><div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-3" style={{ borderColor: GOLD, borderTopColor: "transparent" }} /></div>}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 rounded-2xl border" style={{ borderColor: "rgba(162,137,89,0.08)" }}>
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm" style={{ color: "rgba(162,137,89,0.4)" }}>No submissions</p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map(s => {
            const sc = statusConfig[s.status] || { label: s.status, color: GOLD, bg: "rgba(162,137,89,0.12)" };
            const hasAction = (nextActions[s.status]?.length ?? 0) > 0;
            const docCount = s.documents.filter(d => !d.documentType.startsWith("admin_") && d.documentType !== "payment_receipt").length;
            const receiptDoc = s.documents.find(d => d.documentType === "payment_receipt");
            return (
              <div key={s.id} className="rounded-2xl border transition-all cursor-pointer"
                style={{ background: "rgba(0,0,0,0.2)", borderColor: hasAction ? "rgba(251,146,60,0.28)" : "rgba(162,137,89,0.12)" }}
                onClick={() => { setSelected(s); setNotes(s.adminNotes || ""); setPreviewDoc(null); setInterviewForm(null); setInviteSent(null); }}>
                <div className="px-6 py-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-base font-semibold" style={{ color: GOLD }}>{s.name}</span>
                      {hasAction && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(251,146,60,0.1)", color: "#fb923c" }}>Action needed</span>}
                    </div>
                    <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: "rgba(162,137,89,0.45)" }}>
                      {s.email && <span>{s.email}</span>}
                      <span>DOB: {s.dateOfBirth}</span>
                      <span>Passport: {s.passportNumber}</span>
                      <span>{docCount} doc{docCount !== 1 ? "s" : ""}</span>
                      <span>{new Date(s.createdAt).toLocaleDateString("en-GB")}</span>
                    </div>
                  </div>
                  {receiptDoc && (
                    <a
                      href={`${getApiBase()}/api/admin/student-submissions/${s.id}/documents/${receiptDoc.id}/view`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0 transition-all hover:opacity-80"
                      style={{ borderColor: "rgba(96,165,250,0.3)", color: "#60a5fa", background: "rgba(96,165,250,0.06)" }}>
                      💳 Receipt ↗
                    </a>
                  )}
                  <span className="px-3 py-1 rounded-full text-xs font-semibold shrink-0" style={{ color: sc.color, background: sc.bg }}>{sc.label}</span>
                  <span style={{ color: "rgba(162,137,89,0.25)" }}>›</span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}
          onClick={e => { if (e.target === e.currentTarget) { setSelected(null); setPreviewDoc(null); } }}>
          <div className="w-full max-w-3xl rounded-3xl border flex flex-col" style={{ background: "#0a1f0e", borderColor: "rgba(162,137,89,0.18)", maxHeight: "92vh" }}>

            <div className="px-6 py-5 border-b flex items-center justify-between shrink-0" style={{ borderColor: "rgba(162,137,89,0.12)" }}>
              <div>
                <h2 className="text-lg font-bold" style={{ color: GOLD }}>{selected.name}</h2>
                <p className="text-xs" style={{ color: "rgba(162,137,89,0.45)" }}>{selected.email} · {selected.passportNumber} · DOB {selected.dateOfBirth}</p>
              </div>
              <div className="flex items-center gap-3">
                {["payment_received", "acknowledged"].includes(selected.status) && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border" style={{ borderColor: "rgba(74,222,128,0.25)", background: "rgba(74,222,128,0.07)" }}>
                    <span className="text-xs font-medium" style={{ color: "rgba(74,222,128,0.55)" }}>Code</span>
                    <span className="text-sm font-bold tracking-widest font-mono" style={{ color: "#4ade80" }}>
                      STU{selected.passportNumber.slice(-4).toUpperCase()}
                    </span>
                  </div>
                )}
                {statusConfig[selected.status] && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ color: statusConfig[selected.status].color, background: statusConfig[selected.status].bg }}>
                    {statusConfig[selected.status].label}
                  </span>
                )}
                <button onClick={() => { setSelected(null); setPreviewDoc(null); }} className="text-2xl leading-none" style={{ color: "rgba(162,137,89,0.35)" }}>×</button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Inline preview */}
              {previewDoc && (
                <div className="mx-6 mt-5 rounded-2xl border overflow-hidden" style={{ borderColor: "rgba(162,137,89,0.15)", background: "rgba(0,0,0,0.3)" }}>
                  <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "rgba(162,137,89,0.1)" }}>
                    <span className="text-sm font-medium truncate max-w-xs" style={{ color: GOLD }}>{previewDoc.fileName}</span>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <a href={viewUrl(previewDoc)} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 rounded-full border hover:opacity-80"
                        style={{ borderColor: "rgba(162,137,89,0.25)", color: GOLD }}>Open full ↗</a>
                      <a href={downloadUrl(previewDoc)} download={previewDoc.fileName}
                        className="text-xs px-3 py-1.5 rounded-full border hover:opacity-80"
                        style={{ borderColor: "rgba(162,137,89,0.25)", color: GOLD }}>↓ Download</a>
                      <button onClick={() => setPreviewDoc(null)} className="text-lg leading-none ml-1" style={{ color: "rgba(162,137,89,0.35)" }}>×</button>
                    </div>
                  </div>
                  <div className="p-2" style={{ minHeight: 260 }}>
                    {isImage(previewDoc.fileName, previewDoc.mimeType) ? (
                      <img src={viewUrl(previewDoc)} alt={previewDoc.fileName} className="max-w-full mx-auto rounded-xl" style={{ maxHeight: 420, objectFit: "contain" }} />
                    ) : isPdf(previewDoc.fileName, previewDoc.mimeType) ? (
                      <iframe src={viewUrl(previewDoc)} className="w-full rounded-xl" style={{ height: 420, border: "none" }} title={previewDoc.fileName} />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <span className="text-5xl">📎</span>
                        <a href={downloadUrl(previewDoc)} download={previewDoc.fileName}
                          className="px-5 py-2 rounded-full text-sm font-semibold" style={{ background: GOLD, color: BG }}>
                          ↓ Download to view
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="px-6 py-5 space-y-6">
                {/* Documents */}
                <div>
                  <p className="text-sm font-semibold mb-3" style={{ color: GOLD }}>Documents ({selected.documents.length})</p>
                  {selected.documents.length === 0 && (
                    <div className="rounded-xl py-6 text-center border" style={{ borderColor: "rgba(162,137,89,0.08)" }}>
                      <p className="text-sm" style={{ color: "rgba(162,137,89,0.35)" }}>No documents uploaded yet</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    {selected.documents.filter(d => !d.documentType.startsWith("admin_") && d.documentType !== "payment_receipt").map(doc => (
                      <DocRow key={doc.id} doc={doc} label={doc.documentType.replace("_", " ").toUpperCase()}
                        onPreview={() => setPreviewDoc(previewDoc?.id === doc.id ? null : doc)}
                        onDownload={() => window.open(downloadUrl(doc), "_blank")}
                        onDelete={() => { if (confirm(`Delete "${doc.fileName}"?`)) deleteDoc.mutate({ submissionId: selected.id, docId: doc.id }); }}
                        isActive={previewDoc?.id === doc.id}
                        tagColor="rgba(162,137,89,0.18)" tagTextColor={GOLD} tag="Student" />
                    ))}
                    {selected.documents.filter(d => d.documentType === "payment_receipt").map(doc => (
                      <DocRow key={doc.id} doc={doc} label="Payment Receipt"
                        onPreview={() => setPreviewDoc(previewDoc?.id === doc.id ? null : doc)}
                        onDownload={() => window.open(downloadUrl(doc), "_blank")}
                        onDelete={() => { if (confirm(`Delete "${doc.fileName}"?`)) deleteDoc.mutate({ submissionId: selected.id, docId: doc.id }); }}
                        isActive={previewDoc?.id === doc.id}
                        tagColor="rgba(96,165,250,0.18)" tagTextColor="#60a5fa" tag="Receipt" />
                    ))}
                    {selected.documents.filter(d => d.documentType.startsWith("admin_")).map(doc => (
                      <DocRow key={doc.id} doc={doc} label={doc.documentType === "admin_doc" ? "Admin Document" : doc.documentType.replace("admin_", "").replace("_", " ")}
                        onPreview={() => setPreviewDoc(previewDoc?.id === doc.id ? null : doc)}
                        onDownload={() => window.open(downloadUrl(doc), "_blank")}
                        onDelete={() => { if (confirm(`Delete "${doc.fileName}"?`)) deleteDoc.mutate({ submissionId: selected.id, docId: doc.id }); }}
                        isActive={previewDoc?.id === doc.id}
                        tagColor="rgba(74,222,128,0.15)" tagTextColor="#4ade80" tag="Admin" />
                    ))}
                  </div>
                </div>

                {/* Attach document */}
                <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(162,137,89,0.12)" }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(162,137,89,0.08)" }}>
                    <p className="text-sm font-semibold" style={{ color: GOLD }}>Attach Document</p>
                  </div>
                  <div className="px-4 py-4 flex items-center gap-3 flex-wrap">
                    <select value={uploadDocType} onChange={e => setUploadDocType(e.target.value)}
                      className="rounded-xl px-3 py-2 text-xs border outline-none"
                      style={{ background: "rgba(162,137,89,0.06)", borderColor: "rgba(162,137,89,0.18)", color: GOLD }}>
                      <option value="admin_doc">Admin Document</option>
                      <option value="admin_form">Application Form</option>
                      <option value="admin_approval">Approval Letter</option>
                      <option value="admin_other">Other</option>
                    </select>
                    <button onClick={() => adminFileRef.current?.click()} disabled={uploadingDoc}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                      style={{ background: "rgba(162,137,89,0.08)", borderColor: "rgba(162,137,89,0.22)", color: GOLD }}>
                      {uploadingDoc
                        ? <><span className="w-3 h-3 rounded-full border border-t-transparent animate-spin inline-block" style={{ borderColor: GOLD, borderTopColor: "transparent" }} /> Uploading…</>
                        : <>📎 Choose file…</>}
                    </button>
                    <input ref={adminFileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleAdminUpload(f); }} />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: GOLD }}>Notes for Student</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Optional note visible to the student on their portal…" rows={3}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none border resize-none"
                    style={{ background: "rgba(162,137,89,0.05)", borderColor: "rgba(162,137,89,0.12)", color: GOLD }} />
                </div>

                {/* Status action buttons */}
                {nextActions[selected.status] && (
                  <div className="grid grid-cols-1 gap-2">
                    {nextActions[selected.status].map(action => (
                      <button key={action.nextStatus}
                        onClick={() => updateStatus.mutate({ id: selected.id, status: action.nextStatus, adminNotes: notes })}
                        disabled={updateStatus.isPending}
                        className="py-3 rounded-xl text-sm font-semibold border transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ background: `${action.color}12`, borderColor: `${action.color}35`, color: action.color }}>
                        <span>{action.icon}</span>
                        {updateStatus.isPending ? "Updating…" : action.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Mock Interview — Schedule (acknowledged only) */}
                {selected.status === "acknowledged" && (
                  <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(96,165,250,0.18)" }}>
                    <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "rgba(96,165,250,0.12)" }}>
                      <p className="text-sm font-semibold" style={{ color: "#60a5fa" }}>🎥 Mock Interview</p>
                      {inviteSent === selected.id && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>✓ Invite sent</span>
                      )}
                    </div>
                    <div className="px-4 py-4">
                      {!interviewForm ? (
                        <button onClick={() => setInterviewForm({ zoomLink: "", dateTime: "", notes: "" })}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 flex items-center justify-center gap-2"
                          style={{ background: "rgba(96,165,250,0.06)", borderColor: "rgba(96,165,250,0.22)", color: "#60a5fa" }}>
                          🎥 Schedule Mock Interview
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: "rgba(96,165,250,0.6)" }}>Zoom Meeting Link *</label>
                            <input type="url" placeholder="https://zoom.us/j/..."
                              value={interviewForm.zoomLink}
                              onChange={e => setInterviewForm(f => f ? { ...f, zoomLink: e.target.value } : f)}
                              className="w-full rounded-xl px-3 py-2 text-sm outline-none border"
                              style={{ background: "rgba(96,165,250,0.05)", borderColor: "rgba(96,165,250,0.2)", color: "#60a5fa" }} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: "rgba(96,165,250,0.6)" }}>Date &amp; Time *</label>
                            <input type="text" placeholder="e.g. Thursday, 29 May 2026 at 2:00 PM HKT"
                              value={interviewForm.dateTime}
                              onChange={e => setInterviewForm(f => f ? { ...f, dateTime: e.target.value } : f)}
                              className="w-full rounded-xl px-3 py-2 text-sm outline-none border"
                              style={{ background: "rgba(96,165,250,0.05)", borderColor: "rgba(96,165,250,0.2)", color: "#60a5fa" }} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: "rgba(96,165,250,0.6)" }}>Additional Notes (optional)</label>
                            <textarea rows={2} placeholder="Any instructions for the student…"
                              value={interviewForm.notes}
                              onChange={e => setInterviewForm(f => f ? { ...f, notes: e.target.value } : f)}
                              className="w-full rounded-xl px-3 py-2 text-sm outline-none border resize-none"
                              style={{ background: "rgba(96,165,250,0.05)", borderColor: "rgba(96,165,250,0.2)", color: "#60a5fa" }} />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={handleSendInvite} disabled={sendingInvite || !interviewForm.zoomLink || !interviewForm.dateTime}
                              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                              style={{ background: "rgba(96,165,250,0.1)", borderColor: "rgba(96,165,250,0.3)", color: "#60a5fa" }}>
                              {sendingInvite ? <><span className="w-3 h-3 rounded-full border border-t-transparent animate-spin" style={{ borderColor: "#60a5fa", borderTopColor: "transparent" }} /> Sending…</> : "📧 Send Zoom Invite"}
                            </button>
                            <button onClick={() => setInterviewForm(null)}
                              className="px-4 py-2.5 rounded-xl text-sm border transition-all hover:opacity-70"
                              style={{ borderColor: "rgba(162,137,89,0.15)", color: "rgba(162,137,89,0.4)" }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Mock Interview — Confirm Completed (interview_arranged only) */}
                {selected.status === "interview_arranged" && (
                  <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(167,139,250,0.2)" }}>
                    <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(167,139,250,0.12)" }}>
                      <p className="text-sm font-semibold" style={{ color: "#a78bfa" }}>🎥 Mock Interview — Arranged</p>
                    </div>
                    <div className="px-4 py-4 space-y-3">
                      {selected.interviewDateTime && (
                        <div className="rounded-xl px-3 py-2 border text-sm" style={{ background: "rgba(167,139,250,0.05)", borderColor: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>
                          📅 {selected.interviewDateTime}
                        </div>
                      )}
                      {selected.interviewZoomLink && (
                        <a href={selected.interviewZoomLink} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-xl px-3 py-2 border text-sm truncate hover:opacity-80 transition-opacity"
                          style={{ background: "rgba(167,139,250,0.05)", borderColor: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>
                          🔗 {selected.interviewZoomLink}
                        </a>
                      )}
                      <button onClick={handleCompleteInterview}
                        className="w-full py-3 rounded-xl text-sm font-semibold border transition-all hover:opacity-90 flex items-center justify-center gap-2"
                        style={{ background: "rgba(74,222,128,0.08)", borderColor: "rgba(74,222,128,0.28)", color: "#4ade80" }}>
                        ✅ Confirm Interview Completed
                      </button>
                    </div>
                  </div>
                )}

                {/* University Interview — Schedule (interview_completed only) */}
                {selected.status === "interview_completed" && (
                  <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(56,189,248,0.2)" }}>
                    <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "rgba(56,189,248,0.12)" }}>
                      <p className="text-sm font-semibold" style={{ color: "#38bdf8" }}>🏫 University Interview</p>
                      {uniInviteSent === selected.id && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>✓ Invite sent</span>
                      )}
                    </div>
                    <div className="px-4 py-4">
                      {!uniInterviewForm ? (
                        <button onClick={() => setUniInterviewForm({ platform: "zoom", link: "", dateTime: "", notes: "" })}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 flex items-center justify-center gap-2"
                          style={{ background: "rgba(56,189,248,0.06)", borderColor: "rgba(56,189,248,0.22)", color: "#38bdf8" }}>
                          🏫 Schedule University Interview
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: "rgba(56,189,248,0.6)" }}>Platform *</label>
                            <div className="flex gap-2">
                              {(["zoom", "teams"] as const).map(p => (
                                <button key={p} onClick={() => setUniInterviewForm(f => f ? { ...f, platform: p } : f)}
                                  className="flex-1 py-2 rounded-xl text-sm font-semibold border transition-all"
                                  style={{
                                    background: uniInterviewForm.platform === p ? "rgba(56,189,248,0.12)" : "rgba(56,189,248,0.03)",
                                    borderColor: uniInterviewForm.platform === p ? "rgba(56,189,248,0.4)" : "rgba(56,189,248,0.12)",
                                    color: "#38bdf8",
                                  }}>
                                  {p === "zoom" ? "🎥 Zoom" : "💼 Teams"}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: "rgba(56,189,248,0.6)" }}>Meeting Link *</label>
                            <input type="url" placeholder={uniInterviewForm.platform === "teams" ? "https://teams.microsoft.com/l/meetup-join/..." : "https://zoom.us/j/..."}
                              value={uniInterviewForm.link}
                              onChange={e => setUniInterviewForm(f => f ? { ...f, link: e.target.value } : f)}
                              className="w-full rounded-xl px-3 py-2 text-sm outline-none border"
                              style={{ background: "rgba(56,189,248,0.05)", borderColor: "rgba(56,189,248,0.2)", color: "#38bdf8" }} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: "rgba(56,189,248,0.6)" }}>Date & Time *</label>
                            <input type="text" placeholder="e.g. Monday, 2 June 2026 at 10:00 AM HKT"
                              value={uniInterviewForm.dateTime}
                              onChange={e => setUniInterviewForm(f => f ? { ...f, dateTime: e.target.value } : f)}
                              className="w-full rounded-xl px-3 py-2 text-sm outline-none border"
                              style={{ background: "rgba(56,189,248,0.05)", borderColor: "rgba(56,189,248,0.2)", color: "#38bdf8" }} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: "rgba(56,189,248,0.6)" }}>Additional Notes (optional)</label>
                            <textarea rows={2} placeholder="Any instructions for the student…"
                              value={uniInterviewForm.notes}
                              onChange={e => setUniInterviewForm(f => f ? { ...f, notes: e.target.value } : f)}
                              className="w-full rounded-xl px-3 py-2 text-sm outline-none border resize-none"
                              style={{ background: "rgba(56,189,248,0.05)", borderColor: "rgba(56,189,248,0.2)", color: "#38bdf8" }} />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={handleSendUniInvite} disabled={sendingUniInvite || !uniInterviewForm.link || !uniInterviewForm.dateTime}
                              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                              style={{ background: "rgba(56,189,248,0.1)", borderColor: "rgba(56,189,248,0.3)", color: "#38bdf8" }}>
                              {sendingUniInvite ? <><span className="w-3 h-3 rounded-full border animate-spin" style={{ borderColor: "#38bdf8", borderTopColor: "transparent" }} /> Sending…</> : "📧 Send Interview Invite"}
                            </button>
                            <button onClick={() => setUniInterviewForm(null)}
                              className="px-4 py-2.5 rounded-xl text-sm border transition-all hover:opacity-70"
                              style={{ borderColor: "rgba(162,137,89,0.15)", color: "rgba(162,137,89,0.4)" }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* University Interview — Arranged (awaiting student) */}
                {selected.status === "university_interview_arranged" && (
                  <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(56,189,248,0.2)" }}>
                    <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(56,189,248,0.12)" }}>
                      <p className="text-sm font-semibold" style={{ color: "#38bdf8" }}>🏫 University Interview — Arranged</p>
                    </div>
                    <div className="px-4 py-4 space-y-3">
                      {selected.uniInterviewPlatform && (
                        <div className="rounded-xl px-3 py-2 border text-sm" style={{ background: "rgba(56,189,248,0.05)", borderColor: "rgba(56,189,248,0.15)", color: "#38bdf8" }}>
                          {selected.uniInterviewPlatform === "teams" ? "💼 Microsoft Teams" : "🎥 Zoom"}
                        </div>
                      )}
                      {selected.uniInterviewDateTime && (
                        <div className="rounded-xl px-3 py-2 border text-sm" style={{ background: "rgba(56,189,248,0.05)", borderColor: "rgba(56,189,248,0.15)", color: "#38bdf8" }}>
                          📅 {selected.uniInterviewDateTime}
                        </div>
                      )}
                      {selected.uniInterviewLink && (
                        <a href={selected.uniInterviewLink} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-xl px-3 py-2 border text-sm truncate hover:opacity-80 transition-opacity"
                          style={{ background: "rgba(56,189,248,0.05)", borderColor: "rgba(56,189,248,0.15)", color: "#38bdf8" }}>
                          🔗 {selected.uniInterviewLink}
                        </a>
                      )}
                      <p className="text-xs text-center py-1" style={{ color: "rgba(56,189,248,0.45)" }}>
                        Awaiting student to confirm completion
                      </p>
                    </div>
                  </div>
                )}

                {/* Save notes */}
                <button onClick={() => updateStatus.mutate({ id: selected.id, status: selected.status, adminNotes: notes })}
                  disabled={updateStatus.isPending}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold border transition-all hover:opacity-80 disabled:opacity-50"
                  style={{ borderColor: "rgba(162,137,89,0.18)", color: "rgba(162,137,89,0.55)" }}>
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocRow({ doc, label, onPreview, onDownload, onDelete, isActive, tagColor, tagTextColor, tag }: {
  doc: Document; label: string; onPreview: () => void; onDownload: () => void; onDelete: () => void;
  isActive: boolean; tagColor: string; tagTextColor: string; tag: string;
}) {
  return (
    <div className="rounded-xl border transition-all" style={{ background: isActive ? "rgba(162,137,89,0.07)" : "rgba(162,137,89,0.03)", borderColor: isActive ? "rgba(162,137,89,0.28)" : "rgba(162,137,89,0.1)" }}>
      <div className="px-4 py-3 flex items-center gap-3">
        <span className="text-xl shrink-0">{fileIcon(doc.fileName, doc.mimeType)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: GOLD }}>{doc.fileName}</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(162,137,89,0.45)" }}>{label}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium" style={{ background: tagColor, color: tagTextColor }}>{tag}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onPreview} className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-80"
            style={{ background: isActive ? "rgba(162,137,89,0.15)" : "transparent", borderColor: "rgba(162,137,89,0.2)", color: GOLD }}>
            {isActive ? "Hide" : "View"}
          </button>
          <button onClick={onDownload} className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-80"
            style={{ borderColor: "rgba(162,137,89,0.2)", color: GOLD }}>↓</button>
          <button onClick={onDelete} className="px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-80"
            style={{ borderColor: "rgba(248,113,113,0.2)", color: "#f87171" }}>✕</button>
        </div>
      </div>
    </div>
  );
}
