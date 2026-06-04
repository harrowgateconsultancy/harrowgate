import { useState, useEffect, useRef } from "react";
import { Users, Plus, Trash2, X, CheckSquare, Paperclip, Calendar, ChevronDown, Edit2, AlertTriangle } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }
function adminFetch(url: string, opts?: RequestInit) {
  const token = localStorage.getItem("admin_token");
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts?.headers ?? {}) } });
}

const NAVY = "#0d1a3a";
const GOLD = "#a28959";

const PRIORITIES = [
  { value: "low",    label: "Low",    color: "#4ade80", bg: "rgba(74,222,128,0.1)" },
  { value: "medium", label: "Medium", color: GOLD,      bg: "rgba(162,137,89,0.1)" },
  { value: "high",   label: "High",   color: "#fb923c", bg: "rgba(251,146,60,0.1)" },
  { value: "urgent", label: "Urgent", color: "#f87171", bg: "rgba(248,113,113,0.1)" },
];
const STATUSES = [
  { value: "pending",     label: "To Do",       color: "rgba(13,26,58,0.4)" },
  { value: "in_progress", label: "In Progress", color: "#fb923c" },
  { value: "done",        label: "Done",        color: "#4ade80" },
];

interface StaffMember { id: number; name: string; username: string; email?: string | null; role: string; createdAt: string; }
interface ChecklistItem { id?: number; text: string; completed: boolean; }
interface Attachment { id?: number; fileName: string; fileUrl: string; fileSize?: number | null; mimeType?: string | null; uploadedBy?: string; }
interface Task {
  id: number; title: string; notes?: string | null; deadline?: string | null;
  priority: string; status: string; assignedTo?: number | null;
  assignedStaff?: { id: number; name: string; username: string } | null;
  checklist: ChecklistItem[]; attachments: Attachment[];
  createdAt: string;
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = PRIORITIES.find(x => x.value === priority) ?? PRIORITIES[1];
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: p.bg, color: p.color }}>{p.label}</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUSES.find(x => x.value === status) ?? STATUSES[0];
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: "rgba(13,26,58,0.06)", color: s.color }}>{s.label}</span>
  );
}

function isOverdue(deadline?: string | null) {
  if (!deadline) return false;
  return new Date(deadline) < new Date() && true;
}

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [staffForm, setStaffForm] = useState({ name: "", username: "", password: "", email: "", role: "staff" });
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  const [taskForm, setTaskForm] = useState({
    title: "", notes: "", deadline: "", priority: "medium", assignedTo: "",
    checklist: [{ text: "", completed: false }] as ChecklistItem[],
    attachments: [] as Attachment[],
    status: "pending",
  });
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const [sRes, tRes] = await Promise.all([
        adminFetch(`${getApiBase()}/api/admin/staff`),
        adminFetch(`${getApiBase()}/api/admin/tasks`),
      ]);
      if (sRes.ok) setStaff(await sRes.json());
      if (tRes.ok) setTasks(await tRes.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    setStaffError(null);
    setStaffSaving(true);
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/staff`, {
        method: "POST", body: JSON.stringify(staffForm),
      });
      const data = await res.json();
      if (!res.ok) { setStaffError(data.error || "Failed to create account"); return; }
      setShowAddStaff(false);
      setStaffForm({ name: "", username: "", password: "", email: "", role: "staff" });
      await load();
    } finally { setStaffSaving(false); }
  }

  async function handleDeleteStaff(id: number) {
    if (!confirm("Delete this staff account? Their tasks will remain but unassigned.")) return;
    await adminFetch(`${getApiBase()}/api/admin/staff/${id}`, { method: "DELETE" });
    await load();
  }

  function openAddTask() {
    setEditingTask(null);
    setTaskForm({ title: "", notes: "", deadline: "", priority: "medium", assignedTo: "", checklist: [{ text: "", completed: false }], attachments: [], status: "pending" });
    setTaskError(null);
    setShowAddTask(true);
  }

  function openEditTask(task: Task) {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      notes: task.notes || "",
      deadline: task.deadline || "",
      priority: task.priority,
      assignedTo: task.assignedTo ? String(task.assignedTo) : "",
      checklist: task.checklist.length ? task.checklist : [{ text: "", completed: false }],
      attachments: task.attachments,
      status: task.status,
    });
    setTaskError(null);
    setShowAddTask(true);
  }

  async function handleSaveTask(e: React.FormEvent) {
    e.preventDefault();
    setTaskError(null);
    if (!taskForm.title.trim()) { setTaskError("Title is required"); return; }
    setTaskSaving(true);
    try {
      const payload = {
        title: taskForm.title.trim(),
        notes: taskForm.notes || null,
        deadline: taskForm.deadline || null,
        priority: taskForm.priority,
        assignedTo: taskForm.assignedTo ? parseInt(taskForm.assignedTo) : null,
        status: taskForm.status,
        checklist: taskForm.checklist.filter(c => c.text.trim()),
        attachments: taskForm.attachments,
      };
      const url = editingTask
        ? `${getApiBase()}/api/admin/tasks/${editingTask.id}`
        : `${getApiBase()}/api/admin/tasks`;
      const res = await adminFetch(url, { method: editingTask ? "PUT" : "POST", body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setTaskError(data.error || "Failed to save task"); return; }
      setShowAddTask(false);
      await load();
    } finally { setTaskSaving(false); }
  }

  async function handleDeleteTask(id: number) {
    if (!confirm("Delete this task?")) return;
    await adminFetch(`${getApiBase()}/api/admin/tasks/${id}`, { method: "DELETE" });
    await load();
  }

  async function handleUploadAttachment(file: File) {
    setUploading(true);
    try {
      const urlRes = await adminFetch(`${getApiBase()}/api/storage/uploads/request-url`, {
        method: "POST",
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, prefix: "task-attachments/" }),
      });
      if (!urlRes.ok) { alert("Upload failed — could not get upload URL"); return; }
      const { uploadUrl, objectKey } = await urlRes.json();
      const putRes = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!putRes.ok) { alert("Upload failed — storage error"); return; }
      const fileUrl = `${getApiBase()}/api/storage/objects/${objectKey}`;
      setTaskForm(f => ({ ...f, attachments: [...f.attachments, { fileName: file.name, fileUrl, fileSize: file.size, mimeType: file.type }] }));
    } finally { setUploading(false); }
  }

  function addChecklistItem() {
    setTaskForm(f => ({ ...f, checklist: [...f.checklist, { text: "", completed: false }] }));
  }
  function removeChecklistItem(i: number) {
    setTaskForm(f => ({ ...f, checklist: f.checklist.filter((_, idx) => idx !== i) }));
  }
  function updateChecklistItem(i: number, text: string) {
    setTaskForm(f => ({ ...f, checklist: f.checklist.map((c, idx) => idx === i ? { ...c, text } : c) }));
  }

  const tasksByStaff = (staffId: number) => tasks.filter(t => t.assignedTo === staffId);
  const unassigned = tasks.filter(t => !t.assignedTo);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>Staff & Tasks</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(13,26,58,0.5)" }}>Manage staff accounts and assign tasks</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowAddStaff(true); setStaffError(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all hover:opacity-90"
            style={{ borderColor: "rgba(13,26,58,0.2)", color: NAVY, background: "rgba(13,26,58,0.04)" }}>
            <Users size={14} /> Add Staff
          </button>
          <button onClick={openAddTask}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: NAVY, color: GOLD }}>
            <Plus size={14} /> New Task
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm" style={{ color: "rgba(13,26,58,0.4)" }}>Loading…</div>
      ) : (
        <>
          {/* Staff list */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "rgba(13,26,58,0.4)" }}>Staff Accounts ({staff.length})</h2>
            {staff.length === 0 ? (
              <div className="rounded-xl border border-dashed py-10 text-center text-sm" style={{ borderColor: "rgba(13,26,58,0.15)", color: "rgba(13,26,58,0.35)" }}>
                No staff accounts yet. Click "Add Staff" to create one.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {staff.map(s => (
                  <div key={s.id} className="rounded-xl border p-4" style={{ borderColor: "rgba(13,26,58,0.1)" }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-sm" style={{ color: NAVY }}>{s.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(13,26,58,0.45)" }}>@{s.username}</p>
                        {s.email && <p className="text-xs mt-0.5" style={{ color: "rgba(13,26,58,0.35)" }}>{s.email}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "rgba(13,26,58,0.06)", color: "rgba(13,26,58,0.5)" }}>{s.role}</span>
                        <button onClick={() => handleDeleteStaff(s.id)}
                          className="p-1 rounded hover:bg-red-50" style={{ color: "rgba(248,113,113,0.6)" }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(13,26,58,0.08)" }}>
                      <p className="text-xs" style={{ color: "rgba(13,26,58,0.4)" }}>
                        {tasksByStaff(s.id).length} task{tasksByStaff(s.id).length !== 1 ? "s" : ""} assigned
                        {" · "}{tasksByStaff(s.id).filter(t => t.status === "done").length} done
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tasks per staff */}
          {staff.map(s => {
            const memberTasks = tasksByStaff(s.id);
            if (!memberTasks.length) return null;
            return (
              <div key={s.id} className="mb-8">
                <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "rgba(13,26,58,0.4)" }}>
                  <Users size={13} /> {s.name}'s Tasks ({memberTasks.length})
                </h2>
                <TaskGrid tasks={memberTasks} onEdit={openEditTask} onDelete={handleDeleteTask} />
              </div>
            );
          })}

          {/* Unassigned tasks */}
          {unassigned.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "rgba(13,26,58,0.4)" }}>Unassigned Tasks ({unassigned.length})</h2>
              <TaskGrid tasks={unassigned} onEdit={openEditTask} onDelete={handleDeleteTask} />
            </div>
          )}

          {tasks.length === 0 && staff.length > 0 && (
            <div className="rounded-xl border border-dashed py-12 text-center" style={{ borderColor: "rgba(13,26,58,0.15)" }}>
              <p className="text-sm mb-3" style={{ color: "rgba(13,26,58,0.35)" }}>No tasks created yet.</p>
              <button onClick={openAddTask}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: NAVY, color: GOLD }}>
                <Plus size={13} /> New Task
              </button>
            </div>
          )}
        </>
      )}

      {/* Add Staff Modal */}
      {showAddStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="w-full max-w-sm rounded-2xl border shadow-2xl" style={{ background: "#fff", borderColor: "rgba(13,26,58,0.15)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(13,26,58,0.1)" }}>
              <h2 className="font-bold text-base" style={{ color: NAVY }}>Add Staff Account</h2>
              <button onClick={() => setShowAddStaff(false)} className="p-1.5 rounded hover:bg-slate-100">
                <X size={16} style={{ color: "rgba(13,26,58,0.5)" }} />
              </button>
            </div>
            <form onSubmit={handleAddStaff} className="px-6 py-5 space-y-4">
              {[
                { label: "Full Name", key: "name", type: "text", placeholder: "e.g. Sarah Wong" },
                { label: "Username", key: "username", type: "text", placeholder: "e.g. sarah" },
                { label: "Password", key: "password", type: "password", placeholder: "Set a strong password" },
                { label: "Email (optional)", key: "email", type: "email", placeholder: "sarah@harrowgate.hk" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "rgba(13,26,58,0.5)" }}>{label}</label>
                  <input type={type} placeholder={placeholder} required={key !== "email"}
                    value={(staffForm as any)[key]}
                    onChange={e => setStaffForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: "rgba(13,26,58,0.2)", color: NAVY }} />
                </div>
              ))}
              {staffError && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(248,113,113,0.08)", color: "#dc2626", border: "1px solid rgba(248,113,113,0.2)" }}>{staffError}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAddStaff(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm border hover:bg-slate-50"
                  style={{ borderColor: "rgba(13,26,58,0.15)", color: "rgba(13,26,58,0.6)" }}>Cancel</button>
                <button type="submit" disabled={staffSaving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50"
                  style={{ background: NAVY, color: GOLD }}>
                  {staffSaving ? "Creating…" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col max-h-[92vh]" style={{ background: "#fff", borderColor: "rgba(13,26,58,0.15)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: "rgba(13,26,58,0.1)" }}>
              <h2 className="font-bold text-base" style={{ color: NAVY }}>{editingTask ? "Edit Task" : "New Task"}</h2>
              <button onClick={() => setShowAddTask(false)} className="p-1.5 rounded hover:bg-slate-100">
                <X size={16} style={{ color: "rgba(13,26,58,0.5)" }} />
              </button>
            </div>
            <form onSubmit={handleSaveTask} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "rgba(13,26,58,0.5)" }}>Task Title *</label>
                <input type="text" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: "rgba(13,26,58,0.2)", color: NAVY }} placeholder="What needs to be done?" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "rgba(13,26,58,0.5)" }}>Assign To</label>
                  <select value={taskForm.assignedTo} onChange={e => setTaskForm(f => ({ ...f, assignedTo: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: "rgba(13,26,58,0.2)", color: NAVY }}>
                    <option value="">— Unassigned —</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "rgba(13,26,58,0.5)" }}>Priority</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: "rgba(13,26,58,0.2)", color: NAVY }}>
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "rgba(13,26,58,0.5)" }}>Deadline</label>
                  <input type="date" value={taskForm.deadline} onChange={e => setTaskForm(f => ({ ...f, deadline: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: "rgba(13,26,58,0.2)", color: NAVY }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "rgba(13,26,58,0.5)" }}>Status</label>
                  <select value={taskForm.status} onChange={e => setTaskForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: "rgba(13,26,58,0.2)", color: NAVY }}>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "rgba(13,26,58,0.5)" }}>Notes</label>
                <textarea value={taskForm.notes} onChange={e => setTaskForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                  style={{ borderColor: "rgba(13,26,58,0.2)", color: NAVY }} placeholder="Additional instructions or context…" />
              </div>

              {/* Checklist */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(13,26,58,0.5)" }}>Checklist / To-dos</label>
                <div className="space-y-2">
                  {taskForm.checklist.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border shrink-0" style={{ borderColor: "rgba(13,26,58,0.2)" }} />
                      <input type="text" value={item.text} onChange={e => updateChecklistItem(i, e.target.value)}
                        className="flex-1 px-2 py-1.5 rounded-lg border text-sm outline-none"
                        style={{ borderColor: "rgba(13,26,58,0.15)", color: NAVY }} placeholder={`Item ${i + 1}…`} />
                      <button type="button" onClick={() => removeChecklistItem(i)}
                        className="p-1 rounded hover:bg-red-50 shrink-0" style={{ color: "rgba(248,113,113,0.5)" }}>
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addChecklistItem}
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-lg hover:bg-slate-50"
                  style={{ color: "rgba(13,26,58,0.45)" }}>
                  <Plus size={12} /> Add item
                </button>
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(13,26,58,0.5)" }}>Attachments</label>
                {taskForm.attachments.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {taskForm.attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                        style={{ borderColor: "rgba(13,26,58,0.1)", background: "rgba(13,26,58,0.02)" }}>
                        <Paperclip size={12} style={{ color: "rgba(13,26,58,0.35)" }} />
                        <span className="flex-1 text-xs truncate" style={{ color: NAVY }}>{att.fileName}</span>
                        <button type="button" onClick={() => setTaskForm(f => ({ ...f, attachments: f.attachments.filter((_, idx) => idx !== i) }))}
                          className="p-0.5 rounded hover:bg-red-50" style={{ color: "rgba(248,113,113,0.5)" }}>
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={fileRef} type="file" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadAttachment(f); e.target.value = ""; }} />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border hover:bg-slate-50 disabled:opacity-50"
                  style={{ borderColor: "rgba(13,26,58,0.15)", color: "rgba(13,26,58,0.5)" }}>
                  <Paperclip size={12} /> {uploading ? "Uploading…" : "Attach file"}
                </button>
              </div>

              {taskError && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(248,113,113,0.08)", color: "#dc2626", border: "1px solid rgba(248,113,113,0.2)" }}>{taskError}</p>
              )}
            </form>
            <div className="px-6 py-4 border-t shrink-0 flex gap-3" style={{ borderColor: "rgba(13,26,58,0.1)" }}>
              <button type="button" onClick={() => setShowAddTask(false)}
                className="flex-1 py-2.5 rounded-lg text-sm border hover:bg-slate-50"
                style={{ borderColor: "rgba(13,26,58,0.15)", color: "rgba(13,26,58,0.6)" }}>Cancel</button>
              <button type="button" onClick={handleSaveTask} disabled={taskSaving}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50"
                style={{ background: NAVY, color: GOLD }}>
                {taskSaving ? "Saving…" : editingTask ? "Save Changes" : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskGrid({ tasks, onEdit, onDelete }: { tasks: Task[]; onEdit: (t: Task) => void; onDelete: (id: number) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete }: { task: Task; onEdit: (t: Task) => void; onDelete: (id: number) => void }) {
  const NAVY = "#0d1a3a";
  const GOLD = "#a28959";
  const done = task.checklist.filter(c => c.completed).length;
  const total = task.checklist.length;
  const overdue = isOverdue(task.deadline) && task.status !== "done";

  return (
    <div className="rounded-xl border p-4 flex flex-col gap-3" style={{ borderColor: overdue ? "rgba(248,113,113,0.3)" : "rgba(13,26,58,0.1)", background: overdue ? "rgba(248,113,113,0.02)" : "#fff" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-snug" style={{ color: NAVY }}>{task.title}</p>
          {overdue && (
            <p className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: "#dc2626" }}>
              <AlertTriangle size={10} /> Overdue
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(task)} className="p-1 rounded hover:bg-slate-100">
            <Edit2 size={12} style={{ color: "rgba(13,26,58,0.4)" }} />
          </button>
          <button onClick={() => onDelete(task.id)} className="p-1 rounded hover:bg-red-50">
            <Trash2 size={12} style={{ color: "rgba(248,113,113,0.5)" }} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
        {task.deadline && (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
            style={{ background: "rgba(13,26,58,0.05)", color: "rgba(13,26,58,0.5)" }}>
            <Calendar size={10} />
            {new Date(task.deadline + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
          </span>
        )}
      </div>

      {task.notes && (
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "rgba(13,26,58,0.55)" }}>{task.notes}</p>
      )}

      {task.checklist.length > 0 && (
        <div className="space-y-1.5">
          {task.checklist.slice(0, 3).map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center"
                style={{ borderColor: item.completed ? "#4ade80" : "rgba(13,26,58,0.2)", background: item.completed ? "rgba(74,222,128,0.15)" : "transparent" }}>
                {item.completed && <svg viewBox="0 0 10 8" className="w-2 h-2" fill="none"><path d="M1 4l3 3 5-6" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span className="text-xs line-clamp-1" style={{ color: item.completed ? "rgba(13,26,58,0.35)" : "rgba(13,26,58,0.65)", textDecoration: item.completed ? "line-through" : "none" }}>{item.text}</span>
            </div>
          ))}
          {task.checklist.length > 3 && (
            <p className="text-[11px]" style={{ color: "rgba(13,26,58,0.35)" }}>+{task.checklist.length - 3} more items</p>
          )}
          {total > 0 && (
            <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(13,26,58,0.08)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${(done / total) * 100}%`, background: "#4ade80" }} />
            </div>
          )}
        </div>
      )}

      {task.attachments.length > 0 && (
        <div className="space-y-1">
          {task.attachments.filter(a => a.uploadedBy === "staff").length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80" }}>Staff</span>
              <span className="text-[11px]" style={{ color: "#4ade80" }}>
                {task.attachments.filter(a => a.uploadedBy === "staff").length} file{task.attachments.filter(a => a.uploadedBy === "staff").length !== 1 ? "s" : ""} sent back
              </span>
            </div>
          )}
          {task.attachments.filter(a => a.uploadedBy !== "staff").length > 0 && (
            <div className="flex items-center gap-1.5">
              <Paperclip size={11} style={{ color: "rgba(13,26,58,0.35)" }} />
              <span className="text-[11px]" style={{ color: "rgba(13,26,58,0.4)" }}>
                {task.attachments.filter(a => a.uploadedBy !== "staff").length} admin attachment{task.attachments.filter(a => a.uploadedBy !== "staff").length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
