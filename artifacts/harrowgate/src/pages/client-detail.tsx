import { useGetClient, useListApplications, getGetClientQueryKey, getListApplicationsQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, FileText, Paperclip, ExternalLink } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }

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

const DOC_TYPE_LABELS: Record<string, string> = {
  passport: "Passport",
  academic_transcript: "Academic Transcript",
  degree_certificate: "Degree Certificate",
  language_certificate: "Language Certificate",
  bank_statement: "Bank Statement",
  recommendation_letter: "Recommendation Letter",
  personal_statement: "Personal Statement",
  photo: "Passport Photo",
  other: "Other Document",
};

interface ClientDoc {
  id: number;
  applicationId: number;
  documentType: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedAt: string;
}

function useClientDocuments(clientId: number) {
  return useQuery<ClientDoc[]>({
    queryKey: ["client-documents", clientId],
    queryFn: async () => {
      const res = await fetch(`${getApiBase()}/api/clients/${clientId}/documents`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
    enabled: !!clientId,
  });
}

function formatBytes(b: number | null) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function ClientDetail() {
  const params = useParams<{ clientId: string }>();
  const clientId = Number(params.clientId);

  const { data: client, isLoading: clientLoading } = useGetClient(clientId, {
    query: { enabled: !!clientId, queryKey: getGetClientQueryKey(clientId) },
  });
  const { data: applications, isLoading: appsLoading } = useListApplications(
    { clientId },
    { query: { enabled: !!clientId, queryKey: getListApplicationsQueryKey({ clientId }) } }
  );
  const { data: documents, isLoading: docsLoading } = useClientDocuments(clientId);

  if (clientLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="h-6 w-40 bg-muted animate-pulse rounded mb-6" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Client not found. <Link href="/clients" className="text-primary hover:underline">Go back</Link>
      </div>
    );
  }

  const fields = [
    { label: "Email", value: client.email },
    { label: "Phone", value: client.phone ?? "—" },
    { label: "Nationality", value: client.nationality },
    { label: "Country of Origin", value: client.countryOfOrigin ?? "—" },
    { label: "Date of Birth", value: client.dateOfBirth ?? "—" },
    { label: "Passport Number", value: client.passportNumber ?? "—" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6" data-testid="link-back-clients">
        <ArrowLeft size={14} /> Back to Clients
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{client.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              {client.nationality}
            </span>
          </p>
        </div>
        <Link
          href={`/applications/new?clientId=${clientId}`}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90"
          data-testid="button-new-application"
        >
          <Plus size={14} /> New Application
        </Link>
      </div>

      {/* Client Info */}
      <div className="bg-card border border-card-border rounded-lg p-5 mb-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Personal Information</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {fields.map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
              <p className="text-sm font-medium text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Applications */}
      <div className="bg-card border border-card-border rounded-lg mb-6">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <FileText size={13} /> Applications
          </h2>
          <span className="text-xs text-muted-foreground">{applications?.length ?? 0} total</span>
        </div>
        {appsLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
          </div>
        ) : !applications?.length ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No applications yet.{" "}
            <Link href={`/applications/new?clientId=${clientId}`} className="text-primary hover:underline">
              Create one
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {applications.map(app => (
              <Link
                key={app.id}
                href={`/applications/${app.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-accent transition-colors"
                data-testid={`row-application-${app.id}`}
              >
                <div className="flex items-center gap-3">
                  <FileText size={14} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {app.applicationType ? APP_TYPE_LABELS[app.applicationType] || app.applicationType : "Application"}
                    </p>
                    <p className="text-xs text-muted-foreground">{app.targetUniversity ?? "No university set"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:block">{app.documentCount ?? 0} docs</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[app.status]?.color ?? ""}`}>
                    {STATUS_LABELS[app.status]?.label ?? app.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="bg-card border border-card-border rounded-lg">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Paperclip size={13} /> All Documents
          </h2>
          <span className="text-xs text-muted-foreground">{documents?.length ?? 0} files</span>
        </div>
        {docsLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
          </div>
        ) : !documents?.length ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            No documents uploaded yet. Documents appear here once added to an application.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {documents.map(doc => {
              const app = applications?.find(a => a.id === doc.applicationId);
              return (
                <div key={doc.id} className="flex items-center justify-between px-5 py-3 hover:bg-accent/40 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Paperclip size={13} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                        {doc.fileSize ? ` · ${formatBytes(doc.fileSize)}` : ""}
                        {app ? ` · ${app.applicationType ? APP_TYPE_LABELS[app.applicationType] || app.applicationType : "Application"}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {new Date(doc.uploadedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                      <ExternalLink size={13} />
                    </a>
                    {app && (
                      <Link href={`/applications/${app.id}`}
                        className="text-xs text-primary hover:underline hidden sm:block">
                        View App
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
