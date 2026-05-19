/**
 * Company Profile router
 *
 * Shared org-level facts set by admin. Read by all function engines.
 * Procedures:
 *   get           — fetch current profile (any authed user)
 *   save          — upsert fields with audit trail (admin only)
 *   complete      — mark profile as completed (admin only)
 *   flagField     — function leader flags a field as incorrect
 *   resolveFlag   — admin accepts or dismisses a flag
 *   listFlags     — admin lists open flags
 */
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  companyProfile,
  companyProfileAudit,
  companyProfileFlag,
  rewardPrework,
} from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "../_core/notification";

// ── Zod schemas ───────────────────────────────────────────────────────────────

const CompanyProfileSaveSchema = z.object({
  // Section A
  companyName: z.string().max(120).optional(),
  sector: z.string().max(50).optional(),
  headcount: z.number().int().positive().optional(),
  annualRevenueGbp: z.number().int().nonnegative().optional(),
  annualPayrollCostGbp: z.number().int().nonnegative().optional(),
  geographicFootprint: z.string().max(50).optional(),
  ownershipStructure: z.string().max(50).optional(),
  // Section B
  hris: z.string().max(50).optional(),
  workforceKnowledgePct: z.number().int().min(0).max(100).optional(),
  workforceFrontlinePct: z.number().int().min(0).max(100).optional(),
  workforceBlendedPct: z.number().int().min(0).max(100).optional(),
  materialSalesWorkforce: z.string().max(50).optional(),
  criticalAiDigitalTalentPopulation: z.string().max(50).optional(),
  businessAiAmbition: z.number().int().min(1).max(5).optional(),
  // Section C (conditional)
  fcaSysc19InScope: z.string().max(20).optional(),
  ukEmployeeHeadcount: z.number().int().nonnegative().optional(),
  euEmployeeHeadcount: z.number().int().nonnegative().optional(),
  listingExchange: z.string().max(50).optional(),
});

// ── Helper: write audit rows for changed fields ───────────────────────────────

type DbType = Awaited<ReturnType<typeof getDb>>;
async function writeAuditRows(
  db: DbType,
  tenantId: string,
  userId: string,
  oldProfile: Record<string, unknown> | null,
  newFields: Record<string, unknown>
) {
  const now = Date.now();
  const rows = [];
  for (const [key, newVal] of Object.entries(newFields)) {
    const oldVal = oldProfile ? (oldProfile[key] ?? null) : null;
    const newStr = newVal == null ? null : String(newVal);
    const oldStr = oldVal == null ? null : String(oldVal);
    if (newStr !== oldStr) {
      rows.push({
        id: randomUUID(),
        tenantId,
        fieldName: key,
        oldValue: oldStr,
        newValue: newStr,
        changedByUserId: userId,
        changedAt: now,
      });
    }
  }
  if (rows.length > 0 && db) {
    await db.insert(companyProfileAudit).values(rows);
  }
}

// ── Router ────────────────────────────────────────────────────────────────────

export const companyProfileRouter = router({
  /** Fetch the current company profile for this tenant */
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const [profile] = await db
      .select()
      .from(companyProfile)
      .where(eq(companyProfile.tenantId, ctx.user.tenantId));
    return profile ?? null;
  }),

  /** Save (upsert) company profile fields. Writes audit trail for changed fields. */
  save: protectedProcedure
    .input(CompanyProfileSaveSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const tenantId = ctx.user.tenantId;
      const now = Date.now();

      // Fetch existing for audit diff
      const [existing] = await db
        .select()
        .from(companyProfile)
        .where(eq(companyProfile.tenantId, tenantId));

      const fields = {
        ...input,
        updatedAt: now,
        updatedByUserId: ctx.user.id,
      };

      if (existing) {
        await db
          .update(companyProfile)
          .set(fields)
          .where(eq(companyProfile.tenantId, tenantId));
      } else {
        await db.insert(companyProfile).values({
          tenantId,
          ...fields,
        });
      }

      // Write audit trail
      await writeAuditRows(
        db,
        tenantId,
        ctx.user.id,
        existing as Record<string, unknown> | null,
        input as Record<string, unknown>
      );

      // Material-change detection: if any material field changed, trigger re-assessment
      // on all completed reward pre-works for this tenant
      const MATERIAL_FIELDS = [
        "headcount",
        "sector",
        "hris",
        "businessAiAmbition",
        "fcaSysc19InScope",
        "geographicFootprint",
        "ownershipStructure",
        "annualPayrollCostGbp",
      ] as const;

      const hasMaterialChange = existing && MATERIAL_FIELDS.some((f) => {
        const oldVal = (existing as Record<string, unknown>)[f];
        const newVal = (input as Record<string, unknown>)[f];
        return newVal !== undefined && String(newVal ?? "") !== String(oldVal ?? "");
      });

      if (hasMaterialChange) {
        const [completedPrework] = await db
          .select({ tenantId: rewardPrework.tenantId, reassessmentCount: rewardPrework.reassessmentCount })
          .from(rewardPrework)
          .where(eq(rewardPrework.tenantId, tenantId));

        if (completedPrework) {
          await db
            .update(rewardPrework)
            .set({
              isCompleted: 0,
              completedAt: null,
              reassessmentCount: (completedPrework.reassessmentCount ?? 0) + 1,
              lastReassessedAt: now,
              updatedAt: now,
            })
            .where(eq(rewardPrework.tenantId, tenantId));
        }
      }

      return { ok: true, materialChangeDetected: !!hasMaterialChange };
    }),

  /** Mark company profile as completed (admin action) */
  complete: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const tenantId = ctx.user.tenantId;
    const now = Date.now();

    const [existing] = await db
      .select()
      .from(companyProfile)
      .where(eq(companyProfile.tenantId, tenantId));

    if (!existing) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Company Profile must be saved before completing.",
      });
    }

    await db
      .update(companyProfile)
      .set({ isCompleted: 1, completedAt: now, updatedAt: now })
      .where(eq(companyProfile.tenantId, tenantId));

    return { ok: true };
  }),

  /** Function leader flags a field as incorrect */
  flagField: protectedProcedure
    .input(
      z.object({
        fieldName: z.string().max(100),
        suggestedCorrection: z.string().max(1000).optional(),
        notes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const tenantId = ctx.user.tenantId;
      const now = Date.now();

      await db.insert(companyProfileFlag).values({
        id: randomUUID(),
        tenantId,
        fieldName: input.fieldName,
        flaggedByUserId: ctx.user.id,
        suggestedCorrection: input.suggestedCorrection,
        notes: input.notes,
        status: "open",
        createdAt: now,
      });

      // Notify owner (admin)
      await notifyOwner({
        title: "Company Profile flag raised",
        content: `A user flagged the field "${input.fieldName}" as potentially incorrect. Suggested correction: ${input.suggestedCorrection ?? "none provided"}.`,
      });

      return { ok: true };
    }),

  /** Admin resolves a flag (accept or dismiss) */
  resolveFlag: protectedProcedure
    .input(
      z.object({
        flagId: z.string().uuid(),
        resolution: z.enum(["accepted", "dismissed"]),
        resolveNote: z.string().max(2000).optional(),
        // If accepted, optionally provide the corrected value to apply
        correctedValue: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const tenantId = ctx.user.tenantId;
      const now = Date.now();

      const [flag] = await db
        .select()
        .from(companyProfileFlag)
        .where(
          and(
            eq(companyProfileFlag.id, input.flagId),
            eq(companyProfileFlag.tenantId, tenantId)
          )
        );

      if (!flag) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Flag not found." });
      }

      await db
        .update(companyProfileFlag)
        .set({
          status: input.resolution,
          resolvedByUserId: ctx.user.id,
          resolvedAt: now,
          resolveNote: input.resolveNote,
        })
        .where(eq(companyProfileFlag.id, input.flagId));

      // If accepted and corrected value provided, apply it
      if (input.resolution === "accepted" && input.correctedValue !== undefined) {
        const [existing] = await db
          .select()
          .from(companyProfile)
          .where(eq(companyProfile.tenantId, tenantId));

        const updatePayload: Record<string, unknown> = {
          [flag.fieldName]: input.correctedValue,
          updatedAt: now,
          updatedByUserId: ctx.user.id,
        };

        if (existing) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await db
            .update(companyProfile)
            .set(updatePayload as any)
            .where(eq(companyProfile.tenantId, tenantId));
        }

        await writeAuditRows(
          db,
          tenantId,
          ctx.user.id,
          existing as Record<string, unknown> | null,
          { [flag.fieldName]: input.correctedValue }
        );
      }

      return { ok: true };
    }),

  /** Admin lists all open flags for this tenant */
  listFlags: protectedProcedure
    .input(z.object({ status: z.enum(["open", "accepted", "dismissed"]).optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const tenantId = ctx.user.tenantId;

      const conditions = [eq(companyProfileFlag.tenantId, tenantId)];
      if (input.status) {
        conditions.push(eq(companyProfileFlag.status, input.status));
      }

      return db
        .select()
        .from(companyProfileFlag)
        .where(and(...conditions))
        .orderBy(companyProfileFlag.createdAt);
    }),

  /** Fetch audit trail for this tenant's company profile */
  getAuditTrail: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    return db
      .select()
      .from(companyProfileAudit)
      .where(eq(companyProfileAudit.tenantId, ctx.user.tenantId))
      .orderBy(companyProfileAudit.changedAt);
  }),
});
