import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, FileText, Menu, X, Bell, TrendingUp, UserCog, Tag, Sun, Moon, Settings, LogOut, Shield, Receipt, Calculator, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { AdminThemeProvider, useAdminTheme } from "@/contexts/AdminThemeContext";

const BASE_LAYOUT = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiBaseLayout() { return `${window.location.origin}${BASE_LAYOUT}`; }

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getRoleDisplay(role: string) {
  if (role === "admin")   return { label: "Super Admin",  color: "#f0d28c", bg: "rgba(162,137,89,0.15)" };
  if (role === "manager") return { label: "Manager",      color: "#c4a96e", bg: "rgba(162,137,89,0.12)" };
  return                         { label: "Staff",        color: "#a28959", bg: "rgba(162,137,89,0.10)"  };
}

const ALL_NAV_ITEMS = [
  { href: "/admin",              label: "Dashboard",    icon: LayoutDashboard, exact: true,  roles: ["admin","manager","staff"] },
  { href: "/admin/clients",      label: "Clients",      icon: Users,           exact: false, roles: ["admin","manager","staff"] },
  { href: "/admin/applications", label: "Applications", icon: FileText,        exact: false, roles: ["admin","manager","staff"] },
  { href: "/admin/submissions",  label: "Submissions",  icon: Bell,            exact: false, roles: ["admin","manager","staff"] },
  { href: "/admin/finance",      label: "Finance",      icon: TrendingUp,      exact: false, roles: ["admin"] },
  { href: "/admin/invoice",      label: "Invoice",      icon: Receipt,         exact: false, roles: ["admin","manager"] },
  { href: "/admin/staff",        label: "Staff & Tasks",icon: UserCog,         exact: false, roles: ["admin","manager","staff"] },
  { href: "/admin/pricing",      label: "Pricing",      icon: Tag,             exact: false, roles: ["admin"] },
  { href: "/admin/settings",     label: "Settings",     icon: Settings,        exact: false, roles: ["admin"] },
  { href: "/admin/agents",       label: "Agents",       icon: Users,           exact: false, roles: ["admin"] },
  { href: "/admin/tax",          label: "Tax",          icon: Calculator,      exact: false, roles: ["admin"] },
  { href: "/admin/pages",        label: "On Arrival Visa", icon: Globe,        exact: false, roles: ["admin"] },
];

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isDark, toggleTheme } = useAdminTheme();

  const role = localStorage.getItem("admin_role") ?? "admin";
  const name = localStorage.getItem("admin_name") ?? "Admin";
  const roleDisplay = getRoleDisplay(role);

  const navItems = ALL_NAV_ITEMS.filter(item => item.roles.includes(role));

  // Heartbeat — keeps this session alive; also re-registers after server restarts
  useEffect(() => {
    const sessionId = localStorage.getItem("admin_session_id");
    if (!sessionId) return;
    const heartbeatRole = localStorage.getItem("admin_role") ?? "admin";
    const heartbeatName = localStorage.getItem("admin_name") ?? "Admin";
    function beat() {
      fetch(`${getApiBaseLayout()}/api/admin/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, role: heartbeatRole, name: heartbeatName }),
      }).catch(() => {});
    }
    beat();
    const ref = setInterval(beat, 30_000);
    return () => clearInterval(ref);
  }, []);

  function handleLogout() {
    const sessionId = localStorage.getItem("admin_session_id");
    if (sessionId) {
      fetch(`${getApiBaseLayout()}/api/admin/session`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    }
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_role");
    localStorage.removeItem("admin_name");
    localStorage.removeItem("admin_session_id");
    window.location.href = `${BASE}/admin/login`;
  }

  const BG          = isDark ? "#0b2213" : "#f4f6f4";
  const SIDEBAR_BG  = isDark ? "#092010" : "#0f2d18";
  const SIDEBAR_BD  = isDark ? "rgba(162,137,89,0.15)" : "rgba(162,137,89,0.25)";
  const NAV_ACTIVE  = isDark ? "rgba(162,137,89,0.18)" : "rgba(162,137,89,0.25)";
  const NAV_HOVER   = isDark ? "rgba(162,137,89,0.08)" : "rgba(162,137,89,0.12)";
  const NAV_TXT     = isDark ? "rgba(240,210,140,0.55)" : "rgba(240,210,140,0.70)";
  const NAV_TXT_ACT = isDark ? "#f0d28c" : "#f0d28c";
  const DIVIDER     = isDark ? "rgba(162,137,89,0.12)" : "rgba(162,137,89,0.20)";

  return (
    <div className={cn("flex h-screen overflow-hidden", isDark && "dark")}
      style={{ background: BG }}>

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-200",
          "md:relative md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: SIDEBAR_BG, borderRight: `1px solid ${SIDEBAR_BD}` }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-1 px-6 py-6"
          style={{ borderBottom: `1px solid ${SIDEBAR_BD}` }}>
          <img src={`${BASE}/harrowgate-logo.png`} alt="HARROWGATE" className="h-24 w-full object-contain" />
          <div className="text-[10px] tracking-wider uppercase mt-1"
            style={{ color: "rgba(162,137,89,0.45)" }}>Admin Portal</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? location === href : location.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors"
                style={{
                  background: active ? NAV_ACTIVE : "transparent",
                  color: active ? NAV_TXT_ACT : NAV_TXT,
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = NAV_HOVER; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-4 py-4 space-y-3"
          style={{ borderTop: `1px solid ${DIVIDER}` }}>
          {/* Current user */}
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg"
            style={{ background: "rgba(0,0,0,0.15)" }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: roleDisplay.bg }}>
              <span className="text-xs font-bold" style={{ color: roleDisplay.color }}>
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate" style={{ color: "rgba(240,210,140,0.80)" }}>{name}</p>
              <p className="text-[10px] truncate" style={{ color: roleDisplay.color }}>{roleDisplay.label}</p>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 w-full transition-colors text-[11px] tracking-wider uppercase"
            style={{ color: "rgba(162,137,89,0.50)" }}
          >
            {isDark ? <Sun size={13} className="shrink-0" /> : <Moon size={13} className="shrink-0" />}
            <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full transition-colors text-[11px] tracking-wider uppercase hover:text-red-400"
            style={{ color: "rgba(162,137,89,0.35)" }}
          >
            <LogOut size={13} className="shrink-0" />
            <span>Sign Out</span>
          </button>

          <Link
            href="/"
            className="block text-[10px] tracking-wider uppercase transition-colors hover:opacity-80"
            style={{ color: "rgba(162,137,89,0.30)" }}
          >
            ← Student Portal
          </Link>
          <p className="text-[10px] tracking-wider uppercase" style={{ color: "rgba(162,137,89,0.20)" }}>Hong Kong</p>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3"
          style={{ background: SIDEBAR_BG, borderBottom: `1px solid ${SIDEBAR_BD}` }}>
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded"
            style={{ color: "rgba(162,137,89,0.65)" }}>
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <span className="font-bold tracking-widest text-sm uppercase"
            style={{ color: "#f0d28c" }}>Harrowgate Admin</span>
        </header>

        <main className="flex-1 overflow-y-auto" style={{ background: BG }}>
          {children}
        </main>
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
