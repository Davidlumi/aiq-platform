/**
 * AiQ Beta Programme — Waitlist / Application Router
 *
 * Public:
 *   waitlist.apply   — submit a company beta application (validates hrTeamSize >= 10)
 *
 * Admin-only:
 *   waitlist.list    — list all applications with optional status filter
 *   waitlist.update  — update application status and notes
 *   waitlist.stats   — aggregate counts by status
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb, getUserRoleKeys } from "../db";
import { betaApplications } from "../../drizzle/schema";
import { notifyOwner } from "../_core/notification";

// ─── Validation schemas ───────────────────────────────────────────────────────

const SECTORS = [
  "Financial Services",
  "Healthcare",
  "Retail",
  "Manufacturing",
  "Technology",
  "Financial Technology",
  "Professional Services",
  "Logistics & Supply Chain",
  "Banking",
  "Public Sector / Government",
  "Education",
  "Energy & Utilities",
  "Luxury Retail",
  "IT Services",
  "Other",
] as const;

const COMPANY_SIZES = [
  "1-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5001-10000",
  "10001-50000",
  "50000+",
] as const;

const APPLICATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "waitlisted",
] as const;

const applySchema = z.object({
  contactFirstName: z.string().min(1).max(100),
  contactLastName:  z.string().min(1).max(100),
  contactEmail:     z.string().email().max(255),
  contactTitle:     z.string().min(1).max(150),
  companyName:      z.string().min(1).max(200),
  sector:           z.enum(SECTORS),
  companySize:      z.enum(COMPANY_SIZES),
  hrTeamSize:       z.number().int().min(1).max(100000),
  useCase:          z.string().min(20).max(2000),
  currentAiTools:   z.string().max(500).optional(),
  motivation:       z.string().min(20).max(2000),
  linkedinUrl:      z.string().url().max(500).optional().or(z.literal("")),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const waitlistRouter = router({
  /**
   * Submit a company beta application.
   * Returns { eligible: false } when hrTeamSize < 10 — does NOT throw,
   * so the frontend can show a friendly ineligibility message.
   */
  submit: publicProcedure
    .input(applySchema)
    .mutation(async ({ input }) => {
      const now = Math.floor(Date.now() / 1000);

      // Eligibility gate
      if (input.hrTeamSize < 10) {
        return {
          eligible: false,
          message:
            "The free beta programme is open to organisations with at least 10 HR professionals. " +
            "We will be launching a self-serve tier for smaller teams later this year — " +
            "we have noted your interest.",
        };
      }

      // Duplicate check
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const existing = await dbConn
        .select({ id: betaApplications.id, status: betaApplications.status })
        .from(betaApplications)
        .where(eq(betaApplications.contactEmail, input.contactEmail.toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        const app = existing[0];
        return {
          eligible: true,
          duplicate: true,
          status: app.status,
          message:
            app.status === "approved"
              ? "Your organisation has already been approved for the beta programme. Check your inbox for onboarding details."
              : app.status === "waitlisted"
              ? "Your organisation is already on our waitlist. We will be in touch when a cohort place becomes available."
              : "We already have an application from your organisation under review. We will be in touch shortly.",
        };
      }

      // Insert
      await dbConn.insert(betaApplications).values({
        contactFirstName: input.contactFirstName.trim(),
        contactLastName:  input.contactLastName.trim(),
        contactEmail:     input.contactEmail.toLowerCase().trim(),
        contactTitle:     input.contactTitle.trim(),
        companyName:      input.companyName.trim(),
        sector:           input.sector,
        companySize:      input.companySize,
        hrTeamSize:       input.hrTeamSize,
        useCase:          input.useCase.trim(),
        currentAiTools:   input.currentAiTools?.trim() ?? null,
        motivation:       input.motivation.trim(),
        linkedinUrl:      input.linkedinUrl?.trim() || null,
        status:           "pending",
        notes:            null,
        createdAt:        now,
        updatedAt:        now,
      });

      // Notify owner
      await notifyOwner({
        title: `New Beta Application — ${input.companyName}`,
        content:
          `**Contact:** ${input.contactFirstName} ${input.contactLastName} (${input.contactTitle})\n` +
          `**Company:** ${input.companyName} · ${input.sector} · ${input.companySize} employees\n` +
          `**HR Team Size:** ${input.hrTeamSize}\n` +
          `**Email:** ${input.contactEmail}\n\n` +
          `**Use Case:** ${input.useCase.substring(0, 200)}${input.useCase.length > 200 ? "…" : ""}`,
      }).catch(() => {
        // Non-critical — don't fail the application if notification fails
      });

      return {
        eligible: true,
        duplicate: false,
        status: "pending",
        message:
          "Thank you — your application has been received. " +
          "We review applications within 3 business days and will be in touch by email.",
      };
    }),

  /**
   * List all applications. Admin-only.
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum([...APPLICATION_STATUSES, "all"]).default("all"),
        limit:  z.number().int().min(1).max(200).default(100),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const rows = await db
        .select()
        .from(betaApplications)
        .orderBy(desc(betaApplications.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const filtered =
        input.status === "all"
          ? rows
          : rows.filter((r: typeof rows[0]) => r.status === input.status);

      return filtered;
    }),

  /**
   * Update application status and/or notes. Admin-only.
   */
  update: protectedProcedure
    .input(
      z.object({
        id:     z.number().int().positive(),
        status: z.enum(APPLICATION_STATUSES).optional(),
        notes:  z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => ["platform_super_admin", "tenant_admin"].includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const now = Math.floor(Date.now() / 1000);
      const updates: Record<string, unknown> = { updatedAt: now };
      if (input.status !== undefined) updates.status   = input.status;
      if (input.notes  !== undefined) updates.notes    = input.notes;

      await db
        .update(betaApplications)
        .set(updates)
        .where(eq(betaApplications.id, input.id));

      return { success: true };
    }),

  /**
   * Aggregate counts by status. Admin-only.
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    if (!myRoles.some(r => ["platform_super_admin", "tenant_admin"].includes(r))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const rows = await db
      .select({
        status:    betaApplications.status,
        id:        betaApplications.id,
      })
      .from(betaApplications);

    const counts = { pending: 0, approved: 0, rejected: 0, waitlisted: 0, total: rows.length };
    for (const r of rows) {
      const s = r.status as string;
      if (s in counts) (counts as Record<string, number>)[s]++;
    }
    return counts;
  }),
});
