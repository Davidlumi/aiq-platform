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
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { applyColdStart } from "../ail/coldStart";
import { sendPasswordResetEmail } from "../email";

export const authRouter = router({
  // Get current user with roles and entitlements
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    const roles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    // Fetch tenant mode (transitional) and entitlements from ctx (loaded in context.ts)
    const db = await getDb();
    let tenantMode: "cpo" | "reward" = "cpo";
    if (db) {
      const tenantRow = await db.select({ mode: tenants.mode }).from(tenants).where(eq(tenants.id, ctx.user.tenantId)).limit(1);
      tenantMode = tenantRow[0]?.mode ?? "cpo";
    }
    const entitlements = ctx.entitlements ?? {
      strategyCompany: false,
      strategyReward: false,
      assessment: false,
    };
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
      aiqRole: ctx.user.aiqRole ?? "cpo",
      tenantMode,
      isPlatformSuperuser: ctx.user.isPlatformSuperuser ?? false,
      entitlements,
    };
  }),

  // Complete onboarding wizard — seeds AIL cold start
  completeOnboarding: protectedProcedure
    .input(z.object({
      experienceLevel: z.enum(["junior", "mid", "senior", "principal"]),
      aiUsageLevel: z.enum(["none", "occasional", "regular", "advanced"]),
      jobFunction: z.string().min(1).max(100),
      seniorityLevel: z.string().max(50).optional(),
      sector: z.string().max(100).optional(),
      aiToolsUsed: z.string().optional(),
      roleFamily: z.string().max(100).optional(),
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
          seniorityLevel: input.seniorityLevel ?? null,
          sector: input.sector ?? null,
          aiToolsUsed: input.aiToolsUsed ?? null,
          roleFamily: input.roleFamily ?? null,
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
        selfAssessedStrength: "ai_output_evaluation",
        selfAssessedWeakness: "ai_change_leadership",
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

      // Resolve tenant (case-insensitive slug lookup)
      let tenantId: string;
      if (input.tenantSlug) {
        const normalised = input.tenantSlug.trim().toLowerCase();
        const tenant = await db
          .select()
          .from(tenants)
          .where(sql`LOWER(${tenants.slug}) = ${normalised}`)
          .limit(1);
        if (!tenant[0]) throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organisation code not recognised. Please check the code provided by your administrator.",
        });
        tenantId = tenant[0].id;
      } else {
        // No tenant slug provided — require it
        throw new TRPCError({ code: "BAD_REQUEST", message: "Organisation code is required" });
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
        isPlatformSuperuser: user.isPlatformSuperuser ?? false,
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

      // Resolve tenant from slug for self-registration
      if (!input.tenantSlug) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Organisation code is required" });
      }
      const normalisedSlug = input.tenantSlug.trim().toLowerCase();
      const tenantRow = await db
        .select()
        .from(tenants)
        .where(sql`LOWER(${tenants.slug}) = ${normalisedSlug}`)
        .limit(1);
      if (!tenantRow[0]) throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organisation code not recognised. Please check the code provided by your administrator.",
      });
      const tenantId = tenantRow[0].id;

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

      // Search across all tenants for password reset (email must be unique per tenant, but we search broadly)
      const allUserRows = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .limit(1);
      const user = allUserRows[0] ?? null;
      // Always return success to avoid email enumeration
      if (!user) return { success: true };

      const token = generateResetToken();
      const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      await db
        .update(users)
        .set({ passwordResetToken: token, passwordResetExpiry: expiry })
        .where(eq(users.id, user.id));

      // Send password reset email (silently skips if RESEND_API_KEY not configured)
      const origin = process.env.VITE_OAUTH_PORTAL_URL
        ? process.env.VITE_OAUTH_PORTAL_URL.replace(/\/oauth.*$/, "")
        : "https://hraiq.co.uk";
      const resetUrl = `${origin}/reset-password?token=${token}`;
      await sendPasswordResetEmail({
        to: user.email,
        firstName: user.firstName ?? "",
        resetUrl,
      }).catch(() => { /* non-blocking — token is still valid even if email fails */ });
      return { success: true };
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
