import { Router, type IRouter, type Request, type Response } from "express";
import { db, applicationsTable, clientsTable, documentsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const [clientCount] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(clientsTable);
    const [appCount] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(applicationsTable);
    const [pendingCount] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(applicationsTable)
      .where(sql`${applicationsTable.status} in ('draft', 'documents_uploaded', 'ai_processing', 'ai_processed')`);
    const [readyCount] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(applicationsTable)
      .where(eq(applicationsTable.status, "ready_to_print"));
    const [submittedCount] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(applicationsTable)
      .where(eq(applicationsTable.status, "submitted"));

    const recentResults = await db
      .select({
        app: applicationsTable,
        clientName: clientsTable.name,
        documentCount: sql<number>`cast(count(${documentsTable.id}) as int)`,
      })
      .from(applicationsTable)
      .leftJoin(clientsTable, eq(applicationsTable.clientId, clientsTable.id))
      .leftJoin(documentsTable, eq(documentsTable.applicationId, applicationsTable.id))
      .groupBy(applicationsTable.id, clientsTable.name)
      .orderBy(sql`${applicationsTable.updatedAt} desc`)
      .limit(5);

    res.json({
      totalClients: clientCount?.count ?? 0,
      totalApplications: appCount?.count ?? 0,
      pendingReview: pendingCount?.count ?? 0,
      readyToPrint: readyCount?.count ?? 0,
      submitted: submittedCount?.count ?? 0,
      recentApplications: recentResults.map(r => ({
        id: r.app.id,
        clientId: r.app.clientId,
        clientName: r.clientName,
        status: r.app.status,
        targetProgram: r.app.targetProgram,
        targetUniversity: r.app.targetUniversity,
        applicationType: r.app.applicationType,
        formData: r.app.formData ?? null,
        notes: r.app.notes,
        documentCount: r.documentCount,
        createdAt: r.app.createdAt.toISOString(),
        updatedAt: r.app.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching stats");
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
