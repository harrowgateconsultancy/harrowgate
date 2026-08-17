import { useQuery } from "@tanstack/react-query";
import { useCurrency } from "./useCurrency";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type PricingFeature = { text: string; bold?: boolean };

export type PricingConfig = {
  /** HKD amount for one USD. All stored package prices remain in HKD. */
  usdRate: number;
  mastersTotal: number;
  bachelorTotal: number;
  associateTotal: number;
  diplomaTotal: number;
  mastersStage2: number;
  bachelorStage2: number;
  associateStage2: number;
  diplomaStage2: number;
  mastersLastPayment: number;
  bachelorLastPayment: number;
  associateLastPayment: number;
  diplomaLastPayment: number;
  features?: PricingFeature[];
};

export const DEFAULT_FEATURES: PricingFeature[] = [
  { text: "1st semester tuition fee inclusive (paid by students)", bold: true },
  { text: "Application documents review" },
  { text: "University enrollment guidance" },
  { text: "Visa document checklist" },
  { text: "Full application & form filling guide" },
  { text: "Immigration letter assistance" },
  { text: "Visa form review & Guidance" },
  { text: "Pre-departure briefing session" },
  { text: "Phone plan setup guide" },
  { text: "Emergency contact protocols" },
  { text: "Priority WhatsApp support" },
  { text: "Service ends upon arrival at university", bold: true },
];

export const DEFAULT_PRICING: PricingConfig = {
  usdRate: 7.8,
  mastersTotal: 130000,
  bachelorTotal: 120000,
  associateTotal: 90000,
  diplomaTotal: 70000,
  mastersStage2: 45000,
  bachelorStage2: 40000,
  associateStage2: 30000,
  diplomaStage2: 25000,
  mastersLastPayment: 82000,
  bachelorLastPayment: 57000,
  associateLastPayment: 47000,
  diplomaLastPayment: 42000,
  features: DEFAULT_FEATURES,
};

export function formatMoney(n: number, currency: "HKD" | "USD", usdRate: number): string {
  const safeRate = Number.isFinite(usdRate) && usdRate > 0 ? usdRate : 7.8;
  const amount = currency === "USD" ? n / safeRate : n;
  return `${currency}$ ${amount.toLocaleString(currency === "USD" ? "en-US" : "en-HK", {
    minimumFractionDigits: currency === "USD" ? 2 : 0,
    maximumFractionDigits: currency === "USD" ? 2 : 0,
  })}`;
}

export function replacePriceCopy(text: string, formattedPrice: string): string {
  return text.replace(
    /HKD?\$?\s*3[.,]000|港币\s*3,000\s*元/gi,
    formattedPrice,
  );
}

export function usePricing() {
  const { currency } = useCurrency();
  const { data } = useQuery<PricingConfig>({
    queryKey: ["pricing"],
    queryFn: async () => {
      const res = await fetch(`${window.location.origin}${BASE}/api/settings/pricing`);
      if (!res.ok) return DEFAULT_PRICING;
      const remote = await res.json();
      return { ...DEFAULT_PRICING, ...remote };
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: DEFAULT_PRICING,
  });

  const p = data ?? DEFAULT_PRICING;
  const usdRate = Number(p.usdRate) > 0 ? Number(p.usdRate) : DEFAULT_PRICING.usdRate;
  const format = (amount: number) => formatMoney(amount, currency, usdRate);

  return {
    raw: p,
    currency,
    usdRate,
    format,
    firstPayment:         format(3000),
    mastersTotal:         format(p.mastersTotal),
    bachelorTotal:        format(p.bachelorTotal),
    associateTotal:       format(p.associateTotal),
    diplomaTotal:         format(p.diplomaTotal ?? 70000),
    mastersStage2:        format(p.mastersStage2 ?? 45000),
    bachelorStage2:       format(p.bachelorStage2 ?? 40000),
    associateStage2:      format(p.associateStage2 ?? 30000),
    diplomaStage2:        format(p.diplomaStage2 ?? 25000),
    mastersLastPayment:   format(p.mastersLastPayment),
    bachelorLastPayment:  format(p.bachelorLastPayment),
    associateLastPayment: format(p.associateLastPayment),
    diplomaLastPayment:   format(p.diplomaLastPayment ?? 42000),
  };
}
