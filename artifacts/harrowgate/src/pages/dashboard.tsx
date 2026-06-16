import { useGetDashboardStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Users, FileText, Printer, CheckCircle, Clock, AlertCircle, Shield, UserCog, Briefcase } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

const STATUS_LABELS: Record<string, { label: string }> = {
  draft:               { label: "Draft" },
  documents_uploaded:  { label: "Docs Uploaded" },
  ai_processing:       { label: "AI Processing" },
  ai_processed:        { label: "AI Processed" },
  ready_to_print:      { label: "Ready to Print" },
  submitted:           { label: "Submitted" },
};

const ACTION_LABELS: Record<string, { label: string }> = {
  pending:                   { label: "New submission" },
  payment_received:          { label: "Payment receipt uploaded — confirm deposit" },
  second_payment_received:   { label: "2nd payment receipt — confirm" },
  final_payment_received:    { label: "Final payment receipt — confirm" },
};

function getStatusStyle(status: string, isDark: boolean): React.CSSProperties {
  const dark: Record<string, React.CSSProperties> = {
    draft:              { background: "rgba(162,137,89,0.10)", color: "rgba(162,137,89,0.70)" },
    documents_uploaded: { background: "rgba(96,165,250,0.12)", color: "rgba(147,197,253,0.85)" },
    ai_processing:      { background: "rgba(251,191,36,0.12)", color: "rgba(252,211,77,0.85)" },
    ai_processed:       { background: "rgba(167,139,250,0.12)", color: "rgba(196,181,253,0.85)" },
    ready_to_print:     { background: "rgba(52,211,153,0.12)", color: "rgba(110,231,183,0.85)" },
    submitted:          { background: "rgba(148,163,184,0.10)", color: "rgba(203,213,225,0.70)" },
  };
  const light: Record<string, React.CSSProperties> = {
    draft:              { background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.50)" },
    documents_uploaded: { background: "#dbeafe", color: "#1d4ed8" },
    ai_processing:      { background: "#fef9c3", color: "#854d0e" },
    ai_processed:       { background: "#f3e8ff", color: "#6b21a8" },
    ready_to_print:     { background: "#dcfce7", color: "#166534" },
    submitted:          { background: "#f1f5f9", color: "#475569" },
  };
  const map = isDark ? dark : light;
  return map[status] ?? (isDark
    ? { background: "rgba(162,137,89,0.08)", color: "rgba(162,137,89,0.65)" }
    : { background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.45)" });
}

function getActionStyle(status: string, isDark: boolean): React.CSSProperties {
  const dark: Record<string, React.CSSProperties> = {
    pending:                 { background: "rgba(96,165,250,0.12)", color: "rgba(147,197,253,0.85)" },
    payment_received:        { background: "rgba(251,191,36,0.12)", color: "rgba(252,211,77,0.85)" },
    second_payment_received: { background: "rgba(251,191,36,0.12)", color: "rgba(252,211,77,0.85)" },
    final_payment_received:  { background: "rgba(251,146,60,0.12)", color: "rgba(253,186,116,0.85)" },
  };
  const light: Record<string, React.CSSProperties> = {
    pending:                 { background: "#dbeafe", color: "#1d4ed8" },
    payment_received:        { background: "#fef3c7", color: "#92400e" },
    second_payment_received: { background: "#fef3c7", color: "#92400e" },
    final_payment_received:  { background: "#ffedd5", color: "#9a3412" },
  };
  const map = isDark ? dark : light;
  return map[status] ?? (isDark
    ? { background: "rgba(162,137,89,0.08)", color: "rgba(162,137,89,0.65)" }
    : { background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.45)" });
}

const APP_TYPE_LABELS: Record<string, string> = {
  student_visa: "Student Visa",
  pr_pathway: "PR Pathway",
  university_admission: "University Admission",
};

type ActionItem = {
  id: number;
  name: string;
  email: string | null;
  passportNumber: string;
  status: string;
  createdAt: string;
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type SessionRecord = {
  id: string;
  role: string;
  name: string;
  ip: string;
  loginAt: number;
  lastSeen: number;
};

function useLiveSessions() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) { setLoading(false); return; }
    function fetchSessions() {
      fetch(`${window.location.origin}${BASE}/api/admin/active-sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : [])
        .then(d => { setSessions(Array.isArray(d) ? d : []); setLoading(false); })
        .catch(() => setLoading(false));
    }
    fetchSessions();
    ref.current = setInterval(fetchSessions, 15_000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);

  return { sessions, loading };
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function RoleBadge({ role }: { role: string }) {
  const cfg =
    role === "admin"   ? { label: "Admin",   icon: Shield,   color: "#f0d28c", bg: "rgba(240,210,140,0.12)", border: "rgba(240,210,140,0.25)" } :
    role === "manager" ? { label: "Manager", icon: UserCog,  color: "#c4a96e", bg: "rgba(196,169,110,0.12)", border: "rgba(196,169,110,0.25)" } :
                         { label: "Staff",   icon: Briefcase,color: "#86a878", bg: "rgba(134,168,120,0.12)", border: "rgba(134,168,120,0.25)" };
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function LiveSessionsPanel({ isDark }: { isDark: boolean }) {
  const { sessions, loading } = useLiveSessions();
  const [expanded, setExpanded] = useState(false);
  const role = localStorage.getItem("admin_role") ?? "";
  if (role !== "admin") return null;

  const admins   = sessions.filter(s => s.role === "admin").length;
  const managers = sessions.filter(s => s.role === "manager").length;
  const staff    = sessions.filter(s => s.role === "staff").length;
  const total    = sessions.length;

  const CARD_BG = isDark ? "rgba(240,210,140,0.04)" : "rgba(15,45,24,0.04)";
  const BORDER  = isDark ? "rgba(240,210,140,0.12)" : "rgba(15,45,24,0.10)";
  const PULSE   = total > 0 ? "#4ade80" : "rgba(162,137,89,0.35)";

  return (
    <div className="rounded-xl border mb-8" style={{ background: CARD_BG, borderColor: BORDER }}>
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-5 py-4"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            {total > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: PULSE }} />}
            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: PULSE }} />
          </span>
          <span className="font-semibold text-sm tracking-wide uppercase"
            style={{ color: isDark ? "rgba(240,210,140,0.80)" : "#0f2d18" }}>
            Live Sessions
          </span>
          {!loading && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: isDark ? "rgba(74,222,128,0.12)" : "rgba(15,45,24,0.08)", color: isDark ? "#4ade80" : "#0f2d18" }}>
              {total} online
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Role counters */}
          {[
            { label: "Admin", count: admins, icon: Shield, color: "#f0d28c" },
            { label: "Manager", count: managers, icon: UserCog, color: "#c4a96e" },
            { label: "Staff", count: staff, icon: Briefcase, color: "#86a878" },
          ].map(({ label, count, icon: Icon, color }) => (
            <div key={label} className="hidden sm:flex items-center gap-1.5">
              <Icon size={13} style={{ color }} />
              <span className="text-xs font-bold" style={{ color }}>{count}</span>
              <span className="text-xs" style={{ color: isDark ? "rgba(162,137,89,0.45)" : "rgba(15,45,24,0.45)" }}>{label}</span>
            </div>
          ))}
          <span className="text-xs" style={{ color: isDark ? "rgba(162,137,89,0.40)" : "rgba(15,45,24,0.35)" }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {/* Expanded list */}
      {expanded && (
        <div className="border-t" style={{ borderColor: BORDER }}>
          {loading ? (
            <div className="py-8 text-center text-xs" style={{ color: "rgba(162,137,89,0.45)" }}>Loading sessions…</div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-xs" style={{ color: "rgba(162,137,89,0.40)" }}>No active sessions right now.</div>
          ) : (
            <div className="divide-y" style={{ borderColor: BORDER }}>
              {sessions.map(s => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{ background: isDark ? "rgba(162,137,89,0.10)" : "rgba(15,45,24,0.08)", color: isDark ? "#c4a96e" : "#0f2d18" }}>
                      {(s.name?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: isDark ? "rgba(240,210,140,0.85)" : "#0f2d18" }}>{s.name}</p>
                      <p className="text-xs truncate" style={{ color: "rgba(162,137,89,0.50)" }}>
                        {s.ip !== "unknown" ? s.ip : "—"} · signed in {timeAgo(s.loginAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <RoleBadge role={s.role} />
                    <span className="text-[11px]" style={{ color: "rgba(162,137,89,0.45)" }}>
                      seen {timeAgo(s.lastSeen)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function useActionNeeded() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) { setLoading(false); return; }
    fetch(`${window.location.origin}${BASE}/api/admin/action-needed`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return { items, loading };
}

export default function Dashboard() {
  const { isDark } = useAdminTheme();
  const { data: stats, isLoading } = useGetDashboardStats();
  const { items: actionItems, loading: actionLoading } = useActionNeeded();

  const iconColor = isDark ? "rgba(162,137,89,0.65)" : "rgba(0,0,0,0.45)";

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Clients",   value: stats?.totalClients ?? 0,      icon: Users },
    { label: "Applications",    value: stats?.totalApplications ?? 0,  icon: FileText },
    { label: "Pending Review",  value: stats?.pendingReview ?? 0,      icon: Clock },
    { label: "Ready to Print",  value: stats?.readyToPrint ?? 0,       icon: Printer },
    { label: "Submitted",       value: stats?.submitted ?? 0,          icon: CheckCircle },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of all client applications and status</p>
      </div>

      {/* Live Sessions — admin only */}
      <LiveSessionsPanel isDark={isDark} />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card border border-card-border rounded-lg p-4" data-testid={`stat-${label.toLowerCase().replace(/ /g, "-")}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
              <Icon size={14} style={{ color: iconColor }} />
            </div>
            <p className="text-3xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Action Needed */}
      <div className="bg-card border border-card-border rounded-lg mb-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} style={{ color: isDark ? "rgba(251,191,36,0.80)" : "#d97706" }} />
            <h2 className="font-semibold text-foreground text-sm tracking-wide uppercase">Action Needed</h2>
            {!actionLoading && actionItems.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                style={{ background: isDark ? "rgba(251,191,36,0.20)" : "#fbbf24", color: isDark ? "rgba(252,211,77,0.90)" : "#1c1917" }}>
                {actionItems.length}
              </span>
            )}
          </div>
          <Link href="/admin/submissions" className="text-primary text-xs font-medium hover:underline">
            View all submissions
          </Link>
        </div>
        {actionLoading ? (
          <div className="divide-y divide-border">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex gap-4">
                <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : !actionItems.length ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            No submissions require action right now.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {actionItems.map(item => {
              const label = ACTION_LABELS[item.status]?.label ?? item.status;
              return (
                <Link
                  key={item.id}
                  href="/admin/submissions"
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-accent transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.email ?? item.passportNumber}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={getActionStyle(item.status, isDark)}>
                      {label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Applications */}
      <div className="bg-card border border-card-border rounded-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground text-sm tracking-wide uppercase">Recent Applications</h2>
          <Link href="/admin/applications" className="text-primary text-xs font-medium hover:underline" data-testid="link-all-applications">
            View all
          </Link>
        </div>
        {!stats?.recentApplications?.length ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No applications yet. <Link href="/admin/applications/new" className="text-primary hover:underline">Start one</Link>.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {stats.recentApplications.map(app => (
              <Link
                key={app.id}
                href={`/admin/applications/${app.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-accent transition-colors"
                data-testid={`row-application-${app.id}`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{app.clientName ?? "Unknown Client"}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {app.applicationType ? APP_TYPE_LABELS[app.applicationType] || app.applicationType : "No type set"}
                    {app.targetUniversity ? ` — ${app.targetUniversity}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <span className="text-xs text-muted-foreground">{app.documentCount ?? 0} docs</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={getStatusStyle(app.status, isDark)}>
                    {STATUS_LABELS[app.status]?.label ?? app.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
