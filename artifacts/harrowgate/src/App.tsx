import { useEffect, useState } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Landing from "@/pages/student/Landing";
import Portal from "@/pages/student/Portal";
import Packages from "@/pages/student/Packages";
import WhyHongKong from "@/pages/student/WhyHongKong";
import StudentSignIn from "@/pages/student/StudentSignIn";
import StudentSignUp from "@/pages/student/StudentSignUp";
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
import InvoicePage from "@/pages/admin/Invoice";
import TaxPage from "@/pages/admin/Tax";
import StaffDashboard from "@/pages/staff/StaffDashboard";
import PrintView from "@/pages/print";
import NotFound from "@/pages/not-found";
import { isStudentLoggedIn } from "@/lib/studentAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

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
  if (isStudentLoggedIn()) return <Redirect to="/portal" />;
  return <Landing />;
}

function PortalPage() {
  if (!isStudentLoggedIn()) return <Redirect to="/sign-in" />;
  return <Portal />;
}

function AppRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in" component={StudentSignIn} />
          <Route path="/sign-up" component={StudentSignUp} />
          <Route path="/portal" component={PortalPage} />
          <Route path="/packages" component={Packages} />
          <Route path="/why-hong-kong" component={WhyHongKong} />

          <Route path="/staff/login" component={StaffLogin} />
          <Route path="/staff" component={StaffDashboard} />

          <Route path="/agent-signup" component={AgentSignup} />

          <Route path="/admin/login" component={AdminLogin} />

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
                  <Route path="/admin/invoice" component={InvoicePage} />
                  <Route path="/admin/agents">
                    <AdminOnlyGuard><AgentsPage /></AdminOnlyGuard>
                  </Route>
                  <Route path="/admin/tax">
                    <AdminOnlyGuard><TaxPage /></AdminOnlyGuard>
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
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AppRoutes />
    </WouterRouter>
  );
}

export default App;
