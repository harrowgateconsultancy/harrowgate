import { useEffect, useState, useRef } from "react";
import { useUser, useClerk } from "@clerk/react";
import ApplyForm from "./ApplyForm";
import PaymentPage from "./PaymentPage";
import StudentDocManager from "./StudentDocManager";

const BG = "#0f2d18";
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
  const [submission, setSubmission] = useState<Submission | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);
  const [completingUni, setCompletingUni] = useState(false);
  const [additionalDocsNote, setAdditionalDocsNote] = useState("");
  const [uploadingAdditionalDocs, setUploadingAdditionalDocs] = useState(false);
  const [additionalDocsError, setAdditionalDocsError] = useState<string | null>(null);
  const additionalDocsRef = useRef<HTMLInputElement | null>(null);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const email = user?.primaryEmailAddress?.emailAddress;
      const url = email
        ? `${getApiBase()}/api/student/submissions/me?email=${encodeURIComponent(email)}`
        : `${getApiBase()}/api/student/submissions/me`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) setSubmission(await res.json());
      else if (res.status === 401) setSubmission(null);
    } catch { setSubmission(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isLoaded) fetchSubmission(); }, [isLoaded]);

  const handleCompleteUni = async () => {
    if (!submission) return;
    setCompletingUni(true);
    try {
      const res = await fetch(`${getApiBase()}/api/student/submissions/${submission.id}/complete-university-interview`, { method: "POST", credentials: "include" });
      if (res.ok) fetchSubmission();
    } finally { setCompletingUni(false); }
  };

  const handleOfferLetterView = async (submissionId: number, docId: number) => {
    try {
      const res = await fetch(`${getApiBase()}/api/student/submissions/${submissionId}/documents/${docId}/view`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load file");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { alert("Could not open the file. Please try again."); }
  };

  const handleOfferLetterDownload = async (submissionId: number, docId: number, fileName: string) => {
    try {
      const res = await fetch(`${getApiBase()}/api/student/submissions/${submissionId}/documents/${docId}/download`, { credentials: "include" });
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
      const res = await fetch(`${getApiBase()}/api/student/submissions/${submission.id}/additional-docs`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
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
          <div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-4" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: "rgba(162,137,89,0.7)" }}>Loading your portal…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b max-w-5xl mx-auto" style={{ borderColor: "rgba(162,137,89,0.15)" }}>
        <div className="flex items-center gap-4">
          <button onClick={() => signOut({ redirectUrl: BASE || "/" })}
            className="text-sm transition-opacity hover:opacity-70" style={{ color: "rgba(162,137,89,0.5)" }}>←</button>
          <img src="/harrowgate-logo.png" alt="HARROWGATE" className="h-10 object-contain" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs hidden sm:block" style={{ color: "rgba(162,137,89,0.5)" }}>
            {user?.primaryEmailAddress?.emailAddress}
          </span>
          <button onClick={() => signOut({ redirectUrl: BASE || "/" })}
            className="text-xs px-4 py-1.5 rounded-full border transition-all hover:opacity-80"
            style={{ borderColor: "rgba(162,137,89,0.25)", color: GOLD }}>
            Sign out
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {submission === null && <ApplyForm user={user} onSubmitted={fetchSubmission} />}

        {submission && (
          <>
            {/* Status Banner */}
            <div className="mb-8 rounded-2xl p-6 border" style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(162,137,89,0.15)" }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "rgba(162,137,89,0.45)" }}>Application Status</p>
                  <h2 className="text-2xl font-bold mb-1" style={{ color: GOLD }}>
                    Welcome back, {submission.name.split(" ")[0]}.
                  </h2>
                  <p className="text-sm" style={{ color: "rgba(162,137,89,0.55)" }}>
                    Submitted {new Date(submission.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {statusMap[submission.status] && (
                    <span className="px-4 py-1.5 rounded-full text-sm font-semibold" style={{ color: statusMap[submission.status].color, background: statusMap[submission.status].bg }}>
                      {statusMap[submission.status].label}
                    </span>
                  )}
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border" style={{ borderColor: "rgba(162,137,89,0.2)", background: "rgba(162,137,89,0.06)" }}>
                    <span className="text-xs font-medium" style={{ color: "rgba(162,137,89,0.5)" }}>Reference</span>
                    <span className="text-sm font-bold tracking-widest font-mono" style={{ color: GOLD }}>
                      STU{submission.passportNumber.slice(-4).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              {submission.adminNotes && submission.status !== "docs_requested" && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(162,137,89,0.15)" }}>
                  <p className="text-sm font-medium mb-1" style={{ color: GOLD }}>Note from Consultant</p>
                  <p className="text-sm" style={{ color: "rgba(162,137,89,0.65)" }}>{submission.adminNotes}</p>
                </div>
              )}
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
                <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(162,137,89,0.1)" }}>
                  <h3 className="text-base font-semibold" style={{ color: GOLD }}>Application Progress</h3>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(162,137,89,0.45)" }}>
                    Reference: <span className="font-mono font-semibold">STU{submission.passportNumber.slice(-4).toUpperCase()}</span>
                  </p>
                </div>
                <div className="px-6 py-6">
                  {buildTimeline(submission).map((step, i, arr) => (
                    <div key={step.label} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                          style={{
                            background: step.done ? "rgba(74,222,128,0.12)" : step.current ? "rgba(162,137,89,0.1)" : "rgba(162,137,89,0.04)",
                            border: `1.5px solid ${step.done ? "rgba(74,222,128,0.3)" : step.current ? "rgba(162,137,89,0.25)" : "rgba(162,137,89,0.08)"}`,
                          }}>
                          {step.icon}
                        </div>
                        {i < arr.length - 1 && (
                          <div className="w-px flex-1 my-1" style={{ background: step.done ? "rgba(74,222,128,0.2)" : "rgba(162,137,89,0.07)", minHeight: 24 }} />
                        )}
                      </div>
                      <div className="pb-5 flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight" style={{ color: step.done ? "#4ade80" : step.current ? GOLD : "rgba(162,137,89,0.3)" }}>
                          {step.label}
                          {step.current && <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium align-middle" style={{ background: "rgba(162,137,89,0.1)", color: GOLD }}>Current</span>}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: step.done ? "rgba(74,222,128,0.5)" : "rgba(162,137,89,0.35)" }}>{step.note}</p>
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
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {["edu_1","edu_2","edu_3","edu_4","edu_5"].map((type, i) => {
                      const doc = submission.documents.find(d => d.documentType === type);
                      return (
                        <div key={type} className="rounded-xl p-3 text-center border text-xs" style={{
                          background: doc ? "rgba(162,137,89,0.08)" : "rgba(162,137,89,0.03)",
                          borderColor: doc ? "rgba(162,137,89,0.22)" : "rgba(162,137,89,0.07)",
                          color: doc ? GOLD : "rgba(162,137,89,0.3)",
                        }}>
                          <div className="text-lg mb-1">{doc ? "📄" : "—"}</div>
                          <div className="font-medium">Doc {i+1}</div>
                          {doc && <div className="mt-1 opacity-50 truncate">{doc.fileName.slice(0,10)}…</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
