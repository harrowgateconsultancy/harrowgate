import { useState, useRef, useEffect } from "react";
import { playAlertSound, unlockAudio } from "../../lib/notificationSound";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { COURSES, LEVEL_LABELS, type DegreeLevel } from "../../data/courses";
import { io as socketIo } from "socket.io-client";

const BG = "#0b2213";
const GOLD = "#a28959";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }
function getAdminToken() { return localStorage.getItem("admin_token") || ""; }
function adminFetch(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    headers: { ...(options.headers as Record<string, string> || {}), Authorization: `Bearer ${getAdminToken()}` },
  });
}

type Document = { id: number; documentType: string; fileName: string; fileUrl: string; mimeType?: string | null };
type Submission = {
  id: number; name: string; email: string | null; dateOfBirth: string;
  passportNumber: string; status: string; adminNotes: string | null;
  createdAt: string; documents: Document[];
  interviewZoomLink?: string | null; interviewDateTime?: string | null;
  uniInterviewLink?: string | null; uniInterviewDateTime?: string | null; uniInterviewPlatform?: string | null;
  additionalDocsRequested?: boolean | null; additionalDocsRequestNote?: string | null;
  immigrationRefNumber?: string | null;
  preferredLevel?: string | null;
  preferredCourse?: string | null;
  preferredInstitution?: string | null;
  sharedEmail?: string | null;
  sharedEmailPassword?: string | null;
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
  visa_issued:                     { label: "e-Visa Issued 🎉",       color: "#34d399",   bg: "rgba(52,211,153,0.12)"  },
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
  visa_issued: [],
};



function isImage(f: string, m?: string | null) { return m?.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(f); }
function isPdf(f: string, m?: string | null) { return m === "application/pdf" || /\.pdf$/i.test(f); }
function fileIcon(f: string, m?: string | null) { return isPdf(f, m) ? "📄" : isImage(f, m) ? "🖼️" : "📎"; }
function calcAge(dob: string): number | null {
  if (!dob) return null;
  const born = new Date(dob);
  if (isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const m = now.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age--;
  return age;
}

function getDocMeta(dt: string): { label: string; tagColor: string; tagText: string; tag: string } {
  if (dt === "payment_receipt")        return { label: "Payment Receipt",            tagColor: "rgba(96,165,250,0.18)",  tagText: "#60a5fa", tag: "Receipt"       };
  if (dt === "second_payment_receipt") return { label: "2nd Payment Receipt",        tagColor: "rgba(96,165,250,0.18)",  tagText: "#60a5fa", tag: "2nd Receipt"   };
  if (dt === "additional_doc")         return { label: "Additional Document",        tagColor: "rgba(251,146,60,0.18)",  tagText: "#fb923c", tag: "Additional"    };
  if (dt === "offer_letter")           return { label: "Offer Letter",               tagColor: "rgba(240,171,252,0.18)", tagText: "#f0abfc", tag: "Offer Letter"  };
  if (dt === "final_payment_receipt")  return { label: "Final Payment Receipt",      tagColor: "rgba(96,165,250,0.18)",  tagText: "#60a5fa", tag: "Final Receipt" };
  if (dt === "passport_photo")         return { label: "Passport Size Photo",        tagColor: "rgba(162,137,89,0.18)",  tagText: GOLD,      tag: "Student"       };
  if (dt === "passport_doc")           return { label: "Passport / Travel Document", tagColor: "rgba(162,137,89,0.18)",  tagText: GOLD,      tag: "Student"       };
  if (dt === "birth_certificate")      return { label: "Birth Certificate / Nat. ID",tagColor: "rgba(162,137,89,0.18)", tagText: GOLD,      tag: "Student"       };
  if (dt === "cv")                     return { label: "CV",                         tagColor: "rgba(162,137,89,0.18)",  tagText: GOLD,      tag: "Student"       };
  if (dt === "edu_results")            return { label: "Completion Certificate",        tagColor: "rgba(162,137,89,0.18)",  tagText: GOLD,      tag: "Student"       };
  if (dt === "edu_transcript")         return { label: "Educational Transcript",        tagColor: "rgba(162,137,89,0.18)",  tagText: GOLD,      tag: "Student"       };
  if (dt === "higher_edu_results")     return { label: "Higher Education Certificate",  tagColor: "rgba(162,137,89,0.18)",  tagText: GOLD,      tag: "Student"       };
  if (dt === "higher_edu_transcript")  return { label: "Higher Education Transcript",tagColor: "rgba(162,137,89,0.18)", tagText: GOLD,      tag: "Student"       };
  if (dt.startsWith("edu_"))           return { label: `Education Document ${dt.replace("edu_", "")}`, tagColor: "rgba(162,137,89,0.18)", tagText: GOLD, tag: "Student" };
  if (dt === "evisa")                  return { label: "e-Visa (HK Immigration)", tagColor: "rgba(52,211,153,0.18)", tagText: "#34d399", tag: "e-Visa" };
  if (dt === "signed_terms")           return { label: "Signed Terms & Conditions", tagColor: "rgba(162,137,89,0.22)", tagText: GOLD, tag: "Signed T&C" };
  if (dt.startsWith("admin_"))         return { label: dt === "admin_doc" ? "Admin Document" : dt.replace("admin_", "").replace(/_/g, " "), tagColor: "rgba(74,222,128,0.15)", tagText: "#4ade80", tag: "Admin" };
  return { label: dt.replace(/_/g, " ").toUpperCase(), tagColor: "rgba(162,137,89,0.18)", tagText: GOLD, tag: "Student" };
}

async function uploadToStorage(file: File): Promise<{ url: string }> {
  const res = await fetch(`${getApiBase()}/api/storage/uploads/request-url`, {
    method: "POST", headers: { "Content-Type": "application/json" }, 
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
  const [soundEnabled, setSoundEnabled] = useState(false);
  const prevCountRef = useRef<number | null>(null);
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
  const [eVisaUploading, setEVisaUploading] = useState(false);
  const [eVisaSent, setEVisaSent] = useState<number | null>(null);
  const eVisaFileRef = useRef<HTMLInputElement | null>(null);
  const [id995aOpen, setId995aOpen] = useState(false);
  const [lettersOpen, setLettersOpen] = useState(false);
  const [lettersData, setLettersData] = useState<any | null>(null);
  const [lettersCourseForm, setLettersCourseForm] = useState({ courseName: "", universityName: "", courseWebsite: "" });
  const [generatingLetters, setGeneratingLetters] = useState(false);
  const [lettersError, setLettersError] = useState<string | null>(null);
  const [messageForm, setMessageForm] = useState<{ subject: string; body: string; attachments: Array<{fileName: string; fileUrl: string; mimeType?: string}> } | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState<number | null>(null);
  const [adminMessages, setAdminMessages] = useState<any[]>([]);
  const [uploadingMsgAttachment, setUploadingMsgAttachment] = useState(false);
  const msgAttachmentRef = useRef<HTMLInputElement | null>(null);
  const [refNumInput, setRefNumInput] = useState("");
  const [settingRef, setSettingRef] = useState(false);
  const [refSetSuccess, setRefSetSuccess] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [megaSyncing, setMegaSyncing] = useState(false);
  const [megaSyncResult, setMegaSyncResult] = useState<string | null>(null);
  const [showCourses, setShowCourses] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [pricingForm, setPricingForm] = useState({
    mastersTotal: 140000,
    bachelorTotal: 130000,
    associateTotal: 90000,
    mastersLastPayment: 125000,
    bachelorLastPayment: 115000,
    associateLastPayment: 75000,
  });
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingSaved, setPricingSaved] = useState(false);
  const [trashItems, setTrashItems] = useState<Submission[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [permDeleteConfirmId, setPermDeleteConfirmId] = useState<number | null>(null);
  const [permDeleting, setPermDeleting] = useState(false);
  const [coursesLevel, setCoursesLevel] = useState<DegreeLevel>("masters");
  const [coursesSearch, setCoursesSearch] = useState("");
  const [sharedEmailForm, setSharedEmailForm] = useState({ email: "", password: "" });
  const [sharedEmailShowPw, setSharedEmailShowPw] = useState(false);
  const [savingSharedEmail, setSavingSharedEmail] = useState(false);
  const [sharedEmailSaved, setSharedEmailSaved] = useState(false);

  // Live View (screen mirror)
  const [liveViewOpen, setLiveViewOpen] = useState(false);
  const [liveViewSubId, setLiveViewSubId] = useState<number | null>(null);
  const [liveViewStatus, setLiveViewStatus] = useState<"connecting" | "waiting" | "streaming" | "offline">("connecting");
  const liveViewSocketRef = useRef<ReturnType<typeof socketIo> | null>(null);
  const liveViewCanvasRef = useRef<HTMLCanvasElement>(null);

  const openLiveView = (submissionId: number) => {
    setLiveViewOpen(true);
    setLiveViewSubId(submissionId);
    setLiveViewStatus("connecting");
    const socket = socketIo(window.location.origin, {
      path: `${BASE}/api/socket.io`,
      transports: ["polling", "websocket"],
      auth: { role: "admin", token: getAdminToken() },
    });
    liveViewSocketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("watch:start", submissionId);
      setLiveViewStatus("waiting");
    });
    socket.on("frame", (frame: string) => {
      setLiveViewStatus("streaming");
      const img = new Image();
      img.onload = () => {
        const canvas = liveViewCanvasRef.current;
        if (!canvas) return;
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d")?.drawImage(img, 0, 0);
      };
      img.src = frame;
    });
    socket.on("student:offline", () => setLiveViewStatus("offline"));
    socket.on("connect_error", () => setLiveViewStatus("offline"));
  };

  const closeLiveView = () => {
    if (liveViewSubId !== null) liveViewSocketRef.current?.emit("watch:stop", liveViewSubId);
    liveViewSocketRef.current?.disconnect();
    liveViewSocketRef.current = null;
    setLiveViewOpen(false);
    setLiveViewSubId(null);
  };

  const handleSaveSharedEmail = async () => {
    if (!selected) return;
    setSavingSharedEmail(true);
    setSharedEmailSaved(false);
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/student-submissions/${selected.id}/shared-email`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharedEmail: sharedEmailForm.email, sharedEmailPassword: sharedEmailForm.password }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setSelected((prev: any) => prev ? { ...prev, sharedEmail: updated.sharedEmail, sharedEmailPassword: updated.sharedEmailPassword } : prev);
      setSubmissions(prev => prev.map(s => s.id === updated.id ? { ...s, sharedEmail: updated.sharedEmail, sharedEmailPassword: updated.sharedEmailPassword } : s));
      setSharedEmailSaved(true);
      setSharedEmailForm({ email: "", password: "" });
      setTimeout(() => setSharedEmailSaved(false), 3000);
    } catch { /* silent */ } finally { setSavingSharedEmail(false); }
  };

  const handleSetImmigrationRef = async () => {
    if (!selected) return;
    setSettingRef(true);
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/student-submissions/${selected.id}/immigration-ref`, {
        method: "PATCH", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ immigrationRefNumber: refNumInput }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setSelected((prev: any) => prev ? { ...prev, immigrationRefNumber: updated.immigrationRefNumber } : prev);
      setSubmissions(prev => prev.map(s => s.id === updated.id ? { ...s, immigrationRefNumber: updated.immigrationRefNumber } : s));
      setRefSetSuccess(true);
      setTimeout(() => setRefSetSuccess(false), 3000);
    } catch { alert("Failed to save immigration reference number."); }
    finally { setSettingRef(false); }
  };

  const loadLetters = async (id: number) => {
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/student-submissions/${id}/immigration-letters`);
      if (res.ok) {
        const data = await res.json();
        setLettersData(data);
        if (data) {
          setLettersCourseForm({ courseName: data.courseName || "", universityName: data.universityName || "", courseWebsite: data.courseWebsite || "" });
        }
      }
    } catch { /* silent */ }
  };

  const handleGenerateLetters = async () => {
    if (!selected) return;
    if (!lettersCourseForm.courseName.trim() || !lettersCourseForm.universityName.trim()) {
      setLettersError("Please enter both the course name and university name.");
      return;
    }
    setGeneratingLetters(true);
    setLettersError(null);
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/student-submissions/${selected.id}/immigration-letters/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lettersCourseForm),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      const data = await res.json();
      setLettersData(data);
    } catch (err: any) {
      setLettersError(err.message || "Failed to generate letters. Please try again.");
    } finally {
      setGeneratingLetters(false);
    }
  };

  const loadAdminMessages = async (id: number) => {
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/student-submissions/${id}/messages`);
      if (res.ok) setAdminMessages(await res.json());
      else setAdminMessages([]);
    } catch { setAdminMessages([]); }
  };

  const handleSendMessage = async () => {
    if (!selected || !messageForm) return;
    setSendingMessage(true);
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/student-submissions/${selected.id}/messages`, {
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
      const res = await adminFetch(`${getApiBase()}/api/admin/student-submissions`);
      if (res.status === 401) {
        localStorage.removeItem("admin_token");
        setLocation("/admin/login");
        throw new Error("Session expired — please log in again");
      }
      if (!res.ok) throw new Error("Failed to load submissions");
      return res.json();
    },
    refetchInterval: 15000,
    retry: false,
  });

  useEffect(() => {
    if (prevCountRef.current !== null && submissions.length > prevCountRef.current && soundEnabled) {
      playAlertSound();
    }
    prevCountRef.current = submissions.length;
  }, [submissions.length, soundEnabled]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: number; status: string; adminNotes?: string }) => {
      const res = await adminFetch(`${getApiBase()}/api/admin/student-submissions/${id}/status`, {
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
      await adminFetch(`${getApiBase()}/api/admin/student-submissions/${submissionId}/documents/${docId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-student-submissions"] });
      qc.fetchQuery({ queryKey: ["admin-student-submissions"], queryFn: async () => {
        const res = await adminFetch(`${getApiBase()}/api/admin/student-submissions`);
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
      const res = await adminFetch(`${getApiBase()}/api/admin/student-submissions/${selected.id}/send-interview-invite`, {
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
      const res = await adminFetch(`${getApiBase()}/api/admin/student-submissions/${selected.id}/send-university-interview-invite`, {
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
      const res = await adminFetch(`${getApiBase()}/api/admin/student-submissions/${selected.id}/complete-interview`, {
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
      const res = await adminFetch(`${getApiBase()}/api/admin/student-submissions/${selected.id}/request-additional-docs`, {
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
      const res = await adminFetch(`${getApiBase()}/api/admin/student-submissions/${selected.id}/upload-offer-letter`, {
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

  const handleUploadEVisa = async (file: File) => {
    if (!selected) return;
    setEVisaUploading(true);
    try {
      const { url } = await uploadToStorage(file);
      const res = await adminFetch(`${getApiBase()}/api/admin/student-submissions/${selected.id}/upload-evisa`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileUrl: url, fileSize: file.size, mimeType: file.type }),
      });
      if (!res.ok) throw new Error("Failed");
      setEVisaSent(selected.id);
      setSelected(prev => prev ? { ...prev, status: "visa_issued" } : null);
      qc.invalidateQueries({ queryKey: ["admin-student-submissions"] });
    } catch { alert("Failed to upload e-visa."); }
    finally { setEVisaUploading(false); if (eVisaFileRef.current) eVisaFileRef.current.value = ""; }
  };

  const handleAdminUpload = async (file: File) => {
    if (!selected) return;
    setUploadingDoc(true);
    try {
      const { url } = await uploadToStorage(file);
      const res = await adminFetch(`${getApiBase()}/api/admin/student-submissions/${selected.id}/documents`, {
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
    const res = await adminFetch(`${getApiBase()}/api/admin/student-submissions/${selected.id}/id995a/download`, { credentials: "include" });
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

  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(s => s.id)));
    }
  };

  const handleBulkExport = () => {
    const data = filtered.filter(s => selectedIds.has(s.id)).map(s => ({
      id: s.id, name: s.name, email: s.email, passportNumber: s.passportNumber,
      dateOfBirth: s.dateOfBirth, nationality: s.nationality, status: s.status,
      immigrationRefNumber: s.immigrationRefNumber,
      documents: s.documents.map(d => ({ type: d.documentType, file: d.fileName, url: d.fileUrl })),
      createdAt: s.createdAt,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `harrowgate-students-${new Date().toISOString().split("T")[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleBulkDelete = async () => {
    setDeletingSelected(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id =>
        adminFetch(`${getApiBase()}/api/admin/student-submissions/${id}`, { method: "DELETE" })
      ));
      if (selected && selectedIds.has(selected.id)) setSelected(null);
      setSelectedIds(new Set());
      setDeleteConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-student-submissions"] });
    } catch { alert("Failed to delete some profiles."); }
    finally { setDeletingSelected(false); }
  };

  const loadPricing = async () => {
    setPricingLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/settings/pricing`);
      if (res.ok) setPricingForm(await res.json());
    } catch { /* silent */ }
    finally { setPricingLoading(false); }
  };

  const savePricing = async () => {
    setPricingSaving(true);
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/settings/pricing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pricingForm),
      });
      if (res.ok) { setPricingSaved(true); setTimeout(() => setPricingSaved(false), 3000); }
      else alert("Failed to save pricing.");
    } catch { alert("Failed to save pricing."); }
    finally { setPricingSaving(false); }
  };

  const loadTrash = async () => {
    setTrashLoading(true);
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/trash`);
      if (res.ok) setTrashItems(await res.json());
    } catch { /* silent */ } finally { setTrashLoading(false); }
  };

  const restoreFromTrash = async (id: number) => {
    try {
      await adminFetch(`${getApiBase()}/api/admin/trash/${id}/restore`, { method: "POST" });
      setTrashItems(prev => prev.filter(s => s.id !== id));
      qc.invalidateQueries({ queryKey: ["admin-student-submissions"] });
    } catch { alert("Failed to restore."); }
  };

  const permanentDelete = async (id: number) => {
    setPermDeleting(true);
    try {
      await adminFetch(`${getApiBase()}/api/admin/trash/${id}`, { method: "DELETE" });
      setTrashItems(prev => prev.filter(s => s.id !== id));
      setPermDeleteConfirmId(null);
    } catch { alert("Failed to permanently delete."); }
    finally { setPermDeleting(false); }
  };

  useEffect(() => { if (showTrash) loadTrash(); }, [showTrash]);
  useEffect(() => { if (showPricing) loadPricing(); }, [showPricing]);

  const megaSyncTarget: Submission | null =
    selected ??
    (selectedIds.size === 1
      ? (submissions.find(s => s.id === [...selectedIds][0]) ?? null)
      : null);

  const handleMegaSync = async () => {
    if (!megaSyncTarget) return;
    setMegaSyncing(true);
    setMegaSyncResult(null);
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/student-submissions/${megaSyncTarget.id}/mega-sync`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMegaSyncResult(`✓ ${data.synced} file${data.synced !== 1 ? "s" : ""} synced${data.failed ? ` · ${data.failed} failed` : ""}`);
      } else {
        setMegaSyncResult("Sync failed");
      }
    } catch { setMegaSyncResult("Sync failed"); }
    finally { setMegaSyncing(false); setTimeout(() => setMegaSyncResult(null), 6000); }
  };

  const adminToken = localStorage.getItem("admin_token") ?? "";
  const viewUrl = (doc: Document) => `${getApiBase()}/api/admin/student-submissions/${selected?.id}/documents/${doc.id}/view?token=${encodeURIComponent(adminToken)}`;
  const downloadUrl = (doc: Document) => `${getApiBase()}/api/admin/student-submissions/${selected?.id}/documents/${doc.id}/download?token=${encodeURIComponent(adminToken)}`;

  const filterKeys = ["all", "pending", "approved", "docs_requested", "payment_pending", "payment_received", "acknowledged", "rejected"];

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <nav style={{ borderBottom: "1px solid rgba(162,137,89,0.12)", backdropFilter: "blur(12px)", background: "rgba(11,34,19,0.9)", position: "sticky", top: 0, zIndex: 50 }}>
        <div className="flex items-center justify-between px-6 py-3.5 max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/admin")}
              className="inline-flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
              style={{ color: "rgba(162,137,89,0.45)" }}>
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M9.78 12.78a.75.75 0 01-1.06 0L4.47 8.53a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L6.06 8l3.72 3.72a.75.75 0 010 1.06z" clipRule="evenodd" />
              </svg>
              Back
            </button>
            <div className="w-px h-4" style={{ background: "rgba(162,137,89,0.15)" }} />
            <img src="/harrowgate-logo.png" alt="HARROWGATE" className="h-11 object-contain" />
            <span className="text-xs font-semibold tracking-[0.2em] uppercase px-2.5 py-1 rounded-full"
              style={{ background: "rgba(162,137,89,0.1)", color: GOLD }}>
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(251,146,60,0.12)", color: "#fb923c" }}>
                {pendingCount} pending
              </span>
            )}
            <a href={`${BASE}/admin`} className="text-xs transition-opacity hover:opacity-70" style={{ color: "rgba(162,137,89,0.4)" }}>
              Portal →
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: GOLD }}>Student Submissions</h1>
            <p className="text-sm" style={{ color: "rgba(162,137,89,0.55)" }}>{submissions.length} total · {pendingCount} requiring action</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {pendingCount > 0 && (
              <div className="px-4 py-2 rounded-full text-sm font-semibold" style={{ background: "rgba(251,146,60,0.12)", color: "#fb923c" }}>
                ⚡ {pendingCount} need{pendingCount !== 1 ? "" : "s"} your attention
              </div>
            )}
            {!soundEnabled ? (
              <button onClick={() => { unlockAudio(); setSoundEnabled(true); }}
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border transition-all hover:opacity-80"
                style={{ borderColor: "rgba(162,137,89,0.2)", color: "rgba(162,137,89,0.6)", background: "rgba(162,137,89,0.05)" }}>
                🔔 Enable Sound Alerts
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>
                🔔 Sound alerts on
              </div>
            )}
            <button onClick={() => setShowCourses(true)}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border transition-all hover:opacity-80"
              style={{ borderColor: "rgba(162,137,89,0.2)", color: GOLD, background: "rgba(162,137,89,0.05)" }}>
              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 shrink-0"><path d="M2 4h12M2 8h12M2 12h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Courses
            </button>
            <button onClick={() => setShowPricing(v => !v)}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border transition-all hover:opacity-80"
              style={{ borderColor: showPricing ? "rgba(162,137,89,0.45)" : "rgba(162,137,89,0.2)", color: GOLD, background: showPricing ? "rgba(162,137,89,0.12)" : "rgba(162,137,89,0.05)" }}>
              💰 Pricing
            </button>
            <button onClick={() => setShowTrash(v => !v)}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border transition-all hover:opacity-80"
              style={{ borderColor: showTrash ? "rgba(248,113,113,0.35)" : "rgba(162,137,89,0.2)", color: showTrash ? "#f87171" : "rgba(162,137,89,0.55)", background: showTrash ? "rgba(248,113,113,0.08)" : "rgba(162,137,89,0.05)" }}>
              🗑 Trash
            </button>
            <button onClick={() => { localStorage.removeItem("admin_token"); window.location.href = "/admin/login"; }}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border transition-all hover:opacity-80"
              style={{ borderColor: "rgba(162,137,89,0.2)", color: "rgba(162,137,89,0.55)", background: "rgba(162,137,89,0.05)" }}>
              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 shrink-0"><path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Sign Out
            </button>
            <button onClick={handleMegaSync} disabled={megaSyncing || !megaSyncTarget}
              title={!megaSyncTarget ? "Select a student first" : `Sync ${megaSyncTarget.name} to MEGA`}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border transition-all hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: "rgba(162,137,89,0.2)", color: megaSyncResult?.startsWith("✓") ? "#4ade80" : GOLD, background: "rgba(162,137,89,0.05)" }}>
              {megaSyncing
                ? <><span className="w-3 h-3 rounded-full border animate-spin shrink-0" style={{ borderColor: GOLD, borderTopColor: "transparent" }} /> Syncing…</>
                : megaSyncResult
                  ? megaSyncResult
                  : <><svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 shrink-0"><path d="M2 8c0-3.31 2.69-6 6-6s6 2.69 6 6-2.69 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> Sync to MEGA{megaSyncTarget ? ` — ${megaSyncTarget.name.split(" ")[0]}` : ""}</>}
            </button>
          </div>
        </div>

        {/* ── PRICING PANEL ── */}
        {showPricing && (
          <div className="mb-8 rounded-2xl border overflow-hidden" style={{ background: "rgba(162,137,89,0.03)", borderColor: "rgba(162,137,89,0.18)" }}>
            <div className="px-6 py-4 border-b flex items-center justify-between gap-3" style={{ borderColor: "rgba(162,137,89,0.12)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base"
                  style={{ background: "rgba(162,137,89,0.1)", color: GOLD }}>💰</div>
                <div>
                  <p className="text-sm font-bold" style={{ color: GOLD }}>Package Pricing</p>
                  <p className="text-xs" style={{ color: "rgba(162,137,89,0.45)" }}>
                    Changes apply instantly to the landing page, packages page, and student portal
                  </p>
                </div>
              </div>
              {pricingLoading && (
                <span className="text-xs" style={{ color: "rgba(162,137,89,0.4)" }}>Loading…</span>
              )}
            </div>

            <div className="px-6 py-5 grid sm:grid-cols-2 gap-6">
              {/* Total Package Costs */}
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "rgba(162,137,89,0.4)" }}>
                  Total Package Costs
                </p>
                <p className="text-xs mb-4" style={{ color: "rgba(162,137,89,0.35)" }}>
                  Shown on the Packages page and landing page pricing section.
                </p>
                {([
                  { label: "Master's Degree", field: "mastersTotal" as const },
                  { label: "Bachelor's Degree", field: "bachelorTotal" as const },
                  { label: "Associate Degree", field: "associateTotal" as const },
                ] as const).map(({ label, field }) => (
                  <div key={field} className="flex items-center gap-3 mb-3">
                    <label className="text-xs w-36 shrink-0 text-right" style={{ color: "rgba(162,137,89,0.55)" }}>{label}</label>
                    <div className="flex items-center rounded-xl border overflow-hidden flex-1"
                      style={{ borderColor: "rgba(162,137,89,0.2)", background: "rgba(162,137,89,0.05)" }}>
                      <span className="px-3 text-xs font-semibold border-r" style={{ color: "rgba(162,137,89,0.5)", borderColor: "rgba(162,137,89,0.15)", whiteSpace: "nowrap" }}>HKD$</span>
                      <input
                        type="number"
                        value={pricingForm[field]}
                        onChange={e => setPricingForm(f => ({ ...f, [field]: parseInt(e.target.value) || 0 }))}
                        className="flex-1 px-3 py-2 text-sm font-bold bg-transparent outline-none"
                        style={{ color: GOLD }}
                        min={0}
                        step={1000}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Final Payment (Step 6) */}
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "rgba(162,137,89,0.4)" }}>
                  Final Payment — Step 6
                </p>
                <p className="text-xs mb-4" style={{ color: "rgba(162,137,89,0.35)" }}>
                  The last instalment shown in the journey timeline (includes tuition fees).
                </p>
                {([
                  { label: "Master's Degree", field: "mastersLastPayment" as const },
                  { label: "Bachelor's Degree", field: "bachelorLastPayment" as const },
                  { label: "Associate Degree", field: "associateLastPayment" as const },
                ] as const).map(({ label, field }) => (
                  <div key={field} className="flex items-center gap-3 mb-3">
                    <label className="text-xs w-36 shrink-0 text-right" style={{ color: "rgba(162,137,89,0.55)" }}>{label}</label>
                    <div className="flex items-center rounded-xl border overflow-hidden flex-1"
                      style={{ borderColor: "rgba(162,137,89,0.2)", background: "rgba(162,137,89,0.05)" }}>
                      <span className="px-3 text-xs font-semibold border-r" style={{ color: "rgba(162,137,89,0.5)", borderColor: "rgba(162,137,89,0.15)", whiteSpace: "nowrap" }}>HKD$</span>
                      <input
                        type="number"
                        value={pricingForm[field]}
                        onChange={e => setPricingForm(f => ({ ...f, [field]: parseInt(e.target.value) || 0 }))}
                        className="flex-1 px-3 py-2 text-sm font-bold bg-transparent outline-none"
                        style={{ color: GOLD }}
                        min={0}
                        step={1000}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 pb-5 flex items-center justify-between gap-4">
              <p className="text-xs" style={{ color: "rgba(162,137,89,0.35)" }}>
                Enter values as plain numbers (e.g. 140000 for HKD$ 140,000)
              </p>
              <button onClick={savePricing} disabled={pricingSaving}
                className="flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl border transition-all hover:opacity-80 disabled:opacity-40"
                style={{ borderColor: pricingSaved ? "rgba(74,222,128,0.4)" : "rgba(162,137,89,0.35)", color: pricingSaved ? "#4ade80" : GOLD, background: pricingSaved ? "rgba(74,222,128,0.08)" : "rgba(162,137,89,0.08)" }}>
                {pricingSaving ? "Saving…" : pricingSaved ? "✓ Saved" : "💾 Save Pricing"}
              </button>
            </div>
          </div>
        )}

        {/* ── TRASH VIEW ── */}
        {showTrash && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>🗑</div>
              <div>
                <p className="text-sm font-bold" style={{ color: "#f87171" }}>Trash</p>
                <p className="text-xs" style={{ color: "rgba(248,113,113,0.5)" }}>
                  {trashItems.length} deleted profile{trashItems.length !== 1 ? "s" : ""} — restore or permanently delete
                </p>
              </div>
              <button onClick={loadTrash} disabled={trashLoading}
                className="ml-auto text-xs font-medium px-3 py-1.5 rounded-full border transition-all hover:opacity-80 disabled:opacity-40"
                style={{ borderColor: "rgba(248,113,113,0.2)", color: "rgba(248,113,113,0.6)" }}>
                {trashLoading ? "Loading…" : "↻ Refresh"}
              </button>
            </div>

            {trashLoading && (
              <div className="text-center py-12"><div className="w-6 h-6 rounded-full border-2 animate-spin mx-auto" style={{ borderColor: "#f87171", borderTopColor: "transparent" }} /></div>
            )}

            {!trashLoading && trashItems.length === 0 && (
              <div className="text-center py-16 rounded-2xl border" style={{ borderColor: "rgba(248,113,113,0.1)", background: "rgba(248,113,113,0.02)" }}>
                <p className="text-3xl mb-3">🗑</p>
                <p className="text-sm font-semibold" style={{ color: "rgba(248,113,113,0.5)" }}>Trash is empty</p>
              </div>
            )}

            {!trashLoading && trashItems.map(item => (
              <div key={item.id} className="rounded-2xl border mb-3 overflow-hidden"
                style={{ background: "rgba(248,113,113,0.03)", borderColor: "rgba(248,113,113,0.15)" }}>
                <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                      style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "rgba(162,137,89,0.8)" }}>{item.name}</p>
                      <p className="text-xs" style={{ color: "rgba(162,137,89,0.4)" }}>
                        {item.email || "No email"} · {item.documents.length} doc{item.documents.length !== 1 ? "s" : ""}
                        {item.deletedAt && <span className="ml-2">· Deleted {new Date(item.deletedAt).toLocaleDateString()}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => restoreFromTrash(item.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all hover:opacity-80"
                      style={{ background: "rgba(74,222,128,0.06)", borderColor: "rgba(74,222,128,0.25)", color: "#4ade80" }}>
                      ↩ Restore
                    </button>
                    <button onClick={() => setPermDeleteConfirmId(item.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all hover:opacity-80"
                      style={{ background: "rgba(248,113,113,0.06)", borderColor: "rgba(248,113,113,0.3)", color: "#f87171" }}>
                      Delete Forever
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── NORMAL LIST (hidden when trash is open) ── */}
        {!showTrash && (<>

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

        {/* Select All + Actions bar */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between mb-4 px-1">
            <button onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: "rgba(162,137,89,0.55)" }}>
              <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                style={{
                  borderColor: selectedIds.size === filtered.length && filtered.length > 0 ? GOLD : "rgba(162,137,89,0.3)",
                  background: selectedIds.size === filtered.length && filtered.length > 0 ? GOLD : "transparent",
                }}>
                {selectedIds.size === filtered.length && filtered.length > 0 && (
                  <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5"><path d="M2 5l2 2 4-4" stroke="#0b2213" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </div>
              {selectedIds.size === filtered.length && filtered.length > 0 ? "Deselect All" : `Select All (${filtered.length})`}
            </button>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(162,137,89,0.08)", color: "rgba(162,137,89,0.6)" }}>
                  {selectedIds.size} selected
                </span>
                <button onClick={handleBulkExport}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all hover:opacity-80"
                  style={{ background: "rgba(162,137,89,0.06)", borderColor: "rgba(162,137,89,0.2)", color: GOLD }}>
                  ↓ Export
                </button>
                <button onClick={() => setDeleteConfirmOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all hover:opacity-80"
                  style={{ background: "rgba(248,113,113,0.06)", borderColor: "rgba(248,113,113,0.22)", color: "#f87171" }}>
                  🗑 Move to Trash
                </button>
              </div>
            )}
          </div>
        )}

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
              <div key={s.id}
                className="rounded-2xl border transition-all cursor-pointer hover:scale-[1.005] hover:shadow-lg group"
                style={{
                  background: isDone ? "rgba(134,239,172,0.06)" : "rgba(0,0,0,0.18)",
                  borderColor: selectedIds.has(s.id) ? GOLD : isDone ? "rgba(134,239,172,0.3)" : hasAction ? "rgba(251,146,60,0.25)" : "rgba(162,137,89,0.1)",
                  boxShadow: hasAction ? "0 0 0 1px rgba(251,146,60,0.08)" : "none",
                }}
                onClick={() => { setSelected(s); setNotes(s.adminNotes || ""); setRefNumInput(s.immigrationRefNumber || ""); setRefSetSuccess(false); setPreviewDoc(null); setInterviewForm(null); setInviteSent(null); setAdditionalDocsForm(null); setAdditionalDocsSent(null); setOfferLetterSent(null); setEVisaSent(null); setMessageForm(null); setMessageSent(null); setLettersData(null); setLettersError(null); setLettersOpen(false); loadAdminMessages(s.id); if (["final_payment_received","final_payment_confirmed","visa_issued"].includes(s.status)) loadLetters(s.id); }}>
                {/* Orange left accent for action-needed */}
                {hasAction && <div className="h-0.5 w-full rounded-t-2xl" style={{ background: "linear-gradient(to right, transparent, rgba(251,146,60,0.5), transparent)" }} />}
                <div className="px-5 py-4 flex items-center gap-4">
                  {/* Selection checkbox */}
                  <button onClick={e => toggleSelect(s.id, e)}
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all hover:scale-110"
                    style={{
                      borderColor: selectedIds.has(s.id) ? GOLD : "rgba(162,137,89,0.25)",
                      background: selectedIds.has(s.id) ? GOLD : "transparent",
                    }}>
                    {selectedIds.has(s.id) && (
                      <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5">
                        <path d="M2 5l2 2 4-4" stroke="#0b2213" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                  {/* Avatar initial */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                    style={{ background: isDone ? "rgba(74,222,128,0.12)" : "rgba(162,137,89,0.1)", color: isDone ? "#4ade80" : GOLD }}>
                    {(s.name[0] || "?").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: GOLD }}>{s.name}</span>
                      {hasAction && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "rgba(251,146,60,0.1)", color: "#fb923c" }}>
                          ⚡ Action needed
                        </span>
                      )}
                      {s.additionalDocsRequested && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "rgba(251,146,60,0.08)", color: "#fb923c" }}>
                          📎 Docs Requested
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: "rgba(162,137,89,0.4)" }}>
                      {s.email && <span className="truncate max-w-[180px]">{s.email}</span>}
                      <span className="font-mono">{s.passportNumber}</span>
                      <span>{docCount} doc{docCount !== 1 ? "s" : ""}</span>
                      <span>{new Date(s.createdAt).toLocaleDateString("en-GB")}</span>
                    </div>
                  </div>
                  {receiptDoc && (
                    <a
                      href={`${getApiBase()}/api/admin/student-submissions/${s.id}/documents/${receiptDoc.id}/view?token=${encodeURIComponent(localStorage.getItem("admin_token") ?? "")}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0 transition-all hover:opacity-80"
                      style={{ borderColor: "rgba(96,165,250,0.25)", color: "#60a5fa", background: "rgba(96,165,250,0.05)" }}>
                      💳 Receipt ↗
                    </a>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0"
                    style={{ color: sc.color, background: sc.bg }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sc.color }} />
                    {sc.label}
                  </span>
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                    style={{ color: "rgba(162,137,89,0.2)" }}>
                    <path fillRule="evenodd" d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>

        </>)}
      </main>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}
          onClick={e => { if (e.target === e.currentTarget) { setSelected(null); setPreviewDoc(null); } }}>
          <div className="w-full max-w-3xl rounded-3xl border flex flex-col" style={{ background: "#0a1f0e", borderColor: "rgba(162,137,89,0.18)", maxHeight: "92vh" }}>

            {/* Modal top accent */}
            <div className="h-0.5 rounded-t-3xl" style={{ background: `linear-gradient(to right, transparent, ${GOLD}, transparent)` }} />

            <div className="px-6 py-4 border-b flex items-start justify-between gap-4 shrink-0" style={{ borderColor: "rgba(162,137,89,0.1)" }}>
              <div className="flex items-start gap-3 min-w-0">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-base font-bold mt-0.5"
                  style={{ background: "rgba(162,137,89,0.12)", color: GOLD }}>
                  {(selected.name[0] || "?").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold" style={{ color: GOLD }}>{selected.name}</h2>
                    {statusConfig[selected.status] && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{ color: statusConfig[selected.status].color, background: statusConfig[selected.status].bg }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusConfig[selected.status].color }} />
                        {statusConfig[selected.status].label}
                      </span>
                    )}
                    {["payment_received", "acknowledged"].includes(selected.status) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono"
                        style={{ background: "rgba(74,222,128,0.08)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>
                        STU{selected.passportNumber.slice(-4).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(162,137,89,0.4)" }}>
                    {selected.email}
                    {selected.email && " · "}
                    <span className="font-mono">{selected.passportNumber}</span>
                    {" · DOB "}
                    {selected.dateOfBirth}
                    {calcAge(selected.dateOfBirth) !== null && (
                      <span className="ml-1" style={{ color: GOLD }}>
                        (Age {calcAge(selected.dateOfBirth)})
                      </span>
                    )}
                  </p>
                  {(selected.preferredCourse || selected.preferredLevel) && (
                    <div className="mt-2 flex items-start gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0" style={{ background: "rgba(162,137,89,0.12)", color: GOLD }}>
                        {selected.preferredLevel === "masters" ? "Master's" : selected.preferredLevel === "bachelors" ? "Bachelor's" : selected.preferredLevel === "associate" ? "Associate" : selected.preferredLevel}
                      </span>
                      {selected.preferredCourse && (
                        <p className="text-xs" style={{ color: "rgba(162,137,89,0.65)" }}>
                          {selected.preferredCourse}
                          {selected.preferredInstitution && <span style={{ color: "rgba(162,137,89,0.4)" }}> · {selected.preferredInstitution}</span>}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`${getApiBase()}/api/admin/student-submissions/${selected.id}/print`}
                  target="_blank" rel="noopener noreferrer"
                  title="Print student profile"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all hover:opacity-80"
                  style={{ borderColor: "rgba(162,137,89,0.2)", color: "rgba(162,137,89,0.55)", background: "rgba(162,137,89,0.05)" }}
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a1 1 0 00-1-1H6a1 1 0 00-1 1zm2-1h2v3H7V3zm-1 9H5V9h1v3zm2 0H8V9h1v3zm2 0h-1V9h1v3z" clipRule="evenodd" /></svg>
                  Print
                </a>
                <a
                  href={`${getApiBase()}/api/admin/student-submissions/${selected.id}/export-zip`}
                  download
                  title="Download all documents as ZIP"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all hover:opacity-80"
                  style={{ borderColor: "rgba(162,137,89,0.2)", color: "rgba(162,137,89,0.55)", background: "rgba(162,137,89,0.05)" }}
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M8 1a.75.75 0 01.75.75v7.69l2.72-2.72a.75.75 0 011.06 1.06l-4 4a.75.75 0 01-1.06 0l-4-4a.75.75 0 111.06-1.06L7.25 9.44V1.75A.75.75 0 018 1zM1.75 14a.75.75 0 000 1.5h12.5a.75.75 0 000-1.5H1.75z" clipRule="evenodd" /></svg>
                  ZIP
                </a>
                <button
                  onClick={() => openLiveView(selected.id)}
                  title="Live View — mirror student's portal"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all hover:opacity-80"
                  style={{ borderColor: "rgba(162,137,89,0.35)", color: "#a28959", background: "rgba(162,137,89,0.08)" }}
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><circle cx="8" cy="8" r="2.5"/><path fillRule="evenodd" d="M8 2C4.5 2 1.5 4.5 0 8c1.5 3.5 4.5 6 8 6s6.5-2.5 8-6c-1.5-3.5-4.5-6-8-6zm0 10a4 4 0 110-8 4 4 0 010 8z" clipRule="evenodd"/></svg>
                  Live View
                </button>
                <button
                  onClick={() => { setSelected(null); setPreviewDoc(null); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                  style={{ background: "rgba(162,137,89,0.07)", color: "rgba(162,137,89,0.45)" }}>
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" /></svg>
                </button>
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

                {/* Shared Application Email — visible for acknowledged and beyond */}
                {["acknowledged","interview_arranged","interview_completed","second_payment_pending","second_payment_received","second_payment_confirmed","university_interview_arranged","university_interview_completed","offer_letter_pending","final_payment_received","final_payment_confirmed","visa_issued"].includes(selected.status) && (
                  <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(162,137,89,0.25)" }}>
                    <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "rgba(162,137,89,0.15)" }}>
                      <span>✉️</span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: GOLD }}>Shared Application Email</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(162,137,89,0.45)" }}>Gmail account shared between you and the student for HK university applications</p>
                      </div>
                    </div>
                    <div className="px-4 py-4 space-y-3">
                      {selected.sharedEmail && (
                        <div className="rounded-xl px-4 py-3 border space-y-2" style={{ background: "rgba(162,137,89,0.06)", borderColor: "rgba(162,137,89,0.2)" }}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-medium mb-0.5" style={{ color: "rgba(162,137,89,0.5)" }}>Email address</p>
                              <p className="text-sm font-mono font-semibold truncate" style={{ color: GOLD }}>{selected.sharedEmail}</p>
                            </div>
                            <a href={`https://mail.google.com/mail/u/0/?authuser=${selected.sharedEmail}`} target="_blank" rel="noopener noreferrer"
                              className="shrink-0 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all hover:opacity-80 flex items-center gap-1"
                              style={{ borderColor: "rgba(162,137,89,0.25)", color: GOLD, background: "rgba(162,137,89,0.08)" }}>
                              Open Gmail ↗
                            </a>
                          </div>
                          {selected.sharedEmailPassword && (
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium mb-0.5" style={{ color: "rgba(162,137,89,0.5)" }}>App Password</p>
                                <p className="text-sm font-mono" style={{ color: GOLD }}>{selected.sharedEmailPassword}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="space-y-2">
                        <input
                          type="email"
                          placeholder={selected.sharedEmail ? `Update: ${selected.sharedEmail}` : "e.g. chan.hk2025@gmail.com"}
                          value={sharedEmailForm.email}
                          onChange={e => setSharedEmailForm(f => ({ ...f, email: e.target.value }))}
                          className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none font-mono"
                          style={{ background: "rgba(162,137,89,0.05)", borderColor: "rgba(162,137,89,0.18)", color: GOLD }}
                        />
                        <div className="relative">
                          <input
                            type={sharedEmailShowPw ? "text" : "password"}
                            placeholder="Gmail App Password (16-char)"
                            value={sharedEmailForm.password}
                            onChange={e => setSharedEmailForm(f => ({ ...f, password: e.target.value }))}
                            className="w-full rounded-xl px-3 py-2.5 pr-10 text-sm border outline-none font-mono"
                            style={{ background: "rgba(162,137,89,0.05)", borderColor: "rgba(162,137,89,0.18)", color: GOLD }}
                          />
                          <button type="button" onClick={() => setSharedEmailShowPw(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                            style={{ color: "rgba(162,137,89,0.45)" }}>
                            {sharedEmailShowPw ? "Hide" : "Show"}
                          </button>
                        </div>
                        <button
                          onClick={handleSaveSharedEmail}
                          disabled={savingSharedEmail || (!sharedEmailForm.email && !sharedEmailForm.password)}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 disabled:opacity-40"
                          style={{ background: "rgba(162,137,89,0.1)", borderColor: "rgba(162,137,89,0.3)", color: GOLD }}>
                          {savingSharedEmail ? "Saving…" : sharedEmailSaved ? "✓ Saved" : selected.sharedEmail ? "Update Credentials" : "Set Credentials"}
                        </button>
                      </div>
                    </div>
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
                        <div className="space-y-2">
                          <button onClick={() => setInterviewForm({ zoomLink: "", dateTime: "", notes: "" })}
                            className="w-full py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 flex items-center justify-center gap-2"
                            style={{ background: "rgba(96,165,250,0.06)", borderColor: "rgba(96,165,250,0.22)", color: "#60a5fa" }}>
                            🎥 Schedule Mock Interview
                          </button>
                          <button onClick={() => { if (confirm("Skip the mock interview and proceed directly to 2nd payment?")) updateStatus.mutate({ id: selected.id, status: "interview_completed", adminNotes: notes }); }}
                            disabled={updateStatus.isPending}
                            className="w-full py-2 rounded-xl text-xs font-semibold border transition-all hover:opacity-80 disabled:opacity-40"
                            style={{ background: "rgba(162,137,89,0.05)", borderColor: "rgba(162,137,89,0.18)", color: "rgba(162,137,89,0.6)" }}>
                            ⏭ Skip Mock Interview
                          </button>
                        </div>
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
                      <button onClick={() => { if (confirm("Skip the mock interview and proceed to 2nd payment stage?")) updateStatus.mutate({ id: selected.id, status: "interview_completed", adminNotes: notes }); }}
                        disabled={updateStatus.isPending}
                        className="w-full py-2 rounded-xl text-xs font-semibold border transition-all hover:opacity-80 disabled:opacity-40"
                        style={{ background: "rgba(162,137,89,0.05)", borderColor: "rgba(162,137,89,0.18)", color: "rgba(162,137,89,0.6)" }}>
                        ⏭ Skip Mock Interview
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
                        <div className="space-y-2">
                          <button onClick={() => setUniInterviewForm({ platform: "zoom", link: "", dateTime: "", notes: "" })}
                            className="w-full py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 flex items-center justify-center gap-2"
                            style={{ background: "rgba(56,189,248,0.06)", borderColor: "rgba(56,189,248,0.22)", color: "#38bdf8" }}>
                            🏫 Schedule University Interview
                          </button>
                          <button onClick={() => { if (confirm("Skip the university interview and proceed directly to offer letter stage?")) updateStatus.mutate({ id: selected.id, status: "university_interview_completed", adminNotes: notes }); }}
                            disabled={updateStatus.isPending}
                            className="w-full py-2 rounded-xl text-xs font-semibold border transition-all hover:opacity-80 disabled:opacity-40"
                            style={{ background: "rgba(162,137,89,0.05)", borderColor: "rgba(162,137,89,0.18)", color: "rgba(162,137,89,0.6)" }}>
                            ⏭ Skip University Interview
                          </button>
                        </div>
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

                {/* Final Payment Confirmed + ID995A + e-Visa */}
                {["final_payment_confirmed","visa_issued"].includes(selected.status) && (
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
                    {/* Immigration Reference Number */}
                    <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(74,222,128,0.2)" }}>
                      <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(74,222,128,0.1)" }}>
                        <p className="text-sm font-semibold" style={{ color: "#4ade80" }}>🇭🇰 Immigration Reference Number</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(74,222,128,0.45)" }}>Assign the official EOEN-XXXXXXX-XX reference number visible to the student</p>
                      </div>
                      <div className="px-4 py-4 space-y-3">
                        {selected.immigrationRefNumber && (
                          <div className="rounded-xl px-3 py-2.5 border" style={{ background: "rgba(74,222,128,0.05)", borderColor: "rgba(74,222,128,0.15)" }}>
                            <p className="text-xs font-medium mb-0.5" style={{ color: "rgba(74,222,128,0.5)" }}>Current reference:</p>
                            <p className="font-mono text-sm font-bold" style={{ color: "#4ade80" }}>{selected.immigrationRefNumber}</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="EOEN-XXXXXXX-XX"
                            value={refNumInput}
                            onChange={e => setRefNumInput(e.target.value)}
                            className="flex-1 rounded-xl px-3 py-2 text-sm border outline-none font-mono"
                            style={{ background: "rgba(162,137,89,0.05)", borderColor: "rgba(162,137,89,0.2)", color: GOLD }}
                          />
                          <button
                            onClick={handleSetImmigrationRef}
                            disabled={settingRef || !refNumInput.trim()}
                            className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 disabled:opacity-40"
                            style={{ borderColor: "rgba(74,222,128,0.3)", color: "#4ade80", background: "rgba(74,222,128,0.06)" }}>
                            {settingRef ? "Saving…" : refSetSuccess ? "✓ Saved" : "Save"}
                          </button>
                        </div>
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

                    {/* e-Visa Upload — final_payment_confirmed only */}
                    {selected.status === "final_payment_confirmed" && (
                      <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(52,211,153,0.25)" }}>
                        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "rgba(52,211,153,0.12)" }}>
                          <p className="text-sm font-semibold" style={{ color: "#34d399" }}>🛂 Upload e-Visa (HK Immigration)</p>
                          {eVisaSent === selected.id && (
                            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(52,211,153,0.1)", color: "#34d399" }}>✓ Sent to student</span>
                          )}
                        </div>
                        <div className="px-4 py-4 space-y-3">
                          <p className="text-xs" style={{ color: "rgba(52,211,153,0.6)" }}>
                            Once the Hong Kong Immigration Department issues the official e-Visa, upload it here. The student will be notified by email and can download it from their portal.
                          </p>
                          <button onClick={() => eVisaFileRef.current?.click()} disabled={eVisaUploading}
                            className="w-full py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
                            style={{ background: "rgba(52,211,153,0.06)", borderColor: "rgba(52,211,153,0.25)", color: "#34d399", borderStyle: "dashed" }}>
                            {eVisaUploading
                              ? <><span className="w-3 h-3 rounded-full border animate-spin" style={{ borderColor: "#34d399", borderTopColor: "transparent" }} /> Uploading…</>
                              : <>🛂 Choose e-Visa File…</>}
                          </button>
                          <input ref={eVisaFileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadEVisa(f); }} />
                        </div>
                      </div>
                    )}

                    {/* e-Visa Issued info — visa_issued only */}
                    {selected.status === "visa_issued" && (
                      <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(52,211,153,0.3)" }}>
                        <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(52,211,153,0.12)" }}>
                          <p className="text-sm font-semibold" style={{ color: "#34d399" }}>🎉 e-Visa Issued to Student</p>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-xs" style={{ color: "rgba(52,211,153,0.6)" }}>
                            The official Hong Kong Immigration e-Visa has been uploaded and the student has been notified by email. They can now download it from their portal.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Immigration Letters Panel */}
                {(selected.status === "final_payment_received" || selected.status === "final_payment_confirmed" || selected.status === "visa_issued") && (
                  <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(162,137,89,0.25)" }}>
                    <button className="w-full px-4 py-3 flex items-center justify-between" onClick={() => setLettersOpen(v => !v)}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">✉️</span>
                        <span className="text-sm font-semibold" style={{ color: GOLD }}>Immigration Letters</span>
                        {lettersData?.generatedAt && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-1" style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80" }}>Generated</span>
                        )}
                      </div>
                      <span style={{ color: "rgba(162,137,89,0.4)" }}>{lettersOpen ? "▲" : "▼"}</span>
                    </button>

                    {lettersOpen && (
                      <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: "rgba(162,137,89,0.12)" }}>
                        <p className="text-xs" style={{ color: "rgba(162,137,89,0.55)" }}>
                          Enter course details to generate 4 formal immigration letters. Letters are written in first person using the student's ID995A data.
                        </p>

                        {/* Course info inputs */}
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(162,137,89,0.7)" }}>Course Name *</label>
                            <input
                              className="w-full rounded-xl px-3 py-2 text-sm border outline-none"
                              style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(162,137,89,0.25)", color: "#e8d5b0" }}
                              placeholder="e.g. MSc in Finance"
                              value={lettersCourseForm.courseName}
                              onChange={e => setLettersCourseForm(f => ({ ...f, courseName: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(162,137,89,0.7)" }}>University / Institution *</label>
                            <input
                              className="w-full rounded-xl px-3 py-2 text-sm border outline-none"
                              style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(162,137,89,0.25)", color: "#e8d5b0" }}
                              placeholder="e.g. The University of Hong Kong"
                              value={lettersCourseForm.universityName}
                              onChange={e => setLettersCourseForm(f => ({ ...f, universityName: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(162,137,89,0.7)" }}>Course Website (optional)</label>
                            <input
                              className="w-full rounded-xl px-3 py-2 text-sm border outline-none"
                              style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(162,137,89,0.25)", color: "#e8d5b0" }}
                              placeholder="https://..."
                              value={lettersCourseForm.courseWebsite}
                              onChange={e => setLettersCourseForm(f => ({ ...f, courseWebsite: e.target.value }))}
                            />
                          </div>
                        </div>

                        {lettersError && (
                          <p className="text-xs rounded-xl px-3 py-2 border" style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)", color: "#f87171" }}>
                            {lettersError}
                          </p>
                        )}

                        <button
                          onClick={handleGenerateLetters}
                          disabled={generatingLetters}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-90 disabled:opacity-50"
                          style={{ background: "rgba(162,137,89,0.15)", borderColor: "rgba(162,137,89,0.35)", color: GOLD }}
                        >
                          {generatingLetters ? "⏳ Generating letters via AI…" : lettersData ? "🔄 Regenerate All 4 Letters" : "✨ Generate All 4 Letters"}
                        </button>

                        {/* Generated letters */}
                        {lettersData && [
                          { num: 1, title: "Reason for Studying the Course" },
                          { num: 2, title: "Reason for Studying in Hong Kong" },
                          { num: 3, title: "Reason for Choosing the University" },
                          { num: 4, title: "Future Plans After Graduation" },
                        ].map(({ num, title }) => {
                          const body: string | null = (lettersData as any)[`letter${num}`];
                          if (!body) return null;
                          return (
                            <div key={num} className="rounded-xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(162,137,89,0.2)" }}>
                              <div className="px-3 py-2.5 flex items-center justify-between border-b" style={{ borderColor: "rgba(162,137,89,0.12)" }}>
                                <div>
                                  <span className="text-xs font-bold mr-1.5" style={{ color: GOLD }}>Letter {num}</span>
                                  <span className="text-xs" style={{ color: "rgba(162,137,89,0.65)" }}>{title}</span>
                                </div>
                                <a
                                  href={`${getApiBase()}/api/admin/student-submissions/${selected.id}/immigration-letters/${num}/view`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-3 py-1 rounded-lg border font-medium transition-all hover:opacity-80"
                                  style={{ borderColor: "rgba(162,137,89,0.3)", color: GOLD, background: "rgba(162,137,89,0.08)" }}
                                >
                                  ↗ View &amp; Print
                                </a>
                              </div>
                              <div className="px-3 py-2.5">
                                <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "rgba(232,213,176,0.55)" }}>
                                  {body.slice(0, 220)}{body.length > 220 ? "…" : ""}
                                </p>
                              </div>
                            </div>
                          );
                        })}

                        {lettersData?.generatedAt && (
                          <p className="text-xs text-center" style={{ color: "rgba(162,137,89,0.35)" }}>
                            Last generated: {new Date(lettersData.generatedAt).toLocaleString("en-GB")}
                          </p>
                        )}
                      </div>
                    )}
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

      {/* Move to Trash Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
          <div className="rounded-2xl border overflow-hidden max-w-sm w-full mx-4" style={{ background: "#0b2213", borderColor: "rgba(248,113,113,0.3)" }}>
            <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(248,113,113,0.12)" }}>
              <p className="text-base font-bold" style={{ color: "#f87171" }}>🗑 Move {selectedIds.size} Profile{selectedIds.size !== 1 ? "s" : ""} to Trash?</p>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm mb-6 leading-relaxed" style={{ color: "rgba(162,137,89,0.6)" }}>
                {selectedIds.size === 1 ? "This profile" : `These ${selectedIds.size} profiles`} will be moved to the Trash folder. You can restore or permanently delete them from there.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirmOpen(false)} disabled={deletingSelected}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ borderColor: "rgba(162,137,89,0.18)", color: "rgba(162,137,89,0.55)" }}>
                  Cancel
                </button>
                <button onClick={handleBulkDelete} disabled={deletingSelected}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: "rgba(248,113,113,0.08)", borderColor: "rgba(248,113,113,0.3)", color: "#f87171" }}>
                  {deletingSelected
                    ? <><span className="w-3 h-3 rounded-full border animate-spin" style={{ borderColor: "#f87171", borderTopColor: "transparent" }} /> Moving…</>
                    : `🗑 Move to Trash`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {permDeleteConfirmId !== null && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}>
          <div className="rounded-2xl border overflow-hidden max-w-sm w-full mx-4" style={{ background: "#0b2213", borderColor: "rgba(248,113,113,0.5)" }}>
            <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(248,113,113,0.18)" }}>
              <p className="text-base font-bold" style={{ color: "#f87171" }}>⚠️ Permanently Delete?</p>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm mb-6 leading-relaxed" style={{ color: "rgba(162,137,89,0.6)" }}>
                This will <strong style={{ color: "#f87171" }}>permanently remove</strong> this student profile, all uploaded documents and messages. <strong style={{ color: "#f87171" }}>This cannot be undone.</strong>
              </p>
              <div className="flex gap-3">
                <button onClick={() => setPermDeleteConfirmId(null)} disabled={permDeleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ borderColor: "rgba(162,137,89,0.18)", color: "rgba(162,137,89,0.55)" }}>
                  Cancel
                </button>
                <button onClick={() => permanentDelete(permDeleteConfirmId)} disabled={permDeleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: "rgba(248,113,113,0.12)", borderColor: "rgba(248,113,113,0.5)", color: "#f87171" }}>
                  {permDeleting
                    ? <><span className="w-3 h-3 rounded-full border animate-spin" style={{ borderColor: "#f87171", borderTopColor: "transparent" }} /> Deleting…</>
                    : "Delete Forever"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Courses Modal — Admin Full View */}
      {showCourses && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowCourses(false); }}>
          <div className="rounded-2xl border overflow-hidden w-full max-w-3xl mx-4 flex flex-col" style={{ background: "#0b2213", borderColor: "rgba(162,137,89,0.2)", maxHeight: "88vh" }}>
            <div className="px-6 py-4 border-b flex items-center justify-between gap-3 flex-wrap shrink-0" style={{ borderColor: "rgba(162,137,89,0.12)" }}>
              <div>
                <p className="text-base font-bold" style={{ color: GOLD }}>Course Catalogue</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(162,137,89,0.4)" }}>{COURSES.length} programmes · institution & fees visible to admin only</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: "rgba(162,137,89,0.05)", border: "1px solid rgba(162,137,89,0.1)" }}>
                  {(["masters","bachelors","associate"] as DegreeLevel[]).map(l => (
                    <button key={l} onClick={() => { setCoursesLevel(l); setCoursesSearch(""); }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: coursesLevel === l ? "rgba(162,137,89,0.18)" : "transparent", color: coursesLevel === l ? GOLD : "rgba(162,137,89,0.4)" }}>
                      {l === "masters" ? "Master's" : l === "bachelors" ? "Bachelor's" : "Associate"}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowCourses(false)} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-70"
                  style={{ background: "rgba(162,137,89,0.06)", color: "rgba(162,137,89,0.5)", border: "1px solid rgba(162,137,89,0.1)" }}>✕</button>
              </div>
            </div>
            <div className="px-5 pt-4 pb-2 shrink-0">
              <input value={coursesSearch} onChange={e => setCoursesSearch(e.target.value)}
                placeholder="Search by programme or institution…"
                className="w-full text-sm px-4 py-2.5 rounded-xl border bg-transparent outline-none"
                style={{ borderColor: "rgba(162,137,89,0.18)", color: GOLD, background: "rgba(162,137,89,0.04)" }}
              />
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-3">
              {(() => {
                const filtered = COURSES.filter(c => c.level === coursesLevel && (
                  coursesSearch.trim() === "" ||
                  c.programme.toLowerCase().includes(coursesSearch.toLowerCase()) ||
                  c.institution.toLowerCase().includes(coursesSearch.toLowerCase())
                ));
                if (filtered.length === 0) return (
                  <p className="text-sm text-center py-8" style={{ color: "rgba(162,137,89,0.35)" }}>No results for "{coursesSearch}"</p>
                );
                let lastInst = "";
                return filtered.map(c => {
                  const showInst = c.institution !== lastInst;
                  lastInst = c.institution;
                  return (
                    <div key={c.id}>
                      {showInst && (
                        <p className="text-xs font-bold tracking-wider uppercase mt-4 mb-1.5 first:mt-0" style={{ color: "rgba(162,137,89,0.45)" }}>
                          {c.institution}
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 mb-1.5 border"
                        style={{ background: "rgba(162,137,89,0.03)", borderColor: "rgba(162,137,89,0.08)" }}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: GOLD }} />
                          <span className="text-sm leading-snug truncate" style={{ color: "rgba(162,137,89,0.8)" }}>{c.programme}</span>
                        </div>
                        <span className="text-xs font-semibold shrink-0 px-2.5 py-1 rounded-full"
                          style={{ background: "rgba(162,137,89,0.08)", color: GOLD }}>
                          {typeof c.annualFeeHKD === "number" ? `HKD ${c.annualFeeHKD.toLocaleString()}` : `HKD ${c.annualFeeHKD}`}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <div className="px-5 py-3 border-t shrink-0" style={{ borderColor: "rgba(162,137,89,0.08)" }}>
              <p className="text-xs" style={{ color: "rgba(162,137,89,0.3)" }}>
                {LEVEL_LABELS[coursesLevel]} · Annual fees shown · Institution names & fees are hidden from students
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Live View Modal ─────────────────────────────────────────── */}
      {liveViewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)" }}>
          <div className="rounded-2xl border flex flex-col overflow-hidden" style={{ width: "min(90vw, 1100px)", maxHeight: "90vh", background: "#0a1628", borderColor: "rgba(162,137,89,0.25)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b shrink-0" style={{ borderColor: "rgba(162,137,89,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: liveViewStatus === "streaming" ? "#4ade80" : liveViewStatus === "waiting" ? GOLD : "#f87171", boxShadow: liveViewStatus === "streaming" ? "0 0 6px #4ade80" : "none" }} />
                  <span className="text-sm font-semibold" style={{ color: GOLD }}>Live View</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(162,137,89,0.08)", color: "rgba(162,137,89,0.6)" }}>
                  {liveViewStatus === "connecting" && "Connecting…"}
                  {liveViewStatus === "waiting" && "Waiting for student…"}
                  {liveViewStatus === "streaming" && "Streaming"}
                  {liveViewStatus === "offline" && "Student offline"}
                </span>
              </div>
              <button onClick={closeLiveView} className="w-7 h-7 rounded-lg flex items-center justify-center text-lg leading-none hover:opacity-70" style={{ background: "rgba(162,137,89,0.08)", color: "rgba(162,137,89,0.5)" }}>×</button>
            </div>
            {/* Canvas area */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4" style={{ minHeight: 300 }}>
              {liveViewStatus === "streaming" ? (
                <canvas ref={liveViewCanvasRef} className="rounded-xl w-full" style={{ maxWidth: "100%", border: "1px solid rgba(162,137,89,0.12)" }} />
              ) : (
                <div className="flex flex-col items-center gap-4" style={{ color: "rgba(162,137,89,0.4)" }}>
                  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 opacity-40">
                    <ellipse cx="24" cy="24" rx="20" ry="14" />
                    <circle cx="24" cy="24" r="5" />
                    {liveViewStatus === "offline" && <line x1="6" y1="6" x2="42" y2="42" stroke="#f87171" strokeWidth="2" />}
                  </svg>
                  <p className="text-sm">
                    {liveViewStatus === "connecting" && "Establishing connection…"}
                    {liveViewStatus === "waiting" && "Student portal not open yet. Share is sent as soon as they load their portal."}
                    {liveViewStatus === "offline" && "Could not reach student — they may not be logged in."}
                  </p>
                </div>
              )}
            </div>
            {/* Footer note */}
            <div className="px-5 py-2.5 border-t shrink-0 text-xs" style={{ borderColor: "rgba(162,137,89,0.1)", color: "rgba(162,137,89,0.3)" }}>
              The student sees a "Being watched" banner and can stop sharing at any time. Frames are not recorded.
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
      const res = await adminFetch(`${apiBase}/api/admin/student-submissions/${submissionId}/id995a`, { credentials: "include" });
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
      const res = await adminFetch(`${apiBase}/api/admin/student-submissions/${submissionId}/id995a/generate`, {
        method: "POST", 
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
      const res = await adminFetch(`${apiBase}/api/admin/student-submissions/${submissionId}/id995a`, {
        method: "PATCH", 
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
