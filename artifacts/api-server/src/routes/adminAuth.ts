import { Router } from "express";
import { createHmac, timingSafeEqual, scryptSync } from "crypto";
import { db } from "@workspace/db";
import { staffAccountsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

function getSecret(): string {
  return process.env.ADMIN_PASSWORD || "fallback-secret-change-me";
}

function getToken(req: any): string | null {
  const auth = req.headers.authorization;
  const headerToken = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const queryToken = typeof req.query?.token === "string" ? req.query.token : null;
  return headerToken ?? queryToken;
}

// --- Admin token (env-var credentials) ---
export function makeAdminToken(): string {
  const exp = Date.now() + 24 * 60 * 60 * 1000;
  const payload = String(exp);
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const dotIdx = decoded.indexOf(".");
    if (dotIdx === -1) return false;
    const payload = decoded.slice(0, dotIdx);
    const sig = decoded.slice(dotIdx + 1);
    // Admin token payload is just a timestamp — no colons
    if (payload.includes(":")) return false;
    const expected = createHmac("sha256", getSecret()).update(payload).digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || a.length === 0) return false;
    if (!timingSafeEqual(a, b)) return false;
    return Date.now() < parseInt(payload);
  } catch {
    return false;
  }
}

// --- Manager / Staff panel token ---
// Format (decoded): staffId:role:expiry.hmac(staffId:role:expiry)
export function makeManagerToken(staffId: number, role: string): string {
  const exp = Date.now() + 24 * 60 * 60 * 1000;
  const payload = `${staffId}:${role}:${exp}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyManagerToken(token: string | undefined | null): { staffId: number; role: string } | null {
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
    const colonCount = (payload.match(/:/g) || []).length;
    if (colonCount < 2) return null;
    const firstColon = payload.indexOf(":");
    const secondColon = payload.indexOf(":", firstColon + 1);
    const staffId = parseInt(payload.slice(0, firstColon));
    const role = payload.slice(firstColon + 1, secondColon);
    const expTs = parseInt(payload.slice(secondColon + 1));
    if (!staffId || !role || isNaN(expTs)) return null;
    if (Date.now() >= expTs) return null;
    return { staffId, role };
  } catch { return null; }
}

// --- Middlewares ---

// Accepts admin token OR manager/staff panel token
export function requireAdminPanelAuth(req: any, res: any, next: any) {
  const token = getToken(req);
  if (verifyAdminToken(token)) {
    req.adminRole = "admin";
    return next();
  }
  const panelResult = verifyManagerToken(token);
  if (panelResult) {
    req.adminRole = panelResult.role;
    req.staffId = panelResult.staffId;
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
}

// Admin-only — rejects manager/staff tokens
export function requireAdminOnly(req: any, res: any, next: any) {
  const token = getToken(req);
  if (verifyAdminToken(token)) {
    req.adminRole = "admin";
    return next();
  }
  return res.status(403).json({ error: "Admin access only" });
}

// Kept for backward compatibility
export function requireAdminAuth(req: any, res: any, next: any) {
  return requireAdminPanelAuth(req, res, next);
}

// --- Password helpers ---
function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const hashBuf = Buffer.from(hash, "hex");
    const derivedBuf = scryptSync(password, salt, 64);
    return hashBuf.length === derivedBuf.length && timingSafeEqual(hashBuf, derivedBuf);
  } catch { return false; }
}

// --- Routes ---

// Combined login: tries admin env-var creds first, then staff/manager DB
router.post("/admin/login", async (req, res) => {
  const { username, password } = req.body || {};
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) {
    return res.status(500).json({ error: "Admin credentials not configured on server" });
  }

  // Admin env-var check
  if (username === expectedUser && password === expectedPass) {
    return res.json({ token: makeAdminToken(), role: "admin", name: "Admin" });
  }

  // Staff/manager DB check
  try {
    const [staff] = await db
      .select()
      .from(staffAccountsTable)
      .where(eq(staffAccountsTable.username, username))
      .limit(1);
    if (staff && verifyPassword(password, staff.passwordHash)) {
      const token = makeManagerToken(staff.id, staff.role);
      return res.json({ token, role: staff.role, name: staff.name });
    }
  } catch { /* fall through */ }

  return res.status(401).json({ error: "Invalid username or password" });
});

// Returns current authenticated user info
router.get("/admin/me", (req: any, res) => {
  const token = getToken(req);
  if (verifyAdminToken(token)) {
    return res.json({ role: "admin", name: "Admin" });
  }
  const panelResult = verifyManagerToken(token);
  if (panelResult) {
    return res.json({ role: panelResult.role, staffId: panelResult.staffId });
  }
  return res.status(401).json({ error: "Unauthorized" });
});

export default router;
