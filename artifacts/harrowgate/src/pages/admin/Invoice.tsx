import { useState, useRef } from "react";
import { Search, Printer, RotateCcw, ChevronDown, Receipt } from "lucide-react";
import { useListClients } from "@workspace/api-client-react";
import { useAdminColors } from "../../contexts/AdminThemeContext";

/* ─── helpers ─── */
function genInvoiceNo(name: string, passport: string): string {
  const words = name.trim().split(/\s+/);
  const l1 = (words[0]?.[0] ?? "X").toUpperCase();
  const l2 = (words[1]?.[0] ?? "X").toUpperCase();
  const p4 = (passport ?? "").replace(/\s/g, "").slice(-4).toUpperCase();
  return `INV-${l1}${l2}-${p4 || "0000"}`;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

function fmtHKD(n: number) {
  return `HKD$ ${n.toLocaleString("en-HK")}`;
}

interface LineItem {
  no: number;
  description: string;
  qty: number;
  amount: number;
}

interface PayScheduleRow {
  no: number;
  label: string;
  amount: number;
}

const DEFAULT_ITEMS: LineItem[] = [
  {
    no: 1,
    description: "(1st Deposit)   Delivering expert counseling to aid students in choosing courses and managing their application procedures",
    qty: 1,
    amount: 13000,
  },
  {
    no: 2,
    description: "(2nd Payment)   Upon successfully securing a university offer",
    qty: 1,
    amount: 82000,
  },
  {
    no: 3,
    description: "(3rd Payment)   Upon approval of student's visa",
    qty: 1,
    amount: 15000,
  },
];

const DEFAULT_SCHEDULE: PayScheduleRow[] = [
  { no: 1, label: "(1st Deposit)",  amount: 13000 },
  { no: 2, label: "(2nd Payment)", amount: 82000  },
  { no: 3, label: "(3rd Payment)",  amount: 15000  },
];

const REMARKS = [
  "From the first deposit, HKD 10,000 shall be refundable only in the event that Harrowgate Consultancy fails to secure an offer.",
  "(2nd Payment) — Upon successfully securing an offer.",
  "(3rd Payment) — Upon approval of student's visa.",
  "This fee includes career guidance/counselling for students.",
  "Air fare & any travel expenses are NOT included.",
  "Refunds are subject to the University/College's official refund policy.",
  "Only the first semester fee is included; subsequent semester fees shall be paid directly by students to the institution.",
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ═══════════════════════════════════════════════════
   PRINTABLE INVOICE
═══════════════════════════════════════════════════ */
function InvoicePreview({
  invoiceNo,
  date,
  clientName,
  clientAddress,
  items,
  schedule,
}: {
  invoiceNo: string;
  date: string;
  clientName: string;
  clientAddress: string;
  items: LineItem[];
  schedule: PayScheduleRow[];
}) {
  const total = items.reduce((s, i) => s + i.amount * i.qty, 0);

  return (
    <div
      id="invoice-printable"
      style={{
        background: "#fff",
        color: "#111",
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: "11pt",
        padding: "40px 48px",
        minHeight: "297mm",
        width: "100%",
        boxSizing: "border-box",
        position: "relative",
      }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        {/* Left: title */}
        <div>
          <p style={{ fontFamily: "Arial, sans-serif", fontSize: "22pt", fontWeight: 900, color: "#0b2213", letterSpacing: "0.04em", margin: 0 }}>
            PROFORMA INVOICE
          </p>
        </div>
        {/* Center: logo */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <img
            src={`${BASE}/harrowgate-logo.png`}
            alt="HARROWGATE"
            style={{ height: 80, objectFit: "contain" }}
          />
        </div>
        {/* Right: contact */}
        <div style={{ textAlign: "right", fontSize: "9.5pt", color: "#333", lineHeight: 1.8 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>HARROWGATE Consultancy</p>
          <p style={{ margin: 0 }}>P: +852 6159 0422</p>
          <p style={{ margin: 0 }}>harrowgateconsultancy@gmail.com</p>
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ borderTop: "2.5px solid #0b2213", marginBottom: 18 }} />

      {/* ── Invoice meta + Bill to ── */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ fontSize: "10pt", lineHeight: 2.0 }}>
          <p style={{ margin: 0 }}><strong>Bill to:</strong> {clientName || "—"}</p>
          <p style={{ margin: 0 }}><strong>Address:</strong> {clientAddress || "N/A"}</p>
        </div>
        <div style={{ fontSize: "10pt", lineHeight: 2.0, textAlign: "right" }}>
          <p style={{ margin: 0 }}><strong>Invoice No:</strong> {invoiceNo}</p>
          <p style={{ margin: 0 }}><strong>Date:</strong> {date}</p>
        </div>
      </div>

      {/* ── Items table ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0, fontSize: "10pt" }}>
        <thead>
          <tr style={{ background: "#0b2213", color: "#f0d28c" }}>
            <th style={{ border: "1px solid #555", padding: "7px 10px", textAlign: "center", width: 40 }}>NO</th>
            <th style={{ border: "1px solid #555", padding: "7px 10px", textAlign: "left" }}>Description</th>
            <th style={{ border: "1px solid #555", padding: "7px 10px", textAlign: "center", width: 50 }}>QTY</th>
            <th style={{ border: "1px solid #555", padding: "7px 10px", textAlign: "right", width: 140 }}>AMOUNT HKD$</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.no} style={{ verticalAlign: "top" }}>
              <td style={{ border: "1px solid #aaa", padding: "8px 10px", textAlign: "center" }}>{item.no}</td>
              <td style={{ border: "1px solid #aaa", padding: "8px 10px", lineHeight: 1.55 }}>{item.description}</td>
              <td style={{ border: "1px solid #aaa", padding: "8px 10px", textAlign: "center" }}>{item.qty}</td>
              <td style={{ border: "1px solid #aaa", padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>
                {item.amount.toLocaleString("en-HK")}
              </td>
            </tr>
          ))}
          <tr style={{ background: "#f5f5f5" }}>
            <td colSpan={3} style={{ border: "1px solid #aaa", padding: "8px 10px", textAlign: "right", fontWeight: 800, fontSize: "11pt" }}>
              TOTAL
            </td>
            <td style={{ border: "1px solid #aaa", padding: "8px 10px", textAlign: "right", fontWeight: 900, fontSize: "11pt" }}>
              {total.toLocaleString("en-HK")}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Payment Schedule ── */}
      <div style={{ marginTop: 24, marginBottom: 20 }}>
        <p style={{ fontWeight: 800, fontSize: "11pt", marginBottom: 8, borderBottom: "1.5px solid #0b2213", paddingBottom: 4 }}>
          Payment Schedule:
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt" }}>
          <tbody>
            {schedule.map(row => (
              <tr key={row.no}>
                <td style={{ padding: "4px 8px", width: 32, textAlign: "center", color: "#555" }}>{row.no}.</td>
                <td style={{ padding: "4px 8px" }}>{row.label}</td>
                <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 600, width: 140 }}>
                  HKD$ {row.amount.toLocaleString("en-HK")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Remarks ── */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontWeight: 800, fontSize: "11pt", marginBottom: 8, borderBottom: "1.5px solid #0b2213", paddingBottom: 4 }}>
          Remarks:
        </p>
        {REMARKS.map((r, i) => (
          <p key={i} style={{ margin: "4px 0", fontSize: "9.5pt", lineHeight: 1.6, color: "#222" }}>
            <strong>{i + 1})</strong> {r}
          </p>
        ))}
      </div>

      {/* ── Signature area ── */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, paddingTop: 12, borderTop: "1px solid #ccc" }}>
        <div style={{ textAlign: "center", width: "45%" }}>
          <div style={{ height: 40, borderBottom: "1px solid #888", marginBottom: 6 }} />
          <p style={{ margin: 0, fontSize: "9pt", color: "#555" }}>Authorised Signature — HARROWGATE Consultancy</p>
        </div>
        <div style={{ textAlign: "center", width: "45%" }}>
          <div style={{ height: 40, borderBottom: "1px solid #888", marginBottom: 6 }} />
          <p style={{ margin: 0, fontSize: "9pt", color: "#555" }}>Client Signature</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════ */
export default function InvoicePage() {
  const colors = useAdminColors();
  const { data: clients = [], isLoading } = useListClients();

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [items, setItems] = useState<LineItem[]>(DEFAULT_ITEMS);
  const [schedule, setSchedule] = useState<PayScheduleRow[]>(DEFAULT_SCHEDULE);
  const [clientAddress, setClientAddress] = useState("N/A");

  const today = fmtDate(new Date());

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const selected = clients.find(c => c.id === selectedId) ?? null;
  const invoiceNo = selected ? genInvoiceNo(selected.name, selected.passportNumber ?? "") : "INV-——";

  /* ── item editing helpers ── */
  function updateItem(idx: number, field: keyof LineItem, val: string | number) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: field === "amount" || field === "qty" ? Number(val) || 0 : val } : it));
  }
  function updateSchedule(idx: number, field: keyof PayScheduleRow, val: string | number) {
    setSchedule(prev => prev.map((r, i) => i === idx ? { ...r, [field]: field === "amount" ? Number(val) || 0 : val } : r));
  }
  function syncAmounts() {
    setSchedule(prev => prev.map((r, i) => ({ ...r, amount: items[i]?.amount ?? r.amount })));
  }

  function handlePrint() {
    window.print();
  }

  function handleReset() {
    setItems(DEFAULT_ITEMS);
    setSchedule(DEFAULT_SCHEDULE);
    setClientAddress("N/A");
    setSelectedId(null);
    setSearch("");
  }

  const total = items.reduce((s, i) => s + i.amount * i.qty, 0);

  return (
    <div className="p-6 lg:p-8 max-w-screen-2xl mx-auto">
      <style>{`
        @media print {
          body > * { display: none !important; }
          #invoice-print-root { display: block !important; }
          #invoice-print-root * { display: revert !important; }
        }
      `}</style>

      {/* Hidden print target */}
      <div id="invoice-print-root" style={{ display: "none" }}>
        <InvoicePreview
          invoiceNo={invoiceNo}
          date={today}
          clientName={selected?.name ?? ""}
          clientAddress={clientAddress}
          items={items}
          schedule={schedule}
        />
      </div>

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Receipt size={22} className="text-primary" /> Invoice Generator
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Generate and print a proforma invoice for any client</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2 border border-border rounded text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <RotateCcw size={14} /> Reset
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 transition-opacity"
            disabled={!selected}>
            <Printer size={15} /> Print / Save PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">

        {/* ── LEFT: Config panel ── */}
        <div className="space-y-5">

          {/* Client selector */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">1</span>
              Select Client
            </h2>

            <div className="relative mb-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={e => { setSearch(e.target.value); setDropdownOpen(true); }}
                onFocus={() => setDropdownOpen(true)}
                className="w-full pl-8 pr-3 py-2 border border-border rounded bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {dropdownOpen && (search || !selectedId) && (
              <div className="border border-border rounded-lg overflow-hidden max-h-52 overflow-y-auto bg-card shadow-lg">
                {isLoading ? (
                  <p className="text-xs text-muted-foreground p-3">Loading…</p>
                ) : filtered.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3">No clients found.</p>
                ) : filtered.map(c => (
                  <button key={c.id}
                    onClick={() => {
                      setSelectedId(c.id);
                      setSearch(c.name);
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors border-b border-border last:border-0 text-sm">
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.email} · {c.passportNumber || "No passport"}</p>
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1 text-xs">
                <p><span className="text-muted-foreground">Name:</span> <span className="font-semibold text-foreground">{selected.name}</span></p>
                <p><span className="text-muted-foreground">Passport:</span> <span className="font-mono text-foreground">{selected.passportNumber || "—"}</span></p>
                <p><span className="text-muted-foreground">Nationality:</span> <span className="text-foreground">{selected.nationality || "—"}</span></p>
                <p><span className="text-muted-foreground">Invoice No:</span> <span className="font-bold text-primary">{invoiceNo}</span></p>
                <div className="flex items-center gap-2 pt-1">
                  <label className="text-muted-foreground shrink-0">Address:</label>
                  <input
                    value={clientAddress}
                    onChange={e => setClientAddress(e.target.value)}
                    className="flex-1 px-2 py-0.5 border border-border rounded bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Line items editor */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">2</span>
                Invoice Line Items
              </h2>
              <button onClick={syncAmounts}
                className="text-xs text-primary hover:underline">
                Sync schedule ↓
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.no} className="border border-border rounded-lg p-3 bg-background space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold shrink-0">{item.no}</span>
                    <textarea
                      value={item.description}
                      onChange={e => updateItem(idx, "description", e.target.value)}
                      rows={2}
                      className="flex-1 px-2 py-1.5 border border-border rounded bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="text-xs text-muted-foreground">QTY</label>
                    <input type="number" min={1} value={item.qty}
                      onChange={e => updateItem(idx, "qty", e.target.value)}
                      className="w-14 px-2 py-1 border border-border rounded bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                    <label className="text-xs text-muted-foreground">HKD$</label>
                    <input type="number" min={0} value={item.amount}
                      onChange={e => updateItem(idx, "amount", e.target.value)}
                      className="flex-1 px-2 py-1 border border-border rounded bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-1">
                <span className="text-sm font-bold text-foreground">Total: {fmtHKD(total)}</span>
              </div>
            </div>
          </div>

          {/* Payment schedule editor */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">3</span>
              Payment Schedule
            </h2>
            <div className="space-y-2">
              {schedule.map((row, idx) => (
                <div key={row.no} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4 shrink-0">{row.no}.</span>
                  <input value={row.label}
                    onChange={e => updateSchedule(idx, "label", e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-border rounded bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                  <input type="number" value={row.amount}
                    onChange={e => updateSchedule(idx, "amount", e.target.value)}
                    className="w-28 px-2 py-1.5 border border-border rounded bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Invoice preview ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">Preview</p>
            <p className="text-xs text-muted-foreground">
              {selected ? `Invoice for ${selected.name}` : "Select a client to populate invoice"}
            </p>
          </div>
          <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-white"
            style={{ minHeight: 600 }}>
            <InvoicePreview
              invoiceNo={invoiceNo}
              date={today}
              clientName={selected?.name ?? ""}
              clientAddress={clientAddress}
              items={items}
              schedule={schedule}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
