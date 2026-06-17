import { Router } from "express";
import { createHmac, scryptSync, randomBytes, timingSafeEqual, randomUUID } from "crypto";
import { pool } from "@workspace/db";

const router = Router();

function getSecret(): string {
  return process.env.STUDENT_JWT_SECRET || process.env.ADMIN_PASSWORD || "fallback-student-secret-change-me";
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const hashBuf = Buffer.from(hash, "hex");
    const derivedBuf = scryptSync(password, salt, 64);
    return hashBuf.length === derivedBuf.length && timingSafeEqual(hashBuf, derivedBuf);
  } catch { return false; }
}

function makeStudentToken(studentId: string): string {
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const payload = `${studentId}:${exp}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyStudentToken(token: string | undefined | null): string | null {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot === -1) return null;
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    const expectedSig = createHmac("sha256", getSecret()).update(payload).digest("hex");
    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
    const colonIdx = payload.lastIndexOf(":");
    const studentId = payload.slice(0, colonIdx);
    const exp = Number(payload.slice(colonIdx + 1));
    if (Date.now() > exp) return null;
    return studentId;
  } catch { return null; }
}

export async function initStudentTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

router.post("/student/register", async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

    const email_ = email.toLowerCase().trim();
    const existing = await pool.query("SELECT id FROM student_users WHERE email = $1 LIMIT 1", [email_]);
    if (existing.rows.length > 0) return res.status(409).json({ error: "An account with this email already exists" });

    const id = randomUUID();
    const passwordHash = hashPassword(password);
    await pool.query(
      "INSERT INTO student_users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)",
      [id, email_, passwordHash, name?.trim() || null]
    );
    const token = makeStudentToken(id);
    res.status(201).json({ token, student: { id, email: email_, name: name?.trim() || null } });
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "An account with this email already exists" });
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/student/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const result = await pool.query(
      "SELECT id, email, password_hash, name FROM student_users WHERE email = $1 LIMIT 1",
      [email.toLowerCase().trim()]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: "Invalid email or password" });

    const student = result.rows[0];
    if (!verifyPassword(password, student.password_hash)) return res.status(401).json({ error: "Invalid email or password" });

    const token = makeStudentToken(student.id);
    res.json({ token, student: { id: student.id, email: student.email, name: student.name } });
  } catch { res.status(500).json({ error: "Login failed" }); }
});

router.get("/student/me", async (req: any, res) => {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const studentId = verifyStudentToken(token);
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });

  const result = await pool.query("SELECT id, email, name FROM student_users WHERE id = $1 LIMIT 1", [studentId]);
  if (result.rows.length === 0) return res.status(404).json({ error: "Student not found" });
  const s = result.rows[0];
  res.json({ id: s.id, email: s.email, name: s.name });
});

export default router;
