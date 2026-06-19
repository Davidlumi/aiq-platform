import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb, getUserByEmail, getUserRoleKeys } from "../db";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  generateResetToken,
} from "../auth";
import { users, tenants } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { applyColdStart } from "../ail/coldStart";
import { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail } from "../email";

export const authRouter = router({
  // Get current user with roles and entitlements
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    const roles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    // Entitlements are loaded per-request in context.ts — no DB query needed
    const entitlements = ctx.entitlements ?? {
      strategyCompany: false,
      strategyReward: false,
      assessment: false,
      assessmentPaid: false,
    };
    // Derive tenantMode from entitlements: reward wins only when strategyReward=true AND strategyCompany=false
    const tenantMode: "cpo" | "reward" = (entitlements.strategyReward && !entitlements.strategyCompany) ? "reward" : "cpo";
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

  // ── Self-serve sign-up (public, no org code required) ─────────────────────────────────
  // Creates a personal tenant + user in one transaction.
  // Account is created with status="pending" and entitlementAssessment=true (free tier).
  // A verification email is sent; the account becomes "active" on verifyEmail.
  selfRegister: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      acceptedTerms: z.literal(true, { message: "You must accept the terms and conditions" }),
      origin: z.string().url().optional(), // frontend passes window.location.origin for verify URL
      turnstileToken: z.string().min(1, "Bot protection token is required"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // C-3: Verify Cloudflare Turnstile token before any DB work.
      // IMPORTANT: The skip is gated on NODE_ENV !== 'production', NOT on key absence.
      // A missing key in production is a misconfiguration and MUST hard-fail — never fail-open.
      const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
      const isProduction = process.env.NODE_ENV === "production";
      if (!turnstileSecret && isProduction) {
        // Hard-fail: bot protection is required in production. Missing key = misconfiguration.
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Bot protection is not configured. Registration is temporarily unavailable.",
        });
      }
      if (turnstileSecret) {
        const cfBody = new URLSearchParams();
        cfBody.append("secret", turnstileSecret);
        cfBody.append("response", input.turnstileToken);
        const cfRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
          method: "POST",
          body: cfBody,
        });
        const cfData = await cfRes.json() as { success: boolean; "error-codes"?: string[] };
        if (!cfData.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Bot protection check failed. Please try again.",
          });
        }
      }
      // If NODE_ENV !== 'production' and no key is set: skip verification (local dev only).

      const normalisedEmail = input.email.toLowerCase().trim();

      // Check if email is already registered across all tenants
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalisedEmail))
        .limit(1);
      if (existing[0]) {
        // Return success to avoid email enumeration — the verification email will not arrive
        return { success: true, requiresVerification: true };
      }

      // Derive a unique personal tenant slug from the email local-part
      const emailLocal = normalisedEmail.split("@")[0].replace(/[^a-z0-9]/g, "-").slice(0, 40);
      let slug = `personal-${emailLocal}`;
      const slugExists = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug)).limit(1);
      if (slugExists[0]) slug = `${slug}-${nanoid(6)}`;

      const tenantId = `tenant-${nanoid(12)}`;
      const userId = nanoid();
      const verificationToken = generateResetToken(); // reuse same secure random helper

      // Create personal tenant with free-tier entitlements
      await db.insert(tenants).values({
        id: tenantId,
        name: `${input.firstName} ${input.lastName}`,
        slug,
        status: "active",
        entitlementAssessment: true,
        entitlementAssessmentPaid: false,
        entitlementStrategyCompany: false,
        entitlementStrategyReward: false,
      });

      const passwordHash = await hashPassword(input.password);

      // Create user with pending status (activated on email verification)
      await db.insert(users).values({
        id: userId,
        tenantId,
        email: normalisedEmail,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
        status: "pending",
        aiqRole: "learner",
        emailVerificationToken: verificationToken,
      });

      // Assign learner role
      const { userRoles, roles } = await import("../../drizzle/schema");
      const learnerRole = await db.select().from(roles).where(eq(roles.key, "learner")).limit(1);
      if (learnerRole[0]) {
        await db.insert(userRoles).values({
          id: nanoid(),
          tenantId,
          userId,
          roleId: learnerRole[0].id,
        });
      }

      // Send verification email (non-blocking)
      const origin = input.origin ?? "https://hraiq.co.uk";
      const verifyUrl = `${origin}/verify-email?token=${verificationToken}`;
      await sendVerificationEmail({
        to: normalisedEmail,
        firstName: input.firstName,
        verifyUrl,
      }).catch(() => { /* non-blocking */ });

      return { success: true, requiresVerification: true };
    }),

  // ── Verify email address ────────────────────────────────────────────────────────────────────────
  // Activates the user account and clears the verification token.
  verifyEmail: publicProcedure
    .input(z.object({
      token: z.string(),
      origin: z.string().url().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const result = await db
        .select()
        .from(users)
        .where(eq(users.emailVerificationToken, input.token))
        .limit(1);

      const user = result[0];
      if (!user) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired verification link. Please request a new one." });
      }

      // Activate account
      await db
        .update(users)
        .set({
          status: "active",
          emailVerificationToken: null,
          emailVerifiedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Send welcome email (non-blocking)
      const origin = input.origin ?? "https://hraiq.co.uk";
      await sendWelcomeEmail({
        to: user.email,
        firstName: user.firstName,
        dashboardUrl: `${origin}/dashboard`,
      }).catch(() => { /* non-blocking */ });

      return { success: true, email: user.email };
    }),

  // ── Resend verification email ─────────────────────────────────────────────────────────────
  resendVerification: publicProcedure
    .input(z.object({
      email: z.string().email(),
      origin: z.string().url().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const normalisedEmail = input.email.toLowerCase().trim();
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, normalisedEmail))
        .limit(1);

      // Always return success to avoid email enumeration
      const user = result[0];
      if (!user || user.status !== "pending") return { success: true };

      // Regenerate token
      const newToken = generateResetToken();
      await db
        .update(users)
        .set({ emailVerificationToken: newToken })
        .where(eq(users.id, user.id));

      const origin = input.origin ?? "https://hraiq.co.uk";
      const verifyUrl = `${origin}/verify-email?token=${newToken}`;
      await sendVerificationEmail({
        to: normalisedEmail,
        firstName: user.firstName,
        verifyUrl,
      }).catch(() => { /* non-blocking */ });

      return { success: true };
    }),
});
