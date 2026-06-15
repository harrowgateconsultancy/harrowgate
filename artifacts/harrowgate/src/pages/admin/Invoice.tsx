import { useState, useEffect } from "react";
import { Search, Printer, RotateCcw, Send, CheckCircle, AlertCircle, Plus, Trash2, Receipt, FileText } from "lucide-react";
import { useListClients } from "@workspace/api-client-react";
import { usePricing, DEFAULT_PRICING, type PricingConfig } from "../../hooks/usePricing";

/* ─── constants ─── */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBase() { return `${window.location.origin}${BASE}`; }
function adminFetch(url: string, opts?: RequestInit) {
  const token = localStorage.getItem("admin_token");
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts?.headers ?? {}) } });
}
const FIRST_PAYMENT = 3000;

/* ─── helpers ─── */
function genInvoiceNo(name: string, passport: string): string {
  const words = name.trim().split(/\s+/);
  const l1 = (words[0]?.[0] ?? "X").toUpperCase();
  const l2 = (words[1]?.[0] ?? "X").toUpperCase();
  const p4 = (passport ?? "").replace(/\s/g, "").slice(-4).toUpperCase();
  return `INV-${l1}${l2}-${p4 || "0000"}`;
}
function genReceiptNo(name: string, passport: string): string {
  const words = name.trim().split(/\s+/);
  const l1 = (words[0]?.[0] ?? "X").toUpperCase();
  const l2 = (words[1]?.[0] ?? "X").toUpperCase();
  const p4 = (passport ?? "").replace(/\s/g, "").slice(-4).toUpperCase();
  return `REC-${l1}${l2}-${p4 || "0000"}`;
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}
function fmtHKD(n: number) { return `HKD$ ${n.toLocaleString("en-HK")}`; }

/* ─── types ─── */
interface LineItem { no: number; description: string; qty: number; amount: number; }
interface PayScheduleRow { no: number; label: string; amount: number; }

/* ─── degree tab data ─── */
const DEGREE_TABS = [
  { id: "masters",   label: "Master's Degree",  stage2Key: "mastersStage2"   as keyof PricingConfig, stage3Key: "mastersLastPayment"   as keyof PricingConfig },
  { id: "bachelor",  label: "Bachelor's Degree", stage2Key: "bachelorStage2"  as keyof PricingConfig, stage3Key: "bachelorLastPayment"  as keyof PricingConfig },
  { id: "associate", label: "Associate Degree",  stage2Key: "associateStage2" as keyof PricingConfig, stage3Key: "associateLastPayment" as keyof PricingConfig },
];

function makeItemsFromPricing(p: PricingConfig, degreeId: string): LineItem[] {
  const tier = DEGREE_TABS.find(d => d.id === degreeId);
  const p2 = tier ? (p[tier.stage2Key] as number ?? 0) : 0;
  const p3 = tier ? (p[tier.stage3Key] as number ?? 0) : 0;
  return [
    { no: 1, description: "(1st Deposit)   Delivering expert counseling to aid students in choosing courses and managing their application procedures", qty: 1, amount: FIRST_PAYMENT },
    { no: 2, description: "(2nd Payment)   Upon successfully securing a university offer", qty: 1, amount: p2 },
    { no: 3, description: "(3rd Payment)   Upon approval of student's visa", qty: 1, amount: p3 },
  ];
}
function makeScheduleFromPricing(p: PricingConfig, degreeId: string): PayScheduleRow[] {
  const tier = DEGREE_TABS.find(d => d.id === degreeId);
  const p2 = tier ? (p[tier.stage2Key] as number ?? 0) : 0;
  const p3 = tier ? (p[tier.stage3Key] as number ?? 0) : 0;
  return [
    { no: 1, label: "(1st Deposit)",  amount: FIRST_PAYMENT },
    { no: 2, label: "(2nd Payment)", amount: p2 },
    { no: 3, label: "(3rd Payment)",  amount: p3 },
  ];
}

const DEFAULT_REMARKS = [
  "The Deposit HKD$ 3,000 is Non-refundable.",
  "(2nd Payment) — Upon successfully securing an offer.",
  "(3rd Payment) — Upon approval of student's visa.",
  "This fee includes career guidance/counselling for students.",
  "Air fare & any travel expenses are NOT included.",
  "Refunds are subject to the University/College's official refund policy.",
  "Once the payment is made, please send back the receipt.",
];

const PAYMENT_METHODS = ["Bank Transfer", "FPS", "Cash", "Cheque", "WeChat Pay", "Alipay", "Other"];

/* ═══════════════════════════════════════════════════
   CLIENT SELECTOR (shared between Invoice + Receipt)
═══════════════════════════════════════════════════ */
type ClientRow = { id: number; name: string; email: string; passportNumber?: string | null; nationality?: string | null; };

function ClientSelector({ clients, isLoading, selectedId, onSelect }: {
  clients: ClientRow[];
  isLoading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const selected = clients.find(c => c.id === selectedId) ?? null;

  useEffect(() => { if (selected) setSearch(selected.name); }, [selected?.id]);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="relative mb-2">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Search by name or email…"
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-8 pr-3 py-2 border border-border rounded bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
      </div>
      {open && (
        <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto bg-card shadow-lg mb-2">
          {isLoading ? <p className="text-xs text-muted-foreground p-3">Loading…</p>
            : filtered.length === 0 ? <p className="text-xs text-muted-foreground p-3">No clients found.</p>
            : filtered.map(c => (
              <button key={c.id} onClick={() => { onSelect(c.id); setSearch(c.name); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors border-b border-border last:border-0 text-sm">
                <p className="font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.email} · {c.passportNumber || "No passport"}</p>
              </button>
            ))}
        </div>
      )}
      {selected && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs space-y-0.5">
          <p><span className="text-muted-foreground">Name:</span> <span className="font-semibold text-foreground">{selected.name}</span></p>
          <p><span className="text-muted-foreground">Email:</span> <span className="text-foreground">{selected.email}</span></p>
          <p><span className="text-muted-foreground">Passport:</span> <span className="font-mono text-foreground">{selected.passportNumber || "—"}</span></p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   STATUS TOAST
═══════════════════════════════════════════════════ */
function SendStatus({ status, onClear }: { status: "idle" | "sending" | "sent" | "error"; msg?: string; onClear: () => void }) {
  if (status === "idle" || status === "sending") return null;
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded text-sm font-medium ${status === "sent" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
      {status === "sent" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
      <span>{status === "sent" ? "Email sent successfully!" : "Failed to send — check email credentials in Settings."}</span>
      <button onClick={onClear} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   INVOICE PREVIEW
═══════════════════════════════════════════════════ */
function InvoicePreview({ invoiceNo, date, clientName, clientAddress, degreeLabel, items, schedule, remarks, highlightedPayment, phone, contactEmail }: {
  invoiceNo: string; date: string; clientName: string; clientAddress: string;
  degreeLabel: string; items: LineItem[]; schedule: PayScheduleRow[]; remarks: string[];
  highlightedPayment?: 1 | 2 | 3 | null;
  phone: string; contactEmail: string;
}) {
  const total = items.reduce((s, i) => s + i.amount * i.qty, 0);
  return (
    <div id="invoice-printable" style={{ background: "#fff", color: "#111", fontFamily: "'Times New Roman', Times, serif", fontSize: "11pt", padding: "40px 48px", minHeight: "297mm", width: "100%", boxSizing: "border-box" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <p style={{ fontFamily: "Arial, sans-serif", fontSize: "24pt", fontWeight: 900, color: "#0b2213", letterSpacing: "0.04em", margin: 0 }}>INVOICE</p>
          {degreeLabel && <p style={{ margin: "4px 0 0", fontSize: "9pt", color: "#666", fontFamily: "Arial, sans-serif" }}>{degreeLabel}</p>}
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "0 20px" }}>
          <img src={`${BASE}/harrowgate-logo.png`} alt="HARROWGATE" style={{ height: 130, objectFit: "contain" }} />
        </div>
        <div style={{ textAlign: "right", fontSize: "9.5pt", color: "#333", lineHeight: 1.9 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>HARROWGATE Consultancy</p>
          <p style={{ margin: 0 }}>P: {phone}</p>
          <p style={{ margin: 0 }}>{contactEmail}</p>
        </div>
      </div>

      <div style={{ borderTop: "2.5px solid #0b2213", marginBottom: 18 }} />

      {/* Meta */}
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

      {/* Items table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt" }}>
        <thead>
          <tr style={{ background: "#0b2213", color: "#f0d28c" }}>
            <th style={{ border: "1px solid #555", padding: "7px 10px", textAlign: "center", width: 40 }}>NO</th>
            <th style={{ border: "1px solid #555", padding: "7px 10px", textAlign: "left" }}>Description</th>
            <th style={{ border: "1px solid #555", padding: "7px 10px", textAlign: "center", width: 50 }}>QTY</th>
            <th style={{ border: "1px solid #555", padding: "7px 10px", textAlign: "right", width: 140 }}>AMOUNT HKD$</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const due = highlightedPayment === item.no;
            return (
              <tr key={item.no} style={{ verticalAlign: "top", background: due ? "#fff0f0" : undefined }}>
                <td style={{ border: due ? "1px solid #dc2626" : "1px solid #aaa", padding: "8px 10px", textAlign: "center", fontWeight: due ? 800 : undefined, color: due ? "#dc2626" : undefined }}>{item.no}</td>
                <td style={{ border: due ? "1px solid #dc2626" : "1px solid #aaa", padding: "8px 10px", lineHeight: 1.55 }}>
                  {item.description}
                  {due && <span style={{ display: "inline-block", marginLeft: 10, background: "#dc2626", color: "#fff", fontSize: "8pt", fontWeight: 800, padding: "1px 7px", borderRadius: 3, letterSpacing: "0.05em", verticalAlign: "middle" }}>AMOUNT DUE</span>}
                </td>
                <td style={{ border: due ? "1px solid #dc2626" : "1px solid #aaa", padding: "8px 10px", textAlign: "center" }}>{item.qty}</td>
                <td style={{ border: due ? "1px solid #dc2626" : "1px solid #aaa", padding: "8px 10px", textAlign: "right", fontWeight: due ? 900 : 600, color: due ? "#dc2626" : undefined, fontSize: due ? "12pt" : undefined }}>{item.amount.toLocaleString("en-HK")}</td>
              </tr>
            );
          })}
          <tr style={{ background: "#f5f5f5" }}>
            <td colSpan={3} style={{ border: "1px solid #aaa", padding: "8px 10px", textAlign: "right", fontWeight: 800, fontSize: "11pt" }}>TOTAL</td>
            <td style={{ border: "1px solid #aaa", padding: "8px 10px", textAlign: "right", fontWeight: 900, fontSize: "11pt" }}>{total.toLocaleString("en-HK")}</td>
          </tr>
        </tbody>
      </table>

      {/* Payment Schedule */}
      <div style={{ marginTop: 22, marginBottom: 18 }}>
        <p style={{ fontWeight: 800, fontSize: "11pt", marginBottom: 8, borderBottom: "1.5px solid #0b2213", paddingBottom: 4 }}>Payment Schedule:</p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt" }}>
          <tbody>
            {schedule.map(row => {
              const due = highlightedPayment === row.no;
              return (
                <tr key={row.no} style={{ background: due ? "#fff0f0" : undefined }}>
                  <td style={{ padding: "4px 8px", width: 32, textAlign: "center", color: due ? "#dc2626" : "#555", fontWeight: due ? 800 : undefined }}>{row.no}.</td>
                  <td style={{ padding: "4px 8px", color: due ? "#dc2626" : undefined, fontWeight: due ? 800 : undefined }}>
                    {row.label}
                    {due && <span style={{ marginLeft: 8, fontSize: "8pt", color: "#dc2626", fontWeight: 800 }}>← DUE NOW</span>}
                  </td>
                  <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: due ? 900 : 600, width: 140, color: due ? "#dc2626" : undefined, fontSize: due ? "11pt" : undefined }}>HKD$ {row.amount.toLocaleString("en-HK")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Remarks */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontWeight: 800, fontSize: "11pt", marginBottom: 8, borderBottom: "1.5px solid #0b2213", paddingBottom: 4 }}>Remarks:</p>
        {remarks.filter(r => r.trim()).map((r, i) => (
          <p key={i} style={{ margin: "4px 0", fontSize: "9.5pt", lineHeight: 1.6, color: "#222" }}>
            <strong>{i + 1})</strong> {r}
          </p>
        ))}
      </div>

      {/* Signatures */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 36, paddingTop: 12, borderTop: "1px solid #ccc" }}>
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
   RECEIPT PREVIEW
═══════════════════════════════════════════════════ */
function ReceiptPreview({ receiptNo, date, clientName, degreeLabel, amountPaid, paymentMethod, reference, notes }: {
  receiptNo: string; date: string; clientName: string; degreeLabel: string;
  amountPaid: number; paymentMethod: string; reference: string; notes: string;
}) {
  return (
    <div id="receipt-printable" style={{ background: "#fff", color: "#111", fontFamily: "'Times New Roman', Times, serif", fontSize: "11pt", padding: "40px 48px", minHeight: "180mm", width: "100%", boxSizing: "border-box" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <img src={`${BASE}/harrowgate-logo.png`} alt="HARROWGATE" style={{ height: 130, objectFit: "contain", display: "block", margin: "0 auto 12px" }} />
        <p style={{ fontFamily: "Arial, sans-serif", fontSize: "22pt", fontWeight: 900, color: "#0b2213", letterSpacing: "0.05em", margin: 0 }}>OFFICIAL RECEIPT</p>
        <div style={{ borderTop: "2.5px solid #0b2213", marginTop: 14 }} />
      </div>

      {/* Meta */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, fontSize: "10pt", lineHeight: 2 }}>
        <div>
          <p style={{ margin: 0 }}><strong>Received from:</strong> {clientName || "—"}</p>
          {degreeLabel && <p style={{ margin: 0 }}><strong>Programme:</strong> {degreeLabel}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0 }}><strong>Receipt No:</strong> {receiptNo}</p>
          <p style={{ margin: 0 }}><strong>Date:</strong> {date}</p>
        </div>
      </div>

      {/* Payment table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5pt", marginBottom: 24 }}>
        <tbody>
          <tr style={{ background: "#f5f5f5" }}>
            <td style={{ border: "1px solid #aaa", padding: "12px 16px", fontWeight: 700, width: "38%" }}>Amount Paid</td>
            <td style={{ border: "1px solid #aaa", padding: "12px 16px", fontWeight: 900, fontSize: "15pt", color: "#0b2213" }}>{fmtHKD(amountPaid)}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #aaa", padding: "10px 16px", fontWeight: 700 }}>Payment Method</td>
            <td style={{ border: "1px solid #aaa", padding: "10px 16px" }}>{paymentMethod || "—"}</td>
          </tr>
          {reference && (
            <tr style={{ background: "#f9f9f9" }}>
              <td style={{ border: "1px solid #aaa", padding: "10px 16px", fontWeight: 700 }}>Reference / TXN ID</td>
              <td style={{ border: "1px solid #aaa", padding: "10px 16px", fontFamily: "monospace" }}>{reference}</td>
            </tr>
          )}
          {notes && (
            <tr>
              <td style={{ border: "1px solid #aaa", padding: "10px 16px", fontWeight: 700 }}>Notes</td>
              <td style={{ border: "1px solid #aaa", padding: "10px 16px" }}>{notes}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ background: "#f0fff4", border: "1.5px solid #a7f3d0", borderRadius: 8, padding: "12px 18px", fontSize: "9.5pt", color: "#065f46", marginBottom: 32 }}>
        ✅ This receipt confirms that payment of <strong>{fmtHKD(amountPaid)}</strong> has been received by HARROWGATE Consultancy. Please retain for your records.
      </div>

      {/* Signature */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, paddingTop: 12, borderTop: "1px solid #ccc" }}>
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
   INVOICE TAB
═══════════════════════════════════════════════════ */
function InvoiceTab({ clients, isLoading }: { clients: ClientRow[]; isLoading: boolean }) {
  const { raw: pricing } = usePricing();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedDegree, setSelectedDegree] = useState("masters");
  const [clientAddress, setClientAddress] = useState("N/A");
  const [items, setItems] = useState<LineItem[]>(() => makeItemsFromPricing(DEFAULT_PRICING, "masters"));
  const [schedule, setSchedule] = useState<PayScheduleRow[]>(() => makeScheduleFromPricing(DEFAULT_PRICING, "masters"));
  const [remarks, setRemarks] = useState<string[]>([...DEFAULT_REMARKS]);
  const [highlightedPayment, setHighlightedPayment] = useState<1 | 2 | 3 | null>(null);
  const [phone, setPhone] = useState("+852 6159 0422");
  const [contactEmail, setContactEmail] = useState("harrowgateconsultancy@gmail.com");
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const today = fmtDate(new Date());
  const selected = clients.find(c => c.id === selectedId) ?? null;
  const invoiceNo = selected ? genInvoiceNo(selected.name, selected.passportNumber ?? "") : "INV-——";
  const degreeLabel = DEGREE_TABS.find(d => d.id === selectedDegree)?.label ?? "";
  const total = items.reduce((s, i) => s + i.amount * i.qty, 0);

  function applyDegree(id: string) {
    setSelectedDegree(id);
    setItems(makeItemsFromPricing(pricing ?? DEFAULT_PRICING, id));
    setSchedule(makeScheduleFromPricing(pricing ?? DEFAULT_PRICING, id));
  }

  function updateItem(idx: number, field: keyof LineItem, val: string | number) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: field === "amount" || field === "qty" ? Number(val) || 0 : val } : it));
  }
  function updateSchedule(idx: number, field: keyof PayScheduleRow, val: string | number) {
    setSchedule(prev => prev.map((r, i) => i === idx ? { ...r, [field]: field === "amount" ? Number(val) || 0 : val } : r));
  }
  function syncSchedule() {
    setSchedule(prev => prev.map((r, i) => ({ ...r, amount: items[i]?.amount ?? r.amount })));
  }
  function updateRemark(idx: number, val: string) {
    setRemarks(prev => prev.map((r, i) => i === idx ? val : r));
  }
  function addRemark() { setRemarks(prev => [...prev, ""]); }
  function removeRemark(idx: number) { setRemarks(prev => prev.filter((_, i) => i !== idx)); }

  async function handleSend() {
    if (!selected?.email) { alert("This client has no email address."); return; }
    setSendStatus("sending");
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/invoice/send-invoice`, {
        method: "POST",
        body: JSON.stringify({ studentEmail: selected.email, studentName: selected.name, invoiceNo, date: today, degreeType: degreeLabel, items, schedule, remarks: remarks.filter(r => r.trim()), total, highlightedPayment, phone, contactEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSendStatus("sent");
    } catch { setSendStatus("error"); }
  }

  function handleReset() {
    setSelectedId(null);
    setSelectedDegree("masters");
    setClientAddress("N/A");
    setItems(makeItemsFromPricing(DEFAULT_PRICING, "masters"));
    setSchedule(makeScheduleFromPricing(DEFAULT_PRICING, "masters"));
    setRemarks([...DEFAULT_REMARKS]);
    setHighlightedPayment(null);
    setPhone("+852 6159 0422");
    setContactEmail("harrowgateconsultancy@gmail.com");
    setSendStatus("idle");
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-6">
      {/* Hidden print target — off-screen so flex/grid layouts stay intact */}
      <div id="invoice-print-root" style={{ position: "fixed", left: "-9999px", top: 0, width: "210mm", visibility: "hidden" }}>
        <InvoicePreview invoiceNo={invoiceNo} date={today} clientName={selected?.name ?? ""} clientAddress={clientAddress} degreeLabel={degreeLabel} items={items} schedule={schedule} remarks={remarks.filter(r => r.trim())} highlightedPayment={highlightedPayment} phone={phone} contactEmail={contactEmail} />
      </div>
      <style>{`@media print { body * { visibility: hidden; } #invoice-print-root { visibility: visible !important; position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; } #invoice-print-root * { visibility: visible !important; } }`}</style>

      {/* ── Left config ── */}
      <div className="space-y-4">

        {/* Action bar */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2 border border-border rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <RotateCcw size={12} /> Reset
          </button>
          <button onClick={() => window.print()} disabled={!selected}
            className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-secondary-foreground rounded text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40">
            <Printer size={13} /> Print / PDF
          </button>
          <button onClick={handleSend} disabled={!selected || sendStatus === "sending"}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40">
            <Send size={13} /> {sendStatus === "sending" ? "Sending…" : "Send to Client"}
          </button>
        </div>

        <SendStatus status={sendStatus} onClear={() => setSendStatus("idle")} />

        {/* 1. Client */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold">1</span>
            Select Client
          </h2>
          <ClientSelector clients={clients} isLoading={isLoading} selectedId={selectedId} onSelect={id => { setSelectedId(id); }} />
          {selected && (
            <div className="flex items-center gap-2 mt-2">
              <label className="text-xs text-muted-foreground shrink-0">Address:</label>
              <input value={clientAddress} onChange={e => setClientAddress(e.target.value)}
                className="flex-1 px-2 py-1 border border-border rounded bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-border space-y-1.5">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Company contact on invoice</p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground shrink-0 w-12">Phone:</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                className="flex-1 px-2 py-1 border border-border rounded bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground shrink-0 w-12">Email:</label>
              <input value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                className="flex-1 px-2 py-1 border border-border rounded bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
        </div>

        {/* 2. Degree */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold">2</span>
            Degree Type
          </h2>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {DEGREE_TABS.map((deg, i) => (
              <button key={deg.id} onClick={() => applyDegree(deg.id)}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${selectedDegree === deg.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"} ${i > 0 ? "border-l border-border" : ""}`}>
                {deg.label}
              </button>
            ))}
          </div>
          {pricing && (
            <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] text-center text-muted-foreground">
              {DEGREE_TABS.map(deg => {
                const p2 = pricing[deg.stage2Key] as number ?? 0;
                const p3 = pricing[deg.stage3Key] as number ?? 0;
                return (
                  <div key={deg.id} className={`p-1.5 rounded border ${selectedDegree === deg.id ? "border-primary/40 bg-primary/5 text-primary" : "border-border"}`}>
                    <p className="font-semibold">{fmtHKD(FIRST_PAYMENT + p2 + p3)}</p>
                    <p className="opacity-60">total</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Payment due stage */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold">3</span>
            Payment Stage
            <span className="text-[10px] text-muted-foreground font-normal ml-1">— highlights the row student must pay now</span>
          </h2>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {([null, 1, 2, 3] as const).map((stage, i) => {
              const labels: Record<string, string> = { null: "None", "1": "1st Deposit", "2": "2nd Payment", "3": "3rd Payment" };
              const active = highlightedPayment === stage;
              return (
                <button key={String(stage)} onClick={() => setHighlightedPayment(stage)}
                  className={`flex-1 py-2 text-xs font-semibold transition-colors ${active ? "bg-red-600 text-white" : "text-muted-foreground hover:bg-accent"} ${i > 0 ? "border-l border-border" : ""}`}>
                  {labels[String(stage)]}
                </button>
              );
            })}
          </div>
          {highlightedPayment && (
            <p className="mt-2 text-[10px] text-red-600 font-medium">
              ● Payment {highlightedPayment} row will be highlighted red &amp; bold in the invoice
            </p>
          )}
        </div>

        {/* 4. Line items */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold">4</span>
              Line Items
            </h2>
            <button onClick={syncSchedule} className="text-[10px] text-primary hover:underline">Sync schedule ↓</button>
          </div>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={item.no} className="border border-border rounded p-2 bg-background space-y-1.5">
                <div className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">{item.no}</span>
                  <textarea value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} rows={2}
                    className="flex-1 px-2 py-1 border border-border rounded bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
                </div>
                <div className="flex gap-2 items-center pl-5">
                  <label className="text-[10px] text-muted-foreground">QTY</label>
                  <input type="number" min={1} value={item.qty} onChange={e => updateItem(idx, "qty", e.target.value)}
                    className="w-12 px-1.5 py-1 border border-border rounded bg-card text-foreground text-xs focus:outline-none" />
                  <label className="text-[10px] text-muted-foreground">HKD$</label>
                  <input type="number" min={0} value={item.amount} onChange={e => updateItem(idx, "amount", e.target.value)}
                    className="flex-1 px-1.5 py-1 border border-border rounded bg-card text-foreground text-xs focus:outline-none" />
                </div>
              </div>
            ))}
            <div className="flex justify-end text-xs font-bold text-foreground pt-1">Total: {fmtHKD(total)}</div>
          </div>
        </div>

        {/* 5. Payment schedule */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold">5</span>
            Payment Schedule
          </h2>
          <div className="space-y-1.5">
            {schedule.map((row, idx) => (
              <div key={row.no} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-3 shrink-0">{row.no}.</span>
                <input value={row.label} onChange={e => updateSchedule(idx, "label", e.target.value)}
                  className="flex-1 px-2 py-1 border border-border rounded bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                <input type="number" value={row.amount} onChange={e => updateSchedule(idx, "amount", e.target.value)}
                  className="w-28 px-2 py-1 border border-border rounded bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            ))}
          </div>
        </div>

        {/* 5. Remarks */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold">6</span>
              Remarks
            </h2>
            <button onClick={addRemark} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
              <Plus size={11} /> Add
            </button>
          </div>
          <div className="space-y-2">
            {remarks.map((r, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <span className="text-[10px] text-muted-foreground w-4 shrink-0 mt-1.5">{idx + 1})</span>
                <textarea value={r} onChange={e => updateRemark(idx, e.target.value)} rows={2}
                  className="flex-1 px-2 py-1 border border-border rounded bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
                <button onClick={() => removeRemark(idx)} className="text-muted-foreground hover:text-destructive mt-1">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right preview ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-foreground">Invoice Preview</p>
          <p className="text-xs text-muted-foreground">{selected ? `${invoiceNo} · ${selected.name}` : "Select a client"}</p>
        </div>
        <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-white" style={{ minHeight: 600 }}>
          <InvoicePreview invoiceNo={invoiceNo} date={today} clientName={selected?.name ?? ""} clientAddress={clientAddress} degreeLabel={degreeLabel} items={items} schedule={schedule} remarks={remarks.filter(r => r.trim())} highlightedPayment={highlightedPayment} phone={phone} contactEmail={contactEmail} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   RECEIPT TAB
═══════════════════════════════════════════════════ */
function ReceiptTab({ clients, isLoading }: { clients: ClientRow[]; isLoading: boolean }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedDegree, setSelectedDegree] = useState("masters");
  const [amountPaid, setAmountPaid] = useState(FIRST_PAYMENT);
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split("T")[0]);
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const selected = clients.find(c => c.id === selectedId) ?? null;
  const receiptNo = selected ? genReceiptNo(selected.name, selected.passportNumber ?? "") : "REC-——";
  const degreeLabel = DEGREE_TABS.find(d => d.id === selectedDegree)?.label ?? "";
  const displayDate = receiptDate ? new Date(receiptDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : fmtDate(new Date());

  async function handleSend() {
    if (!selected?.email) { alert("This client has no email address."); return; }
    setSendStatus("sending");
    try {
      const res = await adminFetch(`${getApiBase()}/api/admin/invoice/send-receipt`, {
        method: "POST",
        body: JSON.stringify({ studentEmail: selected.email, studentName: selected.name, receiptNo, date: displayDate, amountPaid, paymentMethod, reference, notes, degreeType: degreeLabel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSendStatus("sent");
    } catch { setSendStatus("error"); }
  }

  function handleReset() {
    setSelectedId(null);
    setSelectedDegree("masters");
    setAmountPaid(FIRST_PAYMENT);
    setPaymentMethod("Bank Transfer");
    setReference("");
    setNotes("");
    setReceiptDate(new Date().toISOString().split("T")[0]);
    setSendStatus("idle");
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-6">
      <div id="receipt-print-root" style={{ position: "fixed", left: "-9999px", top: 0, width: "210mm", visibility: "hidden" }}>
        <ReceiptPreview receiptNo={receiptNo} date={displayDate} clientName={selected?.name ?? ""} degreeLabel={degreeLabel} amountPaid={amountPaid} paymentMethod={paymentMethod} reference={reference} notes={notes} />
      </div>
      <style>{`@media print { body * { visibility: hidden; } #receipt-print-root { visibility: visible !important; position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; } #receipt-print-root * { visibility: visible !important; } }`}</style>

      {/* ── Left config ── */}
      <div className="space-y-4">

        {/* Action bar */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2 border border-border rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <RotateCcw size={12} /> Reset
          </button>
          <button onClick={() => window.print()} disabled={!selected}
            className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-secondary-foreground rounded text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40">
            <Printer size={13} /> Print / PDF
          </button>
          <button onClick={handleSend} disabled={!selected || sendStatus === "sending"}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40">
            <Send size={13} /> {sendStatus === "sending" ? "Sending…" : "Send to Client"}
          </button>
        </div>

        <SendStatus status={sendStatus} onClear={() => setSendStatus("idle")} />

        {/* 1. Client */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold">1</span>
            Select Client
          </h2>
          <ClientSelector clients={clients} isLoading={isLoading} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        {/* 2. Degree */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold">2</span>
            Degree Type
          </h2>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {DEGREE_TABS.map((deg, i) => (
              <button key={deg.id} onClick={() => setSelectedDegree(deg.id)}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${selectedDegree === deg.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"} ${i > 0 ? "border-l border-border" : ""}`}>
                {deg.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Payment details */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold">3</span>
            Payment Details
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Amount Paid (HKD)</label>
              <input type="number" min={0} value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Payment Method</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Payment Date</label>
              <input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Reference / TXN ID (optional)</label>
              <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. TXN-20260615-001"
                className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="e.g. Payment for 1st deposit…"
                className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Right preview ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-foreground">Receipt Preview</p>
          <p className="text-xs text-muted-foreground">{selected ? `${receiptNo} · ${selected.name}` : "Select a client"}</p>
        </div>
        <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-white">
          <ReceiptPreview receiptNo={receiptNo} date={displayDate} clientName={selected?.name ?? ""} degreeLabel={degreeLabel} amountPaid={amountPaid} paymentMethod={paymentMethod} reference={reference} notes={notes} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════ */
export default function InvoicePage() {
  const { data: clients = [], isLoading } = useListClients();
  const [activeTab, setActiveTab] = useState<"invoice" | "receipt">("invoice");

  return (
    <div className="p-6 lg:p-8 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <FileText size={22} className="text-primary" /> Invoice &amp; Receipts
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Generate, customise, and send invoices and payment receipts to clients</p>
      </div>

      {/* Top tabs */}
      <div className="flex gap-1 mb-6 bg-muted/40 rounded-lg p-1 w-fit border border-border">
        <button onClick={() => setActiveTab("invoice")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold transition-all ${activeTab === "invoice" ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}>
          <FileText size={15} /> Invoice
        </button>
        <button onClick={() => setActiveTab("receipt")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold transition-all ${activeTab === "receipt" ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}>
          <Receipt size={15} /> Receipt
        </button>
      </div>

      {activeTab === "invoice"
        ? <InvoiceTab clients={clients} isLoading={isLoading} />
        : <ReceiptTab clients={clients} isLoading={isLoading} />
      }
    </div>
  );
}
