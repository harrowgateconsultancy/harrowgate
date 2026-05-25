import { Router } from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { spawn } from "child_process";
import { db } from "@workspace/db";
import { studentSubmissionsTable, studentDocumentsTable, id995aFormsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { ObjectStorageService } from "../lib/objectStorage";

const router = Router();
const objectStorageService = new ObjectStorageService();
const __dirname = dirname(fileURLToPath(import.meta.url));

function requireAdmin(_req: any, _res: any, next: any) { next(); }

// ── ID995A form field definitions (keys match fill_id995a.py) ─────────────
export const FORM_FIELDS: {
  key: string; label: string; section: string;
  type?: "select" | "text"; options?: string[];
}[] = [
  // ── Personal Particulars ──────────────────────────────────────────────────
  { section: "Personal Particulars", key: "surnameEnglish",          label: "Surname (English)" },
  { section: "Personal Particulars", key: "givenNamesEnglish",       label: "Given Names (English)" },
  { section: "Personal Particulars", key: "nameChineseApplicant",    label: "Name in Chinese (if any)" },
  { section: "Personal Particulars", key: "maidenSurname",           label: "Maiden Surname (if applicable)" },
  { section: "Personal Particulars", key: "alias",                   label: "Alias (if any)" },
  { section: "Personal Particulars", key: "sex",                     label: "Sex", type: "select", options: ["Male", "Female"] },
  { section: "Personal Particulars", key: "dateOfBirth",             label: "Date of Birth (dd/mm/yyyy)" },
  { section: "Personal Particulars", key: "placeOfBirth",            label: "Place of Birth" },
  { section: "Personal Particulars", key: "nationality",             label: "Nationality / Place of Domicile" },
  { section: "Personal Particulars", key: "maritalStatus",           label: "Marital / Relationship Status", type: "select", options: ["Bachelor/Spinster", "Married", "Divorced", "Separated", "Widowed", "Others"] },
  { section: "Personal Particulars", key: "maritalStatusOther",      label: "Marital Status – Others (specify)" },
  { section: "Personal Particulars", key: "hkIdNumber",              label: "HK Identity Card No. (if any)" },
  { section: "Personal Particulars", key: "mainlandIdNumber",        label: "Mainland Identity Card No. (if any)" },
  { section: "Personal Particulars", key: "travelDocType",           label: "Travel Document Type" },
  { section: "Personal Particulars", key: "travelDocNumber",         label: "Travel Document No." },
  { section: "Personal Particulars", key: "placeOfIssue",            label: "Place of Issue" },
  { section: "Personal Particulars", key: "dateOfIssue",             label: "Date of Issue (dd/mm/yyyy)" },
  { section: "Personal Particulars", key: "dateOfExpiry",            label: "Date of Expiry (dd/mm/yyyy)" },
  { section: "Personal Particulars", key: "emailAddress",            label: "Email Address (if any)" },
  { section: "Personal Particulars", key: "contactPhone",            label: "Contact Telephone No." },
  { section: "Personal Particulars", key: "faxNumber",               label: "Fax No. (if any)" },
  { section: "Personal Particulars", key: "countryOfDomicile",       label: "Country / Territory of Domicile" },
  { section: "Personal Particulars", key: "hasPermanentResidence",   label: "Acquired Permanent Residence in Country of Domicile?", type: "select", options: ["Yes", "No"] },
  { section: "Personal Particulars", key: "lengthOfResidenceYears",  label: "Length of Residence – Years" },
  { section: "Personal Particulars", key: "lengthOfResidenceMonths", label: "Length of Residence – Months" },
  { section: "Personal Particulars", key: "occupation",              label: "Occupation" },
  { section: "Personal Particulars", key: "currentEmployerName",     label: "Name of Current Employer (if applicable)" },
  { section: "Personal Particulars", key: "currentEmployerAddress",  label: "Address of Current Employer (if applicable)" },
  { section: "Personal Particulars", key: "isCurrentlyInHK",         label: "Is Applicant Currently in HK?", type: "select", options: ["Yes", "No"] },
  { section: "Personal Particulars", key: "permittedToRemainUntil",  label: "Permitted to Remain Until (dd/mm/yyyy, if in HK)" },
  { section: "Personal Particulars", key: "statusInHK",              label: "Status in HK", type: "select", options: ["Employment", "Residence/Dependant", "Visitor", "Others"] },
  { section: "Personal Particulars", key: "statusInHKOther",         label: "Status in HK – Others (specify)" },
  { section: "Personal Particulars", key: "presentAddress1",         label: "Present Address – Line 1" },
  { section: "Personal Particulars", key: "presentAddress2",         label: "Present Address – Line 2" },
  { section: "Personal Particulars", key: "presentAddress3",         label: "Present Address – Line 3 / Country" },
  { section: "Personal Particulars", key: "permanentAddress1",       label: "Permanent Address – Line 1 (if different)" },
  { section: "Personal Particulars", key: "permanentAddress2",       label: "Permanent Address – Line 2" },
  { section: "Personal Particulars", key: "permanentAddress3",       label: "Permanent Address – Line 3 / Country" },

  // ── Proposed Stay ─────────────────────────────────────────────────────────
  { section: "Proposed Stay in HK for Study", key: "proposedDateOfEntry",    label: "Proposed Date of Entry (dd/mm/yyyy)" },
  { section: "Proposed Stay in HK for Study", key: "proposedDurationOfStay", label: "Proposed Duration of Stay" },
  { section: "Proposed Stay in HK for Study", key: "schoolNameAddress",      label: "Name & Address of School / Institution" },
  { section: "Proposed Stay in HK for Study", key: "classToAttend",          label: "Class / Course to Attend" },

  // ── Educational Background ────────────────────────────────────────────────
  { section: "Educational Background", key: "edu1SchoolName",  label: "School/Inst. 1 – Name" },
  { section: "Educational Background", key: "edu1MajorSubject",label: "School/Inst. 1 – Major Subject" },
  { section: "Educational Background", key: "edu1Degree",      label: "School/Inst. 1 – Degree/Award" },
  { section: "Educational Background", key: "edu1From",        label: "School/Inst. 1 – From (mm/yyyy)" },
  { section: "Educational Background", key: "edu1To",          label: "School/Inst. 1 – To (mm/yyyy)" },
  { section: "Educational Background", key: "edu2SchoolName",  label: "School/Inst. 2 – Name" },
  { section: "Educational Background", key: "edu2MajorSubject",label: "School/Inst. 2 – Major Subject" },
  { section: "Educational Background", key: "edu2Degree",      label: "School/Inst. 2 – Degree/Award" },
  { section: "Educational Background", key: "edu2From",        label: "School/Inst. 2 – From (mm/yyyy)" },
  { section: "Educational Background", key: "edu2To",          label: "School/Inst. 2 – To (mm/yyyy)" },
  { section: "Educational Background", key: "edu3SchoolName",  label: "School/Inst. 3 – Name" },
  { section: "Educational Background", key: "edu3MajorSubject",label: "School/Inst. 3 – Major Subject" },
  { section: "Educational Background", key: "edu3Degree",      label: "School/Inst. 3 – Degree/Award" },
  { section: "Educational Background", key: "edu3From",        label: "School/Inst. 3 – From (mm/yyyy)" },
  { section: "Educational Background", key: "edu3To",          label: "School/Inst. 3 – To (mm/yyyy)" },

  // ── Financial Resources ───────────────────────────────────────────────────
  { section: "Financial Resources", key: "schoolFeeCost",      label: "School Fees – Estimated Cost (HK$)" },
  { section: "Financial Resources", key: "accommodationCost",  label: "Accommodation – Estimated Cost (HK$)" },
  { section: "Financial Resources", key: "totalCost",          label: "Total Estimated Cost (HK$)" },
];

// ── Helper: spawn Python fill script ──────────────────────────────────────
function fillOfficialPDF(formData: Record<string, any>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const scriptPath = join(process.cwd(), "src/assets/fill_id995a.py");
    const py = spawn("python3", [scriptPath]);
    const chunks: Buffer[] = [];
    const errChunks: string[] = [];

    py.stdout.on("data", (d: Buffer) => chunks.push(d));
    py.stderr.on("data", (d: Buffer) => {
      const msg = d.toString();
      if (!msg.includes("Font dictionary") && !msg.includes("defaulting to")) {
        errChunks.push(msg);
      }
    });
    py.on("close", (code) => {
      if (code !== 0 || chunks.length === 0) {
        reject(new Error(`Python exit ${code}: ${errChunks.join("")}`));
      } else {
        resolve(Buffer.concat(chunks));
      }
    });
    py.on("error", reject);

    py.stdin.write(JSON.stringify(formData));
    py.stdin.end();
  });
}

// ── GET /admin/student-submissions/:id/id995a ──────────────────────────────
router.get("/admin/student-submissions/:id/id995a", requireAdmin, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [form] = await db.select().from(id995aFormsTable).where(eq(id995aFormsTable.submissionId, submissionId)).limit(1);
    if (!form) return res.json({ formData: {}, aiGenerated: false, exists: false });
    res.json({ ...form, exists: true });
  } catch {
    res.status(500).json({ error: "Failed to fetch ID995A form" });
  }
});

// ── PATCH /admin/student-submissions/:id/id995a ────────────────────────────
router.patch("/admin/student-submissions/:id/id995a", requireAdmin, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const { formData } = req.body;
    const [existing] = await db.select().from(id995aFormsTable).where(eq(id995aFormsTable.submissionId, submissionId)).limit(1);
    if (existing) {
      const [updated] = await db.update(id995aFormsTable)
        .set({ formData, updatedAt: new Date() })
        .where(eq(id995aFormsTable.submissionId, submissionId)).returning();
      return res.json(updated);
    } else {
      const [created] = await db.insert(id995aFormsTable).values({ submissionId, formData, aiGenerated: false }).returning();
      return res.status(201).json(created);
    }
  } catch {
    res.status(500).json({ error: "Failed to save ID995A form" });
  }
});

// ── POST /admin/student-submissions/:id/id995a/generate ───────────────────
router.post("/admin/student-submissions/:id/id995a/generate", requireAdmin, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable).where(eq(studentSubmissionsTable.id, submissionId)).limit(1);
    if (!submission) return res.status(404).json({ error: "Submission not found" });

    const documents = await db.select().from(studentDocumentsTable).where(eq(studentDocumentsTable.submissionId, submissionId));

    const systemPrompt = `You are an expert Hong Kong immigration form assistant.
Extract every possible detail from the student documents to fill the official HK Immigration ID995A form.
Respond ONLY with a valid JSON object — keys are field names, values are strings.
Use "" for missing fields. For dates use dd/mm/yyyy. For period fields (edu From/To) use mm/yyyy.

Field names and what to extract:
${FORM_FIELDS.map(f => `  "${f.key}": ${f.label}`).join("\n")}

Rules:
- sex: exactly "Male" or "Female"
- maritalStatus: exactly one of: Bachelor/Spinster, Married, Divorced, Separated, Widowed, Others
- hasPermanentResidence: "Yes" or "No"
- isCurrentlyInHK: "Yes" or "No" (default "No" unless evidence shows otherwise)
- travelDocType: usually "Ordinary Passport" if document is a passport
- hkIdNumber: format as A123456(7) if HK ID card found, else ""
- For address fields split across 3 lines: line 1 = building/flat, line 2 = street/district, line 3 = city/country
- Extract full educational history from any transcripts or certificates`;

    const preFilled: Record<string, string> = {
      surnameEnglish:    submission.name?.split(" ").slice(-1)[0] || "",
      givenNamesEnglish: submission.name?.split(" ").slice(0, -1).join(" ") || "",
      dateOfBirth:       submission.dateOfBirth || "",
      travelDocNumber:   submission.passportNumber || "",
      emailAddress:      submission.email || "",
      travelDocType:     "Ordinary Passport",
      isCurrentlyInHK:   "No",
    };

    const parts: any[] = [];
    parts.push({
      type: "text",
      text: `Student application data:\n- Full Name: ${submission.name}\n- Date of Birth: ${submission.dateOfBirth}\n- Passport Number: ${submission.passportNumber}\n- Email: ${submission.email || "not provided"}\n\nDocuments uploaded: ${documents.length > 0 ? documents.map(d => d.documentType).join(", ") : "none"}\n\nExtract all fields from documents and return JSON.`,
    });

    // Attach passport / document images
    for (const doc of documents) {
      if (doc.mimeType?.startsWith("image/")) {
        try {
          const objectFile = await objectStorageService.getObjectEntityFile(doc.fileUrl);
          const response = await objectStorageService.downloadObject(objectFile, 0);
          const b64 = Buffer.from(await response.arrayBuffer()).toString("base64");
          const mediaType = (doc.mimeType || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
          parts.push({ type: "image_url", image_url: { url: `data:${mediaType};base64,${b64}`, detail: "high" } });
        } catch (e) {
          console.error("[id995a] Could not load document image:", doc.documentType, e);
        }
      }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: parts },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let aiData: Record<string, string> = {};
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      aiData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch { aiData = {}; }

    const formData: Record<string, string> = { ...preFilled };
    for (const field of FORM_FIELDS) {
      if (aiData[field.key] !== undefined && aiData[field.key] !== "") {
        formData[field.key] = String(aiData[field.key]);
      } else if (!formData[field.key]) {
        formData[field.key] = "";
      }
    }

    const [existing] = await db.select().from(id995aFormsTable).where(eq(id995aFormsTable.submissionId, submissionId)).limit(1);
    let saved;
    if (existing) {
      [saved] = await db.update(id995aFormsTable).set({ formData, aiGenerated: true, updatedAt: new Date() }).where(eq(id995aFormsTable.submissionId, submissionId)).returning();
    } else {
      [saved] = await db.insert(id995aFormsTable).values({ submissionId, formData, aiGenerated: true }).returning();
    }

    res.json({ ...saved, exists: true });
  } catch (err) {
    console.error("[id995a] AI generation failed:", err);
    res.status(500).json({ error: "Failed to generate form data" });
  }
});

// ── GET /admin/student-submissions/:id/id995a/download ────────────────────
router.get("/admin/student-submissions/:id/id995a/download", requireAdmin, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable).where(eq(studentSubmissionsTable.id, submissionId)).limit(1);
    if (!submission) return res.status(404).json({ error: "Submission not found" });

    const [form] = await db.select().from(id995aFormsTable).where(eq(id995aFormsTable.submissionId, submissionId)).limit(1);
    const formData: Record<string, any> = (form?.formData as Record<string, any>) || {};

    const pdfBuffer = await fillOfficialPDF(formData);
    const safeName = submission.name.replace(/[^a-zA-Z0-9_\-]/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="ID995A_${safeName}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("[id995a] Download failed:", err);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

export default router;
