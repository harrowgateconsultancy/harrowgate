import { createContext, useContext, useState } from "react";

export type AdminColors = {
  card: string; navyText: string; navyBg: string; navyBorder: string;
  n01: string; n02: string; n04: string; n06: string; n08: string; n10: string;
  n15: string; n20: string; n25: string; n30: string; n35: string; n40: string;
  n45: string; n50: string; n60: string; n75: string;
};

const DARK_C: AdminColors = {
  card: "#1e2d42", navyText: "#e2e8f0", navyBg: "#1e3a5f", navyBorder: "rgba(255,255,255,0.25)",
  n01: "rgba(255,255,255,0.01)", n02: "rgba(255,255,255,0.04)", n04: "rgba(255,255,255,0.06)",
  n06: "rgba(255,255,255,0.08)", n08: "rgba(255,255,255,0.10)", n10: "rgba(255,255,255,0.12)",
  n15: "rgba(255,255,255,0.15)", n20: "rgba(255,255,255,0.18)", n25: "rgba(255,255,255,0.20)",
  n30: "rgba(255,255,255,0.45)", n35: "rgba(255,255,255,0.50)", n40: "rgba(255,255,255,0.55)",
  n45: "rgba(255,255,255,0.60)", n50: "rgba(255,255,255,0.65)", n60: "rgba(255,255,255,0.75)",
  n75: "rgba(255,255,255,0.85)",
};

const LIGHT_C: AdminColors = {
  card: "#f2f5f9", navyText: "#0d1a3a", navyBg: "#0d1a3a", navyBorder: "#8896aa",
  n01: "rgba(13,26,58,0.02)", n02: "rgba(13,26,58,0.04)", n04: "rgba(13,26,58,0.06)",
  n06: "rgba(13,26,58,0.09)", n08: "rgba(13,26,58,0.12)", n10: "rgba(13,26,58,0.15)",
  n15: "rgba(13,26,58,0.20)", n20: "rgba(13,26,58,0.25)", n25: "rgba(13,26,58,0.30)",
  n30: "rgba(13,26,58,0.38)", n35: "rgba(13,26,58,0.45)", n40: "rgba(13,26,58,0.52)",
  n45: "rgba(13,26,58,0.60)", n50: "rgba(13,26,58,0.68)", n60: "rgba(13,26,58,0.78)",
  n75: "rgba(13,26,58,0.88)",
};

interface AdminThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  C: AdminColors;
}

const AdminThemeContext = createContext<AdminThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
  C: LIGHT_C,
});

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem("admin_theme") === "dark";
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
