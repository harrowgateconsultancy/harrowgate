import { Router } from "express";
import { db } from "@workspace/db";
import {
  studentSubmissionsTable,
  studentDocumentsTable,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/admin/student-submissions", async (_req, res) => {
  try {
    const submissions = await db
      .select()
      .from(studentSubmissionsTable)
      .orderBy(desc(studentSubmissionsTable.createdAt));
    const withDocs = await Promise.all(
      submissions.map(async (s) => {
        const documents = await db
          .select()
          .from(studentDocumentsTable)
          .where(eq(studentDocumentsTable.submissionId, s.id));
        return { ...s, documents };
      }),
    );
    res.json(withDocs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

router.get("/admin/student-submissions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [submission] = await db
      .select()
      .from(studentSubmissionsTable)
      .where(eq(studentSubmissionsTable.id, id))
      .limit(1);
    if (!submission) return res.status(404).json({ error: "Not found" });
    const documents = await db
      .select()
      .from(studentDocumentsTable)
      .where(eq(studentDocumentsTable.submissionId, id));
    res.json({ ...submission, documents });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch submission" });
  }
});

router.patch("/admin/student-submissions/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, adminNotes } = req.body;
    const validStatuses = ["pending", "approved", "payment_pending", "payment_received", "acknowledged", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const [updated] = await db
      .update(studentSubmissionsTable)
      .set({ status, adminNotes })
      .where(eq(studentSubmissionsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

export default router;
