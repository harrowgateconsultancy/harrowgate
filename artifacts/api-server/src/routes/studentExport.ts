import { Router } from "express";
import JSZip from "jszip";
import { db } from "@workspace/db";
import {
  studentSubmissionsTable,
  studentDocumentsTable,
  id995aFormsTable,
  immigrationLettersTable,
  studentMessagesTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { ObjectStorageService } from "../lib/objectStorage";
import { FORM_FIELDS } from "./id995a";

const router = Router();
const objectStorageService = new ObjectStorageService();

const DOC_LABELS: Record<string, string> = {
  passport_photo:        "Passport Photo",
  passport_doc:          "Passport Document",
  birth_certificate:     "Birth Certificate",
  cv:                    "Curriculum Vitae (CV)",
  edu_results:           "Completion Certificate",
  edu_transcript:        "Secondary Education Transcript",
  higher_edu_results:    "Higher Education Certificate",
  higher_edu_transcript: "Higher Education Transcript",
  payment_receipt:       "Payment Receipt",
  final_payment_receipt: "Final Payment Receipt",
  offer_letter:          "Offer Letter",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  docs_requested: "Documents Requested",
  payment_pending: "Payment Pending",
  payment_received: "Payment Receipt Received",
  acknowledged: "Acknowledged",
  interview_arranged: "Mock Interview Arranged",
  interview_completed: "Mock Interview Completed",
  second_payment_pending: "2nd Payment Pending",
  second_payment_received: "2nd Payment Receipt Received",
  second_payment_confirmed: "2nd Payment Confirmed",
  university_interview_arranged: "University Interview Arranged",
  university_interview_completed: "University Interview Completed",
  offer_letter_pending: "Offer Letter Sent",
  final_payment_received: "Final Payment Receipt Received",
  final_payment_confirmed: "Final Payment Confirmed",
  rejected: "Rejected",
};

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return s; }
}

function buildPrintHtml(data: {
  submission: any;
  form: any | null;
  docs: any[];
  letters: any | null;
  messages: any[];
}): string {
  const { submission, form, docs, letters, messages } = data;
  const formData: Record<string, string> = (form?.formData as Record<string, string>) || {};

  const sections = Array.from(new Set(FORM_FIELDS.map(f => f.section)));

  const formSectionsHtml = sections.map(section => {
    const fields = FORM_FIELDS.filter(f => f.section === section);
    const rows = fields
      .map(f => {
        const v = formData[f.key];
        if (!v) return "";
        return `<tr><td class="label">${esc(f.label)}</td><td class="value">${esc(v)}</td></tr>`;
      })
      .filter(Boolean)
      .join("");
    if (!rows) return "";
    return `<div class="section">
      <h3>${esc(section)}</h3>
      <table><tbody>${rows}</tbody></table>
    </div>`;
  }).filter(Boolean).join("");

  const docsHtml = docs.length === 0
    ? "<p class='muted'>No documents uploaded.</p>"
    : docs.map(d => `<div class="doc-row">
        <span class="doc-label">${esc(DOC_LABELS[d.documentType] || d.documentType)}</span>
        <span class="doc-name">${esc(d.fileName)}</span>
        <span class="doc-size">${d.fileSize ? Math.round(d.fileSize / 1024) + " KB" : ""}</span>
      </div>`).join("");

  const lettersHtml = !letters ? "<p class='muted'>Immigration letters not yet generated.</p>" : `
    <div class="letter-meta">
      <strong>Course:</strong> ${esc(letters.courseName || "—")}<br/>
      <strong>University:</strong> ${esc(letters.universityName || "—")}<br/>
      <strong>Website:</strong> ${esc(letters.courseWebsite || "—")}<br/>
      <strong>Generated:</strong> ${fmtDate(letters.generatedAt)}
    </div>
    ${[1,2,3,4].map(n => {
      const body = letters[`letter${n}`];
      if (!body) return "";
      const titles = ["Reason for Studying the Course","Reason for Studying in Hong Kong","Reason for Choosing the University","Future Plans After Graduation"];
      return `<div class="letter-block">
        <div class="letter-title">Letter ${n}: ${titles[n-1]}</div>
        <div class="letter-body">${esc(body)}</div>
      </div>`;
    }).join("")}`;

  const msgsHtml = messages.length === 0
    ? "<p class='muted'>No messages.</p>"
    : messages.map(m => `<div class="msg-row ${m.senderType}">
        <span class="msg-sender">${m.senderType === "admin" ? "Admin" : "Student"}</span>
        <span class="msg-date">${fmtDate(m.createdAt)}</span>
        <div class="msg-subject">${esc(m.subject || "")}</div>
        <div class="msg-body">${esc(m.body || "")}</div>
      </div>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Student Profile — ${esc(submission.name)}</title>
  <style>
    @page { size: A4; margin: 1.8cm 2cm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #111; background: #fff; padding: 1.5cm 2cm; max-width: 21cm; margin: 0 auto; }
    .print-btn { position:fixed; top:1em; right:1em; background:#0f2d18; color:#a28959; border:none; padding:0.5em 1.2em; border-radius:6px; font-size:10pt; cursor:pointer; font-family:Arial,sans-serif; }
    @media print { .print-btn { display:none; } }
    .header { border-bottom: 2px solid #a28959; padding-bottom: 0.8em; margin-bottom: 1.2em; display:flex; justify-content:space-between; align-items:flex-end; }
    .header-left h1 { font-size:15pt; color:#0f2d18; letter-spacing:0.1em; }
    .header-left h2 { font-size:12pt; color:#a28959; margin-top:0.2em; }
    .header-right { text-align:right; font-size:9pt; color:#666; }
    .status-badge { display:inline-block; padding:0.2em 0.7em; border-radius:4px; background:#0f2d18; color:#a28959; font-size:9pt; font-weight:bold; letter-spacing:0.05em; border:1px solid #a28959; }
    .section { margin-bottom: 1.4em; break-inside: avoid; }
    .section h3 { font-size:10pt; font-weight:bold; color:#0f2d18; border-bottom:1px solid #ccc; padding-bottom:0.3em; margin-bottom:0.5em; text-transform:uppercase; letter-spacing:0.05em; }
    table { width:100%; border-collapse:collapse; }
    td { padding: 0.25em 0.5em; font-size:10pt; vertical-align:top; border-bottom:1px solid #eee; }
    td.label { width:45%; color:#555; font-style:italic; }
    td.value { color:#111; font-weight:500; }
    .doc-row { display:flex; align-items:center; gap:1em; padding:0.3em 0; border-bottom:1px solid #eee; font-size:10pt; }
    .doc-label { width:200px; color:#555; font-style:italic; }
    .doc-name { flex:1; color:#111; }
    .doc-size { color:#888; font-size:9pt; }
    .letter-meta { background:#f9f5ec; border:1px solid #d4b97a; border-radius:4px; padding:0.7em; margin-bottom:1em; font-size:10pt; line-height:1.6; }
    .letter-block { margin-bottom:1.2em; break-inside:avoid; }
    .letter-title { font-size:10pt; font-weight:bold; color:#0f2d18; border-bottom:1px solid #ccc; padding-bottom:0.2em; margin-bottom:0.5em; }
    .letter-body { font-size:10pt; white-space:pre-wrap; line-height:1.6; }
    .msg-row { margin-bottom:0.8em; padding:0.5em; border-radius:4px; font-size:10pt; border:1px solid #eee; break-inside:avoid; }
    .msg-row.admin { background:#f0f8f0; }
    .msg-row.student { background:#f5f5f5; }
    .msg-sender { font-weight:bold; color:#0f2d18; }
    .msg-date { float:right; color:#888; font-size:9pt; }
    .msg-subject { font-weight:600; margin:0.2em 0; }
    .msg-body { color:#333; }
    .muted { color:#888; font-style:italic; font-size:10pt; }
    h2.section-title { font-size:11pt; font-weight:bold; color:#0f2d18; margin:1.2em 0 0.6em; border-left:3px solid #a28959; padding-left:0.5em; }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨 Print / Save PDF</button>

  <div class="header">
    <div class="header-left">
      <h1>HARROWGATE CONSULTANCY</h1>
      <h2>${esc(submission.name)}</h2>
    </div>
    <div class="header-right">
      <div class="status-badge">${esc(STATUS_LABELS[submission.status] || submission.status)}</div><br/>
      <span>Application #${submission.id}</span><br/>
      <span>Submitted: ${fmtDate(submission.createdAt)}</span><br/>
      <span>Printed: ${fmtDate(new Date().toISOString())}</span>
    </div>
  </div>

  <div class="section">
    <h3>Application Summary</h3>
    <table><tbody>
      <tr><td class="label">Full Name</td><td class="value">${esc(submission.name)}</td></tr>
      <tr><td class="label">Email</td><td class="value">${esc(submission.email || "—")}</td></tr>
      <tr><td class="label">Date of Birth</td><td class="value">${esc(submission.dateOfBirth)}</td></tr>
      <tr><td class="label">Passport Number</td><td class="value">${esc(submission.passportNumber)}</td></tr>
      <tr><td class="label">Status</td><td class="value">${esc(STATUS_LABELS[submission.status] || submission.status)}</td></tr>
      ${submission.adminNotes ? `<tr><td class="label">Admin Notes</td><td class="value">${esc(submission.adminNotes)}</td></tr>` : ""}
    </tbody></table>
  </div>

  ${form ? `
  <h2 class="section-title">ID995A — Immigration Form Data</h2>
  ${formSectionsHtml || "<p class='muted'>Form has no data filled in.</p>"}
  ` : "<h2 class='section-title'>ID995A Form</h2><p class='muted'>ID995A form not yet completed.</p>"}

  <h2 class="section-title">Uploaded Documents</h2>
  <div class="section">${docsHtml}</div>

  <h2 class="section-title page-break">Immigration Letters</h2>
  <div class="section">${lettersHtml}</div>

  <h2 class="section-title">Messages</h2>
  <div class="section">${msgsHtml}</div>
</body>
</html>`;
}

// ── GET /api/admin/student-submissions/:id/print ─────────────────────────────
router.get("/admin/student-submissions/:id/print", async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(eq(studentSubmissionsTable.id, submissionId)).limit(1);
    if (!submission) return res.status(404).send("Not found");

    const [form] = await db.select().from(id995aFormsTable)
      .where(eq(id995aFormsTable.submissionId, submissionId)).limit(1);
    const docs = await db.select().from(studentDocumentsTable)
      .where(eq(studentDocumentsTable.submissionId, submissionId));
    const [letters] = await db.select().from(immigrationLettersTable)
      .where(eq(immigrationLettersTable.submissionId, submissionId)).limit(1);
    const messages = await db.select().from(studentMessagesTable)
      .where(eq(studentMessagesTable.submissionId, submissionId));

    const html = buildPrintHtml({ submission, form: form || null, docs, letters: letters || null, messages });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    console.error("[student-export] Print failed:", err);
    res.status(500).send("Failed to generate print view");
  }
});

// ── GET /api/admin/student-submissions/:id/export-zip ────────────────────────
router.get("/admin/student-submissions/:id/export-zip", async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(eq(studentSubmissionsTable.id, submissionId)).limit(1);
    if (!submission) return res.status(404).json({ error: "Not found" });

    const docs = await db.select().from(studentDocumentsTable)
      .where(eq(studentDocumentsTable.submissionId, submissionId));
    const [form] = await db.select().from(id995aFormsTable)
      .where(eq(id995aFormsTable.submissionId, submissionId)).limit(1);
    const [letters] = await db.select().from(immigrationLettersTable)
      .where(eq(immigrationLettersTable.submissionId, submissionId)).limit(1);
    const messages = await db.select().from(studentMessagesTable)
      .where(eq(studentMessagesTable.submissionId, submissionId));

    const zip = new JSZip();

    // 1. Student profile HTML (printable)
    const profileHtml = buildPrintHtml({ submission, form: form || null, docs, letters: letters || null, messages });
    zip.file("student_profile.html", profileHtml);

    // 2. Immigration letters as individual HTML files
    if (letters) {
      const letterTitles = [
        "reason_for_studying_the_course",
        "reason_for_studying_in_hong_kong",
        "reason_for_choosing_the_university",
        "future_plans_after_graduation",
      ];
      const letterDisplayTitles = [
        "Reason for Studying the Course",
        "Reason for Studying in Hong Kong",
        "Reason for Choosing the University",
        "Future Plans After Graduation",
      ];
      const lettersFolder = zip.folder("immigration_letters")!;
      for (let n = 1; n <= 4; n++) {
        const body = (letters as any)[`letter${n}`] as string | null;
        if (!body) continue;
        const lHtml = buildLetterHtml(submission.name, n, letterDisplayTitles[n - 1], body, letters.courseName || "", letters.universityName || "");
        lettersFolder.file(`letter${n}_${letterTitles[n - 1]}.html`, lHtml);
      }
    }

    // 3. All uploaded documents
    const docsFolder = zip.folder("documents")!;
    const docTypeCount: Record<string, number> = {};
    for (const doc of docs) {
      try {
        const file = await objectStorageService.getObjectEntityFile(doc.fileUrl);
        const response = await objectStorageService.downloadObject(file, 0);
        const buffer = Buffer.from(await response.arrayBuffer());

        docTypeCount[doc.documentType] = (docTypeCount[doc.documentType] || 0) + 1;
        const count = docTypeCount[doc.documentType];
        const docLabel = (DOC_LABELS[doc.documentType] || doc.documentType)
          .replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_").toLowerCase();
        const originalName = doc.fileName || `file_${doc.id}`;
        const ext = originalName.includes(".") ? originalName.split(".").pop()! : "bin";
        const paddedId = String(doc.id).padStart(2, "0");
        docsFolder.file(`${paddedId}_${docLabel}${count > 1 ? `_${count}` : ""}.${ext}`, buffer);
      } catch (err) {
        console.error(`[zip] Failed to fetch doc ${doc.id}:`, err);
      }
    }

    const safeName = submission.name.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim().replace(/\s+/g, "_");
    const zipName = `${safeName}_${submissionId}_export.zip`;
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);
    res.setHeader("Content-Length", String(zipBuffer.length));
    res.send(zipBuffer);
  } catch (err) {
    console.error("[student-export] ZIP failed:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate export" });
  }
});

function buildLetterHtml(studentName: string, num: number, title: string, body: string, courseName: string, universityName: string): string {
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Letter ${num} – ${esc(title)}</title>
  <style>
    @page { size: A4; margin: 2.5cm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:"Times New Roman",Times,serif; font-size:12pt; line-height:1.7; color:#111; background:#fff; padding:2cm; max-width:21cm; margin:0 auto; }
    .print-btn { position:fixed; top:1em; right:1em; background:#0f2d18; color:#a28959; border:none; padding:0.5em 1.2em; border-radius:6px; font-size:10pt; cursor:pointer; font-family:Arial,sans-serif; }
    @media print { .print-btn { display:none; } }
    .signature-line { margin-top:3em; border-bottom:1px solid #333; width:10cm; }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨 Print / Save PDF</button>
  <p style="margin-bottom:1.5em">${esc(studentName)}</p>
  <p style="margin-bottom:1.5em">${esc(dateStr)}</p>
  <p style="margin-bottom:1.5em"><strong>The Director of Immigration</strong><br/>Immigration Department<br/>Immigration Tower, 7 Gloucester Road<br/>Wan Chai, Hong Kong</p>
  <p style="margin-bottom:1.5em"><strong><u>Re: Student Visa Application — Letter ${num}: ${esc(title)}</u></strong><br/>Course: ${esc(courseName)} | Institution: ${esc(universityName)}</p>
  <p>Dear Director,</p>
  <div style="white-space:pre-wrap;margin:1.5em 0">${esc(body)}</div>
  <p style="margin-top:2em">Yours faithfully,</p>
  <div class="signature-line"></div>
  <p style="margin-top:0.5em">${esc(studentName)}</p>
</body>
</html>`;
}

// ── GET /api/admin/student-submissions/:id/terms-pdf ─────────────────────────
const TERMS_TEXT = `IMPORTANT DISCLAIMER

Harrowgate Consultancy is an EDUCATION CONSULTANCY ONLY. We are NOT a licensed immigration service provider under the Immigration Service Providers (Regulation) Ordinance (Cap. 658) of Hong Kong. We do NOT provide immigration advice, immigration services, or act as a representative in any immigration matter. Nothing in these Terms or our services constitutes immigration advice.

────────────────────────────────────────

1. DEFINITIONS

"Harrowgate" / "We" / "Us" means Harrowgate Consultancy Limited, a company incorporated in Hong Kong.
"Student" / "You" / "User" means the individual engaging our services for overseas education placement.
"Institution" means any university, college, or educational provider outside Hong Kong.
"Service Fee" means the consultancy fee payable to Harrowgate as specified in your quotation.

2. SCOPE OF SERVICES

Harrowgate provides education consultancy and administrative support services including, but not limited to:
• University and course selection guidance
• Application processing and document preparation assistance
• Career guidance and counselling for students
• General information about student administrative requirements (NOT immigration advice)
• Pre-departure briefing and orientation support

We do NOT provide:
• Immigration advice of any kind
• Legal advice
• Representation before any immigration authority

Exclusions: Our Service Fee does NOT include:
• Airfare or flight tickets
• Accommodation costs
• Living expenses
• Health insurance premiums
• Any fees payable directly to the Institution

3. FEE STRUCTURE AND PAYMENT

3.1 Tuition and University Charges
All tuition and university charges must be paid directly by the student to the institution in accordance with the university's payment schedule.

3.2 Payment to Harrowgate
The full Service Fee must be remitted to Harrowgate Consultancy via the payment methods specified in your invoice. A valid receipt issued by Harrowgate must be obtained and retained as proof of payment. No application will be processed without receipt verification.

3.3 Currency
All fees are quoted and payable in Hong Kong Dollars (HKD) unless otherwise stated.

4. REFUND POLICY

4.1 Harrowgate's Role in Payments
Harrowgate does not collect, hold, or transmit any tuition payments or deposits to any institution on the student's behalf.
All tuition, deposits, and charges are paid directly by the student to the institution, and all refunds are governed solely by the institution's official refund policy.
Harrowgate has no authority to override, amend, or influence any institution's refund decisions and accepts no liability for any refund disputes between the student and the institution.

4.2 Consultancy Fee Non-Refundable
The Service Fee paid to Harrowgate is NON-REFUNDABLE except where:
• Harrowgate fails to submit the application through demonstrable negligence.

In all circumstances, the first HKD 3,000 of the Service Fee is strictly non-refundable regardless of the reason for cancellation or withdrawal.

4.3 Processing Time
Refund processing from institutions typically takes 60 to 90 business days from the date of formal withdrawal or rejection. Harrowgate will facilitate but does not guarantee processing timelines.

5. PERSONAL DATA COLLECTION AND PRIVACY

5.1 Data Collection
By engaging our services, you consent to the collection, processing, and recording of your personal data including:
• Identity documents (passport, HKID)
• Academic records and transcripts
• Contact information and residential address
• Financial information for payment processing
• Any other data required by Institutions or immigration authorities

5.2 Purpose of Processing
Your personal data will be used for:
• Processing university applications
• Communicating with Institutions and relevant authorities
• Internal record-keeping and service improvement
• Compliance with legal and regulatory obligations

5.3 Data Retention
Personal data will be retained for SEVEN (7) YEARS from the completion of services or as required by applicable law, whichever is longer.

5.4 Third-Party Disclosure
We may disclose your personal data to:
• The Institution(s) to which you apply
• Government authorities (immigration, education departments)
• Payment processors and financial institutions
• Legal and regulatory bodies as required by law

6. LIMITATION OF LIABILITY

6.1 No Liability for Personal Data Incidents
To the fullest extent permitted by the Personal Data (Privacy) Ordinance (Cap. 486) and other applicable Hong Kong law, Harrowgate Consultancy SHALL NOT BE LIABLE for any damage, loss, or harm suffered by the Student arising from:
• Unauthorized access to personal data by third parties
• Data breaches occurring at the Institution or government level
• Loss of data due to circumstances beyond our reasonable control

6.2 No Guarantee of Admission
Harrowgate does not guarantee acceptance by any Institution. Admission decisions rest solely with the Institution.

6.3 No Liability for Institutional Actions
We are not liable for:
• Changes to Institution courses, fees, or policies
• Visa refusals by foreign governments
• Disruption to travel or study caused by geopolitical events, pandemics, or force majeure

6.4 Cap on Liability
Our total liability under these Terms shall not exceed the Service Fee paid by the Student.

7. STUDENT OBLIGATIONS

You agree to:
• Provide accurate, complete, and truthful information
• Submit all required documents within specified deadlines
• Comply with all applicable laws of Hong Kong and the destination country
• Notify Harrowgate promptly of any changes to your circumstances

8. GOVERNING LAW AND JURISDICTION

These Terms are governed by the laws of the Hong Kong Special Administrative Region. Any dispute arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Hong Kong.

9. AMENDMENTS

Harrowgate reserves the right to amend these Terms at any time. Material changes will be notified via email or website update. Continued use of our services constitutes acceptance of revised Terms.

10. SEVERABILITY

If any provision of these Terms is held invalid or unenforceable under Hong Kong law, the remaining provisions shall continue in full force.`;

router.get("/admin/student-submissions/:id/terms-pdf", async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(eq(studentSubmissionsTable.id, submissionId)).limit(1);
    if (!submission) return res.status(404).send("Not found");
    if (!submission.termsAcceptedAt) return res.status(400).send("Terms have not been signed yet");

    const signedDate = new Date(submission.termsAcceptedAt).toLocaleString("en-HK", {
      dateStyle: "long", timeStyle: "short", timeZone: "Asia/Hong_Kong",
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Terms &amp; Conditions — ${esc(submission.name)}</title>
<style>
  @page { margin: 22mm 18mm; size: A4; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.65; color: #1a1a1a; margin: 0; padding: 0; }
  .page { max-width: 720px; margin: 0 auto; padding: 8px 0; }

  /* Header */
  .header { display: flex; align-items: center; gap: 20px; border-bottom: 2px solid #0f2d18; padding-bottom: 16px; margin-bottom: 24px; }
  .header-text { flex: 1; }
  .company { font-size: 15pt; font-weight: bold; color: #0f2d18; letter-spacing: 0.04em; }
  .subtitle { font-size: 9pt; color: #6b7280; margin-top: 2px; letter-spacing: 0.06em; text-transform: uppercase; }

  /* Document title */
  .doc-title { text-align: center; margin-bottom: 24px; }
  .doc-title h1 { font-size: 14pt; color: #0f2d18; font-weight: bold; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.06em; }
  .doc-title p { font-size: 10pt; color: #4b5563; margin: 0; }

  /* Student info box */
  .info-box { border: 1.5px solid #0f2d18; border-radius: 8px; padding: 14px 18px; margin-bottom: 28px; background: #f7faf7; }
  .info-box h2 { font-size: 10pt; font-weight: bold; color: #0f2d18; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 10px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
  .info-row { display: flex; flex-direction: column; }
  .info-label { font-size: 8.5pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 1px; }
  .info-value { font-size: 10.5pt; font-weight: 600; color: #111827; }
  .signed-badge { display: inline-flex; align-items: center; gap: 6px; background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; border-radius: 20px; padding: 3px 12px; font-size: 9pt; font-weight: 700; margin-top: 10px; }

  /* T&C body */
  .tc-section { margin-bottom: 28px; }
  .tc-section h2 { font-size: 11pt; font-weight: bold; color: #0f2d18; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; margin-bottom: 14px; }
  .tc-body { white-space: pre-wrap; font-size: 10pt; color: #374151; line-height: 1.7; }

  /* Signature */
  .sig-section { margin-top: 32px; border-top: 1.5px solid #0f2d18; padding-top: 20px; page-break-inside: avoid; }
  .sig-section h2 { font-size: 11pt; font-weight: bold; color: #0f2d18; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 16px; }
  .sig-box { border: 1.5px solid #9ca3af; border-radius: 8px; padding: 16px; background: #fafafa; display: inline-block; min-width: 300px; }
  .sig-img { max-width: 320px; max-height: 110px; object-fit: contain; display: block; }
  .sig-meta { margin-top: 10px; font-size: 9.5pt; color: #4b5563; }
  .sig-meta strong { color: #111827; }

  /* Footer */
  .footer { margin-top: 40px; border-top: 1px solid #d1d5db; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 8.5pt; color: #9ca3af; }

  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body onload="window.print()">
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-text">
      <div class="company">HARROWGATE CONSULTANCY LIMITED</div>
      <div class="subtitle">Education Consultancy · Hong Kong</div>
    </div>
    <div style="font-size:9pt;color:#6b7280;text-align:right">
      Reference No.<br/>
      <strong style="color:#0f2d18;font-size:10pt">HGT-TC-${String(submissionId).padStart(5,"0")}</strong>
    </div>
  </div>

  <!-- Document title -->
  <div class="doc-title">
    <h1>Terms &amp; Conditions — Signed Agreement</h1>
    <p>This document certifies that the student named below has read, understood, and digitally signed the Terms and Conditions of Service.</p>
  </div>

  <!-- Student info -->
  <div class="info-box">
    <h2>Student Information</h2>
    <div class="info-grid">
      <div class="info-row">
        <span class="info-label">Full Name</span>
        <span class="info-value">${esc(submission.name)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Passport Number</span>
        <span class="info-value">${esc(submission.passportNumber || "—")}</span>
      </div>
      <div class="info-row" style="margin-top:6px">
        <span class="info-label">Email Address</span>
        <span class="info-value">${esc(submission.email || "—")}</span>
      </div>
      <div class="info-row" style="margin-top:6px">
        <span class="info-label">Date of Birth</span>
        <span class="info-value">${esc(submission.dateOfBirth || "—")}</span>
      </div>
    </div>
    <div class="signed-badge">
      <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="#166534" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Signed &amp; Agreed — ${esc(signedDate)}
    </div>
  </div>

  <!-- T&C body -->
  <div class="tc-section">
    <h2>Terms and Conditions of Service</h2>
    <div class="tc-body">${esc(TERMS_TEXT)}</div>
  </div>

  <!-- Signature -->
  <div class="sig-section">
    <h2>Student Digital Signature</h2>
    <div class="sig-box">
      ${submission.termsSignatureUrl
        ? `<img class="sig-img" src="${submission.termsSignatureUrl}" alt="Student signature" />`
        : `<div style="height:80px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-style:italic;font-size:10pt">Signature on file</div>`
      }
      <div class="sig-meta">
        Signed by: <strong>${esc(submission.name)}</strong><br/>
        Date &amp; Time: <strong>${esc(signedDate)} (HKT)</strong>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>HARROWGATE Consultancy Limited · Hong Kong</span>
    <span>Generated ${new Date().toLocaleDateString("en-HK")} · Ref HGT-TC-${String(submissionId).padStart(5,"0")}</span>
  </div>

</div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    console.error("[terms-pdf] Failed:", err);
    res.status(500).send("Failed to generate T&C document");
  }
});

export default router;
