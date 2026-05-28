import { Router } from "express";
import { Readable } from "stream";
import { db } from "@workspace/db";
import {
  studentSubmissionsTable,
  studentDocumentsTable,
  studentMessagesTable,
} from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { sendApprovalEmail, sendDocsRequestedEmail, sendInterviewInviteEmail, sendUniversityInterviewInviteEmail, sendAdditionalDocsRequestEmail, sendOfferLetterAvailableEmail, sendOfferLetterConfirmedEmail, sendCustomMessageToStudentEmail, sendEVisaReadyEmail } from "../email";

const router = Router();
const objectStorageService = new ObjectStorageService();

const VALID_STATUSES = [
  "pending", "approved", "payment_pending", "payment_received",
  "acknowledged", "rejected", "docs_requested",
  "interview_arranged", "interview_completed",
  "second_payment_pending", "second_payment_received", "second_payment_confirmed",
  "university_interview_arranged", "university_interview_completed",
  "offer_letter_pending", "final_payment_received", "final_payment_confirmed",
  "visa_issued",
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
    if (status === "final_payment_confirmed" && updated.email) {
      (async () => {
        try {
          const [offerDoc] = await db.select().from(studentDocumentsTable)
            .where(and(eq(studentDocumentsTable.submissionId, id), eq(studentDocumentsTable.documentType, "offer_letter"))).limit(1);
          if (!offerDoc) return;
          const objectFile = await objectStorageService.getObjectEntityFile(offerDoc.fileUrl);
          const response = await objectStorageService.downloadObject(objectFile, 0);
          const arrayBuf = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          await sendOfferLetterConfirmedEmail({
            name: updated.name, studentEmail: updated.email!,
            attachment: { content: buffer, filename: offerDoc.fileName, contentType: offerDoc.mimeType || "application/pdf" },
            portalUrl,
          });
        } catch (err) { console.error("[email] Failed to send offer letter with attachment:", err); }
      })();
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

// Request additional documents from student
router.post("/admin/student-submissions/:id/request-additional-docs", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { note } = req.body;
    const [submission] = await db.select().from(studentSubmissionsTable).where(eq(studentSubmissionsTable.id, id)).limit(1);
    if (!submission) return res.status(404).json({ error: "Not found" });
    const [updated] = await db.update(studentSubmissionsTable)
      .set({ additionalDocsRequested: true, additionalDocsRequestNote: note || null })
      .where(eq(studentSubmissionsTable.id, id)).returning();
    const portalUrl = `https://${process.env.REPLIT_DEV_DOMAIN || "localhost"}/portal`;
    if (submission.email) {
      sendAdditionalDocsRequestEmail({ name: submission.name, studentEmail: submission.email, note: note || undefined, portalUrl }).catch(() => {});
    }
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to request additional docs" }); }
});

// Upload offer letter — sets status to offer_letter_pending
router.post("/admin/student-submissions/:id/upload-offer-letter", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { fileName, fileUrl, fileSize, mimeType } = req.body;
    if (!fileName || !fileUrl) return res.status(400).json({ error: "fileName and fileUrl are required" });
    const [submission] = await db.select().from(studentSubmissionsTable).where(eq(studentSubmissionsTable.id, id)).limit(1);
    if (!submission) return res.status(404).json({ error: "Not found" });
    await db.delete(studentDocumentsTable)
      .where(and(eq(studentDocumentsTable.submissionId, id), eq(studentDocumentsTable.documentType, "offer_letter")));
    await db.insert(studentDocumentsTable).values({ submissionId: id, documentType: "offer_letter", fileName, fileUrl, fileSize, mimeType });
    const [updated] = await db.update(studentSubmissionsTable)
      .set({ status: "offer_letter_pending" })
      .where(eq(studentSubmissionsTable.id, id)).returning();
    const portalUrl = `https://${process.env.REPLIT_DEV_DOMAIN || "localhost"}/portal`;
    if (submission.email) {
      sendOfferLetterAvailableEmail({ name: submission.name, studentEmail: submission.email, portalUrl }).catch(() => {});
    }
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to upload offer letter" }); }
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

// Admin sends a message to a student
router.post("/admin/student-submissions/:id/messages", async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const { subject, body, attachments } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: "Message body required" });
    const [submission] = await db.select().from(studentSubmissionsTable).where(eq(studentSubmissionsTable.id, submissionId)).limit(1);
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    const [msg] = await db.insert(studentMessagesTable).values({
      submissionId,
      fromAdmin: true,
      subject: subject?.trim() || "Message from HARROWGATE",
      body: body.trim(),
      attachments: attachments || [],
      isRead: false,
    }).returning();
    const portalUrl = `https://${process.env.REPLIT_DEV_DOMAIN || "localhost"}/portal`;
    if (submission.email) {
      sendCustomMessageToStudentEmail({
        name: submission.name,
        studentEmail: submission.email,
        subject: msg.subject || "Message from HARROWGATE",
        body: body.trim(),
        portalUrl,
      }).catch(() => {});
    }
    res.json(msg);
  } catch { res.status(500).json({ error: "Failed to send message" }); }
});

// Upload e-visa — sets status to visa_issued and notifies student
router.post("/admin/student-submissions/:id/upload-evisa", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { fileName, fileUrl, fileSize, mimeType } = req.body;
    if (!fileName || !fileUrl) return res.status(400).json({ error: "fileName and fileUrl are required" });
    const [submission] = await db.select().from(studentSubmissionsTable).where(eq(studentSubmissionsTable.id, id)).limit(1);
    if (!submission) return res.status(404).json({ error: "Not found" });
    await db.delete(studentDocumentsTable)
      .where(and(eq(studentDocumentsTable.submissionId, id), eq(studentDocumentsTable.documentType, "evisa")));
    await db.insert(studentDocumentsTable).values({ submissionId: id, documentType: "evisa", fileName, fileUrl, fileSize, mimeType });
    const [updated] = await db.update(studentSubmissionsTable)
      .set({ status: "visa_issued" })
      .where(eq(studentSubmissionsTable.id, id)).returning();
    const portalUrl = `https://${process.env.REPLIT_DEV_DOMAIN || "localhost"}/portal`;
    if (submission.email) {
      sendEVisaReadyEmail({ name: submission.name, studentEmail: submission.email, portalUrl }).catch(() => {});
    }
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to upload e-visa" }); }
});

// Admin sets immigration reference number
router.patch("/admin/student-submissions/:id/immigration-ref", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { immigrationRefNumber } = req.body;
    const [updated] = await db
      .update(studentSubmissionsTable)
      .set({ immigrationRefNumber: immigrationRefNumber || null })
      .where(eq(studentSubmissionsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to update immigration ref" }); }
});

// Admin lists messages for a submission
router.get("/admin/student-submissions/:id/messages", async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const messages = await db.select().from(studentMessagesTable)
      .where(eq(studentMessagesTable.submissionId, submissionId))
      .orderBy(studentMessagesTable.createdAt);
    res.json(messages);
  } catch { res.status(500).json({ error: "Failed to fetch messages" }); }
});

export default router;
