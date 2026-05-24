import { Router, type IRouter, type Request, type Response } from "express";
import { db, applicationsTable, clientsTable, documentsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  CreateApplicationBody,
  UpdateApplicationBody,
  UpdateApplicationParams,
  GetApplicationParams,
  ExtractApplicationDataParams,
  ListApplicationsQueryParams,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

function formatApp(app: typeof applicationsTable.$inferSelect, clientName?: string | null, documentCount?: number) {
  return {
    id: app.id,
    clientId: app.clientId,
    clientName: clientName ?? null,
    status: app.status,
    targetProgram: app.targetProgram,
    targetUniversity: app.targetUniversity,
    applicationType: app.applicationType,
    formData: app.formData ?? null,
    notes: app.notes,
    documentCount: documentCount ?? 0,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  };
}

router.get("/applications", async (req: Request, res: Response) => {
  const parsed = ListApplicationsQueryParams.safeParse({
    clientId: req.query.clientId ? Number(req.query.clientId) : undefined,
    status: req.query.status,
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  try {
    let query = db
      .select({
        app: applicationsTable,
        clientName: clientsTable.name,
        documentCount: sql<number>`cast(count(${documentsTable.id}) as int)`,
      })
      .from(applicationsTable)
      .leftJoin(clientsTable, eq(applicationsTable.clientId, clientsTable.id))
      .leftJoin(documentsTable, eq(documentsTable.applicationId, applicationsTable.id))
      .groupBy(applicationsTable.id, clientsTable.name);

    const conditions = [];
    if (parsed.data.clientId) conditions.push(eq(applicationsTable.clientId, parsed.data.clientId));
    if (parsed.data.status) conditions.push(eq(applicationsTable.status, parsed.data.status));

    const results = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(applicationsTable.createdAt)
      : await query.orderBy(applicationsTable.createdAt);

    res.json(results.map(r => formatApp(r.app, r.clientName, r.documentCount)));
  } catch (err) {
    req.log.error({ err }, "Error listing applications");
    res.status(500).json({ error: "Failed to list applications" });
  }
});

router.post("/applications", async (req: Request, res: Response) => {
  const parsed = CreateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const [app] = await db.insert(applicationsTable).values({
      clientId: parsed.data.clientId,
      targetProgram: parsed.data.targetProgram ?? null,
      targetUniversity: parsed.data.targetUniversity ?? null,
      applicationType: parsed.data.applicationType ?? null,
      notes: parsed.data.notes ?? null,
      status: "draft",
    }).returning();

    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, app.clientId));
    res.status(201).json(formatApp(app, client?.name));
  } catch (err) {
    req.log.error({ err }, "Error creating application");
    res.status(500).json({ error: "Failed to create application" });
  }
});

router.get("/applications/:applicationId", async (req: Request, res: Response) => {
  const parsed = GetApplicationParams.safeParse({ applicationId: Number(req.params.applicationId) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid application ID" });
    return;
  }
  try {
    const [result] = await db
      .select({
        app: applicationsTable,
        clientName: clientsTable.name,
        documentCount: sql<number>`cast(count(${documentsTable.id}) as int)`,
      })
      .from(applicationsTable)
      .leftJoin(clientsTable, eq(applicationsTable.clientId, clientsTable.id))
      .leftJoin(documentsTable, eq(documentsTable.applicationId, applicationsTable.id))
      .where(eq(applicationsTable.id, parsed.data.applicationId))
      .groupBy(applicationsTable.id, clientsTable.name);

    if (!result) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    res.json(formatApp(result.app, result.clientName, result.documentCount));
  } catch (err) {
    req.log.error({ err }, "Error fetching application");
    res.status(500).json({ error: "Failed to fetch application" });
  }
});

router.patch("/applications/:applicationId", async (req: Request, res: Response) => {
  const paramsParsed = UpdateApplicationParams.safeParse({ applicationId: Number(req.params.applicationId) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid application ID" });
    return;
  }
  const bodyParsed = UpdateApplicationBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const updateData: Partial<typeof applicationsTable.$inferInsert> = {};
    if (bodyParsed.data.status !== undefined) updateData.status = bodyParsed.data.status;
    if (bodyParsed.data.targetProgram !== undefined) updateData.targetProgram = bodyParsed.data.targetProgram;
    if (bodyParsed.data.targetUniversity !== undefined) updateData.targetUniversity = bodyParsed.data.targetUniversity;
    if (bodyParsed.data.applicationType !== undefined) updateData.applicationType = bodyParsed.data.applicationType;
    if (bodyParsed.data.formData !== undefined) updateData.formData = bodyParsed.data.formData as Record<string, string | null>;
    if (bodyParsed.data.notes !== undefined) updateData.notes = bodyParsed.data.notes;

    const [app] = await db.update(applicationsTable).set(updateData).where(eq(applicationsTable.id, paramsParsed.data.applicationId)).returning();
    if (!app) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, app.clientId));
    const docs = await db.select().from(documentsTable).where(eq(documentsTable.applicationId, app.id));
    res.json(formatApp(app, client?.name, docs.length));
  } catch (err) {
    req.log.error({ err }, "Error updating application");
    res.status(500).json({ error: "Failed to update application" });
  }
});

router.post("/applications/:applicationId/extract", async (req: Request, res: Response) => {
  const parsed = ExtractApplicationDataParams.safeParse({ applicationId: Number(req.params.applicationId) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid application ID" });
    return;
  }
  try {
    const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, parsed.data.applicationId));
    if (!app) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    // Update status to ai_processing
    await db.update(applicationsTable).set({ status: "ai_processing" }).where(eq(applicationsTable.id, app.id));

    // Get all documents for this application
    const docs = await db.select().from(documentsTable).where(eq(documentsTable.applicationId, app.id));
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, app.clientId));

    const documentsSummary = docs.map(d =>
      `Document Type: ${d.documentType}\nFile: ${d.fileName}\nExtracted Text: ${d.extractedText || "(no text extracted — infer from document type and client info)"}`
    ).join("\n\n---\n\n");

    const clientInfo = client
      ? `Client Name: ${client.name}\nNationality: ${client.nationality}\nDate of Birth: ${client.dateOfBirth || "unknown"}\nPassport: ${client.passportNumber || "unknown"}\nEmail: ${client.email}\nPhone: ${client.phone || "unknown"}`
      : "";

    const prompt = `You are an assistant for HARROWGATE, a Hong Kong visa consultancy. Based on the following document information and client data, extract and fill in the application form fields. Return ONLY a JSON object with these exact keys (use null for missing fields):

{
  "fullName": string | null,
  "dateOfBirth": string | null,
  "nationality": string | null,
  "passportNumber": string | null,
  "passportExpiry": string | null,
  "homeAddress": string | null,
  "phone": string | null,
  "email": string | null,
  "highestDegree": string | null,
  "institution": string | null,
  "graduationYear": string | null,
  "gpa": string | null,
  "languageTestScore": string | null,
  "languageTestType": string | null,
  "intendedProgram": string | null,
  "intendedUniversity": string | null,
  "fundingSource": string | null,
  "emergencyContactName": string | null,
  "emergencyContactPhone": string | null
}

Client Information:
${clientInfo}

Uploaded Documents:
${documentsSummary || "(no documents uploaded yet)"}

Target Program: ${app.targetProgram || "not specified"}
Target University: ${app.targetUniversity || "not specified"}
Application Type: ${app.applicationType || "not specified"}

Extract all information you can from the above. For the client's name, nationality, email, phone, DOB and passport number, always use the client info provided if available.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const extracted = JSON.parse(completion.choices[0].message.content || "{}");

    // Merge with existing formData
    const existingFormData = (app.formData as Record<string, string | null>) || {};
    const mergedFormData: Record<string, string | null> = { ...existingFormData };
    const extractedFields: string[] = [];

    for (const [key, value] of Object.entries(extracted)) {
      if (value !== null && value !== undefined && String(value).trim() !== "") {
        mergedFormData[key] = String(value);
        extractedFields.push(key);
      }
    }

    // Save merged formData and update status
    await db.update(applicationsTable)
      .set({ formData: mergedFormData, status: "ai_processed" })
      .where(eq(applicationsTable.id, app.id));

    res.json({
      success: true,
      formData: mergedFormData,
      extractedFields,
      message: `Successfully extracted ${extractedFields.length} fields from uploaded documents.`,
    });
  } catch (err) {
    req.log.error({ err }, "Error extracting application data");
    await db.update(applicationsTable).set({ status: "draft" }).where(eq(applicationsTable.id, Number(req.params.applicationId)));
    res.status(500).json({ error: "Failed to extract application data" });
  }
});

export default router;
