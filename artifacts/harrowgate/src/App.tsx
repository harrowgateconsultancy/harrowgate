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
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/harrowgate-logo.png`,
  },
  variables: {
    colorPrimary: "#a28959",
    colorForeground: "#e8d5b0",
    colorMutedForeground: "rgba(232,213,176,0.5)",
    colorDanger: "#f87171",
    colorBackground: "#0d2615",
    colorInput: "rgba(162,137,89,0.1)",
    colorInputForeground: "#e8d5b0",
    colorNeutral: "rgba(162,137,89,0.3)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "rounded-2xl w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#a28959] font-bold",
    headerSubtitle: "text-[rgba(162,137,89,0.6)]",
    socialButtonsBlockButtonText: "text-[#f5e6d3] font-medium",
    formFieldLabel: "text-[rgba(162,137,89,0.7)] text-xs font-semibold",
    footerActionLink: "text-[#a28959] font-semibold hover:opacity-80",
    footerActionText: "text-[rgba(162,137,89,0.5)]",
    dividerText: "text-[rgba(162,137,89,0.4)]",
    identityPreviewEditButton: "text-[#a28959]",
    formFieldSuccessText: "text-green-400",
    alertText: "text-[#f5e6d3]",
    logoBox: "flex justify-center",
    logoImage: "h-10",
    socialButtonsBlockButton: "border border-[rgba(162,137,89,0.25)] bg-[rgba(162,137,89,0.06)] hover:bg-[rgba(162,137,89,0.12)] rounded-xl",
    formButtonPrimary: "bg-[#a28959] text-[#a13300] font-semibold hover:opacity-90 rounded-xl",
    formFieldInput: "bg-[rgba(162,137,89,0.08)] border border-[rgba(162,137,89,0.2)] text-[#f5e6d3] rounded-xl focus:border-[#a28959]",
    footerAction: "bg-[rgba(162,137,89,0.05)]",
    dividerLine: "bg-[rgba(162,137,89,0.15)]",
    alert: "bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)]",
    otpCodeFieldInput: "bg-[rgba(162,137,89,0.08)] border-[rgba(162,137,89,0.2)] text-[#f5e6d3] rounded-xl",
    formFieldRow: "gap-3",
    main: "gap-4",
  },
};

function SignInPage() {
  const [, setLocation] = useLocation();
  return (
    <div
      className="flex flex-col min-h-[100dvh] px-4 py-8"
      style={{ background: "#0f2d18" }}
    >
      <div className="flex items-center justify-between mb-6 max-w-lg mx-auto w-full">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
          style={{ color: "rgba(162,137,89,0.6)" }}
        >
          ← Back
        </button>
        <img src={`${basePath}/harrowgate-logo.png`} alt="HARROWGATE" className="h-10 object-contain" />
        <div className="w-16" />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          forceRedirectUrl={`${basePath}/portal`}
        />
      </div>
    </div>
  );
}

function SignUpPage() {
  const [, setLocation] = useLocation();
  return (
    <div
      className="flex flex-col min-h-[100dvh] px-4 py-8"
      style={{ background: "#0f2d18" }}
    >
      <div className="flex items-center justify-between mb-6 max-w-lg mx-auto w-full">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
          style={{ color: "rgba(162,137,89,0.6)" }}
        >
          ← Back
        </button>
        <img src={`${basePath}/harrowgate-logo.png`} alt="HARROWGATE" className="h-10 object-contain" />
        <div className="w-16" />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
          forceRedirectUrl={`${basePath}/portal`}
        />
      </div>
    </div>
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

            {/* Staff portal (public login, protected dashboard) */}
            <Route path="/staff/login" component={StaffLogin} />
            <Route path="/staff" component={StaffDashboard} />

            {/* Admin login (public) */}
            <Route path="/admin/login" component={AdminLogin} />

            {/* Admin / Consultant portal — protected */}
            <Route path="/admin/submissions">
              <AdminGuard><Submissions /></AdminGuard>
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
                    <Route path="/admin/finance" component={Finance} />
                    <Route path="/admin/staff" component={Staff} />
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
