import { router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { authRouter } from "./routers/auth";
import { tenantRouter } from "./routers/tenant";
import { usersRouter } from "./routers/users";
import { assessmentRouter } from "./routers/assessment";
import { learningRouter } from "./routers/learning";
import { simulationRouter } from "./routers/simulation";
import { scoringRouter } from "./routers/scoring";
import { policyRouter } from "./routers/policy";
import { reportRouter } from "./routers/report";
import { auditRouter } from "./routers/audit";
import { dashboardRouter } from "./routers/dashboard";
import { contentRouter } from "./routers/content";
import { intelligenceRouter } from "./routers/intelligence";
import { backofficeRouter } from "./routers/backoffice";
import { waitlistRouter } from "./routers/waitlist";
import { adaptiveLearningRouter } from "./routers/adaptiveLearning";
import { organisationRouter } from "./routers/organisation";
import { dashboardV2Router } from "./routers/dashboardV2";
import { peopleRouter } from "./routers/people";
import { strategyRouter } from "./routers/strategy";
import { companyAssessmentRouter } from "./routers/companyAssessment";
import { coachRouter } from "./routers/coach";
import { contentLibraryRouter } from "./routers/contentLibrary";
import { operationalMaturityRouter } from "./routers/operationalMaturity";
import { contentReviewRouter } from "./routers/contentReview";
import { hwgtRouter } from "./routers/hwgt";
import { backgroundInputsRouter } from "./routers/backgroundInputs";
import { gateRouter } from "./routers/gate";
import { companyProfileRouter } from "./routers/companyProfile";
import { rewardPreworkRouter } from "./routers/rewardPrework";
import { rewardInitiativesRouter } from "./routers/rewardInitiatives";
import { rewardVisionRouter } from "./routers/rewardVision";
import { rewardStrategyRouter } from "./routers/rewardStrategy";
import { rewardPrinciplesRouter } from "./routers/rewardPrinciples";
import { rewardBusinessCaseRouter } from "./routers/rewardBusinessCase";
import { rewardOutputsRouter } from "./routers/rewardOutputs";
import { rewardSuccessMeasuresRouter } from "./routers/rewardSuccessMeasures";
import { rewardCapabilityAssessmentRouter } from "./routers/rewardCapabilityAssessment";
import { rewardReviewRouter } from "./routers/rewardReview";
import { initiativeDiscoveryRouter } from "./routers/initiativeDiscovery";
import { leadsRouter } from "./routers/leads";
import { assumptionsRouter } from "./routers/assumptions";
import { signalsRouter } from "./routers/signals";
export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  tenant: tenantRouter,
  users: usersRouter,
  assessment: assessmentRouter,
  learning: learningRouter,
  adaptiveLearning: adaptiveLearningRouter,
  simulation: simulationRouter,
  scoring: scoringRouter,
  policy: policyRouter,
  report: reportRouter,
  audit: auditRouter,
  dashboard: dashboardRouter,
  content: contentRouter,
  intelligence: intelligenceRouter,
  backoffice: backofficeRouter,
  waitlist: waitlistRouter,
  organisation: organisationRouter,
  dashboardV2: dashboardV2Router,
  people: peopleRouter,
  strategy: strategyRouter,
  companyAssessment: companyAssessmentRouter,
  coach: coachRouter,
  contentLibrary: contentLibraryRouter,
  operationalMaturity: operationalMaturityRouter,
  contentReview: contentReviewRouter,
  hwgt: hwgtRouter,
  backgroundInputs: backgroundInputsRouter,
  gate: gateRouter,
  companyProfile: companyProfileRouter,
  rewardPrework: rewardPreworkRouter,
  rewardInitiatives: rewardInitiativesRouter,
  rewardVision: rewardVisionRouter,
  rewardStrategy: rewardStrategyRouter,
  rewardPrinciples: rewardPrinciplesRouter,
  rewardBusinessCase: rewardBusinessCaseRouter,
  rewardOutputs: rewardOutputsRouter,
  rewardSuccessMeasures: rewardSuccessMeasuresRouter,
  rewardCapabilityAssessment: rewardCapabilityAssessmentRouter,
  rewardReview: rewardReviewRouter,
  initiativeDiscovery: initiativeDiscoveryRouter,
  leads: leadsRouter,
  assumptions: assumptionsRouter,
  signals: signalsRouter,
});

export type AppRouter = typeof appRouter;
