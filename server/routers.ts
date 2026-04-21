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
export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  tenant: tenantRouter,
  users: usersRouter,
  assessment: assessmentRouter,
  learning: learningRouter,
  simulation: simulationRouter,
  scoring: scoringRouter,
  policy: policyRouter,
  report: reportRouter,
  audit: auditRouter,
  dashboard: dashboardRouter,
  content: contentRouter,
});

export type AppRouter = typeof appRouter;
