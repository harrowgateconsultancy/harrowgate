import { useState, useEffect, useRef, useCallback } from "react";
import { useAdminColors } from "../../contexts/AdminThemeContext";
import { TrendingUp, TrendingDown, DollarSign, Moon, Plus, Trash2, X, Upload, FileText, CheckCircle, AlertCircle, ChevronDown } from "lucide-react";

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
  "Consultation Fee", "Application Service Fee", "Document Processing",
  "Translation Service", "Other Income",
];
const EXPENSE_CATEGORIES = [
  "Government Fee", "Office Rent", "Staff Salary", "Marketing",
  "Software & Tools", "Professional Services", "Travel & Transport", "Other Expense",
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

interface ParsedRow {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  selected: boolean;
  raw: string;
}

// ── DBS HK CSV parser ─────────────────────────────────────────────────────────
// DBS iBanking exports two formats:
//   Format A: Date, Transaction, Debit, Credit, Balance  (account statement)
//   Format B: Date, Description, Amount (positive=credit, negative=debit)
function parseDBSCSV(text: string): { rows: ParsedRow[]; error: string | null } {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], error: "File appears to be empty." };

  // Find header line
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes("date") && (lower.includes("debit") || lower.includes("amount") || lower.includes("credit"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return { rows: [], error: "Could not find a header row. Make sure this is a DBS account statement CSV." };

  const header = parseCSVLine(lines[headerIdx]).map(h => h.toLowerCase().trim());
  const dateCol = header.findIndex(h => h.includes("date"));
  const descCol = header.findIndex(h => h.includes("description") || h.includes("transaction") || h.includes("narration") || h.includes("particulars"));
  const debitCol = header.findIndex(h => h.includes("debit") || h.includes("withdrawal"));
  const creditCol = header.findIndex(h => h.includes("credit") || h.includes("deposit"));
  const amountCol = header.findIndex(h => h === "amount" || h === "amt");

  if (dateCol === -1) return { rows: [], error: "Could not find a Date column." };
  if (descCol === -1) return { rows: [], error: "Could not find a Description column." };
  if (debitCol === -1 && creditCol === -1 && amountCol === -1) {
    return { rows: [], error: "Could not find Amount/Debit/Credit columns." };
  }

  const rows: ParsedRow[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 2) continue;

    const rawDate = cols[dateCol]?.trim() ?? "";
    const desc = cols[descCol]?.trim() ?? "";
    if (!rawDate || !desc) continue;

    // Parse date — DBS uses DD/MM/YYYY or DD MMM YYYY or YYYY-MM-DD
    const parsedDate = parseDateFlexible(rawDate);
    if (!parsedDate) continue;

    let amount = 0;
    let type: "income" | "expense" = "income";

    if (amountCol !== -1) {
      // Single amount column: negative = expense, positive = income
      const raw = cols[amountCol]?.replace(/[, ]/g, "") ?? "";
      const num = parseFloat(raw);
      if (isNaN(num) || num === 0) continue;
      amount = Math.abs(num);
      type = num < 0 ? "expense" : "income";
    } else {
      const debitRaw = cols[debitCol]?.replace(/[, ]/g, "") ?? "";
      const creditRaw = creditCol !== -1 ? (cols[creditCol]?.replace(/[, ]/g, "") ?? "") : "";
      const debit = parseFloat(debitRaw) || 0;
      const credit = parseFloat(creditRaw) || 0;
      if (debit === 0 && credit === 0) continue;
      if (debit > 0) { amount = debit; type = "expense"; }
      else { amount = credit; type = "income"; }
    }

    const category = guessCategory(desc, type);

    rows.push({
      date: parsedDate,
      description: desc,
      amount: Math.round(amount * 100) / 100,
      type,
      category,
      selected: true,
      raw: lines[i],
    });
  }

  if (rows.length === 0) return { rows: [], error: "No transactions found. Make sure you export the full account statement (not just the summary)." };
  return { rows, error: null };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { result.push(current); current = ""; }
    else { current += ch; }
  }
  result.push(current);
  return result.map(s => s.replace(/^"|"$/g, "").trim());
}

function parseDateFlexible(s: string): string | null {
  // DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  // YYYY-MM-DD
  const ymd = s.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
  if (ymd) return s.slice(0, 10);
  // DD MMM YYYY
  const months: Record<string, string> = { jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12" };
  const dmonthy = s.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (dmonthy) {
    const m = months[dmonthy[2].toLowerCase()];
    if (m) return `${dmonthy[3]}-${m}-${dmonthy[1].padStart(2, "0")}`;
  }
  return null;
}

function guessCategory(desc: string, type: "income" | "expense"): string {
  const d = desc.toLowerCase();
  if (type === "income") {
    if (d.includes("transfer") || d.includes("fps") || d.includes("payme")) return "Application Service Fee";
    if (d.includes("consult")) return "Consultation Fee";
    if (d.includes("translat")) return "Translation Service";
    return "Other Income";
  }
  if (d.includes("rent") || d.includes("lease")) return "Office Rent";
  if (d.includes("salary") || d.includes("payroll") || d.includes("mpf")) return "Staff Salary";
  if (d.includes("immigr") || d.includes("govt") || d.includes("fee")) return "Government Fee";
  if (d.includes("google") || d.includes("microsoft") || d.includes("adobe") || d.includes("software")) return "Software & Tools";
  if (d.includes("mtr") || d.includes("taxi") || d.includes("uber") || d.includes("transport")) return "Travel & Transport";
  if (d.includes("market") || d.includes("advert")) return "Marketing";
  return "Other Expense";
}

// ── DBS Import Modal ──────────────────────────────────────────────────────────
function DBSImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const C = useAdminColors();
  const NAVY = C.navyText;
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: number; fail: number } | null>(null);
  const [fileName, setFileName] = useState("");

  const handleFile = useCallback((file: File) => {
    setParseError(null);
    setParsed(null);
    setImportResult(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const { rows, error } = parseDBSCSV(text);
      if (error) { setParseError(error); return; }
      setParsed(rows);
    };
    reader.readAsText(file, "utf-8");
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const toggleRow = (i: number) => setParsed(p => p ? p.map((r, idx) => idx === i ? { ...r, selected: !r.selected } : r) : p);
  const toggleAll = () => {
    const allSelected = parsed?.every(r => r.selected);
    setParsed(p => p ? p.map(r => ({ ...r, selected: !allSelected })) : p);
  };
  const updateCategory = (i: number, cat: string) => setParsed(p => p ? p.map((r, idx) => idx === i ? { ...r, category: cat } : r) : p);
  const updateType = (i: number, type: "income" | "expense") => {
    setParsed(p => p ? p.map((r, idx) => idx === i ? { ...r, type, category: type === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0] } : r) : p);
  };

  async function doImport() {
    if (!parsed) return;
    const selected = parsed.filter(r => r.selected);
    if (!selected.length) return;
    setImporting(true);
    let ok = 0; let fail = 0;
    for (const row of selected) {
      try {
        const res = await adminFetch(`${getApiBase()}/api/admin/finance/transactions`, {
          method: "POST",
          body: JSON.stringify({ type: row.type, amount: row.amount, description: row.description, category: row.category, date: row.date, notes: "Imported from DBS statement" }),
        });
        if (res.ok) ok++; else fail++;
      } catch { fail++; }
    }
    setImporting(false);
    setImportResult({ ok, fail });
    if (ok > 0) onImported();
  }

  const selectedCount = parsed?.filter(r => r.selected).length ?? 0;
  const incomeTotal = parsed?.filter(r => r.selected && r.type === "income").reduce((s, r) => s + r.amount, 0) ?? 0;
  const expenseTotal = parsed?.filter(r => r.selected && r.type === "expense").reduce((s, r) => s + r.amount, 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-3xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh]" style={{ background: C.card, borderColor: C.n15 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: C.n10 }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: C.n06 }}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/DBS_Bank_logo.svg/120px-DBS_Bank_logo.svg.png"
                alt="DBS" className="h-5 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
            <div>
              <h2 className="font-bold text-base" style={{ color: C.navyText }}>Import DBS Statement</h2>
              <p className="text-xs" style={{ color: C.n40 }}>Drop a CSV exported from DBS iBanking</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-slate-100">
            <X size={16} style={{ color: C.n50 }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Drop zone — shown until file picked */}
          {!parsed && !parseError && (
            <div
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
              onClick={() => fileRef.current?.click()}
              className="rounded-2xl border-2 border-dashed py-10 flex flex-col items-center gap-3 cursor-pointer transition-all"
              style={{ borderColor: dragging ? C.navyBorder : C.n20, background: dragging ? C.n04 : C.n01 }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: C.n06 }}>
                <Upload size={20} style={{ color: C.navyText }} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm" style={{ color: C.navyText }}>{dragging ? "Drop it here" : "Drag & drop your DBS CSV"}</p>
                <p className="text-xs mt-1" style={{ color: C.n40 }}>or click to browse · .csv files only</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
            </div>
          )}

          {/* How to export instructions */}
          {!parsed && !parseError && (
            <div className="rounded-xl border px-5 py-4" style={{ background: C.n02, borderColor: C.n08 }}>
              <p className="text-xs font-semibold mb-2" style={{ color: C.n50 }}>HOW TO EXPORT FROM DBS iBanking</p>
              <ol className="space-y-1">
                {[
                  "Log in at www.dbs.com.hk → iBanking",
                  'Go to Accounts → Transaction History',
                  'Select your account and date range',
                  'Click "Download" → choose CSV format',
                  'Drop the file above',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: C.n60 }}>
                    <span className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5"
                      style={{ background: C.n08, color: C.navyText }}>{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Parse error */}
          {parseError && (
            <div className="rounded-xl border px-5 py-4 flex items-start gap-3"
              style={{ background: "rgba(248,113,113,0.05)", borderColor: "rgba(248,113,113,0.2)" }}>
              <AlertCircle size={16} className="mt-0.5 shrink-0" style={{ color: "#dc2626" }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "#dc2626" }}>Could not parse this file</p>
                <p className="text-xs mt-1" style={{ color: "rgba(220,38,38,0.75)" }}>{parseError}</p>
                <button onClick={() => { setParseError(null); setFileName(""); fileRef.current?.click(); }}
                  className="mt-3 text-xs font-semibold underline" style={{ color: "#dc2626" }}>Try another file</button>
              </div>
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div className="rounded-xl border px-5 py-4 flex items-center gap-3"
              style={{ background: "rgba(74,222,128,0.06)", borderColor: "rgba(74,222,128,0.25)" }}>
              <CheckCircle size={18} style={{ color: "#16a34a" }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "#16a34a" }}>
                  {importResult.ok} transaction{importResult.ok !== 1 ? "s" : ""} imported successfully
                  {importResult.fail > 0 ? ` · ${importResult.fail} failed` : ""}
                </p>
                <button onClick={onClose} className="mt-2 text-xs font-semibold" style={{ color: "#16a34a" }}>Close and view ledger →</button>
              </div>
            </div>
          )}

          {/* Preview table */}
          {parsed && !importResult && (
            <>
              {/* File info + summary */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <FileText size={14} style={{ color: C.n40 }} />
                  <span className="text-xs font-mono" style={{ color: C.n50 }}>{fileName}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: C.n06, color: C.navyText }}>
                    {parsed.length} rows detected
                  </span>
                </div>
                <button onClick={() => { setParsed(null); setFileName(""); fileRef.current?.click(); }}
                  className="text-xs underline" style={{ color: C.n40 }}>Use different file</button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border px-4 py-3 text-center" style={{ borderColor: "rgba(74,222,128,0.2)", background: "rgba(74,222,128,0.05)" }}>
                  <p className="text-xs font-semibold" style={{ color: C.n40 }}>Income</p>
                  <p className="text-base font-bold mt-1" style={{ color: "#16a34a" }}>+{fmt(incomeTotal)}</p>
                </div>
                <div className="rounded-xl border px-4 py-3 text-center" style={{ borderColor: "rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.05)" }}>
                  <p className="text-xs font-semibold" style={{ color: C.n40 }}>Expenses</p>
                  <p className="text-base font-bold mt-1" style={{ color: "#dc2626" }}>−{fmt(expenseTotal)}</p>
                </div>
                <div className="rounded-xl border px-4 py-3 text-center" style={{ borderColor: C.n10, background: C.n02 }}>
                  <p className="text-xs font-semibold" style={{ color: C.n40 }}>Selected</p>
                  <p className="text-base font-bold mt-1" style={{ color: C.navyText }}>{selectedCount} / {parsed.length}</p>
                </div>
              </div>

              {/* Rows */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: C.n10 }}>
                <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={{ borderColor: C.n08, background: C.n02 }}>
                  <input type="checkbox" checked={parsed.every(r => r.selected)} onChange={toggleAll}
                    className="rounded" style={{ accentColor: NAVY }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.n40 }}>
                    Select all · review categories before importing
                  </span>
                </div>
                <div className="divide-y max-h-72 overflow-y-auto" style={{ borderColor: C.n06 }}>
                  {parsed.map((row, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 transition-colors"
                      style={{ background: row.selected ? "transparent" : C.n02, opacity: row.selected ? 1 : 0.5 }}>
                      <input type="checkbox" checked={row.selected} onChange={() => toggleRow(i)}
                        className="mt-0.5 shrink-0 rounded" style={{ accentColor: NAVY }} />
                      <div className="flex-1 min-w-0 grid grid-cols-[80px_1fr_120px_100px] gap-2 items-center text-xs">
                        <span className="font-mono" style={{ color: C.n50 }}>
                          {new Date(row.date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </span>
                        <span className="truncate font-medium" style={{ color: C.navyText }} title={row.description}>{row.description}</span>
                        {/* Type toggle */}
                        <button onClick={() => updateType(i, row.type === "income" ? "expense" : "income")}
                          className="px-2 py-0.5 rounded-full font-semibold transition-all text-[11px]"
                          style={{
                            background: row.type === "income" ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
                            color: row.type === "income" ? "#16a34a" : "#dc2626",
                          }}>
                          {row.type === "income" ? "+" : "−"}{fmt(row.amount).replace("HKD$ ", "")}
                        </button>
                        {/* Category select */}
                        <div className="relative">
                          <select value={row.category} onChange={e => updateCategory(i, e.target.value)}
                            className="w-full text-[11px] px-2 py-0.5 rounded-lg border pr-5 appearance-none outline-none truncate"
                            style={{ borderColor: C.n15, color: C.n60, background: C.card }}>
                            {(row.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.n30 }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {parsed && !importResult && (
          <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-4" style={{ borderColor: C.n10 }}>
            <p className="text-xs" style={{ color: C.n40 }}>
              Click a row's amount to toggle income/expense · edit categories before importing
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border hover:bg-slate-50"
                style={{ borderColor: C.n15, color: C.n60 }}>Cancel</button>
              <button onClick={doImport} disabled={importing || selectedCount === 0}
                className="px-5 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40 flex items-center gap-2"
                style={{ background: C.navyBg, color: GOLD }}>
                {importing
                  ? <><span className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />Importing…</>
                  : <>Import {selectedCount} transaction{selectedCount !== 1 ? "s" : ""}</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Finance page ─────────────────────────────────────────────────────────
export default function Finance() {
  const C = useAdminColors();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>({ income: 0, expenses: 0, profit: 0, zakat: 0 });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.navyText }}>Finance</h1>
          <p className="text-sm mt-1" style={{ color: C.n50 }}>Income, expenses, profit &amp; Zakat</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all hover:opacity-90"
            style={{ borderColor: C.n20, color: C.navyText, background: C.n04 }}>
            <Upload size={14} /> Import DBS CSV
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: C.navyBg, color: GOLD }}>
            <Plus size={14} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className="rounded-xl border p-5" style={{ background: bg, borderColor: border }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.n50 }}>{label}</p>
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
          <p className="text-sm" style={{ color: C.n60 }}>
            Zakat is calculated at <strong>2.5%</strong> of net profit ({fmt(summary.profit)}).
            Amount due: <strong style={{ color: "#c084fc" }}>{fmt(summary.zakat)}</strong>
          </p>
        </div>
      )}

      {/* Transactions Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: C.n10 }}>
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: C.n10, background: C.n02 }}>
          <div className="flex gap-1">
            {(["all", "income", "expense"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all"
                style={{ background: tab === t ? NAVY : "transparent", color: tab === t ? GOLD : C.n50 }}>
                {t === "all" ? "All" : t === "income" ? "Income" : "Expenses"}
              </button>
            ))}
          </div>
          <span className="text-xs" style={{ color: C.n40 }}>{filtered.length} records</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: C.n40 }}>Loading…</div>
        ) : !filtered.length ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-sm" style={{ color: C.n40 }}>No {tab === "all" ? "" : tab} transactions yet.</p>
            <button onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all hover:opacity-90"
              style={{ borderColor: C.n20, color: C.navyText }}>
              <Upload size={13} /> Import from DBS CSV
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: C.n08, background: C.n02 }}>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: C.n40 }}>Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: C.n40 }}>Category</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: C.n40 }}>Description</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: C.n40 }}>Amount</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => (
                <tr key={tx.id} className="border-b transition-colors hover:bg-slate-50" style={{ borderColor: C.n06 }}>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-mono" style={{ color: C.n50 }}>
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
                    <p className="font-medium text-sm" style={{ color: C.navyText }}>{tx.description}</p>
                    {tx.notes && <p className="text-xs mt-0.5" style={{ color: C.n40 }}>{tx.notes}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="font-bold text-sm" style={{ color: tx.type === "income" ? "#16a34a" : "#dc2626" }}>
                      {tx.type === "income" ? "+" : "−"}{fmt(tx.amount)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded hover:bg-red-50 transition-colors" style={{ color: "rgba(248,113,113,0.5)" }}>
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
          <div className="w-full max-w-md rounded-2xl border shadow-2xl" style={{ background: C.card, borderColor: C.n15 }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: C.n10 }}>
              <h2 className="font-bold text-base" style={{ color: C.navyText }}>Add Transaction</h2>
              <button onClick={() => { setShowAdd(false); setFormError(null); }} className="p-1.5 rounded hover:bg-slate-100">
                <X size={16} style={{ color: C.n50 }} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="px-6 py-5 space-y-4">
              <div className="flex gap-3">
                {(["income", "expense"] as const).map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t, category: t === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0] }))}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold border transition-all"
                    style={{
                      background: form.type === t ? (t === "income" ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)") : "transparent",
                      borderColor: form.type === t ? (t === "income" ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.4)") : C.n15,
                      color: form.type === t ? (t === "income" ? "#16a34a" : "#dc2626") : C.n50,
                    }}>
                    {t === "income" ? "Income" : "Expense"}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: C.n50 }}>Amount (HKD)</label>
                  <input type="number" min={0} step={1} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: C.n20, color: C.navyText }} placeholder="e.g. 45000" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: C.n50 }}>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: C.n20, color: C.navyText }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: C.n50 }}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: C.n20, color: C.navyText }}>
                  {(form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: C.n50 }}>Description</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: C.n20, color: C.navyText }} placeholder="Brief description…" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: C.n50 }}>Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                  style={{ borderColor: C.n20, color: C.navyText }} placeholder="Additional details…" />
              </div>
              {formError && (
                <p className="text-xs rounded-lg px-3 py-2" style={{ background: "rgba(248,113,113,0.08)", color: "#dc2626", border: "1px solid rgba(248,113,113,0.2)" }}>
                  {formError}
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowAdd(false); setFormError(null); }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all hover:bg-slate-50"
                  style={{ borderColor: C.n20, color: C.n60 }}>Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: C.navyBg, color: GOLD }}>
                  {saving ? "Saving…" : "Add Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DBS Import Modal */}
      {showImport && (
        <DBSImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { loadData(); }}
        />
      )}
    </div>
  );
}
