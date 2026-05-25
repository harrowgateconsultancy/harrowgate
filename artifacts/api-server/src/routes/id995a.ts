import { Router } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { db } from "@workspace/db";
import { studentSubmissionsTable, studentDocumentsTable, id995aFormsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { ObjectStorageService } from "../lib/objectStorage";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const router = Router();
const objectStorageService = new ObjectStorageService();
const __dirname = dirname(fileURLToPath(import.meta.url));

function requireAdmin(req: any, res: any, next: any) {
  next();
}

// ── ID995A field definitions ───────────────────────────────────────────────
export const FORM_FIELDS: { key: string; label: string; section: string; type?: "select" | "text"; options?: string[] }[] = [
  { section: "Personal Particulars", key: "surnameEnglish",       label: "Surname (English)" },
  { section: "Personal Particulars", key: "givenNamesEnglish",    label: "Given Names (English)" },
  { section: "Personal Particulars", key: "nameChineseApplicant", label: "Name in Chinese (if applicable)" },
  { section: "Personal Particulars", key: "maidenSurname",        label: "Maiden Surname (if applicable)" },
  { section: "Personal Particulars", key: "alias",                label: "Alias (if any)" },
  { section: "Personal Particulars", key: "sex",                  label: "Sex", type: "select", options: ["Male", "Female"] },
  { section: "Personal Particulars", key: "dateOfBirth",          label: "Date of Birth (dd/mm/yyyy)" },
  { section: "Personal Particulars", key: "placeOfBirth",         label: "Place of Birth" },
  { section: "Personal Particulars", key: "nationality",          label: "Nationality / Place of Domicile" },
  { section: "Personal Particulars", key: "maritalStatus",        label: "Marital Status", type: "select", options: ["Bachelor/Spinster", "Married", "Divorced", "Separated", "Widowed", "Others"] },
  { section: "Personal Particulars", key: "hkIdNumber",           label: "HK Identity Card No. (if any)" },
  { section: "Personal Particulars", key: "mainlandIdNumber",     label: "Mainland Identity Card No. (if any)" },
  { section: "Personal Particulars", key: "travelDocType",        label: "Travel Document Type" },
  { section: "Personal Particulars", key: "travelDocNumber",      label: "Travel Document No." },
  { section: "Personal Particulars", key: "placeOfIssue",         label: "Place of Issue" },
  { section: "Personal Particulars", key: "dateOfIssue",          label: "Date of Issue (dd/mm/yyyy)" },
  { section: "Personal Particulars", key: "dateOfExpiry",         label: "Date of Expiry (dd/mm/yyyy)" },
  { section: "Personal Particulars", key: "emailAddress",         label: "Email Address (if any)" },
  { section: "Personal Particulars", key: "contactPhone",         label: "Contact Telephone No." },
  { section: "Personal Particulars", key: "faxNumber",            label: "Fax No. (if any)" },
  { section: "Personal Particulars", key: "countryOfDomicile",    label: "Country / Territory of Domicile" },
  { section: "Personal Particulars", key: "hasPermanentResidence",label: "Acquired Permanent Residence in Country of Domicile?", type: "select", options: ["Yes", "No"] },
  { section: "Personal Particulars", key: "lengthOfResidence",    label: "Length of Residence in Country of Domicile (years & months)" },
  { section: "Personal Particulars", key: "occupation",           label: "Occupation" },
  { section: "Personal Particulars", key: "currentEmployerName",  label: "Name of Current Employer (if applicable)" },
  { section: "Personal Particulars", key: "currentEmployerAddress",label: "Address of Current Employer (if applicable)" },
  { section: "Personal Particulars", key: "isCurrentlyInHK",      label: "Is Applicant Currently in Hong Kong?", type: "select", options: ["Yes", "No"] },
  { section: "Personal Particulars", key: "permittedToRemainUntil",label: "Permitted to Remain Until (if in HK)" },
  { section: "Personal Particulars", key: "statusInHK",           label: "Status in HK (if in HK)", type: "select", options: ["Employment", "Residence/Dependant", "Visitor", "Others"] },
  { section: "Personal Particulars", key: "presentAddress",       label: "Present Address" },
  { section: "Personal Particulars", key: "permanentAddress",     label: "Permanent Address (if different from above)" },
  { section: "Proposed Stay in Hong Kong for Study", key: "proposedDateOfEntry",     label: "Proposed Date of Entry" },
  { section: "Proposed Stay in Hong Kong for Study", key: "proposedDurationOfStay",  label: "Proposed Duration of Stay" },
  { section: "Accompanying Dependants", key: "dependantsDetails", label: "Dependants Details (if applicable)" },
];

// ── GET /admin/student-submissions/:id/id995a ──────────────────────────────
router.get("/admin/student-submissions/:id/id995a", requireAdmin, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [form] = await db.select().from(id995aFormsTable).where(eq(id995aFormsTable.submissionId, submissionId)).limit(1);
    if (!form) return res.json({ formData: {}, aiGenerated: false, exists: false });
    res.json({ ...form, exists: true });
  } catch { res.status(500).json({ error: "Failed to fetch ID995A form" }); }
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
  } catch { res.status(500).json({ error: "Failed to save ID995A form" }); }
});

// ── POST /admin/student-submissions/:id/id995a/generate ───────────────────
router.post("/admin/student-submissions/:id/id995a/generate", requireAdmin, async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [submission] = await db.select().from(studentSubmissionsTable).where(eq(studentSubmissionsTable.id, submissionId)).limit(1);
    if (!submission) return res.status(404).json({ error: "Submission not found" });

    const documents = await db.select().from(studentDocumentsTable).where(eq(studentDocumentsTable.submissionId, submissionId));

    // Build content parts — send passport + any image docs to AI
    const parts: any[] = [];
    const systemPrompt = `You are an expert immigration form assistant for Hong Kong visa applications. 
Extract information from the student's uploaded documents to fill in the HK Immigration ID995A form.
Respond ONLY with a valid JSON object where keys are the field names listed below and values are strings.
If you cannot find a value, use an empty string "".

Fields to extract:
${FORM_FIELDS.map(f => `- ${f.key}: ${f.label}`).join("\n")}

For dates, format as dd/mm/yyyy.
For sex: use "Male" or "Female" only.
For maritalStatus: use one of: Bachelor/Spinster, Married, Divorced, Separated, Widowed, Others.
For hasPermanentResidence: use "Yes" or "No".
For isCurrentlyInHK: use "Yes" or "No" (default "No" unless documents show otherwise).
For travelDocType: usually "Ordinary Passport".`;

    // Pre-fill from submission data
    const preFilled: Record<string, string> = {
      surnameEnglish: submission.name?.split(" ").slice(-1)[0] || "",
      givenNamesEnglish: submission.name?.split(" ").slice(0, -1).join(" ") || "",
      dateOfBirth: submission.dateOfBirth || "",
      travelDocNumber: submission.passportNumber || "",
      emailAddress: submission.email || "",
      travelDocType: "Ordinary Passport",
      isCurrentlyInHK: "No",
    };

    const userTextContent = `Student application data:
- Full Name: ${submission.name}
- Date of Birth: ${submission.dateOfBirth}
- Passport Number: ${submission.passportNumber}
- Email: ${submission.email || "not provided"}

${documents.length > 0 ? `The student has ${documents.length} uploaded document(s): ${documents.map(d => d.documentType).join(", ")}.` : "No documents uploaded."}

Please extract all available information and return a JSON object. For any field not clearly visible in the data, use an empty string.`;

    parts.push({ type: "text", text: userTextContent });

    // Attach passport images if available
    const passportDoc = documents.find(d => d.documentType === "passport");
    if (passportDoc && passportDoc.mimeType?.startsWith("image/")) {
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(passportDoc.fileUrl);
        const response = await objectStorageService.downloadObject(objectFile, 0);
        const arrayBuf = await response.arrayBuffer();
        const b64 = Buffer.from(arrayBuf).toString("base64");
        const mediaType = (passportDoc.mimeType || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
        parts.push({
          type: "image_url",
          image_url: { url: `data:${mediaType};base64,${b64}`, detail: "high" },
        });
      } catch (e) {
        console.error("[id995a] Could not load passport image:", e);
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
      if (aiData[field.key] !== undefined) formData[field.key] = String(aiData[field.key]);
      else if (!formData[field.key]) formData[field.key] = "";
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
    const formData: Record<string, string> = (form?.formData as Record<string, string>) || {};

    // Try to fill the official PDF form first
    try {
      const templatePath = join(__dirname, "../assets/id995a_template.pdf");
      const pdfBytes = readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

      const pdfForm = pdfDoc.getForm();
      const fields = pdfForm.getFields();

      if (fields.length > 0) {
        // Map our keys to possible PDF field names
        const fieldMap: Record<string, string[]> = {
          surnameEnglish:        ["Surname", "surname", "Surname in English", "surnameEnglish"],
          givenNamesEnglish:     ["Given names", "givenNames", "Given names in English", "givenNamesEnglish"],
          nameChineseApplicant:  ["Name in Chinese", "nameChinese", "nameChineseApplicant"],
          sex:                   ["Sex", "sex"],
          dateOfBirth:           ["Date of birth", "dateOfBirth", "dob"],
          placeOfBirth:          ["Place of birth", "placeOfBirth"],
          nationality:           ["Nationality", "nationality"],
          maritalStatus:         ["Marital", "maritalStatus"],
          travelDocType:         ["Travel document type", "travelDocType"],
          travelDocNumber:       ["Travel document no", "travelDocNumber", "travelDocNo"],
          placeOfIssue:          ["Place of issue", "placeOfIssue"],
          emailAddress:          ["E-mail", "email", "emailAddress"],
          contactPhone:          ["Contact telephone", "contactPhone"],
          countryOfDomicile:     ["Country", "countryOfDomicile"],
          occupation:            ["Occupation", "occupation"],
          presentAddress:        ["Present address", "presentAddress"],
          proposedDateOfEntry:   ["Proposed date of entry", "proposedDateOfEntry"],
          proposedDurationOfStay:["Proposed duration", "proposedDurationOfStay"],
        };

        for (const field of fields) {
          const fieldName = field.getName();
          for (const [ourKey, candidates] of Object.entries(fieldMap)) {
            if (candidates.some(c => fieldName.toLowerCase().includes(c.toLowerCase()))) {
              try {
                if (field.constructor.name.includes("Text")) {
                  (field as any).setText(formData[ourKey] || "");
                }
              } catch { /* field type mismatch, skip */ }
              break;
            }
          }
        }

        pdfForm.flatten();
        const filledBytes = await pdfDoc.save();
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="ID995A_${submission.name.replace(/\s+/g, "_")}.pdf"`);
        return res.send(Buffer.from(filledBytes));
      }
    } catch (e) {
      console.warn("[id995a] PDF form fill failed, generating summary:", e);
    }

    // Fallback: generate a clean summary PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const green = rgb(0.06, 0.18, 0.09);
    const gold = rgb(0.64, 0.54, 0.35);
    const white = rgb(1, 1, 1);
    const lightGray = rgb(0.95, 0.95, 0.95);
    const darkText = rgb(0.15, 0.15, 0.15);

    let y = 800;
    const left = 50;
    const right = 545;
    const lineH = 18;

    // Header bar
    page.drawRectangle({ x: 0, y: 810, width: 595, height: 32, color: green });
    page.drawText("HARROWGATE Immigration Consultancy", { x: left, y: 818, size: 11, font: boldFont, color: gold });
    page.drawText("ID995A — Application for Entry for Study in Hong Kong", { x: left, y: 790, size: 14, font: boldFont, color: green });
    page.drawText(`Prepared for: ${submission.name}  |  Ref: STU${submission.passportNumber.slice(-4).toUpperCase()}`, { x: left, y: 772, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    y = 755;

    let currentSection = "";
    for (const field of FORM_FIELDS) {
      if (field.section !== currentSection) {
        currentSection = field.section;
        y -= 8;
        page.drawRectangle({ x: left - 2, y: y - 4, width: right - left + 4, height: 16, color: green });
        page.drawText(`Part A — ${field.section}`, { x: left + 2, y: y, size: 8, font: boldFont, color: gold });
        y -= lineH + 4;
      }

      const value = formData[field.key] || "";
      // Alternating row background
      if (FORM_FIELDS.indexOf(field) % 2 === 0) {
        page.drawRectangle({ x: left - 2, y: y - 5, width: right - left + 4, height: lineH - 2, color: lightGray });
      }
      page.drawText(field.label + ":", { x: left, y, size: 7.5, font: boldFont, color: rgb(0.3, 0.3, 0.3) });
      const valueText = value.length > 70 ? value.slice(0, 68) + "…" : value;
      page.drawText(valueText || "—", { x: 230, y, size: 8, font, color: value ? darkText : rgb(0.7, 0.7, 0.7) });
      y -= lineH;

      if (y < 60) {
        const newPage = pdfDoc.addPage([595, 842]);
        y = 800;
      }
    }

    // Footer
    const pages = pdfDoc.getPages();
    for (const p of pages) {
      p.drawText("This document is confidential and prepared for immigration purposes only.", { x: left, y: 30, size: 7, font, color: rgb(0.5, 0.5, 0.5) });
      p.drawLine({ start: { x: left, y: 42 }, end: { x: right, y: 42 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    }

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="ID995A_${submission.name.replace(/\s+/g, "_")}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("[id995a] Download failed:", err);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

export default router;
