/**
 * server/routers/commercial.ts
 * Commercial layer: team subscriptions, seat management, Journey ladder, XP engine.
 *
 * PRIVACY INVARIANT (AiQ Bible §7):
 *   The billing admin can see: seat count, invite status, email addresses.
 *   The billing admin CANNOT see: capability scores, domain data, assessment results.
 *   This is enforced structurally — no capability data is ever joined or returned here.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, inArray, isNull, desc, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  teamSubscriptions,
  teamSeatMembers,
  userBillingRoles,
  journeyProgress,
  xpLedger,
  journeyMilestones,
  dataDeletionRequests,
  users,
  tenants,
} from "../../drizzle/schema";
import {
  STRIPE_PRODUCTS,
  getTeamPriceBand,
  getTeamMonthlyTotal,
  getPerSeatAmount,
  type StripePriceKey,
} from "../stripe/products";
import { notifyOwner } from "../_core/notification";

// ---------------------------------------------------------------------------
// Journey Ladder constants (AiQ Bible §5)
// ---------------------------------------------------------------------------

export const JOURNEY_LEVELS: Array<{ level: number; label: string; xpRequired: number }> = [
  { level: 1,  label: "Curious",      xpRequired: 0    },
  { level: 2,  label: "Explorer",     xpRequired: 100  },
  { level: 3,  label: "Learner",      xpRequired: 250  },
  { level: 4,  label: "Starter",      xpRequired: 450  },
  { level: 5,  label: "User",         xpRequired: 700  },
  { level: 6,  label: "Practitioner", xpRequired: 1000 },
  { level: 7,  label: "Operator",     xpRequired: 1400 },
  { level: 8,  label: "Skilled",      xpRequired: 1900 },
  { level: 9,  label: "Power User",   xpRequired: 2500 },
  { level: 10, label: "Specialist",   xpRequired: 3200 },
  { level: 11, label: "Champion",     xpRequired: 4000 },
  { level: 12, label: "Pacesetter",   xpRequired: 5000 },
  { level: 13, label: "Leader",       xpRequired: 6200 },
  { level: 14, label: "Veteran",      xpRequired: 7600 },
  { level: 15, label: "Trailblazer",  xpRequired: 9200 },
];

export const XP_EVENTS = {
  module_complete:       50,
  pathway_complete:      200,
  assessment_complete:   100,
  domain_reassessment:   75,
  band_up:               150,
  streak_week:           25,
  breadth_bonus:         100,
  on_time_reassessment:  50,
} as const;

export type XpEventType = keyof typeof XP_EVENTS;

/** Compute which Journey level a given total XP corresponds to */
function computeLevel(totalXp: number): { level: number; levelStartXp: number; nextLevelXp: number | null } {
  let current = JOURNEY_LEVELS[0];
  for (const l of JOURNEY_LEVELS) {
    if (totalXp >= l.xpRequired) current = l;
    else break;
  }
  const nextLevel = JOURNEY_LEVELS.find(l => l.level === current.level + 1);
  return {
    level: current.level,
    levelStartXp: current.xpRequired,
    nextLevelXp: nextLevel?.xpRequired ?? null,
  };
}

// ---------------------------------------------------------------------------
// XP Engine helper — award XP and update journey progress
// ---------------------------------------------------------------------------

export async function awardXp(
  userId: string,
  eventType: XpEventType,
  opts?: { refId?: string; meta?: Record<string, unknown>; idempotencyKey?: string }
): Promise<{ xpAwarded: number; newLevel: number; leveledUp: boolean; prevLevel: number }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const xpAmount = XP_EVENTS[eventType];
  const idempotencyKey = opts?.idempotencyKey ?? `${userId}:${eventType}:${opts?.refId ?? Date.now()}`;

  // Idempotency check — skip if already awarded
  const existing = await db
    .select({ id: xpLedger.id })
    .from(xpLedger)
    .where(eq(xpLedger.idempotencyKey, idempotencyKey))
    .limit(1);
  if (existing.length > 0) {
    // Already awarded — return current state without changes
    const prog = await db.select().from(journeyProgress).where(eq(journeyProgress.userId, userId)).limit(1);
    const p = prog[0];
    return { xpAwarded: 0, newLevel: p?.currentLevel ?? 1, leveledUp: false, prevLevel: p?.currentLevel ?? 1 };
  }

  // Insert XP ledger entry
  await db.insert(xpLedger).values({
    id: crypto.randomUUID(),
    userId,
    eventType,
    xpAmount,
    refId: opts?.refId,
    metaJson: opts?.meta ?? {},
    idempotencyKey,
  });

  // Upsert journey_progress
  const existing_prog = await db.select().from(journeyProgress).where(eq(journeyProgress.userId, userId)).limit(1);
  const prevTotalXp = existing_prog[0]?.totalXp ?? 0;
  const prevLevel = existing_prog[0]?.currentLevel ?? 1;
  const newTotalXp = prevTotalXp + xpAmount;
  const { level: newLevel, levelStartXp } = computeLevel(newTotalXp);
  const leveledUp = newLevel > prevLevel;

  if (existing_prog.length === 0) {
    await db.insert(journeyProgress).values({
      id: crypto.randomUUID(),
      userId,
      currentLevel: newLevel,
      totalXp: newTotalXp,
      levelStartXp,
      lastLevelUpAt: leveledUp ? new Date() : undefined,
      prevLevel: leveledUp ? prevLevel : undefined,
    });
  } else {
    await db.update(journeyProgress)
      .set({
        currentLevel: newLevel,
        totalXp: newTotalXp,
        levelStartXp,
        ...(leveledUp ? { lastLevelUpAt: new Date(), prevLevel } : {}),
      })
      .where(eq(journeyProgress.userId, userId));
  }

  // Award milestone if leveled up
  if (leveledUp) {
    const levelLabel = JOURNEY_LEVELS.find(l => l.level === newLevel)?.label ?? `Level ${newLevel}`;
    await db.insert(journeyMilestones).values({
      id: crypto.randomUUID(),
      userId,
      milestoneType: "level_up",
      label: `Reached ${levelLabel} (Level ${newLevel})`,
      refId: undefined,
      metaJson: { newLevel, prevLevel, xpTotal: newTotalXp },
    });
  }

  return { xpAwarded: xpAmount, newLevel, leveledUp, prevLevel };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const commercialRouter = router({
  // -------------------------------------------------------------------------
  // Journey Ladder
  // -------------------------------------------------------------------------

  /** Get the current user's Journey progress */
  journey: {
    getProgress: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const prog = await db
        .select()
        .from(journeyProgress)
        .where(eq(journeyProgress.userId, ctx.user.id))
        .limit(1);

      const p = prog[0];
      const totalXp = p?.totalXp ?? 0;
      const currentLevel = p?.currentLevel ?? 1;
      const { levelStartXp, nextLevelXp } = computeLevel(totalXp);
      const levelLabel = JOURNEY_LEVELS.find(l => l.level === currentLevel)?.label ?? "Curious";
      const xpIntoLevel = totalXp - levelStartXp;
      const xpNeededForNext = nextLevelXp != null ? nextLevelXp - levelStartXp : null;
      const progressPct = xpNeededForNext != null ? Math.min(100, Math.round((xpIntoLevel / xpNeededForNext) * 100)) : 100;

      return {
        currentLevel,
        levelLabel,
        totalXp,
        xpIntoLevel,
        xpNeededForNext,
        progressPct,
        lastLevelUpAt: p?.lastLevelUpAt ?? null,
        prevLevel: p?.prevLevel ?? null,
        levels: JOURNEY_LEVELS,
      };
    }),

    /** Get unseen milestones and mark them as seen */
    getUnseenMilestones: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const milestones = await db
        .select()
        .from(journeyMilestones)
        .where(and(
          eq(journeyMilestones.userId, ctx.user.id),
          isNull(journeyMilestones.seenAt)
        ))
        .orderBy(desc(journeyMilestones.earnedAt))
        .limit(10);

      // Mark as seen
      if (milestones.length > 0) {
        const ids = milestones.map(m => m.id);
          await db.update(journeyMilestones)
          .set({ seenAt: new Date() })
          .where(inArray(journeyMilestones.id, ids));
      }

      return milestones;
    }),

    /** Award XP for a specific event (server-side only — called from other routers) */
    awardXp: protectedProcedure
      .input(z.object({
        eventType: z.enum(["module_complete", "pathway_complete", "assessment_complete", "domain_reassessment", "band_up", "streak_week", "breadth_bonus", "on_time_reassessment"]),
        refId: z.string().optional(),
        meta: z.record(z.string(), z.unknown()).optional(),
        idempotencyKey: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return awardXp(ctx.user.id, input.eventType as XpEventType, {
          refId: input.refId,
          meta: input.meta,
          idempotencyKey: input.idempotencyKey,
        });
      }),
  },

  // -------------------------------------------------------------------------
  // Team Subscriptions
  // -------------------------------------------------------------------------

  team: {
    /** Get the current user's team subscription (if they are a billing admin) */
    getSubscription: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const billingRole = await db
        .select()
        .from(userBillingRoles)
        .where(eq(userBillingRoles.userId, ctx.user.id))
        .limit(1);

      if (!billingRole[0]) return null;

      const sub = await db
        .select()
        .from(teamSubscriptions)
        .where(eq(teamSubscriptions.id, billingRole[0].teamSubscriptionId))
        .limit(1);

      if (!sub[0]) return null;

      // Get seat members — PRIVACY: only email, status, addedAt — NO capability data
      const members = await db
        .select({
          id: teamSeatMembers.id,
          inviteEmail: teamSeatMembers.inviteEmail,
          status: teamSeatMembers.status,
          addedAt: teamSeatMembers.addedAt,
          removedAt: teamSeatMembers.removedAt,
        })
        .from(teamSeatMembers)
        .where(and(
          eq(teamSeatMembers.teamSubscriptionId, sub[0].id),
          inArray(teamSeatMembers.status, ["invited", "active"])
        ));

      const seatCount = sub[0].seatCount;
      const bandKey = getTeamPriceBand(seatCount);
      const perSeatPence = getPerSeatAmount(seatCount);
      const monthlyTotalPence = getTeamMonthlyTotal(seatCount);

      return {
        ...sub[0],
        members,
        activeSeats: members.filter(m => m.status === "active").length,
        invitedSeats: members.filter(m => m.status === "invited").length,
        bandKey,
        perSeatPence,
        monthlyTotalPence,
        perSeatGbp: (perSeatPence / 100).toFixed(2),
        monthlyTotalGbp: (monthlyTotalPence / 100).toFixed(2),
      };
    }),

    /** Invite a new seat member by email */
    inviteMember: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Verify caller is billing admin
        const billingRole = await db
          .select()
          .from(userBillingRoles)
          .where(eq(userBillingRoles.userId, ctx.user.id))
          .limit(1);
        if (!billingRole[0]) throw new TRPCError({ code: "FORBIDDEN", message: "Not a billing admin" });

        const sub = await db
          .select()
          .from(teamSubscriptions)
          .where(eq(teamSubscriptions.id, billingRole[0].teamSubscriptionId))
          .limit(1);
        if (!sub[0]) throw new TRPCError({ code: "NOT_FOUND" });

        // Check seat capacity
        const activeMembers = await db
          .select({ id: teamSeatMembers.id })
          .from(teamSeatMembers)
          .where(and(
            eq(teamSeatMembers.teamSubscriptionId, sub[0].id),
            inArray(teamSeatMembers.status, ["invited", "active"])
          ));
        if (activeMembers.length >= sub[0].seatCount) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `All ${sub[0].seatCount} seats are in use. Increase your seat count to add more members.` });
        }

        // Check not already a member
        const existing = await db
          .select({ id: teamSeatMembers.id })
          .from(teamSeatMembers)
          .where(and(
            eq(teamSeatMembers.teamSubscriptionId, sub[0].id),
            eq(teamSeatMembers.inviteEmail, input.email.toLowerCase()),
            inArray(teamSeatMembers.status, ["invited", "active"])
          ))
          .limit(1);
        if (existing[0]) throw new TRPCError({ code: "CONFLICT", message: "This email already has a seat." });

        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await db.insert(teamSeatMembers).values({
          id: crypto.randomUUID(),
          teamSubscriptionId: sub[0].id,
          inviteEmail: input.email.toLowerCase(),
          inviteToken: token,
          inviteExpiresAt: expiresAt,
          status: "invited",
        });

        const inviteUrl = `${input.origin}/join-team?token=${token}`;
        // Notify owner of new invite
        await notifyOwner({
          title: "Team seat invite sent",
          content: `Billing admin ${ctx.user.email} invited ${input.email} to team ${sub[0].id}. Invite URL: ${inviteUrl}`,
        });

        return { inviteUrl, expiresAt };
      }),

    /** Remove a seat member */
    removeMember: protectedProcedure
      .input(z.object({ memberId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const billingRole = await db
          .select()
          .from(userBillingRoles)
          .where(eq(userBillingRoles.userId, ctx.user.id))
          .limit(1);
        if (!billingRole[0]) throw new TRPCError({ code: "FORBIDDEN" });

        const member = await db
          .select()
          .from(teamSeatMembers)
          .where(and(
            eq(teamSeatMembers.id, input.memberId),
            eq(teamSeatMembers.teamSubscriptionId, billingRole[0].teamSubscriptionId)
          ))
          .limit(1);
        if (!member[0]) throw new TRPCError({ code: "NOT_FOUND" });

        await db.update(teamSeatMembers)
          .set({ status: "removed", removedAt: new Date() })
          .where(eq(teamSeatMembers.id, input.memberId));

        return { success: true };
      }),

    /** Update seat count (triggers repricing if band changes) */
    updateSeatCount: protectedProcedure
      .input(z.object({ seatCount: z.number().int().min(3) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const billingRole = await db
          .select()
          .from(userBillingRoles)
          .where(eq(userBillingRoles.userId, ctx.user.id))
          .limit(1);
        if (!billingRole[0]) throw new TRPCError({ code: "FORBIDDEN" });

        const sub = await db
          .select()
          .from(teamSubscriptions)
          .where(eq(teamSubscriptions.id, billingRole[0].teamSubscriptionId))
          .limit(1);
        if (!sub[0]) throw new TRPCError({ code: "NOT_FOUND" });

        // Ensure new seat count >= active members
        const activeCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(teamSeatMembers)
          .where(and(
            eq(teamSeatMembers.teamSubscriptionId, sub[0].id),
            inArray(teamSeatMembers.status, ["invited", "active"])
          ));
        const currentActive = Number(activeCount[0]?.count ?? 0);
        if (input.seatCount < currentActive) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot reduce below ${currentActive} seats (current active members).` });
        }

        const bandKey = getTeamPriceBand(input.seatCount);
        const perSeatPence = getPerSeatAmount(input.seatCount);

        await db.update(teamSubscriptions)
          .set({
            seatCount: input.seatCount,
            priceBandKey: bandKey,
            perSeatPencePm: perSeatPence,
          })
          .where(eq(teamSubscriptions.id, sub[0].id));

        return {
          seatCount: input.seatCount,
          bandKey,
          perSeatGbp: (perSeatPence / 100).toFixed(2),
          monthlyTotalGbp: (getTeamMonthlyTotal(input.seatCount) / 100).toFixed(2),
        };
      }),

    /** Get team pricing preview for a given seat count */
    getPricingPreview: protectedProcedure
      .input(z.object({ seatCount: z.number().int().min(3).max(500) }))
      .query(({ input }) => {
        const { seatCount } = input;
        const bandKey = getTeamPriceBand(seatCount);
        const perSeatPence = getPerSeatAmount(seatCount);
        const monthlyTotalPence = getTeamMonthlyTotal(seatCount);
        return {
          seatCount,
          bandKey,
          perSeatGbp: (perSeatPence / 100).toFixed(2),
          monthlyTotalGbp: (monthlyTotalPence / 100).toFixed(2),
          annualTotalGbp: ((monthlyTotalPence * 12) / 100).toFixed(2),
        };
      }),
  },

  // -------------------------------------------------------------------------
  // Data Deletion
  // -------------------------------------------------------------------------

  /** Request data deletion (AiQ Bible §7: separate explicit delete flow) */
  requestDataDeletion: protectedProcedure
    .input(z.object({ reason: z.string().max(1000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check for existing pending request
      const existing = await db
        .select({ id: dataDeletionRequests.id })
        .from(dataDeletionRequests)
        .where(and(
          eq(dataDeletionRequests.userId, ctx.user.id),
          eq(dataDeletionRequests.status, "pending")
        ))
        .limit(1);

      if (existing[0]) {
        throw new TRPCError({ code: "CONFLICT", message: "A data deletion request is already pending." });
      }

      await db.insert(dataDeletionRequests).values({
        id: crypto.randomUUID(),
        userId: ctx.user.id,
        tenantId: ctx.user.tenantId,
        reason: input.reason,
      });

      await notifyOwner({
        title: "Data deletion request",
        content: `User ${ctx.user.email} (${ctx.user.id}) has requested data deletion. Reason: ${input.reason ?? "not provided"}. Process within 30 days.`,
      });

      return { success: true, message: "Your data deletion request has been received. We will process it within 30 days and notify you by email." };
    }),

  /** Check if a data deletion request is pending */
  getDataDeletionStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const req = await db
      .select()
      .from(dataDeletionRequests)
      .where(eq(dataDeletionRequests.userId, ctx.user.id))
      .orderBy(desc(dataDeletionRequests.requestedAt))
      .limit(1);

    return req[0] ?? null;
  }),
});
