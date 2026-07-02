import { useQuery } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type PricingFeature = { text: string; bold?: boolean };

export type PricingConfig = {
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

export function fmtHKD(n: number): string {
  return `HKD$ ${n.toLocaleString("en-HK")}`;
}

export function usePricing() {
  const { data } = useQuery<PricingConfig>({
    queryKey: ["pricing"],
    queryFn: async () => {
      const res = await fetch(`${window.location.origin}${BASE}/api/settings/pricing`);
      if (!res.ok) return DEFAULT_PRICING;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: DEFAULT_PRICING,
  });

  const p = data ?? DEFAULT_PRICING;

  return {
    raw: p,
    mastersTotal:         fmtHKD(p.mastersTotal),
    bachelorTotal:        fmtHKD(p.bachelorTotal),
    associateTotal:       fmtHKD(p.associateTotal),
    diplomaTotal:         fmtHKD(p.diplomaTotal ?? 70000),
    mastersStage2:        fmtHKD(p.mastersStage2 ?? 45000),
    bachelorStage2:       fmtHKD(p.bachelorStage2 ?? 40000),
    associateStage2:      fmtHKD(p.associateStage2 ?? 30000),
    diplomaStage2:        fmtHKD(p.diplomaStage2 ?? 25000),
    mastersLastPayment:   fmtHKD(p.mastersLastPayment),
    bachelorLastPayment:  fmtHKD(p.bachelorLastPayment),
    associateLastPayment: fmtHKD(p.associateLastPayment),
    diplomaLastPayment:   fmtHKD(p.diplomaLastPayment ?? 42000),
  };
}
