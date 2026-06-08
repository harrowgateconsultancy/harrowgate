import { useEffect, useState, useRef } from "react";
import { useUser, useClerk, useSession } from "@clerk/react";
import ApplyForm from "./ApplyForm";
import PaymentPage from "./PaymentPage";
import TermsModal from "./TermsModal";
import StudentDocManager from "./StudentDocManager";
import DropZone from "../../components/DropZone";
import { useLang, LANG_LIST } from "../../i18n";
import { usePricing } from "../../hooks/usePricing";
import { COURSES, LEVEL_LABELS, type DegreeLevel } from "../../data/courses";
import { io as socketIo } from "socket.io-client";

const BG = "#0b2213";
const _GOLD = "#a28959";

function CoursesPanel() {
  const levels: DegreeLevel[] = ["masters", "bachelors", "associate"];
  const [activeLevel, setActiveLevel] = useState<DegreeLevel>("masters");
  const [search, setSearch] = useState("");
  const courses = COURSES.filter(c => c.level === activeLevel && (
    search.trim() === "" || c.programme.toLowerCase().includes(search.toLowerCase())
  ));
  return (
    <div className="mt-6 rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(162,137,89,0.1)" }}>
      <div className="px-5 py-4 border-b flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: "rgba(162,137,89,0.1)" }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: _GOLD }}>Available Courses</h3>
          <p className="text-xs mt-0.5" style={{ color: "rgba(162,137,89,0.4)" }}>Hong Kong universities & programmes — {COURSES.length} courses total</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl p-1" style={{ background: "rgba(0,0,0,0.2)" }}>
          {levels.map(l => (
            <button key={l} onClick={() => { setActiveLevel(l); setSearch(""); }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{ background: activeLevel === l ? "rgba(162,137,89,0.18)" : "transparent", color: activeLevel === l ? _GOLD : "rgba(162,137,89,0.4)" }}>
              {l === "masters" ? "Master's" : l === "bachelors" ? "Bachelor's" : "Associate"}
            </button>
          ))}
        </div>
      </div>
      <div className="px-5 pt-4 pb-2">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search programmes…"
          className="w-full text-sm px-4 py-2.5 rounded-xl border bg-transparent outline-none transition-colors"
          style={{ borderColor: "rgba(162,137,89,0.18)", color: _GOLD, background: "rgba(162,137,89,0.04)" }}
        />
      </div>
      <div className="px-5 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
        {courses.length === 0 ? (
          <p className="text-sm col-span-2 text-center py-4" style={{ color: "rgba(162,137,89,0.35)" }}>No courses match "{search}"</p>
        ) : courses.map(c => (
          <div key={c.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 border"
            style={{ background: "rgba(162,137,89,0.03)", borderColor: "rgba(162,137,89,0.08)" }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: _GOLD }} />
            <span className="text-sm leading-snug" style={{ color: "rgba(162,137,89,0.75)" }}>{c.programme}</span>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 border-t" style={{ borderColor: "rgba(162,137,89,0.08)" }}>
        <p className="text-xs" style={{ color: "rgba(162,137,89,0.3)" }}>
          Showing {courses.length} {LEVEL_LABELS[activeLevel].toLowerCase()} programmes in Hong Kong for 2026. Your advisor will help you choose.
        </p>
      </div>
    </div>
  );
}
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
  termsAcceptedAt?: string | null;
  preferredLevel?: string | null;
  preferredCourse?: string | null;
  preferredInstitution?: string | null;
  sharedEmail?: string | null;
  sharedEmailPassword?: string | null;
  deletedAt?: string | null;
  documents: Array<{ id: number; submissionId: number; documentType: string; fileName: string; fileUrl: string; mimeType?: string | null }>;
};

const statusMap: Record<string, { color: string; bg: string }> = {
  pending:                       { color: GOLD,        bg: "rgba(162,137,89,0.12)" },
  approved:                      { color: "#4ade80",   bg: "rgba(74,222,128,0.12)" },
  docs_requested:                { color: "#fb923c",   bg: "rgba(251,146,60,0.12)" },
  payment_pending:               { color: "#fb923c",   bg: "rgba(251,146,60,0.12)" },
  payment_received:              { color: "#60a5fa",   bg: "rgba(96,165,250,0.12)" },
  acknowledged:                  { color: "#4ade80",   bg: "rgba(74,222,128,0.12)" },
  interview_arranged:            { color: "#a78bfa",   bg: "rgba(167,139,250,0.12)" },
  interview_completed:           { color: "#4ade80",   bg: "rgba(74,222,128,0.12)" },
  second_payment_pending:        { color: "#fb923c",   bg: "rgba(251,146,60,0.12)" },
  second_payment_received:       { color: "#60a5fa",   bg: "rgba(96,165,250,0.12)" },
  second_payment_confirmed:      { color: "#4ade80",   bg: "rgba(74,222,128,0.12)" },
  university_interview_arranged: { color: "#38bdf8",   bg: "rgba(56,189,248,0.12)" },
  university_interview_completed:{ color: "#4ade80",   bg: "rgba(74,222,128,0.12)" },
  offer_letter_pending:          { color: "#fb923c",   bg: "rgba(251,146,60,0.12)"  },
  final_payment_received:        { color: "#60a5fa",   bg: "rgba(96,165,250,0.12)"  },
  final_payment_confirmed:       { color: "#4ade80",   bg: "rgba(74,222,128,0.12)"  },
  visa_issued:                   { color: "#34d399",   bg: "rgba(52,211,153,0.12)"  },
  rejected:                      { color: "#f87171",   bg: "rgba(248,113,113,0.12)" },
};

function getPaymentStep(status: string): number {
  if (status === "visa_issued") return 8;
  if (["final_payment_confirmed", "final_payment_received"].includes(status)) return 6;
  if (["offer_letter_pending", "university_interview_completed", "university_interview_arranged", "second_payment_confirmed"].includes(status)) return 5;
  if (["second_payment_received", "second_payment_pending", "interview_completed"].includes(status)) return 4;
  if (["interview_arranged"].includes(status)) return 3;
  if (["acknowledged", "payment_received", "payment_pending"].includes(status)) return 2;
  return 1;
}

const PAYMENT_JOURNEY = [
  { num: 1, labelKey: "journey.s1", amount: null as string | null, noteKey: null as string | null },
  { num: 2, labelKey: "journey.s2", amount: "HKD$ 3,000",          noteKey: "journey.nonRefundable" },
  { num: 3, labelKey: "journey.s3", amount: null,                   noteKey: null },
  {
    num: 4,
    labelKey: "journey.s4",
    amount: null as string | null,
    noteKey: null as string | null,
    tiers: [
      { labelKey: "pkg.tier1", amount: "HKD$ 45,000" },
      { labelKey: "pkg.tier2", amount: "HKD$ 40,000" },
      { labelKey: "pkg.tier3", amount: "HKD$ 30,000" },
    ],
    tierType: "stage2",
    tierNoteKey: null as string | null,
  },
  { num: 5, labelKey: "journey.s5", amount: null,                   noteKey: null },
  {
    num: 6,
    labelKey: "journey.s6",
    amount: null as string | null,
    noteKey: null as string | null,
    tiers: [
      { labelKey: "pkg.tier1", amount: "HKD$ 125,000" },
      { labelKey: "pkg.tier2", amount: "HKD$ 115,000" },
      { labelKey: "pkg.tier3", amount: "HKD$ 75,000" },
    ],
    tierNoteKey: "journey.tierNote",
  },
  { num: 7, labelKey: "journey.s7", amount: null,                   noteKey: null },
  { num: 8, labelKey: "journey.s8", amount: null,                   noteKey: null },
];

type TimelineStep = { icon: string; label: string; note: string; done: boolean; current?: boolean };

function buildTimeline(submission: Submission, t: (key: string) => string): TimelineStep[] {
  const s = submission.status;
  const ref = `STU${submission.passportNumber.slice(-4).toUpperCase()}`;
  const submittedDate = new Date(submission.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const postStatuses = ["acknowledged","interview_arranged","interview_completed","second_payment_pending","second_payment_received","second_payment_confirmed","university_interview_arranged","university_interview_completed","offer_letter_pending","final_payment_received","final_payment_confirmed","visa_issued"];
  const afterPayment   = postStatuses.includes(s);
  const afterMock      = ["interview_completed","second_payment_pending","second_payment_received","second_payment_confirmed","university_interview_arranged","university_interview_completed","offer_letter_pending","final_payment_received","final_payment_confirmed","visa_issued"].includes(s);
  const after2ndPay    = ["second_payment_confirmed","university_interview_arranged","university_interview_completed","offer_letter_pending","final_payment_received","final_payment_confirmed","visa_issued"].includes(s);
  const in2ndPay       = ["second_payment_pending","second_payment_received"].includes(s);
  const afterUniArr    = ["university_interview_arranged","university_interview_completed","offer_letter_pending","final_payment_received","final_payment_confirmed","visa_issued"].includes(s);
  const afterUniDone   = ["university_interview_completed","offer_letter_pending","final_payment_received","final_payment_confirmed","visa_issued"].includes(s);
  const afterFinalPay  = ["final_payment_confirmed","visa_issued"].includes(s);
  const inFinalPay     = ["offer_letter_pending","final_payment_received"].includes(s);
  const eVisaDoc       = submission.documents.find(d => d.documentType === "evisa");

  void afterUniArr;

  return [
    { icon: "✅", label: t("tl.appSubmitted"),  note: submittedDate,                                                              done: true },
    { icon: "✅", label: t("tl.docsReviewed"),  note: t("tl.docsApproved"),                                                      done: true },
    { icon: "✅", label: t("tl.payConfirmed"),  note: `${t("tl.ackCode")}: ${ref}`,                                              done: true },
    {
      icon: afterPayment && s !== "acknowledged" ? "✅" : (s === "acknowledged" ? "🔄" : "⬜"),
      label: t("tl.mockArranging"),
      note: s === "acknowledged" ? t("tl.mockArrangeNote") : (afterPayment ? t("tl.arranged") : t("tl.upcoming")),
      done: afterPayment && s !== "acknowledged",
      current: s === "acknowledged",
    },
    {
      icon: s === "interview_arranged" ? "🔄" : (afterMock ? "✅" : "⬜"),
      label: t("tl.mockInterview"),
      note: s === "interview_arranged"
        ? (submission.interviewDateTime || t("tl.scheduledEmail"))
        : (afterMock ? t("tl.completed") : t("tl.toBeScheduled")),
      done: afterMock,
      current: s === "interview_arranged",
    },
    {
      icon: after2ndPay ? "✅" : (in2ndPay || s === "interview_completed" ? "🔄" : "⬜"),
      label: t("tl.payment2"),
      note: after2ndPay ? t("tl.confirmed") : (s === "second_payment_received" ? t("tl.receiptAwait") : (in2ndPay || s === "interview_completed" ? t("tl.paymentRequired") : t("tl.upcoming"))),
      done: after2ndPay,
      current: in2ndPay || s === "interview_completed",
    },
    {
      icon: afterUniDone ? "✅" : (s === "university_interview_arranged" ? "🔄" : (after2ndPay ? "🔄" : "⬜")),
      label: t("tl.uniInterview"),
      note: s === "second_payment_confirmed"
        ? t("tl.uniArranging")
        : s === "university_interview_arranged"
          ? (submission.uniInterviewDateTime || t("tl.scheduledEmail"))
          : (afterUniDone ? t("tl.completed") : t("tl.upcoming")),
      done: afterUniDone,
      current: s === "university_interview_arranged" || s === "second_payment_confirmed",
    },
    {
      icon: afterFinalPay ? "✅" : (inFinalPay ? "🔄" : (afterUniDone ? "🔄" : "⬜")),
      label: t("tl.offerFinalPay"),
      note: afterFinalPay
        ? t("tl.finalPayConfirmedNote")
        : inFinalPay
          ? (s === "final_payment_received" ? t("tl.receiptAwait") : t("tl.finalPayRequired"))
          : afterUniDone ? t("tl.awaitingOfferLetter") : t("tl.upcoming"),
      done: afterFinalPay,
      current: inFinalPay || (afterUniDone && !inFinalPay && !afterFinalPay),
    },
    {
      icon: submission.immigrationRefNumber ? "✅" : (afterFinalPay ? "🔄" : "⬜"),
      label: t("tl.visaSubmitted"),
      note: submission.immigrationRefNumber
        ? `${t("portal.ref")}: ${submission.immigrationRefNumber}`
        : afterFinalPay ? t("tl.visaSubmittedNote") : t("tl.finalStep"),
      done: !!submission.immigrationRefNumber,
      current: afterFinalPay && !submission.immigrationRefNumber && !eVisaDoc,
    },
    {
      icon: eVisaDoc ? "✅" : (submission.immigrationRefNumber ? "🔄" : "⬜"),
      label: t("tl.eVisaIssued"),
      note: eVisaDoc
        ? t("tl.eVisaIssuedNote")
        : submission.immigrationRefNumber ? t("tl.eVisaProcessing") : t("tl.finalStep"),
      done: !!eVisaDoc,
      current: !!submission.immigrationRefNumber && !eVisaDoc,
    },
  ];
}

interface EmailSummary { uid: number; subject: string; from: string; date: string; snippet: string; seen: boolean; }
interface EmailDetail extends EmailSummary { html: string | null; text: string | null; }
interface OutboxItem { id: number; toAddress: string; subject: string; body: string; status: string; createdAt: string; }

function InboxCard({ submission }: { submission: Submission }) {
  const { session } = useSession();
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<EmailDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [outboxLoading, setOutboxLoading] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeSending, setComposeSending] = useState(false);
  const [composeSent, setComposeSent] = useState(false);

  const authHdr = async () => {
    const token = await session?.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchInbox = async (refresh = false) => {
    setLoading(true); setError(null);
    try {
      const hdr = await authHdr();
      const url = `${getApiBase()}/api/student/submissions/${submission.id}/inbox${refresh ? "?refresh=1" : ""}`;
      const res = await fetch(url, { credentials: "include", headers: hdr });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setEmails(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const fetchOutbox = async () => {
    setOutboxLoading(true);
    try {
      const hdr = await authHdr();
      const res = await fetch(`${getApiBase()}/api/student/submissions/${submission.id}/outbox`, { credentials: "include", headers: hdr });
      if (res.ok) setOutbox(await res.json());
    } catch { }
    finally { setOutboxLoading(false); }
  };

  const openEmail = async (uid: number) => {
    setLoadingDetail(true); setSelected(null);
    try {
      const hdr = await authHdr();
      const res = await fetch(`${getApiBase()}/api/student/submissions/${submission.id}/inbox/${uid}`, { credentials: "include", headers: hdr });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const detail: EmailDetail = await res.json();
      setSelected(detail);
      setEmails(prev => prev.map(e => e.uid === uid ? { ...e, seen: true } : e));
    } catch (e: any) { setError((e as any).message); }
    finally { setLoadingDetail(false); }
  };

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && emails.length === 0 && !loading) fetchInbox();
  };

  const handleTabChange = (t: "inbox" | "sent") => {
    setTab(t);
    setSelected(null);
    if (t === "sent" && outbox.length === 0) fetchOutbox();
  };

  const handleCompose = () => {
    setComposeTo(""); setComposeSubject(""); setComposeBody("");
    setComposeSent(false);
    setComposeOpen(true);
  };

  const handleSend = async () => {
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) return;
    setComposeSending(true);
    try {
      const hdr = await authHdr();
      const res = await fetch(`${getApiBase()}/api/student/submissions/${submission.id}/outbox`, {
        method: "POST",
        credentials: "include",
        headers: { ...hdr, "Content-Type": "application/json" },
        body: JSON.stringify({ to: composeTo, subject: composeSubject, body: composeBody }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setComposeSent(true);
      setOutbox([]);
      setTimeout(() => { setComposeOpen(false); setComposeSent(false); }, 1600);
    } catch (e: any) { alert(e.message ?? "Failed to send. Please try again."); }
    finally { setComposeSending(false); }
  };

  const unread = emails.filter(e => !e.seen).length;

  if (!submission.sharedEmail) {
    return (
      <div className="mt-6 rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(162,137,89,0.15)" }}>
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: "rgba(162,137,89,0.08)" }}>✉️</div>
          <div>
            <p className="text-sm font-semibold" style={{ color: _GOLD }}>Application Email</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(162,137,89,0.4)" }}>
              Your dedicated application email is being set up. You will be notified once it is ready.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    {/* ── Compose modal ── */}
    {composeOpen && (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
        <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border overflow-hidden" style={{ background: "#0d1a3a", borderColor: "rgba(162,137,89,0.3)" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(162,137,89,0.15)" }}>
            <p className="text-sm font-semibold" style={{ color: _GOLD }}>✉️ New Email</p>
            <button onClick={() => setComposeOpen(false)} className="text-lg leading-none" style={{ color: "rgba(162,137,89,0.4)" }}>✕</button>
          </div>
          {composeSent ? (
            <div className="px-5 py-10 text-center">
              <div className="text-3xl mb-3">✅</div>
              <p className="text-sm font-semibold" style={{ color: "#4ade80" }}>Message sent!</p>
              <p className="text-xs mt-1" style={{ color: "rgba(162,137,89,0.45)" }}>Your email has been sent successfully.</p>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "rgba(162,137,89,0.55)" }}>To</label>
                <input
                  type="email" value={composeTo} onChange={e => setComposeTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none"
                  style={{ background: "rgba(162,137,89,0.05)", borderColor: "rgba(162,137,89,0.2)", color: _GOLD }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "rgba(162,137,89,0.55)" }}>Subject</label>
                <input
                  type="text" value={composeSubject} onChange={e => setComposeSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none"
                  style={{ background: "rgba(162,137,89,0.05)", borderColor: "rgba(162,137,89,0.2)", color: _GOLD }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "rgba(162,137,89,0.55)" }}>Message</label>
                <textarea
                  rows={7} value={composeBody} onChange={e => setComposeBody(e.target.value)}
                  placeholder="Write your message…"
                  className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none resize-none"
                  style={{ background: "rgba(162,137,89,0.05)", borderColor: "rgba(162,137,89,0.2)", color: _GOLD }}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setComposeOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm border transition-all hover:opacity-70"
                  style={{ borderColor: "rgba(162,137,89,0.2)", color: "rgba(162,137,89,0.5)", background: "transparent" }}>
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={composeSending || !composeTo.trim() || !composeSubject.trim() || !composeBody.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ background: _GOLD, color: "#0b2213" }}>
                  {composeSending ? "Sending…" : "Send ✉️"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    <div className="mt-6 rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(162,137,89,0.25)" }}>
      {/* ── Header / toggle ── */}
      <button
        className="w-full px-5 py-4 flex items-center gap-3 text-left transition-colors hover:bg-white/[0.02]"
        onClick={handleToggle}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: "rgba(162,137,89,0.1)" }}>✉️</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold" style={{ color: _GOLD }}>Application Inbox</p>
            {unread > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: "#a28959", color: "#0b2213" }}>{unread}</span>
            )}
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(162,137,89,0.45)" }}>{submission.sharedEmail}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {open && (
            <>
              <button
                onClick={e => { e.stopPropagation(); handleCompose(); }}
                className="text-xs px-2.5 py-1 rounded-lg border transition-all hover:opacity-70 flex items-center gap-1"
                style={{ borderColor: "rgba(162,137,89,0.28)", color: _GOLD, background: "rgba(162,137,89,0.1)" }}
              >
                ✏️ Compose
              </button>
              {tab === "inbox" && (
                <button
                  onClick={e => { e.stopPropagation(); fetchInbox(true); }}
                  disabled={loading}
                  className="text-xs px-2.5 py-1 rounded-lg border transition-all hover:opacity-70 disabled:opacity-40"
                  style={{ borderColor: "rgba(162,137,89,0.2)", color: "rgba(162,137,89,0.55)", background: "rgba(162,137,89,0.05)" }}
                >
                  {loading ? "…" : "↻ Refresh"}
                </button>
              )}
            </>
          )}
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 transition-transform" style={{ color: "rgba(162,137,89,0.4)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
            <path d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z"/>
          </svg>
        </div>
      </button>

      {/* ── Inbox panel ── */}
      {open && (
        <div className="border-t" style={{ borderColor: "rgba(162,137,89,0.12)" }}>

          {/* Tab bar */}
          {!selected && (
            <div className="flex border-b" style={{ borderColor: "rgba(162,137,89,0.1)" }}>
              {(["inbox", "sent"] as const).map(t => (
                <button key={t} onClick={() => handleTabChange(t)}
                  className="flex-1 py-2.5 text-xs font-semibold transition-all"
                  style={{
                    color: tab === t ? _GOLD : "rgba(162,137,89,0.4)",
                    borderBottom: tab === t ? `2px solid ${_GOLD}` : "2px solid transparent",
                    background: tab === t ? "rgba(162,137,89,0.04)" : "transparent",
                  }}>
                  {t === "inbox" ? "📥 Inbox" : "📤 Sent"}
                </button>
              ))}
            </div>
          )}

          {/* Email detail view */}
          {selected && (
            <div className="flex flex-col" style={{ maxHeight: 520 }}>
              <div className="px-5 py-3 border-b flex items-center gap-3" style={{ borderColor: "rgba(162,137,89,0.1)" }}>
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs px-2.5 py-1 rounded-lg border transition-all hover:opacity-70"
                  style={{ borderColor: "rgba(162,137,89,0.2)", color: "rgba(162,137,89,0.55)", background: "rgba(162,137,89,0.05)" }}
                >
                  ← Back
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: _GOLD }}>{selected.subject}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(162,137,89,0.45)" }}>{selected.from} · {new Date(selected.date).toLocaleString()}</p>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-4">
                {selected.html ? (
                  <iframe
                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;font-size:14px;color:#ddd;background:transparent;margin:0;padding:0;word-wrap:break-word;}a{color:#a28959;}img{max-width:100%;}</style></head><body>${selected.html}</body></html>`}
                    sandbox="allow-same-origin"
                    className="w-full rounded-xl border"
                    style={{ border: "1px solid rgba(162,137,89,0.1)", minHeight: 300, background: "rgba(0,0,0,0.15)" }}
                    onLoad={e => {
                      const iframe = e.currentTarget;
                      const h = iframe.contentDocument?.body?.scrollHeight;
                      if (h) iframe.style.height = `${h + 32}px`;
                    }}
                  />
                ) : (
                  <pre className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "rgba(162,137,89,0.8)", fontFamily: "inherit" }}>
                    {selected.text ?? "(No content)"}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Inbox tab */}
          {!selected && tab === "inbox" && (
            <div style={{ maxHeight: 420, overflowY: "auto" }}>
              {loading && (
                <div className="px-5 py-8 flex items-center justify-center gap-2" style={{ color: "rgba(162,137,89,0.4)" }}>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>
                  <span className="text-sm">Loading inbox…</span>
                </div>
              )}
              {error && !loading && (
                <div className="px-5 py-6 text-center">
                  <p className="text-sm mb-3" style={{ color: "#f87171" }}>{error}</p>
                  <button onClick={() => fetchInbox(true)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: "rgba(162,137,89,0.25)", color: _GOLD }}>Try again</button>
                </div>
              )}
              {!loading && !error && emails.length === 0 && (
                <div className="px-5 py-8 text-center" style={{ color: "rgba(162,137,89,0.35)" }}>
                  <p className="text-sm">No emails yet</p>
                </div>
              )}
              {!loading && emails.map(email => (
                <button
                  key={email.uid}
                  onClick={() => openEmail(email.uid)}
                  disabled={loadingDetail}
                  className="w-full text-left px-5 py-3.5 border-b transition-colors hover:bg-white/[0.03] disabled:opacity-50"
                  style={{ borderColor: "rgba(162,137,89,0.08)" }}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: email.seen ? "transparent" : "#a28959", border: email.seen ? "1.5px solid rgba(162,137,89,0.25)" : "none" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm truncate" style={{ color: email.seen ? "rgba(162,137,89,0.65)" : _GOLD, fontWeight: email.seen ? 400 : 600 }}>
                          {email.from.split(" <")[0]}
                        </p>
                        <span className="text-xs shrink-0" style={{ color: "rgba(162,137,89,0.35)" }}>
                          {new Date(email.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: email.seen ? "rgba(162,137,89,0.5)" : "rgba(162,137,89,0.8)", fontWeight: email.seen ? 400 : 500 }}>
                        {email.subject}
                      </p>
                      {email.snippet && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(162,137,89,0.35)" }}>{email.snippet}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Sent tab */}
          {!selected && tab === "sent" && (
            <div style={{ maxHeight: 420, overflowY: "auto" }}>
              {outboxLoading && (
                <div className="px-5 py-8 flex items-center justify-center gap-2" style={{ color: "rgba(162,137,89,0.4)" }}>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>
                  <span className="text-sm">Loading…</span>
                </div>
              )}
              {!outboxLoading && outbox.length === 0 && (
                <div className="px-5 py-8 text-center" style={{ color: "rgba(162,137,89,0.35)" }}>
                  <p className="text-sm">No sent emails yet</p>
                  <button onClick={handleCompose} className="mt-3 text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: "rgba(162,137,89,0.25)", color: _GOLD }}>
                    ✏️ Compose your first email
                  </button>
                </div>
              )}
              {!outboxLoading && outbox.map(item => (
                <div key={item.id} className="px-5 py-3.5 border-b" style={{ borderColor: "rgba(162,137,89,0.08)" }}>
                  <div className="flex items-start gap-3">
                    <span className="mt-1 text-sm">📤</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm truncate font-medium" style={{ color: "rgba(162,137,89,0.75)" }}>To: {item.toAddress}</p>
                        <span className="text-xs shrink-0" style={{ color: "rgba(162,137,89,0.35)" }}>
                          {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 truncate font-medium" style={{ color: "rgba(162,137,89,0.8)" }}>{item.subject}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(162,137,89,0.35)" }}>{item.body}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>Sent</span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
    </>
  );
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
  const pricing = usePricing();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const langPickerRef = useRef<HTMLDivElement | null>(null);

  // Screen share state
  const [isBeingWatched, setIsBeingWatched] = useState(false);
  const socketRef = useRef<ReturnType<typeof socketIo> | null>(null);
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (submission && ["interview_arranged","interview_completed","second_payment_pending","second_payment_received","second_payment_confirmed","university_interview_arranged","university_interview_completed","offer_letter_pending","final_payment_received","final_payment_confirmed","visa_issued"].includes(submission.status)) {
      setShowTimeline(true);
    }
  }, [submission?.status]);

  // Screen share: connect socket when submission is loaded
  useEffect(() => {
    if (!submission?.id) return;
    const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
    const socket = socketIo(window.location.origin, {
      path: `${BASE_URL}/api/socket.io`,
      transports: ["polling", "websocket"],
      auth: { role: "student", submissionId: submission.id },
    });
    socketRef.current = socket;

    const startCapture = () => {
      setIsBeingWatched(true);
      captureIntervalRef.current = setInterval(async () => {
        if (!portalRef.current) return;
        try {
          const h2c = await import("html2canvas");
          const canvas = await h2c.default(portalRef.current, {
            scale: 0.85, useCORS: true, allowTaint: true,
            backgroundColor: "#0b2213", logging: false,
          });
          socket.emit("student:frame", canvas.toDataURL("image/jpeg", 0.82));
        } catch { /* ignore capture errors */ }
      }, 1200);
    };

    const stopCapture = () => {
      setIsBeingWatched(false);
      if (captureIntervalRef.current) { clearInterval(captureIntervalRef.current); captureIntervalRef.current = null; }
    };

    socket.on("watch:start", startCapture);
    socket.on("watch:stop", stopCapture);

    return () => {
      stopCapture();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [submission?.id]);

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

  const statusStyle = submission ? statusMap[submission.status] : null;
  const statusLabel = (s: string) => t(`status.${s}`);

  return (
    <div ref={portalRef} className="min-h-screen" dir={isRtl ? "rtl" : "ltr"} style={{ background: BG }}>

      {/* Screen share banner */}
      {isBeingWatched && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9998, background: "rgba(13,26,58,0.97)", borderBottom: "1px solid rgba(162,137,89,0.3)", backdropFilter: "blur(8px)" }}>
          <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 max-w-5xl mx-auto">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#f87171" }} />
              <span className="text-xs sm:text-sm" style={{ color: "rgba(162,137,89,0.85)" }}>
                Harrowgate support is viewing your screen to guide you through your application
              </span>
            </div>
            <button
              onClick={() => {
                setIsBeingWatched(false);
                if (captureIntervalRef.current) { clearInterval(captureIntervalRef.current); captureIntervalRef.current = null; }
                socketRef.current?.emit("watch:stop");
              }}
              className="text-xs px-3 py-1 rounded-full border ml-4 shrink-0 transition-all hover:opacity-80"
              style={{ borderColor: "rgba(248,113,113,0.35)", color: "#f87171" }}>
              Stop sharing
            </button>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(162,137,89,0.12)", backdropFilter: "blur(12px)", background: "rgba(11,34,19,0.9)", position: "sticky", top: isBeingWatched ? 37 : 0, zIndex: 50 }}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3.5 max-w-5xl mx-auto">
          <img src="/harrowgate-logo.png" alt="HARROWGATE" className="h-12 sm:h-20 object-contain" />
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {submission === null && <ApplyForm user={user} onSubmitted={fetchSubmission} />}

        {submission && (
          <>
            {/* ── TERMS & CONDITIONS GATE — blocks entire portal until signed ── */}
            {!submission.termsAcceptedAt && submission.status !== "pending" && submission.status !== "rejected" && (
              <TermsModal
                submissionId={submission.id}
                studentName={submission.name}
                authHeaders={authHeaders as () => Promise<Record<string, string>>}
                onAccepted={fetchSubmission}
              />
            )}

            {/* Status Banner */}
            <div className="mb-6 sm:mb-8 rounded-2xl overflow-hidden border" style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(162,137,89,0.14)" }}>
              <div className="h-0.5 w-full" style={{ background: `linear-gradient(to right, transparent, ${GOLD}, transparent)` }} />
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.25em] uppercase mb-2" style={{ color: "rgba(162,137,89,0.4)" }}>
                      {t("portal.title")}
                    </p>
                    <h2 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: GOLD }}>
                      {t("portal.welcomeBack")}, {submission.name.split(" ")[0]}.
                    </h2>
                    <p className="text-sm" style={{ color: "rgba(162,137,89,0.45)" }}>
                      {t("portal.applied")} {new Date(submission.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {statusStyle && (
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold"
                        style={{ color: statusStyle.color, background: statusStyle.bg }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: statusStyle.color }} />
                        {statusLabel(submission.status)}
                      </span>
                    )}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
                      style={{ borderColor: "rgba(162,137,89,0.18)", background: "rgba(162,137,89,0.05)" }}>
                      <span className="text-xs" style={{ color: "rgba(162,137,89,0.4)" }}>{t("portal.ref")}</span>
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
                      <p className="text-xs font-semibold mb-1" style={{ color: GOLD }}>{t("portal.consultant")}</p>
                      <p className="text-sm leading-relaxed" style={{ color: "rgba(162,137,89,0.65)" }}>{submission.adminNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── PAYMENT JOURNEY ── */}
            {submission.status !== "rejected" && (() => {
              const currentStep = getPaymentStep(submission.status);
              return (
                <div className="mb-6 rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(162,137,89,0.1)" }}>
                  <div className="h-px w-full" style={{ background: "linear-gradient(to right, transparent, rgba(162,137,89,0.45), transparent)" }} />
                  <div className="px-5 py-4 border-b flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: "rgba(162,137,89,0.08)" }}>
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: GOLD }}>{t("journey.cardTitle")}</h3>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(162,137,89,0.4)" }}>{t("journey.cardSub")}</p>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-full shrink-0" style={{ background: "rgba(162,137,89,0.08)", color: GOLD }}>
                      {currentStep} / 8
                    </span>
                  </div>
                  <div className="px-5 py-5">
                    <div className="relative">
                      <div className="absolute left-[18px] top-5 bottom-5 w-px hidden sm:block" style={{ background: "linear-gradient(to bottom, transparent, rgba(162,137,89,0.18) 8%, rgba(162,137,89,0.18) 92%, transparent)" }} />
                      <div className="space-y-2.5">
                        {PAYMENT_JOURNEY.map((step) => {
                          const isDone = step.num < currentStep;
                          const isCurrent = step.num === currentStep;
                          const isUpcoming = step.num > currentStep;
                          const hasTiers = "tiers" in step && (step as any).tiers;
                          return (
                            <div key={step.num} className="flex gap-4 items-start">
                              {/* Step number bubble */}
                              <div className="shrink-0 flex flex-col items-center" style={{ minWidth: 36 }}>
                                <div
                                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                                  style={{
                                    background: isDone ? "rgba(74,222,128,0.15)" : isCurrent ? "rgba(162,137,89,0.18)" : "rgba(162,137,89,0.04)",
                                    border: `1.5px solid ${isDone ? "rgba(74,222,128,0.45)" : isCurrent ? GOLD : "rgba(162,137,89,0.12)"}`,
                                    color: isDone ? "#4ade80" : isCurrent ? GOLD : "rgba(162,137,89,0.25)",
                                    boxShadow: isCurrent ? "0 0 14px rgba(162,137,89,0.2)" : "none",
                                  }}>
                                  {isDone ? (
                                    <svg viewBox="0 0 14 14" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                      <polyline points="2,7 5.5,10.5 12,3.5" />
                                    </svg>
                                  ) : step.num}
                                </div>
                              </div>
                              {/* Content row */}
                              <div
                                className="flex-1 rounded-xl px-4 py-3 border transition-all"
                                style={{
                                  background: isCurrent ? "rgba(162,137,89,0.07)" : isDone ? "rgba(74,222,128,0.04)" : "rgba(162,137,89,0.02)",
                                  borderColor: isCurrent ? "rgba(162,137,89,0.28)" : isDone ? "rgba(74,222,128,0.18)" : "rgba(162,137,89,0.07)",
                                  boxShadow: isCurrent ? "0 2px 16px rgba(162,137,89,0.08)" : "none",
                                }}>
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                  <p className="text-sm font-semibold" style={{ color: isCurrent ? GOLD : isDone ? "#4ade80" : "rgba(162,137,89,0.28)" }}>
                                    {t(step.labelKey)}
                                    {isCurrent && <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: "rgba(162,137,89,0.12)", color: GOLD }}>{t("journey.current")}</span>}
                                  </p>
                                  {step.amount && (
                                    <span className="text-sm font-bold px-3 py-1 rounded-lg shrink-0"
                                      style={{
                                        background: isUpcoming ? "rgba(162,137,89,0.05)" : isCurrent ? "rgba(162,137,89,0.15)" : "rgba(74,222,128,0.08)",
                                        color: isUpcoming ? "rgba(162,137,89,0.3)" : isCurrent ? GOLD : "#4ade80",
                                        border: `1px solid ${isUpcoming ? "rgba(162,137,89,0.1)" : isCurrent ? "rgba(162,137,89,0.3)" : "rgba(74,222,128,0.2)"}`,
                                      }}>
                                      {step.amount}
                                      {step.noteKey && <span className="ml-1 text-xs font-normal opacity-70">({t(step.noteKey)})</span>}
                                    </span>
                                  )}
                                </div>
                                {hasTiers && (
                                  <div className="mt-2.5 space-y-1.5">
                                    <div className="flex flex-wrap gap-2">
                                      {(step as any).tiers.map((tier: { labelKey: string; amount: string }) => {
                                        const isStage2 = (step as any).tierType === "stage2";
                                        const tierAmountMap: Record<string, string> = isStage2
                                          ? {
                                              "pkg.tier1": pricing.mastersStage2,
                                              "pkg.tier2": pricing.bachelorStage2,
                                              "pkg.tier3": pricing.associateStage2,
                                            }
                                          : {
                                              "pkg.tier1": pricing.mastersLastPayment,
                                              "pkg.tier2": pricing.bachelorLastPayment,
                                              "pkg.tier3": pricing.associateLastPayment,
                                            };
                                        const displayAmount = tierAmountMap[tier.labelKey] ?? tier.amount;
                                        return (
                                        <div key={tier.labelKey} className="flex flex-col items-center px-3 py-2 rounded-lg border text-center"
                                          style={{
                                            background: isUpcoming ? "rgba(162,137,89,0.03)" : isCurrent ? "rgba(162,137,89,0.1)" : "rgba(74,222,128,0.06)",
                                            borderColor: isUpcoming ? "rgba(162,137,89,0.1)" : isCurrent ? "rgba(162,137,89,0.25)" : "rgba(74,222,128,0.2)",
                                          }}>
                                          <p className="text-sm font-bold" style={{ color: isUpcoming ? "rgba(162,137,89,0.28)" : isCurrent ? GOLD : "#4ade80" }}>{displayAmount}</p>
                                          <p className="text-xs mt-0.5" style={{ color: isUpcoming ? "rgba(162,137,89,0.2)" : "rgba(162,137,89,0.45)" }}>{t(tier.labelKey)}</p>
                                        </div>
                                        );
                                      })}
                                    </div>
                                    <p className="text-xs" style={{ color: isUpcoming ? "rgba(162,137,89,0.2)" : "rgba(162,137,89,0.45)" }}>
                                      * {t((step as any).tierNoteKey)}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── UNDER REVIEW ── */}
            {submission.status === "pending" && (
              <div className="rounded-2xl p-8 border text-center" style={{ background: "rgba(162,137,89,0.04)", borderColor: "rgba(162,137,89,0.12)" }}>
                <div className="text-5xl mb-4">⏳</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: GOLD }}>{t("s.underReview")}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(162,137,89,0.6)" }}>
                  {t("s.underReviewSub")}
                </p>
              </div>
            )}

            {/* ── APPROVED — WAIT ── */}
            {submission.status === "approved" && (
              <div className="rounded-2xl p-8 border text-center" style={{ background: "rgba(74,222,128,0.04)", borderColor: "rgba(74,222,128,0.18)" }}>
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-xl font-bold mb-3" style={{ color: "#4ade80" }}>{t("s.approvedTitle")}</h3>
                <p className="text-base leading-relaxed mb-2" style={{ color: "rgba(74,222,128,0.75)" }}>
                  {t("s.approvedSub")}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(74,222,128,0.55)" }}>
                  {t("s.approvedNote")}
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
                <h3 className="text-xl font-bold mb-2" style={{ color: "#4ade80" }}>{t("s.payReceived")}</h3>
                <p className="text-sm mb-6" style={{ color: "rgba(74,222,128,0.65)" }}>
                  {t("s.payReceivedSub")}
                </p>
                <div className="inline-flex flex-col items-center gap-1 px-8 py-4 rounded-2xl border mb-6" style={{ background: "rgba(74,222,128,0.06)", borderColor: "rgba(74,222,128,0.22)" }}>
                  <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(74,222,128,0.5)" }}>{t("s.ackCodeLabel")}</p>
                  <p className="text-3xl font-bold tracking-widest font-mono" style={{ color: "#4ade80" }}>
                    STU{submission.passportNumber.slice(-4).toUpperCase()}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "rgba(74,222,128,0.4)" }}>{t("s.ackCodeNote")}</p>
                </div>
                <button onClick={() => setShowTimeline(true)}
                  className="px-8 py-3 rounded-full text-sm font-semibold border transition-all hover:opacity-80"
                  style={{ borderColor: "rgba(74,222,128,0.3)", color: "#4ade80", background: "rgba(74,222,128,0.06)" }}>
                  {t("s.close")}
                </button>
              </div>
            )}

            {/* ── INTERVIEW ARRANGED ── */}
            {submission.status === "interview_arranged" && (
              <div className="mt-6 rounded-2xl p-8 border" style={{ background: "rgba(167,139,250,0.04)", borderColor: "rgba(167,139,250,0.2)" }}>
                <div className="text-5xl mb-4 text-center">🎥</div>
                <h3 className="text-xl font-bold mb-2 text-center" style={{ color: "#a78bfa" }}>{t("s.mockScheduled")}</h3>
                <p className="text-sm text-center mb-6" style={{ color: "rgba(167,139,250,0.65)" }}>
                  {t("s.mockScheduledSub")}
                </p>
                <div className="rounded-2xl border p-5 mb-6" style={{ background: "rgba(167,139,250,0.06)", borderColor: "rgba(167,139,250,0.2)" }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {submission.interviewDateTime && (
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: "rgba(167,139,250,0.5)" }}>{t("s.dateTime")}</p>
                        <p className="text-sm font-semibold" style={{ color: "#a78bfa" }}>{submission.interviewDateTime}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: "rgba(167,139,250,0.5)" }}>{t("s.platform")}</p>
                      <p className="text-sm font-semibold" style={{ color: "#a78bfa" }}>Zoom</p>
                    </div>
                  </div>
                </div>
                {submission.interviewZoomLink && (
                  <a href={submission.interviewZoomLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-base font-semibold transition-all hover:opacity-90"
                    style={{ background: "#a78bfa", color: "#0f2d18" }}>
                    🎥 {t("s.joinZoom")}
                  </a>
                )}
              </div>
            )}

            {/* ── INTERVIEW COMPLETED ── */}
            {submission.status === "interview_completed" && (
              <div className="mt-6 rounded-2xl p-8 border text-center" style={{ background: "rgba(74,222,128,0.04)", borderColor: "rgba(74,222,128,0.18)" }}>
                <div className="text-5xl mb-4">🎓</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: "#4ade80" }}>{t("s.mockCompleted")}</h3>
                <p className="text-sm mb-2" style={{ color: "rgba(74,222,128,0.65)" }}>
                  {t("s.mockCompletedSub")}
                </p>
                <p className="text-base font-semibold mt-4" style={{ color: GOLD }}>
                  {t("s.awaitingNext")}
                </p>
                <p className="text-sm mt-2" style={{ color: "rgba(162,137,89,0.55)" }}>
                  {t("s.teamInTouch")}
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
                <h3 className="text-xl font-bold mb-2" style={{ color: "#4ade80" }}>{t("s.pay2Confirmed")}</h3>
                <p className="text-sm mb-2" style={{ color: "rgba(74,222,128,0.65)" }}>
                  {t("s.pay2ConfirmedSub")}
                </p>
                <p className="text-base font-semibold mt-4" style={{ color: GOLD }}>
                  {t("s.awaitingUniInterview")}
                </p>
                <p className="text-sm mt-2" style={{ color: "rgba(162,137,89,0.55)" }}>
                  {t("s.uniCoordinating")}
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
                  <h3 className="text-xl font-bold mb-2 text-center" style={{ color: "#38bdf8" }}>{t("s.uniScheduled")}</h3>
                  <p className="text-sm text-center mb-6" style={{ color: "rgba(56,189,248,0.65)" }}>
                    {t("s.uniScheduledSub")}
                  </p>
                  <div className="rounded-2xl border p-5 mb-6" style={{ background: "rgba(56,189,248,0.06)", borderColor: "rgba(56,189,248,0.2)" }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {submission.uniInterviewDateTime && (
                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>{t("s.dateTime")}</p>
                          <p className="text-sm font-semibold" style={{ color: "#38bdf8" }}>{submission.uniInterviewDateTime}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>{t("s.platform")}</p>
                        <p className="text-sm font-semibold" style={{ color: "#38bdf8" }}>{platformLabel}</p>
                      </div>
                    </div>
                  </div>
                  {submission.uniInterviewLink && (
                    <a href={submission.uniInterviewLink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-base font-semibold transition-all hover:opacity-90 mb-4"
                      style={{ background: platformColor, color: "#ffffff" }}>
                      {platformEmoji} {t("s.joinMeeting")} {platformLabel} →
                    </a>
                  )}
                  <button onClick={handleCompleteUni} disabled={completingUni}
                    className="w-full py-3 rounded-2xl text-sm font-semibold border transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: "rgba(74,222,128,0.06)", borderColor: "rgba(74,222,128,0.25)", color: "#4ade80" }}>
                    {completingUni
                      ? <><span className="w-3 h-3 rounded-full border animate-spin" style={{ borderColor: "#4ade80", borderTopColor: "transparent" }} /> {t("s.updatingUni")}</>
                      : t("s.uniCompletedBtn")}
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
                    <h3 className="text-base font-semibold" style={{ color: "#fb923c" }}>{t("s.additionalDocs")}</h3>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(251,146,60,0.55)" }}>{t("s.additionalDocsSub")}</p>
                  </div>
                </div>
                <div className="px-6 py-5 space-y-4">
                  {submission.additionalDocsRequestNote && (
                    <div className="rounded-xl px-4 py-3 border text-sm" style={{ background: "rgba(251,146,60,0.04)", borderColor: "rgba(251,146,60,0.18)", color: "rgba(251,146,60,0.75)", lineHeight: 1.6 }}>
                      <strong style={{ color: "#fb923c" }}>{t("s.consultantNote")}</strong><br />{submission.additionalDocsRequestNote}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: "rgba(251,146,60,0.6)" }}>{t("s.addNote")}</label>
                    <textarea rows={2} placeholder="e.g., 'Enclosed please find the requested transcript…'"
                      value={additionalDocsNote}
                      onChange={e => setAdditionalDocsNote(e.target.value)}
                      className="w-full rounded-xl px-3 py-2 text-sm outline-none border resize-none"
                      style={{ background: "rgba(251,146,60,0.04)", borderColor: "rgba(251,146,60,0.15)", color: "#fb923c" }} />
                  </div>
                  <DropZone
                    onFile={handleAdditionalDocsSubmit}
                    loading={uploadingAdditionalDocs}
                    label={t("s.chooseDocs")}
                    sublabel="PDF, images, or documents accepted"
                    accentColor="#fb923c"
                    accentBg="rgba(251,146,60,0.06)"
                    accentBorder="rgba(251,146,60,0.25)"
                  />
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
                    <h3 className="text-base font-semibold" style={{ color: "#60a5fa" }}>{t("s.confirmingPayment")}</h3>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(96,165,250,0.55)" }}>{t("s.confirmingPaymentSub")}</p>
                  </div>
                </div>
                <div className="px-6 py-5">
                  <div className="rounded-xl px-4 py-3 border text-sm" style={{ background: "rgba(96,165,250,0.04)", borderColor: "rgba(96,165,250,0.14)", color: "rgba(96,165,250,0.65)", lineHeight: 1.6 }}>
                    {t("s.confirmingPaymentNote")}
                  </div>
                </div>
              </div>
            )}

            {/* ── FINAL PAYMENT CONFIRMED / VISA ISSUED — Download Offer Letter ── */}
            {(submission.status === "final_payment_confirmed" || submission.status === "visa_issued") && (() => {
              const offerDoc = submission.documents.find(d => d.documentType === "offer_letter");
              return (
                <div className="mt-6 rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(74,222,128,0.25)" }}>
                  <div className="px-6 py-5 border-b text-center" style={{ borderColor: "rgba(74,222,128,0.12)" }}>
                    <div className="text-5xl mb-3">🎉</div>
                    <h3 className="text-xl font-bold mb-1" style={{ color: "#4ade80" }}>{t("s.congratulations")}</h3>
                    <p className="text-sm" style={{ color: "rgba(74,222,128,0.6)" }}>{t("s.congratulationsSub")}</p>
                  </div>
                  <div className="px-6 py-5">
                    {offerDoc ? (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleOfferLetterView(submission.id, offerDoc.id)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold border transition-all hover:opacity-90"
                          style={{ background: "rgba(74,222,128,0.06)", borderColor: "rgba(74,222,128,0.22)", color: "#4ade80" }}>
                          <span>👁</span> {t("s.viewLetter")}
                        </button>
                        <button
                          onClick={() => handleOfferLetterDownload(submission.id, offerDoc.id, offerDoc.fileName)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold border transition-all hover:opacity-90"
                          style={{ background: "rgba(74,222,128,0.1)", borderColor: "rgba(74,222,128,0.35)", color: "#4ade80" }}>
                          <span>📄</span> {t("s.downloadLetter")}
                        </button>
                      </div>
                    ) : (
                      <p className="text-center text-sm" style={{ color: "rgba(74,222,128,0.45)" }}>{t("s.offerNotAvailable")}</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── PROCESSING NOTICE + IMMIGRATION REF ── */}
            {(submission.status === "final_payment_confirmed" || submission.status === "visa_issued" || submission.immigrationRefNumber) && (
              <div className="mt-4 space-y-3">
                {!submission.immigrationRefNumber && (
                  <div className="rounded-2xl border px-5 py-4 flex items-start gap-3" style={{ background: "rgba(162,137,89,0.04)", borderColor: "rgba(162,137,89,0.15)" }}>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(162,137,89,0.6)" }}>{t("portal.processing")}</p>
                  </div>
                )}
                {submission.immigrationRefNumber && (
                  <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(74,222,128,0.04)", borderColor: "rgba(74,222,128,0.3)" }}>
                    <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: "rgba(74,222,128,0.15)" }}>
                      <div className="flex-1">
                        <p className="text-sm font-bold" style={{ color: "#4ade80" }}>🇭🇰 {t("portal.immigRef")}</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(74,222,128,0.5)" }}>{t("portal.immigRefSub")}</p>
                      </div>
                      <span className="text-2xl">✅</span>
                    </div>
                    <div className="px-5 py-5">
                      <p className="font-mono text-3xl font-bold tracking-widest" style={{ color: "#4ade80", letterSpacing: "0.12em" }}>{submission.immigrationRefNumber}</p>
                      <p className="text-xs mt-2" style={{ color: "rgba(74,222,128,0.45)" }}>{t("portal.processing")}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── e-VISA ISSUED — Download ── */}
            {(() => {
              const eVisaDownloadDoc = submission.documents.find(d => d.documentType === "evisa");
              if (!eVisaDownloadDoc) return null;
              return (
                <div className="mt-4 rounded-2xl border overflow-hidden" style={{ background: "rgba(52,211,153,0.04)", borderColor: "rgba(52,211,153,0.3)" }}>
                  <div className="px-6 py-5 border-b text-center" style={{ borderColor: "rgba(52,211,153,0.12)" }}>
                    <div className="text-5xl mb-3">🛂</div>
                    <h3 className="text-xl font-bold mb-1" style={{ color: "#34d399" }}>{t("s.eVisaTitle")}</h3>
                    <p className="text-sm" style={{ color: "rgba(52,211,153,0.6)" }}>{t("s.eVisaSub")}</p>
                  </div>
                  <div className="px-6 py-5">
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleOfferLetterView(submission.id, eVisaDownloadDoc.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold border transition-all hover:opacity-90"
                        style={{ background: "rgba(52,211,153,0.06)", borderColor: "rgba(52,211,153,0.22)", color: "#34d399" }}>
                        <span>👁</span> {t("s.eVisaView")}
                      </button>
                      <button
                        onClick={() => handleOfferLetterDownload(submission.id, eVisaDownloadDoc.id, eVisaDownloadDoc.fileName)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold border transition-all hover:opacity-90"
                        style={{ background: "rgba(52,211,153,0.1)", borderColor: "rgba(52,211,153,0.35)", color: "#34d399" }}>
                        <span>🛂</span> {t("s.eVisaDownload")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── UNIVERSITY INTERVIEW COMPLETED ── */}
            {submission.status === "university_interview_completed" && (
              <div className="mt-6 rounded-2xl p-8 border text-center" style={{ background: "rgba(162,137,89,0.04)", borderColor: "rgba(162,137,89,0.15)" }}>
                <div className="text-5xl mb-4">🎓</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: GOLD }}>{t("s.uniInterviewCompleted")}</h3>
                <p className="text-sm mb-2" style={{ color: "rgba(162,137,89,0.65)" }}>
                  {t("s.uniInterviewCompletedSub")}
                </p>
                <div className="mt-5 px-6 py-5 rounded-2xl border" style={{ background: "rgba(162,137,89,0.05)", borderColor: "rgba(162,137,89,0.15)" }}>
                  <p className="text-sm" style={{ color: "rgba(162,137,89,0.55)" }}>
                    {t("s.teamInTouch")}
                  </p>
                </div>
              </div>
            )}

            {/* ── REJECTED ── */}
            {submission.status === "rejected" && (
              <div className="rounded-2xl p-8 border text-center" style={{ background: "rgba(248,113,113,0.04)", borderColor: "rgba(248,113,113,0.2)" }}>
                <div className="text-5xl mb-4">❌</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: "#f87171" }}>{statusLabel("rejected")}</h3>
                {submission.adminNotes && (
                  <p className="text-sm leading-relaxed mt-2" style={{ color: "rgba(248,113,113,0.65)" }}>
                    {submission.adminNotes}
                  </p>
                )}
              </div>
            )}

            {/* ── APPLICATION PROGRESS TIMELINE ── */}
            {showTimeline && (
              <div className="mt-6 rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(162,137,89,0.1)" }}>
                <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(162,137,89,0.1)" }}>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: GOLD }}>{t("portal.progress")}</h3>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(162,137,89,0.4)" }}>
                      {t("portal.ref")} <span className="font-mono font-semibold">STU{submission.passportNumber.slice(-4).toUpperCase()}</span>
                    </p>
                  </div>
                  {(() => {
                    const tl = buildTimeline(submission, t);
                    const done = tl.filter(step => step.done).length;
                    return (
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "rgba(162,137,89,0.08)", color: GOLD }}>
                        {done}/{tl.length} {t("portal.steps")}
                      </span>
                    );
                  })()}
                </div>
                <div className="px-5 py-5">
                  {buildTimeline(submission, t).map((step, i, arr) => (
                    <div key={`${step.label}-${i}`} className="flex gap-3 group">
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
                              {t("tl.inProgress")}
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
            {!["payment_pending","payment_received","acknowledged","docs_requested","interview_arranged","interview_completed","university_interview_arranged","university_interview_completed","offer_letter_pending","final_payment_received","final_payment_confirmed","visa_issued"].includes(submission.status) && (
              <div className="mt-6 rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(162,137,89,0.1)" }}>
                <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(162,137,89,0.1)" }}>
                  <h3 className="text-sm font-semibold" style={{ color: GOLD }}>{t("portal.appDetails")}</h3>
                </div>
                <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {([[t("portal.fullName"), submission.name], [t("portal.dob"), submission.dateOfBirth], [t("portal.passport"), submission.passportNumber]] as [string, string][]).map(([l, v]) => (
                    <div key={l}>
                      <p className="text-xs font-medium mb-1" style={{ color: "rgba(162,137,89,0.45)" }}>{l}</p>
                      <p className="text-sm font-semibold" style={{ color: GOLD }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div className="px-6 py-4 border-t" style={{ borderColor: "rgba(162,137,89,0.08)" }}>
                  <p className="text-xs font-medium mb-3" style={{ color: "rgba(162,137,89,0.45)" }}>{t("portal.uploadedDocs")}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { type: "passport_photo",        label: "Passport Photo",         icon: "🖼️" },
                      { type: "passport_doc",          label: "Passport / Travel Doc",   icon: "📘" },
                      { type: "birth_certificate",     label: "Birth Cert / ID",         icon: "📋" },
                      { type: "cv",                    label: "CV",                      icon: "📄" },
                      { type: "edu_results",           label: "Completion Cert.",        icon: "📄" },
                      { type: "edu_transcript",        label: "Edu. Transcript",         icon: "📄" },
                      { type: "higher_edu_results",    label: "Higher Edu. Cert.",       icon: "📄" },
                      { type: "higher_edu_transcript", label: "Higher Edu. Transcript",  icon: "📄" },
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

            {/* ── SHARED APPLICATION EMAIL ── */}
            {submission && ["acknowledged","interview_arranged","interview_completed","second_payment_pending","second_payment_received","second_payment_confirmed","university_interview_arranged","university_interview_completed","offer_letter_pending","final_payment_received","final_payment_confirmed","visa_issued"].includes(submission.status) && (
              <InboxCard submission={submission} />
            )}

            {/* ── AVAILABLE COURSES (visible after first payment confirmed) ── */}
            {submission && ["acknowledged","interview_arranged","interview_completed","second_payment_pending","second_payment_received","second_payment_confirmed","university_interview_arranged","university_interview_completed","offer_letter_pending","final_payment_received","final_payment_confirmed","visa_issued"].includes(submission.status) && <CoursesPanel />}

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
                      <span className="text-sm font-semibold" style={{ color: "#60a5fa" }}>{t("portal.messages")}</span>
                      {messages.filter(m => m.fromAdmin && !m.isRead).length > 0 ? (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(96,165,250,0.18)", color: "#60a5fa" }}>
                          {messages.filter(m => m.fromAdmin && !m.isRead).length} {t("portal.new")}
                        </span>
                      ) : (
                        <span className="ml-2 text-xs" style={{ color: "rgba(96,165,250,0.35)" }}>
                          {messages.length > 0 ? `${messages.length} message${messages.length !== 1 ? "s" : ""}` : t("portal.noMessages")}
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
                    <div className="px-4 py-4 space-y-3 max-h-80 overflow-y-auto">
                      {messages.length === 0 && (
                        <div className="text-center py-8">
                          <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
                            style={{ background: "rgba(96,165,250,0.08)" }}>
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" style={{ color: "rgba(96,165,250,0.3)" }}>
                              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                            </svg>
                          </div>
                          <p className="text-sm" style={{ color: "rgba(96,165,250,0.35)" }}>{t("portal.noMessages")}</p>
                          <p className="text-xs mt-1" style={{ color: "rgba(96,165,250,0.25)" }}>{t("portal.noMessagesSub")}</p>
                        </div>
                      )}

                      {messages.map(msg => (
                        <div key={msg.id} className={`flex gap-2.5 ${msg.fromAdmin ? "" : "flex-row-reverse"}`}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5"
                            style={{
                              background: msg.fromAdmin ? "rgba(96,165,250,0.15)" : "rgba(74,222,128,0.15)",
                              color: msg.fromAdmin ? "#60a5fa" : "#4ade80",
                            }}>
                            {msg.fromAdmin ? "H" : (submission.name[0] || "Y")}
                          </div>
                          <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${msg.fromAdmin ? "rounded-tl-sm" : "rounded-tr-sm"}`}
                            style={{
                              background: msg.fromAdmin ? "rgba(96,165,250,0.08)" : "rgba(74,222,128,0.08)",
                              border: `1px solid ${msg.fromAdmin ? "rgba(96,165,250,0.15)" : "rgba(74,222,128,0.15)"}`,
                            }}>
                            <div className="flex items-center justify-between gap-3 mb-1.5">
                              <span className="text-xs font-semibold" style={{ color: msg.fromAdmin ? "#60a5fa" : "#4ade80" }}>
                                {msg.fromAdmin ? "HARROWGATE" : t("s.you")}
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
                        <textarea rows={2} placeholder={t("portal.replyPlaceholder")}
                          value={replyBody}
                          onChange={e => setReplyBody(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSendReply(); }}
                          className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none border resize-none"
                          style={{ background: "rgba(96,165,250,0.04)", borderColor: "rgba(96,165,250,0.15)", color: "#60a5fa", minHeight: 60 }} />
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <DropZone
                            onFile={handleReplyAttachment}
                            loading={uploadingReplyAttachment}
                            compact
                            label="Attach"
                            accept="image/*,.pdf,.doc,.docx"
                            accentColor="#60a5fa"
                            accentBg="rgba(96,165,250,0.05)"
                            accentBorder="rgba(96,165,250,0.15)"
                          />
                          <button onClick={handleSendReply} disabled={sendingReply || (!replyBody.trim() && replyAttachments.length === 0)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-90 disabled:opacity-40"
                            style={{ background: "#60a5fa", color: "#0b2213" }}
                            title={t("portal.ctrlEnter")}>
                            {sendingReply
                              ? <span className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#0b2213", borderTopColor: "transparent" }} />
                              : <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs" style={{ color: "rgba(96,165,250,0.25)" }}>{t("portal.ctrlEnter")}</p>
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
