import { useGetDashboardStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Users, FileText, Printer, CheckCircle, Clock } from "lucide-react";

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

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

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

      {/* Recent Applications */}
      <div className="bg-card border border-card-border rounded-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground text-sm tracking-wide uppercase">Recent Applications</h2>
          <Link href="/applications" className="text-primary text-xs font-medium hover:underline" data-testid="link-all-applications">
            View all
          </Link>
        </div>
        {!stats?.recentApplications?.length ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No applications yet. <Link href="/applications/new" className="text-primary hover:underline">Start one</Link>.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {stats.recentApplications.map(app => (
              <Link
                key={app.id}
                href={`/applications/${app.id}`}
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
