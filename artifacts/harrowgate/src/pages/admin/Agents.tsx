import { useState, useEffect, useCallback } from "react";

const GOLD = "#a28959";
const CARD = "#0c2217";
const BORDER = "rgba(162,137,89,0.2)";

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
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{ background: "#0c2217", border: `1px solid ${danger ? "rgba(220,80,80,0.4)" : BORDER}`, borderRadius: 14, padding: 28, maxWidth: 400, width: "100%" }}>
        <p style={{ margin: "0 0 24px", color: "#e8dcc8", fontSize: 15, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ background: "none", border: `1px solid ${BORDER}`, color: "#9a8a6a", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>
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
    width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`,
    borderRadius: 8, padding: "10px 14px", color: "#e8dcc8", fontSize: 14, outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{ background: "#0c2217", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 28, maxWidth: 520, width: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <p style={{ margin: 0, color: GOLD, fontWeight: 700, fontSize: 16 }}>✉ Send Email</p>
            <p style={{ margin: "4px 0 0", color: "#9a8a6a", fontSize: 13 }}>
              To: <strong style={{ color: "#c9b99a" }}>{agent.email || "—"}</strong> ({agent.companyName})
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9a8a6a", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {sent ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p style={{ fontSize: 32, margin: "0 0 12px" }}>✅</p>
            <p style={{ color: "#4caf7d", fontWeight: 600, margin: "0 0 4px" }}>Email sent successfully!</p>
            <p style={{ color: "#9a8a6a", fontSize: 13, margin: "0 0 20px" }}>Your message has been delivered to {agent.email}.</p>
            <button onClick={onClose} style={{ background: "rgba(162,137,89,0.12)", border: `1px solid ${BORDER}`, color: GOLD, borderRadius: 8, padding: "8px 24px", cursor: "pointer", fontSize: 13 }}>
              Close
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#9a8a6a", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Subject</label>
              <input style={inputStyle} type="text" placeholder="e.g. Your Agent Application Status" value={subject} onChange={e => setSubject(e.target.value)} autoFocus />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#9a8a6a", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Message</label>
              <textarea
                style={{ ...inputStyle, resize: "vertical", minHeight: 160 }}
                placeholder="Write your message here…"
                value={body}
                onChange={e => setBody(e.target.value)}
              />
            </div>
            {error && <p style={{ margin: 0, color: "#e07070", fontSize: 13 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
              <button onClick={onClose} style={{ background: "none", border: `1px solid ${BORDER}`, color: "#9a8a6a", borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontSize: 13 }}>
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
    approved: { bg: "rgba(34,160,80,0.15)", color: "#4caf7d", label: "Approved" },
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
      background: selected ? "rgba(162,137,89,0.06)" : CARD,
      border: `1px solid ${selected ? "rgba(162,137,89,0.45)" : BORDER}`,
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
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(162,137,89,0.1)", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
            🏢
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#e8dcc8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{agent.companyName}</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9a8a6a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
              style={{ background: "rgba(162,137,89,0.08)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "5px 10px", color: GOLD, fontSize: 13, cursor: "pointer" }}
            >
              ✉
            </button>
          )}
          {/* Delete quick action */}
          <button
            title="Delete agent"
            onClick={e => { e.stopPropagation(); onDelete(agent); }}
            style={{ background: "rgba(220,80,80,0.08)", border: "1px solid rgba(220,80,80,0.25)", borderRadius: 7, padding: "5px 10px", color: "#e07070", fontSize: 13, cursor: "pointer" }}
          >
            🗑
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
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: "18px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14, marginBottom: 18 }}>
            <Field label="Company Name" value={agent.companyName} />
            <Field label="Contact Name" value={agent.contactName} />
            <Field label="Office Address" value={agent.officeAddress} />
            <Field label="Email Address" value={agent.email || "—"} />
            <Field label="Contact Number" value={`${agent.contactNumber}${agent.whatsappAvailable === "yes" ? " · WhatsApp ✓" : ""}`} />
            <Field label="Username" value={`@${agent.username}`} mono />
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 11, color: "#9a8a6a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Password</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "monospace", fontSize: 14, color: "#e8dcc8" }}>
                  {showPass ? (agent.plainPassword ?? "—") : "••••••••"}
                </span>
                <button onClick={() => setShowPass(v => !v)} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 5, color: GOLD, fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>
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
                style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(162,137,89,0.08)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "7px 14px", color: GOLD, fontSize: 13, textDecoration: "none" }}>
                📎 {agent.businessRegName || "Business Registration"}
              </a>
            ) : <span style={{ color: "#5a4a2a", fontSize: 13 }}>No business registration attached</span>}
            {agent.idDocUrl ? (
              <a href={fileDownloadUrl(agent.idDocUrl)} target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(162,137,89,0.08)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "7px 14px", color: GOLD, fontSize: 13, textDecoration: "none" }}>
                🪪 {agent.idDocName || "ID / Passport"}
              </a>
            ) : <span style={{ color: "#5a4a2a", fontSize: 13 }}>No ID document attached</span>}
          </div>

          {/* Status controls + Email + Delete */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {agent.status !== "approved" && (
              <button onClick={() => updateStatus("approved")} disabled={updating}
                style={{ background: "rgba(34,160,80,0.15)", border: "1px solid rgba(34,160,80,0.4)", color: "#4caf7d", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                ✓ Approve
              </button>
            )}
            {agent.status !== "rejected" && (
              <button onClick={() => updateStatus("rejected")} disabled={updating}
                style={{ background: "rgba(220,50,50,0.1)", border: "1px solid rgba(220,50,50,0.35)", color: "#e07070", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                ✗ Reject
              </button>
            )}
            {agent.status !== "pending" && (
              <button onClick={() => updateStatus("pending")} disabled={updating}
                style={{ background: "rgba(162,137,89,0.1)", border: `1px solid ${BORDER}`, color: GOLD, borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Reset to Pending
              </button>
            )}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              {agent.email && (
                <button onClick={() => onEmail(agent)}
                  style={{ background: "rgba(162,137,89,0.1)", border: `1px solid ${BORDER}`, color: GOLD, borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  ✉ Send Email
                </button>
              )}
              <button onClick={() => onDelete(agent)}
                style={{ background: "rgba(220,80,80,0.1)", border: "1px solid rgba(220,80,80,0.3)", color: "#e07070", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                🗑 Delete Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p style={{ margin: "0 0 4px", fontSize: 11, color: "#9a8a6a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, color: "#e8dcc8", fontFamily: mono ? "monospace" : undefined, wordBreak: "break-all" }}>{value || "—"}</p>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Confirm dialog state
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  // Email modal state
  const [emailTarget, setEmailTarget] = useState<Agent | null>(null);

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
    <div style={{ padding: "2rem", maxWidth: 920, margin: "0 auto" }}>
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

      {/* Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: GOLD, fontSize: 26, fontWeight: 700, margin: "0 0 6px", fontFamily: "Georgia, serif" }}>
          Agent Applications
        </h1>
        <p style={{ color: "#9a8a6a", fontSize: 14, margin: 0 }}>
          {agents.length} agent{agents.length !== 1 ? "s" : ""} registered · {counts.pending} pending review
        </p>
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
              border: `1px solid ${filter === f ? GOLD : BORDER}`,
              borderRadius: 20, padding: "6px 14px",
              color: filter === f ? GOLD : "#9a8a6a",
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
              🗑 Delete {selected.size} selected
            </button>
          )}
          <button
            onClick={load}
            style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 20, padding: "6px 14px", color: "#9a8a6a", fontSize: 13, cursor: "pointer" }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Select-all bar (shown when there are results) */}
      {filtered.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "6px 16px", background: "rgba(162,137,89,0.04)", borderRadius: 8, border: `1px solid ${BORDER}` }}>
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={toggleSelectAll}
            style={{ width: 15, height: 15, accentColor: GOLD, cursor: "pointer" }}
          />
          <span style={{ fontSize: 12, color: "#9a8a6a" }}>
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
        <div style={{ textAlign: "center", padding: "4rem", color: "#9a8a6a", fontSize: 14 }}>Loading agents…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#5a4a2a", fontSize: 14 }}>
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
