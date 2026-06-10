import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// AiQ uses a roles table (userRoles) for RBAC — adminProcedure is an alias for protectedProcedure
// Actual role enforcement is done per-procedure via getUserRoleKeys()
export const adminProcedure = protectedProcedure;

/**
 * strategyCompanyProcedure — guards Company Strategy routes.
 * Requires the tenant to have entitlementStrategyCompany = true.
 * Replaces the old cpoProcedure (which used aiqRole === "reward_leader" as a proxy).
 */
const requireStrategyCompany = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  const ent = ctx.entitlements;
  if (!ent?.strategyCompany) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Company Strategy is not enabled for your organisation. Contact your AiQ administrator.",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const strategyCompanyProcedure = t.procedure.use(requireStrategyCompany);

/**
 * strategyRewardProcedure — guards Reward Strategy routes.
 * Requires the tenant to have entitlementStrategyReward = true.
 */
const requireStrategyReward = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  const ent = ctx.entitlements;
  if (!ent?.strategyReward) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Reward Strategy is not enabled for your organisation. Contact your AiQ administrator.",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const strategyRewardProcedure = t.procedure.use(requireStrategyReward);

/**
 * assessmentProcedure — guards Assessment routes.
 * Requires the tenant to have entitlementAssessment = true.
 */
const requireAssessment = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  const ent = ctx.entitlements;
  if (!ent?.assessment) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Assessment is not enabled for your organisation. Contact your AiQ administrator.",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const assessmentProcedure = t.procedure.use(requireAssessment);

/**
 * cpoProcedure — DEPRECATED. Kept as alias for strategyCompanyProcedure during transition.
 * All new code should use strategyCompanyProcedure directly.
 * @deprecated Use strategyCompanyProcedure instead.
 */
export const cpoProcedure = strategyCompanyProcedure;

/**
 * superUserProcedure — guards platform-level back-office routes.
 * Only users with isPlatformSuperuser === true can access these procedures.
 * This flag is set only via direct SQL — no API path can grant it.
 */
const requireSuperUser = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if (!ctx.user.isPlatformSuperuser) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Platform super-user access required.",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const superUserProcedure = t.procedure.use(requireSuperUser);
