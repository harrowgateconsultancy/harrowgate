import { Router, type IRouter, type Request, type Response } from "express";
import { db, documentsTable, applicationsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { CreateDocumentBody, ListDocumentsQueryParams, DeleteDocumentParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/documents", async (req: Request, res: Response) => {
  const parsed = ListDocumentsQueryParams.safeParse({
    applicationId: Number(req.query.applicationId),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "applicationId query param required" });
    return;
  }
  try {
    const docs = await db.select().from(documentsTable)
      .where(eq(documentsTable.applicationId, parsed.data.applicationId))
      .orderBy(documentsTable.uploadedAt);

    res.json(docs.map(d => ({
      id: d.id,
      applicationId: d.applicationId,
      documentType: d.documentType,
      fileName: d.fileName,
      fileUrl: d.fileUrl,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      extractedText: d.extractedText,
      uploadedAt: d.uploadedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Error listing documents");
    res.status(500).json({ error: "Failed to list documents" });
  }
});

router.post("/documents", async (req: Request, res: Response) => {
  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const [doc] = await db.insert(documentsTable).values({
      applicationId: parsed.data.applicationId,
      documentType: parsed.data.documentType,
      fileName: parsed.data.fileName,
      fileUrl: parsed.data.fileUrl,
      fileSize: parsed.data.fileSize ?? null,
      mimeType: parsed.data.mimeType ?? null,
    }).returning();

    // Update application status if it's still draft
    const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, doc.applicationId));
    if (app && app.status === "draft") {
      await db.update(applicationsTable).set({ status: "documents_uploaded" }).where(eq(applicationsTable.id, doc.applicationId));
    }

    res.status(201).json({
      id: doc.id,
      applicationId: doc.applicationId,
      documentType: doc.documentType,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      extractedText: doc.extractedText,
      uploadedAt: doc.uploadedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating document");
    res.status(500).json({ error: "Failed to create document" });
  }
});

router.get("/clients/:clientId/documents", async (req: Request, res: Response) => {
  const clientId = parseInt(req.params.clientId);
  if (!clientId) { res.status(400).json({ error: "Invalid clientId" }); return; }
  try {
    const apps = await db.select({ id: applicationsTable.id }).from(applicationsTable)
      .where(eq(applicationsTable.clientId, clientId));
    if (!apps.length) { res.json([]); return; }
    const appIds = apps.map(a => a.id);
    const docs = await db.select().from(documentsTable)
      .where(inArray(documentsTable.applicationId, appIds))
      .orderBy(documentsTable.uploadedAt);
    res.json(docs.map(d => ({
      id: d.id,
      applicationId: d.applicationId,
      documentType: d.documentType,
      fileName: d.fileName,
      fileUrl: d.fileUrl,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      uploadedAt: d.uploadedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Error listing client documents");
    res.status(500).json({ error: "Failed to list documents" });
  }
});

router.delete("/documents/:documentId", async (req: Request, res: Response) => {
  const parsed = DeleteDocumentParams.safeParse({ documentId: Number(req.params.documentId) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid document ID" });
    return;
  }
  try {
    await db.delete(documentsTable).where(eq(documentsTable.id, parsed.data.documentId));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Error deleting document");
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;
