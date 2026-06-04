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
 * cpoProcedure — guards CPO-only strategy routes.
 * Reward-mode users (aiqRole === "reward_leader") are blocked with FORBIDDEN.
 * This is a hide-not-delete guard: the data still exists, the route is simply not accessible.
 */
const requireCpoMode = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if (ctx.user.aiqRole === "reward_leader") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This feature is only available in CPO mode. Switch to the Reward strategy journey to continue.",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const cpoProcedure = t.procedure.use(requireCpoMode);

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
