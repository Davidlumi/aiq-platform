import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { useViewAs } from "@/contexts/ViewAsContext";
import { useGate } from "./contexts/GateContext";
import { Loader2 } from "lucide-react";

// Billing
import BillingPage from "./pages/billing/BillingPage";

// Auth pages
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// App shell / dashboard
import AppShell from "./components/AppShell";
import StrategyLayout from "./components/StrategyLayout";

// Role-specific dashboards (v2)
import IndividualDashboardV2 from "./pages/dashboard/IndividualDashboardV2";
import ManagerDashboardV2 from "./pages/dashboard/ManagerDashboardV2";
import LeaderDashboardV2 from "./pages/dashboard/LeaderDashboardV2";
import ImplementationTrackerPage from "./pages/dashboard/ImplementationTrackerPage";
import MaturityProgressionPage from "./pages/dashboard/MaturityProgressionPage";
import ManagerHubPage from "./pages/dashboard/ManagerHubPage";
import ContentRequestsPage from "./pages/dashboard/ContentRequestsPage";
import StrategyOverviewPage from "./pages/strategy/StrategyOverviewPage";
import StrategyDiagnosticPage from "./pages/strategy/StrategyDiagnosticPage";
import StrategyAmbitionPage from "./pages/strategy/StrategyAmbitionPage";
import StrategyPlanPage from "./pages/strategy/StrategyPlanPage";
import StrategyRoadmapPage from "./pages/strategy/StrategyRoadmapPage";
import StrategyRoadmapStagePage from "./pages/strategy/StrategyRoadmapStagePage";
import StrategyInvestmentRiskPage from "./pages/strategy/StrategyInvestmentRiskPage";
import StrategyValuePage from "./pages/strategy/StrategyValuePage";
import BusinessCasePage from "./pages/strategy/BusinessCasePage";
import CapabilityPage from "./pages/strategy/CapabilityPage";
import StrategyMeasurementPage from "./pages/strategy/StrategyMeasurementPage";
import StrategyDraftPage from "./pages/strategy/StrategyDraftPage";
import ReviewSessionPage from "./pages/strategy/ReviewSessionPage";
import BoardReportPage from "./pages/strategy/BoardReportPage";
import StrategySummaryPage from "./pages/strategy/StrategySummaryPage";
import StrategyVisionPage from "./pages/strategy/StrategyVisionPage";
import StrategyStrategyPage from "./pages/strategy/StrategyStrategyPage";
import CompanyOnboardingPage from "./pages/company/CompanyOnboardingPage";
import CompanyAssessmentSessionPage from "./pages/company/CompanyAssessmentSessionPage";
import CompanyAssessmentResultsPage from "./pages/company/CompanyAssessmentResultsPage";
import CompanyAssessmentLandingPage from "./pages/company/CompanyAssessmentLandingPage";
import CompanyAssessmentHomePage from "./pages/company/CompanyAssessmentHomePage";
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
import ModulesPage from "./pages/learning/ModulesPage";
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
import InitiativeDiscoveryPage from "./pages/backoffice/InitiativeDiscoveryPage";
import CompanyProfilePage from "./pages/admin/CompanyProfilePage";
import RewardPreworkPage from "./pages/strategy/RewardPreworkPage";
import RewardVisionPage from "./pages/strategy/RewardVisionPage";
import RewardStrategyPage from "./pages/strategy/RewardStrategyPage";
import RewardPrinciplesPage from "./pages/strategy/RewardPrinciplesPage";
import RewardInitiativesPage from "./pages/strategy/RewardInitiativesPage";
import RewardBusinessCasePage from "./pages/strategy/RewardBusinessCasePage";
import RewardSuccessMeasuresPage from "./pages/strategy/RewardSuccessMeasuresPage";
import RewardCapabilityPage from "./pages/strategy/RewardCapabilityPage";
import RewardReviewPage from "./pages/strategy/RewardReviewPage";
import RewardOutputsPage from "./pages/strategy/RewardOutputsPage";
import SignalWatchPage from "./pages/strategy/SignalWatchPage";
import SignalsAdminPage from "./pages/admin/SignalsAdminPage";
import ComponentKitPage from "./pages/admin/ComponentKitPage";
// Marketing pages (public)
import MarketingPage from "./pages/marketing/MarketingPage";
import HowItWorksPage from "./pages/marketing/HowItWorksPage";
import ProductPage from "./pages/marketing/ProductPage";
import AboutPage from "./pages/marketing/AboutPage";
import BetaApplicationPage from "./pages/marketing/BetaApplicationPage";
import PricingPage from "./pages/marketing/PricingPage";
import DemoPreviewPage from "./pages/marketing/DemoPreviewPage";
import ProductTourPage from "./pages/marketing/ProductTourPage";
import CaseStudiesPage from "./pages/marketing/CaseStudiesPage";
import ROICalculatorPage from "./pages/marketing/ROICalculatorPage";
import ComparePage from "./pages/marketing/ComparePage";
import MethodologyPage from "./pages/methodology/MethodologyPage";
import PeopleReportsPage from "./pages/people/PeopleReportsPage";
import MemberReportPage from "./pages/people/MemberReportPage";
import ConversationPromptsPage from "./pages/manager/ConversationPromptsPage";
import TeamProgressPage from "./pages/manager/TeamProgressPage";

/**
 * StrategyCompanyRoute — blocks tenants without strategyCompany entitlement.
 * Redirects to /strategy/reward-prework when only strategyReward is set.
 * Redirects to /dashboard when neither entitlement is set.
 * Kept as CpoProtectedRouteWithStrategyNav for backwards compat with route declarations.
 */
function CpoProtectedRouteWithStrategyNav({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;

  const entitlements = (user as any)?.entitlements as {
    strategyCompany?: boolean;
    strategyReward?: boolean;
    assessment?: boolean;
  } | undefined;

  // Reward-only tenants are redirected to their reward journey entry point
  if (!entitlements?.strategyCompany && entitlements?.strategyReward) {
    return <Redirect to="/strategy/reward-prework" />;
  }
  // No strategy entitlement at all — send to dashboard
  if (!entitlements?.strategyCompany) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <AppShell>
      <StrategyLayout>
        <Component />
      </StrategyLayout>
    </AppShell>
  );
}

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

/** Protected route with strategy top nav — wraps AppShell content with StrategyLayout */
function ProtectedRouteWithStrategyNav({
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

  return (
    <AppShell>
      <StrategyLayout>
        <Component />
      </StrategyLayout>
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

/**
 * AssessmentRoute — blocks tenants without assessment entitlement (Decision 4.7).
 * Redirects to /dashboard if assessment entitlement is absent.
 */
function AssessmentRoute({
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
  if (!user) return <Redirect to="/login" />;
  const entitlements = (user as any)?.entitlements as {
    strategyCompany?: boolean;
    strategyReward?: boolean;
    assessment?: boolean;
  } | undefined;
  if (!entitlements?.assessment) {
    return <Redirect to="/dashboard" />;
  }
  return (
    <AppShell>
      <Component />
    </AppShell>
  );
}

/**
 * KnowledgeRoute — blocks tenants without any strategy entitlement (Decision 4.7).
 * Knowledge (modules + coach) requires strategyCompany OR strategyReward.
 * Redirects to /dashboard if neither is set.
 */
function KnowledgeRoute({
  component: Component,
  fullscreen = false,
}: {
  component: React.ComponentType;
  fullscreen?: boolean;
}) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }
  if (!user) return <Redirect to="/login" />;
  const entitlements = (user as any)?.entitlements as {
    strategyCompany?: boolean;
    strategyReward?: boolean;
    assessment?: boolean;
  } | undefined;
  const hasKnowledge = entitlements?.strategyCompany || entitlements?.strategyReward;
  if (!hasKnowledge) {
    return <Redirect to="/dashboard" />;
  }
  if (fullscreen) return <Component />;
  return (
    <AppShell>
      <Component />
    </AppShell>
  );
}

/**
 * PeopleRoute — blocks tenants without strategyCompany entitlement (Decision 6).
 * /people is a CPO-tier feature; reward-only and assessment-only tenants are redirected.
 */
function PeopleRoute({
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
  if (!user) return <Redirect to="/login" />;
  const entitlements = (user as any)?.entitlements as {
    strategyCompany?: boolean;
    strategyReward?: boolean;
    assessment?: boolean;
  } | undefined;
  if (!entitlements?.strategyCompany) {
    return <Redirect to="/dashboard" />;
  }
  return (
    <AppShell>
      <Component />
    </AppShell>
  );
}

/** Scroll to top on route change */
function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function Router() {
  return (
    <>
    <ScrollToTop />
    <Switch>
      {/* Public auth routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
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
        <KnowledgeRoute component={CoachPage} fullscreen />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={RoleDashboard} />
      </Route>
      <Route path="/assessment">
        <AssessmentRoute component={AssessmentPage} />
      </Route>
      <Route path="/assessment/results">
        <ProtectedRoute component={AssessmentResultsPage} />
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
      <Route path="/billing">
        <ProtectedRoute component={BillingPage} />
      </Route>
      <Route path="/modules">
        <KnowledgeRoute component={ModulesPage} />
      </Route>
      {/* Legacy routes — redirect to unified /modules page */}
      <Route path="/library">
        <Redirect to="/modules" />
      </Route>
      <Route path="/knowledge-base">
        <Redirect to="/modules" />
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
      {/* STRATEGY HIDDEN (Phase 1) — all /strategy/* routes redirect to /dashboard.
          Seam D fix: these were previously ProtectedRoute (auth-only) which showed page shell
          before tRPC calls failed. Now they redirect immediately at the route level.
          Reversibility: restore CpoProtectedRouteWithStrategyNav components above.
      */}
      <Route path="/strategy">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/diagnostic">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/principles">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/ambition">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/plan">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/roadmap/detail">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/roadmap">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/investment-risk">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/value">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/business-case">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/capability">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/measures">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/measurement">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/review">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/board-report">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/signal-watch">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/summary">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/draft">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/vision">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/strategy">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/ai-strategy">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/ai-strategy/assessment">
        <Redirect to="/dashboard" />
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
      <Route path="/admin/signals">
        <ProtectedRoute component={SignalsAdminPage} />
      </Route>
      <Route path="/admin/component-kit">
        <ProtectedRoute component={ComponentKitPage} />
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
      {/* COMPANY PROFILE HIDDEN (Phase 1) — strategy-only feature */}
      <Route path="/company-profile">
        <Redirect to="/dashboard" />
      </Route>
      {/* REWARD ROUTES HIDDEN (Phase 1) — Seam D fix: redirect immediately */}
      <Route path="/strategy/reward-prework">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/reward-vision">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/reward-strategy">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/reward-principles">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/reward-initiatives">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/reward-success-measures">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/reward-business-case">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/reward-capability">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/reward-review">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/strategy/reward-outputs">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/backoffice/initiative-discovery">
        <ProtectedRoute component={InitiativeDiscoveryPage} />
      </Route>
      <Route path="/backoffice">
        <ProtectedRoute component={BackOfficePage} />
      </Route>
      <Route path="/people/:userId">
        <PeopleRoute component={MemberReportPage} />
      </Route>
      <Route path="/people">
        <PeopleRoute component={PeopleReportsPage} />
      </Route>
      {/* Marketing pages - public */}
      <Route path="/how-it-works" component={HowItWorksPage} />
      <Route path="/product" component={ProductPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/beta" component={BetaApplicationPage} />
      <Route path="/methodology" component={MethodologyPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/demo" component={DemoPreviewPage} />
      <Route path="/tour" component={ProductTourPage} />
      <Route path="/case-studies" component={CaseStudiesPage} />
      <Route path="/roi-calculator" component={ROICalculatorPage} />
      <Route path="/compare" component={ComparePage} />
      {/* COMPANY ASSESSMENT HIDDEN (Phase 1) — strategy-only feature */}
      <Route path="/company-assessment">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/company-assessment/session">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/company-assessment/new">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/company-assessment/:assessmentId/results">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/company-assessment/:assessmentId">
        <Redirect to="/dashboard" />
      </Route>
      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
    </>
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

  const entitlements = (user as any)?.entitlements as {
    strategyCompany?: boolean;
    strategyReward?: boolean;
    assessment?: boolean;
  } | undefined;

  // Assessment-only (self-serve) users: always show individual dashboard
  if (!entitlements?.strategyCompany && !entitlements?.strategyReward) {
    return <IndividualDashboardV2 />;
  }
  // Reward-only tenant: reward routes are currently hidden (Phase 1).
  // Show the individual dashboard as the landing experience to avoid
  // an infinite redirect loop (/dashboard → /strategy/reward-prework → /dashboard).
  if (!entitlements?.strategyCompany && entitlements?.strategyReward) {
    return <IndividualDashboardV2 />;
  }
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
    <div className="aiq">
      <ErrorBoundary>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster position="top-center" />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </div>
  );
}

export default App;
