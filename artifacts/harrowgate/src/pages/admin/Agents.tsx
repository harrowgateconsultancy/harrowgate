import { useState, useEffect, useCallback } from "react";
import { useAdminTheme } from "../../contexts/AdminThemeContext";

const GOLD = "#a28959";
const CARD = "#0c2217";
const BORDER = "rgba(162,137,89,0.2)";

function useAgentColors() {
  const { isDark } = useAdminTheme();
  return {
    isDark,
    card:    isDark ? CARD      : "#ffffff",
    bdr:     isDark ? BORDER    : "rgba(0,0,0,0.09)",
    bdrFaint:isDark ? "rgba(162,137,89,0.12)" : "rgba(0,0,0,0.06)",
    text:    isDark ? "#e8dcc8" : "#0d1a3a",
    textMid: isDark ? "#9a8a6a" : "rgba(0,0,0,0.52)",
    textFaint:isDark ? "#5a4a2a" : "rgba(0,0,0,0.32)",
    inputBg: isDark ? "rgba(255,255,255,0.04)" : "#f5f7f5",
    subtleBg:isDark ? "rgba(162,137,89,0.04)" : "rgba(0,0,0,0.02)",
  };
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function adminFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("admin_token");
  return fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts?.headers ?? {}),
    },
  });
}

function fileDownloadUrl(objectPath: string): string {
  return `${BASE}/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;
}

interface Agent {
  id: number;
  username: string;
  plainPassword: string | null;
  companyName: string;
  businessRegUrl: string | null;
  businessRegName: string | null;
  contactName: string;
  officeAddress: string;
  contactNumber: string;
  whatsappAvailable: string;
  email: string | null;
  idDocUrl: string | null;
  idDocName: string | null;
  agentCode: string | null;
  status: string;
  createdAt: string;
}

// ── Confirm Dialog ──────────────────────────────────────────────────────────
function ConfirmDialog({
  message, onConfirm, onCancel, danger,
}: {
  message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  const C = useAgentColors();
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{ background: C.card, border: `1px solid ${danger ? "rgba(220,80,80,0.4)" : C.bdr}`, borderRadius: 14, padding: 28, maxWidth: 400, width: "100%" }}>
        <p style={{ margin: "0 0 24px", color: C.text, fontSize: 15, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ background: "none", border: `1px solid ${C.bdr}`, color: C.textMid, borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ background: danger ? "rgba(220,80,80,0.15)" : "rgba(162,137,89,0.15)", border: `1px solid ${danger ? "rgba(220,80,80,0.5)" : GOLD}`, color: danger ? "#e07070" : GOLD, borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            {danger ? "Delete" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Email Compose Modal ─────────────────────────────────────────────────────
function EmailModal({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const C = useAgentColors();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    if (!subject.trim() || !body.trim()) { setError("Subject and message are required."); return; }
    setSending(true); setError("");
    try {
      const res = await adminFetch(`/admin/agents/${agent.id}/email`, {
        method: "POST",
        body: JSON.stringify({ subject, body }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError((j as any).error || "Failed to send");
      } else {
        setSent(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: C.inputBg, border: `1px solid ${C.bdr}`,
    borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{ background: C.card, border: `1px solid ${C.bdr}`, borderRadius: 14, padding: 28, maxWidth: 520, width: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <p style={{ margin: 0, color: GOLD, fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", gap: 7 }}><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 15, height: 15, flexShrink: 0 }}><rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M1 6l7 4 7-4" strokeLinecap="round"/></svg>Send Email</p>
            <p style={{ margin: "4px 0 0", color: C.textMid, fontSize: 13 }}>
              To: <strong style={{ color: C.text }}>{agent.email || "—"}</strong> ({agent.companyName})
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMid, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {sent ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ margin: "0 0 12px", display: "flex", justifyContent: "center" }}><svg viewBox="0 0 48 48" fill="none" stroke="#c4a96e" strokeWidth="2.5" style={{ width: 48, height: 48 }}><circle cx="24" cy="24" r="20"/><path d="M15 24l6 6 12-12" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
            <p style={{ color: "#c4a96e", fontWeight: 600, margin: "0 0 4px" }}>Email sent successfully!</p>
            <p style={{ color: C.textMid, fontSize: 13, margin: "0 0 20px" }}>Your message has been delivered to {agent.email}.</p>
            <button onClick={onClose} style={{ background: "rgba(162,137,89,0.12)", border: `1px solid ${C.bdr}`, color: GOLD, borderRadius: 8, padding: "8px 24px", cursor: "pointer", fontSize: 13 }}>
              Close
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: C.textMid, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Subject</label>
              <input style={inputStyle} type="text" placeholder="e.g. Your Agent Application Status" value={subject} onChange={e => setSubject(e.target.value)} autoFocus />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: C.textMid, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Message</label>
              <textarea
                style={{ ...inputStyle, resize: "vertical", minHeight: 160 }}
                placeholder="Write your message here…"
                value={body}
                onChange={e => setBody(e.target.value)}
              />
            </div>
            {error && <p style={{ margin: 0, color: "#e07070", fontSize: 13 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
              <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.bdr}`, color: C.textMid, borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontSize: 13 }}>
                Cancel
              </button>
              <button
                onClick={send}
                disabled={sending}
                style={{ background: sending ? "rgba(162,137,89,0.3)" : GOLD, color: "#071a10", border: "none", borderRadius: 8, padding: "9px 24px", cursor: sending ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700 }}
              >
                {sending ? "Sending…" : "Send Email"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: "rgba(162,137,89,0.15)", color: GOLD, label: "Pending" },
    approved: { bg: "rgba(34,160,80,0.15)", color: "#c4a96e", label: "Approved" },
    rejected: { bg: "rgba(220,50,50,0.15)", color: "#e07070", label: "Rejected" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}40`, borderRadius: 20, padding: "2px 12px", fontSize: 12, fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

// ── Agent Card ──────────────────────────────────────────────────────────────
function AgentCard({
  agent, selected, onSelect, onStatusChange, onDelete, onEmail,
}: {
  agent: Agent;
  selected: boolean;
  onSelect: (id: number, checked: boolean) => void;
  onStatusChange: () => void;
  onDelete: (agent: Agent) => void;
  onEmail: (agent: Agent) => void;
}) {
  const C = useAgentColors();
  const [open, setOpen] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [updating, setUpdating] = useState(false);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    try {
      await adminFetch(`/admin/agents/${agent.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      onStatusChange();
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{
      background: selected ? "rgba(162,137,89,0.06)" : C.card,
      border: `1px solid ${selected ? "rgba(162,137,89,0.45)" : C.bdr}`,
      borderRadius: 12, overflow: "hidden", marginBottom: 10,
      transition: "border-color 0.15s, background 0.15s",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", gap: 12 }}>
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={e => { e.stopPropagation(); onSelect(agent.id, e.target.checked); }}
          style={{ width: 16, height: 16, accentColor: GOLD, cursor: "pointer", flexShrink: 0 }}
        />

        {/* Expand button */}
        <button
          onClick={() => setOpen(v => !v)}
          style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", padding: 0, minWidth: 0 }}
        >
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(162,137,89,0.1)", border: `1px solid ${C.bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#a28959" }}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 18, height: 18 }}><rect x="2" y="3" width="16" height="15" rx="1.5"/><path d="M7 18V12h6v6"/><path d="M6 7h2M12 7h2M6 10h2M12 10h2"/></svg>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{agent.companyName}</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {agent.contactName}{agent.email ? ` · ${agent.email}` : ""}
            </p>
          </div>
        </button>

        {/* Badges + quick actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {agent.agentCode && (
            <span style={{ background: "rgba(162,137,89,0.18)", border: "1px solid rgba(162,137,89,0.5)", borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 700, color: GOLD, fontFamily: "monospace", letterSpacing: "0.06em" }}>
              {agent.agentCode}
            </span>
          )}
          <StatusBadge status={agent.status} />
          {/* Email quick action */}
          {agent.email && (
            <button
              title={`Email ${agent.email}`}
              onClick={e => { e.stopPropagation(); onEmail(agent); }}
              style={{ background: "rgba(162,137,89,0.08)", border: `1px solid ${C.bdr}`, borderRadius: 7, padding: "5px 10px", color: GOLD, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M1 6l7 4 7-4" strokeLinecap="round"/></svg>
            </button>
          )}
          {/* Delete quick action */}
          <button
            title="Delete agent"
            onClick={e => { e.stopPropagation(); onDelete(agent); }}
            style={{ background: "rgba(220,80,80,0.08)", border: "1px solid rgba(220,80,80,0.25)", borderRadius: 7, padding: "5px 10px", color: "#e07070", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><path d="M3 5h10M6 5V3h4v2M13 5l-1 8H4L3 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span
            onClick={() => setOpen(v => !v)}
            style={{ color: GOLD, fontSize: 18, cursor: "pointer", display: "inline-block", transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "rotate(0deg)", userSelect: "none" }}
          >
            ›
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {open && (
        <div style={{ borderTop: `1px solid ${C.bdr}`, padding: "18px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14, marginBottom: 18 }}>
            <Field label="Company Name" value={agent.companyName} />
            <Field label="Contact Name" value={agent.contactName} />
            <Field label="Office Address" value={agent.officeAddress} />
            <Field label="Email Address" value={agent.email || "—"} />
            <Field label="Contact Number" value={`${agent.contactNumber}${agent.whatsappAvailable === "yes" ? " · WhatsApp ✓" : ""}`} />
            <Field label="Username" value={`@${agent.username}`} mono />
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 11, color: C.textMid, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Password</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "monospace", fontSize: 14, color: C.text }}>
                  {showPass ? (agent.plainPassword ?? "—") : "••••••••"}
                </span>
                <button onClick={() => setShowPass(v => !v)} style={{ background: "none", border: `1px solid ${C.bdr}`, borderRadius: 5, color: GOLD, fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>
                  {showPass ? "Hide" : "Reveal"}
                </button>
              </div>
            </div>
            <Field label="Submitted" value={new Date(agent.createdAt).toLocaleString()} />
          </div>

          {/* Documents */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
            {agent.businessRegUrl ? (
              <a href={fileDownloadUrl(agent.businessRegUrl)} target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(162,137,89,0.08)", border: `1px solid ${C.bdr}`, borderRadius: 8, padding: "7px 14px", color: GOLD, fontSize: 13, textDecoration: "none" }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14, flexShrink: 0 }}><path d="M10.5 2.5a2.5 2.5 0 013.54 3.54L5.5 14.55a3.5 3.5 0 01-4.95-4.95L9 1.1" strokeLinecap="round"/></svg>
                {agent.businessRegName || "Business Registration"}
              </a>
            ) : <span style={{ color: C.textFaint, fontSize: 13 }}>No business registration attached</span>}
            {agent.idDocUrl ? (
              <a href={fileDownloadUrl(agent.idDocUrl)} target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(162,137,89,0.08)", border: `1px solid ${C.bdr}`, borderRadius: 8, padding: "7px 14px", color: GOLD, fontSize: 13, textDecoration: "none" }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14, flexShrink: 0 }}><rect x="1" y="3" width="14" height="10" rx="1.5"/><circle cx="5.5" cy="7" r="1.5"/><path d="M9 7h4M9 10h2"/></svg>
                {agent.idDocName || "ID / Passport"}
              </a>
            ) : <span style={{ color: C.textFaint, fontSize: 13 }}>No ID document attached</span>}
          </div>

          {/* Status controls + Email + Delete */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {agent.status !== "approved" && (
              <button onClick={() => updateStatus("approved")} disabled={updating}
                style={{ background: "rgba(34,160,80,0.15)", border: "1px solid rgba(34,160,80,0.4)", color: "#c4a96e", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 14, height: 14, flexShrink: 0 }}><path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>Approve
              </button>
            )}
            {agent.status !== "rejected" && (
              <button onClick={() => updateStatus("rejected")} disabled={updating}
                style={{ background: "rgba(220,50,50,0.1)", border: "1px solid rgba(220,50,50,0.35)", color: "#e07070", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 14, height: 14, flexShrink: 0 }}><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round"/></svg>Reject
              </button>
            )}
            {agent.status !== "pending" && (
              <button onClick={() => updateStatus("pending")} disabled={updating}
                style={{ background: "rgba(162,137,89,0.1)", border: `1px solid ${C.bdr}`, color: GOLD, borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Reset to Pending
              </button>
            )}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              {agent.email && (
                <button onClick={() => onEmail(agent)}
                  style={{ background: "rgba(162,137,89,0.1)", border: `1px solid ${C.bdr}`, color: GOLD, borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14, flexShrink: 0 }}><rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M1 6l7 4 7-4" strokeLinecap="round"/></svg>Send Email
                </button>
              )}
              <button onClick={() => onDelete(agent)}
                style={{ background: "rgba(220,80,80,0.1)", border: "1px solid rgba(220,80,80,0.3)", color: "#e07070", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14, flexShrink: 0 }}><path d="M3 5h10M6 5V3h4v2M13 5l-1 8H4L3 5" strokeLinecap="round" strokeLinejoin="round"/></svg>Delete Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const C = useAgentColors();
  return (
    <div>
      <p style={{ margin: "0 0 4px", fontSize: 11, color: C.textMid, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, color: C.text, fontFamily: mono ? "monospace" : undefined, wordBreak: "break-all" }}>{value || "—"}</p>
    </div>
  );
}

// ── Add Agent Modal ──────────────────────────────────────────────────────────
function AddAgentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const C = useAgentColors();
  const [form, setForm] = useState({
    companyName: "", contactName: "", email: "", contactNumber: "",
    officeAddress: "", username: "", password: "", whatsappAvailable: "no", autoApprove: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    const { companyName, contactName, contactNumber, officeAddress, username, password } = form;
    if (!companyName || !contactName || !contactNumber || !officeAddress || !username || !password) {
      setError("Please fill in all required fields."); return;
    }
    setSaving(true); setError("");
    try {
      const res = await adminFetch("/admin/agents", {
        method: "POST",
        body: JSON.stringify({ ...form }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError((j as any).error || "Failed to create agent");
      } else {
        onCreated();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: C.inputBg, border: `1px solid ${C.bdr}`,
    borderRadius: 8, padding: "9px 13px", color: C.text, fontSize: 13.5, outline: "none",
    boxSizing: "border-box",
  };
  const label = (txt: string, required = false) => (
    <label style={{ display: "block", fontSize: 11, color: C.textMid, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {txt}{required && <span style={{ color: "#e07070" }}> *</span>}
    </label>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: C.card, border: `1px solid ${C.bdr}`, borderRadius: 16,
        width: "100%", maxWidth: 560, maxHeight: "90vh", display: "flex", flexDirection: "column",
        overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.bdrFaint}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: 0, color: GOLD, fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 15, height: 15 }}><path d="M8 2v4M8 10v4M2 8h4M10 8h4" strokeLinecap="round"/><circle cx="8" cy="8" r="6"/></svg>
              Add New Agent
            </p>
            <p style={{ margin: "3px 0 0", color: C.textMid, fontSize: 12 }}>Create an agent account directly from the admin panel</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMid, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: "1 1 auto", overflowY: "auto", padding: "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px" }}>
            {/* Company Name */}
            <div style={{ gridColumn: "1 / -1" }}>
              {label("Company / Agency Name", true)}
              <input style={inputStyle} value={form.companyName} onChange={e => set("companyName", e.target.value)} placeholder="e.g. Global Education Partners Ltd." />
            </div>

            {/* Contact Name */}
            <div>
              {label("Contact Person", true)}
              <input style={inputStyle} value={form.contactName} onChange={e => set("contactName", e.target.value)} placeholder="Full name" />
            </div>

            {/* Email */}
            <div>
              {label("Email Address")}
              <input style={inputStyle} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="agent@example.com" />
            </div>

            {/* Contact Number */}
            <div>
              {label("Contact Number", true)}
              <input style={inputStyle} value={form.contactNumber} onChange={e => set("contactNumber", e.target.value)} placeholder="+852 XXXX XXXX" />
            </div>

            {/* WhatsApp */}
            <div>
              {label("WhatsApp Available")}
              <select style={{ ...inputStyle, cursor: "pointer" }} value={form.whatsappAvailable} onChange={e => set("whatsappAvailable", e.target.value)}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>

            {/* Office Address */}
            <div style={{ gridColumn: "1 / -1" }}>
              {label("Office Address", true)}
              <input style={inputStyle} value={form.officeAddress} onChange={e => set("officeAddress", e.target.value)} placeholder="Full office address" />
            </div>

            {/* Divider */}
            <div style={{ gridColumn: "1 / -1", borderTop: `1px solid ${C.bdrFaint}`, margin: "2px 0" }} />
            <div style={{ gridColumn: "1 / -1" }}>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: C.textMid, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Login Credentials</p>
            </div>

            {/* Username */}
            <div>
              {label("Username", true)}
              <input style={inputStyle} value={form.username} onChange={e => set("username", e.target.value.toLowerCase().replace(/\s/g, ""))} placeholder="e.g. globaleduhk" autoComplete="off" />
            </div>

            {/* Password */}
            <div>
              {label("Password", true)}
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...inputStyle, paddingRight: 64 }}
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={e => set("password", e.target.value)}
                  placeholder="Set a password"
                  autoComplete="new-password"
                />
                <button
                  onClick={() => setShowPass(v => !v)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: GOLD, fontSize: 11, cursor: "pointer", padding: "2px 6px", fontWeight: 600 }}
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div style={{ gridColumn: "1 / -1", borderTop: `1px solid ${C.bdrFaint}`, margin: "2px 0" }} />

            {/* Auto-approve toggle */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                <div
                  onClick={() => set("autoApprove", !form.autoApprove)}
                  style={{
                    width: 40, height: 22, borderRadius: 11, flexShrink: 0,
                    background: form.autoApprove ? GOLD : C.bdr,
                    position: "relative", transition: "background 0.2s", cursor: "pointer",
                  }}
                >
                  <div style={{
                    position: "absolute", top: 3, left: form.autoApprove ? 21 : 3,
                    width: 16, height: 16, borderRadius: "50%",
                    background: form.autoApprove ? "#0b2213" : "#fff",
                    transition: "left 0.2s",
                  }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13.5, color: C.text, fontWeight: 600 }}>Approve immediately &amp; assign agent code</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textMid }}>Agent will be active right away with an auto-generated HGT-XXX code</p>
                </div>
              </label>
            </div>
          </div>

          {error && <p style={{ margin: "14px 0 0", color: "#e07070", fontSize: 13 }}>{error}</p>}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.bdrFaint}`, flexShrink: 0, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.bdr}`, color: C.textMid, borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontSize: 13 }}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            style={{ background: saving ? "rgba(162,137,89,0.4)" : GOLD, color: "#071a10", border: "none", borderRadius: 8, padding: "9px 24px", cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700 }}
          >
            {saving ? "Creating…" : "Create Agent"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AgentsPage() {
  const C = useAgentColors();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Confirm dialog state
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  // Email modal state
  const [emailTarget, setEmailTarget] = useState<Agent | null>(null);
  // Add agent modal
  const [showAddModal, setShowAddModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/admin/agents");
      if (res.ok) setAgents(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  // Clear selection when filter changes
  useEffect(() => { setSelected(new Set()); }, [filter]);

  const filtered = filter === "all" ? agents : agents.filter(a => a.status === filter);
  const counts = {
    all: agents.length,
    pending: agents.filter(a => a.status === "pending").length,
    approved: agents.filter(a => a.status === "approved").length,
    rejected: agents.filter(a => a.status === "rejected").length,
  };

  const handleSelect = (id: number, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(a => selected.has(a.id));
  const someSelected = selected.size > 0;

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => { const next = new Set(prev); filtered.forEach(a => next.delete(a.id)); return next; });
    } else {
      setSelected(prev => { const next = new Set(prev); filtered.forEach(a => next.add(a.id)); return next; });
    }
  };

  const deleteAgent = (agent: Agent) => {
    setConfirm({
      message: `Delete "${agent.companyName}" (${agent.contactName})? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(null);
        await adminFetch(`/admin/agents/${agent.id}`, { method: "DELETE" });
        setSelected(prev => { const n = new Set(prev); n.delete(agent.id); return n; });
        load();
      },
    });
  };

  const deleteSelected = () => {
    const ids = Array.from(selected);
    setConfirm({
      message: `Delete ${ids.length} selected agent${ids.length > 1 ? "s" : ""}? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(null);
        await adminFetch("/admin/agents", { method: "DELETE", body: JSON.stringify({ ids }) });
        setSelected(new Set());
        load();
      },
    });
  };

  return (
    <div style={{ padding: "2rem 2rem", maxWidth: 1400, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
      {/* Confirm Dialog */}
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
          danger
        />
      )}

      {/* Email Modal */}
      {emailTarget && (
        <EmailModal agent={emailTarget} onClose={() => setEmailTarget(null)} />
      )}

      {/* Add Agent Modal */}
      {showAddModal && (
        <AddAgentModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); load(); }}
        />
      )}

      {/* Title */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ color: GOLD, fontSize: 26, fontWeight: 700, margin: "0 0 6px", fontFamily: "Georgia, serif" }}>
            Agents
          </h1>
          <p style={{ color: C.textMid, fontSize: 14, margin: 0 }}>
            {agents.length} agent{agents.length !== 1 ? "s" : ""} registered · {counts.pending} pending review
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: GOLD, color: "#071a10", border: "none",
            borderRadius: 10, padding: "10px 20px",
            fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
            <path d="M8 3v10M3 8h10" strokeLinecap="round"/>
          </svg>
          Add Agent
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {/* Filter tabs */}
        {(["all", "pending", "approved", "rejected"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? "rgba(162,137,89,0.15)" : "transparent",
              border: `1px solid ${filter === f ? GOLD : C.bdr}`,
              borderRadius: 20, padding: "6px 14px",
              color: filter === f ? GOLD : C.textMid,
              fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
            }}
          >
            {f} <span style={{ opacity: 0.7 }}>({counts[f]})</span>
          </button>
        ))}

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {/* Bulk delete */}
          {someSelected && (
            <button
              onClick={deleteSelected}
              style={{ background: "rgba(220,80,80,0.12)", border: "1px solid rgba(220,80,80,0.4)", color: "#e07070", borderRadius: 20, padding: "6px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14, flexShrink: 0 }}><path d="M3 5h10M6 5V3h4v2M13 5l-1 8H4L3 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Delete {selected.size} selected
            </button>
          )}
          <button
            onClick={load}
            style={{ background: "none", border: `1px solid ${C.bdr}`, borderRadius: 20, padding: "6px 14px", color: C.textMid, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 13, height: 13, flexShrink: 0 }}><path d="M14 8A6 6 0 112 8" strokeLinecap="round"/><path d="M14 4v4h-4" strokeLinecap="round" strokeLinejoin="round"/></svg>Refresh
          </button>
        </div>
      </div>

      {/* Select-all bar (shown when there are results) */}
      {filtered.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "6px 16px", background: C.subtleBg, borderRadius: 8, border: `1px solid ${C.bdrFaint}` }}>
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={toggleSelectAll}
            style={{ width: 15, height: 15, accentColor: GOLD, cursor: "pointer" }}
          />
          <span style={{ fontSize: 12, color: C.textMid }}>
            {allFilteredSelected ? "Deselect all" : `Select all ${filtered.length} ${filter === "all" ? "agents" : filter}`}
          </span>
          {someSelected && (
            <span style={{ fontSize: 12, color: GOLD, marginLeft: 4 }}>
              · {selected.size} selected
            </span>
          )}
        </div>
      )}

      {/* Agent list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: C.textMid, fontSize: 14 }}>Loading agents…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: C.textFaint, fontSize: 14 }}>
          {agents.length === 0 ? "No agent applications yet." : `No ${filter} applications.`}
        </div>
      ) : (
        filtered.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            selected={selected.has(agent.id)}
            onSelect={handleSelect}
            onStatusChange={load}
            onDelete={deleteAgent}
            onEmail={a => setEmailTarget(a)}
          />
        ))
      )}
    </div>
  );
}
