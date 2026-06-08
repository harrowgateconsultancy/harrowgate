import { useGetDashboardStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Users, FileText, Printer, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
  documents_uploaded: { label: "Docs Uploaded", color: "bg-blue-100 text-blue-800" },
  ai_processing: { label: "AI Processing", color: "bg-yellow-100 text-yellow-800" },
  ai_processed: { label: "AI Processed", color: "bg-purple-100 text-purple-800" },
  ready_to_print: { label: "Ready to Print", color: "bg-green-100 text-green-800" },
  submitted: { label: "Submitted", color: "bg-slate-100 text-slate-700" },
};

const APP_TYPE_LABELS: Record<string, string> = {
  student_visa: "Student Visa",
  pr_pathway: "PR Pathway",
  university_admission: "University Admission",
};

const ACTION_LABELS: Record<string, { label: string; badge: string }> = {
  pending: { label: "New submission", badge: "bg-blue-100 text-blue-800" },
  payment_received: { label: "Payment receipt uploaded — confirm deposit", badge: "bg-amber-100 text-amber-800" },
  second_payment_received: { label: "2nd payment receipt — confirm", badge: "bg-amber-100 text-amber-800" },
  final_payment_received: { label: "Final payment receipt — confirm", badge: "bg-orange-100 text-orange-800" },
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
  const { data: stats, isLoading } = useGetDashboardStats();
  const { items: actionItems, loading: actionLoading } = useActionNeeded();

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
    { label: "Total Clients", value: stats?.totalClients ?? 0, icon: Users, color: "text-blue-600" },
    { label: "Applications", value: stats?.totalApplications ?? 0, icon: FileText, color: "text-purple-600" },
    { label: "Pending Review", value: stats?.pendingReview ?? 0, icon: Clock, color: "text-yellow-600" },
    { label: "Ready to Print", value: stats?.readyToPrint ?? 0, icon: Printer, color: "text-green-600" },
    { label: "Submitted", value: stats?.submitted ?? 0, icon: CheckCircle, color: "text-slate-600" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of all client applications and status</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-card-border rounded-lg p-4" data-testid={`stat-${label.toLowerCase().replace(/ /g, "-")}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
              <Icon size={14} className={color} />
            </div>
            <p className="text-3xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Action Needed */}
      <div className="bg-card border border-card-border rounded-lg mb-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-amber-500" />
            <h2 className="font-semibold text-foreground text-sm tracking-wide uppercase">Action Needed</h2>
            {!actionLoading && actionItems.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
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
              const info = ACTION_LABELS[item.status] ?? { label: item.status, badge: "bg-muted text-muted-foreground" };
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
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.badge}`}>
                      {info.label}
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
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[app.status]?.color ?? "bg-muted text-muted-foreground"}`}>
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
