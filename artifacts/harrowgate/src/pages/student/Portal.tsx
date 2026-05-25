import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/react";
import { useLocation } from "wouter";
import ApplyForm from "./ApplyForm";
import PaymentPage from "./PaymentPage";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getApiBase() {
  return `${window.location.origin}${BASE}`;
}

export type Submission = {
  id: number;
  clerkUserId: string;
  name: string;
  dateOfBirth: string;
  passportNumber: string;
  email: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  documents: Array<{
    id: number;
    submissionId: number;
    documentType: string;
    fileName: string;
    fileUrl: string;
  }>;
};

export default function Portal() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const [submission, setSubmission] = useState<Submission | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${getApiBase()}/api/student/submissions/me`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setSubmission(data);
      } else if (res.status === 401) {
        setSubmission(null);
      }
    } catch {
      setSubmission(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded) fetchSubmission();
  }, [isLoaded]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#a13300" }}>
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4" style={{ borderColor: "#a28959", borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: "rgba(162,137,89,0.7)" }}>Loading your portal…</p>
        </div>
      </div>
    );
  }

  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: "Under Review", color: "#a28959", bg: "rgba(162,137,89,0.12)" },
    approved: { label: "Approved", color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
    payment_pending: { label: "Payment Required", color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
    payment_received: { label: "Payment Received", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
    acknowledged: { label: "Acknowledged", color: "#a28959", bg: "rgba(162,137,89,0.12)" },
    rejected: { label: "Requires Attention", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  };

  return (
    <div className="min-h-screen" style={{ background: "#a13300" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 border-b max-w-5xl mx-auto" style={{ borderColor: "rgba(162,137,89,0.15)" }}>
        <img src={`${BASE}/logo.svg`} alt="HARROWGATE" className="h-7" />
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: "rgba(162,137,89,0.7)" }}>
            {user?.primaryEmailAddress?.emailAddress}
          </span>
          <button
            onClick={() => signOut({ redirectUrl: BASE || "/" })}
            className="text-sm px-4 py-1.5 rounded-full border transition-all hover:opacity-80"
            style={{ borderColor: "rgba(162,137,89,0.3)", color: "#a28959" }}
          >
            Sign out
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* No submission yet — show form */}
        {submission === null && (
          <ApplyForm user={user} onSubmitted={fetchSubmission} />
        )}

        {/* Has submission */}
        {submission && (
          <>
            {/* Status Banner */}
            <div className="mb-8 rounded-2xl p-6 border" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(162,137,89,0.15)" }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "rgba(162,137,89,0.5)" }}>Application Status</p>
                  <h2 className="text-2xl font-bold mb-1" style={{ color: "#a28959" }}>
                    Welcome back, {submission.name.split(" ")[0]}.
                  </h2>
                  <p className="text-sm" style={{ color: "rgba(162,137,89,0.6)" }}>
                    Submitted {new Date(submission.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                {submission.status && statusMap[submission.status] && (
                  <span
                    className="px-4 py-1.5 rounded-full text-sm font-semibold"
                    style={{ color: statusMap[submission.status].color, background: statusMap[submission.status].bg }}
                  >
                    {statusMap[submission.status].label}
                  </span>
                )}
              </div>
              {submission.adminNotes && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(162,137,89,0.15)" }}>
                  <p className="text-sm font-medium mb-1" style={{ color: "#a28959" }}>Note from Consultant</p>
                  <p className="text-sm" style={{ color: "rgba(162,137,89,0.7)" }}>{submission.adminNotes}</p>
                </div>
              )}
            </div>

            {/* Payment Page */}
            {(submission.status === "payment_pending" || submission.status === "payment_received" || submission.status === "acknowledged") && (
              <PaymentPage submission={submission} onUpdated={fetchSubmission} />
            )}

            {/* Acknowledged success */}
            {submission.status === "acknowledged" && (
              <div className="mt-6 rounded-2xl p-8 text-center border" style={{ background: "rgba(74,222,128,0.06)", borderColor: "rgba(74,222,128,0.2)" }}>
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: "#4ade80" }}>Application Acknowledged</h3>
                <p className="text-sm" style={{ color: "rgba(74,222,128,0.7)" }}>
                  Your payment has been confirmed and your application is now being processed. Our team will be in touch shortly.
                </p>
              </div>
            )}

            {/* Application Details Card */}
            {submission.status !== "payment_pending" && submission.status !== "payment_received" && submission.status !== "acknowledged" && (
              <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(162,137,89,0.15)" }}>
                <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(162,137,89,0.15)" }}>
                  <h3 className="text-base font-semibold" style={{ color: "#a28959" }}>Your Details</h3>
                </div>
                <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    { label: "Full Name", value: submission.name },
                    { label: "Date of Birth", value: submission.dateOfBirth },
                    { label: "Passport Number", value: submission.passportNumber },
                  ].map((f) => (
                    <div key={f.label}>
                      <p className="text-xs font-medium mb-1" style={{ color: "rgba(162,137,89,0.5)" }}>{f.label}</p>
                      <p className="text-sm font-semibold" style={{ color: "#a28959" }}>{f.value}</p>
                    </div>
                  ))}
                </div>
                <div className="px-6 py-4 border-t" style={{ borderColor: "rgba(162,137,89,0.15)" }}>
                  <p className="text-xs font-medium mb-3" style={{ color: "rgba(162,137,89,0.5)" }}>Uploaded Documents</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {["edu_1","edu_2","edu_3","edu_4","edu_5"].map((type, i) => {
                      const doc = submission.documents.find(d => d.documentType === type);
                      return (
                        <div
                          key={type}
                          className="rounded-xl p-3 text-center border text-xs"
                          style={{
                            background: doc ? "rgba(162,137,89,0.1)" : "rgba(162,137,89,0.04)",
                            borderColor: doc ? "rgba(162,137,89,0.3)" : "rgba(162,137,89,0.1)",
                            color: doc ? "#a28959" : "rgba(162,137,89,0.35)",
                          }}
                        >
                          <div className="text-lg mb-1">{doc ? "📄" : "—"}</div>
                          <div className="font-medium">Doc {i+1}</div>
                          {doc && <div className="mt-1 opacity-60 truncate" title={doc.fileName}>{doc.fileName.slice(0,12)}…</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Pending message */}
            {submission.status === "pending" && (
              <div className="mt-6 rounded-2xl p-6 border text-center" style={{ background: "rgba(162,137,89,0.06)", borderColor: "rgba(162,137,89,0.15)" }}>
                <div className="text-4xl mb-3">⏳</div>
                <p className="text-sm font-medium mb-1" style={{ color: "#a28959" }}>Under Review</p>
                <p className="text-sm" style={{ color: "rgba(162,137,89,0.6)" }}>
                  Our consultants are reviewing your submission. You'll be notified here once a decision has been made.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
