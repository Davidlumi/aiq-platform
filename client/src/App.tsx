import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { useViewAs } from "@/contexts/ViewAsContext";
import { Loader2 } from "lucide-react";

// Auth pages
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// App shell / dashboard
import AppShell from "./components/AppShell";

// Role-specific dashboards (v2)
import IndividualDashboardV2 from "./pages/dashboard/IndividualDashboardV2";
import ManagerDashboardV2 from "./pages/dashboard/ManagerDashboardV2";
import LeaderDashboardV2 from "./pages/dashboard/LeaderDashboardV2";
import AIStrategyPage from "./pages/dashboard/AIStrategyPage";
import HRAIStrategyAssessmentPage from "./pages/dashboard/HRAIStrategyAssessmentPage";
import ImplementationTrackerPage from "./pages/dashboard/ImplementationTrackerPage";
import MaturityProgressionPage from "./pages/dashboard/MaturityProgressionPage";
import ManagerHubPage from "./pages/dashboard/ManagerHubPage";
import ContentRequestsPage from "./pages/dashboard/ContentRequestsPage";
import StrategyBuilderPage from "./pages/strategy/StrategyBuilderPage";
import CompanyOnboardingPage from "./pages/company/CompanyOnboardingPage";
import CompanyAssessmentSessionPage from "./pages/company/CompanyAssessmentSessionPage";
import CompanyAssessmentResultsPage from "./pages/company/CompanyAssessmentResultsPage";
import CompanyAssessmentLandingPage from "./pages/company/CompanyAssessmentLandingPage";
// Legacy dashboards (admin/auditor fallback)
import AuditorDashboard from "./pages/dashboard/AuditorDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";

// Feature pages
import CoachPage from "./pages/CoachPage";
import AssessmentPage from "./pages/assessment/AssessmentPage";
import AssessmentSessionPage from "./pages/assessment/AssessmentSessionPage";
import AssessmentResultsPage from "./pages/assessment/AssessmentResultsPage";
import LearningPlanPage from "./pages/learning/LearningPlanPage";
import ContentLibraryPage from "./pages/learning/ContentLibraryPage";
import KnowledgeBasePage from "./pages/learning/KnowledgeBasePage";
import ModulePlayerPage from "./pages/learning/ModulePlayerPage";
import DomainPathwayPage from "./pages/learning/DomainPathwayPage";
import TeamDashboardPage from "./pages/learning/TeamDashboardPage";
import TeamLearningPage from "./pages/learning/TeamLearningPage";
import InitiativeModulesPage from "./pages/learning/InitiativeModulesPage";
import SimulationListPage from "./pages/simulation/SimulationListPage";
import SimulationSessionPage from "./pages/simulation/SimulationSessionPage";
import ReportsPage from "./pages/reports/ReportsPage";
import AuditLogPage from "./pages/audit/AuditLogPage";
import PolicyPage from "./pages/policy/PolicyPage";
import ProfilePage from "./pages/profile/ProfilePage";
import UsersPage from "./pages/admin/UsersPage";
import BetaApplicationsPage from "./pages/admin/BetaApplicationsPage";
import TenantsPage from "./pages/admin/TenantsPage";
import ContentCMSPage from "./pages/admin/ContentCMSPage";
import AssessmentBlueprintsPage from "./pages/admin/AssessmentBlueprintsPage";
import AssessmentContentPage from "./pages/admin/AssessmentContentPage";
import OnboardingWizard from "./pages/onboarding/OnboardingWizard";
import OrgContextPage from "./pages/admin/OrgContextPage";
import OrganisationsPage from "./pages/admin/OrganisationsPage";
import PeopleManagementPage from "./pages/admin/PeopleManagementPage";
import AcceptInvitationPage from "./pages/AcceptInvitationPage";
import ContentLibraryAdminPage from "./pages/admin/ContentLibraryPage";
import ContentReviewPage from "./pages/admin/ContentReviewPage";
import BackOfficePage from "./pages/backoffice/BackOfficePage";
// Marketing pages (public)
import MarketingPage from "./pages/marketing/MarketingPage";
import HowItWorksPage from "./pages/marketing/HowItWorksPage";
import ProductPage from "./pages/marketing/ProductPage";
import AboutPage from "./pages/marketing/AboutPage";
import BetaApplicationPage from "./pages/marketing/BetaApplicationPage";
import PricingPage from "./pages/marketing/PricingPage";
import DemoPreviewPage from "./pages/marketing/DemoPreviewPage";
import MethodologyPage from "./pages/methodology/MethodologyPage";
import PeopleReportsPage from "./pages/people/PeopleReportsPage";
import MemberReportPage from "./pages/people/MemberReportPage";
import ConversationPromptsPage from "./pages/manager/ConversationPromptsPage";
import TeamProgressPage from "./pages/manager/TeamProgressPage";

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

/** Full-screen protected route — no AppShell wrapper (used for immersive experiences like the Coach) */
function ProtectedRouteFullscreen({
  component: Component,
}: {
  component: React.ComponentType;
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

  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public auth routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/accept-invitation" component={AcceptInvitationPage} />

      {/* Root redirect */}
      <Route path="/">
        <RootRedirect />
      </Route>
      {/* Onboarding */}
      <Route path="/onboarding" component={OnboardingWizard} />

      {/* Protected routes */}
      <Route path="/coach">
        <ProtectedRouteFullscreen component={CoachPage} />
      </Route>
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
      <Route path="/knowledge-base">
        <ProtectedRoute component={KnowledgeBasePage} />
      </Route>
      <Route path="/learning/module/:moduleId">
        <ProtectedRoute component={ModulePlayerPage} />
      </Route>
      <Route path="/learning/initiative/:initiativeId">
        <ProtectedRoute component={InitiativeModulesPage} />
      </Route>
      <Route path="/development/:domainId">
        <ProtectedRoute component={DomainPathwayPage} />
      </Route>
      <Route path="/learning/team">
        <ProtectedRoute component={TeamDashboardPage} />
      </Route>
      <Route path="/manager/team-learning">
        <ProtectedRoute component={TeamLearningPage} />
      </Route>
      <Route path="/manager/conversation-prompts">
        <ProtectedRoute component={ConversationPromptsPage} />
      </Route>
      <Route path="/manager/team-progress">
        <ProtectedRoute component={TeamProgressPage} />
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
      <Route path="/ai-strategy">
        <ProtectedRoute component={AIStrategyPage} />
      </Route>
      <Route path="/strategy/builder">
        <ProtectedRoute component={StrategyBuilderPage} />
      </Route>
      <Route path="/ai-strategy/assessment">
        <ProtectedRoute component={HRAIStrategyAssessmentPage} />
      </Route>
      <Route path="/implementation-tracker">
        <ProtectedRoute component={ImplementationTrackerPage} />
      </Route>
      <Route path="/maturity-progression">
        <ProtectedRoute component={MaturityProgressionPage} />
      </Route>
      <Route path="/manager-hub">
        <ProtectedRoute component={ManagerHubPage} />
      </Route>
      <Route path="/content-requests">
        <ProtectedRoute component={ContentRequestsPage} />
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
      <Route path="/admin/people">
        <ProtectedRoute component={PeopleManagementPage} />
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute component={UsersPage} />
      </Route>
      <Route path="/beta-applications">
        <ProtectedRoute component={BetaApplicationsPage} />
      </Route>
      <Route path="/admin/tenants">
        <ProtectedRoute component={TenantsPage} />
      </Route>
      <Route path="/admin/org-context">
        <ProtectedRoute component={OrgContextPage} />
      </Route>
      <Route path="/admin/organisations">
        <ProtectedRoute component={OrganisationsPage} />
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
      <Route path="/admin/content-library">
        <ProtectedRoute component={ContentLibraryAdminPage} />
      </Route>
      <Route path="/admin/content-review">
        <ProtectedRoute component={ContentReviewPage} />
      </Route>
      <Route path="/backoffice">
        <ProtectedRoute component={BackOfficePage} />
      </Route>
      <Route path="/people/:userId">
        <ProtectedRoute component={MemberReportPage} />
      </Route>
      <Route path="/people">
        <ProtectedRoute component={PeopleReportsPage} />
      </Route>
      {/* Marketing pages - public */}
      <Route path="/how-it-works" component={HowItWorksPage} />
      <Route path="/product" component={ProductPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/beta" component={BetaApplicationPage} />
      <Route path="/methodology" component={MethodologyPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/demo" component={DemoPreviewPage} />
      {/* Company HR AI Assessment routes */}
      <Route path="/company-assessment">
        <ProtectedRoute component={CompanyAssessmentLandingPage} />
      </Route>
      <Route path="/company-assessment/new">
        <ProtectedRoute component={CompanyOnboardingPage} />
      </Route>
      <Route path="/company-assessment/:assessmentId/results">
        <ProtectedRoute component={CompanyAssessmentResultsPage} />
      </Route>
      <Route path="/company-assessment/:assessmentId">
        <ProtectedRoute component={CompanyAssessmentSessionPage} />
      </Route>
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
  const { viewAs } = useViewAs();
  if (!user) return null;
  // Demo role switcher overrides the real role
  if (viewAs === "individual") return <IndividualDashboardV2 />;
  if (viewAs === "manager") return <ManagerDashboardV2 />;
  if (viewAs === "cpo") return <LeaderDashboardV2 />;
  // Fallback: use real role
  const roles = (user as any).roles as string[] ?? [];
  if (roles.includes("platform_super_admin") || roles.includes("tenant_admin")) {
    return <AdminDashboard />;
  }
  if (roles.includes("hr_leader")) {
    return <LeaderDashboardV2 />;
  }
  if (roles.includes("manager")) {
    return <ManagerDashboardV2 />;
  }
  if (roles.includes("auditor")) {
    return <AuditorDashboard />;
  }
  return <IndividualDashboardV2 />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
