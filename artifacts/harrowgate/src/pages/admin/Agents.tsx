import { useState, useEffect, useCallback } from "react";

const GOLD = "#a28959";
const BG = "#071a10";
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
  const stripped = objectPath.replace(/^\/objects\//, "");
  return `${BASE}/api/storage/objects/${stripped}`;
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

function AgentCard({ agent, onStatusChange }: { agent: Agent; onStatusChange: () => void }) {
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
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
      {/* Header row */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          color: "#e8dcc8", textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(162,137,89,0.12)", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            🏢
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#e8dcc8" }}>{agent.companyName}</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#9a8a6a" }}>
              {agent.contactName} · @{agent.username}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {agent.agentCode && (
            <span style={{ background: "rgba(162,137,89,0.18)", border: `1px solid rgba(162,137,89,0.5)`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700, color: GOLD, fontFamily: "monospace", letterSpacing: "0.06em" }}>
              {agent.agentCode}
            </span>
          )}
          <StatusBadge status={agent.status} />
          <span style={{ color: GOLD, fontSize: 18, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
        </div>
      </button>

      {/* Expanded details */}
      {open && (
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, marginBottom: 20 }}>
            <Field label="Company Name" value={agent.companyName} />
            <Field label="Contact Name" value={agent.contactName} />
            <Field label="Office Address" value={agent.officeAddress} />
            <Field label="Email Address" value={agent.email || "—"} />
            <Field label="Contact Number" value={`${agent.contactNumber}${agent.whatsappAvailable === "yes" ? " (WhatsApp ✓)" : ""}`} />
            <Field label="Username" value={`@${agent.username}`} mono />
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "#9a8a6a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Password</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "monospace", fontSize: 14, color: "#e8dcc8", letterSpacing: "0.04em" }}>
                  {showPass ? (agent.plainPassword ?? "—") : "••••••••"}
                </span>
                <button
                  onClick={() => setShowPass(v => !v)}
                  style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, color: GOLD, fontSize: 11, padding: "2px 8px", cursor: "pointer" }}
                >
                  {showPass ? "Hide" : "Reveal"}
                </button>
              </div>
            </div>
            <Field label="Submitted" value={new Date(agent.createdAt).toLocaleString()} />
          </div>

          {/* Documents */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            {agent.businessRegUrl ? (
              <a
                href={fileDownloadUrl(agent.businessRegUrl)}
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(162,137,89,0.08)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 14px", color: GOLD, fontSize: 13, textDecoration: "none" }}
              >
                📎 {agent.businessRegName || "Business Registration"}
              </a>
            ) : (
              <span style={{ color: "#5a4a2a", fontSize: 13 }}>No business registration attached</span>
            )}
            {agent.idDocUrl ? (
              <a
                href={fileDownloadUrl(agent.idDocUrl)}
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(162,137,89,0.08)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 14px", color: GOLD, fontSize: 13, textDecoration: "none" }}
              >
                🪪 {agent.idDocName || "ID / Passport"}
              </a>
            ) : (
              <span style={{ color: "#5a4a2a", fontSize: 13 }}>No ID document attached</span>
            )}
          </div>

          {/* Status controls */}
          <div style={{ display: "flex", gap: 10 }}>
            {agent.status !== "approved" && (
              <button
                onClick={() => updateStatus("approved")}
                disabled={updating}
                style={{ background: "rgba(34,160,80,0.15)", border: "1px solid rgba(34,160,80,0.4)", color: "#4caf7d", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                ✓ Approve
              </button>
            )}
            {agent.status !== "rejected" && (
              <button
                onClick={() => updateStatus("rejected")}
                disabled={updating}
                style={{ background: "rgba(220,50,50,0.1)", border: "1px solid rgba(220,50,50,0.35)", color: "#e07070", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                ✗ Reject
              </button>
            )}
            {agent.status !== "pending" && (
              <button
                onClick={() => updateStatus("pending")}
                disabled={updating}
                style={{ background: "rgba(162,137,89,0.1)", border: `1px solid ${BORDER}`, color: GOLD, borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Reset to Pending
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p style={{ margin: "0 0 4px", fontSize: 12, color: "#9a8a6a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, color: "#e8dcc8", fontFamily: mono ? "monospace" : undefined }}>{value || "—"}</p>
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/admin/agents");
      if (res.ok) {
        setAgents(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "all" ? agents : agents.filter(a => a.status === filter);
  const counts = {
    all: agents.length,
    pending: agents.filter(a => a.status === "pending").length,
    approved: agents.filter(a => a.status === "approved").length,
    rejected: agents.filter(a => a.status === "rejected").length,
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      {/* Title */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: GOLD, fontSize: 26, fontWeight: 700, margin: "0 0 6px", fontFamily: "Georgia, serif" }}>
          Agent Applications
        </h1>
        <p style={{ color: "#9a8a6a", fontSize: 14, margin: 0 }}>
          {agents.length} agent{agents.length !== 1 ? "s" : ""} registered · {counts.pending} pending review
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {(["all", "pending", "approved", "rejected"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? "rgba(162,137,89,0.15)" : "transparent",
              border: `1px solid ${filter === f ? GOLD : BORDER}`,
              borderRadius: 20,
              padding: "6px 16px",
              color: filter === f ? GOLD : "#9a8a6a",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {f} <span style={{ opacity: 0.7 }}>({counts[f]})</span>
          </button>
        ))}
        <button
          onClick={load}
          style={{ marginLeft: "auto", background: "none", border: `1px solid ${BORDER}`, borderRadius: 20, padding: "6px 16px", color: "#9a8a6a", fontSize: 13, cursor: "pointer" }}
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#9a8a6a", fontSize: 14 }}>Loading agents…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#5a4a2a", fontSize: 14 }}>
          {agents.length === 0 ? "No agent applications yet." : `No ${filter} applications.`}
        </div>
      ) : (
        <div>
          {filtered.map(agent => (
            <AgentCard key={agent.id} agent={agent} onStatusChange={load} />
          ))}
        </div>
      )}
    </div>
  );
}
