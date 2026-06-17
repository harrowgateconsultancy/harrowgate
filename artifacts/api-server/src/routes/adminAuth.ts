import { Router } from "express";
import { createHmac, timingSafeEqual, scryptSync, randomBytes } from "crypto";
import { db, pool } from "@workspace/db";
import { staffAccountsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { sendAdminPasswordResetEmail } from "../email";
import { registerSession, heartbeatSession, removeSession } from "../lib/sessionTracker";

const router = Router();

// ── Bootstrap tables ─────────────────────────────────────────────────────────
export async function initAdminCredentialsTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_credentials (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_reset_tokens (
      id SERIAL PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// ── Credential helpers ────────────────────────────────────────────────────────
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyHashedPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const hashBuf = Buffer.from(hash, "hex");
    const derivedBuf = scryptSync(password, salt, 64);
    return hashBuf.length === derivedBuf.length && timingSafeEqual(hashBuf, derivedBuf);
  } catch { return false; }
}

async function getAdminCredentials(): Promise<{ username: string; passwordHash: string } | null> {
  try {
    const res = await pool.query("SELECT username, password_hash FROM admin_credentials LIMIT 1");
    if (res.rows.length > 0) {
      return { username: res.rows[0].username, passwordHash: res.rows[0].password_hash };
    }
    return null;
  } catch { return null; }
}

// ── Token signing (always uses env-var secret so tokens survive credential changes) ──
function getSecret(): string {
  return process.env.ADMIN_PASSWORD || "fallback-secret-change-me";
}

function getToken(req: any): string | null {
  const auth = req.headers.authorization;
  const headerToken = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const queryToken = typeof req.query?.token === "string" ? req.query.token : null;
  return headerToken ?? queryToken;
}

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

// ── Middlewares ───────────────────────────────────────────────────────────────
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

export function requireAdminOnly(req: any, res: any, next: any) {
  const token = getToken(req);
  if (verifyAdminToken(token)) {
    req.adminRole = "admin";
    return next();
  }
  return res.status(403).json({ error: "Admin access only" });
}

export function requireAdminAuth(req: any, res: any, next: any) {
  return requireAdminPanelAuth(req, res, next);
}

// ── Password helpers (staff accounts — scrypt without separate salt prefix) ──
function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const hashBuf = Buffer.from(hash, "hex");
    const derivedBuf = scryptSync(password, salt, 64);
    return hashBuf.length === derivedBuf.length && timingSafeEqual(hashBuf, derivedBuf);
  } catch { return false; }
}

// ── Routes ────────────────────────────────────────────────────────────────────

function clientIp(req: any): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
}

// Combined login: DB override → env-var admin → staff/manager DB
router.post("/admin/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }
  const ip = clientIp(req);

  // 1. Check DB credential override (admin changed their credentials)
  try {
    const dbCreds = await getAdminCredentials();
    if (dbCreds) {
      if (username === dbCreds.username && verifyHashedPassword(password, dbCreds.passwordHash)) {
        const sessionId = randomBytes(16).toString("hex");
        registerSession(sessionId, "admin", username, ip);
        return res.json({ token: makeAdminToken(), role: "admin", name: "Admin", sessionId });
      }
    } else {
      // 2. Fall back to env-var credentials
      const expectedUser = process.env.ADMIN_USERNAME;
      const expectedPass = process.env.ADMIN_PASSWORD;
      if (expectedUser && expectedPass && username === expectedUser && password === expectedPass) {
        const sessionId = randomBytes(16).toString("hex");
        registerSession(sessionId, "admin", username, ip);
        return res.json({ token: makeAdminToken(), role: "admin", name: "Admin", sessionId });
      }
    }
  } catch { /* fall through to staff check */ }

  // 3. Staff/manager DB check
  try {
    const [staff] = await db
      .select()
      .from(staffAccountsTable)
      .where(eq(staffAccountsTable.username, username))
      .limit(1);
    if (staff && verifyPassword(password, staff.passwordHash)) {
      const token = makeManagerToken(staff.id, staff.role);
      const sessionId = randomBytes(16).toString("hex");
      registerSession(sessionId, staff.role, staff.name, ip);
      return res.json({ token, role: staff.role, name: staff.name, sessionId });
    }
  } catch { /* fall through */ }

  return res.status(401).json({ error: "Invalid username or password" });
});

// Heartbeat — keeps session alive; re-registers if lost (e.g. server restart)
router.post("/admin/heartbeat", (req: any, res) => {
  const { sessionId, role, name } = req.body || {};
  if (sessionId) {
    const found = heartbeatSession(sessionId);
    if (!found && role && name) {
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
        || req.socket?.remoteAddress
        || "unknown";
      registerSession(sessionId, role, name, ip);
    }
  }
  res.json({ ok: true });
});

// Remove session on logout
router.delete("/admin/session", (req: any, res) => {
  const { sessionId } = req.body || {};
  if (sessionId) removeSession(sessionId);
  res.json({ ok: true });
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

// ── Change admin credentials (requires current admin token) ───────────────────
router.put("/admin/credentials", requireAdminOnly, async (req: any, res) => {
  const { currentPassword, newUsername, newPassword } = req.body || {};
  if (!currentPassword || !newUsername || !newPassword) {
    return res.status(400).json({ error: "currentPassword, newUsername, and newPassword are required" });
  }
  if (newUsername.trim().length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  // Verify current password against DB or env
  try {
    const dbCreds = await getAdminCredentials();
    let valid = false;
    if (dbCreds) {
      valid = verifyHashedPassword(currentPassword, dbCreds.passwordHash);
    } else {
      valid = currentPassword === process.env.ADMIN_PASSWORD;
    }
    if (!valid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const newHash = hashPassword(newPassword.trim());
    const existing = await pool.query("SELECT id FROM admin_credentials LIMIT 1");
    if (existing.rows.length > 0) {
      await pool.query(
        "UPDATE admin_credentials SET username = $1, password_hash = $2, updated_at = NOW() WHERE id = $3",
        [newUsername.trim(), newHash, existing.rows[0].id]
      );
    } else {
      await pool.query(
        "INSERT INTO admin_credentials (username, password_hash) VALUES ($1, $2)",
        [newUsername.trim(), newHash]
      );
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("[admin credentials] Failed to update:", err);
    return res.status(500).json({ error: "Failed to update credentials" });
  }
});

// ── Forgot password — sends reset link to backup email ────────────────────────
router.post("/admin/forgot-password", async (req, res) => {
  try {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await pool.query(
      "INSERT INTO admin_reset_tokens (token, expires_at) VALUES ($1, $2)",
      [token, expiresAt]
    );
    // Derive the portal base URL from request
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const resetLink = `${proto}://${host}/admin?reset_token=${token}`;
    await sendAdminPasswordResetEmail(resetLink);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[forgot-password] Failed:", err);
    return res.status(500).json({ error: "Failed to send reset email" });
  }
});

// ── Reset password via token ──────────────────────────────────────────────────
router.post("/admin/reset-password", async (req, res) => {
  const { token, newUsername, newPassword } = req.body || {};
  if (!token || !newUsername || !newPassword) {
    return res.status(400).json({ error: "token, newUsername, and newPassword are required" });
  }
  if (newUsername.trim().length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  try {
    const result = await pool.query(
      "SELECT id, expires_at, used FROM admin_reset_tokens WHERE token = $1 LIMIT 1",
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }
    const row = result.rows[0];
    if (row.used) {
      return res.status(400).json({ error: "This reset link has already been used" });
    }
    if (new Date(row.expires_at) < new Date()) {
      return res.status(400).json({ error: "This reset link has expired. Please request a new one." });
    }

    // Mark token used
    await pool.query("UPDATE admin_reset_tokens SET used = TRUE WHERE id = $1", [row.id]);

    // Update credentials
    const newHash = hashPassword(newPassword.trim());
    const existing = await pool.query("SELECT id FROM admin_credentials LIMIT 1");
    if (existing.rows.length > 0) {
      await pool.query(
        "UPDATE admin_credentials SET username = $1, password_hash = $2, updated_at = NOW() WHERE id = $3",
        [newUsername.trim(), newHash, existing.rows[0].id]
      );
    } else {
      await pool.query(
        "INSERT INTO admin_credentials (username, password_hash) VALUES ($1, $2)",
        [newUsername.trim(), newHash]
      );
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("[reset-password] Failed:", err);
    return res.status(500).json({ error: "Failed to reset password" });
  }
});

export default router;
