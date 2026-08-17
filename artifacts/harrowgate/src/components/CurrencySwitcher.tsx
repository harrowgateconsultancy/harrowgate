import { useCurrency, type Currency } from "../hooks/useCurrency";

const GOLD = "#a28959";
const GOLD_BRIGHT = "#f0d28c";

export default function CurrencySwitcher({ compact = false }: { compact?: boolean }) {
  const { currency, setCurrency } = useCurrency();

  return (
    <div
      className="inline-flex items-center rounded-full border p-0.5"
      aria-label="Currency"
      style={{ borderColor: "rgba(162,137,89,0.28)", background: "rgba(162,137,89,0.06)" }}
    >
      {(["HKD", "USD"] as Currency[]).map(option => (
        <button
          key={option}
          type="button"
          onClick={() => setCurrency(option)}
          aria-pressed={currency === option}
          className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-all ${compact ? "" : "sm:px-3"}`}
          style={{
            background: currency === option ? "rgba(196,169,110,0.20)" : "transparent",
            color: currency === option ? GOLD_BRIGHT : GOLD,
            boxShadow: currency === option ? "0 0 10px rgba(162,137,89,0.12)" : "none",
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}