import { useEffect, useState } from "react";
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
  documents: Array<{ id: number; submissionId: number; documentType: string; fileName: string; fileUrl: string; mimeType?: string | null }>;
};

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  pending:          { label: "Under Review",              color: GOLD,      bg: "rgba(162,137,89,0.12)" },
  approved:         { label: "Approved",                  color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  docs_requested:   { label: "Documents Requested",       color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  payment_pending:  { label: "Payment Required",          color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  payment_received: { label: "Pending Payment Confirmation", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  acknowledged:     { label: "Payment Received ✓",          color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  rejected:         { label: "Application Unsuccessful",  color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

export default function Portal() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [submission, setSubmission] = useState<Submission | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${getApiBase()}/api/student/submissions/me`, { credentials: "include" });
      if (res.ok) setSubmission(await res.json());
      else if (res.status === 401) setSubmission(null);
    } catch { setSubmission(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isLoaded) fetchSubmission(); }, [isLoaded]);

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
        {/* No submission yet */}
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

            {/* ── ACKNOWLEDGED ── */}
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

            {/* ── TIMELINE (after Close) ── */}
            {submission.status === "acknowledged" && showTimeline && (
              <div className="mt-6 rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(162,137,89,0.12)" }}>
                <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(162,137,89,0.1)" }}>
                  <h3 className="text-base font-semibold" style={{ color: GOLD }}>Application Progress</h3>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(162,137,89,0.45)" }}>
                    Reference: <span className="font-mono font-semibold">STU{submission.passportNumber.slice(-4).toUpperCase()}</span>
                  </p>
                </div>
                <div className="px-6 py-6">
                  {[
                    { icon: "✅", label: "Application Submitted",        done: true,    note: new Date(submission.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) },
                    { icon: "✅", label: "Documents Reviewed",            done: true,    note: "Approved by HARROWGATE consultant" },
                    { icon: "✅", label: "Payment Confirmed",             done: true,    note: `Acknowledgement code: STU${submission.passportNumber.slice(-4).toUpperCase()}` },
                    { icon: "🔄", label: "Awaiting Interview Arrangement", done: false,   note: "Our team will contact you to schedule your mock interview", current: true },
                    { icon: "⬜", label: "Mock Interview",                 done: false,   note: "To be scheduled" },
                    { icon: "⬜", label: "Visa Application Submitted",     done: false,   note: "Final step" },
                  ].map((step, i, arr) => (
                    <div key={step.label} className="flex gap-4" style={{ marginBottom: i < arr.length - 1 ? "0" : "0" }}>
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 font-bold"
                          style={{
                            background: step.done ? "rgba(74,222,128,0.12)" : step.current ? "rgba(162,137,89,0.1)" : "rgba(162,137,89,0.05)",
                            border: `1.5px solid ${step.done ? "rgba(74,222,128,0.3)" : step.current ? "rgba(162,137,89,0.25)" : "rgba(162,137,89,0.1)"}`,
                          }}>
                          {step.icon}
                        </div>
                        {i < arr.length - 1 && (
                          <div className="w-px flex-1 my-1" style={{ background: step.done ? "rgba(74,222,128,0.2)" : "rgba(162,137,89,0.08)", minHeight: 24 }} />
                        )}
                      </div>
                      <div className="pb-5 flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight" style={{ color: step.done ? "#4ade80" : step.current ? GOLD : "rgba(162,137,89,0.35)" }}>
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

            {/* ── Details card (for non-payment / non-doc statuses) ── */}
            {!["payment_pending","payment_received","acknowledged","docs_requested"].includes(submission.status) && (
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
