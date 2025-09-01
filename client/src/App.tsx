import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/new-dashboard";
import TechnicianChat from "@/pages/TechnicianChat";
import { SopgridChat } from "@/components/sopgrid-chat";
import { UserManagementNew } from "@/pages/user-management-new";
import { SopGenerator } from "@/pages/sop-generator";
import { CredentialsVault } from "@/pages/credentials-vault";
import { Snapshots } from "@/pages/snapshots";
import { Arbitration } from "@/pages/arbitration";
import WebCrawler from "@/pages/web-crawler";
import SOPViewer from "@/pages/sop-viewer";
import MultiAgentSOP from "@/pages/MultiAgentSOP";
import HITLSystem from "@/pages/HITLSystem";
import Troubleshooting from "@/pages/troubleshooting";
import SOPTraining from "@/pages/sop-training";
import SOPApprovalPage from "@/pages/sop-approval";
import RVIATraining from "@/pages/rvia-training";
import BulkGeneration from "@/pages/BulkGeneration";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { AdvancedSearch } from "@/components/advanced-search";
import { EnterpriseOSDashboard } from "@/components/enterprise-os-dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        {() => (
          <ProtectedRoute>
            <TechnicianChat />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/technician-chat">
        {() => (
          <ProtectedRoute>
            <TechnicianChat />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard">
        <Dashboard />
      </Route>
      <Route path="/chat">
        {() => (
          <ProtectedRoute>
            <SopgridChat />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/sop-generator">
        {() => (
          <ProtectedRoute>
            <SopGenerator />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/credentials">
        {() => (
          <ProtectedRoute>
            <CredentialsVault />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/credentials-vault">
        {() => (
          <ProtectedRoute>
            <CredentialsVault />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/snapshots">
        {() => (
          <ProtectedRoute>
            <Snapshots />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/arbitration">
        {() => (
          <ProtectedRoute>
            <Arbitration />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/users">
        {() => (
          <ProtectedRoute>
            <UserManagementNew />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/crawler">
        {() => (
          <ProtectedRoute>
            <WebCrawler />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/web-crawler">
        {() => (
          <ProtectedRoute>
            <WebCrawler />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/sop-viewer">
        {() => (
          <ProtectedRoute>
            <SOPViewer />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/multi-agent-sop">
        {() => (
          <ProtectedRoute>
            <MultiAgentSOP />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/hitl">
        {() => (
          <ProtectedRoute>
            <HITLSystem />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/embedding-test">
        {() => (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/troubleshooting">
        {() => (
          <ProtectedRoute>
            <Troubleshooting />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/sop-training">
        {() => (
          <ProtectedRoute>
            <SOPTraining />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/rvia-training">
        {() => (
          <ProtectedRoute>
            <RVIATraining />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/bulk-generation">
        {() => (
          <ProtectedRoute>
            <BulkGeneration />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/sop-approval">
        {() => (
          <ProtectedRoute>
            <SOPApprovalPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/auto-sop">
        {() => (
          <ProtectedRoute>
            <div className="bg-gray-900 min-h-screen">
              <Dashboard />
            </div>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/advanced-search">
        {() => (
          <ProtectedRoute>
            <div className="bg-gray-900 min-h-screen">
              <AdvancedSearch />
            </div>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/performance">
        {() => (
          <ProtectedRoute>
            <div className="bg-gray-900 min-h-screen">
              <Dashboard />
            </div>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/ai-consultant">
        {() => (
          <ProtectedRoute>
            <div className="bg-gray-900 min-h-screen">
              <Dashboard />
            </div>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/enterprise-os">
        {() => (
          <ProtectedRoute>
            <div className="bg-gray-900 min-h-screen">
              <EnterpriseOSDashboard />
            </div>
          </ProtectedRoute>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="dark">
            <Toaster />
            <Router />
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
