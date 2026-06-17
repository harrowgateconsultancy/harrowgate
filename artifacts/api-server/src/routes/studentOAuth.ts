import { Router } from "express";
import { createHmac, randomBytes, timingSafeEqual, randomUUID } from "crypto";
import { pool } from "@workspace/db";
import { makeStudentToken } from "./studentAuth";

const router = Router();

function getSecret(): string {
  const secret = process.env.STUDENT_JWT_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("No JWT secret configured");
  return secret;
}

// ── CSRF-safe OAuth state (HMAC-signed, no server storage needed) ─────────────
function makeOAuthState(): string {
  const ts = Date.now();
  const nonce = randomBytes(8).toString("hex");
  const payload = `${ts}:${nonce}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex").slice(0, 16);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

function verifyOAuthState(state: string | undefined): boolean {
  if (!state) return false;
  try {
    const decoded = Buffer.from(state, "base64url").toString();
    const lastDot = decoded.lastIndexOf(".");
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    const [tsStr] = payload.split(":");
    if (Date.now() - Number(tsStr) > 10 * 60 * 1000) return false;
    const expectedSig = createHmac("sha256", getSecret()).update(payload).digest("hex").slice(0, 16);
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expectedSig, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch { return false; }
}

// ── URL helpers ───────────────────────────────────────────────────────────────
function getOrigin(req: any): string {
  const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim() || req.protocol;
  const host = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() || req.get("host");
  return `${proto}://${host}`;
}

function frontendBase(req: any): string {
  const base = (process.env.FRONTEND_BASE_PATH || "/").replace(/\/$/, "");
  return `${getOrigin(req)}${base}`;
}

function callbackRedirect(req: any, student: { id: string; email: string; name: string | null }): string {
  const token = makeStudentToken(student.id);
  const userJson = JSON.stringify({ id: student.id, email: student.email, name: student.name });
  return `${frontendBase(req)}/auth/callback?token=${encodeURIComponent(token)}&user=${encodeURIComponent(userJson)}`;
}

function errorRedirect(req: any, message: string): string {
  return `${frontendBase(req)}/sign-in?error=${encodeURIComponent(message)}`;
}

// ── Find or create student from OAuth ─────────────────────────────────────────
async function findOrCreateOAuthStudent(
  provider: "google" | "apple",
  oauthId: string,
  email: string,
  name: string | null
): Promise<{ id: string; email: string; name: string | null }> {
  const col = provider === "google" ? "google_id" : "apple_id";
  const cleanEmail = email.toLowerCase().trim();

  const byId = await pool.query(`SELECT id, email, name FROM student_users WHERE ${col} = $1 LIMIT 1`, [oauthId]);
  if (byId.rows.length > 0) return byId.rows[0];

  const byEmail = await pool.query("SELECT id, email, name FROM student_users WHERE email = $1 LIMIT 1", [cleanEmail]);
  if (byEmail.rows.length > 0) {
    await pool.query(`UPDATE student_users SET ${col} = $1 WHERE id = $2`, [oauthId, byEmail.rows[0].id]);
    return byEmail.rows[0];
  }

  const id = randomUUID();
  await pool.query(
    `INSERT INTO student_users (id, email, name, ${col}) VALUES ($1, $2, $3, $4)`,
    [id, cleanEmail, name?.trim() || null, oauthId]
  );
  return { id, email: cleanEmail, name: name?.trim() || null };
}

// ════════════════════════════════════════════════════════════════════════════
// GOOGLE OAUTH
// ════════════════════════════════════════════════════════════════════════════
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function googleCallbackUri(req: any): string {
  return `${getOrigin(req)}/api/student/auth/google/callback`;
}

router.get("/student/auth/google", (req: any, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.redirect(errorRedirect(req, "Google sign-in is not configured on this server"));

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", googleCallbackUri(req));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", makeOAuthState());
  res.redirect(url.toString());
});

router.get("/student/auth/google/callback", async (req: any, res) => {
  const { code, state, error } = req.query;
  if (error || !code) return res.redirect(errorRedirect(req, "Google sign-in was cancelled"));
  if (!verifyOAuthState(state as string)) return res.redirect(errorRedirect(req, "OAuth state mismatch — please try again"));

  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: googleCallbackUri(req),
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json() as any;
    if (!tokenData.access_token) return res.redirect(errorRedirect(req, "Google code exchange failed"));

    const infoRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const info = await infoRes.json() as any;
    if (!info.sub || !info.email) return res.redirect(errorRedirect(req, "Google did not return email"));

    const student = await findOrCreateOAuthStudent("google", info.sub, info.email, info.name || null);
    res.redirect(callbackRedirect(req, student));
  } catch (err) {
    console.error("[oauth/google]", err);
    res.redirect(errorRedirect(req, "Google sign-in failed — please try again"));
  }
});

// ════════════════════════════════════════════════════════════════════════════
// APPLE SIGN IN
// ════════════════════════════════════════════════════════════════════════════
const APPLE_AUTH_URL = "https://appleid.apple.com/auth/authorize";
const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";

function appleCallbackUri(req: any): string {
  return `${getOrigin(req)}/api/student/auth/apple/callback`;
}

async function createAppleClientSecret(): Promise<string> {
  const { SignJWT, importPKCS8 } = await import("jose");
  const teamId = process.env.APPLE_TEAM_ID;
  const clientId = process.env.APPLE_CLIENT_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKeyPem = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!teamId || !clientId || !keyId || !privateKeyPem) throw new Error("Apple OAuth not fully configured");
  const key = await importPKCS8(privateKeyPem, "ES256");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .setExpirationTime(now + 86400 * 180)
    .setAudience("https://appleid.apple.com")
    .setSubject(clientId)
    .sign(key);
}

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try { return JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()); }
  catch { return null; }
}

router.get("/student/auth/apple", (req: any, res) => {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) return res.redirect(errorRedirect(req, "Apple sign-in is not configured on this server"));

  const url = new URL(APPLE_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", appleCallbackUri(req));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "name email");
  url.searchParams.set("response_mode", "form_post");
  url.searchParams.set("state", makeOAuthState());
  res.redirect(url.toString());
});

router.post("/student/auth/apple/callback", async (req: any, res) => {
  const { code, state, id_token, user: userJson, error } = req.body || {};
  if (error || !code) return res.redirect(errorRedirect(req, "Apple sign-in was cancelled"));
  if (!verifyOAuthState(state)) return res.redirect(errorRedirect(req, "OAuth state mismatch — please try again"));

  try {
    const clientSecret = await createAppleClientSecret();
    const tokenRes = await fetch(APPLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.APPLE_CLIENT_ID!,
        client_secret: clientSecret,
        redirect_uri: appleCallbackUri(req),
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json() as any;
    const claims = decodeJwtPayload(tokenData.id_token || id_token);
    if (!claims?.sub) return res.redirect(errorRedirect(req, "Apple did not return a user ID"));

    let name: string | null = null;
    if (userJson) {
      try {
        const u = typeof userJson === "string" ? JSON.parse(userJson) : userJson;
        name = [u?.name?.firstName, u?.name?.lastName].filter(Boolean).join(" ") || null;
      } catch { /* first login only */ }
    }

    const email = claims.email as string | undefined;
    if (!email) return res.redirect(errorRedirect(req, "Apple did not return email — enable email sharing and try again"));

    const student = await findOrCreateOAuthStudent("apple", claims.sub as string, email, name);
    res.redirect(callbackRedirect(req, student));
  } catch (err) {
    console.error("[oauth/apple]", err);
    res.redirect(errorRedirect(req, "Apple sign-in failed — please try again"));
  }
});

export default router;
