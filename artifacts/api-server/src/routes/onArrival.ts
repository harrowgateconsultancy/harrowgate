import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { db, pool } from "@workspace/db";
import { onArrivalApplicationsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

// ── Ensure table exists (bypasses the broken Drizzle migrator) ────────────────
export async function initOnArrivalTable() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "on_arrival_applications" (
        "id" serial PRIMARY KEY NOT NULL,
        "form_data" jsonb NOT NULL,
        "passport_path" text,
        "photo_path" text,
        "hotel_path" text,
        "business_path" text,
        "status" text DEFAULT 'pending' NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);
  } finally {
    client.release();
  }
}

const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), "uploads", "on-arrival");

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(pdf|jpg|jpeg|png)$/i.test(file.originalname);
    cb(null, ok);
  },
});

// ── Public submit ─────────────────────────────────────────────────────────────
router.post(
  "/on-arrival/submit",
  upload.fields([
    { name: "passport", maxCount: 1 },
    { name: "photo", maxCount: 1 },
    { name: "hotel", maxCount: 1 },
    { name: "business", maxCount: 1 },
  ]),
  async (req: any, res: any) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[]>;
      const formData = JSON.parse(req.body.formData || "{}");

      const [row] = await db
        .insert(onArrivalApplicationsTable)
        .values({
          formData,
          passportPath: files?.passport?.[0]?.path ?? null,
          photoPath: files?.photo?.[0]?.path ?? null,
          hotelPath: files?.hotel?.[0]?.path ?? null,
          businessPath: files?.business?.[0]?.path ?? null,
          status: "pending",
        })
        .returning();

      res.json({ ok: true, id: row.id });
    } catch (err) {
      console.error("on-arrival submit error", err);
      res.status(500).json({ error: "Submission failed — please try again." });
    }
  }
);

// ── Admin: list all applications ──────────────────────────────────────────────
router.get("/admin/pages/on-arrival/applications", async (_req, res: any) => {
  try {
    const rows = await db
      .select()
      .from(onArrivalApplicationsTable)
      .orderBy(desc(onArrivalApplicationsTable.createdAt));
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

// ── Admin: update status ──────────────────────────────────────────────────────
router.put("/admin/pages/on-arrival/applications/:id/status", async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    const VALID = ["pending", "processing", "approved", "rejected"];
    if (!VALID.includes(status)) return res.status(400).json({ error: "Invalid status" });
    const [row] = await db
      .update(onArrivalApplicationsTable)
      .set({ status })
      .where(eq(onArrivalApplicationsTable.id, id))
      .returning();
    res.json(row);
  } catch {
    res.status(500).json({ error: "Failed to update status" });
  }
});

// ── Admin: download a file (token accepted via query param for <a> direct links) ─
router.get("/admin/pages/on-arrival/file/:id/:type", async (req: any, res: any) => {
  // Accept token from query string so browser <a href> downloads work
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  try {
    const id = parseInt(req.params.id, 10);
    const type = req.params.type as "passport" | "photo" | "hotel" | "business";
    const COL_MAP: Record<string, keyof typeof onArrivalApplicationsTable.$inferSelect> = {
      passport: "passportPath",
      photo: "photoPath",
      hotel: "hotelPath",
      business: "businessPath",
    };
    if (!COL_MAP[type]) return res.status(400).json({ error: "Invalid type" });

    const [row] = await db
      .select()
      .from(onArrivalApplicationsTable)
      .where(eq(onArrivalApplicationsTable.id, id))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Application not found" });

    const filePath = row[COL_MAP[type] as keyof typeof row] as string | null;
    if (!filePath || !fs.existsSync(filePath))
      return res.status(404).json({ error: "File not found" });

    res.download(filePath, path.basename(filePath));
  } catch {
    res.status(500).json({ error: "Failed to serve file" });
  }
});

export default router;
