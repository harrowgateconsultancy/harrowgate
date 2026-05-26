import { useEffect, useState, useRef } from "react";
import { useUser, useClerk, useSession } from "@clerk/react";
import ApplyForm from "./ApplyForm";
import PaymentPage from "./PaymentPage";
import StudentDocManager from "./StudentDocManager";
import { useLang, LANG_LIST } from "../../i18n";

const BG = "#0b2213";
const GOLD = "#a28959";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }

export type Submission = {
  id: number; clerkUserId: string; name: string; dateOfBirth: string;
  passportNumber: string; email: string | null; status: string;
  adminNotes: string | null; createdAt: string;
  interviewZoomLink?: string | null; interviewDateTime?: string | null;
  uniInterviewLink?: string | null; uniInterviewDateTime?: string | null; uniInterviewPlatform?: string | null;
  additionalDocsRequested?: boolean | null; additionalDocsRequestNote?: string | null;
  immigrationRefNumber?: string | null;
  documents: Array<{ id: number; submissionId: number; documentType: string; fileName: string; fileUrl: string; mimeType?: string | null }>;
};

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  pending:              { label: "Under Review",              color: GOLD,        bg: "rgba(162,137,89,0.12)" },
  approved:             { label: "Approved",                  color: "#4ade80",   bg: "rgba(74,222,128,0.12)" },
  docs_requested:       { label: "Documents Requested",       color: "#fb923c",   bg: "rgba(251,146,60,0.12)" },
  payment_pending:      { label: "Payment Required",          color: "#fb923c",   bg: "rgba(251,146,60,0.12)" },
  payment_received:     { label: "Pending Payment Confirmation", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  acknowledged:         { label: "Payment Received ✓",        color: "#4ade80",   bg: "rgba(74,222,128,0.12)" },
  interview_arranged:              { label: "Interview Arranged",             color: "#a78bfa",   bg: "rgba(167,139,250,0.12)" },
  interview_completed:             { label: "Interview Completed",            color: "#4ade80",   bg: "rgba(74,222,128,0.12)" },
  second_payment_pending:          { label: "2nd Payment Required",           color: "#fb923c",   bg: "rgba(251,146,60,0.12)" },
  second_payment_received:         { label: "Pending Payment Confirmation",   color: "#60a5fa",   bg: "rgba(96,165,250,0.12)" },
  second_payment_confirmed:        { label: "2nd Payment Received ✓",         color: "#4ade80",   bg: "rgba(74,222,128,0.12)" },
  university_interview_arranged:   { label: "Uni Interview Arranged",         color: "#38bdf8",   bg: "rgba(56,189,248,0.12)" },
  university_interview_completed:  { label: "Uni Interview Completed",        color: "#4ade80",   bg: "rgba(74,222,128,0.12)" },
  offer_letter_pending:            { label: "Final Payment Required",         color: "#fb923c",   bg: "rgba(251,146,60,0.12)"  },
  final_payment_received:          { label: "Pending Payment Confirmation",   color: "#60a5fa",   bg: "rgba(96,165,250,0.12)"  },
  final_payment_confirmed:         { label: "Offer Letter Ready ✓",           color: "#4ade80",   bg: "rgba(74,222,128,0.12)"  },
  rejected:                        { label: "Application Unsuccessful",       color: "#f87171",   bg: "rgba(248,113,113,0.12)" },
};

type TimelineStep = { icon: string; label: string; note: string; done: boolean; current?: boolean };

function buildTimeline(submission: Submission): TimelineStep[] {
  const s = submission.status;
  const ref = `STU${submission.passportNumber.slice(-4).toUpperCase()}`;
  const submittedDate = new Date(submission.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const postStatuses = ["acknowledged","interview_arranged","interview_completed","second_payment_pending","second_payment_received","second_payment_confirmed","university_interview_arranged","university_interview_completed","offer_letter_pending","final_payment_received","final_payment_confirmed"];
  const afterPayment   = postStatuses.includes(s);
  const afterMock      = ["interview_completed","second_payment_pending","second_payment_received","second_payment_confirmed","university_interview_arranged","university_interview_completed","offer_letter_pending","final_payment_received","final_payment_confirmed"].includes(s);
  const after2ndPay    = ["second_payment_confirmed","university_interview_arranged","university_interview_completed","offer_letter_pending","final_payment_received","final_payment_confirmed"].includes(s);
  const in2ndPay       = ["second_payment_pending","second_payment_received"].includes(s);
  const afterUniArr    = ["university_interview_arranged","university_interview_completed","offer_letter_pending","final_payment_received","final_payment_confirmed"].includes(s);
  const afterUniDone   = ["university_interview_completed","offer_letter_pending","final_payment_received","final_payment_confirmed"].includes(s);
  const afterFinalPay  = s === "final_payment_confirmed";
  const inFinalPay     = ["offer_letter_pending","final_payment_received"].includes(s);

  return [
    { icon: "✅", label: "Application Submitted",      note: submittedDate,                                          done: true },
    { icon: "✅", label: "Documents Reviewed",          note: "Approved by HARROWGATE consultant",                    done: true },
    { icon: "✅", label: "Payment Confirmed",           note: `Acknowledgement code: ${ref}`,                         done: true },
    {
      icon: afterPayment && s !== "acknowledged" ? "✅" : (s === "acknowledged" ? "🔄" : "⬜"),
      label: "Awaiting Mock Interview Arrangement",
      note: s === "acknowledged" ? "Our team will contact you to schedule your mock interview" : (afterPayment ? "Arranged" : "Upcoming"),
      done: afterPayment && s !== "acknowledged",
      current: s === "acknowledged",
    },
    {
      icon: s === "interview_arranged" ? "🔄" : (afterMock ? "✅" : "⬜"),
      label: "Mock Interview",
      note: s === "interview_arranged"
        ? (submission.interviewDateTime || "Scheduled — check your email")
        : (afterMock ? "Completed" : "To be scheduled"),
      done: afterMock,
      current: s === "interview_arranged",
    },
    {
      icon: after2ndPay ? "✅" : (in2ndPay || s === "interview_completed" ? "🔄" : "⬜"),
      label: "2nd Payment",
      note: after2ndPay ? "Confirmed" : (s === "second_payment_received" ? "Receipt received — awaiting confirmation" : (in2ndPay || s === "interview_completed" ? "Payment required" : "Upcoming")),
      done: after2ndPay,
      current: in2ndPay || s === "interview_completed",
    },
    {
      icon: afterUniDone ? "✅" : (s === "university_interview_arranged" ? "🔄" : (after2ndPay ? "🔄" : "⬜")),
      label: "University Interview",
      note: s === "second_payment_confirmed"
        ? "Our team is arranging your university interview"
        : s === "university_interview_arranged"
          ? (submission.uniInterviewDateTime || "Scheduled — check your email")
          : (afterUniDone ? "Completed" : "Upcoming"),
      done: afterUniDone,
      current: s === "university_interview_arranged" || s === "second_payment_confirmed",
    },
    {
      icon: afterFinalPay ? "✅" : (inFinalPay ? "🔄" : (afterUniDone ? "🔄" : "⬜")),
      label: "Offer Letter & Final Payment",
      note: afterFinalPay
        ? "Final payment confirmed — offer letter available"
        : inFinalPay
          ? (s === "final_payment_received" ? "Receipt received — awaiting confirmation" : "Final payment required to collect your offer letter")
          : afterUniDone ? "Awaiting your offer letter from the university" : "Upcoming",
      done: afterFinalPay,
      current: inFinalPay || (afterUniDone && !inFinalPay && !afterFinalPay),
    },
    { icon: "⬜", label: "Visa Application Submitted", note: "Final step", done: false },
  ];
}

async function uploadToStorage(file: File): Promise<{ url: string }> {
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const apiBase = `${window.location.origin}${BASE}`;
  const res = await fetch(`${apiBase}/api/storage/uploads/request-url`, {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!res.ok) throw new Error("Upload URL failed");
  const { uploadURL, objectPath } = await res.json();
  await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  return { url: objectPath };
}

export default function Portal() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { session } = useSession();
  const [submission, setSubmission] = useState<Submission | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);
  const [completingUni, setCompletingUni] = useState(false);
  const [additionalDocsNote, setAdditionalDocsNote] = useState("");
  const [uploadingAdditionalDocs, setUploadingAdditionalDocs] = useState(false);
  const [additionalDocsError, setAdditionalDocsError] = useState<string | null>(null);
  const additionalDocsRef = useRef<HTMLInputElement | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [showMessages, setShowMessages] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<Array<{fileName: string; fileUrl: string; mimeType?: string}>>([]);
  const [sendingReply, setSendingReply] = useState(false);
  const [uploadingReplyAttachment, setUploadingReplyAttachment] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const replyAttachmentRef = useRef<HTMLInputElement | null>(null);
  const { lang, setLang, t, isRtl } = useLang();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const langPickerRef = useRef<HTMLDivElement | null>(null);

  const authHeaders = async (): Promise<HeadersInit> => {
    const token = await session?.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const email = user?.primaryEmailAddress?.emailAddress;
      const url = email
        ? `${getApiBase()}/api/student/submissions/me?email=${encodeURIComponent(email)}`
        : `${getApiBase()}/api/student/submissions/me`;
      const res = await fetch(url, { credentials: "include", headers: await authHeaders() });
      if (res.ok) setSubmission(await res.json());
      else if (res.status === 401) setSubmission(null);
    } catch { setSubmission(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isLoaded && session) fetchSubmission(); }, [isLoaded, session]);

  const fetchMessages = async (id: number) => {
    try {
      const res = await fetch(`${getApiBase()}/api/student/submissions/${id}/messages`, {
        credentials: "include", headers: await authHeaders(),
      });
      if (res.ok) setMessages(await res.json());
    } catch { /* silent */ }
  };

  const silentFetchSubmission = async () => {
    try {
      const email = user?.primaryEmailAddress?.emailAddress;
      const url = email
        ? `${getApiBase()}/api/student/submissions/me?email=${encodeURIComponent(email)}`
        : `${getApiBase()}/api/student/submissions/me`;
      const res = await fetch(url, { credentials: "include", headers: await authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSubmission(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev);
      }
    } catch { /* silent */ }
  };

  const silentFetchMessages = async (id: number) => {
    try {
      const res = await fetch(`${getApiBase()}/api/student/submissions/${id}/messages`, {
        credentials: "include", headers: await authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev);
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (submission?.id) fetchMessages(submission.id);
  }, [submission?.id]);

  // Real-time background polling — no loading spinner, silent update on change
  useEffect(() => {
    if (!submission?.id || !session) return;
    const pollId = setInterval(() => {
      silentFetchSubmission();
      silentFetchMessages(submission.id);
    }, 10000);
    return () => clearInterval(pollId);
  }, [submission?.id, session?.id]);

  const handleReplyAttachment = async (file: File) => {
    setUploadingReplyAttachment(true);
    try {
      const { url } = await uploadToStorage(file);
      setReplyAttachments(a => [...a, { fileName: file.name, fileUrl: url, mimeType: file.type }]);
    } catch { setReplyError("Attachment upload failed. Please try again."); }
    finally { setUploadingReplyAttachment(false); if (replyAttachmentRef.current) replyAttachmentRef.current.value = ""; }
  };

  const handleSendReply = async () => {
    if (!submission) return;
    if (!replyBody.trim() && replyAttachments.length === 0) {
      setReplyError("Please write a message or attach a file.");
      return;
    }
    setSendingReply(true);
    setReplyError(null);
    try {
      const res = await fetch(`${getApiBase()}/api/student/submissions/${submission.id}/messages/reply`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ body: replyBody.trim(), attachments: replyAttachments }),
      });
      if (!res.ok) throw new Error("Failed");
      setReplyBody("");
      setReplyAttachments([]);
      fetchMessages(submission.id);
    } catch { setReplyError("Failed to send. Please try again."); }
    finally { setSendingReply(false); }
  };

  const handleCompleteUni = async () => {
    if (!submission) return;
    setCompletingUni(true);
    try {
      const res = await fetch(`${getApiBase()}/api/student/submissions/${submission.id}/complete-university-interview`, { method: "POST", credentials: "include", headers: await authHeaders() });
      if (res.ok) fetchSubmission();
    } finally { setCompletingUni(false); }
  };

  const handleOfferLetterView = async (submissionId: number, docId: number) => {
    try {
      const res = await fetch(`${getApiBase()}/api/student/submissions/${submissionId}/documents/${docId}/view`, { credentials: "include", headers: await authHeaders() });
      if (!res.ok) throw new Error("Failed to load file");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { alert("Could not open the file. Please try again."); }
  };

  const handleOfferLetterDownload = async (submissionId: number, docId: number, fileName: string) => {
    try {
      const res = await fetch(`${getApiBase()}/api/student/submissions/${submissionId}/documents/${docId}/download`, { credentials: "include", headers: await authHeaders() });
      if (!res.ok) throw new Error("Failed to download file");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch { alert("Could not download the file. Please try again."); }
  };

  const handleAdditionalDocsSubmit = async (file: File) => {
    if (!submission) return;
    setUploadingAdditionalDocs(true); setAdditionalDocsError(null);
    try {
      const { url } = await uploadToStorage(file);
      const hdrs = await authHeaders() as Record<string, string>;
      const res = await fetch(`${getApiBase()}/api/student/submissions/${submission.id}/additional-docs`, {
        method: "POST", headers: { "Content-Type": "application/json", ...hdrs }, credentials: "include",
        body: JSON.stringify({ fileName: file.name, fileUrl: url, fileSize: file.size, mimeType: file.type, note: additionalDocsNote }),
      });
      if (!res.ok) throw new Error("Failed");
      setAdditionalDocsNote("");
      fetchSubmission();
    } catch { setAdditionalDocsError("Upload failed. Please try again."); }
    finally { setUploadingAdditionalDocs(false); }
  };

  // Auto-show timeline for post-acknowledged statuses
  useEffect(() => {
    if (submission && ["interview_arranged","interview_completed","second_payment_pending","second_payment_received","second_payment_confirmed","university_interview_arranged","university_interview_completed","offer_letter_pending","final_payment_received","final_payment_confirmed"].includes(submission.status)) {
      setShowTimeline(true);
    }
  }, [submission?.status]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="text-center">
          <img src="/harrowgate-logo.png" alt="HARROWGATE" className="h-16 object-contain mx-auto mb-6 opacity-60" />
          <div className="w-6 h-6 rounded-full border-2 animate-spin mx-auto mb-3" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: "rgba(162,137,89,0.5)" }}>Loading your portal…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(162,137,89,0.12)", backdropFilter: "blur(12px)", background: "rgba(11,34,19,0.9)", position: "sticky", top: 0, zIndex: 50 }}>
        <div className="flex items-center justify-between px-6 py-3.5 max-w-5xl mx-auto">
          <img src="/harrowgate-logo.png" alt="HARROWGATE" className="h-16 object-contain" />
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border" style={{ borderColor: "rgba(162,137,89,0.15)", background: "rgba(162,137,89,0.05)" }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: "rgba(162,137,89,0.2)", color: GOLD }}>
                {(user?.firstName?.[0] || user?.primaryEmailAddress?.emailAddress?.[0] || "?").toUpperCase()}
              </div>
              <span className="text-xs max-w-[160px] truncate" style={{ color: "rgba(162,137,89,0.55)" }}>
                {user?.primaryEmailAddress?.emailAddress}
              </span>
            </div>
            {/* Language picker */}
            <div ref={langPickerRef} style={{ position: "relative" }}>
              <button
                onClick={() => setShowLangPicker(v => !v)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition-all hover:opacity-80"
                style={{ borderColor: "rgba(162,137,89,0.2)", color: "rgba(162,137,89,0.6)", background: "rgba(162,137,89,0.05)" }}>
                {LANG_LIST.find(l => l.code === lang)?.flag}
                <svg viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-2 h-2 ml-0.5"><path d="M1 1l4 4 4-4" /></svg>
              </button>
              {showLangPicker && (
                <div className="absolute top-full right-0 mt-1.5 rounded-xl border shadow-2xl z-[100] overflow-hidden"
                  style={{ background: "#0a1f0e", borderColor: "rgba(162,137,89,0.2)", minWidth: 152 }}>
                  {LANG_LIST.map(l => (
                    <button key={l.code} onClick={() => { setLang(l.code); setShowLangPicker(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-all hover:opacity-90"
                      style={{ background: l.code === lang ? "rgba(162,137,89,0.12)" : "transparent", color: l.code === lang ? GOLD : "rgba(162,137,89,0.55)" }}>
                      <span className="text-sm">{l.flag}</span> {l.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => signOut({ redirectUrl: BASE || "/" })}
              className="text-xs px-4 py-1.5 rounded-full border transition-all hover:opacity-80"
              style={{ borderColor: "rgba(162,137,89,0.2)", color: "rgba(162,137,89,0.6)" }}>
              {t("nav.signOut")}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {submission === null && <ApplyForm user={user} onSubmitted={fetchSubmission} />}

        {submission && (
          <>
            {/* Status Banner */}
            <div className="mb-8 rounded-2xl overflow-hidden border" style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(162,137,89,0.14)" }}>
              {/* Top accent bar */}
              <div className="h-0.5 w-full" style={{ background: `linear-gradient(to right, transparent, ${GOLD}, transparent)` }} />
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.25em] uppercase mb-2" style={{ color: "rgba(162,137,89,0.4)" }}>
                      {t("portal.title")}
                    </p>
                    <h2 className="text-2xl font-bold mb-1" style={{ color: GOLD }}>
                      {t("portal.welcomeBack")}, {submission.name.split(" ")[0]}.
                    </h2>
                    <p className="text-sm" style={{ color: "rgba(162,137,89,0.45)" }}>
                      {t("portal.applied")} {new Date(submission.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {statusMap[submission.status] && (
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold"
                        style={{ color: statusMap[submission.status].color, background: statusMap[submission.status].bg }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: statusMap[submission.status].color }} />
                        {statusMap[submission.status].label}
                      </span>
                    )}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
                      style={{ borderColor: "rgba(162,137,89,0.18)", background: "rgba(162,137,89,0.05)" }}>
                      <span className="text-xs" style={{ color: "rgba(162,137,89,0.4)" }}>Ref</span>
                      <span className="text-sm font-bold tracking-widest font-mono" style={{ color: GOLD }}>
                        STU{submission.passportNumber.slice(-4).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                {submission.adminNotes && submission.status !== "docs_requested" && (
                  <div className="mt-5 pt-4 border-t flex gap-3" style={{ borderColor: "rgba(162,137,89,0.12)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
                      style={{ background: "rgba(162,137,89,0.1)", border: "1px solid rgba(162,137,89,0.2)" }}>
                      💬
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: GOLD }}>Note from your consultant</p>
                      <p className="text-sm leading-relaxed" style={{ color: "rgba(162,137,89,0.65)" }}>{submission.adminNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── UNDER REVIEW ── */}
            {submission.status === "pending" && (
              <div className="rounded-2xl p-8 border text-center" style={{ background: "rgba(162,137,89,0.04)", borderColor: "rgba(162,137,89,0.12)" }}>
                <div className="text-5xl mb-4">⏳</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: GOLD }}>Under Review</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(162,137,89,0.6)" }}>
                  Our consultants are carefully reviewing your submission.<br />You will be notified here and by email once a decision has been made.
                </p>
              </div>
            )}

            {/* ── APPROVED — WAIT ── */}
            {submission.status === "approved" && (
              <div className="rounded-2xl p-8 border text-center" style={{ background: "rgba(74,222,128,0.04)", borderColor: "rgba(74,222,128,0.18)" }}>
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-xl font-bold mb-3" style={{ color: "#4ade80" }}>Your Application Has Been Approved!</h3>
                <p className="text-base leading-relaxed mb-2" style={{ color: "rgba(74,222,128,0.75)" }}>
                  Congratulations — your application has been reviewed and approved by our consultants.
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(74,222,128,0.55)" }}>
                  Please <strong style={{ color: "#4ade80" }}>wait patiently for further instructions</strong>. Our team will contact you shortly with the next steps.
                </p>
              </div>
            )}

            {/* ── DOCUMENTS REQUESTED ── */}
            {submission.status === "docs_requested" && (
              <StudentDocManager
                submissionId={submission.id}
                documents={submission.documents}
                onResubmit={fetchSubmission}
                onDocsChanged={fetchSubmission}
              />
            )}

            {/* ── PAYMENT ── */}
            {(submission.status === "payment_pending" || submission.status === "payment_received" || submission.status === "acknowledged") && (
              <PaymentPage submission={submission} onUpdated={fetchSubmission} />
            )}

            {/* ── ACKNOWLEDGED — code + Close ── */}
            {submission.status === "acknowledged" && !showTimeline && (
              <div className="mt-6 rounded-2xl p-8 text-center border" style={{ background: "rgba(74,222,128,0.04)", borderColor: "rgba(74,222,128,0.18)" }}>
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: "#4ade80" }}>Payment Received</h3>
                <p className="text-sm mb-6" style={{ color: "rgba(74,222,128,0.65)" }}>
                  Your payment has been confirmed and your application is now being fully processed. Our team will be in touch shortly.
                </p>
                <div className="inline-flex flex-col items-center gap-1 px-8 py-4 rounded-2xl border mb-6" style={{ background: "rgba(74,222,128,0.06)", borderColor: "rgba(74,222,128,0.22)" }}>
                  <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(74,222,128,0.5)" }}>Your Acknowledgement Code</p>
                  <p className="text-3xl font-bold tracking-widest font-mono" style={{ color: "#4ade80" }}>
                    STU{submission.passportNumber.slice(-4).toUpperCase()}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "rgba(74,222,128,0.4)" }}>Keep this code for your records</p>
                </div>
                <button onClick={() => setShowTimeline(true)}
                  className="px-8 py-3 rounded-full text-sm font-semibold border transition-all hover:opacity-80"
                  style={{ borderColor: "rgba(74,222,128,0.3)", color: "#4ade80", background: "rgba(74,222,128,0.06)" }}>
                  Close
                </button>
              </div>
            )}

            {/* ── INTERVIEW ARRANGED ── */}
            {submission.status === "interview_arranged" && (
              <div className="mt-6 rounded-2xl p-8 border" style={{ background: "rgba(167,139,250,0.04)", borderColor: "rgba(167,139,250,0.2)" }}>
                <div className="text-5xl mb-4 text-center">🎥</div>
                <h3 className="text-xl font-bold mb-2 text-center" style={{ color: "#a78bfa" }}>Mock Interview Scheduled</h3>
                <p className="text-sm text-center mb-6" style={{ color: "rgba(167,139,250,0.65)" }}>
                  Your mock interview has been arranged. Please join on time and ensure your camera and microphone are working.
                </p>
                <div className="rounded-2xl border p-5 mb-6" style={{ background: "rgba(167,139,250,0.06)", borderColor: "rgba(167,139,250,0.2)" }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {submission.interviewDateTime && (
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: "rgba(167,139,250,0.5)" }}>Date & Time</p>
                        <p className="text-sm font-semibold" style={{ color: "#a78bfa" }}>{submission.interviewDateTime}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: "rgba(167,139,250,0.5)" }}>Platform</p>
                      <p className="text-sm font-semibold" style={{ color: "#a78bfa" }}>Zoom</p>
                    </div>
                  </div>
                </div>
                {submission.interviewZoomLink && (
                  <a href={submission.interviewZoomLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-base font-semibold transition-all hover:opacity-90"
                    style={{ background: "#a78bfa", color: "#0f2d18" }}>
                    🎥 Join Zoom Meeting →
                  </a>
                )}
              </div>
            )}

            {/* ── INTERVIEW COMPLETED (waiting for admin to request 2nd payment) ── */}
            {submission.status === "interview_completed" && (
              <div className="mt-6 rounded-2xl p-8 border text-center" style={{ background: "rgba(74,222,128,0.04)", borderColor: "rgba(74,222,128,0.18)" }}>
                <div className="text-5xl mb-4">🎓</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: "#4ade80" }}>Mock Interview Completed</h3>
                <p className="text-sm mb-2" style={{ color: "rgba(74,222,128,0.65)" }}>
                  Well done — your mock interview is complete.
                </p>
                <p className="text-base font-semibold mt-4" style={{ color: GOLD }}>
                  ⏳ Awaiting Next Steps
                </p>
                <p className="text-sm mt-2" style={{ color: "rgba(162,137,89,0.55)" }}>
                  Our team will be in touch shortly with further instructions.
                </p>
              </div>
            )}

            {/* ── 2ND PAYMENT PENDING ── */}
            {(submission.status === "second_payment_pending" || submission.status === "second_payment_received") && (
              <PaymentPage submission={submission} onUpdated={fetchSubmission} paymentType="second" />
            )}

            {/* ── 2ND PAYMENT CONFIRMED ── */}
            {submission.status === "second_payment_confirmed" && (
              <div className="mt-6 rounded-2xl p-8 border text-center" style={{ background: "rgba(74,222,128,0.04)", borderColor: "rgba(74,222,128,0.18)" }}>
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: "#4ade80" }}>2nd Payment Confirmed</h3>
                <p className="text-sm mb-2" style={{ color: "rgba(74,222,128,0.65)" }}>
                  Your second payment has been received and confirmed.
                </p>
                <p className="text-base font-semibold mt-4" style={{ color: GOLD }}>
                  ⏳ Awaiting University Interview
                </p>
                <p className="text-sm mt-2" style={{ color: "rgba(162,137,89,0.55)" }}>
                  Our team is coordinating with the university. You will be notified as soon as your interview is scheduled.
                </p>
              </div>
            )}

            {/* ── UNIVERSITY INTERVIEW ARRANGED ── */}
            {submission.status === "university_interview_arranged" && (() => {
              const isTeams = submission.uniInterviewPlatform === "teams";
              const platformLabel = isTeams ? "Microsoft Teams" : "Zoom";
              const platformColor = isTeams ? "#6264a7" : "#2d8cff";
              const platformEmoji = isTeams ? "💼" : "🎥";
              return (
                <div className="mt-6 rounded-2xl p-8 border" style={{ background: "rgba(56,189,248,0.04)", borderColor: "rgba(56,189,248,0.2)" }}>
                  <div className="text-5xl mb-4 text-center">{platformEmoji}</div>
                  <h3 className="text-xl font-bold mb-2 text-center" style={{ color: "#38bdf8" }}>University Interview Scheduled</h3>
                  <p className="text-sm text-center mb-6" style={{ color: "rgba(56,189,248,0.65)" }}>
                    Your university interview has been arranged. Please be on time and ensure your camera and microphone are working.
                  </p>
                  <div className="rounded-2xl border p-5 mb-6" style={{ background: "rgba(56,189,248,0.06)", borderColor: "rgba(56,189,248,0.2)" }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {submission.uniInterviewDateTime && (
                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>Date & Time</p>
                          <p className="text-sm font-semibold" style={{ color: "#38bdf8" }}>{submission.uniInterviewDateTime}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>Platform</p>
                        <p className="text-sm font-semibold" style={{ color: "#38bdf8" }}>{platformLabel}</p>
                      </div>
                    </div>
                  </div>
                  {submission.uniInterviewLink && (
                    <a href={submission.uniInterviewLink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-base font-semibold transition-all hover:opacity-90 mb-4"
                      style={{ background: platformColor, color: "#ffffff" }}>
                      {platformEmoji} Join {platformLabel} →
                    </a>
                  )}
                  <button onClick={handleCompleteUni} disabled={completingUni}
                    className="w-full py-3 rounded-2xl text-sm font-semibold border transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: "rgba(74,222,128,0.06)", borderColor: "rgba(74,222,128,0.25)", color: "#4ade80" }}>
                    {completingUni
                      ? <><span className="w-3 h-3 rounded-full border animate-spin" style={{ borderColor: "#4ade80", borderTopColor: "transparent" }} /> Updating…</>
                      : "✅ University Interview Completed"}
                  </button>
                </div>
              );
            })()}

            {/* ── ADDITIONAL DOCUMENTS REQUESTED BANNER ── */}
            {submission.additionalDocsRequested && (
              <div className="mt-6 rounded-2xl border overflow-hidden" style={{ background: "rgba(251,146,60,0.05)", borderColor: "rgba(251,146,60,0.25)" }}>
                <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: "rgba(251,146,60,0.18)" }}>
                  <span className="text-xl">📎</span>
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: "#fb923c" }}>Additional Documents Required</h3>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(251,146,60,0.55)" }}>Your consultant has requested additional documents</p>
                  </div>
                </div>
                <div className="px-6 py-5 space-y-4">
                  {submission.additionalDocsRequestNote && (
                    <div className="rounded-xl px-4 py-3 border text-sm" style={{ background: "rgba(251,146,60,0.04)", borderColor: "rgba(251,146,60,0.18)", color: "rgba(251,146,60,0.75)", lineHeight: 1.6 }}>
                      <strong style={{ color: "#fb923c" }}>Note from consultant:</strong><br />{submission.additionalDocsRequestNote}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: "rgba(251,146,60,0.6)" }}>Add a note (optional)</label>
                    <textarea rows={2} placeholder="e.g., 'Enclosed please find the requested transcript…'"
                      value={additionalDocsNote}
                      onChange={e => setAdditionalDocsNote(e.target.value)}
                      className="w-full rounded-xl px-3 py-2 text-sm outline-none border resize-none"
                      style={{ background: "rgba(251,146,60,0.04)", borderColor: "rgba(251,146,60,0.15)", color: "#fb923c" }} />
                  </div>
                  <button onClick={() => additionalDocsRef.current?.click()} disabled={uploadingAdditionalDocs}
                    className="w-full py-3 rounded-2xl text-sm font-semibold border transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: "rgba(251,146,60,0.08)", borderColor: "rgba(251,146,60,0.3)", color: "#fb923c" }}>
                    {uploadingAdditionalDocs
                      ? <><span className="w-3 h-3 rounded-full border animate-spin" style={{ borderColor: "#fb923c", borderTopColor: "transparent" }} /> Uploading…</>
                      : <><span>📁</span> Choose Document & Confirm</>}
                  </button>
                  <input ref={additionalDocsRef} type="file" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleAdditionalDocsSubmit(f); }} />
                  {additionalDocsError && <p className="text-xs" style={{ color: "#f87171" }}>{additionalDocsError}</p>}
                </div>
              </div>
            )}

            {/* ── OFFER LETTER PENDING — Final Payment ── */}
            {submission.status === "offer_letter_pending" && (
              <div className="mt-6">
                <PaymentPage submission={submission} onUpdated={fetchSubmission} paymentType="final" />
              </div>
            )}

            {/* ── FINAL PAYMENT RECEIVED — Awaiting confirmation ── */}
            {submission.status === "final_payment_received" && (
              <div className="mt-6 rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(96,165,250,0.2)" }}>
                <div className="px-6 py-5 flex items-center gap-3 border-b" style={{ borderColor: "rgba(96,165,250,0.12)" }}>
                  <span className="text-xl">⏳</span>
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: "#60a5fa" }}>Confirming Your Final Payment</h3>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(96,165,250,0.55)" }}>Our consultant will confirm your payment shortly</p>
                  </div>
                </div>
                <div className="px-6 py-5">
                  <div className="rounded-xl px-4 py-3 border text-sm" style={{ background: "rgba(96,165,250,0.04)", borderColor: "rgba(96,165,250,0.14)", color: "rgba(96,165,250,0.65)", lineHeight: 1.6 }}>
                    Your payment receipt has been received and is being reviewed by our team. Once confirmed, your official offer letter will be available to download from this portal.
                  </div>
                </div>
              </div>
            )}

            {/* ── FINAL PAYMENT CONFIRMED — Download Offer Letter ── */}
            {submission.status === "final_payment_confirmed" && (() => {
              const offerDoc = submission.documents.find(d => d.documentType === "offer_letter");
              return (
                <div className="mt-6 rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(74,222,128,0.25)" }}>
                  <div className="px-6 py-5 border-b text-center" style={{ borderColor: "rgba(74,222,128,0.12)" }}>
                    <div className="text-5xl mb-3">🎉</div>
                    <h3 className="text-xl font-bold mb-1" style={{ color: "#4ade80" }}>Congratulations!</h3>
                    <p className="text-sm" style={{ color: "rgba(74,222,128,0.6)" }}>Your final payment has been confirmed. Your offer letter is ready.</p>
                  </div>
                  <div className="px-6 py-5">
                    {offerDoc ? (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleOfferLetterView(submission.id, offerDoc.id)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold border transition-all hover:opacity-90"
                          style={{ background: "rgba(74,222,128,0.06)", borderColor: "rgba(74,222,128,0.22)", color: "#4ade80" }}>
                          <span>👁</span> View
                        </button>
                        <button
                          onClick={() => handleOfferLetterDownload(submission.id, offerDoc.id, offerDoc.fileName)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold border transition-all hover:opacity-90"
                          style={{ background: "rgba(74,222,128,0.1)", borderColor: "rgba(74,222,128,0.35)", color: "#4ade80" }}>
                          <span>📄</span> Download
                        </button>
                      </div>
                    ) : (
                      <p className="text-center text-sm" style={{ color: "rgba(74,222,128,0.45)" }}>Offer letter not yet available. Please contact your consultant.</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── PROCESSING NOTICE + IMMIGRATION REF (final_payment_confirmed) ── */}
            {submission.status === "final_payment_confirmed" && (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border px-5 py-4 flex items-start gap-3" style={{ background: "rgba(162,137,89,0.04)", borderColor: "rgba(162,137,89,0.15)" }}>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(162,137,89,0.6)" }}>{t("portal.processing")}</p>
                </div>
                {submission.immigrationRefNumber && (
                  <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(74,222,128,0.03)", borderColor: "rgba(74,222,128,0.2)" }}>
                    <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(74,222,128,0.12)" }}>
                      <p className="text-sm font-semibold" style={{ color: "#4ade80" }}>{t("portal.immigRef")}</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(74,222,128,0.5)" }}>{t("portal.immigRefSub")}</p>
                    </div>
                    <div className="px-5 py-4">
                      <p className="font-mono text-2xl font-bold tracking-wider" style={{ color: "#4ade80" }}>{submission.immigrationRefNumber}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── UNIVERSITY INTERVIEW COMPLETED ── */}
            {submission.status === "university_interview_completed" && (
              <div className="mt-6 rounded-2xl p-8 border text-center" style={{ background: "rgba(162,137,89,0.04)", borderColor: "rgba(162,137,89,0.15)" }}>
                <div className="text-5xl mb-4">🎓</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: GOLD }}>University Interview Completed</h3>
                <p className="text-sm mb-2" style={{ color: "rgba(162,137,89,0.65)" }}>
                  Congratulations on completing your university interview.
                </p>
                <div className="mt-5 px-6 py-5 rounded-2xl border" style={{ background: "rgba(162,137,89,0.05)", borderColor: "rgba(162,137,89,0.15)" }}>
                  <p className="text-base font-semibold" style={{ color: GOLD }}>⏳ Waiting for University's Response</p>
                  <p className="text-sm mt-2" style={{ color: "rgba(162,137,89,0.55)" }}>
                    The university is reviewing your application. Our team will keep you updated as soon as a decision is made.
                  </p>
                </div>
              </div>
            )}

            {/* ── REJECTED ── */}
            {submission.status === "rejected" && (
              <div className="rounded-2xl p-8 border text-center" style={{ background: "rgba(248,113,113,0.04)", borderColor: "rgba(248,113,113,0.18)" }}>
                <div className="text-5xl mb-4">📋</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: "#f87171" }}>Application Unsuccessful</h3>
                {submission.adminNotes && (
                  <p className="text-sm mb-4 px-4 py-3 rounded-xl border mx-auto max-w-md" style={{ color: "rgba(248,113,113,0.75)", borderColor: "rgba(248,113,113,0.15)", background: "rgba(248,113,113,0.05)" }}>
                    {submission.adminNotes}
                  </p>
                )}
                <p className="text-sm" style={{ color: "rgba(248,113,113,0.5)" }}>
                  Please contact HARROWGATE Consultancy if you have any questions.
                </p>
              </div>
            )}

            {/* ── TIMELINE ── */}
            {showTimeline && ["acknowledged","interview_arranged","interview_completed","university_interview_arranged","university_interview_completed","offer_letter_pending","final_payment_received","final_payment_confirmed"].includes(submission.status) && (
              <div className="mt-6 rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(162,137,89,0.12)" }}>
                <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(162,137,89,0.1)" }}>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: GOLD }}>Application Progress</h3>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(162,137,89,0.4)" }}>
                      Reference <span className="font-mono font-semibold">STU{submission.passportNumber.slice(-4).toUpperCase()}</span>
                    </p>
                  </div>
                  {/* Count completed / total */}
                  {(() => {
                    const tl = buildTimeline(submission);
                    const done = tl.filter(t => t.done).length;
                    return (
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "rgba(162,137,89,0.08)", color: GOLD }}>
                        {done}/{tl.length} steps
                      </span>
                    );
                  })()}
                </div>
                <div className="px-5 py-5">
                  {buildTimeline(submission).map((step, i, arr) => (
                    <div key={step.label} className="flex gap-3 group">
                      {/* Icon column */}
                      <div className="flex flex-col items-center" style={{ width: 32, flexShrink: 0 }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                          style={{
                            background: step.done
                              ? "rgba(74,222,128,0.15)"
                              : step.current
                              ? "rgba(162,137,89,0.14)"
                              : "rgba(162,137,89,0.04)",
                            border: `1.5px solid ${
                              step.done
                                ? "rgba(74,222,128,0.4)"
                                : step.current
                                ? "rgba(162,137,89,0.35)"
                                : "rgba(162,137,89,0.1)"
                            }`,
                            boxShadow: step.current ? "0 0 10px rgba(162,137,89,0.15)" : "none",
                          }}>
                          {step.done ? (
                            <svg viewBox="0 0 14 14" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                              <polyline points="2,7 5.5,10.5 12,3.5" />
                            </svg>
                          ) : step.current ? (
                            <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: GOLD }} />
                          ) : (
                            <span className="w-2 h-2 rounded-full" style={{ background: "rgba(162,137,89,0.15)" }} />
                          )}
                        </div>
                        {i < arr.length - 1 && (
                          <div className="w-px flex-1 my-1" style={{ background: step.done ? "rgba(74,222,128,0.2)" : "rgba(162,137,89,0.07)", minHeight: 20 }} />
                        )}
                      </div>
                      {/* Content */}
                      <div className="pb-5 flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold leading-tight"
                            style={{ color: step.done ? "#4ade80" : step.current ? GOLD : "rgba(162,137,89,0.28)" }}>
                            {step.label}
                          </p>
                          {step.current && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: "rgba(162,137,89,0.1)", color: GOLD }}>
                              In Progress
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5 leading-relaxed"
                          style={{ color: step.done ? "rgba(74,222,128,0.5)" : step.current ? "rgba(162,137,89,0.55)" : "rgba(162,137,89,0.25)" }}>
                          {step.note}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Details card (non-payment / non-doc / non-interview statuses) ── */}
            {!["payment_pending","payment_received","acknowledged","docs_requested","interview_arranged","interview_completed","university_interview_arranged","university_interview_completed","offer_letter_pending","final_payment_received","final_payment_confirmed"].includes(submission.status) && (
              <div className="mt-6 rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(162,137,89,0.1)" }}>
                <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(162,137,89,0.1)" }}>
                  <h3 className="text-sm font-semibold" style={{ color: GOLD }}>Application Details</h3>
                </div>
                <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {[["Full Name", submission.name], ["Date of Birth", submission.dateOfBirth], ["Passport", submission.passportNumber]].map(([l, v]) => (
                    <div key={l}>
                      <p className="text-xs font-medium mb-1" style={{ color: "rgba(162,137,89,0.45)" }}>{l}</p>
                      <p className="text-sm font-semibold" style={{ color: GOLD }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div className="px-6 py-4 border-t" style={{ borderColor: "rgba(162,137,89,0.08)" }}>
                  <p className="text-xs font-medium mb-3" style={{ color: "rgba(162,137,89,0.45)" }}>Uploaded Documents</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { type: "passport_photo",        label: "Passport Photo",      icon: "🖼️" },
                      { type: "passport_doc",          label: "Passport / Travel Doc",icon: "📘" },
                      { type: "birth_certificate",     label: "Birth Cert / ID",     icon: "📋" },
                      { type: "cv",                    label: "CV",                  icon: "📄" },
                      { type: "edu_results",           label: "Edu. Results",        icon: "📄" },
                      { type: "edu_transcript",        label: "Edu. Transcript",     icon: "📄" },
                      { type: "higher_edu_results",    label: "Higher Edu. Result",  icon: "📄" },
                      { type: "higher_edu_transcript", label: "Higher Edu. Transcript", icon: "📄" },
                    ].map(({ type, label, icon }) => {
                      const doc = submission.documents.find(d => d.documentType === type);
                      return (
                        <div key={type} className="rounded-xl p-3 text-center border text-xs" style={{
                          background: doc ? "rgba(162,137,89,0.08)" : "rgba(162,137,89,0.03)",
                          borderColor: doc ? "rgba(162,137,89,0.22)" : "rgba(162,137,89,0.07)",
                          color: doc ? GOLD : "rgba(162,137,89,0.3)",
                        }}>
                          <div className="text-lg mb-1">{doc ? icon : "—"}</div>
                          <div className="font-medium leading-tight">{label}</div>
                          {doc && <div className="mt-1 opacity-50 truncate">{doc.fileName.slice(0, 12)}…</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── MESSAGES ── */}
            {(messages.length > 0 || true) && (
              <div className="mt-6 rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(96,165,250,0.15)" }}>
                <button
                  className="w-full px-5 py-4 flex items-center justify-between text-left transition-colors hover:bg-white/[0.02]"
                  onClick={() => setShowMessages(v => !v)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                        <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-sm font-semibold" style={{ color: "#60a5fa" }}>Messages</span>
                      {messages.filter(m => m.fromAdmin && !m.isRead).length > 0 ? (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(96,165,250,0.18)", color: "#60a5fa" }}>
                          {messages.filter(m => m.fromAdmin && !m.isRead).length} new
                        </span>
                      ) : (
                        <span className="ml-2 text-xs" style={{ color: "rgba(96,165,250,0.35)" }}>
                          {messages.length > 0 ? `${messages.length} message${messages.length !== 1 ? "s" : ""}` : "No messages yet"}
                        </span>
                      )}
                    </div>
                  </div>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 transition-transform" style={{ color: "rgba(96,165,250,0.35)", transform: showMessages ? "rotate(180deg)" : "rotate(0deg)" }}>
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                {showMessages && (
                  <div className="border-t" style={{ borderColor: "rgba(96,165,250,0.1)" }}>
                    {/* Message thread */}
                    <div className="px-4 py-4 space-y-3 max-h-80 overflow-y-auto">
                      {messages.length === 0 && (
                        <div className="text-center py-8">
                          <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
                            style={{ background: "rgba(96,165,250,0.08)" }}>
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" style={{ color: "rgba(96,165,250,0.3)" }}>
                              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                            </svg>
                          </div>
                          <p className="text-sm" style={{ color: "rgba(96,165,250,0.35)" }}>No messages yet</p>
                          <p className="text-xs mt-1" style={{ color: "rgba(96,165,250,0.25)" }}>Your consultant will reach out here when needed.</p>
                        </div>
                      )}

                      {messages.map(msg => (
                        <div key={msg.id} className={`flex gap-2.5 ${msg.fromAdmin ? "" : "flex-row-reverse"}`}>
                          {/* Avatar */}
                          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5"
                            style={{
                              background: msg.fromAdmin ? "rgba(96,165,250,0.15)" : "rgba(74,222,128,0.15)",
                              color: msg.fromAdmin ? "#60a5fa" : "#4ade80",
                            }}>
                            {msg.fromAdmin ? "H" : (submission.name[0] || "Y")}
                          </div>
                          {/* Bubble */}
                          <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${msg.fromAdmin ? "rounded-tl-sm" : "rounded-tr-sm"}`}
                            style={{
                              background: msg.fromAdmin ? "rgba(96,165,250,0.08)" : "rgba(74,222,128,0.08)",
                              border: `1px solid ${msg.fromAdmin ? "rgba(96,165,250,0.15)" : "rgba(74,222,128,0.15)"}`,
                            }}>
                            <div className="flex items-center justify-between gap-3 mb-1.5">
                              <span className="text-xs font-semibold" style={{ color: msg.fromAdmin ? "#60a5fa" : "#4ade80" }}>
                                {msg.fromAdmin ? "HARROWGATE" : "You"}
                                {msg.fromAdmin && msg.subject && <span className="ml-1 opacity-60"> · {msg.subject}</span>}
                              </span>
                              <span className="text-xs shrink-0" style={{ color: msg.fromAdmin ? "rgba(96,165,250,0.3)" : "rgba(74,222,128,0.3)" }}>
                                {new Date(msg.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} {new Date(msg.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            {msg.body && (
                              <p className="text-sm leading-relaxed" style={{ color: msg.fromAdmin ? "rgba(96,165,250,0.85)" : "rgba(74,222,128,0.85)", whiteSpace: "pre-wrap" }}>
                                {msg.body}
                              </p>
                            )}
                            {msg.attachments?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {msg.attachments.map((att: any, i: number) => (
                                  <a key={i} href={`${getApiBase()}/api/storage/objects/${att.fileUrl}`} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium hover:opacity-80 transition-opacity"
                                    style={{ borderColor: "rgba(96,165,250,0.2)", color: "#60a5fa", background: "rgba(96,165,250,0.05)" }}>
                                    📎 {att.fileName}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reply area */}
                    <div className="px-4 pb-4 border-t pt-3 space-y-2.5" style={{ borderColor: "rgba(96,165,250,0.1)" }}>
                      {replyAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {replyAttachments.map((att, i) => (
                            <div key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs"
                              style={{ borderColor: "rgba(96,165,250,0.2)", color: "#60a5fa", background: "rgba(96,165,250,0.05)" }}>
                              📎 {att.fileName}
                              <button onClick={() => setReplyAttachments(a => a.filter((_, j) => j !== i))}
                                className="ml-1 hover:opacity-70" style={{ color: "#f87171" }}>✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      {replyError && <p className="text-xs" style={{ color: "#f87171" }}>{replyError}</p>}
                      <div className="flex gap-2 items-end">
                        <textarea rows={2} placeholder="Reply to your consultant…"
                          value={replyBody}
                          onChange={e => setReplyBody(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSendReply(); }}
                          className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none border resize-none"
                          style={{ background: "rgba(96,165,250,0.04)", borderColor: "rgba(96,165,250,0.15)", color: "#60a5fa", minHeight: 60 }} />
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button onClick={() => replyAttachmentRef.current?.click()} disabled={uploadingReplyAttachment}
                            className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all hover:opacity-70 disabled:opacity-40"
                            style={{ borderColor: "rgba(96,165,250,0.15)", background: "rgba(96,165,250,0.05)", color: "#60a5fa" }}
                            title="Attach file">
                            {uploadingReplyAttachment
                              ? <span className="w-3 h-3 rounded-full border animate-spin" style={{ borderColor: "#60a5fa", borderTopColor: "transparent" }} />
                              : <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" /></svg>}
                          </button>
                          <button onClick={handleSendReply} disabled={sendingReply || (!replyBody.trim() && replyAttachments.length === 0)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-90 disabled:opacity-40"
                            style={{ background: "#60a5fa", color: "#0b2213" }}
                            title="Send (Ctrl+Enter)">
                            {sendingReply
                              ? <span className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#0b2213", borderTopColor: "transparent" }} />
                              : <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs" style={{ color: "rgba(96,165,250,0.25)" }}>Ctrl+Enter to send</p>
                      <input ref={replyAttachmentRef} type="file" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleReplyAttachment(f); }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
