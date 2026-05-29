import { Router } from "express";
import { Readable } from "stream";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { studentSubmissionsTable, studentDocumentsTable, studentMessagesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { sendNewApplicationEmail, sendReceiptUploadEmail, sendSecondReceiptUploadEmail, sendResubmitEmail, sendAdditionalDocsSubmittedEmail, sendFinalReceiptEmail, sendStudentReplyNotificationEmail } from "../email";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { ensureStudentFolder, upsertStudentRow, uploadDocumentToDrive } from "../lib/googleIntegration";

const router = Router();
const objectStorageService = new ObjectStorageService();

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
    const { name, dateOfBirth, passportNumber, email } = req.body;
    if (!name || !dateOfBirth || !passportNumber) return res.status(400).json({ error: "Name, date of birth, and passport number are required" });
    const existing = await db.select().from(studentSubmissionsTable)
      .where(eq(studentSubmissionsTable.clerkUserId, req.clerkUserId)).limit(1);
    if (existing.length > 0) {
      const [updated] = await db.update(studentSubmissionsTable).set({ name, dateOfBirth, passportNumber, email })
        .where(eq(studentSubmissionsTable.clerkUserId, req.clerkUserId)).returning();
      return res.json(updated);
    }
    const [created] = await db.insert(studentSubmissionsTable)
      .values({ clerkUserId: req.clerkUserId, name, dateOfBirth, passportNumber, email }).returning();
    sendNewApplicationEmail({ name, email: email || null, passportNumber, dateOfBirth, docCount: 0 }).catch(() => {});
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
      uploadDocumentToDrive({ submissionId, studentName: submission.name, documentType, fileName, fileUrl, mimeType })
        .catch(err => console.error("[Google Drive] doc update upload failed:", err));
      return res.json(updated);
    }
    const [doc] = await db.insert(studentDocumentsTable).values({ submissionId, documentType, fileName, fileUrl, fileSize, mimeType }).returning();
    if (documentType === "edu_5") {
      const allDocs = await db.select().from(studentDocumentsTable).where(eq(studentDocumentsTable.submissionId, submissionId));
      sendNewApplicationEmail({ name: submission.name, email: submission.email, passportNumber: submission.passportNumber, dateOfBirth: submission.dateOfBirth, docCount: allDocs.length }).catch(() => {});
    }
    // Fire-and-forget: upload doc to Drive folder
    uploadDocumentToDrive({
      submissionId,
      studentName: submission.name,
      documentType,
      fileName,
      fileUrl,
      mimeType,
    }).catch(err => console.error("[Google Drive] doc upload failed:", err));
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

export default router;
