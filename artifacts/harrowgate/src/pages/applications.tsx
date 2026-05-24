import { useListApplications } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus } from "lucide-react";
import { useState } from "react";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "documents_uploaded", label: "Docs Uploaded" },
  { value: "ai_processing", label: "AI Processing" },
  { value: "ai_processed", label: "AI Processed" },
  { value: "ready_to_print", label: "Ready to Print" },
  { value: "submitted", label: "Submitted" },
];

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

export default function Applications() {
  const [statusFilter, setStatusFilter] = useState("");
  const { data: applications, isLoading } = useListApplications(
    statusFilter ? { status: statusFilter } : {},
    { query: { queryKey: ["/api/applications", statusFilter] } }
  );

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Applications</h1>
          <p className="text-muted-foreground text-sm mt-1">{applications?.length ?? 0} applications</p>
        </div>
        <Link
          href="/applications/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90"
          data-testid="button-new-application"
        >
          <Plus size={14} /> New Application
        </Link>
      </div>

      {/* Filter */}
      <div className="mb-5">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded bg-card text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          data-testid="select-status-filter"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-card border border-card-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex gap-4">
                <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : !applications?.length ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            No applications found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Type</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">University</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Docs</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {applications.map(app => (
                <tr key={app.id} className="hover:bg-accent transition-colors cursor-pointer" data-testid={`row-application-${app.id}`}>
                  <td className="px-5 py-3.5">
                    <Link href={`/applications/${app.id}`} className="font-medium text-foreground hover:text-primary">
                      {app.clientName ?? "Unknown"}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden sm:table-cell">
                    {app.applicationType ? APP_TYPE_LABELS[app.applicationType] || app.applicationType : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell truncate max-w-48">
                    {app.targetUniversity ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden sm:table-cell">{app.documentCount ?? 0}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[app.status]?.color ?? ""}`}>
                      {STATUS_LABELS[app.status]?.label ?? app.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
