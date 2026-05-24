import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import ClientNew from "@/pages/client-new";
import ClientDetail from "@/pages/client-detail";
import Applications from "@/pages/applications";
import ApplicationNew from "@/pages/application-new";
import ApplicationDetail from "@/pages/application-detail";
import PrintView from "@/pages/print";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/print/:applicationId" component={PrintView} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/clients/new" component={ClientNew} />
            <Route path="/clients/:clientId" component={ClientDetail} />
            <Route path="/clients" component={Clients} />
            <Route path="/applications/new" component={ApplicationNew} />
            <Route path="/applications/:applicationId" component={ApplicationDetail} />
            <Route path="/applications" component={Applications} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
