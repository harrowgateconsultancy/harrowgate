import { useSyncExternalStore } from "react";

export type Currency = "HKD" | "USD";

const STORAGE_KEY = "harrowgate_currency";
const listeners = new Set<() => void>();

function readCurrency(): Currency {
  if (typeof window === "undefined") return "HKD";
  return window.localStorage.getItem(STORAGE_KEY) === "USD" ? "USD" : "HKD";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getServerSnapshot() {
  return "HKD" as Currency;
}

export function setCurrency(currency: Currency) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, currency);
  listeners.forEach(listener => listener());
}

export function useCurrency() {
  const currency = useSyncExternalStore(subscribe, readCurrency, getServerSnapshot);
  return { currency, setCurrency };
}