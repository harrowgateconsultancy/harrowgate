import { useEffect, useRef, useState } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Landing from "@/pages/student/Landing";
import Portal from "@/pages/student/Portal";
import Packages from "@/pages/student/Packages";
import WhyHongKong from "@/pages/student/WhyHongKong";
import Submissions from "@/pages/admin/Submissions";
import AdminLogin from "@/pages/admin/AdminLogin";

import AdminLayout from "@/components/AdminLayout";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import ClientNew from "@/pages/client-new";
import ClientDetail from "@/pages/client-detail";
import Applications from "@/pages/applications";
import ApplicationNew from "@/pages/application-new";
import ApplicationDetail from "@/pages/application-detail";
import Finance from "@/pages/admin/Finance";
import Staff from "@/pages/admin/Staff";
import Pricing from "@/pages/admin/Pricing";
import AdminSettings from "@/pages/admin/Settings";
import AgentsPage from "@/pages/admin/Agents";
import AgentSignup from "@/pages/agent/AgentSignup";
import StaffLogin from "@/pages/staff/StaffLogin";
import StaffDashboard from "@/pages/staff/StaffDashboard";
import PrintView from "@/pages/print";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk" as const,
  options: {
    logoPlacement: "none" as const,
  },
  variables: {
    colorPrimary: "#c4a96e",
    colorForeground: "#f0e8d0",
    colorMutedForeground: "rgba(212,197,162,0.6)",
    colorDanger: "#f87171",
    colorBackground: "#0b2213",
    colorInput: "rgba(162,137,89,0.12)",
    colorInputForeground: "#f0e8d0",
    colorNeutral: "rgba(162,137,89,0.35)",
    fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    borderRadius: "999px",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full !rounded-none",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-[rgba(162,137,89,0.04)] !rounded-none",
    footerPages: "!hidden",
    headerTitle: "!hidden",
    headerSubtitle: "!hidden",
    header: "!hidden",
    socialButtonsBlockButtonText: "!text-[#f0e8d0] !font-semibold",
    socialButtonsBlockButtonArrow: "!text-[#c4a96e]",
    formFieldLabel: "!text-[rgba(196,169,110,0.85)] !text-xs !font-semibold !tracking-wide",
    footerActionLink: "!text-[#c4a96e] !font-bold hover:!opacity-80",
    footerActionText: "!text-[rgba(212,197,162,0.6)]",
    dividerText: "!text-[rgba(162,137,89,0.55)]",
    identityPreviewEditButton: "!text-[#c4a96e]",
    formFieldSuccessText: "!text-[#c4a96e]",
    alertText: "!text-[#f0e8d0]",
    logoBox: "!hidden",
    logoImage: "!hidden",
    socialButtonsBlockButton: "!border !border-[rgba(196,169,110,0.35)] !bg-[rgba(162,137,89,0.08)] hover:!bg-[rgba(162,137,89,0.16)] hover:!border-[rgba(196,169,110,0.6)] !rounded-full !transition-all !shadow-none",
    formButtonPrimary: "!rounded-full !font-bold !text-[#0b2213] !shadow-none hover:!opacity-95 !transition-all",
    formFieldInput: "!bg-[rgba(162,137,89,0.09)] !border !border-[rgba(162,137,89,0.25)] !text-[#f0e8d0] !rounded-full focus:!border-[#c4a96e] focus:!ring-0 !placeholder-[rgba(162,137,89,0.4)] !transition-all",
    footerAction: "!bg-[rgba(162,137,89,0.04)] !border-t !border-[rgba(162,137,89,0.1)]",
    dividerLine: "!bg-[rgba(162,137,89,0.18)]",
    alert: "!bg-[rgba(248,113,113,0.08)] !border !border-[rgba(248,113,113,0.2)] !rounded-2xl",
    otpCodeFieldInput: "!bg-[rgba(162,137,89,0.09)] !border-[rgba(162,137,89,0.25)] !text-[#f0e8d0] !rounded-2xl",
    formFieldRow: "gap-3",
    main: "gap-4",
    internal: "gap-4",
    badge: "!hidden",
    footer: "!shadow-none !border-0 !bg-[rgba(162,137,89,0.04)]",
  },
};

function AuthBackButton({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full border"
      style={{
        color: hov ? "#f0d28c" : "#c4a96e",
        borderColor: hov ? "rgba(240,210,140,0.6)" : "rgba(196,169,110,0.35)",
        background: hov ? "rgba(162,137,89,0.16)" : "rgba(162,137,89,0.08)",
        boxShadow: hov ? "0 0 14px rgba(162,137,89,0.25)" : "none",
        transition: "all 0.2s ease",
      }}
    >
      ← Back
    </button>
  );
}

function useHideClerkDevBadge() {
  useEffect(() => {
    const hide = (el: HTMLElement) => { el.style.setProperty("display", "none", "important"); };
    const scan = () => {
      // Hide exact "Development mode" badge elements (not their parents)
      document.querySelectorAll<HTMLElement>("a, span, p, button").forEach((el) => {
        const txt = el.textContent?.trim().toLowerCase() ?? "";
        if (txt === "development mode" || txt === "development instance") {
          hide(el);
        }
      });
      // Also hide any wrapping div whose ONLY visible content is the badge
      document.querySelectorAll<HTMLElement>("div, footer").forEach((el) => {
        const txt = el.textContent?.trim().toLowerCase() ?? "";
        if (txt === "development mode" || txt === "development instance") {
          hide(el);
        }
      });
      // Also hide by known Clerk attributes / link targets
      document.querySelectorAll<HTMLElement>(
        '[data-localization-key="badge__devMode"], a[href*="clerk.com/docs/deployments"]'
      ).forEach(hide);
    };
    scan();
    const obs = new MutationObserver(scan);
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
  }, []);
}

function AuthPageShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  const [, setLocation] = useLocation();
  useHideClerkDevBadge();
  return (
    <div
      className="relative flex flex-col min-h-[100dvh]"
      style={{
        background: "#0b2213",
        backgroundImage: "radial-gradient(ellipse at 50% -5%, rgba(162,137,89,0.13) 0%, transparent 60%)",
      }}
    >
      {/* CSS fallback for Clerk dev badge */}
      <style>{`
        [data-localization-key="badge__devMode"],
        [class*="cl-badge"], [class*="Badge__root"],
        a[href*="clerk.com/docs/deployments"],
        a[href*="clerk.dev"] { display: none !important; }
      `}</style>

      {/* Back button — fixed top-left */}
      <div className="fixed top-5 left-5 z-50">
        <AuthBackButton onClick={() => setLocation("/")} />
      </div>

      {/* Scrollable centred column */}
      <div className="flex flex-col items-center justify-center flex-1 px-0 py-12">

        {/* ── Logo above the card ── */}
        <div className="flex flex-col items-center mb-6 px-4">
          <img
            src={`${basePath}/harrowgate-logo.png`}
            alt="HARROWGATE"
            className="h-28 w-auto object-contain mb-5"
            style={{ filter: "drop-shadow(0 0 24px rgba(196,169,110,0.35))" }}
          />
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight text-center"
            style={{ color: "#c4a96e", fontFamily: "'SF Pro Display', -apple-system, sans-serif" }}
          >
            {title}
          </h1>
          <p
            className="mt-2 text-sm sm:text-base text-center"
            style={{ color: "rgba(212,197,162,0.65)" }}
          >
            {subtitle}
          </p>
        </div>

        {/* ── Card ── */}
        <div
          className="w-full sm:max-w-[640px] sm:rounded-3xl sm:p-[2px]"
          style={{
            background: "linear-gradient(145deg, rgba(196,169,110,0.38) 0%, rgba(162,137,89,0.12) 50%, rgba(196,169,110,0.28) 100%)",
            boxShadow: "0 0 80px rgba(162,137,89,0.2), 0 32px 80px rgba(0,0,0,0.5)",
          }}
        >
          <div
            className="w-full sm:rounded-[calc(1.5rem-2px)] overflow-hidden"
            style={{ background: "#0b2213" }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthPageShell
      title="Welcome to HARROWGATE"
      subtitle="Sign in to access your student portal"
    >
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        forceRedirectUrl={`${basePath}/portal`}
      />
    </AuthPageShell>
  );
}

function SignUpPage() {
  return (
    <AuthPageShell
      title="Start Your Application"
      subtitle="Create your account to apply for a Hong Kong student visa"
    >
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        forceRedirectUrl={`${basePath}/portal`}
      />
    </AuthPageShell>
  );
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) { setAuthed(false); setLocation("/admin/login"); return; }
    fetch(`${window.location.origin}${BASE}/api/admin/student-submissions`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => {
      if (r.status === 401) {
        localStorage.removeItem("admin_token");
        setAuthed(false);
        setLocation("/admin/login");
      } else {
        setAuthed(true);
      }
    }).catch(() => setAuthed(true));
  }, []);
  if (authed === null) return null;
  if (!authed) return null;
  return <>{children}</>;
}

function AdminOnlyGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const role = localStorage.getItem("admin_role") ?? "staff";
  if (role !== "admin") {
    setLocation("/admin");
    return null;
  }
  return <>{children}</>;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/portal" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function PortalPage() {
  return (
    <>
      <Show when="signed-in">
        <Portal />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome to HARROWGATE",
            subtitle: "Sign in to access your student portal",
          },
        },
        signUp: {
          start: {
            title: "Start Your Application",
            subtitle: "Create your account to apply for a Hong Kong student visa",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/portal" component={PortalPage} />
            <Route path="/packages" component={Packages} />
            <Route path="/why-hong-kong" component={WhyHongKong} />

            {/* Staff portal (public login, protected dashboard) */}
            <Route path="/staff/login" component={StaffLogin} />
            <Route path="/staff" component={StaffDashboard} />

            {/* Agent signup (public) */}
            <Route path="/agent-signup" component={AgentSignup} />

            {/* Admin login (public) */}
            <Route path="/admin/login" component={AdminLogin} />

            {/* Admin / Consultant portal — protected */}
            <Route path="/admin/submissions/:id">
              <AdminGuard>
                <AdminLayout>
                  <Submissions />
                </AdminLayout>
              </AdminGuard>
            </Route>
            <Route path="/admin/submissions">
              <AdminGuard>
                <AdminLayout>
                  <Submissions />
                </AdminLayout>
              </AdminGuard>
            </Route>
            <Route path="/print/:applicationId" component={PrintView} />
            <Route>
              <AdminGuard>
                <AdminLayout>
                  <Switch>
                    <Route path="/admin" component={Dashboard} />
                    <Route path="/admin/clients/new" component={ClientNew} />
                    <Route path="/admin/clients/:clientId" component={ClientDetail} />
                    <Route path="/admin/clients" component={Clients} />
                    <Route path="/admin/applications/new" component={ApplicationNew} />
                    <Route path="/admin/applications/:applicationId" component={ApplicationDetail} />
                    <Route path="/admin/applications" component={Applications} />
                    <Route path="/admin/finance">
                      <AdminOnlyGuard><Finance /></AdminOnlyGuard>
                    </Route>
                    <Route path="/admin/staff" component={Staff} />
                    <Route path="/admin/pricing">
                      <AdminOnlyGuard><Pricing /></AdminOnlyGuard>
                    </Route>
                    <Route path="/admin/settings">
                      <AdminOnlyGuard><AdminSettings /></AdminOnlyGuard>
                    </Route>
                    <Route path="/admin/agents">
                      <AdminOnlyGuard><AgentsPage /></AdminOnlyGuard>
                    </Route>
                    <Route component={NotFound} />
                  </Switch>
                </AdminLayout>
              </AdminGuard>
            </Route>
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
