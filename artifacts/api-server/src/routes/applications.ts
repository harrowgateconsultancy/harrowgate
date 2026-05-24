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
  if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }

  try {
    const query = db
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
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
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
  if (!parsed.success) { res.status(400).json({ error: "Invalid application ID" }); return; }
  try {
    const [result] = await db
      .select({ app: applicationsTable, clientName: clientsTable.name, documentCount: sql<number>`cast(count(${documentsTable.id}) as int)` })
      .from(applicationsTable)
      .leftJoin(clientsTable, eq(applicationsTable.clientId, clientsTable.id))
      .leftJoin(documentsTable, eq(documentsTable.applicationId, applicationsTable.id))
      .where(eq(applicationsTable.id, parsed.data.applicationId))
      .groupBy(applicationsTable.id, clientsTable.name);
    if (!result) { res.status(404).json({ error: "Application not found" }); return; }
    res.json(formatApp(result.app, result.clientName, result.documentCount));
  } catch (err) {
    req.log.error({ err }, "Error fetching application");
    res.status(500).json({ error: "Failed to fetch application" });
  }
});

router.patch("/applications/:applicationId", async (req: Request, res: Response) => {
  const paramsParsed = UpdateApplicationParams.safeParse({ applicationId: Number(req.params.applicationId) });
  if (!paramsParsed.success) { res.status(400).json({ error: "Invalid application ID" }); return; }
  const bodyParsed = UpdateApplicationBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
  try {
    const updateData: Partial<typeof applicationsTable.$inferInsert> = {};
    if (bodyParsed.data.status !== undefined) updateData.status = bodyParsed.data.status;
    if (bodyParsed.data.targetProgram !== undefined) updateData.targetProgram = bodyParsed.data.targetProgram;
    if (bodyParsed.data.targetUniversity !== undefined) updateData.targetUniversity = bodyParsed.data.targetUniversity;
    if (bodyParsed.data.applicationType !== undefined) updateData.applicationType = bodyParsed.data.applicationType;
    if (bodyParsed.data.formData !== undefined) updateData.formData = bodyParsed.data.formData as Record<string, string | null>;
    if (bodyParsed.data.notes !== undefined) updateData.notes = bodyParsed.data.notes;

    const [app] = await db.update(applicationsTable).set(updateData).where(eq(applicationsTable.id, paramsParsed.data.applicationId)).returning();
    if (!app) { res.status(404).json({ error: "Application not found" }); return; }
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
  if (!parsed.success) { res.status(400).json({ error: "Invalid application ID" }); return; }
  try {
    const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, parsed.data.applicationId));
    if (!app) { res.status(404).json({ error: "Application not found" }); return; }

    await db.update(applicationsTable).set({ status: "ai_processing" }).where(eq(applicationsTable.id, app.id));

    const docs = await db.select().from(documentsTable).where(eq(documentsTable.applicationId, app.id));
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, app.clientId));

    const documentsSummary = docs.map(d =>
      `Document Type: ${d.documentType}\nFile: ${d.fileName}\nExtracted Text: ${d.extractedText || "(no OCR text — infer from document type)"}`
    ).join("\n\n---\n\n");

    const clientInfo = client
      ? `Name: ${client.name}\nNationality: ${client.nationality}\nDate of Birth: ${client.dateOfBirth || "unknown"}\nPassport No: ${client.passportNumber || "unknown"}\nEmail: ${client.email}\nPhone: ${client.phone || "unknown"}`
      : "";

    // The fields exactly match the HK Immigration Department ID995A form
    const prompt = `You are an assistant for HARROWGATE, a Hong Kong visa consultancy. Your job is to fill in the official HK Immigration Department ID995A "Application for Entry for Study in Hong Kong" (來港就讀申請表) using the client information and scanned documents provided.

Return ONLY a valid JSON object with these exact keys (use null for any field you cannot determine):

{
  "surnameInEnglish": string|null,
  "givenNamesInEnglish": string|null,
  "nameInChinese": string|null,
  "maidenSurname": string|null,
  "alias": string|null,
  "sex": string|null,
  "dateOfBirth": string|null,
  "placeOfBirth": string|null,
  "nationality": string|null,
  "maritalStatus": string|null,
  "hkIdNumber": string|null,
  "mainlandIdNumber": string|null,
  "travelDocumentType": string|null,
  "travelDocumentNo": string|null,
  "placeOfIssue": string|null,
  "dateOfIssue": string|null,
  "dateOfExpiry": string|null,
  "emailAddress": string|null,
  "contactTelephoneNo": string|null,
  "faxNo": string|null,
  "countryOfDomicile": string|null,
  "permanentResidenceInDomicile": string|null,
  "lengthOfResidenceYears": string|null,
  "lengthOfResidenceMonths": string|null,
  "occupation": string|null,
  "currentEmployerName": string|null,
  "currentEmployerAddress": string|null,
  "currentlyInHongKong": string|null,
  "permittedToRemainUntil": string|null,
  "statusInHK": string|null,
  "presentAddress": string|null,
  "permanentAddress": string|null,
  "proposedDateOfEntry": string|null,
  "proposedDurationOfStay": string|null,
  "schoolNameAndAddress": string|null,
  "classCourseToAttend": string|null,
  "edu1Institution": string|null,
  "edu1MajorSubject": string|null,
  "edu1Degree": string|null,
  "edu1From": string|null,
  "edu1To": string|null,
  "edu2Institution": string|null,
  "edu2MajorSubject": string|null,
  "edu2Degree": string|null,
  "edu2From": string|null,
  "edu2To": string|null,
  "costSchoolFee": string|null,
  "costAccommodationType": string|null,
  "costAccommodation": string|null,
  "costTransportMeal": string|null,
  "costOthers": string|null,
  "costTotal": string|null,
  "financeDeposit": string|null,
  "financeDepositDesc": string|null,
  "financeIncome": string|null,
  "financeIncomeDesc": string|null,
  "financeOthers": string|null,
  "financeOthersDesc": string|null,
  "previousShortTermStudies": string|null,
  "previousShortTermStudiesDetails": string|null,
  "nameChanged": string|null,
  "previousNames": string|null,
  "previouslyRefusedEntry": string|null,
  "refusedEntryDetails": string|null,
  "previouslyRefusedVisa": string|null,
  "refusedVisaDetails": string|null
}

Rules:
- dateOfBirth, dateOfIssue, dateOfExpiry, permittedToRemainUntil: format as dd/mm/yyyy
- sex: use "Male 男" or "Female 女"
- maritalStatus: one of "Bachelor/Spinster 未婚", "Married 已婚", "Divorced 離婚", "Separated 分居", "Widowed 喪偶"
- permanentResidenceInDomicile: "Yes 是" or "No 否"
- currentlyInHongKong: "Yes 是" or "No 否"
- costAccommodationType: one of "Residential Hall 宿舍", "Rented Flat 租住樓宇", "Lives with Relative 與親人居住"
- previousShortTermStudies: "No 否" or "Yes 是"
- nameChanged: "No — has not changed name 從沒有更改姓名" or "Yes — has changed name 曾經更改姓名"
- previouslyRefusedEntry / previouslyRefusedVisa: "No 從未" or "Yes 曾經"
- For surnameInEnglish: use only the family name (last name)
- For givenNamesInEnglish: use only the given/first names
- Always populate surname, givenNames, nationality, dateOfBirth, travelDocumentNo, contactTelephoneNo, emailAddress from client data if available
- Set previouslyRefusedEntry="No 從未", previouslyRefusedVisa="No 從未", nameChanged="No — has not changed name 從沒有更改姓名" as defaults unless documents suggest otherwise
- proposedDurationOfStay: estimate from course/program duration if known (e.g. "2 years")
- schoolNameAndAddress: use targetUniversity + targetProgram context to fill in
- classCourseToAttend: use targetProgram

Client Information:
${clientInfo}

Uploaded Documents:
${documentsSummary || "(no documents uploaded yet — use client info only)"}

Target University: ${app.targetUniversity || "not specified"}
Target Program: ${app.targetProgram || "not specified"}
Application Type: ${app.applicationType || "student_visa"}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const extracted = JSON.parse(completion.choices[0].message.content || "{}");
    const existingFormData = (app.formData as Record<string, string | null>) || {};
    const mergedFormData: Record<string, string | null> = { ...existingFormData };
    const extractedFields: string[] = [];

    for (const [key, value] of Object.entries(extracted)) {
      if (value !== null && value !== undefined && String(value).trim() !== "") {
        mergedFormData[key] = String(value);
        extractedFields.push(key);
      }
    }

    await db.update(applicationsTable)
      .set({ formData: mergedFormData, status: "ai_processed" })
      .where(eq(applicationsTable.id, app.id));

    res.json({
      success: true,
      formData: mergedFormData,
      extractedFields,
      message: `Successfully extracted ${extractedFields.length} ID995A fields.`,
    });
  } catch (err) {
    req.log.error({ err }, "Error extracting application data");
    await db.update(applicationsTable).set({ status: "draft" }).where(eq(applicationsTable.id, Number(req.params.applicationId)));
    res.status(500).json({ error: "Failed to extract application data" });
  }
});

export default router;
