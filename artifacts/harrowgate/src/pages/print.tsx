import {
  useGetApplication,
  useListDocuments,
  useGetClient,
  getGetApplicationQueryKey,
  getListDocumentsQueryKey,
  getGetClientQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Printer } from "lucide-react";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
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

const APP_TYPE_LABELS: Record<string, string> = {
  student_visa: "Student Visa Application",
  pr_pathway: "Permanent Residency Pathway Application",
  university_admission: "University Admission Application",
};

export default function PrintView() {
  const params = useParams<{ applicationId: string }>();
  const applicationId = Number(params.applicationId);

  const { data: application, isLoading } = useGetApplication(applicationId, {
    query: { enabled: !!applicationId, queryKey: getGetApplicationQueryKey(applicationId) },
  });
  const { data: documents } = useListDocuments(
    { applicationId },
    { query: { enabled: !!applicationId, queryKey: getListDocumentsQueryKey({ applicationId }) } }
  );
  const { data: client } = useGetClient(
    application?.clientId ?? 0,
    { query: { enabled: !!application?.clientId, queryKey: getGetClientQueryKey(application?.clientId ?? 0) } }
  );

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }
  if (!application) {
    return <div className="p-8 text-center text-muted-foreground">Application not found.</div>;
  }

  const formData = (application.formData as Record<string, string | null>) ?? {};
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div>
      {/* Print controls — hidden on print */}
      <div className="no-print flex items-center gap-3 px-6 py-4 border-b border-border bg-card sticky top-0 z-10">
        <Link href={`/applications/${applicationId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-application">
          <ArrowLeft size={14} /> Back to Application
        </Link>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90"
          data-testid="button-print"
        >
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>

      {/* Printable content */}
      <div className="max-w-4xl mx-auto p-8 print:p-0">
        {/* Letterhead */}
        <div className="border-b-2 border-foreground pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-widest uppercase text-foreground">HARROWGATE</h1>
              <p className="text-sm text-muted-foreground tracking-wider uppercase">Visa Consultancy · Hong Kong</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>Date: {today}</p>
              <p>Ref: HG-{String(applicationId).padStart(4, "0")}</p>
            </div>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-foreground">
            {application.applicationType ? APP_TYPE_LABELS[application.applicationType] || application.applicationType : "Application Form"}
          </h2>
        </div>

        {/* Client Info Summary */}
        {client && (
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 border-b border-border pb-1">Applicant Information</h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><span className="text-muted-foreground">Name:</span> <strong>{client.name}</strong></div>
              <div><span className="text-muted-foreground">Nationality:</span> {client.nationality}</div>
              <div><span className="text-muted-foreground">Email:</span> {client.email}</div>
            </div>
          </div>
        )}

        {/* Application Details */}
        {(application.targetUniversity || application.targetProgram) && (
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 border-b border-border pb-1">Application Target</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {application.targetUniversity && <div><span className="text-muted-foreground">University:</span> {application.targetUniversity}</div>}
              {application.targetProgram && <div><span className="text-muted-foreground">Program:</span> {application.targetProgram}</div>}
            </div>
          </div>
        )}

        {/* Application Form Fields */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 border-b border-border pb-1">Application Form</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {FORM_FIELDS.map(({ key, label }) => (
              <div key={key} className="border-b border-dashed border-border pb-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
                <p className="text-sm text-foreground min-h-[1.25rem]">{formData[key] ?? ""}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Document Checklist */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 border-b border-border pb-1">
            Document Checklist ({documents?.length ?? 0} submitted)
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([type, label]) => {
              const uploaded = (documents ?? []).filter(d => d.documentType === type);
              return (
                <div key={type} className="flex items-center gap-2 text-sm py-1">
                  <div className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${uploaded.length > 0 ? "bg-foreground border-foreground" : "border-muted-foreground"}`}>
                    {uploaded.length > 0 && <span className="text-background text-[10px] font-bold">✓</span>}
                  </div>
                  <span className={uploaded.length > 0 ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                  {uploaded.length > 0 && (
                    <span className="text-muted-foreground text-xs">({uploaded.map(d => d.fileName).join(", ")})</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Signature section */}
        <div className="mt-10 grid grid-cols-2 gap-12">
          <div>
            <div className="border-b border-foreground mb-1 h-10" />
            <p className="text-xs text-muted-foreground">Applicant Signature &amp; Date</p>
          </div>
          <div>
            <div className="border-b border-foreground mb-1 h-10" />
            <p className="text-xs text-muted-foreground">HARROWGATE Consultant Signature &amp; Date</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-4 border-t border-border text-center text-[10px] text-muted-foreground">
          <p>HARROWGATE Visa Consultancy · Hong Kong · Confidential Immigration Document</p>
          <p>This form is prepared exclusively for submission to immigration authorities and universities.</p>
        </div>
      </div>
    </div>
  );
}
