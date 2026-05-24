import {
  useGetApplication,
  useListDocuments,
  useUpdateApplication,
  useExtractApplicationData,
  useCreateDocument,
  useDeleteDocument,
  useRequestUploadUrl,
  getGetApplicationQueryKey,
  getListDocumentsQueryKey,
  getListApplicationsQueryKey,
  getGetDashboardStatsQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ArrowLeft, Printer, Sparkles, Trash2, Upload, CheckCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
  documents_uploaded: { label: "Documents Uploaded", color: "bg-blue-100 text-blue-800" },
  ai_processing: { label: "AI Processing", color: "bg-yellow-100 text-yellow-800" },
  ai_processed: { label: "AI Processed", color: "bg-purple-100 text-purple-800" },
  ready_to_print: { label: "Ready to Print", color: "bg-green-100 text-green-800" },
  submitted: { label: "Submitted", color: "bg-slate-100 text-slate-700" },
};

const DOCUMENT_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "academic_transcript", label: "Academic Transcript" },
  { value: "degree_certificate", label: "Degree Certificate" },
  { value: "language_certificate", label: "Language Certificate (IELTS/TOEFL)" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "recommendation_letter", label: "Recommendation Letter" },
  { value: "personal_statement", label: "Personal Statement" },
  { value: "photo", label: "Passport Photo" },
  { value: "other", label: "Other Document" },
];

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["documents_uploaded", "ai_processing", "ai_processed", "ready_to_print", "submitted"],
  documents_uploaded: ["ai_processing", "ai_processed", "ready_to_print", "submitted"],
  ai_processing: ["ai_processed", "ready_to_print", "submitted"],
  ai_processed: ["ready_to_print", "submitted"],
  ready_to_print: ["submitted"],
  submitted: [],
};

const FORM_FIELDS = [
  { key: "fullName", label: "Full Name" },
  { key: "dateOfBirth", label: "Date of Birth" },
  { key: "nationality", label: "Nationality" },
  { key: "passportNumber", label: "Passport Number" },
  { key: "passportExpiry", label: "Passport Expiry Date" },
  { key: "homeAddress", label: "Home Address" },
  { key: "phone", label: "Phone Number" },
  { key: "email", label: "Email Address" },
  { key: "highestDegree", label: "Highest Degree" },
  { key: "institution", label: "Institution" },
  { key: "graduationYear", label: "Graduation Year" },
  { key: "gpa", label: "GPA / Grade" },
  { key: "languageTestType", label: "Language Test Type" },
  { key: "languageTestScore", label: "Language Test Score" },
  { key: "intendedProgram", label: "Intended Program" },
  { key: "intendedUniversity", label: "Intended University" },
  { key: "fundingSource", label: "Funding Source" },
  { key: "emergencyContactName", label: "Emergency Contact Name" },
  { key: "emergencyContactPhone", label: "Emergency Contact Phone" },
];

export default function ApplicationDetail() {
  const params = useParams<{ applicationId: string }>();
  const applicationId = Number(params.applicationId);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formInitialized, setFormInitialized] = useState(false);
  const [extractedFields, setExtractedFields] = useState<string[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  const { data: application, isLoading } = useGetApplication(applicationId, {
    query: {
      enabled: !!applicationId,
      queryKey: getGetApplicationQueryKey(applicationId),
      onSuccess: (app: typeof application) => {
        if (!formInitialized && app) {
          const fd = (app.formData as Record<string, string | null>) ?? {};
          const cleaned: Record<string, string> = {};
          for (const [k, v] of Object.entries(fd)) {
            if (v !== null && v !== undefined) cleaned[k] = String(v);
          }
          setFormData(cleaned);
          setFormInitialized(true);
        }
      }
    },
  });

  const { data: documents } = useListDocuments(
    { applicationId },
    { query: { enabled: !!applicationId, queryKey: getListDocumentsQueryKey({ applicationId }) } }
  );

  const updateApplication = useUpdateApplication();
  const extractData = useExtractApplicationData();
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();
  const requestUploadUrl = useRequestUploadUrl();

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFieldChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveForm = () => {
    updateApplication.mutate(
      { applicationId, data: { formData: formData as Record<string, string | null> } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetApplicationQueryKey(applicationId) });
          toast({ title: "Application saved", description: "Form data has been saved." });
        },
        onError: () => toast({ title: "Error", description: "Failed to save.", variant: "destructive" }),
      }
    );
  };

  const handleStatusChange = (newStatus: string) => {
    updateApplication.mutate(
      { applicationId, data: { status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetApplicationQueryKey(applicationId) });
          queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          toast({ title: "Status updated" });
        },
        onError: () => toast({ title: "Error", description: "Failed to update status.", variant: "destructive" }),
      }
    );
  };

  const handleExtract = () => {
    updateApplication.mutate({ applicationId, data: { status: "ai_processing" } }, { onSuccess: () => {} });
    extractData.mutate(
      { applicationId },
      {
        onSuccess: (result) => {
          if (result.success && result.formData) {
            const fd: Record<string, string> = {};
            for (const [k, v] of Object.entries(result.formData as Record<string, string | null>)) {
              if (v !== null && v !== undefined) fd[k] = String(v);
            }
            setFormData(fd);
            setExtractedFields(result.extractedFields ?? []);
            setFormInitialized(true);
          }
          queryClient.invalidateQueries({ queryKey: getGetApplicationQueryKey(applicationId) });
          queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
          toast({ title: "Extraction complete", description: result.message });
        },
        onError: () => toast({ title: "Extraction failed", description: "Could not extract data from documents.", variant: "destructive" }),
      }
    );
  };

  const handleFileUpload = async (docType: string, file: File) => {
    setUploading(docType);
    try {
      let uploadURL = "";
      let objectPath = "";

      await new Promise<void>((resolve, reject) => {
        requestUploadUrl.mutate(
          { data: { name: file.name, size: file.size, contentType: file.type } },
          {
            onSuccess: (data) => {
              uploadURL = data.uploadURL;
              objectPath = data.objectPath;
              resolve();
            },
            onError: reject,
          }
        );
      });

      await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      await new Promise<void>((resolve, reject) => {
        createDocument.mutate(
          {
            data: {
              applicationId,
              documentType: docType,
              fileName: file.name,
              fileUrl: objectPath,
              fileSize: file.size,
              mimeType: file.type,
            }
          },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey({ applicationId }) });
              queryClient.invalidateQueries({ queryKey: getGetApplicationQueryKey(applicationId) });
              queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
              toast({ title: "Document uploaded", description: `${file.name} uploaded successfully.` });
              resolve();
            },
            onError: reject,
          }
        );
      });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload document.", variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteDoc = (docId: number) => {
    deleteDocument.mutate(
      { documentId: docId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey({ applicationId }) });
          queryClient.invalidateQueries({ queryKey: getGetApplicationQueryKey(applicationId) });
          toast({ title: "Document removed" });
        },
        onError: () => toast({ title: "Error", description: "Failed to delete document.", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="h-6 w-40 bg-muted animate-pulse rounded mb-6" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!application) {
    return <div className="p-8 text-center text-muted-foreground">Application not found. <Link href="/applications" className="text-primary hover:underline">Go back</Link></div>;
  }

  const statusInfo = STATUS_LABELS[application.status] ?? { label: application.status, color: "bg-muted text-muted-foreground" };
  const availableTransitions = STATUS_TRANSITIONS[application.status] ?? [];
  const uploadedByType: Record<string, typeof documents> = {};
  (documents ?? []).forEach(doc => {
    if (!uploadedByType[doc.documentType]) uploadedByType[doc.documentType] = [];
    uploadedByType[doc.documentType]!.push(doc);
  });

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/applications" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2" data-testid="link-back-applications">
            <ArrowLeft size={14} /> Back to Applications
          </Link>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {application.clientName ?? "Application"} — #{application.id}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {application.applicationType === "student_visa" ? "Student Visa" :
             application.applicationType === "pr_pathway" ? "PR Pathway" :
             application.applicationType === "university_admission" ? "University Admission" :
             "Application"}
            {application.targetUniversity ? ` · ${application.targetUniversity}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/print/${applicationId}`}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded text-sm font-medium hover:bg-accent transition-colors"
            data-testid="button-print"
          >
            <Printer size={14} /> Print
          </Link>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-card border border-card-border rounded-lg p-4 mb-5 flex flex-wrap items-center gap-3">
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusInfo.color}`} data-testid="status-badge">
          {statusInfo.label}
        </span>
        {availableTransitions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Move to:</span>
            {availableTransitions.map(s => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={updateApplication.isPending}
                className="text-xs px-2.5 py-1 rounded-full border border-border hover:bg-accent font-medium transition-colors disabled:opacity-50"
                data-testid={`button-status-${s}`}
              >
                {STATUS_LABELS[s]?.label ?? s}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto text-xs text-muted-foreground">
          {documents?.length ?? 0} documents uploaded
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Documents Section */}
        <div className="bg-card border border-card-border rounded-lg">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documents</h2>
            <button
              onClick={handleExtract}
              disabled={extractData.isPending || !documents?.length}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              data-testid="button-extract"
            >
              <Sparkles size={12} />
              {extractData.isPending ? "Extracting..." : "Extract with AI"}
            </button>
          </div>
          <div className="p-4 space-y-2">
            {DOCUMENT_TYPES.map(({ value, label }) => {
              const uploaded = uploadedByType[value] ?? [];
              const isUploading = uploading === value;
              return (
                <div key={value} className="border border-border rounded p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">{label}</span>
                    <button
                      onClick={() => fileInputRefs.current[value]?.click()}
                      disabled={isUploading}
                      className="flex items-center gap-1 px-2 py-1 border border-border rounded text-xs hover:bg-accent transition-colors disabled:opacity-50"
                      data-testid={`button-upload-${value}`}
                    >
                      <Upload size={10} />
                      {isUploading ? "Uploading..." : "Upload"}
                    </button>
                    <input
                      ref={el => { fileInputRefs.current[value] = el; }}
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(value, file);
                        e.target.value = "";
                      }}
                      data-testid={`input-file-${value}`}
                    />
                  </div>
                  {uploaded.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {uploaded.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between bg-muted/40 rounded px-2 py-1" data-testid={`doc-item-${doc.id}`}>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <CheckCircle size={10} className="text-green-600 shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">{doc.fileName}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="text-muted-foreground hover:text-destructive ml-2 shrink-0"
                            data-testid={`button-delete-doc-${doc.id}`}
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Application Form */}
        <div className="bg-card border border-card-border rounded-lg">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Application Form</h2>
            {extractedFields.length > 0 && (
              <span className="text-xs text-green-600 font-medium">{extractedFields.length} fields auto-filled</span>
            )}
          </div>
          <div className="p-4 space-y-3">
            {FORM_FIELDS.map(({ key, label }) => {
              const wasExtracted = extractedFields.includes(key);
              return (
                <div key={key}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {label}
                    {wasExtracted && (
                      <span className="ml-1.5 text-[10px] text-green-600 font-semibold uppercase tracking-wider">AI</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData[key] ?? ""}
                    onChange={e => handleFieldChange(key, e.target.value)}
                    className={`w-full px-2.5 py-1.5 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background ${
                      wasExtracted ? "border-green-300 bg-green-50" : "border-border"
                    }`}
                    data-testid={`input-form-${key}`}
                  />
                </div>
              );
            })}

            <div className="pt-3 flex gap-2">
              <button
                onClick={handleSaveForm}
                disabled={updateApplication.isPending}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
                data-testid="button-save-form"
              >
                {updateApplication.isPending ? "Saving..." : "Save Form"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {application.notes && (
        <div className="mt-5 bg-card border border-card-border rounded-lg p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Internal Notes</h3>
          <p className="text-sm text-foreground">{application.notes}</p>
        </div>
      )}
    </div>
  );
}
