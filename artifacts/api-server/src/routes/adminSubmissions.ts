import { Router } from "express";
import { Readable } from "stream";
import { db } from "@workspace/db";
import {
  studentSubmissionsTable,
  studentDocumentsTable,
} from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { sendApprovalEmail, sendDocsRequestedEmail, sendInterviewInviteEmail, sendUniversityInterviewInviteEmail } from "../email";

const router = Router();
const objectStorageService = new ObjectStorageService();

const VALID_STATUSES = [
  "pending", "approved", "payment_pending", "payment_received",
  "acknowledged", "rejected", "docs_requested",
  "interview_arranged", "interview_completed",
  "second_payment_pending", "second_payment_received", "second_payment_confirmed",
  "university_interview_arranged", "university_interview_completed",
];

router.get("/admin/student-submissions", async (_req, res) => {
  try {
    const submissions = await db.select().from(studentSubmissionsTable).orderBy(desc(studentSubmissionsTable.createdAt));
    const withDocs = await Promise.all(submissions.map(async (s) => {
      const documents = await db.select().from(studentDocumentsTable).where(eq(studentDocumentsTable.submissionId, s.id));
      return { ...s, documents };
    }));
    res.json(withDocs);
  } catch { res.status(500).json({ error: "Failed to fetch submissions" }); }
});

router.get("/admin/student-submissions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable).where(eq(studentSubmissionsTable.id, id)).limit(1);
    if (!submission) return res.status(404).json({ error: "Not found" });
    const documents = await db.select().from(studentDocumentsTable).where(eq(studentDocumentsTable.submissionId, id));
    res.json({ ...submission, documents });
  } catch { res.status(500).json({ error: "Failed to fetch submission" }); }
});

router.patch("/admin/student-submissions/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, adminNotes } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const [updated] = await db
      .update(studentSubmissionsTable)
      .set({ status, adminNotes })
      .where(eq(studentSubmissionsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });

    const portalUrl = `https://${process.env.REPLIT_DEV_DOMAIN || "localhost"}/portal`;

    if (status === "approved" && updated.email) {
      sendApprovalEmail({ name: updated.name, studentEmail: updated.email, portalUrl }).catch(() => {});
    }
    if (status === "docs_requested" && updated.email) {
      sendDocsRequestedEmail({ name: updated.name, studentEmail: updated.email, adminNotes: adminNotes || undefined, portalUrl }).catch(() => {});
    }

    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to update status" }); }
});

// Send mock interview invite + update status to interview_arranged
router.post("/admin/student-submissions/:id/send-interview-invite", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { zoomLink, dateTime, notes } = req.body;
    if (!zoomLink || !dateTime) return res.status(400).json({ error: "zoomLink and dateTime are required" });

    const [submission] = await db.select().from(studentSubmissionsTable).where(eq(studentSubmissionsTable.id, id)).limit(1);
    if (!submission) return res.status(404).json({ error: "Not found" });
    if (!submission.email) return res.status(400).json({ error: "Student has no email on record" });

    const [updated] = await db.update(studentSubmissionsTable)
      .set({ status: "interview_arranged", interviewZoomLink: zoomLink, interviewDateTime: dateTime })
      .where(eq(studentSubmissionsTable.id, id))
      .returning();

    const refCode = `STU${submission.passportNumber.slice(-4).toUpperCase()}`;
    await sendInterviewInviteEmail({
      name: submission.name,
      studentEmail: submission.email,
      zoomLink,
      dateTime,
      refCode,
      notes,
    });

    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to send interview invite" }); }
});

// Send university interview invite + update status
router.post("/admin/student-submissions/:id/send-university-interview-invite", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { link, platform, dateTime, notes } = req.body;
    if (!link || !platform || !dateTime) return res.status(400).json({ error: "link, platform, and dateTime are required" });
    if (!["zoom", "teams"].includes(platform)) return res.status(400).json({ error: "platform must be zoom or teams" });
    const [submission] = await db.select().from(studentSubmissionsTable).where(eq(studentSubmissionsTable.id, id)).limit(1);
    if (!submission) return res.status(404).json({ error: "Not found" });
    if (!submission.email) return res.status(400).json({ error: "Student has no email on record" });
    const [updated] = await db.update(studentSubmissionsTable)
      .set({ status: "university_interview_arranged", uniInterviewLink: link, uniInterviewDateTime: dateTime, uniInterviewPlatform: platform })
      .where(eq(studentSubmissionsTable.id, id)).returning();
    const refCode = `STU${submission.passportNumber.slice(-4).toUpperCase()}`;
    await sendUniversityInterviewInviteEmail({
      name: submission.name, studentEmail: submission.email,
      link, platform, dateTime, refCode, notes,
    });
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to send university interview invite" }); }
});

// Admin marks interview as completed
router.post("/admin/student-submissions/:id/complete-interview", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable).where(eq(studentSubmissionsTable.id, id)).limit(1);
    if (!submission) return res.status(404).json({ error: "Not found" });
    if (submission.status !== "interview_arranged") return res.status(400).json({ error: "Interview not yet arranged" });

    const [updated] = await db.update(studentSubmissionsTable)
      .set({ status: "interview_completed" })
      .where(eq(studentSubmissionsTable.id, id))
      .returning();

    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to complete interview" }); }
});

// Download a document
router.get("/admin/student-submissions/:id/documents/:docId/download", async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const docId = parseInt(req.params.docId);
    const [doc] = await db.select().from(studentDocumentsTable)
      .where(and(eq(studentDocumentsTable.id, docId), eq(studentDocumentsTable.submissionId, submissionId))).limit(1);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    const objectFile = await objectStorageService.getObjectEntityFile(doc.fileUrl);
    const response = await objectStorageService.downloadObject(objectFile, 0);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.fileName)}"`);
    response.headers.forEach((value: string, key: string) => {
      if (key.toLowerCase() !== "content-disposition") res.setHeader(key, value);
    });
    res.status(response.status);
    if (response.body) { Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res); } else { res.end(); }
  } catch (err) {
    if (err instanceof ObjectNotFoundError) return res.status(404).json({ error: "File not found in storage" });
    res.status(500).json({ error: "Failed to download document" });
  }
});

// View/inline a document
router.get("/admin/student-submissions/:id/documents/:docId/view", async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const docId = parseInt(req.params.docId);
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
    if (response.body) { Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res); } else { res.end(); }
  } catch (err) {
    if (err instanceof ObjectNotFoundError) return res.status(404).json({ error: "File not found in storage" });
    res.status(500).json({ error: "Failed to view document" });
  }
});

// Admin attaches a document
router.post("/admin/student-submissions/:id/documents", async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable).where(eq(studentSubmissionsTable.id, submissionId)).limit(1);
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    const { documentType, fileName, fileUrl, fileSize, mimeType } = req.body;
    if (!documentType || !fileName || !fileUrl) return res.status(400).json({ error: "documentType, fileName, and fileUrl are required" });
    const [doc] = await db.insert(studentDocumentsTable).values({ submissionId, documentType, fileName, fileUrl, fileSize, mimeType }).returning();
    res.status(201).json(doc);
  } catch { res.status(500).json({ error: "Failed to attach document" }); }
});

// Admin deletes a document
router.delete("/admin/student-submissions/:id/documents/:docId", async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const docId = parseInt(req.params.docId);
    await db.delete(studentDocumentsTable).where(and(eq(studentDocumentsTable.id, docId), eq(studentDocumentsTable.submissionId, submissionId)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete document" }); }
});

export default router;
