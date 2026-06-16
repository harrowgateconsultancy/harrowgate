export type SessionRecord = {
  id: string;
  role: string;
  name: string;
  ip: string;
  loginAt: number;
  lastSeen: number;
};

const sessions = new Map<string, SessionRecord>();
let onUpdate: (() => void) | null = null;

export function setSessionUpdateEmitter(fn: () => void) {
  onUpdate = fn;
}

export function registerSession(id: string, role: string, name: string, ip: string) {
  sessions.set(id, { id, role, name, ip, loginAt: Date.now(), lastSeen: Date.now() });
  onUpdate?.();
}

export function heartbeatSession(id: string): boolean {
  const s = sessions.get(id);
  if (!s) return false;
  s.lastSeen = Date.now();
  return true;
}

export function removeSession(id: string) {
  if (sessions.delete(id)) onUpdate?.();
}

export function getActiveSessions(): SessionRecord[] {
  const now = Date.now();
  const TIMEOUT = 3 * 60 * 1000;
  const active: SessionRecord[] = [];
  for (const [id, s] of sessions) {
    if (now - s.lastSeen > TIMEOUT) {
      sessions.delete(id);
    } else {
      active.push({ ...s });
    }
  }
  return active;
}

setInterval(() => {
  const before = sessions.size;
  getActiveSessions();
  if (sessions.size !== before) onUpdate?.();
}, 60_000);
