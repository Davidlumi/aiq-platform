/**
 * AIQ Content System — tRPC Router
 *
 * Provides full CRUD, filtering, versioning, and tagging for the
 * content library: roles, workflows, scenarios, failure modes, tags.
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb, getUserRoleKeys } from "../db";
import {
  contentRoles,
  contentWorkflows,
  contentScenarios,
  contentScenarioOptions,
  contentScenarioAnchors,
  contentFailureModes,
  contentTags,
  contentVersions,
  sectorVocabulary,
  type ContentScenario,
  type User,
} from "../../drizzle/schema";
import { eq, asc, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function adminCheck(user: User) {
  // Accept platform admin role (set directly on the users table)
  if ((user as unknown as Record<string, unknown>).role === "admin") return;
  // Also accept users with role keys from the userRoles table
  const tenantId = (user as unknown as Record<string, unknown>).tenantId as string | undefined;
  const roles = await getUserRoleKeys(String(user.id), tenantId ?? "");
  if (!roles.includes("platform_super_admin") && !roles.includes("tenant_admin") && !roles.includes("content_admin")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
}

// ─── Roles sub-router ─────────────────────────────────────────────────────────

const rolesRouter = router({
  list: publicProcedure
    .input(z.object({ family: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(contentRoles)
        .orderBy(asc(contentRoles.family), asc(contentRoles.key));
      if (input?.family) {
        return rows.filter((r: typeof rows[0]) => r.family === input.family);
      }
      return rows;
    }),

  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [row] = await db
        .select()
        .from(contentRoles)
        .where(eq(contentRoles.key, input.key));
      return row ?? null;
    }),

  families: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .selectDistinct({ family: contentRoles.family })
      .from(contentRoles)
      .orderBy(asc(contentRoles.family));
    return rows.map((r: typeof rows[0]) => r.family);
  }),
});

// ─── Workflows sub-router ─────────────────────────────────────────────────────

const workflowsRouter = router({
  list: publicProcedure
    .input(z.object({ domain: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(contentWorkflows)
        .orderBy(asc(contentWorkflows.domain), asc(contentWorkflows.key));
      if (input?.domain) {
        return rows.filter((r: typeof rows[0]) => r.domain === input.domain);
      }
      return rows;
    }),

  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [row] = await db
        .select()
        .from(contentWorkflows)
        .where(eq(contentWorkflows.key, input.key));
      return row ?? null;
    }),

  domains: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .selectDistinct({ domain: contentWorkflows.domain })
      .from(contentWorkflows)
      .orderBy(asc(contentWorkflows.domain));
    return rows.map((r: typeof rows[0]) => r.domain);
  }),
});

// ─── Tags sub-router ──────────────────────────────────────────────────────────

const tagsRouter = router({
  list: publicProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(contentTags)
        .orderBy(asc(contentTags.category), asc(contentTags.label));
      if (input?.category) {
        return rows.filter((r: typeof rows[0]) => r.category === input.category);
      }
      return rows;
    }),

  categories: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .selectDistinct({ category: contentTags.category })
      .from(contentTags)
      .orderBy(asc(contentTags.category));
    return rows.map((r: typeof rows[0]) => r.category);
  }),
});

// ─── Failure Modes sub-router ─────────────────────────────────────────────────

const failureModesRouter = router({
  list: publicProcedure
    .input(z.object({ severity: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(contentFailureModes)
        .orderBy(asc(contentFailureModes.severity), asc(contentFailureModes.label));
      if (input?.severity) {
        return rows.filter((r: typeof rows[0]) => r.severity === input.severity);
      }
      return rows;
    }),

  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [row] = await db
        .select()
        .from(contentFailureModes)
        .where(eq(contentFailureModes.key, input.key));
      return row ?? null;
    }),
});

// ─── Scenarios sub-router ─────────────────────────────────────────────────────

const scenariosRouter = router({
  list: publicProcedure
    .input(
      z.object({
        domain: z.string().optional(),
        capabilityKey: z.string().optional(),
        difficulty: z.number().optional(),
        riskLevel: z.string().optional(),
        governanceSensitive: z.boolean().optional(),
        status: z.string().optional(),
        interactionType: z.string().optional(),
        search: z.string().optional(),
        tags: z.array(z.string()).optional(),
        workflowKey: z.string().optional(),
        roleKey: z.string().optional(),
        /** S8: Filter by sector applicability key */
        sectorKey: z.string().optional(),
        /** S8: If true, return only tool-agnostic items */
        toolAgnosticOnly: z.boolean().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };

      const p = input;
      const page = p.page ?? 1;
      const pageSize = Math.min(p.pageSize ?? 20, 200);
      const offset = (page - 1) * pageSize;

      let rows: ContentScenario[] = await db
        .select()
        .from(contentScenarios)
        .orderBy(desc(contentScenarios.updatedAt));

      if (p.domain) rows = rows.filter((r) => r.domain === p.domain);
      if (p.capabilityKey) rows = rows.filter((r) => r.capabilityKey === p.capabilityKey);
      if (p.difficulty !== undefined) rows = rows.filter((r) => r.difficulty === p.difficulty);
      if (p.riskLevel) rows = rows.filter((r) => r.riskLevel === p.riskLevel);
      if (p.governanceSensitive !== undefined) rows = rows.filter((r) => r.governanceSensitive === p.governanceSensitive);
      if (p.status) rows = rows.filter((r) => r.status === p.status);
      if (p.interactionType) rows = rows.filter((r) => r.interactionType === p.interactionType);
      if (p.workflowKey) rows = rows.filter((r) => r.workflowKey === p.workflowKey);
      if (p.roleKey) {
        const rk = p.roleKey;
        rows = rows.filter((r) => ((r.roleKeysJson as string[]) ?? []).includes(rk));
      }
      if (p.tags && p.tags.length > 0) {
        const filterTags = p.tags;
        rows = rows.filter((r) => {
          const scenarioTags = (r.tagsJson as string[]) ?? [];
          return filterTags.some((tag) => scenarioTags.includes(tag));
        });
      }
      // S8: Sector applicability filter
      if (p.sectorKey) {
        const sk = p.sectorKey;
        rows = rows.filter((r) => {
          const sectors = (r.sectorApplicability as string[]) ?? [];
          // Empty array means "all sectors" (universal)
          return sectors.length === 0 || sectors.includes(sk) || sectors.includes("all");
        });
      }
      // S8: Tool-agnostic filter
      if (p.toolAgnosticOnly) {
        rows = rows.filter((r) => r.toolAgnostic === true);
      }
      if (p.search) {
        const q = p.search.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.scenario.toLowerCase().includes(q) ||
            r.interactionId.toLowerCase().includes(q)
        );
      }

      const total = rows.length;
      const paginated = rows.slice(offset, offset + pageSize);

      return { items: paginated, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [scenario] = await db
        .select()
        .from(contentScenarios)
        .where(eq(contentScenarios.id, input.id));
      if (!scenario) return null;

      const options = await db
        .select()
        .from(contentScenarioOptions)
        .where(eq(contentScenarioOptions.scenarioId, input.id))
        .orderBy(asc(contentScenarioOptions.optionOrder));

      const anchors = await db
        .select()
        .from(contentScenarioAnchors)
        .where(eq(contentScenarioAnchors.scenarioId, input.id));

      return { ...scenario, options, anchors };
    }),

  getByInteractionId: publicProcedure
    .input(z.object({ interactionId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [scenario] = await db
        .select()
        .from(contentScenarios)
        .where(eq(contentScenarios.interactionId, input.interactionId));
      if (!scenario) return null;

      const options = await db
        .select()
        .from(contentScenarioOptions)
        .where(eq(contentScenarioOptions.scenarioId, scenario.id))
        .orderBy(asc(contentScenarioOptions.optionOrder));

      const anchors = await db
        .select()
        .from(contentScenarioAnchors)
        .where(eq(contentScenarioAnchors.scenarioId, scenario.id));

      return { ...scenario, options, anchors };
    }),

  stats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, byDomain: {}, byStatus: {}, byDifficulty: {}, byRisk: {}, govSensitiveCount: 0 };

    const all: ContentScenario[] = await db.select().from(contentScenarios);
    const byDomain: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};
    const byRisk: Record<string, number> = {};
    let govSensitiveCount = 0;

    for (const s of all) {
      byDomain[s.domain] = (byDomain[s.domain] ?? 0) + 1;
      byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
      byDifficulty[String(s.difficulty)] = (byDifficulty[String(s.difficulty)] ?? 0) + 1;
      byRisk[s.riskLevel] = (byRisk[s.riskLevel] ?? 0) + 1;
      if (s.governanceSensitive) govSensitiveCount++;
    }

    return { total: all.length, byDomain, byStatus, byDifficulty, byRisk, govSensitiveCount };
  }),

  create: protectedProcedure
    .input(
      z.object({
        interactionId: z.string().min(1),
        title: z.string().min(1),
        domain: z.string().min(1),
        capabilityKey: z.string().min(1),
        interactionType: z.string().min(1),
        difficulty: z.number().min(1).max(5).default(2),
        riskLevel: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
        governanceSensitive: z.boolean().default(false),
        scenario: z.string().min(1),
        constraint: z.string().optional(),
        question: z.string().min(1),
        workflowKey: z.string().optional(),
        roleKeysJson: z.array(z.string()).default([]),
        failureModeKeysJson: z.array(z.string()).default([]),
        tagsJson: z.array(z.string()).default([]),
        primarySignal: z.string().optional(),
        ambiguityLevel: z.enum(["low", "medium", "high"]).default("medium"),
        status: z.enum(["draft", "published", "archived", "under_review"]).default("draft"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await adminCheck(ctx.user!);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const id = randomUUID();
      await db.insert(contentScenarios).values({ id, ...input });

      await db.insert(contentVersions).values({
        id: randomUUID(),
        scenarioId: id,
        version: 1,
        changeType: "created",
        changedBy: ctx.user!.id,
        changeSummary: "Initial creation",
        snapshotJson: input as Record<string, unknown>,
      });

      return { id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        domain: z.string().optional(),
        capabilityKey: z.string().optional(),
        interactionType: z.string().optional(),
        difficulty: z.number().min(1).max(5).optional(),
        riskLevel: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
        governanceSensitive: z.boolean().optional(),
        scenario: z.string().optional(),
        constraint: z.string().optional(),
        question: z.string().optional(),
        workflowKey: z.string().optional(),
        roleKeysJson: z.array(z.string()).optional(),
        failureModeKeysJson: z.array(z.string()).optional(),
        tagsJson: z.array(z.string()).optional(),
        primarySignal: z.string().optional(),
        ambiguityLevel: z.enum(["low", "medium", "high"]).optional(),
        status: z.enum(["draft", "published", "archived", "under_review"]).optional(),
        changeSummary: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await adminCheck(ctx.user!);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { id, changeSummary, ...updates } = input;

      const [current] = await db
        .select()
        .from(contentScenarios)
        .where(eq(contentScenarios.id, id));
      if (!current) throw new TRPCError({ code: "NOT_FOUND" });

      const newVersion = current.version + 1;
      await db
        .update(contentScenarios)
        .set({ ...updates, version: newVersion })
        .where(eq(contentScenarios.id, id));

      await db.insert(contentVersions).values({
        id: randomUUID(),
        scenarioId: id,
        version: newVersion,
        changeType: "edited",
        changedBy: ctx.user!.id,
        changeSummary: changeSummary ?? "Updated",
        snapshotJson: { ...current, ...updates } as Record<string, unknown>,
      });

      return { id, version: newVersion };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["draft", "published", "archived", "under_review"]),
        changeSummary: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await adminCheck(ctx.user!);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [current] = await db
        .select()
        .from(contentScenarios)
        .where(eq(contentScenarios.id, input.id));
      if (!current) throw new TRPCError({ code: "NOT_FOUND" });

      const newVersion = current.version + 1;
      await db
        .update(contentScenarios)
        .set({ status: input.status, version: newVersion })
        .where(eq(contentScenarios.id, input.id));

      const changeType =
        input.status === "published"
          ? "published"
          : input.status === "archived"
          ? "archived"
          : "edited";

      await db.insert(contentVersions).values({
        id: randomUUID(),
        scenarioId: input.id,
        version: newVersion,
        changeType: changeType as "published" | "archived" | "edited",
        changedBy: ctx.user!.id,
        changeSummary: input.changeSummary ?? `Status changed to ${input.status}`,
        snapshotJson: current as unknown as Record<string, unknown>,
      });

      return { id: input.id, status: input.status, version: newVersion };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await adminCheck(ctx.user!);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.delete(contentScenarioOptions).where(eq(contentScenarioOptions.scenarioId, input.id));
      await db.delete(contentScenarioAnchors).where(eq(contentScenarioAnchors.scenarioId, input.id));
      await db.delete(contentVersions).where(eq(contentVersions.scenarioId, input.id));
      await db.delete(contentScenarios).where(eq(contentScenarios.id, input.id));
      return { success: true };
    }),

  versions: protectedProcedure
    .input(z.object({ scenarioId: z.string() }))
    .query(async ({ input, ctx }) => {
      await adminCheck(ctx.user!);
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(contentVersions)
        .where(eq(contentVersions.scenarioId, input.scenarioId))
        .orderBy(desc(contentVersions.version));
    }),

  upsertOptions: protectedProcedure
    .input(
      z.object({
        scenarioId: z.string(),
        options: z.array(
          z.object({
            id: z.string().optional(),
            optionOrder: z.number(),
            label: z.string(),
            value: z.string(),
            outcomeClass: z.string().optional(),
            signalDeltasJson: z.record(z.string(), z.number()).optional(),
            rationaleText: z.string().optional(),
            isOptimal: z.boolean().default(false),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await adminCheck(ctx.user!);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.delete(contentScenarioOptions).where(eq(contentScenarioOptions.scenarioId, input.scenarioId));
      for (const opt of input.options) {
        await db.insert(contentScenarioOptions).values({
          id: opt.id ?? randomUUID(),
          scenarioId: input.scenarioId,
          optionOrder: opt.optionOrder,
          label: opt.label,
          value: opt.value,
          outcomeClass: opt.outcomeClass,
          signalDeltasJson: (opt.signalDeltasJson ?? {}) as Record<string, number>,
          rationaleText: opt.rationaleText,
          isOptimal: opt.isOptimal,
        });
      }
      return { success: true };
    }),

  upsertAnchors: protectedProcedure
    .input(
      z.object({
        scenarioId: z.string(),
        anchors: z.array(
          z.object({
            anchorKey: z.string(),
            anchorLabel: z.string(),
            description: z.string(),
            scoreRange: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await adminCheck(ctx.user!);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.delete(contentScenarioAnchors).where(eq(contentScenarioAnchors.scenarioId, input.scenarioId));
      for (const a of input.anchors) {
        await db.insert(contentScenarioAnchors).values({
          id: randomUUID(),
          scenarioId: input.scenarioId,
          anchorKey: a.anchorKey,
          anchorLabel: a.anchorLabel,
          description: a.description,
          scoreRange: a.scoreRange,
        });
      }
      return { success: true };
    }),

  getRelevantForRole: publicProcedure
    .input(
      z.object({
        roleKey: z.string(),
        domain: z.string().optional(),
        capabilityKey: z.string().optional(),
        limit: z.number().default(10),
        excludeIds: z.array(z.string()).default([]),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let rows: ContentScenario[] = await db
        .select()
        .from(contentScenarios)
        .where(eq(contentScenarios.status, "published"));

      const rk = input.roleKey;
      rows = rows.filter((r) => ((r.roleKeysJson as string[]) ?? []).includes(rk));

      if (input.domain) rows = rows.filter((r) => r.domain === input.domain);
      if (input.capabilityKey) rows = rows.filter((r) => r.capabilityKey === input.capabilityKey);

      if (input.excludeIds.length > 0) {
        const excl = input.excludeIds;
        rows = rows.filter((r) => !excl.includes(r.id));
      }

      rows.sort((a, b) => {
        if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
        if (a.governanceSensitive && !b.governanceSensitive) return -1;
        return 0;
      });

      return rows.slice(0, input.limit);
    }),
});

// ─── Main content router ───────────────────────────────────────────────────────

export const contentRouter = router({
  roles: rolesRouter,
  workflows: workflowsRouter,
  tags: tagsRouter,
  failureModes: failureModesRouter,
  scenarios: scenariosRouter,
});
