import { Router } from "express";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { studentSubmissionsTable, studentDocumentsTable, studentMessagesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { sendNewApplicationEmail, sendReceiptUploadEmail, sendSecondReceiptUploadEmail, sendResubmitEmail, sendAdditionalDocsSubmittedEmail, sendFinalReceiptEmail, sendStudentReplyNotificationEmail, sendOutboxPendingNotification } from "../email";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { isLocalStorageMode, LocalStorageService } from "../lib/localStorageService";
import { ensureStudentFolder, upsertStudentRow } from "../lib/googleIntegration";
import { uploadToMega } from "../lib/megaService";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { listInboxEmails, getEmailDetail, invalidateCache } from "../lib/gmailImap";
import { studentOutboxTable } from "@workspace/db/schema";

const localStorageService = new LocalStorageService();

const router = Router();
const objectStorageService = new ObjectStorageService();

// ─── T&C text (mirrors TermsModal.tsx) ───────────────────────────────────────
const TERMS_TEXT = `IMPORTANT DISCLAIMER

Harrowgate Consultancy is an EDUCATION CONSULTANCY ONLY. We are NOT a licensed immigration service provider under the Immigration Service Providers (Regulation) Ordinance (Cap. 658) of Hong Kong. We do NOT provide immigration advice, immigration services, or act as a representative in any immigration matter. Nothing in these Terms or our services constitutes immigration advice.

1. DEFINITIONS

"Harrowgate" / "We" / "Us" means Harrowgate Consultancy Limited, a company incorporated in Hong Kong.
"Student" / "You" / "User" means the individual engaging our services for overseas education placement.
"Institution" means any university, college, or educational provider outside Hong Kong.
"Service Fee" means the consultancy fee payable to Harrowgate as specified in your quotation.

2. SCOPE OF SERVICES

Harrowgate provides education consultancy and administrative support services including, but not limited to:
- University and course selection guidance
- Application processing and document preparation assistance
- Career guidance and counselling for students
- General information about student administrative requirements (NOT immigration advice)
- Pre-departure briefing and orientation support

We do NOT provide:
- Immigration advice of any kind
- Legal advice
- Representation before any immigration authority

Exclusions: Our Service Fee does NOT include:
- Airfare or flight tickets
- Accommodation costs
- Living expenses
- Health insurance premiums
- Any fees payable directly to the Institution

3. FEE STRUCTURE AND PAYMENT

3.1 Tuition and University Charges
All tuition and university charges must be paid directly by the student to the institution in accordance with the university's payment schedule.

3.2 Payment to Harrowgate
The full Service Fee must be remitted to Harrowgate Consultancy via the payment methods specified in your invoice. A valid receipt issued by Harrowgate must be obtained and retained as proof of payment. No application will be processed without receipt verification.

3.3 Currency
All fees are quoted and payable in Hong Kong Dollars (HKD) unless otherwise stated.

4. REFUND POLICY

4.1 Harrowgate's Role in Payments
Harrowgate does not collect, hold, or transmit any tuition payments or deposits to any institution on the student's behalf. All tuition, deposits, and charges are paid directly by the student to the institution, and all refunds are governed solely by the institution's official refund policy. Harrowgate has no authority to override, amend, or influence any institution's refund decisions and accepts no liability for any refund disputes between the student and the institution.

4.2 Consultancy Fee Non-Refundable
The Service Fee paid to Harrowgate is NON-REFUNDABLE except where:
- Harrowgate fails to submit the application through demonstrable negligence.

In all circumstances, the first HKD 3,000 of the Service Fee is strictly non-refundable regardless of the reason for cancellation or withdrawal.

4.3 Processing Time
Refund processing from institutions typically takes 60 to 90 business days from the date of formal withdrawal or rejection. Harrowgate will facilitate but does not guarantee processing timelines.

5. PERSONAL DATA COLLECTION AND PRIVACY

5.1 Data Collection
By engaging our services, you consent to the collection, processing, and recording of your personal data including:
- Identity documents (passport, HKID)
- Academic records and transcripts
- Contact information and residential address
- Financial information for payment processing
- Any other data required by Institutions or immigration authorities

5.2 Purpose of Processing
Your personal data will be used for:
- Processing university applications
- Communicating with Institutions and relevant authorities
- Internal record-keeping and service improvement
- Compliance with legal and regulatory obligations

5.3 Data Retention
Personal data will be retained for SEVEN (7) YEARS from the completion of services or as required by applicable law, whichever is longer.

5.4 Third-Party Disclosure
We may disclose your personal data to:
- The Institution(s) to which you apply
- Government authorities (immigration, education departments)
- Payment processors and financial institutions
- Legal and regulatory bodies as required by law

6. LIMITATION OF LIABILITY

6.1 No Liability for Personal Data Incidents
To the fullest extent permitted by the Personal Data (Privacy) Ordinance (Cap. 486) and other applicable Hong Kong law, Harrowgate Consultancy SHALL NOT BE LIABLE for any damage, loss, or harm suffered by the Student arising from:
- Unauthorized access to personal data by third parties
- Data breaches occurring at the Institution or government level
- Loss of data due to circumstances beyond our reasonable control

6.2 No Guarantee of Admission
Harrowgate does not guarantee acceptance by any Institution. Admission decisions rest solely with the Institution.

6.3 No Liability for Institutional Actions
We are not liable for:
- Changes to Institution courses, fees, or policies
- Visa refusals by foreign governments
- Disruption to travel or study caused by geopolitical events, pandemics, or force majeure

6.4 Cap on Liability
Our total liability under these Terms shall not exceed the Service Fee paid by the Student.

7. STUDENT OBLIGATIONS

You agree to:
- Provide accurate, complete, and truthful information
- Submit all required documents within specified deadlines
- Comply with all applicable laws of Hong Kong and the destination country
- Notify Harrowgate promptly of any changes to your circumstances

8. GOVERNING LAW AND JURISDICTION

These Terms are governed by the laws of the Hong Kong Special Administrative Region. Any dispute arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Hong Kong.

9. AMENDMENTS

Harrowgate reserves the right to amend these Terms at any time. Material changes will be notified via email or website update. Continued use of our services constitutes acceptance of revised Terms.

10. SEVERABILITY

If any provision of these Terms is held invalid or unenforceable under Hong Kong law, the remaining provisions shall continue in full force.`;

// ─── Server-side storage upload ───────────────────────────────────────────────
async function uploadBufferToStorage(buf: Buffer, contentType: string, host: string): Promise<string> {
  if (isLocalStorageMode()) {
    const id = randomUUID();
    await localStorageService.saveFile(id, buf);
    return `/objects/uploads/${id}`;
  }
  const uploadURL = await objectStorageService.getObjectEntityUploadURL(host);
  const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
  await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": contentType }, body: buf });
  return objectPath;
}

// ─── Signed T&C PDF generator ─────────────────────────────────────────────────
async function generateSignedTermsPDF(opts: {
  submissionId: number;
  studentName: string;
  acceptedAt: Date;
  signatureDataUrl: string;
}): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const W = 595.28, H = 841.89; // A4
  const ML = 50, MR = 50, MT = 50, MB = 60;
  const TW = W - ML - MR;
  const NAVY  = rgb(0.051, 0.102, 0.227);
  const GOLD  = rgb(0.635, 0.537, 0.349);
  const DARK  = rgb(0.1, 0.1, 0.1);
  const LIGHT = rgb(0.45, 0.45, 0.45);

  const BODY_SIZE  = 8.5;
  const BODY_LH    = 13;
  const LABEL_SIZE = 7;

  let page = pdfDoc.addPage([W, H]);
  let y = H - MT;

  const ensureSpace = (needed: number) => {
    if (y - needed < MB) {
      page = pdfDoc.addPage([W, H]);
      y = H - MT;
    }
  };

  const drawWrapped = (text: string, opts2: { size?: number; font?: typeof font; color?: ReturnType<typeof rgb>; indent?: number; lineH?: number }) => {
    const f   = opts2.font  ?? font;
    const s   = opts2.size  ?? BODY_SIZE;
    const c   = opts2.color ?? DARK;
    const ind = opts2.indent ?? 0;
    const lh  = opts2.lineH ?? BODY_LH;
    const avail = TW - ind;
    const paras = text.split("\n");
    for (const para of paras) {
      if (para.trim() === "") { y -= lh * 0.6; continue; }
      const words = para.split(" ");
      let line = "";
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (f.widthOfTextAtSize(test, s) > avail && line) {
          ensureSpace(lh);
          page.drawText(line, { x: ML + ind, y, size: s, font: f, color: c });
          y -= lh; line = w;
        } else { line = test; }
      }
      if (line) { ensureSpace(lh); page.drawText(line, { x: ML + ind, y, size: s, font: f, color: c }); y -= lh; }
    }
  };

  const hRule = (opacity = 0.25) => {
    page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 0.5, color: GOLD, opacity });
  };

  // ── Cover header ──────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: H - 90, width: W, height: 90, color: NAVY });
  page.drawText("HARROWGATE", { x: ML, y: H - 40, size: 20, font: boldFont, color: GOLD });
  page.drawText("Consultancy", { x: ML, y: H - 57, size: 11, font, color: rgb(0.8, 0.8, 0.8) });
  page.drawText("SIGNED TERMS & CONDITIONS", { x: ML, y: H - 76, size: 8.5, font: boldFont, color: rgb(0.65, 0.65, 0.65) });
  y = H - 90 - 18;

  // ── Student details box ───────────────────────────────────────────────────
  page.drawRectangle({ x: ML, y: y - 56, width: TW, height: 56, color: rgb(0.97, 0.96, 0.94), borderColor: GOLD, borderOpacity: 0.3, borderWidth: 0.5 });
  const detailY = y - 15;
  page.drawText("Student Name",      { x: ML + 12, y: detailY,      size: LABEL_SIZE, font: boldFont, color: LIGHT });
  page.drawText(opts.studentName,    { x: ML + 12, y: detailY - 11, size: BODY_SIZE,  font: boldFont, color: DARK  });
  page.drawText("Submission ID",     { x: ML + TW / 2 + 10, y: detailY,      size: LABEL_SIZE, font: boldFont, color: LIGHT });
  page.drawText(`#${opts.submissionId}`, { x: ML + TW / 2 + 10, y: detailY - 11, size: BODY_SIZE, font, color: DARK });
  page.drawText("Date & Time Signed",{ x: ML + 12, y: detailY - 28, size: LABEL_SIZE, font: boldFont, color: LIGHT });
  page.drawText(opts.acceptedAt.toUTCString(), { x: ML + 12, y: detailY - 39, size: BODY_SIZE - 0.5, font, color: DARK });
  y -= 56 + 18;

  // ── Agreement statement ───────────────────────────────────────────────────
  page.drawRectangle({ x: ML, y: y - 30, width: TW, height: 30, color: rgb(0.945, 0.925, 0.89), borderColor: GOLD, borderOpacity: 0.4, borderWidth: 0.5 });
  page.drawText("I have read, understood, and agree to the Terms and Conditions set out below.", {
    x: ML + 12, y: y - 12, size: BODY_SIZE, font: boldFont, color: rgb(0.3, 0.2, 0.05),
  });
  page.drawText("This document was electronically signed via the Harrowgate Client Portal.", {
    x: ML + 12, y: y - 23, size: 7, font, color: LIGHT,
  });
  y -= 30 + 14;
  hRule(0.2); y -= 18;

  // ── T&C body ──────────────────────────────────────────────────────────────
  const lines = TERMS_TEXT.split("\n");
  for (const line of lines) {
    if (line.trim() === "") { y -= BODY_LH * 0.5; continue; }
    const isHeading = /^\d+\./.test(line) || line === "IMPORTANT DISCLAIMER";
    const isSubhead = /^\d+\.\d+/.test(line);
    if (isHeading && !isSubhead) {
      ensureSpace(BODY_LH * 2);
      y -= 4;
      drawWrapped(line, { font: boldFont, size: BODY_SIZE + 0.5, color: NAVY });
      y -= 2;
    } else if (isSubhead) {
      drawWrapped(line, { font: boldFont, size: BODY_SIZE, color: DARK });
    } else {
      drawWrapped(line, { font, size: BODY_SIZE, color: DARK });
    }
  }

  // ── Signature section ─────────────────────────────────────────────────────
  ensureSpace(160);
  y -= 16;
  hRule(0.3); y -= 14;
  page.drawText("ELECTRONIC SIGNATURE", { x: ML, y, size: LABEL_SIZE + 0.5, font: boldFont, color: NAVY });
  y -= 14;

  const base64 = opts.signatureDataUrl.replace(/^data:image\/png;base64,/, "");
  const sigBytes = Buffer.from(base64, "base64");
  const sigImg   = await pdfDoc.embedPng(sigBytes);
  const sigDims  = sigImg.scale(1);
  const maxSigW  = 220;
  const maxSigH  = 80;
  const scale    = Math.min(maxSigW / sigDims.width, maxSigH / sigDims.height, 1);
  const sigW     = sigDims.width  * scale;
  const sigH     = sigDims.height * scale;

  ensureSpace(sigH + 30);
  page.drawRectangle({ x: ML, y: y - sigH - 10, width: sigW + 20, height: sigH + 10, color: rgb(0.98, 0.98, 0.98), borderColor: GOLD, borderOpacity: 0.3, borderWidth: 0.5 });
  page.drawImage(sigImg, { x: ML + 10, y: y - sigH - 5, width: sigW, height: sigH });
  y -= sigH + 14;
  page.drawText(`Signed electronically on ${opts.acceptedAt.toUTCString()}`, { x: ML, y, size: 7, font, color: LIGHT });
  y -= 10;
  page.drawText(`Submission ID: #${opts.submissionId}  |  Name: ${opts.studentName}`, { x: ML, y, size: 7, font, color: LIGHT });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

const requireStudentAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.clerkUserId = userId;
  next();
};

router.get("/student/submissions/me", requireStudentAuth, async (req: any, res) => {
  try {
    // Primary lookup by Clerk user ID
    let [submission] = await db.select().from(studentSubmissionsTable)
      .where(eq(studentSubmissionsTable.clerkUserId, req.clerkUserId)).limit(1);

    // Fallback: if not found by clerkUserId, try matching by email
    // (handles case where admin submitted on behalf of the student)
    if (!submission) {
      const email = req.query.email as string | undefined;
      if (email) {
        const [byEmail] = await db.select().from(studentSubmissionsTable)
          .where(eq(studentSubmissionsTable.email, email)).limit(1);
        if (byEmail) {
          // Link this submission to the student's actual Clerk account
          const [linked] = await db.update(studentSubmissionsTable)
            .set({ clerkUserId: req.clerkUserId })
            .where(eq(studentSubmissionsTable.id, byEmail.id))
            .returning();
          submission = linked;
        }
      }
    }

    if (!submission) return res.json(null);
    const documents = await db.select().from(studentDocumentsTable).where(eq(studentDocumentsTable.submissionId, submission.id));
    res.json({ ...submission, documents });
  } catch { res.status(500).json({ error: "Failed to fetch submission" }); }
});

router.post("/student/submissions", requireStudentAuth, async (req: any, res) => {
  try {
    const { name, dateOfBirth, passportNumber, email, preferredLevel, preferredCourse, preferredInstitution } = req.body;
    if (!name || !dateOfBirth || !passportNumber) return res.status(400).json({ error: "Name, date of birth, and passport number are required" });
    const existing = await db.select().from(studentSubmissionsTable)
      .where(eq(studentSubmissionsTable.clerkUserId, req.clerkUserId)).limit(1);
    if (existing.length > 0) {
      const [updated] = await db.update(studentSubmissionsTable).set({ name, dateOfBirth, passportNumber, email, preferredLevel, preferredCourse, preferredInstitution })
        .where(eq(studentSubmissionsTable.clerkUserId, req.clerkUserId)).returning();
      return res.json(updated);
    }
    const [created] = await db.insert(studentSubmissionsTable)
      .values({ clerkUserId: req.clerkUserId, name, dateOfBirth, passportNumber, email, preferredLevel, preferredCourse, preferredInstitution }).returning();
    sendNewApplicationEmail({ name, email: email || null, passportNumber, dateOfBirth, docCount: 0 }).catch(() => {});
    // WhatsApp notification via CallMeBot (set CALLMEBOT_API_KEY secret to enable)
    const waKey = process.env.CALLMEBOT_API_KEY;
    if (waKey) {
      const waText = encodeURIComponent(`🔔 New Harrowgate Application!\nStudent: ${name}\nPassport: ${passportNumber}\nEmail: ${email || "N/A"}\n\nLogin to admin panel to review.`);
      fetch(`https://api.callmebot.com/whatsapp.php?phone=85261590422&text=${waText}&apikey=${waKey}`)
        .catch(() => {});
    }
    // Fire-and-forget: create Drive folder + add Sheets row
    (async () => {
      try {
        const driveFolderUrl = await ensureStudentFolder(created.id, created.name);
        await upsertStudentRow({ ...created, driveFolderUrl });
      } catch (err) { console.error("[Google] sync on create failed:", err); }
    })();
    res.status(201).json(created);
  } catch { res.status(500).json({ error: "Failed to create submission" }); }
});

router.post("/student/submissions/:id/documents", requireStudentAuth, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(and(eq(studentSubmissionsTable.id, submissionId), eq(studentSubmissionsTable.clerkUserId, req.clerkUserId))).limit(1);
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    const { documentType, fileName, fileUrl, fileSize, mimeType } = req.body;
    const existing = await db.select().from(studentDocumentsTable)
      .where(and(eq(studentDocumentsTable.submissionId, submissionId), eq(studentDocumentsTable.documentType, documentType)));
    if (existing.length > 0) {
      const [updated] = await db.update(studentDocumentsTable).set({ fileName, fileUrl, fileSize, mimeType })
        .where(and(eq(studentDocumentsTable.submissionId, submissionId), eq(studentDocumentsTable.documentType, documentType))).returning();
      return res.json(updated);
    }
    const [doc] = await db.insert(studentDocumentsTable).values({ submissionId, documentType, fileName, fileUrl, fileSize, mimeType }).returning();
    if (documentType === "edu_5") {
      const allDocs = await db.select().from(studentDocumentsTable).where(eq(studentDocumentsTable.submissionId, submissionId));
      sendNewApplicationEmail({ name: submission.name, email: submission.email, passportNumber: submission.passportNumber, dateOfBirth: submission.dateOfBirth, docCount: allDocs.length }).catch(() => {});
    }
    uploadToMega({ submissionId, studentName: submission.name, fileName, fileUrl, documentType }).catch(() => {});
    res.status(201).json(doc);
  } catch { res.status(500).json({ error: "Failed to save document" }); }
});

// Student deletes their own document (only when docs_requested)
router.delete("/student/submissions/:id/documents/:docId", requireStudentAuth, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const docId = parseInt(req.params.docId);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(and(eq(studentSubmissionsTable.id, submissionId), eq(studentSubmissionsTable.clerkUserId, req.clerkUserId))).limit(1);
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    if (!["docs_requested", "pending"].includes(submission.status)) {
      return res.status(400).json({ error: "Cannot delete documents at this stage" });
    }
    const [doc] = await db.select().from(studentDocumentsTable)
      .where(and(eq(studentDocumentsTable.id, docId), eq(studentDocumentsTable.submissionId, submissionId))).limit(1);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    if (doc.documentType.startsWith("admin_")) return res.status(403).json({ error: "Cannot delete admin documents" });
    await db.delete(studentDocumentsTable).where(eq(studentDocumentsTable.id, docId));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete document" }); }
});

// Student re-submits after docs_requested
router.post("/student/submissions/:id/resubmit", requireStudentAuth, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(and(eq(studentSubmissionsTable.id, submissionId), eq(studentSubmissionsTable.clerkUserId, req.clerkUserId))).limit(1);
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    if (submission.status !== "docs_requested") return res.status(400).json({ error: "Submission is not awaiting resubmission" });
    const [updated] = await db.update(studentSubmissionsTable).set({ status: "pending", adminNotes: null })
      .where(eq(studentSubmissionsTable.id, submissionId)).returning();
    const allDocs = await db.select().from(studentDocumentsTable).where(eq(studentDocumentsTable.submissionId, submissionId));
    sendResubmitEmail({
      name: submission.name,
      email: submission.email,
      passportNumber: submission.passportNumber,
      dateOfBirth: submission.dateOfBirth,
      docCount: allDocs.length,
      submissionId,
    }).catch(() => {});
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to resubmit" }); }
});

// View a student's own document inline
router.get("/student/submissions/:id/documents/:docId/view", requireStudentAuth, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const docId = parseInt(req.params.docId);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(and(eq(studentSubmissionsTable.id, submissionId), eq(studentSubmissionsTable.clerkUserId, req.clerkUserId))).limit(1);
    if (!submission) return res.status(403).json({ error: "Forbidden" });
    const [doc] = await db.select().from(studentDocumentsTable)
      .where(and(eq(studentDocumentsTable.id, docId), eq(studentDocumentsTable.submissionId, submissionId))).limit(1);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    const objectFile = await objectStorageService.getObjectEntityFile(doc.fileUrl);
    const response = await objectStorageService.downloadObject(objectFile, 0);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.fileName)}"`);
    response.headers.forEach((value: string, key: string) => {
      if (key.toLowerCase() !== "content-disposition") res.setHeader(key, value);
    });
    res.status(response.status);
    if (response.body) {
      Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
    } else { res.end(); }
  } catch (err) {
    if (err instanceof ObjectNotFoundError) return res.status(404).json({ error: "File not found" });
    res.status(500).json({ error: "Failed to view document" });
  }
});

// Student marks university interview as completed
router.post("/student/submissions/:id/complete-university-interview", requireStudentAuth, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(and(eq(studentSubmissionsTable.id, submissionId), eq(studentSubmissionsTable.clerkUserId, req.clerkUserId))).limit(1);
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    if (submission.status !== "university_interview_arranged") return res.status(400).json({ error: "Interview not yet arranged" });
    const [updated] = await db.update(studentSubmissionsTable)
      .set({ status: "university_interview_completed" })
      .where(eq(studentSubmissionsTable.id, submissionId)).returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to complete university interview" }); }
});

router.post("/student/submissions/:id/accept-terms", requireStudentAuth, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(and(eq(studentSubmissionsTable.id, submissionId), eq(studentSubmissionsTable.clerkUserId, req.clerkUserId))).limit(1);
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    if (submission.termsAcceptedAt) return res.status(400).json({ error: "Terms already accepted" });
    const { signatureData } = req.body;
    if (!signatureData || typeof signatureData !== "string" || !signatureData.startsWith("data:image/")) {
      return res.status(400).json({ error: "Valid signature image required" });
    }
    const acceptedAt = new Date();
    const [updated] = await db.update(studentSubmissionsTable)
      .set({ termsAcceptedAt: acceptedAt, termsSignatureUrl: signatureData })
      .where(eq(studentSubmissionsTable.id, submissionId))
      .returning();

    // Generate and store signed T&C PDF asynchronously (non-blocking)
    const studentName = `${submission.firstName ?? ""} ${submission.lastName ?? ""}`.trim() || "Student";
    const host = req.get("host") || "localhost";
    generateSignedTermsPDF({ submissionId, studentName, acceptedAt, signatureDataUrl: signatureData })
      .then(async (pdfBuf) => {
        const objectPath = await uploadBufferToStorage(pdfBuf, "application/pdf", host);
        await db.insert(studentDocumentsTable).values({
          submissionId,
          documentType: "signed_terms",
          fileName: `Signed_Terms_${submissionId}_${acceptedAt.toISOString().slice(0, 10)}.pdf`,
          fileUrl: objectPath,
          fileSize: pdfBuf.length,
          mimeType: "application/pdf",
        });
      })
      .catch((err) => { console.error("[accept-terms] PDF generation failed:", err); });

    res.json({ termsAcceptedAt: updated.termsAcceptedAt });
  } catch { res.status(500).json({ error: "Failed to accept terms" }); }
});

router.post("/student/submissions/:id/receipt", requireStudentAuth, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(and(eq(studentSubmissionsTable.id, submissionId), eq(studentSubmissionsTable.clerkUserId, req.clerkUserId))).limit(1);
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    if (submission.status !== "payment_pending") return res.status(400).json({ error: "Submission is not awaiting payment" });
    const { fileName, fileUrl, fileSize, mimeType } = req.body;
    await db.delete(studentDocumentsTable)
      .where(and(eq(studentDocumentsTable.submissionId, submissionId), eq(studentDocumentsTable.documentType, "payment_receipt")));
    const [doc] = await db.insert(studentDocumentsTable)
      .values({ submissionId, documentType: "payment_receipt", fileName, fileUrl, fileSize, mimeType }).returning();
    await db.update(studentSubmissionsTable).set({ status: "payment_received" }).where(eq(studentSubmissionsTable.id, submissionId));
    sendReceiptUploadEmail({ name: submission.name, email: submission.email, passportNumber: submission.passportNumber, receiptFileName: fileName, submissionId }).catch(() => {});
    uploadToMega({ submissionId, studentName: submission.name, fileName, fileUrl, documentType: "payment_receipt" }).catch(() => {});
    res.json(doc);
  } catch { res.status(500).json({ error: "Failed to upload receipt" }); }
});

// Student submits additional documents (when additionalDocsRequested is true)
router.post("/student/submissions/:id/additional-docs", requireStudentAuth, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(and(eq(studentSubmissionsTable.id, submissionId), eq(studentSubmissionsTable.clerkUserId, req.clerkUserId))).limit(1);
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    if (!submission.additionalDocsRequested) return res.status(400).json({ error: "No additional documents have been requested" });
    const { fileName, fileUrl, fileSize, mimeType, note } = req.body;
    if (!fileName || !fileUrl) return res.status(400).json({ error: "fileName and fileUrl are required" });
    const [doc] = await db.insert(studentDocumentsTable)
      .values({ submissionId, documentType: "additional_doc", fileName, fileUrl, fileSize, mimeType }).returning();
    await db.update(studentSubmissionsTable)
      .set({ additionalDocsRequested: false, additionalDocsRequestNote: null })
      .where(eq(studentSubmissionsTable.id, submissionId));
    sendAdditionalDocsSubmittedEmail({ name: submission.name, email: submission.email, passportNumber: submission.passportNumber, note: note || undefined, fileName, submissionId }).catch(() => {});
    uploadToMega({ submissionId, studentName: submission.name, fileName, fileUrl, documentType: "additional_doc" }).catch(() => {});
    res.json(doc);
  } catch { res.status(500).json({ error: "Failed to submit additional docs" }); }
});

// Student views a document inline (gated: offer_letter requires final_payment_confirmed)
router.get("/student/submissions/:id/documents/:docId/view", requireStudentAuth, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const docId = parseInt(req.params.docId);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(and(eq(studentSubmissionsTable.id, submissionId), eq(studentSubmissionsTable.clerkUserId, req.clerkUserId))).limit(1);
    if (!submission) return res.status(403).json({ error: "Forbidden" });
    const [doc] = await db.select().from(studentDocumentsTable)
      .where(and(eq(studentDocumentsTable.id, docId), eq(studentDocumentsTable.submissionId, submissionId))).limit(1);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    if (doc.documentType === "offer_letter" && submission.status !== "final_payment_confirmed") {
      return res.status(403).json({ error: "Final payment must be confirmed before viewing the offer letter" });
    }
    const { Readable } = await import("stream");
    const objectFile = await objectStorageService.getObjectEntityFile(doc.fileUrl);
    const response = await objectStorageService.downloadObject(objectFile, 0);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.fileName)}"`);
    response.headers.forEach((value: string, key: string) => {
      if (key.toLowerCase() !== "content-disposition") res.setHeader(key, value);
    });
    res.status(response.status);
    if (response.body) { Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res); } else { res.end(); }
  } catch (err) {
    if ((err as any)?.constructor?.name === "ObjectNotFoundError") return res.status(404).json({ error: "File not found" });
    res.status(500).json({ error: "Failed to view document" });
  }
});

// Student downloads a document (gated: offer_letter requires final_payment_confirmed)
router.get("/student/submissions/:id/documents/:docId/download", requireStudentAuth, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const docId = parseInt(req.params.docId);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(and(eq(studentSubmissionsTable.id, submissionId), eq(studentSubmissionsTable.clerkUserId, req.clerkUserId))).limit(1);
    if (!submission) return res.status(403).json({ error: "Forbidden" });
    const [doc] = await db.select().from(studentDocumentsTable)
      .where(and(eq(studentDocumentsTable.id, docId), eq(studentDocumentsTable.submissionId, submissionId))).limit(1);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    if (doc.documentType === "offer_letter" && submission.status !== "final_payment_confirmed") {
      return res.status(403).json({ error: "Final payment must be confirmed before downloading the offer letter" });
    }
    const { Readable } = await import("stream");
    const objectFile = await objectStorageService.getObjectEntityFile(doc.fileUrl);
    const response = await objectStorageService.downloadObject(objectFile, 0);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.fileName)}"`);
    response.headers.forEach((value: string, key: string) => {
      if (key.toLowerCase() !== "content-disposition") res.setHeader(key, value);
    });
    res.status(response.status);
    if (response.body) { Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res); } else { res.end(); }
  } catch (err) {
    if ((err as any)?.constructor?.name === "ObjectNotFoundError") return res.status(404).json({ error: "File not found" });
    res.status(500).json({ error: "Failed to download document" });
  }
});

router.post("/student/submissions/:id/receipt2", requireStudentAuth, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(and(eq(studentSubmissionsTable.id, submissionId), eq(studentSubmissionsTable.clerkUserId, req.clerkUserId))).limit(1);
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    if (submission.status !== "second_payment_pending") return res.status(400).json({ error: "Submission is not awaiting 2nd payment" });
    const { fileName, fileUrl, fileSize, mimeType } = req.body;
    await db.delete(studentDocumentsTable)
      .where(and(eq(studentDocumentsTable.submissionId, submissionId), eq(studentDocumentsTable.documentType, "second_payment_receipt")));
    const [doc] = await db.insert(studentDocumentsTable)
      .values({ submissionId, documentType: "second_payment_receipt", fileName, fileUrl, fileSize, mimeType }).returning();
    await db.update(studentSubmissionsTable).set({ status: "second_payment_received" }).where(eq(studentSubmissionsTable.id, submissionId));
    sendSecondReceiptUploadEmail({ name: submission.name, email: submission.email, passportNumber: submission.passportNumber, receiptFileName: fileName, submissionId }).catch(() => {});
    uploadToMega({ submissionId, studentName: submission.name, fileName, fileUrl, documentType: "second_payment_receipt" }).catch(() => {});
    res.json(doc);
  } catch { res.status(500).json({ error: "Failed to upload 2nd receipt" }); }
});

router.post("/student/submissions/:id/receipt3", requireStudentAuth, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(and(eq(studentSubmissionsTable.id, submissionId), eq(studentSubmissionsTable.clerkUserId, req.clerkUserId))).limit(1);
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    if (submission.status !== "offer_letter_pending") return res.status(400).json({ error: "Submission is not awaiting final payment" });
    const { fileName, fileUrl, fileSize, mimeType } = req.body;
    await db.delete(studentDocumentsTable)
      .where(and(eq(studentDocumentsTable.submissionId, submissionId), eq(studentDocumentsTable.documentType, "final_payment_receipt")));
    const [doc] = await db.insert(studentDocumentsTable)
      .values({ submissionId, documentType: "final_payment_receipt", fileName, fileUrl, fileSize, mimeType }).returning();
    await db.update(studentSubmissionsTable).set({ status: "final_payment_received" }).where(eq(studentSubmissionsTable.id, submissionId));
    sendFinalReceiptEmail({ name: submission.name, email: submission.email, passportNumber: submission.passportNumber, receiptFileName: fileName, submissionId }).catch(() => {});
    uploadToMega({ submissionId, studentName: submission.name, fileName, fileUrl, documentType: "final_payment_receipt" }).catch(() => {});
    res.json(doc);
  } catch { res.status(500).json({ error: "Failed to upload final payment receipt" }); }
});

// Student: get messages for their submission
router.get("/student/submissions/:id/messages", requireStudentAuth, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(and(eq(studentSubmissionsTable.id, submissionId), eq(studentSubmissionsTable.clerkUserId, req.clerkUserId))).limit(1);
    if (!submission) return res.status(404).json({ error: "Not found" });
    // Mark unread admin messages as read
    await db.update(studentMessagesTable)
      .set({ isRead: true })
      .where(and(eq(studentMessagesTable.submissionId, submissionId), eq(studentMessagesTable.fromAdmin, true), eq(studentMessagesTable.isRead, false)));
    const messages = await db.select().from(studentMessagesTable)
      .where(eq(studentMessagesTable.submissionId, submissionId))
      .orderBy(studentMessagesTable.createdAt);
    res.json(messages);
  } catch { res.status(500).json({ error: "Failed to fetch messages" }); }
});

// Student: reply to a message
router.post("/student/submissions/:id/messages/reply", requireStudentAuth, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(and(eq(studentSubmissionsTable.id, submissionId), eq(studentSubmissionsTable.clerkUserId, req.clerkUserId))).limit(1);
    if (!submission) return res.status(404).json({ error: "Not found" });
    const { body, attachments, subject } = req.body;
    if (!body?.trim() && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: "Message or attachment required" });
    }
    const [msg] = await db.insert(studentMessagesTable).values({
      submissionId,
      fromAdmin: false,
      subject: subject || "Student Reply",
      body: body?.trim() || "",
      attachments: attachments || [],
      isRead: false,
    }).returning();
    sendStudentReplyNotificationEmail({
      name: submission.name,
      email: submission.email,
      subject: msg.subject || "Student Reply",
      body: body?.trim() || "(see attachment)",
      submissionId,
    }).catch(() => {});
    res.json(msg);
  } catch { res.status(500).json({ error: "Failed to send reply" }); }
});

// ─── Inbox: list emails ──────────────────────────────────────────────────────
router.get("/student/submissions/:id/inbox", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const submissionId = Number(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(and(eq(studentSubmissionsTable.id, submissionId), eq(studentSubmissionsTable.clerkUserId, userId))).limit(1);
    if (!submission) return res.status(404).json({ error: "Not found" });
    if (!submission.sharedEmail || !submission.sharedEmailPassword) {
      return res.json([]);
    }
    const refresh = req.query.refresh === "1";
    const emails = await listInboxEmails(submission.sharedEmail, submission.sharedEmailPassword, 50, refresh);
    res.json(emails);
  } catch (err: any) {
    console.error("[inbox] error:", err?.code, err?.message);
    res.status(500).json({ error: err?.message ?? "Failed to fetch inbox" });
  }
});

// ─── Inbox: get single email ─────────────────────────────────────────────────
router.get("/student/submissions/:id/inbox/:uid", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const submissionId = Number(req.params.id);
    const uid = Number(req.params.uid);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(and(eq(studentSubmissionsTable.id, submissionId), eq(studentSubmissionsTable.clerkUserId, userId))).limit(1);
    if (!submission) return res.status(404).json({ error: "Not found" });
    if (!submission.sharedEmail || !submission.sharedEmailPassword) {
      return res.status(400).json({ error: "No inbox configured" });
    }
    // Invalidate list cache so unread count refreshes next time
    invalidateCache(submission.sharedEmail);
    const detail = await getEmailDetail(submission.sharedEmail, submission.sharedEmailPassword, uid);
    if (!detail) return res.status(404).json({ error: "Email not found" });
    res.json(detail);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to fetch email" });
  }
});

// ─── Outbox: student composes email (saved as pending) ───────────────────────
router.post("/student/submissions/:id/outbox", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const submissionId = Number(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(and(eq(studentSubmissionsTable.id, submissionId), eq(studentSubmissionsTable.clerkUserId, userId))).limit(1);
    if (!submission) return res.status(404).json({ error: "Not found" });
    const { to, subject, body } = req.body;
    if (!to || !subject || !body) return res.status(400).json({ error: "to, subject, body required" });
    const [outbox] = await db.insert(studentOutboxTable).values({
      submissionId,
      toAddress: to.trim(),
      subject: subject.trim(),
      body: body.trim(),
      status: "pending",
    }).returning();
    // Notify admin silently — student doesn't know about this step
    sendOutboxPendingNotification({
      name: submission.name,
      studentEmail: submission.email,
      submissionId,
      to: to.trim(),
      subject: subject.trim(),
      body: body.trim(),
    }).catch(() => {});
    res.json({ id: outbox.id, status: "sent" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to send" });
  }
});

// ─── Outbox: list student's sent emails ──────────────────────────────────────
router.get("/student/submissions/:id/outbox", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const submissionId = Number(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(and(eq(studentSubmissionsTable.id, submissionId), eq(studentSubmissionsTable.clerkUserId, userId))).limit(1);
    if (!submission) return res.status(404).json({ error: "Not found" });
    const { desc } = await import("drizzle-orm");
    const items = await db.select().from(studentOutboxTable)
      .where(eq(studentOutboxTable.submissionId, submissionId))
      .orderBy(desc(studentOutboxTable.createdAt));
    // Return status as "sent" to the student always — never reveal "pending"
    const masked = items.map(i => ({ ...i, status: "sent" }));
    res.json(masked);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to fetch outbox" });
  }
});

export default router;
