import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export interface EmailSummary {
  uid: number;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  seen: boolean;
}

export interface EmailDetail extends EmailSummary {
  html: string | null;
  text: string | null;
}

const listCache = new Map<string, { at: number; data: EmailSummary[] }>();
const CACHE_TTL = 3 * 60 * 1000;

function makeClient(email: string, appPassword: string) {
  return new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: email, pass: appPassword },
    logger: false,
    tls: { rejectUnauthorized: false },
    // Fail fast so the endpoint doesn't hang
    connectionTimeout: 12000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
  });
}

function friendlyError(err: any): string {
  const code: string = err?.code ?? "";
  const msg: string = (err?.message ?? "").toLowerCase();
  if (
    code === "ETIMEOUT" ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("command failed") ||
    msg.includes("socket") ||
    code === "ECONNRESET"
  ) {
    return "Could not connect to Gmail — IMAP (port 993) may be blocked in this environment. The inbox works on the live deployed site. Make sure IMAP is enabled in Gmail settings and the password is a Google App Password.";
  }
  if (
    code === "EAUTH" ||
    msg.includes("authentication") ||
    msg.includes("credentials") ||
    msg.includes("invalid credentials") ||
    msg.includes("app-specific password") ||
    msg.includes("username and password")
  ) {
    return "Gmail authentication failed — please ensure the password set by admin is a valid Google App Password (not the regular Gmail password).";
  }
  if (code === "ENOTFOUND" || code === "ECONNREFUSED") {
    return "Could not reach Gmail. Please check your network and try again.";
  }
  return err?.message ?? "Failed to connect to inbox";
}

export async function listInboxEmails(
  email: string,
  appPassword: string,
  maxMessages = 50,
  forceRefresh = false,
): Promise<EmailSummary[]> {
  const key = email.toLowerCase();
  if (!forceRefresh) {
    const cached = listCache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL) return cached.data;
  }

  const client = makeClient(email, appPassword);

  // Catch idle/background errors so they don't become unhandled rejections
  client.on("error", () => {});

  try {
    await client.connect();
  } catch (err) {
    // Ensure the client is destroyed before throwing
    try { client.close(); } catch { /* ignore */ }
    throw new Error(friendlyError(err));
  }

  const results: EmailSummary[] = [];

  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const status = await client.status("INBOX", { messages: true });
      const total = status.messages ?? 0;
      if (total === 0) {
        listCache.set(key, { at: Date.now(), data: [] });
        return [];
      }

      const start = Math.max(1, total - maxMessages + 1);
      for await (const msg of client.fetch(`${start}:${total}`, {
        uid: true,
        flags: true,
        envelope: true,
        bodyParts: ["1"],
      })) {
        const env = msg.envelope;
        const from = env?.from?.[0];
        const fromStr = from?.name
          ? `${from.name} <${from.address}>`
          : (from?.address ?? "Unknown");

        let snippet = "";
        try {
          const part = msg.bodyParts?.get("1");
          if (part) {
            snippet = part.toString().replace(/=\r?\n/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
          }
        } catch { /* no preview */ }

        results.push({
          uid: msg.uid,
          subject: env?.subject ?? "(no subject)",
          from: fromStr,
          date: env?.date?.toISOString() ?? new Date().toISOString(),
          snippet,
          seen: (msg.flags ?? new Set()).has("\\Seen"),
        });
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    throw new Error(friendlyError(err));
  } finally {
    try { await client.logout(); } catch { try { client.close(); } catch { /* ignore */ } }
  }

  results.reverse();
  listCache.set(key, { at: Date.now(), data: results });
  return results;
}

export function invalidateCache(email: string) {
  listCache.delete(email.toLowerCase());
}

export async function getEmailDetail(
  email: string,
  appPassword: string,
  uid: number,
): Promise<EmailDetail | null> {
  const client = makeClient(email, appPassword);
  client.on("error", () => {});

  try {
    await client.connect();
  } catch (err) {
    try { client.close(); } catch { /* ignore */ }
    throw new Error(friendlyError(err));
  }

  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      await client.messageFlagsAdd({ uid }, ["\\Seen"], { uid: true });

      const dl = await client.download(`${uid}`, undefined, { uid: true });
      if (!dl) return null;

      const chunks: Buffer[] = [];
      for await (const chunk of dl.content) chunks.push(chunk);
      const parsed = await simpleParser(Buffer.concat(chunks));

      const from = parsed.from?.value?.[0];
      const fromStr = from?.name
        ? `${from.name} <${from.address}>`
        : (from?.address ?? "Unknown");

      return {
        uid,
        subject: parsed.subject ?? "(no subject)",
        from: fromStr,
        date: parsed.date?.toISOString() ?? new Date().toISOString(),
        snippet: (parsed.text ?? "").slice(0, 180),
        seen: true,
        html: parsed.html || null,
        text: parsed.text ?? null,
      };
    } finally {
      lock.release();
    }
  } catch (err) {
    throw new Error(friendlyError(err));
  } finally {
    try { await client.logout(); } catch { try { client.close(); } catch { /* ignore */ } }
  }
}
