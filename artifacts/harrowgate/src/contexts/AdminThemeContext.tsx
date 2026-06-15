import { createContext, useContext, useState } from "react";

export type AdminColors = {
  card: string; navyText: string; navyBg: string; navyBorder: string;
  n01: string; n02: string; n04: string; n06: string; n08: string; n10: string;
  n15: string; n20: string; n25: string; n30: string; n35: string; n40: string;
  n45: string; n50: string; n60: string; n75: string;
};

// Dark = Forest Green (matches student portal)
const DARK_C: AdminColors = {
  card:       "#0f2d18",
  navyText:   "#f0d28c",
  navyBg:     "#0b2213",
  navyBorder: "rgba(162,137,89,0.35)",
  n01: "rgba(255,255,255,0.01)",
  n02: "rgba(255,255,255,0.03)",
  n04: "rgba(255,255,255,0.05)",
  n06: "rgba(255,255,255,0.07)",
  n08: "rgba(255,255,255,0.09)",
  n10: "rgba(255,255,255,0.12)",
  n15: "rgba(255,255,255,0.16)",
  n20: "rgba(255,255,255,0.20)",
  n25: "rgba(255,255,255,0.24)",
  n30: "rgba(162,137,89,0.40)",
  n35: "rgba(162,137,89,0.50)",
  n40: "rgba(162,137,89,0.58)",
  n45: "rgba(196,169,110,0.65)",
  n50: "rgba(196,169,110,0.72)",
  n60: "rgba(240,210,140,0.82)",
  n75: "rgba(240,210,140,0.92)",
};

// Light = White / Clean
const LIGHT_C: AdminColors = {
  card:       "#ffffff",
  navyText:   "#0d1a3a",
  navyBg:     "#f5f7f5",
  navyBorder: "rgba(0,0,0,0.14)",
  n01: "rgba(13,26,58,0.02)",
  n02: "rgba(13,26,58,0.04)",
  n04: "rgba(13,26,58,0.06)",
  n06: "rgba(13,26,58,0.09)",
  n08: "rgba(13,26,58,0.12)",
  n10: "rgba(13,26,58,0.15)",
  n15: "rgba(13,26,58,0.20)",
  n20: "rgba(13,26,58,0.25)",
  n25: "rgba(13,26,58,0.30)",
  n30: "rgba(13,26,58,0.38)",
  n35: "rgba(13,26,58,0.45)",
  n40: "rgba(13,26,58,0.52)",
  n45: "rgba(13,26,58,0.60)",
  n50: "rgba(13,26,58,0.68)",
  n60: "rgba(13,26,58,0.78)",
  n75: "rgba(13,26,58,0.88)",
};

interface AdminThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  C: AdminColors;
}

const AdminThemeContext = createContext<AdminThemeContextType>({
  isDark: true,
  toggleTheme: () => {},
  C: DARK_C,
});

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to dark (forest green) — same as student portal
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem("admin_theme");
    return stored !== "light"; // dark unless explicitly set to light
  });

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem("admin_theme", next ? "dark" : "light");
      return next;
    });
  };

  return (
    <AdminThemeContext.Provider value={{ isDark, toggleTheme, C: isDark ? DARK_C : LIGHT_C }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export const useAdminTheme = () => useContext(AdminThemeContext);
export const useAdminColors = () => useContext(AdminThemeContext).C;
