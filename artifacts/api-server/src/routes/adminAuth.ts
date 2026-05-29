import { Router } from "express";
import { createHmac, timingSafeEqual } from "crypto";

const router = Router();

function getSecret(): string {
  return process.env.ADMIN_PASSWORD || "fallback-secret-change-me";
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

export function requireAdminAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.post("/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) {
    return res.status(500).json({ error: "Admin credentials not configured on server" });
  }
  if (username !== expectedUser || password !== expectedPass) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  res.json({ token: makeAdminToken() });
});

export default router;
