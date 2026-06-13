import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAdminColors } from "../../contexts/AdminThemeContext";
import { Shield, Users, UserCog, Plus, Trash2, X, Eye, EyeOff, Lock } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }
function adminFetch(url: string, opts?: RequestInit) {
  const token = localStorage.getItem("admin_token");
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
}

interface StaffMember {
  id: number;
  name: string;
  username: string;
  email?: string | null;
  role: string;
  plainPassword?: string | null;
  createdAt: string;
}

const ROLE_CONFIG = {
  manager: { label: "Manager", color: "#1F7D53", bg: "rgba(31,125,83,0.12)", desc: "All pages except Finance & Pricing" },
  staff:   { label: "Staff",   color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  desc: "All pages except Finance & Pricing" },
};

export default function Settings() {
  const C = useAdminColors();
  const [, setLocation] = useLocation();

  const adminRole = localStorage.getItem("admin_role") ?? "admin";

  // Redirect non-admins away
  useEffect(() => {
    if (adminRole !== "admin") setLocation("/admin");
  }, [adminRole]);

  const [accounts, setAccounts] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", password: "", email: "", role: "manager" });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/staff`);
      if (res.ok) setAccounts(await res.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/staff`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || "Failed to create account"); return; }
      setShowAdd(false);
      setForm({ name: "", username: "", password: "", email: "", role: "manager" });
      await load();
    } finally { setSaving(false); }
  }

  async function handleDelete(account: StaffMember) {
    setDeleting(true);
    try {
      await adminFetch(`${getApiBase()}/api/admin/staff/${account.id}`, { method: "DELETE" });
      setDeleteConfirm(null);
      await load();
    } finally { setDeleting(false); }
  }

  async function handlePasswordReset(id: number, newPass: string) {
    await adminFetch(`${getApiBase()}/api/admin/staff/${id}/password`, {
      method: "PATCH",
      body: JSON.stringify({ password: newPass }),
    });
  }

  const managers = accounts.filter(a => a.role === "manager");
  const staff    = accounts.filter(a => a.role === "staff");

  if (adminRole !== "admin") return null;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.navyText }}>Account Management</h1>
          <p className="text-sm mt-1" style={{ color: C.n50 }}>
            Manage admin panel access for managers and staff members
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setFormError(null); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: C.navyBg, color: "#1F7D53" }}>
          <Plus size={14} /> Add Account
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm" style={{ color: C.n40 }}>Loading…</div>
      ) : (
        <div className="space-y-8">

          {/* Super Admin — locked */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: C.n40 }}>
              <Shield size={12} /> Super Admin
            </h2>
            <div className="rounded-2xl border p-4 flex items-center justify-between gap-3"
              style={{ borderColor: "rgba(31,125,83,0.25)", background: "rgba(31,125,83,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(31,125,83,0.12)" }}>
                  <Shield size={16} style={{ color: "#1F7D53" }} />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: C.navyText }}>Admin</p>
                  <p className="text-xs mt-0.5" style={{ color: C.n45 }}>Environment credentials</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(31,125,83,0.12)", color: "#1F7D53" }}>
                  Super Admin
                </span>
                <div className="p-1.5 rounded-lg opacity-30" title="Cannot be deleted">
                  <Lock size={13} style={{ color: C.n50 }} />
                </div>
              </div>
            </div>
          </section>

          {/* Manager Accounts */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: C.n40 }}>
              <UserCog size={12} /> Manager Accounts ({managers.length})
            </h2>
            {managers.length === 0 ? (
              <div className="rounded-xl border border-dashed py-8 text-center text-sm"
                style={{ borderColor: C.n15, color: C.n35 }}>
                No manager accounts yet.{" "}
                <button onClick={() => { setForm(f => ({ ...f, role: "manager" })); setShowAdd(true); }}
                  className="underline hover:opacity-70" style={{ color: C.n50 }}>
                  Add one
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {managers.map(a => (
                  <AccountRow key={a.id} account={a} onDelete={() => setDeleteConfirm(a)} onPasswordReset={handlePasswordReset} C={C} />
                ))}
              </div>
            )}
          </section>

          {/* Staff Accounts */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: C.n40 }}>
              <Users size={12} /> Staff Accounts ({staff.length})
            </h2>
            {staff.length === 0 ? (
              <div className="rounded-xl border border-dashed py-8 text-center text-sm"
                style={{ borderColor: C.n15, color: C.n35 }}>
                No staff accounts yet.{" "}
                <button onClick={() => { setForm(f => ({ ...f, role: "staff" })); setShowAdd(true); }}
                  className="underline hover:opacity-70" style={{ color: C.n50 }}>
                  Add one
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {staff.map(a => (
                  <AccountRow key={a.id} account={a} onDelete={() => setDeleteConfirm(a)} onPasswordReset={handlePasswordReset} C={C} />
                ))}
              </div>
            )}
          </section>

          {/* Access level info */}
          <section className="rounded-2xl border p-5" style={{ borderColor: C.n10, background: C.n02 }}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: C.n40 }}>
              Access Level Reference
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 shrink-0"
                  style={{ background: "rgba(31,125,83,0.12)", color: "#1F7D53" }}>Admin</span>
                <p className="text-sm" style={{ color: C.n60 }}>Full access to all pages including Finance, Pricing, and Account Management</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 shrink-0"
                  style={{ background: ROLE_CONFIG.manager.bg, color: ROLE_CONFIG.manager.color }}>Manager</span>
                <p className="text-sm" style={{ color: C.n60 }}>Dashboard, Clients, Applications, Submissions, Staff & Tasks — no Finance or Pricing access</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 shrink-0"
                  style={{ background: ROLE_CONFIG.staff.bg, color: ROLE_CONFIG.staff.color }}>Staff</span>
                <p className="text-sm" style={{ color: C.n60 }}>Dashboard, Clients, Applications, Submissions, Staff & Tasks — no Finance or Pricing access</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Add Account Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="w-full max-w-sm rounded-2xl border shadow-2xl"
            style={{ background: C.card, borderColor: C.n15 }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: C.n10 }}>
              <h2 className="font-bold text-base" style={{ color: C.navyText }}>Add Account</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded hover:opacity-70">
                <X size={16} style={{ color: C.n50 }} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="px-6 py-5 space-y-4">
              {/* Role selector */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: C.n50 }}>
                  Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["manager", "staff"] as const).map(r => (
                    <button key={r} type="button"
                      onClick={() => setForm(f => ({ ...f, role: r }))}
                      className="py-2.5 rounded-xl text-sm font-semibold border transition-all"
                      style={{
                        borderColor: form.role === r ? ROLE_CONFIG[r].color : C.n15,
                        background:  form.role === r ? ROLE_CONFIG[r].bg : "transparent",
                        color:       form.role === r ? ROLE_CONFIG[r].color : C.n50,
                      }}>
                      {ROLE_CONFIG[r].label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] mt-1.5" style={{ color: C.n35 }}>
                  {ROLE_CONFIG[form.role as "manager" | "staff"].desc}
                </p>
              </div>

              {/* Fields */}
              {([
                { label: "Full Name",        key: "name",     type: "text",     placeholder: "e.g. Sarah Wong",           required: true },
                { label: "Username",          key: "username", type: "text",     placeholder: "e.g. sarah",                required: true },
                { label: "Email (optional)", key: "email",   type: "email",    placeholder: "sarah@harrowgate.hk",       required: false },
              ] as const).map(({ label, key, type, placeholder, required }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold mb-1" style={{ color: C.n50 }}>{label}</label>
                  <input type={type} placeholder={placeholder} required={required}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2"
                    style={{ borderColor: C.n20, color: C.navyText, background: C.n02 }} />
                </div>
              ))}

              {/* Password with toggle */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: C.n50 }}>Password</label>
                <div className="relative">
                  <input type={showPass ? "text" : "password"} placeholder="Set a strong password" required
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full px-3 py-2.5 pr-10 rounded-xl border text-sm outline-none focus:ring-2"
                    style={{ borderColor: C.n20, color: C.navyText, background: C.n02 }} />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80">
                    {showPass ? <EyeOff size={14} style={{ color: C.n60 }} /> : <Eye size={14} style={{ color: C.n60 }} />}
                  </button>
                </div>
              </div>

              {formError && (
                <p className="text-xs px-3 py-2 rounded-xl"
                  style={{ background: "rgba(248,113,113,0.08)", color: "#dc2626", border: "1px solid rgba(248,113,113,0.2)" }}>
                  {formError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm border"
                  style={{ borderColor: C.n15, color: C.n60 }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all hover:opacity-90"
                  style={{ background: C.navyBg, color: "#1F7D53" }}>
                  {saving ? "Creating…" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-sm rounded-2xl border shadow-2xl p-6"
            style={{ background: C.card, borderColor: C.n15 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(248,113,113,0.1)" }}>
                <Trash2 size={16} style={{ color: "#f87171" }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: C.navyText }}>Delete Account</p>
                <p className="text-xs" style={{ color: C.n45 }}>This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm mb-5" style={{ color: C.n60 }}>
              Delete <span className="font-semibold" style={{ color: C.navyText }}>{deleteConfirm.name}</span>
              {" "}(@{deleteConfirm.username})? They will immediately lose access to the admin panel.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm border"
                style={{ borderColor: C.n15, color: C.n60 }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountRow({ account, onDelete, onPasswordReset, C }: {
  account: StaffMember;
  onDelete: () => void;
  onPasswordReset: (id: number, newPass: string) => Promise<void>;
  C: any;
}) {
  const cfg = ROLE_CONFIG[account.role as "manager" | "staff"] ?? ROLE_CONFIG.staff;
  const [showPass, setShowPass] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPlain, setCurrentPlain] = useState(account.plainPassword ?? null);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!newPass.trim()) return;
    setSaving(true);
    try {
      await onPasswordReset(account.id, newPass.trim());
      setCurrentPlain(newPass.trim());
      setNewPass("");
      setResetting(false);
    } finally { setSaving(false); }
  }

  return (
    <div className="rounded-xl border" style={{ borderColor: C.n10 }}>
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: cfg.bg }}>
            <span className="text-sm font-bold" style={{ color: cfg.color }}>
              {account.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: C.navyText }}>{account.name}</p>
            <p className="text-xs mt-0.5 truncate" style={{ color: C.n45 }}>
              @{account.username}{account.email ? ` · ${account.email}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.label}
          </span>
          <button onClick={() => { setResetting(r => !r); setNewPass(""); }}
            className="p-1.5 rounded-lg transition-all hover:opacity-80"
            title="Reset password"
            style={{ background: "rgba(162,137,89,0.08)", color: "#a28959" }}>
            <Lock size={13} />
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ background: "rgba(248,113,113,0.08)", color: "#f87171" }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Password row */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <span className="text-[11px] font-semibold shrink-0" style={{ color: C.n35 }}>Password:</span>
        {currentPlain ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono px-2 py-0.5 rounded"
              style={{ background: C.n02, color: C.n60, letterSpacing: showPass ? "normal" : "0.1em" }}>
              {showPass ? currentPlain : "•".repeat(Math.min(currentPlain.length, 12))}
            </span>
            <button onClick={() => setShowPass(v => !v)} className="opacity-50 hover:opacity-80">
              {showPass ? <EyeOff size={12} style={{ color: C.n50 }} /> : <Eye size={12} style={{ color: C.n50 }} />}
            </button>
          </div>
        ) : (
          <span className="text-[11px] italic" style={{ color: C.n35 }}>Not recorded — reset to set one</span>
        )}
      </div>

      {/* Reset password form */}
      {resetting && (
        <form onSubmit={handleReset}
          className="px-4 pb-4 pt-1 flex items-center gap-2 border-t"
          style={{ borderColor: C.n10 }}>
          <div className="relative flex-1">
            <input
              type={showNewPass ? "text" : "password"}
              placeholder="New password"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              required
              className="w-full px-3 py-2 pr-8 rounded-lg border text-xs outline-none"
              style={{ borderColor: C.n20, color: C.navyText, background: C.n02 }}
            />
            <button type="button" onClick={() => setShowNewPass(v => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80">
              {showNewPass ? <EyeOff size={12} style={{ color: C.n50 }} /> : <Eye size={12} style={{ color: C.n50 }} />}
            </button>
          </div>
          <button type="submit" disabled={saving || !newPass.trim()}
            className="px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all hover:opacity-90"
            style={{ background: "rgba(162,137,89,0.12)", color: "#a28959" }}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={() => setResetting(false)}
            className="px-3 py-2 rounded-lg text-xs"
            style={{ color: C.n45 }}>
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
