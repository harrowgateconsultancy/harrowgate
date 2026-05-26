import { Router } from "express";
import { db } from "@workspace/db";
import {
  studentSubmissionsTable,
  studentDocumentsTable,
  id995aFormsTable,
  immigrationLettersTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { ObjectStorageService } from "../lib/objectStorage";

const router = Router();
const objectStorageService = new ObjectStorageService();

const LETTER_TITLES = [
  "Reason for Studying the Course",
  "Reason for Studying in Hong Kong",
  "Reason for Choosing the University",
  "Future Plans After Completion of Course",
];

function letterHtml(
  studentName: string,
  letterNum: number,
  letterTitle: string,
  body: string,
  courseName: string,
  universityName: string,
  dateStr: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Letter ${letterNum} – ${letterTitle}</title>
  <style>
    @page { size: A4; margin: 2.5cm 2.5cm 2.5cm 2.5cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 12pt;
      line-height: 1.7;
      color: #111;
      background: #fff;
      padding: 2cm;
      max-width: 21cm;
      margin: 0 auto;
    }
    .header-block { margin-bottom: 2em; }
    .applicant-name { font-size: 13pt; font-weight: bold; margin-bottom: 0.2em; }
    .date-line { margin-bottom: 1.5em; }
    .recipient { margin-bottom: 1.5em; }
    .recipient strong { display: block; }
    .subject-line { margin-bottom: 1.5em; }
    .subject-line strong { text-decoration: underline; }
    .body { margin-bottom: 2em; white-space: pre-wrap; }
    .closing { margin-top: 2em; }
    .signature-space { margin-top: 3em; border-bottom: 1px solid #333; width: 10cm; }
    .print-btn {
      position: fixed; top: 1em; right: 1em;
      background: #1a3a1a; color: #c9a84c;
      border: none; padding: 0.6em 1.4em;
      border-radius: 6px; font-size: 11pt;
      cursor: pointer; font-family: Arial, sans-serif;
    }
    @media print { .print-btn { display: none; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">⬇ Print / Save PDF</button>

  <div class="header-block">
    <div class="applicant-name">${escapeHtml(studentName)}</div>
  </div>

  <div class="date-line">${escapeHtml(dateStr)}</div>

  <div class="recipient">
    <strong>The Director of Immigration</strong>
    Immigration Department<br />
    Immigration Tower, 7 Gloucester Road<br />
    Wan Chai, Hong Kong
  </div>

  <div class="subject-line">
    <strong>Re: Student Visa Application — Letter ${letterNum}: ${escapeHtml(letterTitle)}</strong><br />
    Course: ${escapeHtml(courseName)} | Institution: ${escapeHtml(universityName)}
  </div>

  <p>Dear Director,</p>

  <div class="body">${escapeHtml(body)}</div>

  <div class="closing">
    <p>Yours faithfully,</p>
    <div class="signature-space"></div>
    <p style="margin-top:0.5em;">${escapeHtml(studentName)}</p>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

// ── GET /api/admin/student-submissions/:id/immigration-letters ────────────
router.get("/admin/student-submissions/:id/immigration-letters", async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const [row] = await db.select().from(immigrationLettersTable)
      .where(eq(immigrationLettersTable.submissionId, submissionId)).limit(1);
    res.json(row || null);
  } catch { res.status(500).json({ error: "Failed to fetch immigration letters" }); }
});

// ── POST /api/admin/student-submissions/:id/immigration-letters/generate ──
router.post("/admin/student-submissions/:id/immigration-letters/generate", async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const { courseName, universityName, courseWebsite } = req.body;
    if (!courseName?.trim() || !universityName?.trim()) {
      return res.status(400).json({ error: "Course name and university name are required" });
    }

    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(eq(studentSubmissionsTable.id, submissionId)).limit(1);
    if (!submission) return res.status(404).json({ error: "Submission not found" });

    const [form] = await db.select().from(id995aFormsTable)
      .where(eq(id995aFormsTable.submissionId, submissionId)).limit(1);
    const formData: Record<string, string> = (form?.formData as Record<string, string>) || {};

    const studentDocs = await db.select().from(studentDocumentsTable)
      .where(eq(studentDocumentsTable.submissionId, submissionId));

    const studentInfo = `
Name: ${submission.name}
Date of Birth: ${submission.dateOfBirth}
Passport Number: ${submission.passportNumber}
Nationality: ${formData.nationality || "Not specified"}
Place of Birth: ${formData.placeOfBirth || "Not specified"}
Country of Domicile: ${formData.countryOfDomicile || "Not specified"}
Marital Status: ${formData.maritalStatus || "Not specified"}
Occupation: ${formData.occupation || "Student"}
Education (from form): ${[
  formData.educationInstitution1, formData.educationQualification1,
  formData.educationInstitution2, formData.educationQualification2,
].filter(Boolean).join(", ") || "Not specified"}
Previous HK visits: ${formData.previousHkVisits || "None stated"}
`.trim();

    const systemPrompt = `You are an expert immigration consultant helping a student write formal letters to the Hong Kong Director of Immigration in support of a student visa application.

Write professional, sincere, first-person letters. Each letter should be 350–500 words. Use formal English. 
CRITICAL RULES:
- Do NOT mention employment, working, or earning income during the study period or after graduation.
- Do NOT mention plans to remain in Hong Kong after the course.
- Do NOT make any references to working rights or work permits.
- Focus on academic passion, personal growth, cultural experience, and contribution to home country upon return.
- Make each letter feel personal and genuine, not generic.
- Return your response as a JSON object with keys "letter1", "letter2", "letter3", "letter4".`;

    const userPrompt = `Student information:
${studentInfo}

Course Details:
- Course Name: ${courseName}
- University / Institution: ${universityName}
- Course Website: ${courseWebsite || "Not provided"}

Write four separate letters addressed to the Director of Immigration, Hong Kong:

Letter 1 – "Reason for Studying the Course": Why the student wants to study "${courseName}" specifically. Their interest, passion, how it connects to their background and academic journey.

Letter 2 – "Reason for Studying in Hong Kong": Why Hong Kong specifically for higher education — its academic excellence, international reputation, cultural richness, geographic advantages, and the student's connection or attraction to Hong Kong.

Letter 3 – "Reason for Choosing ${universityName}": The specific reasons for choosing this institution — its reputation, programmes, faculty, environment, unique opportunities it offers for this course.

Letter 4 – "Future Plans After Completion": The student's vision for personal and academic growth after completing the course. Focus on contributing to their home country, further academic pursuits, or how the knowledge gained will be applied. Do NOT mention working in Hong Kong or employment during study.

Return only a JSON object: { "letter1": "...", "letter2": "...", "letter3": "...", "letter4": "..." }`;

    const imageParts: any[] = [{ type: "text", text: userPrompt }];

    const passportDoc = studentDocs.find(d => d.documentType === "passport_doc");
    if (passportDoc && passportDoc.mimeType?.startsWith("image/")) {
      try {
        const response = await objectStorageService.downloadObject(passportDoc.fileUrl, 0);
        const b64 = Buffer.from(await response.arrayBuffer()).toString("base64");
        imageParts.push({
          type: "image_url",
          image_url: { url: `data:${passportDoc.mimeType};base64,${b64}`, detail: "high" },
        });
      } catch { /* skip if passport image unavailable */ }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: imageParts },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let letters: Record<string, string> = {};
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      letters = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch { letters = {}; }

    if (!letters.letter1 && !letters.letter2) {
      return res.status(500).json({ error: "AI failed to generate letters. Please try again." });
    }

    const now = new Date();
    const [existing] = await db.select().from(immigrationLettersTable)
      .where(eq(immigrationLettersTable.submissionId, submissionId)).limit(1);

    let saved;
    const payload = {
      submissionId,
      courseName: courseName.trim(),
      universityName: universityName.trim(),
      courseWebsite: courseWebsite?.trim() || null,
      letter1: letters.letter1 || null,
      letter2: letters.letter2 || null,
      letter3: letters.letter3 || null,
      letter4: letters.letter4 || null,
      generatedAt: now,
      updatedAt: now,
    };

    if (existing) {
      [saved] = await db.update(immigrationLettersTable).set(payload)
        .where(eq(immigrationLettersTable.submissionId, submissionId)).returning();
    } else {
      [saved] = await db.insert(immigrationLettersTable).values(payload).returning();
    }

    res.json(saved);
  } catch (err) {
    console.error("[immigration-letters] Generation failed:", err);
    res.status(500).json({ error: "Failed to generate immigration letters" });
  }
});

// ── GET /api/admin/student-submissions/:id/immigration-letters/:num/view ──
router.get("/admin/student-submissions/:id/immigration-letters/:num/view", async (req: any, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const num = parseInt(req.params.num);
    if (num < 1 || num > 4) return res.status(400).json({ error: "Letter number must be 1–4" });

    const [submission] = await db.select().from(studentSubmissionsTable)
      .where(eq(studentSubmissionsTable.id, submissionId)).limit(1);
    if (!submission) return res.status(404).json({ error: "Not found" });

    const [row] = await db.select().from(immigrationLettersTable)
      .where(eq(immigrationLettersTable.submissionId, submissionId)).limit(1);
    if (!row) return res.status(404).json({ error: "Letters not generated yet" });

    const letterBody = (row as any)[`letter${num}`] as string | null;
    if (!letterBody) return res.status(404).json({ error: "Letter not available" });

    const html = letterHtml(
      submission.name,
      num,
      LETTER_TITLES[num - 1],
      letterBody,
      row.courseName || "",
      row.universityName || "",
      formatDate(),
    );

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    console.error("[immigration-letters] View failed:", err);
    res.status(500).json({ error: "Failed to render letter" });
  }
});

export default router;
