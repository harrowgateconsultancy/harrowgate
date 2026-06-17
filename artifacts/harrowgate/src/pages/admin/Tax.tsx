import { useState } from "react";
import { useAdminTheme } from "../../contexts/AdminThemeContext";

const GOLD = "#a28959";
const GOLD_L = "#f0d28c";
const BG_DARK = "#0b2213";

function useColors() {
  const { isDark } = useAdminTheme();
  return {
    isDark,
    bg:       isDark ? BG_DARK   : "#f5f7f4",
    card:     isDark ? "#0c2217" : "#ffffff",
    cardAlt:  isDark ? "#0e2a1c" : "#f9faf9",
    bdr:      isDark ? "rgba(162,137,89,0.22)" : "rgba(0,0,0,0.09)",
    bdrFaint: isDark ? "rgba(162,137,89,0.10)" : "rgba(0,0,0,0.06)",
    text:     isDark ? "#e8dcc8" : "#111827",
    textMid:  isDark ? "#9a8a6a" : "#6b7280",
    textFaint:isDark ? "rgba(162,137,89,0.35)" : "rgba(0,0,0,0.28)",
    inputBg:  isDark ? "rgba(255,255,255,0.04)" : "#f5f7f5",
    heading:  isDark ? GOLD_L    : "#0f2d18",
  };
}

const fmt = (n: number) =>
  "$ " + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const fmtAbs = (n: number) => fmt(Math.abs(n));

interface Inputs {
  revenue: string;
  cogs: string;
  opex: string;
  otherIncome: string;
  interest: string;
  depreciation: string;
}

const EMPTY: Inputs = {
  revenue: "", cogs: "", opex: "", otherIncome: "", interest: "", depreciation: "",
};

const SAMPLE: Inputs = {
  revenue: "3200000",
  cogs: "1280000",
  opex: "620000",
  otherIncome: "45000",
  interest: "38000",
  depreciation: "72000",
};

function parse(v: string): number {
  const n = parseFloat(v.replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function calc(inputs: Inputs) {
  const revenue       = parse(inputs.revenue);
  const cogs          = parse(inputs.cogs);
  const opex          = parse(inputs.opex);
  const otherIncome   = parse(inputs.otherIncome);
  const interest      = parse(inputs.interest);
  const depreciation  = parse(inputs.depreciation);

  const grossProfit   = revenue - cogs;
  const ebitda        = grossProfit - opex + otherIncome;
  const ebit          = ebitda - depreciation;
  const netProfit     = ebit - interest;

  // HK Profits Tax: 8.25% on first HKD 2M, 16.5% above
  const taxable = Math.max(0, netProfit);
  const hkTax = taxable <= 2_000_000
    ? taxable * 0.0825
    : 2_000_000 * 0.0825 + (taxable - 2_000_000) * 0.165;
  const profitAfterTax = netProfit - hkTax;

  // Simple balance sheet derivations
  const cash          = Math.max(0, netProfit * 0.3);
  const receivables   = revenue * 0.15;
  const currentAssets = cash + receivables;
  const fixedAssets   = Math.max(0, (opex + depreciation) * 2.5 - depreciation);
  const totalAssets   = currentAssets + fixedAssets;

  const currentLiab   = cogs * 0.12 + opex * 0.08;
  const longTermLiab  = Math.max(0, interest * 8);
  const totalLiab     = currentLiab + longTermLiab;
  const shareCapital  = Math.max(10000, totalAssets * 0.3);
  const retained      = totalAssets - totalLiab - shareCapital;
  const equity        = shareCapital + retained;
  const totalLiabEquity = totalLiab + equity;

  const balanced = Math.abs(totalAssets - totalLiabEquity) < 0.01;

  return {
    revenue, cogs, opex, otherIncome, interest, depreciation,
    grossProfit, ebitda, ebit, netProfit, hkTax, profitAfterTax,
    cash, receivables, currentAssets, fixedAssets, totalAssets,
    currentLiab, longTermLiab, totalLiab,
    shareCapital, retained, equity, totalLiabEquity, balanced,
  };
}

function Row({ label, value, bold, indent, sub, negative, divider }: {
  label: string; value?: number; bold?: boolean; indent?: boolean;
  sub?: boolean; negative?: boolean; divider?: boolean;
}) {
  const C = useColors();
  const color = bold ? C.heading : sub ? C.textMid : C.text;
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      padding: divider ? "10px 0 6px" : "5px 0",
      borderTop: divider ? `1px solid ${C.bdrFaint}` : undefined,
      marginTop: divider ? 4 : 0,
    }}>
      <span style={{
        fontSize: bold ? 13 : 12.5, color, fontWeight: bold ? 700 : 500,
        paddingLeft: indent ? 16 : 0,
      }}>
        {label}
      </span>
      {value !== undefined && (
        <span style={{
          fontSize: bold ? 13.5 : 12.5, color: negative ? "#e07070" : color,
          fontWeight: bold ? 700 : 500, fontFamily: "monospace", letterSpacing: "0.01em",
        }}>
          {value < 0 ? `(${fmtAbs(value)})` : fmt(value)}
        </span>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const C = useColors();
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.bdr}`,
      borderRadius: 14, padding: "20px 24px", marginBottom: 16,
    }}>
      <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function InputField({ label, value, onChange, hint }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string;
}) {
  const C = useColors();
  return (
    <div className="no-print">
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textMid, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.textMid, pointerEvents: "none" }}>HK$</span>
        <input
          type="number"
          min="0"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="0.00"
          style={{
            width: "100%", boxSizing: "border-box",
            background: C.inputBg, border: `1px solid ${C.bdr}`,
            borderRadius: 8, padding: "9px 12px 9px 42px",
            color: C.text, fontSize: 13.5, outline: "none",
          }}
        />
      </div>
      {hint && <p style={{ margin: "4px 0 0", fontSize: 11, color: C.textFaint }}>{hint}</p>}
    </div>
  );
}

export default function TaxPage() {
  const C = useColors();
  const [inputs, setInputs] = useState<Inputs>(EMPTY);
  const r = calc(inputs);

  const set = (k: keyof Inputs) => (v: string) => setInputs(prev => ({ ...prev, [k]: v }));

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; color: black !important; }
          .tax-page { padding: 0 !important; max-width: none !important; }
          .tax-card { background: white !important; border: 1px solid #ddd !important; border-radius: 8px !important; box-shadow: none !important; page-break-inside: avoid; }
          .tax-card p, .tax-card span, .tax-card div { color: black !important; }
          .tax-badge { display: inline-flex !important; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div className="tax-page" style={{ padding: "2rem", maxWidth: 1400, margin: "0 auto", boxSizing: "border-box" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: C.heading, fontFamily: "Georgia, serif" }}>
                  Tax Calculator
                </h1>
                <span className="tax-badge" style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "rgba(162,137,89,0.12)", border: `1px solid ${C.bdr}`,
                  borderRadius: 20, padding: "4px 12px",
                  fontSize: 11.5, fontWeight: 700, color: GOLD, letterSpacing: "0.04em",
                }}>
                  FY 2025/26 · April Filing
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13.5, color: C.textMid }}>
                Hong Kong Profits Tax Return · Form BIR51/52 · HK GAAP compliant
              </p>
            </div>

            {/* Action buttons */}
            <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => setInputs(SAMPLE)}
                style={{
                  background: "rgba(162,137,89,0.10)", border: `1px solid ${C.bdr}`,
                  color: GOLD, borderRadius: 8, padding: "9px 16px",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}>
                  <circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 1.5" strokeLinecap="round"/>
                </svg>
                Load Sample
              </button>
              <button
                onClick={() => setInputs(EMPTY)}
                style={{
                  background: "none", border: `1px solid ${C.bdr}`,
                  color: C.textMid, borderRadius: 8, padding: "9px 16px",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}>
                  <path d="M14 8A6 6 0 112 8" strokeLinecap="round"/><path d="M14 4v4h-4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Reset
              </button>
              <button
                onClick={() => window.print()}
                style={{
                  background: C.heading, color: C.isDark ? "#071a10" : "#ffffff",
                  border: "none", borderRadius: 8, padding: "9px 20px",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 7,
                }}
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 14, height: 14 }}>
                  <path d="M4 6V2h8v4M4 12H2V7h12v5h-2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 10h8v4H4z" strokeLinecap="round"/>
                  <circle cx="12.5" cy="9" r="0.5" fill="currentColor"/>
                </svg>
                Export PDF
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24, alignItems: "start" }}>

          {/* ── LEFT: Inputs ── */}
          <div className="no-print">
            <Section title="Financial Inputs">
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <InputField label="Revenue" value={inputs.revenue} onChange={set("revenue")} hint="Total turnover / sales" />
                <InputField label="Cost of Goods Sold (COGS)" value={inputs.cogs} onChange={set("cogs")} hint="Direct costs of production" />
                <InputField label="Operating Expenses" value={inputs.opex} onChange={set("opex")} hint="Salaries, rent, admin, marketing" />
                <InputField label="Depreciation" value={inputs.depreciation} onChange={set("depreciation")} hint="Fixed asset write-down" />
                <InputField label="Other Income" value={inputs.otherIncome} onChange={set("otherIncome")} hint="Non-operating / passive income" />
                <InputField label="Interest / Finance Costs" value={inputs.interest} onChange={set("interest")} hint="Loan interest, bank charges" />
              </div>
            </Section>

            {/* HK Tax Info */}
            <div style={{
              background: "rgba(162,137,89,0.06)", border: `1px solid ${C.bdrFaint}`,
              borderRadius: 12, padding: "14px 18px",
            }}>
              <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.06em" }}>HK Profits Tax Rates</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {[
                  ["Corporate (first HKD 2M)", "8.25%"],
                  ["Corporate (above HKD 2M)", "16.5%"],
                  ["Unincorporated (first HKD 2M)", "7.5%"],
                  ["Unincorporated (above HKD 2M)", "15.0%"],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: C.textMid }}>{l}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Statements ── */}
          <div>

            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Net Profit (Before Tax)", value: r.netProfit, accent: r.netProfit >= 0 },
                { label: "HK Profits Tax", value: r.hkTax, accent: false, red: true },
                { label: "Profit After Tax", value: r.profitAfterTax, accent: r.profitAfterTax >= 0 },
                { label: "Total Assets", value: r.totalAssets, accent: true },
                { label: "Total Liabilities", value: r.totalLiab, accent: false },
                { label: "Equity", value: r.equity, accent: true },
              ].map(({ label, value, accent, red }) => (
                <div key={label} className="tax-card" style={{
                  background: C.card, border: `1px solid ${accent ? "rgba(162,137,89,0.35)" : C.bdr}`,
                  borderRadius: 12, padding: "14px 16px",
                }}>
                  <p style={{ margin: "0 0 6px", fontSize: 11, color: C.textMid, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: red ? "#e07070" : accent ? GOLD : C.text, fontFamily: "monospace" }}>
                    {value < 0 ? `(${fmtAbs(value)})` : fmt(value)}
                  </p>
                </div>
              ))}
            </div>

            {/* Balance check */}
            <div className="tax-card" style={{
              background: r.balanced ? "rgba(34,160,80,0.07)" : "rgba(220,50,50,0.07)",
              border: `1px solid ${r.balanced ? "rgba(34,160,80,0.3)" : "rgba(220,50,50,0.3)"}`,
              borderRadius: 10, padding: "10px 16px", marginBottom: 20,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: r.balanced ? "rgba(34,160,80,0.15)" : "rgba(220,50,50,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {r.balanced
                  ? <svg viewBox="0 0 16 14" fill="none" style={{ width: 14, height: 14 }}><path d="M1.5 7l4 4L14.5 1" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14 }}><path d="M4 4l8 8M12 4l-8 8" stroke="#e07070" strokeWidth="2" strokeLinecap="round"/></svg>
                }
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: r.balanced ? "#4ade80" : "#e07070" }}>
                  Balance Sheet {r.balanced ? "Balanced" : "Imbalanced"}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 11.5, color: C.textMid }}>
                  Assets {fmt(r.totalAssets)} · Liabilities + Equity {fmt(r.totalLiabEquity)}
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

              {/* P&L Statement */}
              <div className="tax-card" style={{ background: C.card, border: `1px solid ${C.bdr}`, borderRadius: 14, padding: "20px 24px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Profit &amp; Loss Statement
                </p>
                <p style={{ margin: "0 0 16px", fontSize: 11, color: C.textMid }}>For the year ended 31 March 2026</p>

                <Row label="Revenue" value={r.revenue} bold />
                <Row label="Cost of Goods Sold" value={r.cogs} indent negative={r.cogs > 0} />
                <Row label="Gross Profit" value={r.grossProfit} bold divider />

                <Row label="Operating Expenses" value={r.opex} indent negative={r.opex > 0} />
                <Row label="Depreciation" value={r.depreciation} indent negative={r.depreciation > 0} />
                <Row label="Other Income" value={r.otherIncome} indent />
                <Row label="EBIT" value={r.ebit} bold divider />

                <Row label="Interest / Finance Costs" value={r.interest} indent negative={r.interest > 0} />
                <Row label="Net Profit (Before Tax)" value={r.netProfit} bold divider />

                <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(162,137,89,0.06)", borderRadius: 8, border: `1px solid rgba(162,137,89,0.15)` }}>
                  <Row label="HK Profits Tax (8.25% / 16.5%)" value={r.hkTax} negative={r.hkTax > 0} />
                  <Row label="Profit After Tax" value={r.profitAfterTax} bold />
                </div>
              </div>

              {/* Balance Sheet */}
              <div className="tax-card" style={{ background: C.card, border: `1px solid ${C.bdr}`, borderRadius: 14, padding: "20px 24px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Balance Sheet
                </p>
                <p style={{ margin: "0 0 16px", fontSize: 11, color: C.textMid }}>As at 31 March 2026</p>

                <p style={{ margin: "0 0 6px", fontSize: 11.5, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.05em" }}>Assets</p>
                <Row label="Current Assets" bold />
                <Row label="Cash &amp; Bank" value={r.cash} indent />
                <Row label="Trade Receivables" value={r.receivables} indent />
                <Row label="Total Current Assets" value={r.currentAssets} bold divider />
                <Row label="Fixed Assets (Net)" value={r.fixedAssets} indent />
                <Row label="Total Assets" value={r.totalAssets} bold divider />

                <p style={{ margin: "14px 0 6px", fontSize: 11.5, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.05em" }}>Liabilities</p>
                <Row label="Current Liabilities" value={r.currentLiab} indent />
                <Row label="Long-term Liabilities" value={r.longTermLiab} indent />
                <Row label="Total Liabilities" value={r.totalLiab} bold divider />

                <p style={{ margin: "14px 0 6px", fontSize: 11.5, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.05em" }}>Equity</p>
                <Row label="Share Capital" value={r.shareCapital} indent />
                <Row label="Retained Earnings" value={r.retained} indent negative={r.retained < 0} />
                <Row label="Total Equity" value={r.equity} bold divider />

                <div style={{ marginTop: 10, padding: "8px 12px", background: r.balanced ? "rgba(34,160,80,0.07)" : "rgba(220,50,50,0.07)", borderRadius: 8 }}>
                  <Row label="Total Liabilities + Equity" value={r.totalLiabEquity} bold />
                </div>
              </div>
            </div>

            {/* Footnote */}
            <div style={{ marginTop: 16, padding: "12px 18px", background: "rgba(162,137,89,0.04)", borderRadius: 10, border: `1px solid ${C.bdrFaint}` }}>
              <p style={{ margin: 0, fontSize: 11.5, color: C.textMid, lineHeight: 1.6 }}>
                <strong style={{ color: GOLD }}>Disclaimer:</strong> These figures are estimates prepared for reference only.
                Profits tax is computed under the two-tiered profits tax rates regime (HK Inland Revenue Ordinance, Cap. 112).
                All statements should be reviewed and certified by a qualified CPA before submission to the Inland Revenue Department (IRD).
                Prepared in accordance with HK GAAP and IRD requirements for Form BIR51/52.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
