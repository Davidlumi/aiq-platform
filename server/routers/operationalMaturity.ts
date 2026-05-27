/**
 * Operational Maturity Router — v1.3
 * Covers:
 *   Block A: Content freshness (A4 telemetry)
 *   Block B: Customer feedback loop (B1 content requests, B2 QA checks)
 *   Block C: Implementation tracking (C1 status, C2 milestones, C3 dashboard, C4 timeline)
 *   Block D: Maturity progression (D1 re-assessment, D2 progression view, D3 refresh suggestions)
 *   Block E: Manager views (E1 onboarding, E2 dashboard, E3 briefs)
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { nanoid } from "nanoid";
import { eq, and, desc, asc, gte, lte, inArray, isNull, sql } from "drizzle-orm";
import {
  libraryUsageEvents,
  contentRequests,
  initiativeStatusHistory,
  strategyMilestones,
  assessmentHistory,
  strategyRefreshSuggestions,
  managerBriefs,
  strategyInitiatives,
  ailOrgContext,
  users,
} from "../../drizzle/schema";
import {
  getLibraryVersion,
  getLibraryMeta,
  getAllInitiatives,
  getInitiative,
  isSourceStale,
  resolveSources,
  resolveInitiativeIds,
} from "../contentLibrary";
import { invokeLLM } from "../_core/llm";
import { assertLLMRateLimit } from "../_core/llmRateLimit";

// ─── Block A: Library Telemetry ────────────────────────────────────────────

const telemetryEventSchema = z.object({
  eventType: z.enum([
    "strategy_generated",
    "strategy_regenerated",
    "initiative_selected",
    "initiative_deselected",
    "cost_envelope_viewed",
    "value_envelope_viewed",
    "risk_evaluated",
    "pdf_exported",
  ]),
  initiativeIds: z.array(z.string()).optional(),
  sectorId: z.string().optional(),
});

// ─── Block C: Status Enum ─────────────────────────────────────────────────

const INITIATIVE_STATUSES = ["not_started", "in_progress", "paused", "completed", "cancelled"] as const;
type InitiativeStatus = typeof INITIATIVE_STATUSES[number];

// ─── Block E: Manager Functions ───────────────────────────────────────────

const MANAGER_FUNCTIONS = [
  "L&D",
  "Talent Acquisition",
  "HRBP",
  "Reward & Benefits",
  "HR Operations",
  "People Analytics",
  "Organisational Development",
  "Employee Relations",
  "Workforce Planning",
  "HR Technology",
  "Other",
] as const;

// ─── Router ───────────────────────────────────────────────────────────────

export const operationalMaturityRouter = router({

  // ── A4: Record a library usage event ──────────────────────────────────
  recordTelemetry: protectedProcedure
    .input(telemetryEventSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.insert(libraryUsageEvents).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        eventType: input.eventType,
        libraryVersion: getLibraryVersion(),
        initiativeIdsJson: input.initiativeIds ? JSON.stringify(input.initiativeIds) : null,
        sectorId: input.sectorId ?? null,
        occurredAt: Date.now(),
      });
      return { ok: true };
    }),

  // ── A4: Admin — get telemetry summary ─────────────────────────────────
  getTelemetrySummary: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(365).default(30),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const since = Date.now() - input.days * 24 * 60 * 60 * 1000;
      const events = await db
        .select()
        .from(libraryUsageEvents)
        .where(
          and(
            eq(libraryUsageEvents.tenantId, ctx.user.tenantId),
            gte(libraryUsageEvents.occurredAt, since)
          )
        )
        .orderBy(desc(libraryUsageEvents.occurredAt));

      // Aggregate by event type
      const byType: Record<string, number> = {};
      for (const e of events) {
        byType[e.eventType] = (byType[e.eventType] ?? 0) + 1;
      }

      // Most used initiatives
      const initiativeCounts: Record<string, number> = {};
      for (const e of events) {
        if (e.initiativeIdsJson) {
          const ids: string[] = JSON.parse(e.initiativeIdsJson);
          for (const id of ids) {
            initiativeCounts[id] = (initiativeCounts[id] ?? 0) + 1;
          }
        }
      }
      const topInitiatives = Object.entries(initiativeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, count]) => {
          const resolved = resolveInitiativeIds([id]);
          const init = resolved.length ? getInitiative(resolved[0]) : undefined;
          return { id, displayName: init?.display_name ?? id, count };
        });

      return {
        totalEvents: events.length,
        byType,
        topInitiatives,
        libraryVersion: getLibraryVersion(),
        periodDays: input.days,
      };
    }),

  // ── A1: Get source staleness report ───────────────────────────────────
  getSourceStalenessReport: protectedProcedure
    .query(() => {
      const meta = getLibraryMeta();
      const allInits = getAllInitiatives();

      // Collect all unique source IDs referenced by initiatives
      const sourceIds = new Set<string>();
      for (const init of allInits) {
        for (const sid of init.sources) sourceIds.add(sid);
      }

      const sources = resolveSources(Array.from(sourceIds));
      const now = new Date();

      const staleCount = sources.filter(s => isSourceStale(s, now)).length;
      const freshCount = sources.length - staleCount;

      const staleSources = sources
        .filter(s => isSourceStale(s, now))
        .map(s => ({
          sourceId: s.source_id,
          citation: s.citation,
          sourceType: s.source_type,
          lastReviewedDate: s.last_reviewed_date ?? s.accessed,
          publicationDate: s.publication_date,
          url: s.url,
        }));

      return {
        totalSources: sources.length,
        staleCount,
        freshCount,
        staleSources,
        libraryVersion: meta.version,
        builtAt: meta.built_at,
      };
    }),

  // ── B1: Submit a content improvement request ──────────────────────────
  submitContentRequest: protectedProcedure
    .input(z.object({
      requestType: z.enum(["new_initiative", "update_initiative", "new_source", "update_source", "new_risk_rule", "other"]).default("other"),
      title: z.string().min(5).max(200),
      description: z.string().min(10).max(2000),
      relatedInitiativeId: z.string().optional(),
      relatedSourceId: z.string().optional(),
      priority: z.enum(["low", "medium", "high"]).default("medium"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const id = nanoid();
      await db.insert(contentRequests).values({
        id,
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        requestType: input.requestType,
        title: input.title,
        description: input.description,
        relatedInitiativeId: input.relatedInitiativeId ?? null,
        relatedSourceId: input.relatedSourceId ?? null,
        priority: input.priority,
        status: "open",
      });
      return { id, ok: true };
    }),

  // ── B1: List content requests (own or all for admin) ──────────────────
  listContentRequests: protectedProcedure
    .input(z.object({
      status: z.enum(["open", "under_review", "accepted", "declined", "done", "all"]).default("all"),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const conditions = [eq(contentRequests.tenantId, ctx.user.tenantId)];
      if (input.status !== "all") {
        conditions.push(eq(contentRequests.status, input.status));
      }
      const rows = await db
        .select()
        .from(contentRequests)
        .where(and(...conditions))
        .orderBy(desc(contentRequests.createdAt))
        .limit(input.limit);
      return rows;
    }),

  // ── B2: QA check — validate a strategy's initiatives against library ──
  runStrategyQACheck: protectedProcedure
    .input(z.object({
      initiativeIds: z.array(z.string()),
    }))
    .query(({ input }) => {
      const allInits = getAllInitiatives();
      const validIds = new Set(allInits.map(i => i.initiative_id));
      const resolvedIds = resolveInitiativeIds(input.initiativeIds);

      const checks: Array<{
        checkId: string;
        label: string;
        status: "pass" | "warn" | "fail";
        detail: string;
      }> = [];

      // Check 1: All initiative IDs resolve
      const unresolvedCount = input.initiativeIds.length - resolvedIds.length;
      checks.push({
        checkId: "id_resolution",
        label: "Initiative ID resolution",
        status: unresolvedCount === 0 ? "pass" : "warn",
        detail: unresolvedCount === 0
          ? `All ${resolvedIds.length} initiative IDs resolved successfully`
          : `${unresolvedCount} initiative ID(s) could not be resolved to current library`,
      });

      const selected = allInits.filter(i => resolvedIds.includes(i.initiative_id));

      // Check 2: Phase coverage
      const phases = new Set(selected.map(i => i.typical_phase));
      checks.push({
        checkId: "phase_coverage",
        label: "Phase coverage",
        status: phases.has("foundation") ? "pass" : "warn",
        detail: phases.has("foundation")
          ? `Phases covered: ${Array.from(phases).join(", ")}`
          : "No Foundation-phase initiatives selected — consider adding foundational capabilities first",
      });

      // Check 3: Confidence levels
      const lowConfidence = selected.filter(i => i.confidence === "low");
      checks.push({
        checkId: "confidence_levels",
        label: "Initiative confidence levels",
        status: lowConfidence.length === 0 ? "pass" : lowConfidence.length <= 2 ? "warn" : "fail",
        detail: lowConfidence.length === 0
          ? "All selected initiatives have medium or high confidence ratings"
          : `${lowConfidence.length} initiative(s) have low confidence: ${lowConfidence.map(i => i.display_name).join(", ")}`,
      });

      // Check 4: Source staleness
      const sourceIds = new Set<string>();
      for (const init of selected) {
        for (const sid of init.sources) sourceIds.add(sid);
      }
      const sources = resolveSources(Array.from(sourceIds));
      const staleSources = sources.filter(s => isSourceStale(s));
      checks.push({
        checkId: "source_freshness",
        label: "Source freshness",
        status: staleSources.length === 0 ? "pass" : staleSources.length <= 3 ? "warn" : "fail",
        detail: staleSources.length === 0
          ? "All sources reviewed within 18 months"
          : `${staleSources.length} source(s) not reviewed in 18+ months`,
      });

      // Check 5: Dependency chain
      const missingDeps: string[] = [];
      for (const init of selected) {
        for (const depId of (init.dependencies ?? [])) {
          const resolvedDep = resolveInitiativeIds([depId]);
          if (resolvedDep.length > 0 && !resolvedIds.includes(resolvedDep[0])) {
            const depInit = allInits.find(i => i.initiative_id === resolvedDep[0]);
            if (depInit) missingDeps.push(`${init.display_name} → ${depInit.display_name}`);
          }
        }
      }
      checks.push({
        checkId: "dependency_chain",
        label: "Dependency chain",
        status: missingDeps.length === 0 ? "pass" : "warn",
        detail: missingDeps.length === 0
          ? "No missing dependencies detected"
          : `${missingDeps.length} dependency gap(s): ${missingDeps.slice(0, 3).join("; ")}${missingDeps.length > 3 ? "..." : ""}`,
      });

      const passCount = checks.filter(c => c.status === "pass").length;
      const warnCount = checks.filter(c => c.status === "warn").length;
      const failCount = checks.filter(c => c.status === "fail").length;

      return {
        checks,
        summary: { passCount, warnCount, failCount },
        overallStatus: failCount > 0 ? "fail" : warnCount > 0 ? "warn" : "pass",
      };
    }),

  // ── C1: Update initiative status ──────────────────────────────────────
  updateInitiativeStatus: protectedProcedure
    .input(z.object({
      strategyInitiativeId: z.string(),
      newStatus: z.enum(INITIATIVE_STATUSES),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Fetch current row to get fromStatus and strategyId
      const [current] = await db
        .select()
        .from(strategyInitiatives)
        .where(eq(strategyInitiatives.id, input.strategyInitiativeId))
        .limit(1);

      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Initiative not found" });
      }

      const fromStatus = (current as any).status as InitiativeStatus | undefined;

      // Update status on the initiative row
      await db
        .update(strategyInitiatives)
        .set({
          status: input.newStatus,
          statusReason: input.reason ?? null,
          statusStartedAt: input.newStatus === "in_progress" ? Date.now() : (current as any).statusStartedAt,
          statusCompletedAt: input.newStatus === "completed" ? Date.now() : null,
        } as any)
        .where(eq(strategyInitiatives.id, input.strategyInitiativeId));

      // Write audit record
      await db.insert(initiativeStatusHistory).values({
        id: nanoid(),
        strategyInitiativeId: input.strategyInitiativeId,
        strategyId: current.strategyId,
        initiativeId: current.initiativeId,
        fromStatus: fromStatus ?? null,
        toStatus: input.newStatus,
        reason: input.reason ?? null,
        changedByUserId: ctx.user.id,
        changedAt: Date.now(),
      });

      return { ok: true };
    }),

  // ── C1: Get initiative status history ─────────────────────────────────
  getInitiativeStatusHistory: protectedProcedure
    .input(z.object({ strategyInitiativeId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      return db
        .select()
        .from(initiativeStatusHistory)
        .where(eq(initiativeStatusHistory.strategyInitiativeId, input.strategyInitiativeId))
        .orderBy(desc(initiativeStatusHistory.changedAt));
    }),

  // ── C2: Generate milestones for a strategy ────────────────────────────
  generateMilestones: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      initiativeIds: z.array(z.string()),  // init-XX format
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Delete existing auto-generated milestones for this strategy
      await db
        .delete(strategyMilestones)
        .where(
          and(
            eq(strategyMilestones.strategyId, input.strategyId),
            sql`is_auto_generated = 1`
          )
        );

      const resolvedIds = resolveInitiativeIds(input.initiativeIds);
      const allInits = getAllInitiatives();
      const selected = allInits.filter(i => resolvedIds.includes(i.initiative_id));

      // Group by phase
      const byPhase: Record<string, typeof selected> = {};
      for (const init of selected) {
        if (!byPhase[init.typical_phase]) byPhase[init.typical_phase] = [];
        byPhase[init.typical_phase].push(init);
      }

      const phaseOrder = ["foundation", "build", "scale", "optimise"];
      const milestones: typeof strategyMilestones.$inferInsert[] = [];
      let sortOrder = 0;

      for (const phase of phaseOrder) {
        const phaseInits = byPhase[phase] ?? [];
        if (phaseInits.length === 0) continue;

        // Phase kickoff milestone
        milestones.push({
          id: nanoid(),
          strategyId: input.strategyId,
          tenantId: ctx.user.tenantId,
          phase: phase as "foundation" | "build" | "scale" | "optimise",
          title: `${phase.charAt(0).toUpperCase() + phase.slice(1)} phase kickoff`,
          description: `Begin ${phase} phase with ${phaseInits.length} initiative(s)`,
          relatedInitiativeId: null,
          dueDate: null,
          status: "pending",
          sortOrder: sortOrder++,
          isAutoGenerated: 1,
        });

        // One milestone per initiative
        for (const init of phaseInits) {
          milestones.push({
            id: nanoid(),
            strategyId: input.strategyId,
            tenantId: ctx.user.tenantId,
            phase: phase as "foundation" | "build" | "scale" | "optimise",
            title: `Deploy: ${init.display_name}`,
            description: init.short_description,
            relatedInitiativeId: init.initiative_id,
            dueDate: null,
            status: "pending",
            sortOrder: sortOrder++,
            isAutoGenerated: 1,
          });
        }

        // Phase completion milestone
        milestones.push({
          id: nanoid(),
          strategyId: input.strategyId,
          tenantId: ctx.user.tenantId,
          phase: phase as "foundation" | "build" | "scale" | "optimise",
          title: `${phase.charAt(0).toUpperCase() + phase.slice(1)} phase review`,
          description: `Review outcomes and readiness to progress to next phase`,
          relatedInitiativeId: null,
          dueDate: null,
          status: "pending",
          sortOrder: sortOrder++,
          isAutoGenerated: 1,
        });
      }

      if (milestones.length > 0) {
        await db.insert(strategyMilestones).values(milestones);
      }

      return { count: milestones.length, ok: true };
    }),

  // ── C2: List milestones for a strategy ────────────────────────────────
  listMilestones: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      phase: z.enum(["foundation", "build", "scale", "optimise", "all"]).default("all"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const conditions = [eq(strategyMilestones.strategyId, input.strategyId)];
      if (input.phase !== "all") {
        conditions.push(eq(strategyMilestones.phase, input.phase));
      }
      return db
        .select()
        .from(strategyMilestones)
        .where(and(...conditions))
        .orderBy(asc(strategyMilestones.sortOrder));
    }),

  // ── C2: Update milestone status ───────────────────────────────────────
  updateMilestoneStatus: protectedProcedure
    .input(z.object({
      milestoneId: z.string(),
      status: z.enum(["pending", "in_progress", "completed", "overdue"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db
        .update(strategyMilestones)
        .set({
          status: input.status,
          completedAt: input.status === "completed" ? new Date() : null,
          completedByUserId: input.status === "completed" ? ctx.user.id : null,
        })
        .where(eq(strategyMilestones.id, input.milestoneId));
      return { ok: true };
    }),

  // ── C3: Get implementation dashboard ──────────────────────────────────
  getImplementationDashboard: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Get all initiatives for this strategy
      const initiatives = await db
        .select()
        .from(strategyInitiatives)
        .where(eq(strategyInitiatives.strategyId, input.strategyId));

      // Get milestones
      const milestones = await db
        .select()
        .from(strategyMilestones)
        .where(eq(strategyMilestones.strategyId, input.strategyId))
        .orderBy(asc(strategyMilestones.sortOrder));

      // Aggregate status counts
      const statusCounts: Record<string, number> = {
        not_started: 0, in_progress: 0, paused: 0, completed: 0, cancelled: 0,
      };
      for (const init of initiatives) {
        const status = (init as any).status ?? "not_started";
        statusCounts[status] = (statusCounts[status] ?? 0) + 1;
      }

      const milestoneCounts = {
        pending: milestones.filter(m => m.status === "pending").length,
        in_progress: milestones.filter(m => m.status === "in_progress").length,
        completed: milestones.filter(m => m.status === "completed").length,
        overdue: milestones.filter(m => m.status === "overdue").length,
      };

      const completionPct = initiatives.length > 0
        ? Math.round((statusCounts.completed / initiatives.length) * 100)
        : 0;

      return {
        initiativeCount: initiatives.length,
        statusCounts,
        completionPct,
        milestoneCounts,
        recentMilestones: milestones.slice(0, 5),
      };
    }),

  // ── D1: Save assessment snapshot ──────────────────────────────────────
  saveAssessmentSnapshot: protectedProcedure
    .input(z.object({
      assessmentType: z.enum(["initial", "reassessment", "quarterly_review"]).default("initial"),
      overallScore: z.number().min(0).max(5),
      domainScores: z.record(z.string(), z.number()),
      selectedInitiativeIds: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const id = nanoid();
      await db.insert(assessmentHistory).values({
        id,
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        assessmentType: input.assessmentType,
        overallScore: input.overallScore,
        domainScoresJson: JSON.stringify(input.domainScores),
        selectedInitiativeIdsJson: input.selectedInitiativeIds
          ? JSON.stringify(input.selectedInitiativeIds)
          : null,
        libraryVersion: getLibraryVersion(),
        assessedAt: Date.now(),
        notes: input.notes ?? null,
      });
      return { id, ok: true };
    }),

  // ── D1: Get assessment history ─────────────────────────────────────────
  getAssessmentHistory: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows = await db
        .select()
        .from(assessmentHistory)
        .where(eq(assessmentHistory.tenantId, ctx.user.tenantId))
        .orderBy(desc(assessmentHistory.assessedAt))
        .limit(20);

      return rows.map(r => ({
        ...r,
        domainScores: JSON.parse(r.domainScoresJson) as Record<string, number>,
        selectedInitiativeIds: r.selectedInitiativeIdsJson
          ? JSON.parse(r.selectedInitiativeIdsJson) as string[]
          : null,
      }));
    }),

  // ── D2: Get maturity progression ──────────────────────────────────────
  getMaturityProgression: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows = await db
        .select()
        .from(assessmentHistory)
        .where(eq(assessmentHistory.tenantId, ctx.user.tenantId))
        .orderBy(asc(assessmentHistory.assessedAt))
        .limit(20);

      if (rows.length === 0) return { snapshots: [], trend: "stable" as const, delta: 0 };

      const snapshots = rows.map(r => ({
        id: r.id,
        assessmentType: r.assessmentType,
        overallScore: r.overallScore,
        assessedAt: r.assessedAt,
        libraryVersion: r.libraryVersion,
        domainScores: JSON.parse(r.domainScoresJson) as Record<string, number>,
      }));

      const first = snapshots[0].overallScore;
      const last = snapshots[snapshots.length - 1].overallScore;
      const delta = Math.round((last - first) * 100) / 100;
      const trend = delta > 0.2 ? "improving" : delta < -0.2 ? "declining" : "stable";

      return { snapshots, trend, delta };
    }),

  // ── D3: List refresh suggestions ──────────────────────────────────────
  listRefreshSuggestions: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      return db
        .select()
        .from(strategyRefreshSuggestions)
        .where(
          and(
            eq(strategyRefreshSuggestions.tenantId, ctx.user.tenantId),
            eq(strategyRefreshSuggestions.status, "pending")
          )
        )
        .orderBy(desc(strategyRefreshSuggestions.createdAt))
        .limit(10);
    }),

  // ── D3: Dismiss or snooze a refresh suggestion ────────────────────────
  updateRefreshSuggestion: protectedProcedure
    .input(z.object({
      suggestionId: z.string(),
      action: z.enum(["dismiss", "snooze", "act"]),
      snoozeUntil: z.string().optional(),  // ISO date string
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const updates: Record<string, unknown> = {};

      if (input.action === "dismiss") {
        updates.status = "dismissed";
      } else if (input.action === "snooze") {
        updates.status = "snoozed";
        updates.snoozedUntil = input.snoozeUntil ? new Date(input.snoozeUntil) : null;
      } else {
        updates.status = "acted";
        updates.actedAt = new Date();
        updates.actedByUserId = ctx.user.id;
      }

      await db
        .update(strategyRefreshSuggestions)
        .set(updates as any)
        .where(eq(strategyRefreshSuggestions.id, input.suggestionId));

      return { ok: true };
    }),

  // ── D3: Create a manual refresh suggestion (admin/system) ─────────────
  createRefreshSuggestion: protectedProcedure
    .input(z.object({
      triggerType: z.enum(["capability_progression", "library_version_update", "milestone_completion", "manual"]),
      triggerDetail: z.string().optional(),
      previousScore: z.number().optional(),
      currentScore: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const meta = getLibraryMeta();
      const id = nanoid();
      await db.insert(strategyRefreshSuggestions).values({
        id,
        tenantId: ctx.user.tenantId,
        triggerType: input.triggerType,
        triggerDetail: input.triggerDetail ?? null,
        currentLibraryVersion: meta.version,
        latestLibraryVersion: meta.version,
        previousScore: input.previousScore ?? null,
        currentScore: input.currentScore ?? null,
        status: "pending",
      });
      return { id, ok: true };
    }),

  // ── E1: Complete manager onboarding ───────────────────────────────────
  completeManagerOnboarding: protectedProcedure
    .input(z.object({
      managerFunction: z.string().min(1).max(100),
      directReports: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db
        .update(users)
        .set({
          managerFunction: input.managerFunction,
          managerDirectReportsJson: input.directReports
            ? JSON.stringify(input.directReports)
            : null,
          managerOnboardingCompleted: true,
          managerOnboardingCompletedAt: new Date(),
        } as any)
        .where(eq(users.id, ctx.user.id));
      return { ok: true };
    }),

  // ── E2: Get manager dashboard data ────────────────────────────────────
  getManagerDashboard: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Get user's manager function
      const [userRow] = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      const managerFunction = (userRow as any).managerFunction as string | null;

      // Get org context for the tenant
      const [orgCtx] = await db
        .select()
        .from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .orderBy(desc(ailOrgContext.createdAt))
        .limit(1);

      // Filter initiatives by function tag if available
      const allInits = getAllInitiatives();
      let relevantInits = allInits;

      if (managerFunction) {
        const fnLower = managerFunction.toLowerCase();
        relevantInits = allInits.filter(i => {
          const tags = (i as any).function_tags as string[] | undefined;
          if (!tags || tags.length === 0) return true;  // include untagged
          return tags.some(t => t.toLowerCase().includes(fnLower) || fnLower.includes(t.toLowerCase()));
        });
      }

      // Get cached brief if available
      const [brief] = await db
        .select()
        .from(managerBriefs)
        .where(
          and(
            eq(managerBriefs.tenantId, ctx.user.tenantId),
            eq(managerBriefs.managerFunction, managerFunction ?? "General")
          )
        )
        .orderBy(desc(managerBriefs.generatedAt))
        .limit(1);

      return {
        managerFunction,
        onboardingCompleted: (userRow as any).managerOnboardingCompleted ?? false,
        relevantInitiativeCount: relevantInits.length,
        relevantInitiatives: relevantInits.slice(0, 6).map(i => ({
          id: i.initiative_id,
          displayName: i.display_name,
          phase: i.typical_phase,
          category: i.category,
          shortDescription: i.short_description,
        })),
        cachedBrief: brief ?? null,
        orgContextId: orgCtx?.id ?? null,
      };
    }),

  // ── E3: Generate manager brief ────────────────────────────────────────
  generateManagerBrief: protectedProcedure
    .input(z.object({
      managerFunction: z.string().min(1).max(100),
      strategyContextId: z.string().optional(),
      selectedInitiativeIds: z.array(z.string()).optional(),
      forceRegenerate: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      assertLLMRateLimit(ctx.user.id); // PROD-2.1
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Check for cached brief (unless force regenerate)
      if (!input.forceRegenerate) {
        const [cached] = await db
          .select()
          .from(managerBriefs)
          .where(
            and(
              eq(managerBriefs.tenantId, ctx.user.tenantId),
              eq(managerBriefs.managerFunction, input.managerFunction)
            )
          )
          .orderBy(desc(managerBriefs.generatedAt))
          .limit(1);

        // Return cached if less than 7 days old
        if (cached && (Date.now() - cached.generatedAt) < 7 * 24 * 60 * 60 * 1000) {
          return {
            id: cached.id,
            briefMarkdown: cached.briefMarkdown,
            cached: true,
          };
        }
      }

      // Resolve initiatives
      const allInits = getAllInitiatives();
      let relevantInits = allInits;

      if (input.selectedInitiativeIds && input.selectedInitiativeIds.length > 0) {
        const resolvedIds = resolveInitiativeIds(input.selectedInitiativeIds);
        relevantInits = allInits.filter(i => resolvedIds.includes(i.initiative_id));
      } else {
        // Filter by function tag
        const fnLower = input.managerFunction.toLowerCase();
        relevantInits = allInits.filter(i => {
          const tags = (i as any).function_tags as string[] | undefined;
          if (!tags || tags.length === 0) return true;
          return tags.some(t => t.toLowerCase().includes(fnLower) || fnLower.includes(t.toLowerCase()));
        });
      }

      const initiativeList = relevantInits.slice(0, 8).map(i =>
        `- **${i.display_name}** (${i.typical_phase}): ${i.short_description}`
      ).join("\n");

      const prompt = `You are an expert HR transformation consultant. Write a concise, practical "What This Means For Me" brief for a ${input.managerFunction} manager in an organisation implementing an AI-enabled HR strategy.

The following AI initiatives are relevant to their function:
${initiativeList}

Write the brief in markdown with these sections:
## What's Changing For Your Function
## Your 3 Key Responsibilities
## Quick Wins You Can Start This Month
## Questions To Ask Your HR Team

Keep each section to 2-4 bullet points. Be specific, practical, and avoid jargon. Mention the ${input.managerFunction} function explicitly.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a senior HR transformation consultant writing practical manager briefings." },
          { role: "user", content: prompt },
        ],
      });

      const rawContent = response.choices?.[0]?.message?.content;
      const briefMarkdown = typeof rawContent === "string" ? rawContent : "Brief generation failed.";

      // Cache the brief
      const id = nanoid();
      const strategyContextId = input.strategyContextId ?? "default";
      await db.insert(managerBriefs).values({
        id,
        tenantId: ctx.user.tenantId,
        strategyContextId,
        managerFunction: input.managerFunction,
        briefMarkdown,
        initiativeIdsJson: JSON.stringify(relevantInits.slice(0, 8).map(i => i.initiative_id)),
        libraryVersion: getLibraryVersion(),
        generatedAt: Date.now(),
        generatedByUserId: ctx.user.id,
      });

      return { id, briefMarkdown, cached: false };
    }),

  // ── E3: List cached manager briefs ────────────────────────────────────
  listManagerBriefs: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      return db
        .select()
        .from(managerBriefs)
        .where(eq(managerBriefs.tenantId, ctx.user.tenantId))
        .orderBy(desc(managerBriefs.generatedAt))
        .limit(20);
    }),

  // ── Library version info ───────────────────────────────────────────────
  getLibraryInfo: protectedProcedure
    .query(() => {
      const meta = getLibraryMeta();
      return {
        version: meta.version,
        builtAt: meta.built_at,
        contentCounts: meta.content_counts,
      };
    }),
});
