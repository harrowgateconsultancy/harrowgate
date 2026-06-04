import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { LogOut, Bell, BellOff, Calendar, Paperclip, CheckSquare, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { playTaskAlertSound, unlockAudio } from "../../lib/notificationSound";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }
function staffFetch(url: string, opts?: RequestInit) {
  const token = localStorage.getItem("staff_token");
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts?.headers ?? {}) } });
}

const GOLD = "#a28959";
const BG = "#0b1f10";

const PRIORITIES: Record<string, { label: string; color: string; bg: string }> = {
  low:    { label: "Low",    color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  medium: { label: "Medium", color: GOLD,      bg: "rgba(162,137,89,0.12)" },
  high:   { label: "High",   color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  urgent: { label: "Urgent", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:     { label: "To Do",       color: "rgba(255,255,255,0.4)", icon: <Clock size={12} /> },
  in_progress: { label: "In Progress", color: "#fb923c", icon: <CheckSquare size={12} /> },
  done:        { label: "Done",        color: "#4ade80", icon: <CheckCircle size={12} /> },
};

interface ChecklistItem { id: number; text: string; completed: boolean; }
interface Attachment { id: number; fileName: string; fileUrl: string; mimeType?: string | null; uploadedBy?: string; }
interface Task {
  id: number; title: string; notes?: string | null; deadline?: string | null;
  priority: string; status: string; checklist: ChecklistItem[]; attachments: Attachment[];
  createdAt: string;
}

function isOverdue(deadline?: string | null, status?: string) {
  if (!deadline || status === "done") return false;
  return new Date(deadline + "T23:59:59") < new Date();
}

export default function StaffDashboard() {
  const [, setLocation] = useLocation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [tab, setTab] = useState<"all" | "pending" | "in_progress" | "done">("all");
  const prevTaskIds = useRef<Set<number>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const staffUser = (() => {
    try { return JSON.parse(localStorage.getItem("staff_user") || "{}"); } catch { return {}; }
  })();

  function enableSound() {
    unlockAudio();
    setSoundEnabled(true);
  }

  async function loadTasks(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await staffFetch(`${getApiBase()}/api/staff/tasks`);
      if (res.status === 401) { localStorage.removeItem("staff_token"); setLocation("/staff/login"); return; }
      if (!res.ok) return;
      const data: Task[] = await res.json();
      setTasks(data);
      if (prevTaskIds.current.size > 0) {
        const newOnes = data.filter(t => !prevTaskIds.current.has(t.id));
        if (newOnes.length > 0 && soundEnabled) playTaskAlertSound();
      }
      prevTaskIds.current = new Set(data.map(t => t.id));
    } finally { if (!silent) setLoading(false); }
  }

  useEffect(() => {
    // Verify token
    staffFetch(`${getApiBase()}/api/staff/me`).then(r => {
      if (r.status === 401) { setLocation("/staff/login"); }
    });
    loadTasks();
    pollRef.current = setInterval(() => loadTasks(true), 15_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Re-register poll with updated soundEnabled
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadTasks(true), 15_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [soundEnabled]);

  async function toggleChecklist(taskId: number, itemId: number, completed: boolean) {
    await staffFetch(`${getApiBase()}/api/staff/tasks/${taskId}/checklist/${itemId}`, {
      method: "PATCH", body: JSON.stringify({ completed }),
    });
    setTasks(prev => prev.map(t => t.id === taskId
      ? { ...t, checklist: t.checklist.map(c => c.id === itemId ? { ...c, completed } : c) }
      : t));
  }

  async function updateStatus(taskId: number, status: string) {
    await staffFetch(`${getApiBase()}/api/staff/tasks/${taskId}/status`, {
      method: "PATCH", body: JSON.stringify({ status }),
    });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
  }

  function handleAttachmentAdded(taskId: number, att: Attachment) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, attachments: [...t.attachments, att] } : t));
  }

  function handleAttachmentDeleted(taskId: number, attId: number) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, attachments: t.attachments.filter(a => a.id !== attId) } : t));
  }

  function handleLogout() {
    localStorage.removeItem("staff_token");
    localStorage.removeItem("staff_user");
    setLocation("/staff/login");
  }

  const filtered = tasks.filter(t => tab === "all" || t.status === tab);
  const counts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    done: tasks.filter(t => t.status === "done").length,
  };

  return (
    <div className="min-h-screen" style={{ background: BG, fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b px-6 py-4 flex items-center justify-between"
        style={{ background: "rgba(11,31,16,0.95)", borderColor: "rgba(162,137,89,0.15)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-3">
          <img src={`${BASE}/harrowgate-logo.png`} alt="HARROWGATE" className="h-8 object-contain" />
          <div>
            <p className="text-xs font-semibold" style={{ color: GOLD }}>Staff Portal</p>
            <p className="text-[11px]" style={{ color: "rgba(162,137,89,0.5)" }}>Welcome, {staffUser.name || "Staff"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!soundEnabled ? (
            <button onClick={enableSound}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
              style={{ borderColor: "rgba(162,137,89,0.25)", color: "rgba(162,137,89,0.6)", background: "rgba(162,137,89,0.06)" }}>
              <BellOff size={12} /> Enable Sound
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ color: "#4ade80", background: "rgba(74,222,128,0.08)" }}>
              <Bell size={12} /> Alerts on
            </div>
          )}
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
            style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)" }}>
            <LogOut size={12} /> Sign Out
          </button>
        </div>
      </header>

      <main className="px-6 py-8 max-w-5xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { key: "all", label: "Total", color: GOLD },
            { key: "pending", label: "To Do", color: "rgba(255,255,255,0.5)" },
            { key: "in_progress", label: "In Progress", color: "#fb923c" },
            { key: "done", label: "Done", color: "#4ade80" },
          ].map(({ key, label, color }) => (
            <button key={key} onClick={() => setTab(key as any)}
              className="rounded-xl border p-4 text-center transition-all hover:opacity-90"
              style={{ borderColor: tab === key ? color : "rgba(255,255,255,0.08)", background: tab === key ? `${color}12` : "rgba(255,255,255,0.03)" }}>
              <p className="text-2xl font-bold" style={{ color }}>{counts[key as keyof typeof counts]}</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
            </button>
          ))}
        </div>

        {/* Tasks */}
        {loading ? (
          <div className="py-20 text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Loading your tasks…</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <CheckCircle size={32} className="mx-auto mb-3" style={{ color: "rgba(162,137,89,0.3)" }} />
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
              {tab === "done" ? "No completed tasks yet." : tab === "all" ? "No tasks assigned yet." : "No tasks in this category."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map(task => (
              <TaskCard key={task.id} task={task} onToggleChecklist={toggleChecklist} onStatusChange={updateStatus} onAttachmentAdded={handleAttachmentAdded} onAttachmentDeleted={handleAttachmentDeleted} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TaskCard({ task, onToggleChecklist, onStatusChange, onAttachmentAdded, onAttachmentDeleted }: {
  task: Task;
  onToggleChecklist: (taskId: number, itemId: number, completed: boolean) => void;
  onStatusChange: (taskId: number, status: string) => void;
  onAttachmentAdded: (taskId: number, att: Attachment) => void;
  onAttachmentDeleted: (taskId: number, attId: number) => void;
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const overdue = isOverdue(task.deadline, task.status);
  const pri = PRIORITIES[task.priority] ?? PRIORITIES.medium;
  const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
  const done = task.checklist.filter(c => c.completed).length;
  const total = task.checklist.length;
  const adminAttachments = task.attachments.filter(a => a.uploadedBy !== "staff");
  const staffAttachments = task.attachments.filter(a => a.uploadedBy === "staff");

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadErr(null);
    try {
      const urlRes = await fetch(`${getApiBase()}/api/storage/uploads/request-url`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("Could not get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();
      await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      const fileUrl = `${getApiBase()}/api/storage/objects/${objectPath}`;
      const token = localStorage.getItem("staff_token");
      const attRes = await fetch(`${getApiBase()}/api/staff/tasks/${task.id}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ fileName: file.name, fileUrl, fileSize: file.size, mimeType: file.type }),
      });
      if (!attRes.ok) throw new Error("Failed to save attachment");
      const att: Attachment = await attRes.json();
      onAttachmentAdded(task.id, att);
    } catch (e: any) {
      setUploadErr(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(attId: number) {
    const token = localStorage.getItem("staff_token");
    await fetch(`${getApiBase()}/api/staff/tasks/${task.id}/attachments/${attId}`, {
      method: "DELETE",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    onAttachmentDeleted(task.id, attId);
  }

  return (
    <div className="rounded-2xl border p-5 flex flex-col gap-4 transition-all"
      style={{ borderColor: overdue ? "rgba(248,113,113,0.4)" : "rgba(162,137,89,0.15)", background: overdue ? "rgba(248,113,113,0.04)" : "rgba(255,255,255,0.03)" }}>

      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base leading-snug" style={{ color: "#f5e6d3" }}>{task.title}</p>
          {overdue && (
            <p className="text-xs flex items-center gap-1 mt-1" style={{ color: "#f87171" }}>
              <AlertTriangle size={11} /> Overdue!
            </p>
          )}
        </div>
        {/* Status selector */}
        <div className="relative shrink-0">
          <button onClick={() => setStatusOpen(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border"
            style={{ borderColor: "rgba(255,255,255,0.12)", color: statusCfg.color, background: "rgba(255,255,255,0.05)" }}>
            {statusCfg.icon} {statusCfg.label}
          </button>
          {statusOpen && (
            <div className="absolute right-0 top-full mt-1 rounded-xl border shadow-2xl overflow-hidden z-10"
              style={{ background: "#0f2d14", borderColor: "rgba(162,137,89,0.2)", minWidth: 130 }}>
              {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                <button key={val} onClick={() => { onStatusChange(task.id, val); setStatusOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-all hover:bg-white/5"
                  style={{ color: cfg.color }}>
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: pri.bg, color: pri.color }}>{pri.label}</span>
        {task.deadline && (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
            style={{ background: "rgba(255,255,255,0.06)", color: overdue ? "#f87171" : "rgba(255,255,255,0.45)" }}>
            <Calendar size={10} />
            {new Date(task.deadline + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        )}
      </div>

      {/* Notes */}
      {task.notes && (
        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{task.notes}</p>
      )}

      {/* Checklist */}
      {task.checklist.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(162,137,89,0.5)" }}>Checklist</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{done}/{total}</p>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: total > 0 ? `${(done / total) * 100}%` : "0%", background: "#4ade80" }} />
          </div>
          <div className="space-y-2 mt-1">
            {task.checklist.map(item => (
              <label key={item.id} className="flex items-start gap-2.5 cursor-pointer group">
                <div onClick={() => onToggleChecklist(task.id, item.id, !item.completed)}
                  className="w-4 h-4 mt-0.5 rounded border shrink-0 flex items-center justify-center transition-all"
                  style={{ borderColor: item.completed ? "#4ade80" : "rgba(255,255,255,0.2)", background: item.completed ? "rgba(74,222,128,0.2)" : "transparent" }}>
                  {item.completed && <svg viewBox="0 0 10 8" className="w-2.5 h-2" fill="none"><path d="M1 4l3 3 5-6" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span className="text-sm flex-1" style={{ color: item.completed ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.75)", textDecoration: item.completed ? "line-through" : "none" }}>
                  {item.text}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Admin attachments (read-only) */}
      {adminAttachments.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(162,137,89,0.5)" }}>Files from Admin</p>
          <div className="space-y-1.5">
            {adminAttachments.map(att => (
              <a key={att.id} href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all hover:opacity-80"
                style={{ borderColor: "rgba(162,137,89,0.15)", background: "rgba(162,137,89,0.06)", color: GOLD }}>
                <Paperclip size={11} />
                <span className="truncate">{att.fileName}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Staff uploads */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(74,222,128,0.6)" }}>
            Your Uploads {staffAttachments.length > 0 && `(${staffAttachments.length})`}
          </p>
          <input ref={fileRef} type="file" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { handleUpload(f); e.target.value = ""; } }} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all disabled:opacity-50 hover:opacity-80"
            style={{ borderColor: "rgba(74,222,128,0.25)", color: "#4ade80", background: "rgba(74,222,128,0.06)" }}>
            <Paperclip size={10} /> {uploading ? "Uploading…" : "Attach & Send"}
          </button>
        </div>
        {uploadErr && <p className="text-[11px] mb-2" style={{ color: "#f87171" }}>{uploadErr}</p>}
        {staffAttachments.length > 0 ? (
          <div className="space-y-1.5">
            {staffAttachments.map(att => (
              <div key={att.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                style={{ borderColor: "rgba(74,222,128,0.2)", background: "rgba(74,222,128,0.05)" }}>
                <Paperclip size={11} style={{ color: "#4ade80", flexShrink: 0 }} />
                <a href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-xs truncate hover:underline" style={{ color: "#4ade80" }}>
                  {att.fileName}
                </a>
                <button onClick={() => handleDelete(att.id)}
                  className="p-0.5 rounded hover:bg-red-500/10 transition-all shrink-0"
                  style={{ color: "rgba(248,113,113,0.5)" }} title="Remove">
                  <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>No files sent yet. Use the button above to attach and send files back to admin.</p>
        )}
      </div>
    </div>
  );
}
