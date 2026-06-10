/**
 * Initiative Discovery & Library Management Router
 *
 * Staff-only (super_admin) procedures for:
 * - Triggering discovery scans
 * - Reviewing candidate initiatives (accept/reject/edit)
 * - Adding accepted initiatives to the canonical library
 * - Viewing scan history and candidate queue
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { eq, desc, and, sql } from "drizzle-orm";
import { strategyCompanyProcedure as protectedProcedure, superUserProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  discoveryScans,
  discoveryCandidates,
  auditLogs,
  roles,
  userRoles,
} from "../../drizzle/schema";
import {
  runDiscoveryScan,
  deduplicateCandidate,
  type DiscoveryCandidate,
} from "../services/initiativeDiscovery";
import { assertLLMRateLimit } from "../_core/llmRateLimit";

// ─── RBAC Helper ─────────────────────────────────────────────────────────────

// assertSuperAdmin removed — all procedures now use superUserProcedure middleware

// ─── Router ──────────────────────────────────────────────────────────────────

export const initiativeDiscoveryRouter = router({
  // ── Scan History ────────────────────────────────────────────────────────────
  listScans: superUserProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const limit = input?.limit ?? 20;
      const scans = await db
        .select()
        .from(discoveryScans)
        .orderBy(desc(discoveryScans.startedAt))
        .limit(limit);

      return scans;
    }),

  // ── Trigger Discovery Scan ──────────────────────────────────────────────────
  triggerScan: superUserProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await assertLLMRateLimit(ctx.user.id);

    const scanId = nanoid();
    const now = Date.now();

    // Create scan record
    await db.insert(discoveryScans).values({
      id: scanId,
      triggeredBy: ctx.user.id,
      status: "running",
      startedAt: now,
    });

    // Run discovery in background (non-blocking)
    runDiscoveryAndPersist(scanId, ctx.user.id, db).catch((err) => {
      console.error("[Discovery] Scan failed:", err);
    });

    // Audit log
    await db.insert(auditLogs).values({
      id: nanoid(),
      tenantId: ctx.user.tenantId,
      actorUserId: ctx.user.id,
      action: "initiative_discovery_scan_triggered",
      targetType: "discovery_scan",
      targetId: scanId,
      metadataJson: { triggeredAt: now },
    });

    return { scanId, status: "running" };
  }),

  // ── Candidate Queue ─────────────────────────────────────────────────────────
  listCandidates: superUserProcedure
    .input(
      z.object({
        status: z.enum(["pending", "accepted", "rejected", "edited"]).optional(),
        scanId: z.string().max(36).optional(),
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const conditions = [];
      if (input?.status) conditions.push(eq(discoveryCandidates.status, input.status));
      if (input?.scanId) conditions.push(eq(discoveryCandidates.scanId, input.scanId));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const limit = input?.limit ?? 50;

      const candidates = await db
        .select()
        .from(discoveryCandidates)
        .where(whereClause)
        .orderBy(desc(discoveryCandidates.createdAt))
        .limit(limit);

      return candidates;
    }),

  // ── Assess Candidate (Accept/Reject/Edit) ───────────────────────────────────
  assessCandidate: superUserProcedure
    .input(
      z.object({
        candidateId: z.string().max(36),
        decision: z.enum(["accepted", "rejected", "edited"]),
        note: z.string().max(500).optional(),
        // If edited, allow overriding fields
        editedName: z.string().max(200).optional(),
        editedDescription: z.string().max(2000).optional(),
        editedScope: z.enum(["cpo", "reward", "both"]).optional(),
        editedCategory: z.string().max(60).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [candidate] = await db
        .select()
        .from(discoveryCandidates)
        .where(eq(discoveryCandidates.id, input.candidateId))
        .limit(1);

      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not found" });
      }

      if (candidate.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Candidate already assessed as "${candidate.status}"`,
        });
      }

      const now = Date.now();
      const updateData: Record<string, unknown> = {
        status: input.decision,
        assessedBy: ctx.user.id,
        assessedAt: now,
        assessmentNote: input.note || null,
      };

      // If edited, update the candidate fields
      if (input.decision === "edited") {
        if (input.editedName) updateData.name = input.editedName;
        if (input.editedDescription) updateData.description = input.editedDescription;
        if (input.editedScope) updateData.suggestedScope = input.editedScope;
        if (input.editedCategory) updateData.suggestedCategory = input.editedCategory;
      }

      await db
        .update(discoveryCandidates)
        .set(updateData)
        .where(eq(discoveryCandidates.id, input.candidateId));

      // Audit log
      await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        actorUserId: ctx.user.id,
        action: `initiative_candidate_${input.decision}`,
        targetType: "discovery_candidate",
        targetId: input.candidateId,
        metadataJson: {
          decision: input.decision,
          note: input.note,
          candidateName: candidate.name,
        },
      });

      return { success: true, candidateId: input.candidateId, decision: input.decision };
    }),

  // ── Add to Library ──────────────────────────────────────────────────────────
  addToLibrary: superUserProcedure
    .input(
      z.object({
        candidateId: z.string().max(36),
        // Final initiative definition fields
        initiativeId: z.string().max(100).regex(/^[a-z][a-z0-9_]*$/),
        label: z.string().max(200),
        description: z.string().max(2000),
        category: z.string().max(60),
        functionScope: z.enum(["cpo", "reward", "both"]),
        phase: z.number().min(1).max(3),
        timeToValueMonths: z.object({ min: z.number(), max: z.number() }),
        y1CostRange: z.object({ low: z.number(), high: z.number() }),
        valueFormulaKey: z.string().max(100),
        prerequisites: z.array(z.string().max(200)).default([]),
        vendorLandscape: z.array(z.string().max(200)).default([]),
        coDeployments: z.array(z.string().max(100)).default([]),
        phaseRationale: z.string().max(500).default(""),
        caseStudyAnchor: z.string().max(200).default(""),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify candidate exists and is accepted/edited
      const [candidate] = await db
        .select()
        .from(discoveryCandidates)
        .where(eq(discoveryCandidates.id, input.candidateId))
        .limit(1);

      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not found" });
      }

      if (candidate.status !== "accepted" && candidate.status !== "edited") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Candidate must be accepted or edited before adding to library",
        });
      }

      if (candidate.addedInitiativeId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Candidate already added to library",
        });
      }

      // Check for ID collision in existing library
      const { INITIATIVE_LIBRARY } = await import("../../shared/initiativeLibrary");
      const existing = INITIATIVE_LIBRARY.find((i) => i.id === input.initiativeId);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Initiative ID "${input.initiativeId}" already exists in library`,
        });
      }

      // Mark candidate as added
      await db
        .update(discoveryCandidates)
        .set({ addedInitiativeId: input.initiativeId })
        .where(eq(discoveryCandidates.id, input.candidateId));

      // Audit log
      await db.insert(auditLogs).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        actorUserId: ctx.user.id,
        action: "initiative_added_to_library",
        targetType: "initiative",
        targetId: input.initiativeId,
        metadataJson: {
          candidateId: input.candidateId,
          label: input.label,
          category: input.category,
          functionScope: input.functionScope,
          sourceUrls: candidate.sourceUrls,
          addedBy: ctx.user.id,
          addedAt: Date.now(),
        },
      });

      // Return the initiative definition for the caller to append to the library file
      // (actual file modification is a manual step — this returns the JSON block)
      return {
        success: true,
        initiativeDefinition: {
          id: input.initiativeId,
          label: input.label,
          description: input.description,
          category: input.category,
          functionScope: input.functionScope,
          phase: input.phase,
          timeToValueMonths: input.timeToValueMonths,
          y1CostRange: input.y1CostRange,
          valueFormulaKey: input.valueFormulaKey,
          prerequisites: input.prerequisites,
          vendorLandscape: input.vendorLandscape,
          coDeployments: input.coDeployments,
          phaseRationale: input.phaseRationale,
          caseStudyAnchor: input.caseStudyAnchor,
          // Provenance metadata
          _provenance: {
            discoveredAt: candidate.createdAt,
            sourceUrls: candidate.sourceUrls,
            scanId: candidate.scanId,
            assessedBy: candidate.assessedBy,
            assessedAt: candidate.assessedAt,
          },
        },
      };
    }),

  // ── Stats ───────────────────────────────────────────────────────────────────
  stats: superUserProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [scanCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(discoveryScans);

    const [candidateStats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        pending: sql<number>`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`,
        accepted: sql<number>`SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END)`,
        rejected: sql<number>`SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END)`,
        edited: sql<number>`SUM(CASE WHEN status = 'edited' THEN 1 ELSE 0 END)`,
      })
      .from(discoveryCandidates);

    return {
      totalScans: scanCount?.count ?? 0,
      librarySize: (await import("../../shared/initiativeLibrary")).INITIATIVE_LIBRARY.length,
      candidates: {
        total: candidateStats?.total ?? 0,
        pending: candidateStats?.pending ?? 0,
        accepted: candidateStats?.accepted ?? 0,
        rejected: candidateStats?.rejected ?? 0,
        edited: candidateStats?.edited ?? 0,
      },
    };
  }),
});

// ─── Background Discovery Runner ─────────────────────────────────────────────

async function runDiscoveryAndPersist(
  scanId: string,
  userId: string,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
) {
  try {
    const { queriesRun, rawCandidates } = await runDiscoveryScan();

    let candidatesFound = 0;

    for (const candidate of rawCandidates) {
      // Deduplicate against existing library
      const dedup = await deduplicateCandidate(candidate);

      await db.insert(discoveryCandidates).values({
        id: nanoid(),
        scanId,
        name: candidate.name,
        description: candidate.description,
        problemValue: candidate.problemValue,
        suggestedScope: candidate.suggestedScope,
        suggestedCategory: candidate.suggestedCategory,
        sourceUrls: candidate.sourceUrls,
        dedupStatus: dedup.status,
        nearestExistingId: dedup.nearestExistingId,
        nearestExistingLabel: dedup.nearestExistingLabel,
        status: "pending",
        createdAt: Date.now(),
      });

      candidatesFound++;
    }

    // Update scan record
    await db
      .update(discoveryScans)
      .set({
        status: "completed",
        completedAt: Date.now(),
        queriesRun,
        candidatesFound,
      })
      .where(eq(discoveryScans.id, scanId));
  } catch (err: any) {
    await db
      .update(discoveryScans)
      .set({
        status: "failed",
        completedAt: Date.now(),
        errorMessage: err?.message || "Unknown error",
      })
      .where(eq(discoveryScans.id, scanId));
  }
}
