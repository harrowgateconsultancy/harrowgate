import { useQuery } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type PricingConfig = {
  mastersTotal: number;
  bachelorTotal: number;
  associateTotal: number;
  mastersLastPayment: number;
  bachelorLastPayment: number;
  associateLastPayment: number;
};

export const DEFAULT_PRICING: PricingConfig = {
  mastersTotal: 140000,
  bachelorTotal: 130000,
  associateTotal: 90000,
  mastersLastPayment: 125000,
  bachelorLastPayment: 115000,
  associateLastPayment: 75000,
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
    mastersTotal:        fmtHKD(p.mastersTotal),
    bachelorTotal:       fmtHKD(p.bachelorTotal),
    associateTotal:      fmtHKD(p.associateTotal),
    mastersLastPayment:  fmtHKD(p.mastersLastPayment),
    bachelorLastPayment: fmtHKD(p.bachelorLastPayment),
    associateLastPayment:fmtHKD(p.associateLastPayment),
  };
}
