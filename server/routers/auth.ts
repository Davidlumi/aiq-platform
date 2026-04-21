import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb, getUserByEmail, getUserById, getUserRoleKeys } from "../db";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  generateResetToken,
} from "../auth";
import { COOKIE_NAME } from "../../shared/const";
import { users, tenants } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { applyColdStart } from "../ail/coldStart";

export const authRouter = router({
  // Get current user with roles
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    const roles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      firstName: ctx.user.firstName,
      lastName: ctx.user.lastName,
      tenantId: ctx.user.tenantId,
      status: ctx.user.status,
      roles,
      onboardingCompleted: ctx.user.onboardingCompleted ?? false,
      experienceLevel: ctx.user.experienceLevel ?? null,
      aiUsageLevel: ctx.user.aiUsageLevel ?? null,
      jobFunction: ctx.user.jobFunction ?? null,
    };
  }),

  // Complete onboarding wizard — seeds AIL cold start
  completeOnboarding: protectedProcedure
    .input(z.object({
      experienceLevel: z.enum(["junior", "mid", "senior", "principal"]),
      aiUsageLevel: z.enum(["none", "occasional", "regular", "advanced"]),
      jobFunction: z.string().min(1).max(100),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.update(users)
        .set({
          onboardingCompleted: true,
          experienceLevel: input.experienceLevel,
          aiUsageLevel: input.aiUsageLevel,
          jobFunction: input.jobFunction,
          onboardingCompletedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));
      // Seed AIL cold start from onboarding signals (non-blocking)
      // Map auth enum values to coldStart enum values
      const expLevelMap: Record<string, "junior" | "mid" | "senior" | "director" | "executive"> = {
        junior: "junior", mid: "mid", senior: "senior", principal: "director",
      };
      const aiLevelMap: Record<string, "never" | "occasionally" | "regularly" | "daily"> = {
        none: "never", occasional: "occasionally", regular: "regularly", advanced: "daily",
      };
      applyColdStart({
        userId: ctx.user.id,
        tenantId: ctx.user.tenantId,
        experienceLevel: expLevelMap[input.experienceLevel] ?? "mid",
        aiUsageLevel: aiLevelMap[input.aiUsageLevel] ?? "occasionally",
        primaryDomain: input.jobFunction,
        governanceFamiliarity: "moderate",
        selfAssessedStrength: "judgement",
        selfAssessedWeakness: "data_interpretation",
      }).catch(() => {});
      return { success: true };
    }),

  // Login with email + password
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
        tenantSlug: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Resolve tenant
      let tenantId: string;
      if (input.tenantSlug) {
        const tenant = await db
          .select()
          .from(tenants)
          .where(eq(tenants.slug, input.tenantSlug))
          .limit(1);
        if (!tenant[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
        tenantId = tenant[0].id;
      } else {
        // Default to demo tenant for now
        tenantId = "tenant-demo-001";
      }

      const user = await getUserByEmail(tenantId, input.email);
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }

      if (user.status === "suspended" || user.status === "deactivated") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Account is not active" });
      }

      if (!user.passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }

      const valid = await verifyPassword(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }

      // Update last signed in
      await db
        .update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, user.id));

      const token = await createSessionToken({
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
      });

      setSessionCookie(ctx.res, ctx.req, token);

      const roles = await getUserRoleKeys(user.id, user.tenantId);
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
        roles,
      };
    }),

  // Logout
  logout: publicProcedure.mutation(({ ctx }) => {
    clearSessionCookie(ctx.res, ctx.req);
    return { success: true } as const;
  }),

  // Register new user (tenant admin creates users, or self-registration)
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        tenantSlug: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const tenantId = "tenant-demo-001"; // Default tenant for self-registration

      const existing = await getUserByEmail(tenantId, input.email);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
      }

      const passwordHash = await hashPassword(input.password);
      const userId = nanoid();

      await db.insert(users).values({
        id: userId,
        tenantId,
        email: input.email.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
        status: "active",
      });

      // Assign learner role by default
      const { userRoles, roles } = await import("../../drizzle/schema");
      const learnerRole = await db
        .select()
        .from(roles)
        .where(eq(roles.key, "learner"))
        .limit(1);
      if (learnerRole[0]) {
        await db.insert(userRoles).values({
          id: nanoid(),
          tenantId,
          userId,
          roleId: learnerRole[0].id,
        });
      }

      return { success: true, userId };
    }),

  // Request password reset
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const user = await getUserByEmail("tenant-demo-001", input.email);
      // Always return success to avoid email enumeration
      if (!user) return { success: true };

      const token = generateResetToken();
      const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      await db
        .update(users)
        .set({ passwordResetToken: token, passwordResetExpiry: expiry })
        .where(eq(users.id, user.id));

      // In production, send email. For demo, return token in response.
      return { success: true, resetToken: token };
    }),

  // Reset password with token
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const result = await db
        .select()
        .from(users)
        .where(eq(users.passwordResetToken, input.token))
        .limit(1);

      const user = result[0];
      if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset token" });
      }

      const passwordHash = await hashPassword(input.newPassword);
      await db
        .update(users)
        .set({ passwordHash, passwordResetToken: null, passwordResetExpiry: null })
        .where(eq(users.id, user.id));

      return { success: true };
    }),

  // Change password (authenticated)
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      if (!ctx.user.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No password set" });
      }

      const valid = await verifyPassword(input.currentPassword, ctx.user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect" });
      }

      const passwordHash = await hashPassword(input.newPassword);
      await db
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),
});
