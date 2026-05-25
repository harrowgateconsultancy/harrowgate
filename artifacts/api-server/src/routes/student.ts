import { Router } from "express";
import { Readable } from "stream";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { studentSubmissionsTable, studentDocumentsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { sendNewApplicationEmail, sendReceiptUploadEmail } from "../email";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

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
    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(eq(studentSubmissionsTable.clerkUserId, req.clerkUserId)).limit(1);
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

export default router;
