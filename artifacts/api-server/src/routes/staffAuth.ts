import { Router } from "express";
import { createHmac, scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { db } from "@workspace/db";
import { staffAccountsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

function getSecret(): string {
  return process.env.ADMIN_PASSWORD || "fallback-staff-secret";
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

export function makeStaffToken(staffId: number): string {
  const exp = Date.now() + 8 * 60 * 60 * 1000;
  const payload = `${staffId}:${exp}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyStaffToken(token: string | undefined | null): { staffId: number } | null {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const dotIdx = decoded.lastIndexOf(".");
    if (dotIdx === -1) return null;
    const payload = decoded.slice(0, dotIdx);
    const sig = decoded.slice(dotIdx + 1);
    const expected = createHmac("sha256", getSecret()).update(payload).digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || a.length === 0) return null;
    if (!timingSafeEqual(a, b)) return null;
    const colonIdx = payload.indexOf(":");
    const staffId = parseInt(payload.slice(0, colonIdx));
    const expTs = parseInt(payload.slice(colonIdx + 1));
    if (Date.now() >= expTs) return null;
    return { staffId };
  } catch { return null; }
}

export function requireStaffAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const result = verifyStaffToken(token);
  if (!result) return res.status(401).json({ error: "Unauthorized" });
  req.staffId = result.staffId;
  next();
}

// Staff login
router.post("/staff/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    const [staff] = await db.select().from(staffAccountsTable).where(eq(staffAccountsTable.username, username)).limit(1);
    if (!staff || !verifyPassword(password, staff.passwordHash)) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    const token = makeStaffToken(staff.id);
    res.json({ token, staff: { id: staff.id, name: staff.name, username: staff.username, role: staff.role } });
  } catch { res.status(500).json({ error: "Login failed" }); }
});

// Admin: create staff account
router.post("/admin/staff", async (req, res) => {
  try {
    const { name, username, password, email, role } = req.body || {};
    if (!name || !username || !password) return res.status(400).json({ error: "Name, username and password required" });
    const passwordHash = hashPassword(password);
    const [staff] = await db.insert(staffAccountsTable)
      .values({ name, username, passwordHash, email: email || null, role: role || "staff" })
      .returning();
    res.status(201).json({ id: staff.id, name: staff.name, username: staff.username, role: staff.role, email: staff.email, createdAt: staff.createdAt });
  } catch (e: any) {
    if (e?.message?.includes("unique")) return res.status(409).json({ error: "Username already taken" });
    res.status(500).json({ error: "Failed to create staff account" });
  }
});

// Admin: list staff
router.get("/admin/staff", async (_req, res) => {
  try {
    const staff = await db.select({
      id: staffAccountsTable.id,
      name: staffAccountsTable.name,
      username: staffAccountsTable.username,
      email: staffAccountsTable.email,
      role: staffAccountsTable.role,
      createdAt: staffAccountsTable.createdAt,
    }).from(staffAccountsTable);
    res.json(staff);
  } catch { res.status(500).json({ error: "Failed to fetch staff" }); }
});

// Admin: delete staff
router.delete("/admin/staff/:id", async (req, res) => {
  try {
    await db.delete(staffAccountsTable).where(eq(staffAccountsTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to delete staff" }); }
});

export default router;
