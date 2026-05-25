import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  studentSubmissionsTable,
  studentDocumentsTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { sendNewApplicationEmail, sendReceiptUploadEmail } from "../email";

const router = Router();

const requireStudentAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.clerkUserId = userId;
  next();
};

router.get("/student/submissions/me", requireStudentAuth, async (req: any, res) => {
  try {
    const [submission] = await db
      .select()
      .from(studentSubmissionsTable)
      .where(eq(studentSubmissionsTable.clerkUserId, req.clerkUserId))
      .limit(1);
    if (!submission) return res.json(null);
    const documents = await db
      .select()
      .from(studentDocumentsTable)
      .where(eq(studentDocumentsTable.submissionId, submission.id));
    res.json({ ...submission, documents });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch submission" });
  }
});

router.post("/student/submissions", requireStudentAuth, async (req: any, res) => {
  try {
    const { name, dateOfBirth, passportNumber, email } = req.body;
    if (!name || !dateOfBirth || !passportNumber) {
      return res.status(400).json({ error: "Name, date of birth, and passport number are required" });
    }
    const existing = await db
      .select()
      .from(studentSubmissionsTable)
      .where(eq(studentSubmissionsTable.clerkUserId, req.clerkUserId))
      .limit(1);
    if (existing.length > 0) {
      const [updated] = await db
        .update(studentSubmissionsTable)
        .set({ name, dateOfBirth, passportNumber, email })
        .where(eq(studentSubmissionsTable.clerkUserId, req.clerkUserId))
        .returning();
      return res.json(updated);
    }
    const [created] = await db
      .insert(studentSubmissionsTable)
      .values({ clerkUserId: req.clerkUserId, name, dateOfBirth, passportNumber, email })
      .returning();

    // Fire-and-forget email — don't block the response
    sendNewApplicationEmail({
      name,
      email: email || null,
      passportNumber,
      dateOfBirth,
      docCount: 0,
    }).catch(() => {});

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: "Failed to create submission" });
  }
});

router.post("/student/submissions/:id/documents", requireStudentAuth, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [submission] = await db
      .select()
      .from(studentSubmissionsTable)
      .where(
        and(
          eq(studentSubmissionsTable.id, submissionId),
          eq(studentSubmissionsTable.clerkUserId, req.clerkUserId),
        ),
      )
      .limit(1);
    if (!submission) return res.status(404).json({ error: "Submission not found" });

    const { documentType, fileName, fileUrl, fileSize, mimeType } = req.body;
    const existing = await db
      .select()
      .from(studentDocumentsTable)
      .where(
        and(
          eq(studentDocumentsTable.submissionId, submissionId),
          eq(studentDocumentsTable.documentType, documentType),
        ),
      );
    if (existing.length > 0) {
      const [updated] = await db
        .update(studentDocumentsTable)
        .set({ fileName, fileUrl, fileSize, mimeType })
        .where(
          and(
            eq(studentDocumentsTable.submissionId, submissionId),
            eq(studentDocumentsTable.documentType, documentType),
          ),
        )
        .returning();
      return res.json(updated);
    }
    const [doc] = await db
      .insert(studentDocumentsTable)
      .values({ submissionId, documentType, fileName, fileUrl, fileSize, mimeType })
      .returning();

    // After all 5 docs are uploaded (edu_5 is the last one), send a complete notification
    if (documentType === "edu_5") {
      const allDocs = await db
        .select()
        .from(studentDocumentsTable)
        .where(eq(studentDocumentsTable.submissionId, submissionId));
      sendNewApplicationEmail({
        name: submission.name,
        email: submission.email,
        passportNumber: submission.passportNumber,
        dateOfBirth: submission.dateOfBirth,
        docCount: allDocs.length,
      }).catch(() => {});
    }

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: "Failed to save document" });
  }
});

router.post("/student/submissions/:id/receipt", requireStudentAuth, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [submission] = await db
      .select()
      .from(studentSubmissionsTable)
      .where(
        and(
          eq(studentSubmissionsTable.id, submissionId),
          eq(studentSubmissionsTable.clerkUserId, req.clerkUserId),
        ),
      )
      .limit(1);
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    if (submission.status !== "payment_pending") {
      return res.status(400).json({ error: "Submission is not awaiting payment" });
    }
    const { fileName, fileUrl, fileSize, mimeType } = req.body;
    await db
      .delete(studentDocumentsTable)
      .where(
        and(
          eq(studentDocumentsTable.submissionId, submissionId),
          eq(studentDocumentsTable.documentType, "payment_receipt"),
        ),
      );
    const [doc] = await db
      .insert(studentDocumentsTable)
      .values({ submissionId, documentType: "payment_receipt", fileName, fileUrl, fileSize, mimeType })
      .returning();
    await db
      .update(studentSubmissionsTable)
      .set({ status: "payment_received" })
      .where(eq(studentSubmissionsTable.id, submissionId));

    // Notify consultant of receipt upload
    sendReceiptUploadEmail({
      name: submission.name,
      email: submission.email,
      passportNumber: submission.passportNumber,
      receiptFileName: fileName,
      submissionId,
    }).catch(() => {});

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "Failed to upload receipt" });
  }
});

export default router;
