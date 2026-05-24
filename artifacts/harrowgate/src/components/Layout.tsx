import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, FileText, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/applications", label: "Applications", icon: FileText },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-200",
          "md:relative md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-sidebar-primary">
            <span className="text-sidebar-primary-foreground font-bold text-sm">H</span>
          </div>
          <div>
            <div className="text-sidebar-foreground font-bold tracking-widest text-sm uppercase">Harrowgate</div>
            <div className="text-sidebar-foreground/50 text-[10px] tracking-wider uppercase">Visa Consultancy</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? location === "/" : location.startsWith(href);
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
                data-testid={`nav-${label.toLowerCase()}`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-sidebar-border">
          <p className="text-sidebar-foreground/30 text-[10px] tracking-wider uppercase">Hong Kong</p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded hover:bg-accent"
            data-testid="mobile-menu-toggle"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <span className="font-bold tracking-widest text-sm uppercase text-foreground">Harrowgate</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
