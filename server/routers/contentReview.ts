/**
 * Content Review Router — CONTENT_REVIEW.md policy implementation
 *
 * Covers:
 *   F1: Review log (append-only audit trail of library version bumps)
 *   F2: Triggered reviews (regulatory / customer / operational triggers)
 *   F3: Cadence status (quarterly / annual review schedule)
 *   F4: Source health (stale source detection, reuses isSourceStale)
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { nanoid } from "nanoid";
import { eq, desc, asc } from "drizzle-orm";
import {
  contentReviewLog,
  triggeredReviews,
} from "../../drizzle/schema";
import {
  getLibraryMeta,
  getAllInitiatives,
  resolveSources,
  isSourceStale,
} from "../contentLibrary";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Cadence definitions from CONTENT_REVIEW.md */
const CADENCE_DEFINITIONS = [
  {
    contentType: "Initiatives",
    cadence: "Quarterly",
    cadenceDays: 90,
    description: "All 30 initiatives reviewed for accuracy, cost ranges, and source freshness",
    owner: "David",
  },
  {
    contentType: "Risk Rules",
    cadence: "Quarterly",
    cadenceDays: 90,
    description: "All 10 risk rules validated against current regulatory landscape",
    owner: "David",
  },
  {
    contentType: "Sources",
    cadence: "Quarterly",
    cadenceDays: 90,
    description: "All 15 sources checked for staleness (>18 months = stale)",
    owner: "David",
  },
  {
    contentType: "Sector Benchmarks",
    cadence: "Annual",
    cadenceDays: 365,
    description: "Sector benchmark data refreshed against latest industry surveys",
    owner: "David",
  },
  {
    contentType: "Test Fixtures",
    cadence: "Per Release",
    cadenceDays: 0,
    description: "5 canonical test fixtures validated against each library version bump",
    owner: "David",
  },
  {
    contentType: "Full Library Audit",
    cadence: "Annual",
    cadenceDays: 365,
    description: "Complete end-to-end review of all content, sources, and risk rules",
    owner: "David",
  },
] as const;

/** Compute next due date from last reviewed date and cadence days */
function computeNextDue(lastReviewedIso: string | null, cadenceDays: number): {
  nextDue: string | null;
  status: "ok" | "due_soon" | "overdue" | "never_reviewed";
} {
  if (cadenceDays === 0) return { nextDue: null, status: "ok" }; // per-release
  if (!lastReviewedIso) return { nextDue: null, status: "never_reviewed" };
  const last = new Date(lastReviewedIso);
  const next = new Date(last.getTime() + cadenceDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const daysUntil = Math.floor((next.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  const status = daysUntil < 0 ? "overdue" : daysUntil <= 14 ? "due_soon" : "ok";
  return { nextDue: next.toISOString().slice(0, 10), status };
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const contentReviewRouter = router({

  // ── F3: Cadence status ────────────────────────────────────────────────────
  getCadenceStatus: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Get the most recent review log entry to determine last reviewed date
      const [latestEntry] = await db
        .select()
        .from(contentReviewLog)
        .orderBy(desc(contentReviewLog.createdAt))
        .limit(1);

      const lastReviewedIso = latestEntry
        ? new Date(latestEntry.createdAt).toISOString().slice(0, 10)
        : null;

      const meta = getLibraryMeta();

      return CADENCE_DEFINITIONS.map(def => {
        const { nextDue, status } = computeNextDue(lastReviewedIso, def.cadenceDays);
        return {
          contentType: def.contentType,
          cadence: def.cadence,
          description: def.description,
          owner: def.owner,
          lastReviewedDate: lastReviewedIso,
          nextDueDate: nextDue,
          status,
          libraryVersion: meta.version,
        };
      });
    }),

  // ── F1: List review log ───────────────────────────────────────────────────
  listReviewLog: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const rows = await db
        .select()
        .from(contentReviewLog)
        .orderBy(desc(contentReviewLog.createdAt))
        .limit(input.limit);

      return rows.map(r => ({
        ...r,
        changes: r.changesJson ? JSON.parse(r.changesJson) as string[] : [],
        newSources: r.newSourcesJson
          ? JSON.parse(r.newSourcesJson) as Array<{ source_id: string; citation: string; confidence: string }>
          : [],
        testFixtures: r.testFixturesJson
          ? JSON.parse(r.testFixturesJson) as Array<{ fixture: string; passed: boolean; notes: string }>
          : [],
      }));
    }),

  // ── F1: Add review log entry ──────────────────────────────────────────────
  addReviewEntry: protectedProcedure
    .input(z.object({
      version: z.string().min(1).max(20),
      bumpType: z.enum(["patch", "minor", "major"]),
      triggerType: z.enum([
        "quarterly_review",
        "annual_review",
        "regulatory_trigger",
        "customer_trigger",
        "operational_trigger",
        "manual",
      ]),
      triggerDetail: z.string().optional(),
      author: z.string().min(1).max(100),
      reviewer: z.string().max(100).optional(),
      changes: z.array(z.string()).default([]),
      newSources: z.array(z.object({
        source_id: z.string(),
        citation: z.string(),
        confidence: z.string(),
      })).default([]),
      testFixtures: z.array(z.object({
        fixture: z.string(),
        passed: z.boolean(),
        notes: z.string().optional(),
      })).default([]),
      knownIssues: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const id = nanoid();
      await db.insert(contentReviewLog).values({
        id,
        version: input.version,
        bumpType: input.bumpType,
        triggerType: input.triggerType,
        triggerDetail: input.triggerDetail ?? null,
        author: input.author,
        reviewer: input.reviewer ?? null,
        changesJson: JSON.stringify(input.changes),
        newSourcesJson: JSON.stringify(input.newSources),
        testFixturesJson: JSON.stringify(input.testFixtures),
        knownIssues: input.knownIssues ?? null,
      });
      return { id, ok: true };
    }),

  // ── F2: List triggered reviews ────────────────────────────────────────────
  listTriggeredReviews: protectedProcedure
    .input(z.object({
      status: z.enum(["open", "in_review", "resolved", "deferred", "all"]).default("all"),
      category: z.enum(["regulatory", "customer", "operational", "all"]).default("all"),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const rows = await db
        .select()
        .from(triggeredReviews)
        .orderBy(desc(triggeredReviews.createdAt))
        .limit(input.limit);

      return rows.filter(r => {
        if (input.status !== "all" && r.status !== input.status) return false;
        if (input.category !== "all" && r.triggerCategory !== input.category) return false;
        return true;
      });
    }),

  // ── F2: Add triggered review ──────────────────────────────────────────────
  addTriggeredReview: protectedProcedure
    .input(z.object({
      triggerCategory: z.enum(["regulatory", "customer", "operational"]),
      triggerType: z.string().min(1).max(100),
      triggerDetail: z.string().min(5).max(2000),
      affectedContent: z.string().optional(),
      plannedReviewDate: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const id = nanoid();
      await db.insert(triggeredReviews).values({
        id,
        triggerCategory: input.triggerCategory,
        triggerType: input.triggerType,
        triggerDetail: input.triggerDetail,
        affectedContent: input.affectedContent ?? null,
        plannedReviewDate: input.plannedReviewDate ?? null,
        priority: input.priority,
        status: "open",
        createdByUserId: ctx.user.id,
      });
      return { id, ok: true };
    }),

  // ── F2: Update triggered review status ───────────────────────────────────
  updateTriggeredReview: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["open", "in_review", "resolved", "deferred"]),
      resolutionNotes: z.string().optional(),
      linkedReviewLogId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [existing] = await db
        .select()
        .from(triggeredReviews)
        .where(eq(triggeredReviews.id, input.id))
        .limit(1);

      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Triggered review not found" });

      await db
        .update(triggeredReviews)
        .set({
          status: input.status,
          resolutionNotes: input.resolutionNotes ?? existing.resolutionNotes,
          linkedReviewLogId: input.linkedReviewLogId ?? existing.linkedReviewLogId,
          resolvedAt: input.status === "resolved" ? new Date() : existing.resolvedAt,
          resolvedByUserId: input.status === "resolved" ? ctx.user.id : existing.resolvedByUserId,
        })
        .where(eq(triggeredReviews.id, input.id));

      return { ok: true };
    }),

  // ── F4: Source health report ──────────────────────────────────────────────
  getSourceHealthReport: protectedProcedure
    .query(() => {
      const allInits = getAllInitiatives();
      const sourceIds = new Set<string>();
      for (const init of allInits) {
        for (const sid of init.sources) sourceIds.add(sid);
      }
      const sources = resolveSources(Array.from(sourceIds));
      const now = new Date();

      return sources.map(s => {
        const stale = isSourceStale(s, now);
        const lastReviewed = s.last_reviewed_date ?? s.accessed ?? null;
        let monthsAgo: number | null = null;
        if (lastReviewed) {
          const d = new Date(lastReviewed);
          monthsAgo =
            (now.getFullYear() - d.getFullYear()) * 12 +
            (now.getMonth() - d.getMonth());
        }
        return {
          sourceId: s.source_id,
          citation: s.citation,
          sourceType: s.source_type,
          confidence: s.confidence,
          publicationDate: s.publication_date ?? null,
          lastReviewedDate: lastReviewed,
          monthsAgo,
          url: s.url ?? null,
          isStale: stale,
          stalenessStatus: stale ? "stale" : (monthsAgo !== null && monthsAgo > 12 ? "aging" : "fresh"),
        };
      }).sort((a, b) => (b.monthsAgo ?? 0) - (a.monthsAgo ?? 0));
    }),

  // ── Summary stats for the dashboard header ────────────────────────────────
  getSummaryStats: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [latestEntry] = await db
        .select()
        .from(contentReviewLog)
        .orderBy(desc(contentReviewLog.createdAt))
        .limit(1);

      const allTriggered = await db
        .select()
        .from(triggeredReviews)
        .orderBy(desc(triggeredReviews.createdAt));

      const openCount = allTriggered.filter(r => r.status === "open" || r.status === "in_review").length;
      const criticalCount = allTriggered.filter(r =>
        (r.status === "open" || r.status === "in_review") && r.priority === "critical"
      ).length;

      // Source health
      const allInits = getAllInitiatives();
      const sourceIds = new Set<string>();
      for (const init of allInits) {
        for (const sid of init.sources) sourceIds.add(sid);
      }
      const sources = resolveSources(Array.from(sourceIds));
      const staleCount = sources.filter(s => isSourceStale(s)).length;

      const meta = getLibraryMeta();

      return {
        libraryVersion: meta.version,
        builtAt: meta.built_at,
        lastReviewDate: latestEntry ? new Date(latestEntry.createdAt).toISOString().slice(0, 10) : null,
        lastReviewVersion: latestEntry?.version ?? null,
        totalReviewLogEntries: (await db.select().from(contentReviewLog)).length,
        openTriggeredReviews: openCount,
        criticalTriggeredReviews: criticalCount,
        staleSourceCount: staleCount,
        totalSourceCount: sources.length,
      };
    }),
});
