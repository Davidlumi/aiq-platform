import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

// Auth pages
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// App shell / dashboard
import AppShell from "./components/AppShell";

// Role-specific dashboards
import LearnerDashboard from "./pages/dashboard/LearnerDashboard";
import ManagerDashboard from "./pages/dashboard/ManagerDashboard";
import HRDashboard from "./pages/dashboard/HRDashboard";
import AuditorDashboard from "./pages/dashboard/AuditorDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";

// Feature pages
import AssessmentPage from "./pages/assessment/AssessmentPage";
import AssessmentSessionPage from "./pages/assessment/AssessmentSessionPage";
import AssessmentResultsPage from "./pages/assessment/AssessmentResultsPage";
import LearningPlanPage from "./pages/learning/LearningPlanPage";
import ContentLibraryPage from "./pages/learning/ContentLibraryPage";
import ModulePlayerPage from "./pages/learning/ModulePlayerPage";
import SimulationListPage from "./pages/simulation/SimulationListPage";
import SimulationSessionPage from "./pages/simulation/SimulationSessionPage";
import ReportsPage from "./pages/reports/ReportsPage";
import AuditLogPage from "./pages/audit/AuditLogPage";
import PolicyPage from "./pages/policy/PolicyPage";
import ProfilePage from "./pages/profile/ProfilePage";
import UsersPage from "./pages/admin/UsersPage";
import TenantsPage from "./pages/admin/TenantsPage";
import ContentCMSPage from "./pages/admin/ContentCMSPage";
import AssessmentBlueprintsPage from "./pages/admin/AssessmentBlueprintsPage";
import AssessmentContentPage from "./pages/admin/AssessmentContentPage";
import OnboardingWizard from "./pages/onboarding/OnboardingWizard";
import OrgContextPage from "./pages/admin/OrgContextPage";
import BackOfficePage from "./pages/backoffice/BackOfficePage";
// Marketing pages (public)
import MarketingPage from "./pages/marketing/MarketingPage";
import BetaApplicationPage from "./pages/marketing/BetaApplicationPage";

function ProtectedRoute({
  component: Component,
  ...rest
}: {
  component: React.ComponentType;
  path?: string;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <AppShell>
      <Component />
    </AppShell>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public auth routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />

      {/* Root redirect */}
      <Route path="/">
        <RootRedirect />
      </Route>
      {/* Onboarding */}
      <Route path="/onboarding" component={OnboardingWizard} />

      {/* Protected routes */}
      <Route path="/dashboard">
        <ProtectedRoute component={RoleDashboard} />
      </Route>
      <Route path="/assessment">
        <ProtectedRoute component={AssessmentPage} />
      </Route>
      <Route path="/assessment/:sessionId/results">
        <ProtectedRoute component={AssessmentResultsPage} />
      </Route>
      <Route path="/assessment/:sessionId">
        <ProtectedRoute component={AssessmentSessionPage} />
      </Route>
      <Route path="/learning">
        <ProtectedRoute component={LearningPlanPage} />
      </Route>
      <Route path="/library">
        <ProtectedRoute component={ContentLibraryPage} />
      </Route>
      <Route path="/learning/module/:contentItemId">
        <ProtectedRoute component={ModulePlayerPage} />
      </Route>
      <Route path="/simulations">
        <ProtectedRoute component={SimulationListPage} />
      </Route>
      <Route path="/simulations/:sessionId">
        <ProtectedRoute component={SimulationSessionPage} />
      </Route>
      <Route path="/reports">
        <ProtectedRoute component={ReportsPage} />
      </Route>
      <Route path="/audit">
        <ProtectedRoute component={AuditLogPage} />
      </Route>
      <Route path="/policy">
        <ProtectedRoute component={PolicyPage} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={ProfilePage} />
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute component={UsersPage} />
      </Route>
      <Route path="/admin/tenants">
        <ProtectedRoute component={TenantsPage} />
      </Route>
      <Route path="/admin/org-context">
        <ProtectedRoute component={OrgContextPage} />
      </Route>
      <Route path="/admin/content">
        <ProtectedRoute component={ContentCMSPage} />
      </Route>
      <Route path="/admin/assessments">
        <ProtectedRoute component={AssessmentBlueprintsPage} />
      </Route>
       <Route path="/admin/scenarios">
        <ProtectedRoute component={AssessmentContentPage} />
      </Route>
      <Route path="/backoffice">
        <ProtectedRoute component={BackOfficePage} />
      </Route>
      {/* Marketing pages — public */}
      <Route path="/about" component={MarketingPage} />
      <Route path="/beta" component={BetaApplicationPage} />
      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }
  if (!user) return <MarketingPage />;
  // Route new users to onboarding wizard
  if (!(user as any).onboardingCompleted) return <Redirect to="/onboarding" />;
  return <Redirect to="/dashboard" />;
}

function RoleDashboard() {
  const { user } = useAuth();
  if (!user) return null;
  const roles = (user as any).roles as string[] ?? [];

  if (roles.includes("platform_super_admin") || roles.includes("tenant_admin")) {
    return <AdminDashboard />;
  }
  if (roles.includes("hr_leader")) {
    return <HRDashboard />;
  }
  if (roles.includes("manager")) {
    return <ManagerDashboard />;
  }
  if (roles.includes("auditor")) {
    return <AuditorDashboard />;
  }
  return <LearnerDashboard />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
