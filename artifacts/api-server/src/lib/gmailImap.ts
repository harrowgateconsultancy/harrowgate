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

// Per-account cache: 3-minute TTL
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
  });
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
  await client.connect();
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
      const range = `${start}:${total}`;

      for await (const msg of client.fetch(range, {
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
            const raw = part.toString().replace(/=\r?\n/g, "").replace(/<[^>]+>/g, " ").trim();
            snippet = raw.slice(0, 180);
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
  } finally {
    await client.logout();
  }

  results.reverse(); // newest first
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
  await client.connect();

  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      // Mark as read
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
  } finally {
    await client.logout();
  }
}
