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
  edu_results:           "Secondary Education Results",
  edu_transcript:        "Secondary Education Transcript",
  higher_edu_results:    "Higher Education Results",
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

export default router;
