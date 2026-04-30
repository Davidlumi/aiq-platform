/**
 * People Router — AiQ Platform
 *
 * Provides HR leaders and managers with access to individual assessment reports.
 *
 * Access model:
 *   - platform_super_admin / tenant_admin / hr_leader → see ALL users in tenant
 *   - manager → see only their direct reports (managerTeamMembers table)
 *   - Anyone else → FORBIDDEN
 */

import { TRPCError } from "@trpc/server";
import { DOMAIN_COLOURS as BRAND_DOMAIN_COLOURS } from "@shared/brand";
import { ROLE_FAMILY_KEYS, ROLE_FAMILY_LABELS } from "../../shared/dashboard";
import { and, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getUserRoleKeys } from "../db";
import {
  users,
  assessmentSessions,
  assessmentScores,
  managerTeamMembers,
  roles,
  userRoles,
} from "../../drizzle/schema";

// ─── Shared constants ─────────────────────────────────────────────────────────

const CAPABILITY_DISPLAY: Record<string, string> = {
  ai_interaction:         "AI Interaction",
  ai_output_evaluation:   "AI Output Evaluation",
  ai_workflow_design:     "AI Workflow Design",
  workforce_ai_readiness: "Workforce AI Readiness",
  ai_ethics_trust:        "AI Ethics & Trust",
  ai_change_leadership:   "AI Change Leadership",
};

const CAPABILITY_COLOURS: Record<string, string> = {
  ...(BRAND_DOMAIN_COLOURS as Record<string, string>),
};

const LEADER_ROLES = ["platform_super_admin", "tenant_admin", "hr_leader"];

// ─── Helper: resolve which user IDs the caller may view ──────────────────────

async function resolveAccessibleUserIds(
  callerId: string,
  tenantId: string,
  roles: string[],
): Promise<{ ids: string[]; isLeader: boolean }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

  const isLeader = roles.some(r => LEADER_ROLES.includes(r));
  const isManager = roles.includes("manager");

  if (!isLeader && !isManager) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to view individual reports." });
  }

  if (isLeader) {
    // Leaders see everyone in the tenant
    const allUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.tenantId, tenantId));
    return { ids: allUsers.map(u => u.id), isLeader: true };
  }

  // Manager — only direct reports
  const members = await db
    .select({ memberId: managerTeamMembers.memberId })
    .from(managerTeamMembers)
    .where(eq(managerTeamMembers.managerId, callerId));
  return { ids: members.map(m => m.memberId), isLeader: false };
}

// ─── Helper: get latest completed score for a user ───────────────────────────

async function getLatestScore(db: Awaited<ReturnType<typeof getDb>>, userId: string, tenantId: string) {
  if (!db) return null;
  const session = await db
    .select({ id: assessmentSessions.id, completedAt: assessmentSessions.completedAt })
    .from(assessmentSessions)
    .where(and(
      eq(assessmentSessions.userId, userId),
      eq(assessmentSessions.tenantId, tenantId),
      eq(assessmentSessions.state, "completed"),
    ))
    .orderBy(desc(assessmentSessions.completedAt))
    .limit(1);
  if (!session[0]) return null;

  const score = await db
    .select()
    .from(assessmentScores)
    .where(eq(assessmentScores.sessionId, session[0].id))
    .limit(1);
  if (!score[0]) return null;

  let breakdown: Record<string, unknown> = {};
  try {
    breakdown = (typeof score[0].scoreBreakdownJson === "string"
      ? JSON.parse(score[0].scoreBreakdownJson as string)
      : (score[0].scoreBreakdownJson ?? {})) as Record<string, unknown>;
  } catch {}

  const capabilityScores = (breakdown.capabilityScores ?? {}) as Record<string, number>;
  const readiness = (breakdown.readiness as { state?: string; label?: string }) ?? {};

  return {
    sessionId: session[0].id,
    overallScore: parseFloat(String(score[0].overallScore)),
    readinessState: readiness.state ?? "unknown",
    readinessLabel: readiness.label ?? "Unknown",
    capabilityScores,
    lastAssessedAt: session[0].completedAt ? Number(session[0].completedAt) : null,
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const peopleRouter = router({
  /**
   * PR-01 / PR-02: List accessible members with their latest readiness data.
   * Leaders → all org members. Managers → direct reports only.
   */
  listMembers: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      readinessFilter: z.enum(["all", "safe", "at_risk", "unsafe", "not_assessed"]).optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const roles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      const { ids: accessibleIds, isLeader } = await resolveAccessibleUserIds(ctx.user.id, ctx.user.tenantId, roles);

      if (accessibleIds.length === 0) {
        return { members: [], total: 0, page: input?.page ?? 1, pageSize: input?.pageSize ?? 50, isLeader };
      }

      // Fetch user records
      let memberUsers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          jobFunction: users.jobFunction,
          seniorityLevel: users.seniorityLevel,
          roleFamily: users.roleFamily,
          sector: users.sector,
        })
        .from(users)
        .where(and(
          eq(users.tenantId, ctx.user.tenantId),
          inArray(users.id, accessibleIds),
        ));

      // Apply search filter
      const search = input?.search?.toLowerCase();
      if (search) {
        memberUsers = memberUsers.filter(u =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          (u.jobFunction ?? "").toLowerCase().includes(search) ||
          (u.sector ?? "").toLowerCase().includes(search)
        );
      }

      // Fetch latest scores for all members
      const scoredMembers = await Promise.all(
        memberUsers.map(async u => {
          const score = await getLatestScore(db, u.id, ctx.user.tenantId);
          return { ...u, score };
        })
      );

      // Apply readiness filter
      const rfFilter = input?.readinessFilter ?? "all";
      const filtered = rfFilter === "all" ? scoredMembers : scoredMembers.filter(m => {
        if (rfFilter === "not_assessed") return !m.score;
        return m.score?.readinessState === rfFilter;
      });

      // Sort: assessed first, then by score desc
      filtered.sort((a, b) => {
        if (!a.score && !b.score) return 0;
        if (!a.score) return 1;
        if (!b.score) return -1;
        return b.score.overallScore - a.score.overallScore;
      });

      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 50;
      const total = filtered.length;
      const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

      return { members: paginated, total, page, pageSize, isLeader };
    }),

  /**
   * PR-03: Get full individual assessment report for a specific user.
   * Leaders → any org member. Managers → direct reports only.
   */
  getMemberReport: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const roles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      const { ids: accessibleIds, isLeader } = await resolveAccessibleUserIds(ctx.user.id, ctx.user.tenantId, roles);

      // Check access
      if (!accessibleIds.includes(input.userId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: isLeader
            ? "This user is not in your organisation."
            : "This person is not in your team. You can only view reports for your direct reports.",
        });
      }

      // Fetch user profile
      const userRow = await db
        .select()
        .from(users)
        .where(and(eq(users.id, input.userId), eq(users.tenantId, ctx.user.tenantId)))
        .limit(1);
      if (!userRow[0]) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });

      // Fetch all completed sessions
      const sessions = await db
        .select()
        .from(assessmentSessions)
        .where(and(
          eq(assessmentSessions.userId, input.userId),
          eq(assessmentSessions.tenantId, ctx.user.tenantId),
          eq(assessmentSessions.state, "completed"),
        ))
        .orderBy(desc(assessmentSessions.completedAt))
        .limit(10);

      const sessionResults = await Promise.all(
        sessions.map(async s => {
          const score = await db
            .select()
            .from(assessmentScores)
            .where(eq(assessmentScores.sessionId, s.id))
            .limit(1);
          if (!score[0]) return null;

          let breakdown: Record<string, unknown> = {};
          try {
            breakdown = (typeof score[0].scoreBreakdownJson === "string"
              ? JSON.parse(score[0].scoreBreakdownJson as string)
              : (score[0].scoreBreakdownJson ?? {})) as Record<string, unknown>;
          } catch {}

          const rawCapScores = (breakdown.capabilityScores ?? {}) as Record<string, unknown>;
          const enrichedCapScores: Record<string, { score: number; displayName: string; colour: string }> = {};
          for (const [key, val] of Object.entries(rawCapScores)) {
            // val may be a plain number OR an object {band, score, signalCount} (0-100 scale)
            const rawScore = typeof val === "object" && val !== null && "score" in val
              ? (val as { score: number }).score / 10
              : typeof val === "number" ? val : 0;
            enrichedCapScores[key] = {
              score: rawScore,
              displayName: CAPABILITY_DISPLAY[key] ?? key,
              colour: CAPABILITY_COLOURS[key] ?? "#888888",
            };
          }

          const readiness = (breakdown.readiness as { state?: string; label?: string; description?: string }) ?? {};
          const failureModes = (breakdown.failureModes as { governanceFlag?: boolean; modes?: string[] }) ?? {};
          const narrative = (breakdown.narrative as string) ?? null;

          return {
            sessionId: s.id,
            completedAt: s.completedAt ? Number(s.completedAt) : null,
            overallScore: parseFloat(String(score[0].overallScore)) / 10,
            readinessState: readiness.state ?? "unknown",
            readinessLabel: readiness.label ?? "Unknown",
            readinessDescription: readiness.description ?? null,
            capabilityScores: enrichedCapScores,
            governanceFlag: failureModes.governanceFlag ?? false,
            failureModes: failureModes.modes ?? [],
            narrative,
          };
        })
      );

      const validResults = sessionResults.filter(Boolean);
      const latest = validResults[0] ?? null;

      // Longitudinal data
      const longitudinal = validResults.map(r => ({
        sessionId: r!.sessionId,
        completedAt: r!.completedAt,
        overallScore: r!.overallScore,
        readinessState: r!.readinessState,
      }));

      return {
        user: {
          id: userRow[0].id,
          firstName: userRow[0].firstName,
          lastName: userRow[0].lastName,
          email: userRow[0].email,
          jobFunction: userRow[0].jobFunction,
          seniorityLevel: userRow[0].seniorityLevel,
          roleFamily: userRow[0].roleFamily,
          sector: userRow[0].sector,
        },
        latest,
        history: validResults,
        longitudinal,
        isLeader,
        totalSessions: sessions.length,
      };
    }),

  // ─── Org Setup: list all users with org fields for the People Management table ─
  listForOrgSetup: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      functionFilter: z.string().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => LEADER_ROLES.includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const allUsers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          status: users.status,
          jobFunction: users.jobFunction,
          roleFamily: users.roleFamily,
          seniorityLevel: users.seniorityLevel,
        })
        .from(users)
        .where(eq(users.tenantId, ctx.user.tenantId));
      const allUserIds = allUsers.map(u => u.id);
      const teamRows = allUserIds.length > 0
        ? await db.select().from(managerTeamMembers).where(inArray(managerTeamMembers.memberId, allUserIds))
        : [];
      const memberToManager = new Map<string, string>();
      for (const row of teamRows) {
        if (!memberToManager.has(row.memberId)) memberToManager.set(row.memberId, row.managerId);
      }
      const roleRows = allUserIds.length > 0
        ? await db
            .select({ userId: userRoles.userId, roleKey: roles.key })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(inArray(userRoles.userId, allUserIds))
        : [];
      const userRoleMap = new Map<string, string[]>();
      for (const r of roleRows) {
        const arr = userRoleMap.get(r.userId) ?? [];
        arr.push(r.roleKey);
        userRoleMap.set(r.userId, arr);
      }
      const userById = new Map(allUsers.map(u => [u.id, u]));
      const search = input.search?.toLowerCase();
      const funcFilter = input.functionFilter;
      let filtered = allUsers.filter(u => {
        if (search) {
          const full = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase();
          if (!full.includes(search)) return false;
        }
        if (funcFilter && funcFilter !== "all") {
          if ((u.roleFamily ?? "") !== funcFilter) return false;
        }
        return true;
      });
      filtered.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
      const total = filtered.length;
      const page = input.page ?? 1;
      const pageSize = input.pageSize ?? 50;
      const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
      const result = paginated.map(u => {
        const managerId = memberToManager.get(u.id) ?? null;
        const managerUser = managerId ? userById.get(managerId) : null;
        return {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          status: u.status,
          roleFamily: u.roleFamily ?? null,
          jobFunction: u.jobFunction ?? null,
          seniorityLevel: u.seniorityLevel ?? null,
          roleKeys: userRoleMap.get(u.id) ?? [],
          managerId: managerId,
          managerName: managerUser ? `${managerUser.firstName} ${managerUser.lastName}`.trim() : null,
        };
      });
      return { users: result, total, page, pageSize };
    }),

  // ─── Org Setup: list all users with manager role ─────────────────────────────
  listManagers: protectedProcedure
    .query(async ({ ctx }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => LEADER_ROLES.includes(r))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const managerRoleRow = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, "manager")).limit(1);
      if (!managerRoleRow[0]) return [];
      const managerUserIds = await db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(and(eq(userRoles.roleId, managerRoleRow[0].id), eq(userRoles.tenantId, ctx.user.tenantId)));
      if (!managerUserIds.length) return [];
      const ids = managerUserIds.map(r => r.userId);
      const managerUsers = await db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
        .from(users)
        .where(and(eq(users.tenantId, ctx.user.tenantId), inArray(users.id, ids)));
      return managerUsers.map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}`.trim(), email: u.email }));
    }),

  // ─── Org Setup: get team members for a specific manager ──────────────────────
  getTeamMembers: protectedProcedure
    .input(z.object({ managerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      const isSelf = input.managerId === ctx.user.id;
      const isLeaderRole = myRoles.some(r => LEADER_ROLES.includes(r));
      const isManagerRole = myRoles.includes("manager");
      if (!isLeaderRole && !(isManagerRole && isSelf)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const memberRows = await db
        .select({ memberId: managerTeamMembers.memberId, addedAt: managerTeamMembers.addedAt })
        .from(managerTeamMembers)
        .where(eq(managerTeamMembers.managerId, input.managerId));
      if (!memberRows.length) return [];
      const memberIds = memberRows.map(r => r.memberId);
      const memberUsers = await db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email, roleFamily: users.roleFamily, jobFunction: users.jobFunction })
        .from(users)
        .where(and(eq(users.tenantId, ctx.user.tenantId), inArray(users.id, memberIds)));
      const addedAtMap = new Map(memberRows.map(r => [r.memberId, r.addedAt]));
      return memberUsers.map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        roleFamily: u.roleFamily ?? null,
        jobFunction: u.jobFunction ?? null,
        addedAt: addedAtMap.get(u.id) ?? 0,
      }));
    }),

  // ─── Org Setup: update a user's role_family ───────────────────────────────────
  updateRoleFamily: protectedProcedure
    .input(z.object({ userId: z.string(), roleFamily: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => LEADER_ROLES.includes(r))) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [target] = await db.select({ id: users.id }).from(users)
        .where(and(eq(users.id, input.userId), eq(users.tenantId, ctx.user.tenantId))).limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(users).set({ roleFamily: input.roleFamily }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // ─── Org Setup: assign or remove a user's manager ────────────────────────────
  updateManager: protectedProcedure
    .input(z.object({ userId: z.string(), managerId: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      if (!myRoles.some(r => LEADER_ROLES.includes(r))) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [target] = await db.select({ id: users.id }).from(users)
        .where(and(eq(users.id, input.userId), eq(users.tenantId, ctx.user.tenantId))).limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      await db.delete(managerTeamMembers).where(eq(managerTeamMembers.memberId, input.userId));
      if (input.managerId) {
        const [mgr] = await db.select({ id: users.id }).from(users)
          .where(and(eq(users.id, input.managerId), eq(users.tenantId, ctx.user.tenantId))).limit(1);
        if (!mgr) throw new TRPCError({ code: "NOT_FOUND", message: "Manager not found" });
        await db.insert(managerTeamMembers).values({
          id: nanoid(), managerId: input.managerId, memberId: input.userId, addedAt: Date.now(),
        }).onDuplicateKeyUpdate({ set: { addedAt: Date.now() } });
      }
      return { success: true };
    }),

  // ─── Org Setup: remove a specific member from a manager's team ───────────────
  removeTeamMember: protectedProcedure
    .input(z.object({ managerId: z.string(), memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      const isSelf = input.managerId === ctx.user.id;
      if (!myRoles.some(r => LEADER_ROLES.includes(r)) && !isSelf) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(managerTeamMembers).where(and(
        eq(managerTeamMembers.managerId, input.managerId),
        eq(managerTeamMembers.memberId, input.memberId),
      ));
      return { success: true };
    }),

  // ─── Org Setup: add a member to a manager's team by email ────────────────────
  addTeamMemberByEmail: protectedProcedure
    .input(z.object({ managerId: z.string(), memberEmail: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      const isSelf = input.managerId === ctx.user.id;
      if (!myRoles.some(r => LEADER_ROLES.includes(r)) && !isSelf) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [member] = await db.select().from(users)
        .where(and(eq(users.email, input.memberEmail.toLowerCase()), eq(users.tenantId, ctx.user.tenantId))).limit(1);
      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "User not found in your organisation" });
      if (member.id === input.managerId) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot add manager to their own team" });
      await db.insert(managerTeamMembers).values({
        id: nanoid(), managerId: input.managerId, memberId: member.id, addedAt: Date.now(),
      }).onDuplicateKeyUpdate({ set: { addedAt: Date.now() } });
      return { success: true, memberName: `${member.firstName} ${member.lastName}`.trim(), memberId: member.id };
    }),
});
