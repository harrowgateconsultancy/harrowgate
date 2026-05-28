import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, FileText, Menu, X, Bell } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/clients", label: "Clients", icon: Users, exact: false },
  { href: "/admin/applications", label: "Applications", icon: FileText, exact: false },
  { href: "/admin/submissions", label: "Submissions", icon: Bell, exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-200",
          "md:relative md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col items-center gap-1 px-6 py-6 border-b border-sidebar-border">
          <img src="/harrowgate-logo.png" alt="HARROWGATE" className="h-20 w-full object-contain" style={{ filter: "drop-shadow(0 0 14px rgba(162,137,89,0.7)) drop-shadow(0 0 5px rgba(162,137,89,0.45))" }} />
          <div className="text-sidebar-foreground/50 text-[10px] tracking-wider uppercase mt-1">Admin Portal</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
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

        <div className="px-6 py-4 border-t border-sidebar-border space-y-2">
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
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
