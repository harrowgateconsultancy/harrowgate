import { useQuery } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type PricingConfig = {
  mastersTotal: number;
  bachelorTotal: number;
  associateTotal: number;
  mastersStage2: number;
  bachelorStage2: number;
  associateStage2: number;
  mastersLastPayment: number;
  bachelorLastPayment: number;
  associateLastPayment: number;
};

export const DEFAULT_PRICING: PricingConfig = {
  mastersTotal: 130000,
  bachelorTotal: 120000,
  associateTotal: 90000,
  mastersStage2: 45000,
  bachelorStage2: 40000,
  associateStage2: 30000,
  mastersLastPayment: 82000,
  bachelorLastPayment: 57000,
  associateLastPayment: 47000,
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
    mastersStage2:        fmtHKD(p.mastersStage2 ?? 45000),
    bachelorStage2:       fmtHKD(p.bachelorStage2 ?? 40000),
    associateStage2:      fmtHKD(p.associateStage2 ?? 30000),
    mastersLastPayment:   fmtHKD(p.mastersLastPayment),
    bachelorLastPayment:  fmtHKD(p.bachelorLastPayment),
    associateLastPayment: fmtHKD(p.associateLastPayment),
  };
}
