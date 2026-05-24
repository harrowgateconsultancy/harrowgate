import {
  useGetApplication,
  useListDocuments,
  useGetClient,
  useUpdateApplication,
  getGetApplicationQueryKey,
  getListDocumentsQueryKey,
  getGetClientQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useEffect, useState, useCallback } from "react";
import { ArrowLeft, Printer, RotateCcw, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type FD = Record<string, string | null>;

function Field({ label, labelCn, value, className = "" }: { label: string; labelCn?: string; value?: string | null; className?: string }) {
  return (
    <div className={`border-b border-gray-400 pb-0.5 ${className}`}>
      <div className="text-[7px] text-gray-500 leading-tight">{labelCn && <span className="mr-1">{labelCn}</span>}{label}</div>
      <div className="text-[9px] min-h-[12px] font-medium text-gray-900 leading-snug">{value || ""}</div>
    </div>
  );
}

function CheckBox({ label, labelCn, checked }: { label: string; labelCn?: string; checked: boolean }) {
  return (
    <span className="inline-flex items-center gap-0.5 mr-2">
      <span className={`inline-block w-2.5 h-2.5 border border-gray-600 text-[7px] flex items-center justify-center ${checked ? "bg-gray-800" : ""}`}>
        {checked ? "✓" : ""}
      </span>
      <span className="text-[7px] text-gray-700">{labelCn && <span className="mr-0.5">{labelCn}</span>}{label}</span>
    </span>
  );
}

function SectionHeader({ num, title, titleCn }: { num: string | number; title: string; titleCn?: string }) {
  return (
    <div className="bg-gray-100 border border-gray-400 px-2 py-0.5 mt-3 mb-1 text-[8px] font-bold text-gray-800">
      {num}.{"  "}{titleCn && <span className="mr-1">{titleCn}</span>}{title}
    </div>
  );
}

function SignaturePad({
  value,
  onChange,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = value;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    drawing.current = false;
    onChange(canvasRef.current!.toDataURL());
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  };

  return (
    <div className="flex flex-col gap-1">
      <canvas
        ref={canvasRef}
        width={280}
        height={60}
        className="border border-dashed border-gray-400 bg-white cursor-crosshair touch-none w-full"
        style={{ height: 60 }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      <button
        onClick={clear}
        className="no-print self-start flex items-center gap-1 text-[9px] text-gray-500 hover:text-gray-700"
        type="button"
      >
        <RotateCcw size={9} /> Clear signature
      </button>
    </div>
  );
}

export default function PrintView() {
  const params = useParams<{ applicationId: string }>();
  const applicationId = Number(params.applicationId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
  const updateApplication = useUpdateApplication();

  const [signature, setSignature] = useState("");
  const [signatureDate, setSignatureDate] = useState(
    new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
  );
  const [signatureSaved, setSignatureSaved] = useState(false);

  useEffect(() => {
    if (application?.formData) {
      const fd = application.formData as FD;
      if (fd.signature) setSignature(fd.signature as string);
      if (fd.signatureDate) setSignatureDate(fd.signatureDate as string);
    }
  }, [application]);

  const saveSignature = useCallback(() => {
    if (!application) return;
    const fd = { ...((application.formData as FD) ?? {}) };
    fd.signature = signature;
    fd.signatureDate = signatureDate;
    updateApplication.mutate(
      { applicationId, data: { formData: fd } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetApplicationQueryKey(applicationId) });
          setSignatureSaved(true);
          toast({ title: "Signature saved" });
        },
        onError: () => toast({ title: "Error saving signature", variant: "destructive" }),
      }
    );
  }, [application, signature, signatureDate, applicationId, updateApplication, queryClient, toast]);

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading…</div>;
  if (!application) return <div className="p-8 text-center text-gray-500">Application not found.</div>;

  const fd = ((application.formData ?? {}) as FD);
  const f = (key: string) => fd[key] || "";
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const refNo = `HG-${String(applicationId).padStart(4, "0")}`;
  const docsByType = (type: string) => (documents ?? []).filter(d => d.documentType === type);

  const sex = f("sex");
  const marital = f("maritalStatus");
  const inHK = f("currentlyInHongKong");
  const permRes = f("permanentResidenceInDomicile");
  const accomType = f("costAccommodationType");

  return (
    <div>
      {/* Controls — hidden on print */}
      <div className="no-print sticky top-0 z-10 flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-200 shadow-sm">
        <Link href={`/applications/${applicationId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft size={14} /> Back
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {!signatureSaved && (
            <button
              onClick={saveSignature}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50"
            >
              <Save size={13} /> Save Signature
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a2744] text-white rounded text-sm font-medium hover:opacity-90"
          >
            <Printer size={14} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* ID995A Form — A4 layout */}
      <div className="max-w-[794px] mx-auto bg-white p-[30px] print:p-0 text-gray-900" id="id995a-form">

        {/* Official Header */}
        <div className="border-2 border-gray-700 mb-2">
          <div className="grid grid-cols-3 border-b border-gray-500">
            <div className="col-span-2 p-2 border-r border-gray-500">
              <div className="text-[9px] font-bold text-gray-800 leading-snug">
                香港特別行政區政府入境事務處<br />
                Immigration Department, the Government of the Hong Kong Special Administrative Region
              </div>
            </div>
            <div className="p-2">
              <div className="text-[7px] text-gray-500 mb-1">FOR OFFICIAL USE ONLY<br />此欄由辦理機關處理</div>
              <div className="text-[7px] text-gray-500">檔案條碼 Reference barcode</div>
              <div className="h-6 border border-dashed border-gray-300 mt-1" />
            </div>
          </div>
          <div className="p-2 text-center border-b border-gray-500">
            <div className="text-[13px] font-bold text-gray-900">來港就讀申請表（由申請人填寫）</div>
            <div className="text-[11px] font-bold text-gray-900">Application for Entry for Study in Hong Kong</div>
            <div className="text-[7px] text-gray-500">(to be completed by the applicant)</div>
          </div>
          <div className="p-1.5 text-[7px] text-gray-600 leading-relaxed">
            <span className="font-semibold">警告 Warning:</span> A person who knowingly and wilfully makes a statement or gives information which he/she knows to be false or does not believe to be true shall be guilty of an offence under the Laws of Hong Kong and any such visa/entry permit issued or permission to enter or remain in Hong Kong granted shall have no effect.
          </div>
        </div>

        {/* Part A Header */}
        <div className="text-[9px] font-bold text-gray-800 mb-1 border-b border-gray-400 pb-0.5">
          甲部 Part A: 申請來港就讀 Application for Study in Hong Kong
        </div>

        {/* Section 1: Personal Particulars */}
        <SectionHeader num={1} titleCn="個人資料" title="Personal Particulars" />

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2">
          <Field labelCn="姓名（中文）（如適用）" label="Name in Chinese (if applicable)" value={f("nameInChinese")} />
          <Field labelCn="婚前姓氏（如適用）" label="Maiden surname (if applicable)" value={f("maidenSurname")} />
          <Field labelCn="姓（英文）" label="Surname in English" value={f("surnameInEnglish")} className="col-span-1" />
          <Field labelCn="名（英文）" label="Given names in English" value={f("givenNamesInEnglish")} className="col-span-1" />
          <Field labelCn="別名（如有）" label="Alias (if any)" value={f("alias")} className="col-span-2" />
        </div>

        <div className="grid grid-cols-4 gap-x-2 gap-y-1.5 mb-2">
          <div className="col-span-1">
            <div className="text-[7px] text-gray-500 mb-0.5">性別 Sex</div>
            <div className="flex gap-2">
              <CheckBox label="Male 男" checked={sex.toLowerCase().includes("male")} />
              <CheckBox label="Female 女" checked={sex.toLowerCase().includes("female")} />
            </div>
          </div>
          <Field labelCn="出生日期" label="Date of birth (dd/mm/yyyy)" value={f("dateOfBirth")} className="col-span-1" />
          <Field labelCn="出生地點" label="Place of birth" value={f("placeOfBirth")} className="col-span-2" />
          <Field labelCn="國籍" label="Nationality" value={f("nationality")} className="col-span-2" />
          <div className="col-span-2">
            <div className="text-[7px] text-gray-500 mb-0.5">婚姻狀況 Marital status</div>
            <div className="flex flex-wrap gap-1">
              {[["Bachelor/Spinster", "未婚"], ["Married", "已婚"], ["Divorced", "離婚"], ["Separated", "分居"], ["Widowed", "喪偶"]].map(([en, cn]) => (
                <CheckBox key={en} label={en} labelCn={cn} checked={marital.includes(en) || marital.includes(cn)} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2">
          <Field labelCn="香港身份證號碼（如有）" label="Hong Kong identity card no. (if any)" value={f("hkIdNumber")} />
          <Field labelCn="內地身份證號碼（如有）" label="Mainland identity card no. (if any)" value={f("mainlandIdNumber")} />
          <Field labelCn="旅行證件類別" label="Travel document type" value={f("travelDocumentType")} />
          <Field labelCn="旅行證件號碼" label="Travel document no." value={f("travelDocumentNo")} />
          <Field labelCn="簽發地點" label="Place of issue" value={f("placeOfIssue")} />
          <div className="grid grid-cols-2 gap-x-2">
            <Field labelCn="簽發日期" label="Date of issue" value={f("dateOfIssue")} />
            <Field labelCn="屆滿日期" label="Date of expiry" value={f("dateOfExpiry")} />
          </div>
          <Field labelCn="電郵地址（如有）" label="E-mail address (if any)" value={f("emailAddress")} />
          <div className="grid grid-cols-2 gap-x-2">
            <Field labelCn="聯絡電話號碼" label="Contact telephone no." value={f("contactTelephoneNo")} />
            <Field labelCn="傳真號碼（如有）" label="Fax no. (if any)" value={f("faxNo")} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 mb-2">
          <Field labelCn="現時定居國家／地區" label="Country/Territory of domicile" value={f("countryOfDomicile")} />
          <div>
            <div className="text-[7px] text-gray-500 mb-0.5">申請人是否在定居國家獲得永久居留身份？ Acquired permanent residence in domicile country?</div>
            <CheckBox label="Yes 是" checked={permRes.includes("Yes")} />
            <CheckBox label="No 否" checked={permRes.includes("No")} />
          </div>
          <div className="grid grid-cols-2 gap-x-1">
            <Field labelCn="在定居國家居留時間（年）" label="Residence (years)" value={f("lengthOfResidenceYears")} />
            <Field labelCn="（月）" label="(months)" value={f("lengthOfResidenceMonths")} />
          </div>
          <Field labelCn="職業" label="Occupation" value={f("occupation")} />
          <Field labelCn="現時僱主名稱（如適用）" label="Name of current employer (if applicable)" value={f("currentEmployerName")} className="col-span-2" />
          <Field labelCn="現時僱主地址（如適用）" label="Address of current employer (if applicable)" value={f("currentEmployerAddress")} className="col-span-3" />
        </div>

        {/* Currently in HK */}
        <div className="border border-gray-300 p-2 mb-2 text-[8px]">
          <div className="font-semibold mb-1">申請人是否現正在香港？ Is the applicant currently staying in Hong Kong?</div>
          <div className="flex gap-4 items-start">
            <div className="flex flex-col gap-1">
              <CheckBox label="Yes 是" checked={inHK.includes("Yes")} />
              <CheckBox label="No 否" checked={inHK.includes("No")} />
            </div>
            {inHK.includes("Yes") && (
              <div className="flex gap-3">
                <Field labelCn="獲准逗留至" label="Permitted to remain until" value={f("permittedToRemainUntil")} className="w-28" />
                <div>
                  <div className="text-[7px] text-gray-500 mb-0.5">在港身份 Status</div>
                  <div className="flex flex-wrap gap-1">
                    {[["Employment", "就業"], ["Residence/Dependant", "居留／受養人"], ["Visitor", "訪客"], ["Others", "其他"]].map(([en, cn]) => (
                      <CheckBox key={en} label={en} labelCn={cn} checked={(f("statusInHK") || "").includes(en)} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Addresses + Photo */}
        <div className="grid grid-cols-3 gap-x-3 mb-2">
          <div className="col-span-2 space-y-2">
            <div>
              <div className="text-[7px] text-gray-500 mb-0.5">現時住址 Present address（請在界內填寫 please fill in within border）</div>
              <div className="border border-gray-400 min-h-[36px] p-1.5 text-[9px]">{f("presentAddress")}</div>
            </div>
            <div>
              <div className="text-[7px] text-gray-500 mb-0.5">固定住址（如與上述不同）Permanent address (if different from above)</div>
              <div className="border border-gray-400 min-h-[36px] p-1.5 text-[9px]">{f("permanentAddress")}</div>
            </div>
          </div>
          <div className="col-span-1">
            <div className="text-[7px] text-gray-500 mb-1 text-center">照片 Photograph</div>
            <div className="border border-gray-400 flex items-center justify-center" style={{ width: "100%", height: 100 }}>
              {docsByType("photo").length > 0 ? (
                <div className="text-center text-[7px] text-gray-500 p-1">
                  <div className="text-green-600 font-bold mb-0.5">✓ Photo uploaded</div>
                  <div>{docsByType("photo")[0].fileName}</div>
                </div>
              ) : (
                <div className="text-center text-[7px] text-gray-400 p-1">
                  請在此處貼上近照一張<br />Affix one recent photograph here<br />(50–55mm × 40–45mm)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page 1 Signature */}
        <div className="border border-gray-300 p-2 mb-3 text-[7px] text-gray-600">
          在本頁內所填報的資料均屬正確、完備和真實。The information given on this page is correct, complete and true.
        </div>

        {/* Section 2: Proposed Stay */}
        <SectionHeader num={2} titleCn="擬來港就讀時間" title="Proposed Stay in Hong Kong for Study" />
        <div className="grid grid-cols-2 gap-x-3 mb-2">
          <Field labelCn="擬抵港日期" label="Proposed date of entry (dd/mm/yyyy)" value={f("proposedDateOfEntry")} />
          <Field labelCn="擬在港逗留時間" label="Proposed duration of stay" value={f("proposedDurationOfStay")} />
        </div>

        {/* Section 4: Study Info */}
        <SectionHeader num={4} titleCn="申請人擬在港就讀的資料" title="Information of Applicant's Proposed Study in Hong Kong" />
        <div className="mb-2 space-y-1.5">
          <Field labelCn="在港就讀學校的名稱及地址" label="Name and address of school in Hong Kong" value={f("schoolNameAndAddress")} />
          <Field labelCn="在港入讀的年級／修讀的課程" label="Class/Course to be attended in Hong Kong" value={f("classCourseToAttend")} />
        </div>

        {/* Section 5: Education */}
        <SectionHeader num={5} titleCn="學歷／專業資格（按獲取資格的日期序列出）" title="Education/Professional Qualifications (in chronological order)" />
        <div className="border border-gray-400 mb-2">
          <div className="grid grid-cols-12 bg-gray-100 border-b border-gray-400">
            {[
              ["曾就讀的學校／學院名稱", "Name of institution", 5],
              ["主修科目", "Major subject", 2],
              ["獲頒發的學位／資格", "Degree/Qualification obtained", 3],
              ["由", "From", 1],
              ["至", "To", 1],
            ].map(([cn, en, span]) => (
              <div key={String(en)} className={`col-span-${span} p-1 border-r border-gray-300 last:border-r-0 text-[7px] text-gray-600`}>
                <span className="block">{cn}</span>
                <span>{en}</span>
              </div>
            ))}
          </div>
          {[1, 2].map(i => (
            <div key={i} className="grid grid-cols-12 border-b border-gray-300 last:border-b-0 min-h-[22px]">
              <div className="col-span-5 p-1 border-r border-gray-300 text-[9px]">{f(`edu${i}Institution`)}</div>
              <div className="col-span-2 p-1 border-r border-gray-300 text-[9px]">{f(`edu${i}MajorSubject`)}</div>
              <div className="col-span-3 p-1 border-r border-gray-300 text-[9px]">{f(`edu${i}Degree`)}</div>
              <div className="col-span-1 p-1 border-r border-gray-300 text-[9px]">{f(`edu${i}From`)}</div>
              <div className="col-span-1 p-1 text-[9px]">{f(`edu${i}To`)}</div>
            </div>
          ))}
        </div>

        {/* Section 6: Living Costs */}
        <SectionHeader num={6} titleCn="申請人預計在港的生活開支" title="Applicant's Estimated Cost of Living in Hong Kong" />
        <div className="border border-gray-400 mb-2">
          <div className="grid grid-cols-12 bg-gray-100 border-b border-gray-400 text-[7px] text-gray-600">
            <div className="col-span-1 p-1 border-r border-gray-300 text-center">項目<br />Item</div>
            <div className="col-span-5 p-1 border-r border-gray-300">事項 Item</div>
            <div className="col-span-3 p-1 border-r border-gray-300">費用（港幣）Cost (HK$)</div>
            <div className="col-span-3 p-1">簡述 Brief description</div>
          </div>
          {[
            { num: "(i)", label: "學費（每學年）School fee (each academic year)", costKey: "costSchoolFee", descKey: "" },
            { num: "(ii)", label: "住宿（每月）Accommodation (each month)", costKey: "costAccommodation", descKey: "costAccommodationType", isAccom: true },
            { num: "(iii)", label: "交通費及膳食費（每月約數）Transport & meal (approx. each month)", costKey: "costTransportMeal", descKey: "" },
            { num: "(iv)", label: "其他（每月）Others (each month)", costKey: "costOthers", descKey: "" },
          ].map(row => (
            <div key={row.num} className="grid grid-cols-12 border-b border-gray-300 min-h-[18px] items-stretch">
              <div className="col-span-1 p-1 border-r border-gray-300 text-[8px] font-medium text-center">{row.num}</div>
              <div className="col-span-5 p-1 border-r border-gray-300 text-[8px]">
                {row.label}
                {row.isAccom && f("costAccommodationType") && (
                  <div className="mt-0.5 flex gap-1">
                    {[["Residential Hall", "宿舍"], ["Rented Flat", "租住樓宇"], ["Lives with Relative", "與親人居住"]].map(([en, cn]) => (
                      <CheckBox key={en} label={en} labelCn={cn} checked={accomType.includes(en) || accomType.includes(cn)} />
                    ))}
                  </div>
                )}
              </div>
              <div className="col-span-3 p-1 border-r border-gray-300 text-[9px] font-medium">{f(row.costKey)}</div>
              <div className="col-span-3 p-1 text-[8px]">{row.descKey ? f(row.descKey) : ""}</div>
            </div>
          ))}
          <div className="grid grid-cols-12 min-h-[18px]">
            <div className="col-span-1 p-1 border-r border-gray-300 text-[8px] font-bold text-center">(v)</div>
            <div className="col-span-5 p-1 border-r border-gray-300 text-[8px] font-bold">總計 Total</div>
            <div className="col-span-3 p-1 border-r border-gray-300 text-[9px] font-bold">HK$ {f("costTotal")}</div>
            <div className="col-span-3 p-1" />
          </div>
        </div>

        {/* Section 7: Financial Situation */}
        <SectionHeader num={7} titleCn="申請人的經濟狀況" title="Financial Situation of Applicant" />
        <div className="border border-gray-400 mb-2">
          <div className="grid grid-cols-12 bg-gray-100 border-b border-gray-400 text-[7px] text-gray-600">
            <div className="col-span-1 p-1 border-r border-gray-300 text-center">項目</div>
            <div className="col-span-5 p-1 border-r border-gray-300">事項 Item</div>
            <div className="col-span-3 p-1 border-r border-gray-300">金額（港幣）Amount (HK$)</div>
            <div className="col-span-3 p-1">簡述 Brief description</div>
          </div>
          {[
            { num: "(i)", label: "存款 Deposit", amtKey: "financeDeposit", descKey: "financeDepositDesc" },
            { num: "(ii)", label: "入息 Income", amtKey: "financeIncome", descKey: "financeIncomeDesc" },
            { num: "(iii)", label: "其他（請簡述）Others (please state briefly)", amtKey: "financeOthers", descKey: "financeOthersDesc" },
          ].map(row => (
            <div key={row.num} className="grid grid-cols-12 border-b border-gray-300 last:border-b-0 min-h-[20px]">
              <div className="col-span-1 p-1 border-r border-gray-300 text-[8px] font-medium text-center">{row.num}</div>
              <div className="col-span-5 p-1 border-r border-gray-300 text-[8px]">{row.label}</div>
              <div className="col-span-3 p-1 border-r border-gray-300 text-[9px] font-medium">{f(row.amtKey)}</div>
              <div className="col-span-3 p-1 text-[8px]">{f(row.descKey)}</div>
            </div>
          ))}
        </div>

        {/* Section 8: Previous Short-term Studies */}
        <SectionHeader num={8} titleCn="曾在港修讀短期課程的資料" title="Information on Previous Short-term Studies in Hong Kong" />
        <div className="border border-gray-300 p-2 mb-2 text-[8px]">
          <div className="mb-1">在緊接本申請前的十二個月內，申請人是否曾在港修讀短期課程？<br />Has the applicant ever taken any short-term studies in Hong Kong in the past 12 months?</div>
          <div className="flex gap-4">
            <CheckBox label="Yes 是" checked={f("previousShortTermStudies").includes("Yes")} />
            <CheckBox label="No 否" checked={f("previousShortTermStudies").includes("No") || f("previousShortTermStudies") === ""} />
          </div>
          {f("previousShortTermStudies").includes("Yes") && (
            <div className="mt-1 text-[8px] border-t border-gray-200 pt-1">{f("previousShortTermStudiesDetails")}</div>
          )}
        </div>

        {/* Section 9: Declaration */}
        <SectionHeader num={9} titleCn="申請人聲明" title="Declaration of Applicant/Parent/Legal Guardian" />
        <div className="border border-gray-300 p-2 mb-3 space-y-2 text-[8px] text-gray-700">
          <div>
            <div className="font-semibold mb-0.5">(i)(a) 申請人曾否更改姓名？Has applicant changed name?</div>
            <CheckBox label="Has NOT changed name 從沒有更改姓名" checked={f("nameChanged").includes("not changed") || f("nameChanged").includes("沒有")} />
            <CheckBox label="Has changed name — previously used: 曾更改姓名" checked={f("nameChanged").includes("changed") && !f("nameChanged").includes("not")} />
            {f("previousNames") && <div className="ml-4 mt-0.5">Previous name(s): {f("previousNames")}</div>}
          </div>
          <div>
            <div className="font-semibold mb-0.5">(i)(b) 曾否被拒絕入境／遞解／遣送或要求離開香港？Previously refused entry / deported / removed from Hong Kong?</div>
            <CheckBox label="No 從未" checked={f("previouslyRefusedEntry").includes("No") || f("previouslyRefusedEntry").includes("從未") || !f("previouslyRefusedEntry")} />
            <CheckBox label="Yes 曾經" checked={f("previouslyRefusedEntry").includes("Yes") || f("previouslyRefusedEntry").includes("曾經")} />
            {(f("previouslyRefusedEntry").includes("Yes") || f("previouslyRefusedEntry").includes("曾經")) && f("refusedEntryDetails") && (
              <div className="ml-4 mt-0.5 border-t border-gray-200 pt-0.5">{f("refusedEntryDetails")}</div>
            )}
          </div>
          <div>
            <div className="font-semibold mb-0.5">(i)(c) 曾否被拒絕簽發簽證／進入許可以入境香港？Previously refused a visa/entry permit for HK?</div>
            <CheckBox label="No 從未" checked={f("previouslyRefusedVisa").includes("No") || f("previouslyRefusedVisa").includes("從未") || !f("previouslyRefusedVisa")} />
            <CheckBox label="Yes 曾經" checked={f("previouslyRefusedVisa").includes("Yes") || f("previouslyRefusedVisa").includes("曾經")} />
            {(f("previouslyRefusedVisa").includes("Yes") || f("previouslyRefusedVisa").includes("曾經")) && f("refusedVisaDetails") && (
              <div className="ml-4 mt-0.5 border-t border-gray-200 pt-0.5">{f("refusedVisaDetails")}</div>
            )}
          </div>
          <div className="text-[7px] text-gray-500 border-t border-gray-200 pt-1">
            (ii)–(xi) I consent to the making of any enquiries necessary for the processing of this application; to releasing my information to any organisations and authorities; I authorise all public and private organisations to release any record or information required for this application; I consent to verification use of information herein; I understand conditions of study permission and funding requirements; all information given in Part A is correct, complete and true to the best of my knowledge and belief.
          </div>
        </div>

        {/* Signature Section */}
        <div className="border-2 border-gray-500 p-3 mb-3">
          <div className="text-[8px] font-semibold text-gray-700 mb-2">
            *申請人簽署或父／母／合法監護人姓名及簽署<br />
            *Signature of applicant or Name and signature of parent/legal guardian
            <span className="ml-2 font-normal text-gray-500">(*16歲以下須由父母或合法監護人簽署)</span>
          </div>
          <div className="grid grid-cols-3 gap-4 items-end">
            <div className="col-span-2">
              <div className="text-[7px] text-gray-500 mb-1">請在下方簽署 Please sign below</div>
              {signature ? (
                <img src={signature} alt="Signature" className="border border-gray-300 w-full" style={{ height: 60 }} />
              ) : (
                <SignaturePad value={signature} onChange={setSignature} />
              )}
              {signature && (
                <button
                  onClick={() => setSignature("")}
                  className="no-print mt-1 text-[9px] text-gray-400 hover:text-gray-600 flex items-center gap-1"
                  type="button"
                >
                  <RotateCcw size={8} /> Clear & re-sign
                </button>
              )}
            </div>
            <div>
              <div className="text-[7px] text-gray-500 mb-1">日期 Date</div>
              <input
                type="text"
                value={signatureDate}
                onChange={e => { setSignatureDate(e.target.value); setSignatureSaved(false); }}
                className="no-print w-full border border-gray-300 rounded px-1.5 py-1 text-[9px] focus:outline-none"
                placeholder="dd/mm/yyyy"
              />
              <div className="print-only text-[9px] font-medium border-b border-gray-400 pb-0.5 min-h-[18px]">{signatureDate}</div>
            </div>
          </div>
        </div>

        {/* Document Checklist */}
        <div className="border border-gray-300 p-2 mb-3">
          <div className="text-[8px] font-semibold text-gray-700 mb-1.5">Supporting Documents Checklist 所需文件清單</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {[
              ["passport", "Passport 護照"],
              ["academic_transcript", "Academic Transcript 成績單"],
              ["degree_certificate", "Degree Certificate 學位證書"],
              ["language_certificate", "Language Certificate 語言成績"],
              ["bank_statement", "Bank Statement 銀行結單"],
              ["recommendation_letter", "Recommendation Letter 推薦信"],
              ["personal_statement", "Personal Statement 個人陳述"],
              ["photo", "Passport Photo 護照相片"],
            ].map(([type, label]) => (
              <div key={type} className="flex items-center gap-1.5 text-[8px]">
                <span className={`w-3 h-3 border border-gray-500 flex items-center justify-center flex-shrink-0 ${docsByType(type).length > 0 ? "bg-gray-800" : ""}`}>
                  {docsByType(type).length > 0 ? <span className="text-white text-[7px]">✓</span> : ""}
                </span>
                <span className={docsByType(type).length > 0 ? "text-gray-800 font-medium" : "text-gray-400"}>{label}</span>
                {docsByType(type).length > 0 && (
                  <span className="text-gray-400 truncate">({docsByType(type).map(d => d.fileName).join(", ")})</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-400 pt-1 flex justify-between items-center text-[7px] text-gray-500">
          <span>ID 995A (4/2015) — Prepared by HARROWGATE Visa Consultancy, Hong Kong</span>
          <span>Ref: {refNo} · {today}</span>
        </div>
      </div>
    </div>
  );
}
