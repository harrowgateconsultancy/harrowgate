import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, DollarSign, Moon, Plus, Trash2, X } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }
function adminFetch(url: string, opts?: RequestInit) {
  const token = localStorage.getItem("admin_token");
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts?.headers ?? {}) } });
}

const NAVY = "#0d1a3a";
const GOLD = "#a28959";

function fmt(n: number) {
  return `HKD$ ${n.toLocaleString("en-HK")}`;
}

const INCOME_CATEGORIES = [
  "Consultation Fee",
  "Application Service Fee",
  "Document Processing",
  "Translation Service",
  "Other Income",
];
const EXPENSE_CATEGORIES = [
  "Government Fee",
  "Office Rent",
  "Staff Salary",
  "Marketing",
  "Software & Tools",
  "Professional Services",
  "Travel & Transport",
  "Other Expense",
];

interface Transaction {
  id: number;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  date: string;
  notes?: string | null;
  createdAt: string;
}
interface Summary { income: number; expenses: number; profit: number; zakat: number; }

export default function Finance() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>({ income: 0, expenses: 0, profit: 0, zakat: 0 });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState<"all" | "income" | "expense">("all");

  const [form, setForm] = useState({
    type: "income" as "income" | "expense",
    amount: "",
    description: "",
    category: INCOME_CATEGORIES[0],
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [txRes, sumRes] = await Promise.all([
        adminFetch(`${getApiBase()}/api/admin/finance/transactions`),
        adminFetch(`${getApiBase()}/api/admin/finance/summary`),
      ]);
      if (txRes.ok) setTransactions(await txRes.json());
      if (sumRes.ok) setSummary(await sumRes.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.amount || !form.description || !form.category || !form.date) {
      setFormError("All fields are required."); return;
    }
    setSaving(true);
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/finance/transactions`, {
        method: "POST",
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      if (!res.ok) { setFormError("Failed to save. Please try again."); return; }
      setShowAdd(false);
      setForm({ type: "income", amount: "", description: "", category: INCOME_CATEGORIES[0], date: new Date().toISOString().slice(0, 10), notes: "" });
      await loadData();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this transaction?")) return;
    await adminFetch(`${getApiBase()}/api/admin/finance/transactions/${id}`, { method: "DELETE" });
    await loadData();
  }

  const filtered = transactions.filter(t => tab === "all" || t.type === tab);

  const statCards = [
    { label: "Total Income", value: summary.income, icon: TrendingUp, color: "#4ade80", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.2)" },
    { label: "Total Expenses", value: summary.expenses, icon: TrendingDown, color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)" },
    { label: "Net Profit", value: summary.profit, icon: DollarSign, color: GOLD, bg: "rgba(162,137,89,0.08)", border: "rgba(162,137,89,0.2)" },
    { label: "Zakat Due (2.5%)", value: summary.zakat, icon: Moon, color: "#c084fc", bg: "rgba(192,132,252,0.08)", border: "rgba(192,132,252,0.2)" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>Finance</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(13,26,58,0.5)" }}>Income, expenses, profit &amp; Zakat</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: NAVY, color: GOLD }}>
          <Plus size={14} /> Add Transaction
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className="rounded-xl border p-5" style={{ background: bg, borderColor: border }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(13,26,58,0.5)" }}>{label}</p>
              <Icon size={16} style={{ color }} />
            </div>
            <p className="text-xl font-bold" style={{ color }}>{fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* Zakat explanation */}
      {summary.profit > 0 && (
        <div className="mb-6 rounded-xl border px-5 py-4 flex items-center gap-3"
          style={{ background: "rgba(192,132,252,0.05)", borderColor: "rgba(192,132,252,0.2)" }}>
          <Moon size={18} style={{ color: "#c084fc" }} />
          <p className="text-sm" style={{ color: "rgba(13,26,58,0.65)" }}>
            Zakat is calculated at <strong>2.5%</strong> of net profit ({fmt(summary.profit)}).
            Amount due: <strong style={{ color: "#c084fc" }}>{fmt(summary.zakat)}</strong>
          </p>
        </div>
      )}

      {/* Transactions Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "rgba(13,26,58,0.12)" }}>
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(13,26,58,0.1)", background: "rgba(13,26,58,0.02)" }}>
          <div className="flex gap-1">
            {(["all", "income", "expense"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all"
                style={{
                  background: tab === t ? NAVY : "transparent",
                  color: tab === t ? GOLD : "rgba(13,26,58,0.5)",
                }}>
                {t === "all" ? "All" : t === "income" ? "Income" : "Expenses"}
              </button>
            ))}
          </div>
          <span className="text-xs" style={{ color: "rgba(13,26,58,0.4)" }}>{filtered.length} records</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: "rgba(13,26,58,0.4)" }}>Loading…</div>
        ) : !filtered.length ? (
          <div className="py-16 text-center text-sm" style={{ color: "rgba(13,26,58,0.4)" }}>
            No {tab === "all" ? "" : tab} transactions yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "rgba(13,26,58,0.08)", background: "rgba(13,26,58,0.02)" }}>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(13,26,58,0.4)" }}>Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: "rgba(13,26,58,0.4)" }}>Category</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(13,26,58,0.4)" }}>Description</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(13,26,58,0.4)" }}>Amount</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => (
                <tr key={tx.id} className="border-b transition-colors hover:bg-slate-50" style={{ borderColor: "rgba(13,26,58,0.06)" }}>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-mono" style={{ color: "rgba(13,26,58,0.55)" }}>
                      {new Date(tx.date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: tx.type === "income" ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", color: tx.type === "income" ? "#16a34a" : "#dc2626" }}>
                      {tx.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-sm" style={{ color: NAVY }}>{tx.description}</p>
                    {tx.notes && <p className="text-xs mt-0.5" style={{ color: "rgba(13,26,58,0.4)" }}>{tx.notes}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="font-bold text-sm" style={{ color: tx.type === "income" ? "#16a34a" : "#dc2626" }}>
                      {tx.type === "income" ? "+" : "−"}{fmt(tx.amount)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button onClick={() => handleDelete(tx.id)}
                      className="p-1.5 rounded hover:bg-red-50 transition-colors"
                      style={{ color: "rgba(248,113,113,0.5)" }}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="w-full max-w-md rounded-2xl border shadow-2xl" style={{ background: "#fff", borderColor: "rgba(13,26,58,0.15)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(13,26,58,0.1)" }}>
              <h2 className="font-bold text-base" style={{ color: NAVY }}>Add Transaction</h2>
              <button onClick={() => { setShowAdd(false); setFormError(null); }} className="p-1.5 rounded hover:bg-slate-100">
                <X size={16} style={{ color: "rgba(13,26,58,0.5)" }} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="px-6 py-5 space-y-4">
              <div className="flex gap-3">
                {(["income", "expense"] as const).map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t, category: t === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0] }))}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold border transition-all"
                    style={{
                      background: form.type === t ? (t === "income" ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)") : "transparent",
                      borderColor: form.type === t ? (t === "income" ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.4)") : "rgba(13,26,58,0.15)",
                      color: form.type === t ? (t === "income" ? "#16a34a" : "#dc2626") : "rgba(13,26,58,0.5)",
                    }}>
                    {t === "income" ? "Income" : "Expense"}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "rgba(13,26,58,0.5)" }}>Amount (HKD)</label>
                  <input type="number" min={0} step={1} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-offset-0"
                    style={{ borderColor: "rgba(13,26,58,0.2)", color: NAVY }} placeholder="e.g. 45000" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "rgba(13,26,58,0.5)" }}>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: "rgba(13,26,58,0.2)", color: NAVY }} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "rgba(13,26,58,0.5)" }}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: "rgba(13,26,58,0.2)", color: NAVY }}>
                  {(form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "rgba(13,26,58,0.5)" }}>Description</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: "rgba(13,26,58,0.2)", color: NAVY }} placeholder="Brief description…" />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "rgba(13,26,58,0.5)" }}>Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                  style={{ borderColor: "rgba(13,26,58,0.2)", color: NAVY }} placeholder="Additional details…" />
              </div>

              {formError && (
                <p className="text-xs rounded-lg px-3 py-2" style={{ background: "rgba(248,113,113,0.08)", color: "#dc2626", border: "1px solid rgba(248,113,113,0.2)" }}>
                  {formError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowAdd(false); setFormError(null); }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all hover:bg-slate-50"
                  style={{ borderColor: "rgba(13,26,58,0.2)", color: "rgba(13,26,58,0.6)" }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: NAVY, color: GOLD }}>
                  {saving ? "Saving…" : "Add Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
