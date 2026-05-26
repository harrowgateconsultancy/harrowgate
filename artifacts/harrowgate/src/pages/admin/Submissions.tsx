import { useState, useRef, useEffect } from "react";
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
  uniInterviewLink?: string | null; uniInterviewDateTime?: string | null; uniInterviewPlatform?: string | null;
  additionalDocsRequested?: boolean | null; additionalDocsRequestNote?: string | null;
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending:              { label: "Pending",              color: GOLD,        bg: "rgba(162,137,89,0.12)" },
  approved:             { label: "Approved",             color: "#4ade80",   bg: "rgba(74,222,128,0.12)" },
  docs_requested:       { label: "Docs Requested",       color: "#fb923c",   bg: "rgba(251,146,60,0.12)" },
  payment_pending:      { label: "Payment Pending",      color: "#fb923c",   bg: "rgba(251,146,60,0.12)" },
  payment_received:     { label: "Receipt Received",     color: "#60a5fa",   bg: "rgba(96,165,250,0.12)" },
  acknowledged:         { label: "Acknowledged",         color: "#4ade80",   bg: "rgba(74,222,128,0.12)" },
  interview_arranged:              { label: "Interview Arranged",    color: "#a78bfa",   bg: "rgba(167,139,250,0.12)" },
  interview_completed:             { label: "Mock Interview Done",    color: "#4ade80",   bg: "rgba(74,222,128,0.12)" },
  second_payment_pending:          { label: "2nd Payment Pending",   color: "#fb923c",   bg: "rgba(251,146,60,0.12)" },
  second_payment_received:         { label: "2nd Receipt Received",  color: "#60a5fa",   bg: "rgba(96,165,250,0.12)" },
  second_payment_confirmed:        { label: "2nd Payment Confirmed", color: "#4ade80",   bg: "rgba(74,222,128,0.12)" },
  university_interview_arranged:   { label: "Uni Interview Arranged", color: "#38bdf8",  bg: "rgba(56,189,248,0.12)" },
  university_interview_completed:  { label: "Uni Interview Done",    color: "#4ade80",   bg: "rgba(74,222,128,0.12)" },
  offer_letter_pending:            { label: "Offer Letter Sent",      color: "#f0abfc",   bg: "rgba(240,171,252,0.12)" },
  final_payment_received:          { label: "Final Receipt Received", color: "#60a5fa",   bg: "rgba(96,165,250,0.12)"  },
  final_payment_confirmed:         { label: "Final Payment Done",     color: "#4ade80",   bg: "rgba(74,222,128,0.12)"  },
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
  interview_completed: [
    { label: "Request 2nd Payment", nextStatus: "second_payment_pending", color: "#fb923c", icon: "💳" },
  ],
  second_payment_pending: [],
  second_payment_received: [
    { label: "Confirm 2nd Payment", nextStatus: "second_payment_confirmed", color: "#4ade80", icon: "✅" },
  ],
  second_payment_confirmed: [],
  university_interview_arranged: [],
  university_interview_completed: [],
  offer_letter_pending: [],
  final_payment_received: [
    { label: "Confirm Final Payment", nextStatus: "final_payment_confirmed", color: "#4ade80", icon: "✅" },
  ],
  final_payment_confirmed: [],
};



function isImage(f: string, m?: string | null) { return m?.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(f); }
function isPdf(f: string, m?: string | null) { return m === "application/pdf" || /\.pdf$/i.test(f); }
function fileIcon(f: string, m?: string | null) { return isPdf(f, m) ? "📄" : isImage(f, m) ? "🖼️" : "📎"; }
function getDocMeta(dt: string): { label: string; tagColor: string; tagText: string; tag: string } {
  if (dt === "payment_receipt")       return { label: "Payment Receipt",       tagColor: "rgba(96,165,250,0.18)",  tagText: "#60a5fa", tag: "Receipt"       };
  if (dt === "second_payment_receipt") return { label: "2nd Payment Receipt",  tagColor: "rgba(96,165,250,0.18)",  tagText: "#60a5fa", tag: "2nd Receipt"   };
  if (dt === "additional_doc")        return { label: "Additional Document",   tagColor: "rgba(251,146,60,0.18)",  tagText: "#fb923c", tag: "Additional"    };
  if (dt === "offer_letter")          return { label: "Offer Letter",          tagColor: "rgba(240,171,252,0.18)", tagText: "#f0abfc", tag: "Offer Letter"  };
  if (dt === "final_payment_receipt") return { label: "Final Payment Receipt", tagColor: "rgba(96,165,250,0.18)",  tagText: "#60a5fa", tag: "Final Receipt" };
  if (dt.startsWith("admin_"))        return { label: dt === "admin_doc" ? "Admin Document" : dt.replace("admin_", "").replace("_", " "), tagColor: "rgba(74,222,128,0.15)", tagText: "#4ade80", tag: "Admin" };
  return { label: dt.replace(/_/g, " ").toUpperCase(), tagColor: "rgba(162,137,89,0.18)", tagText: GOLD, tag: "Student" };
}

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
  const [additionalDocsForm, setAdditionalDocsForm] = useState<{ note: string } | null>(null);
  const [sendingAdditionalDocs, setSendingAdditionalDocs] = useState(false);
  const [additionalDocsSent, setAdditionalDocsSent] = useState<number | null>(null);
  const [offerLetterUploading, setOfferLetterUploading] = useState(false);
  const [offerLetterSent, setOfferLetterSent] = useState<number | null>(null);
  const offerLetterFileRef = useRef<HTMLInputElement | null>(null);
  const [id995aOpen, setId995aOpen] = useState(false);
  const [messageForm, setMessageForm] = useState<{ subject: string; body: string; attachments: Array<{fileName: string; fileUrl: string; mimeType?: string}> } | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState<number | null>(null);
  const [adminMessages, setAdminMessages] = useState<any[]>([]);
  const [uploadingMsgAttachment, setUploadingMsgAttachment] = useState(false);
  const msgAttachmentRef = useRef<HTMLInputElement | null>(null);

  const loadAdminMessages = async (id: number) => {
    try {
      const res = await fetch(`${getApiBase()}/api/admin/student-submissions/${id}/messages`);
      if (res.ok) setAdminMessages(await res.json());
      else setAdminMessages([]);
    } catch { setAdminMessages([]); }
  };

  const handleSendMessage = async () => {
    if (!selected || !messageForm) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`${getApiBase()}/api/admin/student-submissions/${selected.id}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageForm),
      });
      if (!res.ok) throw new Error("Failed");
      setMessageSent(selected.id);
      setMessageForm(null);
      loadAdminMessages(selected.id);
    } catch { alert("Failed to send message. Please try again."); }
    finally { setSendingMessage(false); }
  };

  const handleMsgAttachment = async (file: File) => {
    setUploadingMsgAttachment(true);
    try {
      const { url } = await uploadToStorage(file);
      setMessageForm(f => f ? { ...f, attachments: [...f.attachments, { fileName: file.name, fileUrl: url, mimeType: file.type }] } : f);
    } catch { alert("Attachment upload failed."); }
    finally { setUploadingMsgAttachment(false); if (msgAttachmentRef.current) msgAttachmentRef.current.value = ""; }
  };

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

  const handleRequestAdditionalDocs = async () => {
    if (!selected || !additionalDocsForm) return;
    setSendingAdditionalDocs(true);
    try {
      const res = await fetch(`${getApiBase()}/api/admin/student-submissions/${selected.id}/request-additional-docs`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: additionalDocsForm.note }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setAdditionalDocsSent(selected.id);
      setAdditionalDocsForm(null);
      setSelected(prev => prev ? { ...prev, additionalDocsRequested: updated.additionalDocsRequested, additionalDocsRequestNote: updated.additionalDocsRequestNote } : null);
      qc.invalidateQueries({ queryKey: ["admin-student-submissions"] });
    } catch { alert("Failed to send additional documents request."); }
    finally { setSendingAdditionalDocs(false); }
  };

  const handleUploadOfferLetter = async (file: File) => {
    if (!selected) return;
    setOfferLetterUploading(true);
    try {
      const { url } = await uploadToStorage(file);
      const res = await fetch(`${getApiBase()}/api/admin/student-submissions/${selected.id}/upload-offer-letter`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileUrl: url, fileSize: file.size, mimeType: file.type }),
      });
      if (!res.ok) throw new Error("Failed");
      setOfferLetterSent(selected.id);
      setSelected(prev => prev ? { ...prev, status: "offer_letter_pending" } : null);
      qc.invalidateQueries({ queryKey: ["admin-student-submissions"] });
    } catch { alert("Failed to upload offer letter."); }
    finally { setOfferLetterUploading(false); if (offerLetterFileRef.current) offerLetterFileRef.current.value = ""; }
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

  const handleId995aDownload = async () => {
    if (!selected) return;
    const res = await fetch(`${getApiBase()}/api/admin/student-submissions/${selected.id}/id995a/download`, { credentials: "include" });
    if (!res.ok) { alert("Failed to download PDF"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `ID995A_${selected.name.replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const filtered = filter === "all" ? submissions : submissions.filter(s => s.status === filter);
  const pendingCount = submissions.filter(s =>
    ["pending", "payment_received", "second_payment_received", "final_payment_received"].includes(s.status) ||
    !!s.additionalDocsRequested
  ).length;

  const viewUrl = (doc: Document) => `${getApiBase()}/api/admin/student-submissions/${selected?.id}/documents/${doc.id}/view`;
  const downloadUrl = (doc: Document) => `${getApiBase()}/api/admin/student-submissions/${selected?.id}/documents/${doc.id}/download`;

  const filterKeys = ["all", "pending", "approved", "docs_requested", "payment_pending", "payment_received", "acknowledged", "rejected"];

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(162,137,89,0.15)" }}>
        <div className="flex items-center gap-4">
          <button onClick={() => setLocation("/admin")} className="text-sm transition-opacity hover:opacity-70" style={{ color: "rgba(162,137,89,0.5)" }}>← Back</button>
          <img src="/harrowgate-logo.png" alt="HARROWGATE" className="h-14 object-contain" />
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
            const hasAction = (nextActions[s.status]?.length ?? 0) > 0 || !!s.additionalDocsRequested;
            const docCount = s.documents.filter(d => !d.documentType.startsWith("admin_") && d.documentType !== "payment_receipt").length;
            const receiptDoc = s.documents.find(d => d.documentType === "payment_receipt");
            const isDone = s.status === "university_interview_completed";
            return (
              <div key={s.id} className="rounded-2xl border transition-all cursor-pointer"
                style={{
                  background: isDone ? "rgba(134,239,172,0.08)" : "rgba(0,0,0,0.2)",
                  borderColor: isDone ? "rgba(134,239,172,0.35)" : hasAction ? "rgba(251,146,60,0.28)" : "rgba(162,137,89,0.12)",
                }}
                onClick={() => { setSelected(s); setNotes(s.adminNotes || ""); setPreviewDoc(null); setInterviewForm(null); setInviteSent(null); setAdditionalDocsForm(null); setAdditionalDocsSent(null); setOfferLetterSent(null); setMessageForm(null); setMessageSent(null); loadAdminMessages(s.id); }}>
                <div className="px-6 py-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-base font-semibold" style={{ color: GOLD }}>{s.name}</span>
                      {hasAction && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(251,146,60,0.1)", color: "#fb923c" }}>Action needed</span>}
                    {s.additionalDocsRequested && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(251,146,60,0.08)", color: "#fb923c" }}>📎 Docs Requested</span>}
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
                    {selected.documents.map(doc => {
                      const m = getDocMeta(doc.documentType);
                      return (
                        <DocRow key={doc.id} doc={doc} label={m.label}
                          onPreview={() => setPreviewDoc(previewDoc?.id === doc.id ? null : doc)}
                          onDownload={() => window.open(downloadUrl(doc), "_blank")}
                          onDelete={() => { if (confirm(`Delete "${doc.fileName}"?`)) deleteDoc.mutate({ submissionId: selected.id, docId: doc.id }); }}
                          isActive={previewDoc?.id === doc.id}
                          tagColor={m.tagColor} tagTextColor={m.tagText} tag={m.tag} />
                      );
                    })}
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

                {/* Application Details — always visible summary of all recorded info */}
                {(selected.interviewZoomLink || selected.interviewDateTime || selected.uniInterviewLink || selected.uniInterviewDateTime || selected.additionalDocsRequestNote || selected.adminNotes) && (
                  <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(162,137,89,0.15)" }}>
                    <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(162,137,89,0.08)" }}>
                      <p className="text-sm font-semibold" style={{ color: GOLD }}>📋 Application History</p>
                    </div>
                    <div className="px-4 py-4 space-y-4">

                      {/* Mock Interview */}
                      {(selected.interviewZoomLink || selected.interviewDateTime) && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(96,165,250,0.7)" }}>🎥 Mock Interview</p>
                          <div className="space-y-1.5">
                            {selected.interviewDateTime && (
                              <div className="flex items-center gap-2 rounded-xl px-3 py-2 border text-sm" style={{ background: "rgba(96,165,250,0.05)", borderColor: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>
                                <span>📅</span><span>{selected.interviewDateTime}</span>
                              </div>
                            )}
                            {selected.interviewZoomLink && (
                              <a href={selected.interviewZoomLink} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-xl px-3 py-2 border text-sm hover:opacity-80 transition-opacity truncate"
                                style={{ background: "rgba(96,165,250,0.05)", borderColor: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>
                                <span>🔗</span><span className="truncate">{selected.interviewZoomLink}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* University Interview */}
                      {(selected.uniInterviewLink || selected.uniInterviewDateTime) && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(56,189,248,0.7)" }}>
                            🏫 University Interview{selected.uniInterviewPlatform ? ` · ${selected.uniInterviewPlatform === "zoom" ? "Zoom" : "Teams"}` : ""}
                          </p>
                          <div className="space-y-1.5">
                            {selected.uniInterviewDateTime && (
                              <div className="flex items-center gap-2 rounded-xl px-3 py-2 border text-sm" style={{ background: "rgba(56,189,248,0.05)", borderColor: "rgba(56,189,248,0.15)", color: "#38bdf8" }}>
                                <span>📅</span><span>{selected.uniInterviewDateTime}</span>
                              </div>
                            )}
                            {selected.uniInterviewLink && (
                              <a href={selected.uniInterviewLink} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-xl px-3 py-2 border text-sm hover:opacity-80 transition-opacity truncate"
                                style={{ background: "rgba(56,189,248,0.05)", borderColor: "rgba(56,189,248,0.15)", color: "#38bdf8" }}>
                                <span>🔗</span><span className="truncate">{selected.uniInterviewLink}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Additional Docs Request */}
                      {selected.additionalDocsRequestNote && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(251,146,60,0.7)" }}>📎 Additional Docs Requested</p>
                          <div className="rounded-xl px-3 py-2 border text-sm" style={{ background: "rgba(251,146,60,0.05)", borderColor: "rgba(251,146,60,0.15)", color: "#fb923c" }}>
                            {selected.additionalDocsRequestNote}
                          </div>
                        </div>
                      )}

                      {/* Admin notes read-only preview */}
                      {selected.adminNotes && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(162,137,89,0.6)" }}>📝 Last Note to Student</p>
                          <div className="rounded-xl px-3 py-2 border text-sm" style={{ background: "rgba(162,137,89,0.05)", borderColor: "rgba(162,137,89,0.12)", color: "rgba(162,137,89,0.8)" }}>
                            {selected.adminNotes}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}

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

                {/* 2nd Payment — Receipt received info (second_payment_received) */}
                {selected.status === "second_payment_received" && (
                  <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(96,165,250,0.2)" }}>
                    <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(96,165,250,0.12)" }}>
                      <p className="text-sm font-semibold" style={{ color: "#60a5fa" }}>💳 2nd Payment Receipt Received</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-xs" style={{ color: "rgba(96,165,250,0.6)" }}>
                        The student has uploaded their 2nd payment receipt. Review it in the documents section above, then click <strong style={{ color: "#4ade80" }}>Confirm 2nd Payment</strong> below.
                      </p>
                    </div>
                  </div>
                )}

                {/* University Interview — Schedule (second_payment_confirmed only) */}
                {selected.status === "second_payment_confirmed" && (
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

                {/* Offer Letter Upload — university_interview_completed */}
                {selected.status === "university_interview_completed" && (
                  <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(240,171,252,0.2)" }}>
                    <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "rgba(240,171,252,0.12)" }}>
                      <p className="text-sm font-semibold" style={{ color: "#f0abfc" }}>🎓 Upload Offer Letter</p>
                      {offerLetterSent === selected.id && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>✓ Sent to student</span>
                      )}
                    </div>
                    <div className="px-4 py-4 space-y-3">
                      <p className="text-xs" style={{ color: "rgba(240,171,252,0.6)" }}>
                        Once the university sends the offer letter, upload it here. The student will be notified and prompted to make the final payment before they can download it.
                      </p>
                      <button onClick={() => offerLetterFileRef.current?.click()} disabled={offerLetterUploading}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ background: "rgba(240,171,252,0.06)", borderColor: "rgba(240,171,252,0.22)", color: "#f0abfc", borderStyle: "dashed" }}>
                        {offerLetterUploading
                          ? <><span className="w-3 h-3 rounded-full border animate-spin" style={{ borderColor: "#f0abfc", borderTopColor: "transparent" }} /> Uploading…</>
                          : <>📄 Choose Offer Letter File…</>}
                      </button>
                      <input ref={offerLetterFileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadOfferLetter(f); }} />
                    </div>
                  </div>
                )}

                {/* Offer Letter Pending — info (offer_letter_pending) */}
                {selected.status === "offer_letter_pending" && (
                  <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(240,171,252,0.2)" }}>
                    <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(240,171,252,0.12)" }}>
                      <p className="text-sm font-semibold" style={{ color: "#f0abfc" }}>🎓 Offer Letter Sent</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-xs" style={{ color: "rgba(240,171,252,0.6)" }}>
                        The offer letter has been sent to the student. They have been notified and will upload their final payment receipt once payment is made.
                      </p>
                    </div>
                  </div>
                )}

                {/* Final Payment — Receipt info (final_payment_received) */}
                {selected.status === "final_payment_received" && (
                  <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(96,165,250,0.2)" }}>
                    <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(96,165,250,0.12)" }}>
                      <p className="text-sm font-semibold" style={{ color: "#60a5fa" }}>💳 Final Payment Receipt Received</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-xs" style={{ color: "rgba(96,165,250,0.6)" }}>
                        The student has uploaded their final payment receipt. Review it in the documents section above, then click <strong style={{ color: "#4ade80" }}>Confirm Final Payment</strong> below.
                      </p>
                    </div>
                  </div>
                )}

                {/* Final Payment Confirmed + ID995A */}
                {selected.status === "final_payment_confirmed" && (
                  <>
                    <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(74,222,128,0.2)" }}>
                      <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(74,222,128,0.12)" }}>
                        <p className="text-sm font-semibold" style={{ color: "#4ade80" }}>✅ Final Payment Confirmed</p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-xs" style={{ color: "rgba(74,222,128,0.5)" }}>
                          The student's final payment has been confirmed. They can now download the offer letter from their portal.
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(162,137,89,0.25)" }}>
                      <button className="w-full px-4 py-3 flex items-center justify-between" onClick={() => setId995aOpen(v => !v)}>
                        <div className="flex items-center gap-2">
                          <span className="text-base">🇭🇰</span>
                          <span className="text-sm font-semibold" style={{ color: GOLD }}>ID995A — Hong Kong Immigration Form</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={e => { e.stopPropagation(); handleId995aDownload(); }}
                            className="text-xs px-3 py-1 rounded-lg border font-medium transition-all hover:opacity-80"
                            style={{ borderColor: "rgba(162,137,89,0.3)", color: GOLD, background: "rgba(162,137,89,0.08)" }}>
                            ⬇ Download PDF
                          </button>
                          <span style={{ color: "rgba(162,137,89,0.4)" }}>{id995aOpen ? "▲" : "▼"}</span>
                        </div>
                      </button>
                      {id995aOpen && (
                        <div className="border-t" style={{ borderColor: "rgba(162,137,89,0.12)" }}>
                          <Id995aPanel submissionId={selected.id} apiBase={getApiBase()} />
                        </div>
                      )}
                    </div>
                  </>
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

                {/* Request Additional Documents — universal panel */}
                {selected.status !== "rejected" && (
                  <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(251,146,60,0.15)" }}>
                    <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "rgba(251,146,60,0.1)" }}>
                      <p className="text-sm font-semibold" style={{ color: "#fb923c" }}>📎 Additional Documents</p>
                      {selected.additionalDocsRequested && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(251,146,60,0.1)", color: "#fb923c" }}>Pending student response</span>
                      )}
                      {additionalDocsSent === selected.id && !selected.additionalDocsRequested && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>✓ Request sent</span>
                      )}
                    </div>
                    <div className="px-4 py-4">
                      {selected.additionalDocsRequestNote && (
                        <div className="mb-3 rounded-xl px-3 py-2 border text-xs" style={{ background: "rgba(251,146,60,0.05)", borderColor: "rgba(251,146,60,0.15)", color: "rgba(251,146,60,0.7)" }}>
                          <strong>Last request note:</strong> {selected.additionalDocsRequestNote}
                        </div>
                      )}
                      {!additionalDocsForm ? (
                        <button onClick={() => setAdditionalDocsForm({ note: "" })}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 flex items-center justify-center gap-2"
                          style={{ background: "rgba(251,146,60,0.05)", borderColor: "rgba(251,146,60,0.18)", color: "#fb923c" }}>
                          📎 {selected.additionalDocsRequested ? "Send Another Request" : "Request Additional Documents"}
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: "rgba(251,146,60,0.6)" }}>Note to student (optional)</label>
                            <textarea rows={2} placeholder="Describe what documents are needed…"
                              value={additionalDocsForm.note}
                              onChange={e => setAdditionalDocsForm(f => f ? { ...f, note: e.target.value } : f)}
                              className="w-full rounded-xl px-3 py-2 text-sm outline-none border resize-none"
                              style={{ background: "rgba(251,146,60,0.04)", borderColor: "rgba(251,146,60,0.18)", color: "#fb923c" }} />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={handleRequestAdditionalDocs} disabled={sendingAdditionalDocs}
                              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                              style={{ background: "rgba(251,146,60,0.1)", borderColor: "rgba(251,146,60,0.3)", color: "#fb923c" }}>
                              {sendingAdditionalDocs ? <><span className="w-3 h-3 rounded-full border animate-spin" style={{ borderColor: "#fb923c", borderTopColor: "transparent" }} /> Sending…</> : "📧 Send Request"}
                            </button>
                            <button onClick={() => setAdditionalDocsForm(null)}
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

                {/* Send Message to Student */}
                {selected.status !== "rejected" && (
                  <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(96,165,250,0.2)" }}>
                    <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "rgba(96,165,250,0.12)" }}>
                      <p className="text-sm font-semibold" style={{ color: "#60a5fa" }}>✉️ Message Student</p>
                      {messageSent === selected.id && !messageForm && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>✓ Sent</span>
                      )}
                    </div>
                    <div className="px-4 py-4 space-y-3">
                      {/* Thread */}
                      {adminMessages.length > 0 && (
                        <div className="space-y-2 max-h-52 overflow-y-auto">
                          {adminMessages.map(msg => (
                            <div key={msg.id} className={`rounded-xl px-3 py-2.5 border text-xs ${msg.fromAdmin ? "ml-4" : "mr-4"}`}
                              style={{
                                background: msg.fromAdmin ? "rgba(96,165,250,0.06)" : "rgba(74,222,128,0.06)",
                                borderColor: msg.fromAdmin ? "rgba(96,165,250,0.18)" : "rgba(74,222,128,0.18)",
                              }}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold" style={{ color: msg.fromAdmin ? "#60a5fa" : "#4ade80" }}>
                                  {msg.fromAdmin ? "You (Admin)" : selected.name}
                                </span>
                                {!msg.isRead && !msg.fromAdmin && (
                                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}>NEW</span>
                                )}
                                <span className="ml-auto opacity-40" style={{ color: msg.fromAdmin ? "#60a5fa" : "#4ade80" }}>
                                  {new Date(msg.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} {new Date(msg.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              {msg.subject && !msg.fromAdmin && <p className="font-medium mb-1 opacity-70" style={{ color: msg.fromAdmin ? "#60a5fa" : "#4ade80" }}>{msg.subject}</p>}
                              {msg.body && <p className="leading-relaxed opacity-80" style={{ color: msg.fromAdmin ? "#60a5fa" : "#4ade80", whiteSpace: "pre-wrap" }}>{msg.body}</p>}
                              {msg.attachments?.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {msg.attachments.map((att: any, i: number) => (
                                    <a key={i} href={`${getApiBase()}/api/storage/objects/${att.fileUrl}`} target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium hover:opacity-80 transition-opacity"
                                      style={{ borderColor: "rgba(96,165,250,0.25)", color: "#60a5fa", background: "rgba(96,165,250,0.05)" }}>
                                      📎 {att.fileName}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {!messageForm ? (
                        <button onClick={() => setMessageForm({ subject: "Message from HARROWGATE", body: "", attachments: [] })}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 flex items-center justify-center gap-2"
                          style={{ background: "rgba(96,165,250,0.05)", borderColor: "rgba(96,165,250,0.18)", color: "#60a5fa" }}>
                          ✉️ Compose New Message
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <input type="text" placeholder="Subject"
                            value={messageForm.subject}
                            onChange={e => setMessageForm(f => f ? { ...f, subject: e.target.value } : f)}
                            className="w-full rounded-xl px-3 py-2 text-sm outline-none border"
                            style={{ background: "rgba(96,165,250,0.04)", borderColor: "rgba(96,165,250,0.18)", color: "#60a5fa" }} />
                          <textarea rows={4} placeholder="Type your message to the student…"
                            value={messageForm.body}
                            onChange={e => setMessageForm(f => f ? { ...f, body: e.target.value } : f)}
                            className="w-full rounded-xl px-3 py-2 text-sm outline-none border resize-none"
                            style={{ background: "rgba(96,165,250,0.04)", borderColor: "rgba(96,165,250,0.18)", color: "#60a5fa" }} />
                          {messageForm.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {messageForm.attachments.map((att, i) => (
                                <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg border text-xs"
                                  style={{ borderColor: "rgba(96,165,250,0.2)", color: "#60a5fa", background: "rgba(96,165,250,0.05)" }}>
                                  📎 {att.fileName}
                                  <button onClick={() => setMessageForm(f => f ? { ...f, attachments: f.attachments.filter((_, j) => j !== i) } : f)}
                                    className="ml-1 hover:opacity-70" style={{ color: "#f87171" }}>✕</button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button onClick={handleSendMessage} disabled={sendingMessage || !messageForm.body.trim()}
                              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                              style={{ background: "rgba(96,165,250,0.1)", borderColor: "rgba(96,165,250,0.3)", color: "#60a5fa" }}>
                              {sendingMessage ? <><span className="w-3 h-3 rounded-full border animate-spin" style={{ borderColor: "#60a5fa", borderTopColor: "transparent" }} /> Sending…</> : "📧 Send Message"}
                            </button>
                            <button onClick={() => { msgAttachmentRef.current?.click(); }} disabled={uploadingMsgAttachment}
                              className="px-3 py-2.5 rounded-xl text-sm border transition-all hover:opacity-70 disabled:opacity-40"
                              style={{ borderColor: "rgba(96,165,250,0.18)", color: "#60a5fa" }}>
                              {uploadingMsgAttachment ? "…" : "📎"}
                            </button>
                            <button onClick={() => setMessageForm(null)}
                              className="px-4 py-2.5 rounded-xl text-sm border transition-all hover:opacity-70"
                              style={{ borderColor: "rgba(162,137,89,0.15)", color: "rgba(162,137,89,0.4)" }}>
                              Cancel
                            </button>
                          </div>
                          <input ref={msgAttachmentRef} type="file" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleMsgAttachment(f); }} />
                        </div>
                      )}
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

const FORM_FIELDS: { key: string; label: string; section: string; type?: "select"; options?: string[] }[] = [
  // ── Personal Particulars ──────────────────────────────────────────────────
  { section: "Personal Particulars", key: "surnameEnglish",          label: "Surname (English)" },
  { section: "Personal Particulars", key: "givenNamesEnglish",       label: "Given Names (English)" },
  { section: "Personal Particulars", key: "nameChineseApplicant",    label: "Name in Chinese (if any)" },
  { section: "Personal Particulars", key: "maidenSurname",           label: "Maiden Surname (if applicable)" },
  { section: "Personal Particulars", key: "alias",                   label: "Alias (if any)" },
  { section: "Personal Particulars", key: "sex",                     label: "Sex", type: "select", options: ["Male", "Female"] },
  { section: "Personal Particulars", key: "dateOfBirth",             label: "Date of Birth (dd/mm/yyyy)" },
  { section: "Personal Particulars", key: "placeOfBirth",            label: "Place of Birth" },
  { section: "Personal Particulars", key: "nationality",             label: "Nationality / Place of Domicile" },
  { section: "Personal Particulars", key: "maritalStatus",           label: "Marital / Relationship Status", type: "select", options: ["Bachelor/Spinster", "Married", "Divorced", "Separated", "Widowed", "Others"] },
  { section: "Personal Particulars", key: "maritalStatusOther",      label: "Marital Status – Others (specify)" },
  { section: "Personal Particulars", key: "hkIdNumber",              label: "HK Identity Card No. (if any)" },
  { section: "Personal Particulars", key: "mainlandIdNumber",        label: "Mainland Identity Card No. (if any)" },
  { section: "Personal Particulars", key: "travelDocType",           label: "Travel Document Type" },
  { section: "Personal Particulars", key: "travelDocNumber",         label: "Travel Document No." },
  { section: "Personal Particulars", key: "placeOfIssue",            label: "Place of Issue" },
  { section: "Personal Particulars", key: "dateOfIssue",             label: "Date of Issue (dd/mm/yyyy)" },
  { section: "Personal Particulars", key: "dateOfExpiry",            label: "Date of Expiry (dd/mm/yyyy)" },
  { section: "Personal Particulars", key: "emailAddress",            label: "Email Address (if any)" },
  { section: "Personal Particulars", key: "contactPhone",            label: "Contact Telephone No." },
  { section: "Personal Particulars", key: "faxNumber",               label: "Fax No. (if any)" },
  { section: "Personal Particulars", key: "countryOfDomicile",       label: "Country / Territory of Domicile" },
  { section: "Personal Particulars", key: "hasPermanentResidence",   label: "Acquired Permanent Residence?", type: "select", options: ["Yes", "No"] },
  { section: "Personal Particulars", key: "lengthOfResidenceYears",  label: "Length of Residence – Years" },
  { section: "Personal Particulars", key: "lengthOfResidenceMonths", label: "Length of Residence – Months" },
  { section: "Personal Particulars", key: "occupation",              label: "Occupation" },
  { section: "Personal Particulars", key: "currentEmployerName",     label: "Current Employer Name (if any)" },
  { section: "Personal Particulars", key: "currentEmployerAddress",  label: "Current Employer Address (if any)" },
  { section: "Personal Particulars", key: "isCurrentlyInHK",         label: "Is Applicant Currently in HK?", type: "select", options: ["Yes", "No"] },
  { section: "Personal Particulars", key: "permittedToRemainUntil",  label: "Permitted to Remain Until (dd/mm/yyyy)" },
  { section: "Personal Particulars", key: "statusInHK",              label: "Status in HK", type: "select", options: ["Employment", "Residence/Dependant", "Visitor", "Others"] },
  { section: "Personal Particulars", key: "statusInHKOther",         label: "Status in HK – Others (specify)" },
  { section: "Personal Particulars", key: "presentAddress1",         label: "Present Address – Line 1" },
  { section: "Personal Particulars", key: "presentAddress2",         label: "Present Address – Line 2" },
  { section: "Personal Particulars", key: "presentAddress3",         label: "Present Address – Line 3 / Country" },
  { section: "Personal Particulars", key: "permanentAddress1",       label: "Permanent Address – Line 1 (if different)" },
  { section: "Personal Particulars", key: "permanentAddress2",       label: "Permanent Address – Line 2" },
  { section: "Personal Particulars", key: "permanentAddress3",       label: "Permanent Address – Line 3 / Country" },
  // ── Proposed Stay ─────────────────────────────────────────────────────────
  { section: "Proposed Stay in HK for Study", key: "proposedDateOfEntry",    label: "Proposed Date of Entry (dd/mm/yyyy)" },
  { section: "Proposed Stay in HK for Study", key: "proposedDurationOfStay", label: "Proposed Duration of Stay" },
  { section: "Proposed Stay in HK for Study", key: "schoolNameAddress",      label: "Name & Address of School / Institution" },
  { section: "Proposed Stay in HK for Study", key: "classToAttend",          label: "Class / Course to Attend" },
  // ── Educational Background ────────────────────────────────────────────────
  { section: "Educational Background", key: "edu1SchoolName",   label: "School 1 – Name" },
  { section: "Educational Background", key: "edu1MajorSubject", label: "School 1 – Major Subject" },
  { section: "Educational Background", key: "edu1Degree",       label: "School 1 – Degree/Award" },
  { section: "Educational Background", key: "edu1From",         label: "School 1 – From (mm/yyyy)" },
  { section: "Educational Background", key: "edu1To",           label: "School 1 – To (mm/yyyy)" },
  { section: "Educational Background", key: "edu2SchoolName",   label: "School 2 – Name" },
  { section: "Educational Background", key: "edu2MajorSubject", label: "School 2 – Major Subject" },
  { section: "Educational Background", key: "edu2Degree",       label: "School 2 – Degree/Award" },
  { section: "Educational Background", key: "edu2From",         label: "School 2 – From (mm/yyyy)" },
  { section: "Educational Background", key: "edu2To",           label: "School 2 – To (mm/yyyy)" },
  { section: "Educational Background", key: "edu3SchoolName",   label: "School 3 – Name" },
  { section: "Educational Background", key: "edu3MajorSubject", label: "School 3 – Major Subject" },
  { section: "Educational Background", key: "edu3Degree",       label: "School 3 – Degree/Award" },
  { section: "Educational Background", key: "edu3From",         label: "School 3 – From (mm/yyyy)" },
  { section: "Educational Background", key: "edu3To",           label: "School 3 – To (mm/yyyy)" },
  // ── Financial Resources ───────────────────────────────────────────────────
  { section: "Financial Resources", key: "schoolFeeCost",     label: "School Fees – Estimated Cost (HK$)" },
  { section: "Financial Resources", key: "accommodationCost", label: "Accommodation – Estimated Cost (HK$)" },
  { section: "Financial Resources", key: "totalCost",         label: "Total Estimated Cost (HK$)" },
];

function Id995aPanel({ submissionId, apiBase }: { submissionId: number; apiBase: string }) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`${apiBase}/api/admin/student-submissions/${submissionId}/id995a`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setFormData((data.formData as Record<string, string>) || {});
        setAiGenerated(data.aiGenerated || false);
      }
    } finally { setLoaded(true); }
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    setGenerating(true); setSaved(false);
    try {
      const res = await fetch(`${apiBase}/api/admin/student-submissions/${submissionId}/id995a/generate`, {
        method: "POST", credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setFormData((data.formData as Record<string, string>) || {});
      setAiGenerated(true);
    } catch { alert("AI generation failed. Please try again."); }
    finally { setGenerating(false); }
  };

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      const res = await fetch(`${apiBase}/api/admin/student-submissions/${submissionId}/id995a`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData }),
      });
      if (!res.ok) throw new Error("Failed");
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch { alert("Failed to save form data."); }
    finally { setSaving(false); }
  };

  if (!loaded) return (
    <div className="flex items-center justify-center py-8">
      <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
    </div>
  );

  const sections = [...new Set(FORM_FIELDS.map(f => f.section))];

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {aiGenerated && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(162,137,89,0.1)", color: GOLD }}>✨ AI pre-filled</span>
          )}
          {Object.values(formData).some(v => v) && !aiGenerated && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(74,222,128,0.08)", color: "#4ade80" }}>Manually edited</span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all hover:opacity-80 disabled:opacity-40"
            style={{ borderColor: "rgba(162,137,89,0.3)", color: GOLD, background: "rgba(162,137,89,0.06)" }}>
            {generating
              ? <><span className="w-3 h-3 rounded-full border animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} /> Generating…</>
              : "✨ AI Auto-fill"}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all hover:opacity-80 disabled:opacity-40"
            style={{ borderColor: "rgba(74,222,128,0.3)", color: "#4ade80", background: "rgba(74,222,128,0.06)" }}>
            {saving ? "Saving…" : saved ? "✓ Saved" : "💾 Save"}
          </button>
        </div>
      </div>

      <p className="text-xs" style={{ color: "rgba(162,137,89,0.5)" }}>
        Click <strong style={{ color: GOLD }}>✨ AI Auto-fill</strong> to extract details from the student's documents automatically, then review and edit any fields before downloading the PDF.
      </p>

      {sections.map(section => (
        <div key={section} className="space-y-2">
          <div className="px-3 py-1.5 rounded-lg" style={{ background: "rgba(162,137,89,0.08)" }}>
            <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: GOLD }}>Part A — {section}</p>
          </div>
          {FORM_FIELDS.filter(f => f.section === section).map(field => (
            <div key={field.key} className="grid grid-cols-[180px_1fr] gap-2 items-center">
              <label className="text-xs text-right pr-2" style={{ color: "rgba(162,137,89,0.55)" }}>{field.label}</label>
              {field.type === "select" ? (
                <select
                  value={formData[field.key] || ""}
                  onChange={e => setFormData(d => ({ ...d, [field.key]: e.target.value }))}
                  className="rounded-lg px-2.5 py-1.5 text-xs border outline-none"
                  style={{ background: "rgba(162,137,89,0.05)", borderColor: "rgba(162,137,89,0.18)", color: GOLD }}>
                  <option value="">— select —</option>
                  {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type="text"
                  value={formData[field.key] || ""}
                  onChange={e => setFormData(d => ({ ...d, [field.key]: e.target.value }))}
                  className="rounded-lg px-2.5 py-1.5 text-xs border outline-none"
                  style={{ background: "rgba(162,137,89,0.05)", borderColor: "rgba(162,137,89,0.18)", color: GOLD }} />
              )}
            </div>
          ))}
        </div>
      ))}

      <div className="flex justify-end pt-2">
        <button onClick={handleSave} disabled={saving}
          className="text-xs px-4 py-2 rounded-lg border font-semibold transition-all hover:opacity-80 disabled:opacity-40"
          style={{ borderColor: "rgba(74,222,128,0.3)", color: "#4ade80", background: "rgba(74,222,128,0.06)" }}>
          {saving ? "Saving…" : saved ? "✓ Saved" : "💾 Save All Changes"}
        </button>
      </div>
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
