import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

const BG = "#0f2d18";
const GOLD = "#a28959";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }

type Document = { id: number; documentType: string; fileName: string; fileUrl: string };
type Submission = {
  id: number; name: string; email: string | null; dateOfBirth: string;
  passportNumber: string; status: string; adminNotes: string | null;
  createdAt: string; documents: Document[];
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending:          { label: "Pending",          color: GOLD,      bg: "rgba(162,137,89,0.12)" },
  approved:         { label: "Approved",         color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  payment_pending:  { label: "Payment Pending",  color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  payment_received: { label: "Receipt Received", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  acknowledged:     { label: "Acknowledged",     color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  rejected:         { label: "Rejected",         color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

const nextActions: Record<string, { label: string; nextStatus: string; color: string }[]> = {
  pending:          [{ label: "Approve & Request Payment", nextStatus: "payment_pending", color: "#4ade80" }, { label: "Reject", nextStatus: "rejected", color: "#f87171" }],
  payment_received: [{ label: "Confirm Payment & Acknowledge", nextStatus: "acknowledged", color: GOLD }],
};

export default function Submissions() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<Submission | null>(null);
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState("all");

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-student-submissions"] }); setSelected(null); },
  });

  const filtered = filter === "all" ? submissions : submissions.filter(s => s.status === filter);
  const pendingCount = submissions.filter(s => s.status === "pending" || s.status === "payment_received").length;

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(162,137,89,0.15)" }}>
        <div className="flex items-center gap-4">
          <button onClick={() => setLocation("/admin")}
            className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
            style={{ color: "rgba(162,137,89,0.5)" }}>
            ← Back
          </button>
          <img src="/harrowgate-logo.png" alt="HARROWGATE" className="h-10 object-contain" />
          <span className="text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full" style={{ background: "rgba(162,137,89,0.1)", color: GOLD }}>
            Admin Panel
          </span>
        </div>
        <a href={`${BASE}/admin`} className="text-xs transition-opacity hover:opacity-70" style={{ color: "rgba(162,137,89,0.5)" }}>
          Consultant Portal →
        </a>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: GOLD }}>Student Submissions</h1>
            <p className="text-sm" style={{ color: "rgba(162,137,89,0.55)" }}>
              {submissions.length} total · {pendingCount} requiring action
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="px-4 py-2 rounded-full text-sm font-semibold" style={{ background: "rgba(251,146,60,0.12)", color: "#fb923c" }}>
              ⚡ {pendingCount} need{pendingCount === 1 ? "s" : ""} your attention
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {["all", "pending", "approved", "payment_pending", "payment_received", "acknowledged", "rejected"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold border transition-all"
              style={filter === f
                ? { background: GOLD, color: BG, borderColor: GOLD }
                : { background: "transparent", color: "rgba(162,137,89,0.55)", borderColor: "rgba(162,137,89,0.18)" }
              }>
              {f === "all" ? "All" : (statusConfig[f]?.label || f)}
              {f !== "all" && <span className="ml-1.5 opacity-50">{submissions.filter(s => s.status === f).length}</span>}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="text-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
            <p className="text-sm" style={{ color: "rgba(162,137,89,0.45)" }}>Loading submissions…</p>
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 rounded-2xl border" style={{ borderColor: "rgba(162,137,89,0.08)" }}>
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm" style={{ color: "rgba(162,137,89,0.4)" }}>No submissions yet</p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map(s => {
            const sc = statusConfig[s.status] || { label: s.status, color: GOLD, bg: "rgba(162,137,89,0.12)" };
            const hasAction = (nextActions[s.status]?.length ?? 0) > 0;
            const docCount = s.documents.filter(d => d.documentType !== "payment_receipt").length;
            const hasReceipt = s.documents.some(d => d.documentType === "payment_receipt");
            return (
              <div key={s.id}
                className="rounded-2xl border transition-all cursor-pointer hover:border-opacity-50"
                style={{ background: "rgba(0,0,0,0.2)", borderColor: hasAction ? "rgba(251,146,60,0.28)" : "rgba(162,137,89,0.12)" }}
                onClick={() => { setSelected(s); setNotes(s.adminNotes || ""); }}>
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
                      {hasReceipt && <span style={{ color: "#60a5fa" }}>📎 Receipt</span>}
                      <span>{new Date(s.createdAt).toLocaleDateString("en-GB")}</span>
                    </div>
                  </div>
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="w-full max-w-2xl rounded-3xl border overflow-hidden"
            style={{ background: "#0a1f0e", borderColor: "rgba(162,137,89,0.18)", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: "rgba(162,137,89,0.12)" }}>
              <div>
                <h2 className="text-lg font-bold" style={{ color: GOLD }}>{selected.name}</h2>
                <p className="text-xs" style={{ color: "rgba(162,137,89,0.45)" }}>{selected.email}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-2xl leading-none" style={{ color: "rgba(162,137,89,0.35)" }}>×</button>
            </div>
            <div className="px-6 py-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Date of Birth", value: selected.dateOfBirth },
                  { label: "Passport", value: selected.passportNumber },
                  { label: "Status", value: statusConfig[selected.status]?.label || selected.status },
                ].map(f => (
                  <div key={f.label} className="rounded-xl p-3 border text-center" style={{ background: "rgba(162,137,89,0.04)", borderColor: "rgba(162,137,89,0.1)" }}>
                    <p className="text-xs mb-1" style={{ color: "rgba(162,137,89,0.45)" }}>{f.label}</p>
                    <p className="text-sm font-semibold" style={{ color: GOLD }}>{f.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-semibold mb-3" style={{ color: "rgba(162,137,89,0.45)" }}>Documents</p>
                <div className="space-y-2">
                  {selected.documents.filter(d => d.documentType !== "payment_receipt").map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 rounded-xl px-4 py-2.5 border" style={{ background: "rgba(162,137,89,0.05)", borderColor: "rgba(162,137,89,0.12)" }}>
                      <span>📄</span>
                      <span className="text-sm flex-1 truncate" style={{ color: GOLD }}>{doc.fileName}</span>
                      <span className="text-xs" style={{ color: "rgba(162,137,89,0.35)" }}>{doc.documentType.replace("_", " ").toUpperCase()}</span>
                    </div>
                  ))}
                  {selected.documents.filter(d => d.documentType === "payment_receipt").map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 rounded-xl px-4 py-2.5 border" style={{ background: "rgba(96,165,250,0.05)", borderColor: "rgba(96,165,250,0.18)" }}>
                      <span>💳</span>
                      <span className="text-sm flex-1 truncate" style={{ color: "#60a5fa" }}>{doc.fileName}</span>
                      <span className="text-xs" style={{ color: "rgba(96,165,250,0.45)" }}>PAYMENT RECEIPT</span>
                    </div>
                  ))}
                  {selected.documents.length === 0 && (
                    <p className="text-sm text-center py-3" style={{ color: "rgba(162,137,89,0.35)" }}>No documents uploaded</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(162,137,89,0.45)" }}>Notes for Student</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Optional note visible to the student on their portal…"
                  rows={3}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none border resize-none"
                  style={{ background: "rgba(162,137,89,0.05)", borderColor: "rgba(162,137,89,0.12)", color: GOLD }}
                />
              </div>

              {nextActions[selected.status] && (
                <div className="flex gap-3 flex-wrap">
                  {nextActions[selected.status].map(action => (
                    <button key={action.nextStatus}
                      onClick={() => updateStatus.mutate({ id: selected.id, status: action.nextStatus, adminNotes: notes })}
                      disabled={updateStatus.isPending}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: `${action.color}18`, borderColor: `${action.color}35`, color: action.color }}>
                      {updateStatus.isPending ? "Updating…" : action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
