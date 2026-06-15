import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, FileText, Menu, X, Bell, TrendingUp, UserCog, Tag, Sun, Moon, Settings, LogOut, Shield, Receipt } from "lucide-react";
import { useState } from "react";
import { AdminThemeProvider, useAdminTheme } from "@/contexts/AdminThemeContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getRoleDisplay(role: string) {
  if (role === "admin")   return { label: "Super Admin",  color: "#1F7D53", bg: "rgba(31,125,83,0.12)" };
  if (role === "manager") return { label: "Manager",      color: "#1F7D53", bg: "rgba(31,125,83,0.12)" };
  return                         { label: "Staff",        color: "#60a5fa", bg: "rgba(96,165,250,0.12)"  };
}

const ALL_NAV_ITEMS = [
  { href: "/admin",              label: "Dashboard",   icon: LayoutDashboard, exact: true,  roles: ["admin","manager","staff"] },
  { href: "/admin/clients",      label: "Clients",     icon: Users,           exact: false, roles: ["admin","manager","staff"] },
  { href: "/admin/applications", label: "Applications",icon: FileText,        exact: false, roles: ["admin","manager","staff"] },
  { href: "/admin/submissions",  label: "Submissions", icon: Bell,            exact: false, roles: ["admin","manager","staff"] },
  { href: "/admin/finance",      label: "Finance",     icon: TrendingUp,      exact: false, roles: ["admin"] },
  { href: "/admin/invoice",      label: "Invoice",     icon: Receipt,         exact: false, roles: ["admin","manager"] },
  { href: "/admin/staff",        label: "Staff & Tasks",icon: UserCog,        exact: false, roles: ["admin","manager","staff"] },
  { href: "/admin/pricing",      label: "Pricing",     icon: Tag,             exact: false, roles: ["admin"] },
  { href: "/admin/settings",     label: "Settings",    icon: Settings,        exact: false, roles: ["admin"] },
  { href: "/admin/agents",       label: "Agents",      icon: Users,           exact: false, roles: ["admin"] },
];

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isDark, toggleTheme } = useAdminTheme();

  const role = localStorage.getItem("admin_role") ?? "admin";
  const name = localStorage.getItem("admin_name") ?? "Admin";
  const roleDisplay = getRoleDisplay(role);

  const navItems = ALL_NAV_ITEMS.filter(item => item.roles.includes(role));

  function handleLogout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_role");
    localStorage.removeItem("admin_name");
    window.location.href = `${BASE}/admin/login`;
  }

  return (
    <div className={cn("flex h-screen overflow-hidden bg-background", isDark && "dark")}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-200",
          "md:relative md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col items-center gap-1 px-6 py-6 border-b border-sidebar-border">
          <img src={`${BASE}/harrowgate-logo.png`} alt="HARROWGATE" className="h-24 w-full object-contain" />
          <div className="text-sidebar-foreground/50 text-[10px] tracking-wider uppercase mt-1">Admin Portal</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? location === href : location.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
          {/* Current user */}
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg"
            style={{ background: "rgba(0,0,0,0.06)" }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: roleDisplay.bg }}>
              <span className="text-xs font-bold" style={{ color: roleDisplay.color }}>
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate text-sidebar-foreground/80">{name}</p>
              <p className="text-[10px] truncate" style={{ color: roleDisplay.color }}>{roleDisplay.label}</p>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 w-full text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors text-[11px] tracking-wider uppercase"
          >
            {isDark ? <Sun size={13} className="shrink-0" /> : <Moon size={13} className="shrink-0" />}
            <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full text-sidebar-foreground/40 hover:text-red-400 transition-colors text-[11px] tracking-wider uppercase"
          >
            <LogOut size={13} className="shrink-0" />
            <span>Sign Out</span>
          </button>

          <Link
            href="/"
            className="block text-sidebar-foreground/40 text-[10px] tracking-wider uppercase hover:text-sidebar-foreground/70 transition-colors"
          >
            ← Student Portal
          </Link>
          <p className="text-sidebar-foreground/20 text-[10px] tracking-wider uppercase">Hong Kong</p>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1.5 rounded hover:bg-accent">
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <span className="font-bold tracking-widest text-sm uppercase text-foreground">Harrowgate Admin</span>
        </header>
        <main className="flex-1 overflow-y-auto bg-background">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminThemeProvider>
  );
}
