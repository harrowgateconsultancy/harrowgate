import { useState, useEffect, useRef, useCallback } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }
function adminFetch(url: string, opts?: RequestInit) {
  const token = localStorage.getItem("admin_token");
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts?.headers ?? {}) } });
}

const GOLD       = "#a28959";
const GOLD_B     = "#c4a96e";
const GOLD_L     = "#f0d28c";
const CARD       = "#0f2d18";
const SUBTLE     = "#163320";
const BORDER     = "rgba(162,137,89,0.12)";
const BORDER_MED = "rgba(162,137,89,0.22)";
const MUTED      = "rgba(162,137,89,0.06)";
const TEXT_FAINT = "rgba(162,137,89,0.40)";
const TEXT_MID   = "rgba(162,137,89,0.65)";

function fmt(n: number) { return `HKD$ ${n.toLocaleString("en-HK")}`; }

const INCOME_CATEGORIES = [
  "Consultation Fee", "Application Service Fee", "Document Processing",
  "Translation Service", "Other Income",
];
const EXPENSE_CATEGORIES = [
  "Government Fee", "Office Rent", "Staff Salary", "Marketing",
  "Software & Tools", "Professional Services", "Travel & Transport", "Other Expense",
];

interface Transaction {
  id: number; type: "income" | "expense"; amount: number;
  description: string; category: string; date: string;
  notes?: string | null; createdAt: string;
}
interface Summary { income: number; expenses: number; profit: number; zakat: number; }
interface ParsedRow {
  date: string; description: string; amount: number;
  type: "income" | "expense"; category: string; selected: boolean; raw: string;
}

function parseDBSCSV(text: string): { rows: ParsedRow[]; error: string | null } {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], error: "File appears to be empty." };
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes("date") && (lower.includes("debit") || lower.includes("credit") || lower.includes("amount") || lower.includes("transaction"))) {
      headerIdx = i; break;
    }
  }
  if (headerIdx === -1) return { rows: [], error: "Cannot find a recognised CSV header (expected Date + Debit/Credit/Amount columns)." };
  const headers = parseCSVLine(lines[headerIdx]).map(h => h.toLowerCase().trim());
  const dateIdx = headers.findIndex(h => h === "date");
  const debitIdx = headers.findIndex(h => h.includes("debit") || h === "withdrawal");
  const creditIdx = headers.findIndex(h => h.includes("credit") || h === "deposit");
  const amountIdx = debitIdx === -1 && creditIdx === -1 ? headers.findIndex(h => h === "amount") : -1;
  const descIdx = headers.findIndex(h => h.includes("description") || h.includes("transaction") || h.includes("particulars") || h.includes("details") || h === "remarks");
  if (dateIdx === -1) return { rows: [], error: "No Date column found." };
  if (descIdx === -1) return { rows: [], error: "No description/transaction column found." };
  const rows: ParsedRow[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 3) continue;
    const rawDate = cols[dateIdx]?.trim() ?? "";
    const parsed = parseDate(rawDate);
    if (!parsed) continue;
    const desc = cols[descIdx]?.trim() ?? "";
    if (!desc) continue;
    let amount = 0; let type: "income" | "expense" = "income";
    if (amountIdx !== -1) {
      const raw = cols[amountIdx]?.replace(/[^0-9.-]/g, "") ?? "0";
      amount = Math.abs(parseFloat(raw) || 0);
      type = parseFloat(raw) >= 0 ? "income" : "expense";
    } else {
      const dr = Math.abs(parseFloat(cols[debitIdx]?.replace(/[^0-9.]/g, "") ?? "0") || 0);
      const cr = Math.abs(parseFloat(cols[creditIdx]?.replace(/[^0-9.]/g, "") ?? "0") || 0);
      if (cr > 0) { amount = cr; type = "income"; }
      else if (dr > 0) { amount = dr; type = "expense"; }
      else continue;
    }
    if (amount <= 0) continue;
    rows.push({ date: parsed, description: desc, amount, type, category: type === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0], selected: true, raw: lines[i] });
  }
  if (rows.length === 0) return { rows: [], error: "No transactions could be parsed. Check the file format." };
  return { rows, error: null };
}
function parseCSVLine(line: string): string[] {
  const result: string[] = []; let cur = ""; let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === "," && !inQuote) { result.push(cur); cur = ""; }
    else { cur += ch; }
  }
  result.push(cur);
  return result.map(s => s.trim().replace(/^"|"$/g, ""));
}
function parseDate(raw: string): string | null {
  const s = raw.trim();
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    /^(\d{2})-(\d{2})-(\d{4})$/,
    /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/,
  ];
  for (const re of formats) {
    const m = s.match(re);
    if (m) {
      try {
        const d = new Date(s);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      } catch { /* skip */ }
    }
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────
const IcoTrendUp = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0">
    <path d="M2 12l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 5h4v4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IcoTrendDown = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0">
    <path d="M2 4l4 4 3-3 5 6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 11h4V7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IcoDollar = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0">
    <circle cx="8" cy="8" r="6"/>
    <path d="M8 5v6M6.5 6h2a1.5 1.5 0 010 3h-2a1.5 1.5 0 000 3H9" strokeLinecap="round"/>
  </svg>
);
const IcoMoon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0">
    <path d="M13 10A6 6 0 016 3a6 6 0 100 10 6 6 0 007-3z" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IcoPlus = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0">
    <path d="M8 3v10M3 8h10" strokeLinecap="round"/>
  </svg>
);
const IcoTrash = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0">
    <path d="M3 5h10M6 5V3h4v2M13 5l-1 8H4L3 5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IcoClose = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0">
    <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round"/>
  </svg>
);
const IcoUpload = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0">
    <path d="M2 11v2h12v-2M8 2v8M5 5l3-3 3 3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IcoFile = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0">
    <path d="M9 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6L9 2z" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 2v4h4M5 9h6M5 12h4" strokeLinecap="round"/>
  </svg>
);
const IcoCheck = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0">
    <circle cx="8" cy="8" r="6"/>
    <path d="M5 8l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IcoAlert = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0">
    <circle cx="8" cy="8" r="6"/>
    <path d="M8 5v3.5M8 11v.5" strokeLinecap="round"/>
  </svg>
);
const IcoChevron = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-2.5 h-2.5 shrink-0">
    <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── DBS Import Modal ──────────────────────────────────────────────────────────
function DBSImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: number; fail: number } | null>(null);
  const [fileName, setFileName] = useState("");

  const handleFile = useCallback((file: File) => {
    setParseError(null); setParsed(null); setImportResult(null); setFileName(file.name);
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
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, [handleFile]);

  const toggleRow = (i: number) => setParsed(p => p ? p.map((r, idx) => idx === i ? { ...r, selected: !r.selected } : r) : p);
  const toggleAll = () => { const all = parsed?.every(r => r.selected); setParsed(p => p ? p.map(r => ({ ...r, selected: !all })) : p); };
  const updateCategory = (i: number, cat: string) => setParsed(p => p ? p.map((r, idx) => idx === i ? { ...r, category: cat } : r) : p);
  const updateType = (i: number, type: "income" | "expense") =>
    setParsed(p => p ? p.map((r, idx) => idx === i ? { ...r, type, category: type === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0] } : r) : p);

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
    setImporting(false); setImportResult({ ok, fail });
    if (ok > 0) onImported();
  }

  const selectedCount = parsed?.filter(r => r.selected).length ?? 0;
  const incomeTotal = parsed?.filter(r => r.selected && r.type === "income").reduce((s, r) => s + r.amount, 0) ?? 0;
  const expenseTotal = parsed?.filter(r => r.selected && r.type === "expense").reduce((s, r) => s + r.amount, 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-3xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh]" style={{ background: CARD, borderColor: BORDER_MED }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: MUTED, border: `1px solid ${BORDER}` }}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/DBS_Bank_logo.svg/120px-DBS_Bank_logo.svg.png"
                alt="DBS" className="h-5 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
            <div>
              <h2 className="font-bold text-base" style={{ color: GOLD_L }}>Import DBS Statement</h2>
              <p className="text-xs" style={{ color: TEXT_FAINT }}>Drop a CSV exported from DBS iBanking</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-all hover:opacity-70" style={{ color: TEXT_MID }}>
            <IcoClose />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Drop zone */}
          {!parsed && !parseError && (
            <div onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
              onClick={() => fileRef.current?.click()}
              className="rounded-2xl border-2 border-dashed py-10 flex flex-col items-center gap-3 cursor-pointer transition-all"
              style={{ borderColor: dragging ? GOLD_B : BORDER_MED, background: dragging ? "rgba(162,137,89,0.06)" : "rgba(162,137,89,0.02)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: MUTED, border: `1px solid ${BORDER}` }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-6 h-6" style={{ color: GOLD_B }}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v13" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm" style={{ color: GOLD_B }}>{dragging ? "Drop it here" : "Drag & drop your DBS CSV"}</p>
                <p className="text-xs mt-1" style={{ color: TEXT_FAINT }}>or click to browse · .csv files only</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
            </div>
          )}

          {!parsed && !parseError && (
            <div className="rounded-xl border px-5 py-4" style={{ background: "rgba(162,137,89,0.03)", borderColor: BORDER }}>
              <p className="text-xs font-semibold mb-2 tracking-wider uppercase" style={{ color: TEXT_FAINT }}>How to export from DBS iBanking</p>
              <ol className="space-y-1">
                {["Log in at www.dbs.com.hk → iBanking", "Go to Accounts → Transaction History",
                  "Select your account and date range", 'Click "Download" → choose CSV format', "Drop the file above"].map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: TEXT_MID }}>
                    <span className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5"
                      style={{ background: MUTED, color: GOLD_B, border: `1px solid ${BORDER}` }}>{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {parseError && (
            <div className="rounded-xl border px-5 py-4 flex items-start gap-3"
              style={{ background: "rgba(248,113,113,0.05)", borderColor: "rgba(248,113,113,0.2)" }}>
              <span style={{ color: "#f87171" }}><IcoAlert /></span>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#f87171" }}>Could not parse this file</p>
                <p className="text-xs mt-1" style={{ color: "rgba(248,113,113,0.70)" }}>{parseError}</p>
                <button onClick={() => { setParseError(null); setFileName(""); fileRef.current?.click(); }}
                  className="mt-3 text-xs font-semibold underline" style={{ color: "#f87171" }}>Try another file</button>
              </div>
            </div>
          )}

          {importResult && (
            <div className="rounded-xl border px-5 py-4 flex items-center gap-3"
              style={{ background: "rgba(162,137,89,0.06)", borderColor: BORDER_MED }}>
              <span style={{ color: GOLD_B }}><IcoCheck /></span>
              <div>
                <p className="text-sm font-semibold" style={{ color: GOLD_B }}>
                  {importResult.ok} transaction{importResult.ok !== 1 ? "s" : ""} imported
                  {importResult.fail > 0 ? ` · ${importResult.fail} failed` : ""}
                </p>
                <button onClick={onClose} className="mt-2 text-xs font-semibold" style={{ color: GOLD_L }}>Close and view ledger →</button>
              </div>
            </div>
          )}

          {parsed && !importResult && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span style={{ color: TEXT_FAINT }}><IcoFile /></span>
                  <span className="text-xs font-mono" style={{ color: TEXT_MID }}>{fileName}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: MUTED, color: GOLD_B, border: `1px solid ${BORDER}` }}>
                    {parsed.length} rows
                  </span>
                </div>
                <button onClick={() => { setParsed(null); setFileName(""); fileRef.current?.click(); }}
                  className="text-xs underline" style={{ color: TEXT_FAINT }}>Use different file</button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border px-4 py-3 text-center" style={{ borderColor: "rgba(162,137,89,0.20)", background: "rgba(162,137,89,0.05)" }}>
                  <p className="text-xs font-semibold" style={{ color: TEXT_FAINT }}>Income</p>
                  <p className="text-base font-bold mt-1" style={{ color: GOLD_B }}>+{fmt(incomeTotal)}</p>
                </div>
                <div className="rounded-xl border px-4 py-3 text-center" style={{ borderColor: "rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.05)" }}>
                  <p className="text-xs font-semibold" style={{ color: TEXT_FAINT }}>Expenses</p>
                  <p className="text-base font-bold mt-1" style={{ color: "#f87171" }}>−{fmt(expenseTotal)}</p>
                </div>
                <div className="rounded-xl border px-4 py-3 text-center" style={{ borderColor: BORDER, background: MUTED }}>
                  <p className="text-xs font-semibold" style={{ color: TEXT_FAINT }}>Selected</p>
                  <p className="text-base font-bold mt-1" style={{ color: GOLD_L }}>{selectedCount} / {parsed.length}</p>
                </div>
              </div>

              <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
                <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={{ borderColor: BORDER, background: "rgba(162,137,89,0.04)" }}>
                  <input type="checkbox" checked={parsed.every(r => r.selected)} onChange={toggleAll}
                    className="rounded" style={{ accentColor: GOLD }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT_FAINT }}>
                    Select all · review categories before importing
                  </span>
                </div>
                <div className="divide-y max-h-72 overflow-y-auto" style={{ borderColor: BORDER }}>
                  {parsed.map((row, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 transition-colors"
                      style={{ background: row.selected ? "transparent" : "rgba(162,137,89,0.02)", opacity: row.selected ? 1 : 0.45 }}>
                      <input type="checkbox" checked={row.selected} onChange={() => toggleRow(i)}
                        className="mt-0.5 shrink-0 rounded" style={{ accentColor: GOLD }} />
                      <div className="flex-1 min-w-0 grid grid-cols-[80px_1fr_120px_100px] gap-2 items-center text-xs">
                        <span className="font-mono" style={{ color: TEXT_MID }}>
                          {new Date(row.date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </span>
                        <span className="truncate font-medium" style={{ color: GOLD_B }} title={row.description}>{row.description}</span>
                        <button onClick={() => updateType(i, row.type === "income" ? "expense" : "income")}
                          className="px-2 py-0.5 rounded-full font-semibold transition-all text-[11px]"
                          style={{ background: row.type === "income" ? "rgba(162,137,89,0.12)" : "rgba(248,113,113,0.12)", color: row.type === "income" ? GOLD_B : "#f87171" }}>
                          {row.type === "income" ? "+" : "−"}{fmt(row.amount).replace("HKD$ ", "")}
                        </button>
                        <div className="relative">
                          <select value={row.category} onChange={e => updateCategory(i, e.target.value)}
                            className="w-full text-[11px] px-2 py-0.5 rounded-lg border pr-5 appearance-none outline-none truncate"
                            style={{ borderColor: BORDER_MED, color: GOLD_B, background: CARD }}>
                            {(row.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: TEXT_FAINT }}><IcoChevron /></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {parsed && !importResult && (
          <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-4" style={{ borderColor: BORDER }}>
            <p className="text-xs" style={{ color: TEXT_FAINT }}>Click a row's amount to toggle income/expense · edit categories before importing</p>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm border transition-all hover:opacity-70"
                style={{ borderColor: BORDER_MED, color: TEXT_MID }}>Cancel</button>
              <button onClick={doImport} disabled={importing || selectedCount === 0}
                className="px-5 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40 flex items-center gap-2"
                style={{ background: "rgba(162,137,89,0.14)", borderColor: BORDER_MED, border: `1px solid ${BORDER_MED}`, color: GOLD_L }}>
                {importing
                  ? <><span className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: GOLD_L, borderTopColor: "transparent" }} />Importing…</>
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>({ income: 0, expenses: 0, profit: 0, zakat: 0 });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [tab, setTab] = useState<"all" | "income" | "expense">("all");

  const [form, setForm] = useState({
    type: "income" as "income" | "expense", amount: "", description: "",
    category: INCOME_CATEGORIES[0], date: new Date().toISOString().slice(0, 10), notes: "",
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
    e.preventDefault(); setFormError(null);
    if (!form.amount || !form.description || !form.category || !form.date) { setFormError("All fields are required."); return; }
    setSaving(true);
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/finance/transactions`, {
        method: "POST", body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
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
    { label: "Total Income", value: summary.income, Icon: IcoTrendUp, color: GOLD_B, border: "rgba(162,137,89,0.20)", bg: "rgba(162,137,89,0.07)" },
    { label: "Total Expenses", value: summary.expenses, Icon: IcoTrendDown, color: "#f87171", border: "rgba(248,113,113,0.2)", bg: "rgba(248,113,113,0.07)" },
    { label: "Net Profit", value: summary.profit, Icon: IcoDollar, color: GOLD_L, border: "rgba(240,210,140,0.20)", bg: "rgba(240,210,140,0.05)" },
    { label: "Zakat Due (2.5%)", value: summary.zakat, Icon: IcoMoon, color: GOLD, border: "rgba(162,137,89,0.20)", bg: "rgba(162,137,89,0.05)" },
  ];

  const inputStyle = { background: MUTED, borderColor: BORDER_MED, color: GOLD_B } as React.CSSProperties;

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-0.5" style={{ color: GOLD_L, letterSpacing: "-0.01em" }}>Finance</h1>
          <p className="text-xs" style={{ color: TEXT_FAINT }}>Income, expenses, profit &amp; Zakat</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all hover:opacity-80"
            style={{ borderColor: BORDER_MED, color: GOLD_B, background: MUTED }}>
            <IcoUpload /> Import DBS CSV
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all hover:opacity-90"
            style={{ background: "rgba(162,137,89,0.14)", borderColor: BORDER_MED, color: GOLD_L }}>
            <IcoPlus /> Add Transaction
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {statCards.map(({ label, value, Icon, color, bg, border }) => (
          <div key={label} className="rounded-2xl border p-5" style={{ background: bg, borderColor: border }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: TEXT_FAINT }}>{label}</p>
              <span style={{ color }}><Icon /></span>
            </div>
            <p className="text-xl font-bold" style={{ color }}>{fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* Zakat note */}
      {summary.profit > 0 && (
        <div className="mb-6 rounded-xl border px-5 py-3.5 flex items-center gap-3"
          style={{ background: "rgba(162,137,89,0.04)", borderColor: BORDER }}>
          <span style={{ color: GOLD }}><IcoMoon /></span>
          <p className="text-sm" style={{ color: TEXT_MID }}>
            Zakat at <strong style={{ color: GOLD_B }}>2.5%</strong> of net profit ({fmt(summary.profit)}) = <strong style={{ color: GOLD_L }}>{fmt(summary.zakat)}</strong>
          </p>
        </div>
      )}

      {/* Transactions Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>
        {/* Tab bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: BORDER, background: "rgba(162,137,89,0.03)" }}>
          <div className="flex border-b" style={{ borderColor: "transparent", gap: 0 }}>
            {(["all", "income", "expense"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="relative px-4 py-1.5 text-xs font-medium capitalize transition-all"
                style={{ color: tab === t ? GOLD_L : TEXT_FAINT }}>
                {t === "all" ? "All" : t === "income" ? "Income" : "Expenses"}
                {tab === t && <span className="absolute bottom-0 left-2 right-2 h-px rounded-full" style={{ background: GOLD_B }} />}
              </button>
            ))}
          </div>
          <span className="text-xs" style={{ color: TEXT_FAINT }}>{filtered.length} records</span>
        </div>

        {loading ? (
          <div className="py-16 text-center"><div className="w-5 h-5 rounded-full border-2 animate-spin mx-auto" style={{ borderColor: GOLD, borderTopColor: "transparent" }} /></div>
        ) : !filtered.length ? (
          <div className="py-16 text-center space-y-3">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-10 h-10 mx-auto" style={{ color: GOLD, opacity: 0.2 }}>
              <rect x="4" y="8" width="40" height="32" rx="3"/>
              <path d="M4 18l20 12 20-12" strokeLinecap="round"/>
            </svg>
            <p className="text-sm" style={{ color: TEXT_FAINT }}>No {tab === "all" ? "" : tab} transactions yet.</p>
            <button onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all hover:opacity-80"
              style={{ borderColor: BORDER_MED, color: GOLD_B, background: MUTED }}>
              <IcoUpload /> Import from DBS CSV
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: BORDER, background: "rgba(162,137,89,0.03)" }}>
                {["Date", "Category", "Description", "Amount", ""].map((h, i) => (
                  <th key={i} className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${i >= 3 ? "text-right" : "text-left"} ${i === 1 ? "hidden sm:table-cell" : ""}`}
                    style={{ color: TEXT_FAINT }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => (
                <tr key={tx.id} className="border-b transition-colors hover:bg-[rgba(162,137,89,0.03)]" style={{ borderColor: BORDER }}>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-mono" style={{ color: TEXT_MID }}>
                      {new Date(tx.date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: tx.type === "income" ? "rgba(162,137,89,0.10)" : "rgba(248,113,113,0.1)", color: tx.type === "income" ? GOLD_B : "#f87171" }}>
                      {tx.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-sm" style={{ color: GOLD_B }}>{tx.description}</p>
                    {tx.notes && <p className="text-xs mt-0.5" style={{ color: TEXT_FAINT }}>{tx.notes}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="font-bold text-sm" style={{ color: tx.type === "income" ? GOLD_B : "#f87171" }}>
                      {tx.type === "income" ? "+" : "−"}{fmt(tx.amount)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button onClick={() => handleDelete(tx.id)}
                      className="p-1.5 rounded-lg transition-colors hover:opacity-80" style={{ color: "rgba(248,113,113,0.45)" }}>
                      <IcoTrash />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}>
          <div className="w-full max-w-md rounded-2xl border shadow-2xl" style={{ background: CARD, borderColor: BORDER_MED }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BORDER }}>
              <h2 className="font-bold text-base" style={{ color: GOLD_L }}>Add Transaction</h2>
              <button onClick={() => { setShowAdd(false); setFormError(null); }} className="p-1.5 rounded-lg transition-all hover:opacity-70" style={{ color: TEXT_MID }}>
                <IcoClose />
              </button>
            </div>
            <form onSubmit={handleAdd} className="px-6 py-5 space-y-4">
              <div className="flex gap-3">
                {(["income", "expense"] as const).map(t => (
                  <button key={t} type="button"
                    onClick={() => setForm(f => ({ ...f, type: t, category: t === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0] }))}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold border transition-all"
                    style={{
                      background: form.type === t ? (t === "income" ? "rgba(162,137,89,0.10)" : "rgba(248,113,113,0.10)") : "transparent",
                      borderColor: form.type === t ? (t === "income" ? BORDER_MED : "rgba(248,113,113,0.35)") : BORDER,
                      color: form.type === t ? (t === "income" ? GOLD_B : "#f87171") : TEXT_FAINT,
                    }}>
                    {t === "income" ? "Income" : "Expense"}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: TEXT_FAINT }}>Amount (HKD)</label>
                  <input type="number" min={0} step={1} value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none" style={inputStyle} placeholder="e.g. 45000" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: TEXT_FAINT }}>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none" style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: TEXT_FAINT }}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none" style={inputStyle}>
                  {(form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: TEXT_FAINT }}>Description</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none" style={inputStyle} placeholder="Brief description…" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: TEXT_FAINT }}>Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none" style={inputStyle} placeholder="Additional details…" />
              </div>
              {formError && (
                <p className="text-xs rounded-xl px-3 py-2" style={{ background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
                  {formError}
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowAdd(false); setFormError(null); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all hover:opacity-70"
                  style={{ borderColor: BORDER_MED, color: TEXT_MID }}>Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "rgba(162,137,89,0.14)", border: `1px solid ${BORDER_MED}`, color: GOLD_L }}>
                  {saving ? "Saving…" : "Add Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <DBSImportModal onClose={() => setShowImport(false)} onImported={() => loadData()} />
      )}
    </div>
  );
}
