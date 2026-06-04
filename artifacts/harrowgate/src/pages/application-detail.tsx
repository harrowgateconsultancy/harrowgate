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
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Printer, Sparkles, Trash2, CheckCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DropZone from "@/components/DropZone";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
  documents_uploaded: { label: "Documents Uploaded", color: "bg-blue-100 text-blue-800" },
  ai_processing: { label: "AI Processing", color: "bg-yellow-100 text-yellow-800" },
  ai_processed: { label: "AI Processed", color: "bg-purple-100 text-purple-800" },
  ready_to_print: { label: "Ready to Print", color: "bg-green-100 text-green-800" },
  submitted: { label: "Submitted", color: "bg-slate-100 text-slate-700" },
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["documents_uploaded", "ai_processed", "ready_to_print", "submitted"],
  documents_uploaded: ["ai_processing", "ai_processed", "ready_to_print", "submitted"],
  ai_processing: ["ai_processed", "ready_to_print", "submitted"],
  ai_processed: ["ready_to_print", "submitted"],
  ready_to_print: ["submitted"],
  submitted: [],
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

// ID995A form sections and fields exactly matching the official HK Immigration form
const FORM_SECTIONS = [
  {
    id: "s1",
    title: "Part A §1 — Personal Particulars",
    fields: [
      { key: "surnameInEnglish", label: "Surname in English 姓（英文）", required: true },
      { key: "givenNamesInEnglish", label: "Given Names in English 名（英文）", required: true },
      { key: "nameInChinese", label: "Name in Chinese 姓名（中文）（如適用）" },
      { key: "maidenSurname", label: "Maiden Surname 婚前姓氏（如適用）" },
      { key: "alias", label: "Alias 別名（如有）" },
      { key: "sex", label: "Sex 性別", type: "select", options: ["Male 男", "Female 女"] },
      { key: "dateOfBirth", label: "Date of Birth 出生日期 (dd/mm/yyyy)", placeholder: "e.g. 15/03/1995" },
      { key: "placeOfBirth", label: "Place of Birth 出生地點" },
      { key: "nationality", label: "Nationality 國籍", required: true },
      { key: "maritalStatus", label: "Marital Status 婚姻狀況", type: "select", options: ["Bachelor/Spinster 未婚", "Married 已婚", "Divorced 離婚", "Separated 分居", "Widowed 喪偶"] },
      { key: "hkIdNumber", label: "Hong Kong Identity Card No. 香港身份證號碼（如有）" },
      { key: "mainlandIdNumber", label: "Mainland Identity Card No. 內地身份證號碼（如有）" },
      { key: "travelDocumentType", label: "Travel Document Type 旅行證件類別" },
      { key: "travelDocumentNo", label: "Travel Document No. 旅行證件號碼", required: true },
      { key: "placeOfIssue", label: "Place of Issue 簽發地點" },
      { key: "dateOfIssue", label: "Date of Issue 簽發日期 (dd/mm/yyyy)", placeholder: "e.g. 01/01/2020" },
      { key: "dateOfExpiry", label: "Date of Expiry 屆滿日期 (dd/mm/yyyy)", placeholder: "e.g. 31/12/2030" },
      { key: "emailAddress", label: "E-mail Address 電郵地址（如有）" },
      { key: "contactTelephoneNo", label: "Contact Telephone No. 聯絡電話號碼", required: true },
      { key: "faxNo", label: "Fax No. 傳真號碼（如有）" },
      { key: "countryOfDomicile", label: "Country/Territory of Domicile 現時定居國家／地區" },
      { key: "permanentResidenceInDomicile", label: "Acquired Permanent Residence in Domicile Country? 申請人是否在定居國家／地區獲得永久居留身份？", type: "select", options: ["Yes 是", "No 否"] },
      { key: "lengthOfResidenceYears", label: "Length of Residence — Years 在定居國家居留時間（年）", placeholder: "e.g. 5" },
      { key: "lengthOfResidenceMonths", label: "Length of Residence — Months 在定居國家居留時間（月）", placeholder: "e.g. 3" },
      { key: "occupation", label: "Occupation 職業" },
      { key: "currentEmployerName", label: "Name of Current Employer 現時僱主名稱（如適用）" },
      { key: "currentEmployerAddress", label: "Address of Current Employer 現時僱主地址（如適用）", type: "textarea" },
    ],
  },
  {
    id: "s1b",
    title: "Part A §1 — Current HK Stay & Address",
    fields: [
      { key: "currentlyInHongKong", label: "Currently Staying in Hong Kong? 申請人是否現正在香港？", type: "select", options: ["Yes 是", "No 否"] },
      { key: "permittedToRemainUntil", label: "Permitted to Remain Until 獲准逗留至 (dd/mm/yyyy)", placeholder: "e.g. 30/06/2025" },
      { key: "statusInHK", label: "Status in HK 在港身份", type: "select", options: ["Employment 就業", "Residence/Dependant 居留／受養人", "Visitor 訪客", "Others 其他"] },
      { key: "presentAddress", label: "Present Address 現時住址", type: "textarea", required: true },
      { key: "permanentAddress", label: "Permanent Address 固定住址（如與上述不同）", type: "textarea" },
    ],
  },
  {
    id: "s2",
    title: "Part A §2 — Proposed Study in Hong Kong",
    fields: [
      { key: "proposedDateOfEntry", label: "Proposed Date of Entry 擬抵港日期 (dd/mm/yyyy)", placeholder: "e.g. 01/09/2025" },
      { key: "proposedDurationOfStay", label: "Proposed Duration of Stay 擬在港逗留時間", placeholder: "e.g. 2 years" },
    ],
  },
  {
    id: "s4",
    title: "Part A §4 — Proposed Study Information 申請人擬在港就讀的資料",
    fields: [
      { key: "schoolNameAndAddress", label: "Name & Address of School in Hong Kong 在港就讀學校的名稱及地址", type: "textarea", required: true },
      { key: "classCourseToAttend", label: "Class/Course to be Attended 在港入讀的年級／修讀的課程", type: "textarea", required: true },
    ],
  },
  {
    id: "s5",
    title: "Part A §5 — Education / Professional Qualifications 學歷／專業資格",
    fields: [
      { key: "edu1Institution", label: "Institution (1) 學校／學院／大學名稱" },
      { key: "edu1MajorSubject", label: "Major Subject (1) 主修科目" },
      { key: "edu1Degree", label: "Degree / Qualification Obtained (1) 獲頒發的學位／資格" },
      { key: "edu1From", label: "Period From (1) 由（月／年）", placeholder: "e.g. 09/2019" },
      { key: "edu1To", label: "Period To (1) 至（月／年）", placeholder: "e.g. 06/2023" },
      { key: "edu2Institution", label: "Institution (2) 學校／學院名稱" },
      { key: "edu2MajorSubject", label: "Major Subject (2) 主修科目" },
      { key: "edu2Degree", label: "Degree / Qualification Obtained (2) 獲頒發的學位／資格" },
      { key: "edu2From", label: "Period From (2) 由（月／年）", placeholder: "e.g. 09/2016" },
      { key: "edu2To", label: "Period To (2) 至（月／年）", placeholder: "e.g. 06/2019" },
    ],
  },
  {
    id: "s6",
    title: "Part A §6 — Estimated Cost of Living in HK 申請人預計在港的生活開支",
    fields: [
      { key: "costSchoolFee", label: "School Fee per Academic Year 學費（每學年）HK$", placeholder: "e.g. 120000" },
      { key: "costAccommodationType", label: "Accommodation Type 住宿類型", type: "select", options: ["Residential Hall 宿舍", "Rented Flat 租住樓宇", "Lives with Relative 與親人居住"] },
      { key: "costAccommodation", label: "Accommodation per Month 住宿（每月）HK$", placeholder: "e.g. 8000" },
      { key: "costTransportMeal", label: "Transport & Meal per Month 交通費及膳食費（每月）HK$", placeholder: "e.g. 5000" },
      { key: "costOthers", label: "Others per Month 其他（每月）HK$", placeholder: "e.g. 2000" },
      { key: "costTotal", label: "Total 總計 HK$", placeholder: "e.g. 15000" },
    ],
  },
  {
    id: "s7",
    title: "Part A §7 — Financial Situation 申請人的經濟狀況",
    fields: [
      { key: "financeDeposit", label: "Deposit 存款 HK$" },
      { key: "financeDepositDesc", label: "Deposit — Brief Description 存款簡述" },
      { key: "financeIncome", label: "Income 入息 HK$" },
      { key: "financeIncomeDesc", label: "Income — Brief Description 入息簡述" },
      { key: "financeOthers", label: "Others 其他 HK$" },
      { key: "financeOthersDesc", label: "Others — Brief Description 其他簡述" },
    ],
  },
  {
    id: "s8",
    title: "Part A §8 — Previous Short-term Studies in HK 曾在港修讀短期課程的資料",
    fields: [
      {
        key: "previousShortTermStudies",
        label: "Has the applicant taken any short-term studies in HK in the past 12 months? 在緊接本申請前的十二個月內，申請人是否曾在港修讀短期課程？",
        type: "select",
        options: ["No 否", "Yes 是"],
      },
      { key: "previousShortTermStudiesDetails", label: "If Yes — Name, School & Period 如是，課程名稱、修讀學校及修讀日期", type: "textarea" },
    ],
  },
  {
    id: "s9",
    title: "Part A §9 — Declaration 申請人聲明",
    fields: [
      { key: "nameChanged", label: "(i)(a) Has applicant changed name before? 申請人曾否更改姓名？", type: "select", options: ["No — has not changed name 從沒有更改姓名", "Yes — has changed name 曾經更改姓名"] },
      { key: "previousNames", label: "If name changed — previous name(s) 曾用姓名" },
      { key: "previouslyRefusedEntry", label: "(i)(b) Previously refused entry / deported / removed from Hong Kong? 曾否被拒絕入境／遞解／遣送或要求離開香港？", type: "select", options: ["No 從未", "Yes 曾經"] },
      { key: "refusedEntryDetails", label: "If yes — date(s) and details 如是，日期及詳細資料", type: "textarea" },
      { key: "previouslyRefusedVisa", label: "(i)(c) Previously refused a visa/entry permit for HK? 曾否被拒絕簽發簽證／進入許可以入境香港？", type: "select", options: ["No 從未", "Yes 曾經"] },
      { key: "refusedVisaDetails", label: "If yes — date(s) and details 如是，日期及詳細資料", type: "textarea" },
    ],
  },
];

type FD = Record<string, string>;

function FormField({
  field,
  value,
  onChange,
  highlighted,
}: {
  field: { key: string; label: string; type?: string; options?: string[]; placeholder?: string; required?: boolean };
  value: string;
  onChange: (v: string) => void;
  highlighted: boolean;
}) {
  const base = `w-full px-2.5 py-1.5 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background transition-colors ${
    highlighted ? "border-amber-400 bg-amber-50" : "border-border"
  }`;

  if (field.type === "select") {
    return (
      <select value={value} onChange={e => onChange(e.target.value)} className={base} data-testid={`input-form-${field.key}`}>
        <option value="">— Select —</option>
        {field.options!.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (field.type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={2}
        className={base + " resize-none"}
        placeholder={field.placeholder}
        data-testid={`input-form-${field.key}`}
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      className={base}
      placeholder={field.placeholder}
      data-testid={`input-form-${field.key}`}
    />
  );
}

export default function ApplicationDetail() {
  const params = useParams<{ applicationId: string }>();
  const applicationId = Number(params.applicationId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState<FD>({});
  const [formInitialized, setFormInitialized] = useState(false);
  const [extractedFields, setExtractedFields] = useState<string[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ s1: true });
  const [uploading, setUploading] = useState<string | null>(null);

  const { data: application, isLoading } = useGetApplication(applicationId, {
    query: { enabled: !!applicationId, queryKey: getGetApplicationQueryKey(applicationId) },
  });

  useEffect(() => {
    if (application && !formInitialized) {
      const fd = (application.formData as Record<string, string | null>) ?? {};
      const cleaned: FD = {};
      for (const [k, v] of Object.entries(fd)) {
        if (v !== null && v !== undefined) cleaned[k] = String(v);
      }
      setFormData(cleaned);
      setFormInitialized(true);
    }
  }, [application, formInitialized]);

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

  const handleFieldChange = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleSaveForm = () => {
    const fd: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(formData)) fd[k] = v || null;
    updateApplication.mutate(
      { applicationId, data: { formData: fd } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetApplicationQueryKey(applicationId) });
          toast({ title: "Saved", description: "ID995A form data saved." });
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
    extractData.mutate(
      { applicationId },
      {
        onSuccess: result => {
          if (result.success && result.formData) {
            const fd: FD = {};
            for (const [k, v] of Object.entries(result.formData as Record<string, string | null>)) {
              if (v !== null && v !== undefined) fd[k] = String(v);
            }
            setFormData(fd);
            setExtractedFields(result.extractedFields ?? []);
            setFormInitialized(true);
            // Open first two sections to show extracted data
            setOpenSections({ s1: true, s1b: true });
          }
          queryClient.invalidateQueries({ queryKey: getGetApplicationQueryKey(applicationId) });
          queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
          toast({ title: "Extraction complete", description: result.message });
        },
        onError: () => toast({ title: "Extraction failed", description: "Could not extract data.", variant: "destructive" }),
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
          { onSuccess: d => { uploadURL = d.uploadURL; objectPath = d.objectPath; resolve(); }, onError: reject }
        );
      });
      await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      await new Promise<void>((resolve, reject) => {
        createDocument.mutate(
          { data: { applicationId, documentType: docType, fileName: file.name, fileUrl: objectPath, fileSize: file.size, mimeType: file.type } },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey({ applicationId }) });
              queryClient.invalidateQueries({ queryKey: getGetApplicationQueryKey(applicationId) });
              queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
              toast({ title: "Uploaded", description: `${file.name} uploaded.` });
              resolve();
            },
            onError: reject,
          }
        );
      });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
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
          toast({ title: "Document removed" });
        },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      }
    );
  };

  if (isLoading) return <div className="p-8 text-center"><div className="h-6 w-40 bg-muted animate-pulse rounded mx-auto" /></div>;
  if (!application) return <div className="p-8 text-center text-muted-foreground">Application not found. <Link href="/applications" className="text-primary">Go back</Link></div>;

  const statusInfo = STATUS_LABELS[application.status] ?? { label: application.status, color: "bg-muted text-muted-foreground" };
  const availableTransitions = STATUS_TRANSITIONS[application.status] ?? [];
  const uploadedByType: Record<string, NonNullable<typeof documents>> = {};
  (documents ?? []).forEach(doc => {
    if (!uploadedByType[doc.documentType]) uploadedByType[doc.documentType] = [];
    uploadedByType[doc.documentType].push(doc);
  });

  const allExtractedKeys = new Set(extractedFields);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <Link href="/applications" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft size={14} /> Applications
          </Link>
          <h1 className="text-xl font-bold text-foreground">
            {application.clientName ?? "Application"} — ID995A #{application.id}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Application for Entry for Study in Hong Kong · 來港就讀申請表
          </p>
        </div>
        <Link
          href={`/print/${applicationId}`}
          className="flex items-center gap-2 px-3 py-2 border border-border rounded text-sm font-medium hover:bg-accent shrink-0"
        >
          <Printer size={14} /> Print ID995A
        </Link>
      </div>

      {/* Status Bar */}
      <div className="bg-card border border-card-border rounded-lg p-3 mb-5 flex flex-wrap items-center gap-2">
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
        {availableTransitions.map(s => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            disabled={updateApplication.isPending}
            className="text-xs px-2.5 py-1 rounded-full border border-border hover:bg-accent font-medium disabled:opacity-50"
          >
            → {STATUS_LABELS[s]?.label ?? s}
          </button>
        ))}
        <div className="ml-auto text-xs text-muted-foreground">{documents?.length ?? 0} documents</div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Documents panel */}
        <div className="xl:col-span-2 bg-card border border-card-border rounded-lg">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supporting Documents</h2>
            <button
              onClick={handleExtract}
              disabled={extractData.isPending || !documents?.length}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:opacity-90 disabled:opacity-50"
              data-testid="button-extract"
            >
              <Sparkles size={12} />
              {extractData.isPending ? "Extracting…" : "Extract with AI"}
            </button>
          </div>
          <div className="p-3 space-y-1.5">
            {DOCUMENT_TYPES.map(({ value, label }) => {
              const uploaded = uploadedByType[value] ?? [];
              const isUploading = uploading === value;
              return (
                <div key={value} className="border border-border rounded p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium">{label}</span>
                    <DropZone
                      onFile={f => handleFileUpload(value, f)}
                      loading={isUploading}
                      compact
                      accept="image/*,.pdf,.doc,.docx"
                      accentColor="#a28959"
                      accentBg="rgba(162,137,89,0.05)"
                      accentBorder="rgba(162,137,89,0.2)"
                    />
                  </div>
                  {uploaded.map(doc => (
                    <div key={doc.id} className="flex items-center gap-1.5 mt-1.5 bg-muted/40 rounded px-2 py-1">
                      <CheckCircle size={10} className="text-green-600 shrink-0" />
                      <span className="text-xs text-muted-foreground truncate flex-1">{doc.fileName}</span>
                      <button onClick={() => handleDeleteDoc(doc.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* ID995A Form */}
        <div className="xl:col-span-3 space-y-3">
          {extractedFields.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-800">
              <span className="font-semibold">AI extracted {extractedFields.length} fields</span> — highlighted in amber. Review and correct before printing.
            </div>
          )}

          {FORM_SECTIONS.map(section => {
            const isOpen = !!openSections[section.id];
            const sectionExtracted = section.fields.filter(f => allExtractedKeys.has(f.key)).length;
            return (
              <div key={section.id} className="bg-card border border-card-border rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/30 transition-colors"
                  onClick={() => setOpenSections(prev => ({ ...prev, [section.id]: !isOpen }))}
                >
                  <span className="text-sm font-semibold text-foreground">{section.title}</span>
                  <div className="flex items-center gap-2">
                    {sectionExtracted > 0 && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{sectionExtracted} filled</span>
                    )}
                    {isOpen ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    {section.fields.map(field => (
                      <div key={field.key}>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          {field.label}
                          {field.required && <span className="text-destructive ml-0.5">*</span>}
                          {allExtractedKeys.has(field.key) && (
                            <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">AI</span>
                          )}
                        </label>
                        <FormField
                          field={field}
                          value={formData[field.key] ?? ""}
                          onChange={v => handleFieldChange(field.key, v)}
                          highlighted={allExtractedKeys.has(field.key)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex justify-end pt-1 pb-4">
            <button
              onClick={handleSaveForm}
              disabled={updateApplication.isPending}
              className="px-5 py-2 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              data-testid="button-save-form"
            >
              {updateApplication.isPending ? "Saving…" : "Save ID995A Form"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
