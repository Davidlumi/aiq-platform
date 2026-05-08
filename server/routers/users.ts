import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb, getUserRoleKeys } from "../db";
import { users, userRoles, roles, invitations } from "../../drizzle/schema";
import { sendInvitationEmail } from "../email";
import { tenants } from "../../drizzle/schema";
import { eq, and, like, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hashPassword } from "../auth";

function requireRole(userRoleList: string[], ...allowed: string[]) {
  if (!allowed.some(r => userRoleList.includes(r))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions" });
  }
}

export const usersRouter = router({
  // List users in tenant (admin/hr/manager)
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      requireRole(myRoles, "platform_super_admin", "tenant_admin", "hr_leader", "manager");

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const offset = (input.page - 1) * input.pageSize;

      let query = db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          status: users.status,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
        })
        .from(users)
        .where(eq(users.tenantId, ctx.user.tenantId))
        .orderBy(desc(users.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      const result = await query;

      // Attach roles
      const withRoles = await Promise.all(
        result.map(async u => ({
          ...u,
          roles: await getUserRoleKeys(u.id, ctx.user.tenantId),
        }))
      );

      return { users: withRoles, page: input.page, pageSize: input.pageSize };
    }),

  // Get single user profile
  get: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      const isSelf = input.userId === ctx.user.id;
      if (!isSelf) {
        requireRole(myRoles, "platform_super_admin", "tenant_admin", "hr_leader", "manager", "auditor");
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const result = await db
        .select()
        .from(users)
        .where(and(eq(users.id, input.userId), eq(users.tenantId, ctx.user.tenantId)))
        .limit(1);

      if (!result[0]) throw new TRPCError({ code: "NOT_FOUND" });

      const userRoleKeys = await getUserRoleKeys(result[0].id, ctx.user.tenantId);
      const { passwordHash, passwordResetToken, passwordResetExpiry, ...safeUser } = result[0];

      return { ...safeUser, roles: userRoleKeys };
    }),

  // Create user (admin only)
  create: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        password: z.string().min(8),
        roleKey: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      requireRole(myRoles, "platform_super_admin", "tenant_admin", "hr_leader");

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check email unique
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.tenantId, ctx.user.tenantId), eq(users.email, input.email.toLowerCase())))
        .limit(1);

      if (existing[0]) {
        throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
      }

      const passwordHash = await hashPassword(input.password);
      const userId = nanoid();

      await db.insert(users).values({
        id: userId,
        tenantId: ctx.user.tenantId,
        email: input.email.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
        status: "active",
      });

      // Assign role
      const roleResult = await db
        .select()
        .from(roles)
        .where(eq(roles.key, input.roleKey))
        .limit(1);

      if (roleResult[0]) {
        await db.insert(userRoles).values({
          id: nanoid(),
          tenantId: ctx.user.tenantId,
          userId,
          roleId: roleResult[0].id,
          assignedBy: ctx.user.id,
        });
      }

      return { success: true, userId };
    }),

  // Update user status
  updateStatus: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        status: z.enum(["active", "suspended", "deactivated"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      requireRole(myRoles, "platform_super_admin", "tenant_admin");

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(users)
        .set({ status: input.status })
        .where(and(eq(users.id, input.userId), eq(users.tenantId, ctx.user.tenantId)));

      return { success: true };
    }),

  // Change a user's primary role
  changeRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        roleKey: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      requireRole(myRoles, "platform_super_admin", "tenant_admin", "hr_leader");
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change your own role" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const roleRows = await db.select().from(roles).where(eq(roles.key, input.roleKey)).limit(1);
      if (!roleRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
      const roleId = roleRows[0].id;
      await db.delete(userRoles).where(
        and(eq(userRoles.userId, input.userId), eq(userRoles.tenantId, ctx.user.tenantId))
      );
      await db.insert(userRoles).values({
        id: nanoid(),
        userId: input.userId,
        roleId,
        tenantId: ctx.user.tenantId,
        assignedBy: ctx.user.id,
      });
      return { success: true };
    }),

  // Bulk invite users from CSV data
  bulkInvite: protectedProcedure
    .input(z.object({
      rows: z.array(z.object({
        email: z.string().email(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        roleKey: z.string().default("hr_professional"),
      })).min(1).max(200),
    }))
    .mutation(async ({ input, ctx }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      requireRole(myRoles, "platform_super_admin", "tenant_admin", "hr_leader");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const allRoles = await db.select().from(roles);
      const roleMap = Object.fromEntries(allRoles.map(r => [r.key, r.id]));
      const results: { email: string; status: "created" | "skipped"; reason?: string }[] = [];
      const tempPassword = "AiQ-Beta-2025!";
      for (const row of input.rows) {
        const email = row.email.toLowerCase().trim();
        const existing = await db.select({ id: users.id }).from(users)
          .where(and(eq(users.tenantId, ctx.user.tenantId), eq(users.email, email))).limit(1);
        if (existing[0]) {
          results.push({ email, status: "skipped", reason: "Already exists" });
          continue;
        }
        const passwordHash = await hashPassword(tempPassword);
        const userId = nanoid();
        await db.insert(users).values({
          id: userId,
          tenantId: ctx.user.tenantId,
          email,
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          passwordHash,
          status: "active",
        });
        const roleKey = row.roleKey || "hr_professional";
        const roleId = roleMap[roleKey] ?? roleMap["hr_professional"];
        if (roleId) {
          await db.insert(userRoles).values({
            id: nanoid(),
            tenantId: ctx.user.tenantId,
            userId,
            roleId,
            assignedBy: ctx.user.id,
          });
        }
        results.push({ email, status: "created" });
      }
      const created = results.filter(r => r.status === "created").length;
      const skipped = results.filter(r => r.status === "skipped").length;
      return { created, skipped, results, tempPassword };
    }),

  // Export users as CSV-ready data
  exportCsv: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    requireRole(myRoles, "platform_super_admin", "tenant_admin", "hr_leader");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select({
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      status: users.status,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.tenantId, ctx.user.tenantId)).orderBy(users.lastName);
    return rows;
  }),

  // Get all available roles
  availableRoles: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    requireRole(myRoles, "platform_super_admin", "tenant_admin", "hr_leader");

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    return db.select().from(roles);
  }),

  // ─── Magic-link invitations ────────────────────────────────────────────────────────────

  /** Send a magic-link invitation to a single email address */
  sendInvitation: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      roleKey: z.string().default("hr_professional"),
      origin: z.string().url(),
    }))
    .mutation(async ({ input, ctx }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      requireRole(myRoles, "platform_super_admin", "tenant_admin", "hr_leader");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const email = input.email.toLowerCase().trim();

      // Check if user already exists
      const existing = await db.select({ id: users.id })
        .from(users)
        .where(and(eq(users.tenantId, ctx.user.tenantId), eq(users.email, email)))
        .limit(1);
      if (existing[0]) throw new TRPCError({ code: "CONFLICT", message: "A user with this email already exists in your organisation." });

      // Expire any existing pending invitations for this email
      await db.update(invitations)
        .set({ status: "expired" })
        .where(and(
          eq(invitations.tenantId, ctx.user.tenantId),
          eq(invitations.email, email),
          eq(invitations.status, "pending"),
        ));

      // Create new invitation token (64-char hex)
      const { randomBytes } = await import("crypto");
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

      await db.insert(invitations).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        email,
        token,
        roleKey: input.roleKey,
        invitedBy: ctx.user.id,
        status: "pending",
        expiresAt,
      });

      // Get inviter name and org name
      const inviterRow = await db.select({ firstName: users.firstName, lastName: users.lastName })
        .from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const inviterName = inviterRow[0] ? `${inviterRow[0].firstName} ${inviterRow[0].lastName}` : "Your colleague";
      const tenantRow = await db.select({ name: tenants.name })
        .from(tenants).where(eq(tenants.id, ctx.user.tenantId)).limit(1);
      const orgName = tenantRow[0]?.name ?? "your organisation";

      const acceptUrl = `${input.origin}/accept-invitation?token=${token}`;

      // Send email (fire-and-forget — don't fail the mutation if email fails)
      sendInvitationEmail({ to: email, inviterName, orgName, acceptUrl, expiresHours: 72 })
        .catch(() => {/* ignore email errors */});

      return { success: true, email, acceptUrl };
    }),

  /** List all invitations for the tenant */
  listInvitations: protectedProcedure.query(async ({ ctx }) => {
    const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
    requireRole(myRoles, "platform_super_admin", "tenant_admin", "hr_leader");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Auto-expire old invitations
    await db.update(invitations)
      .set({ status: "expired" })
      .where(and(
        eq(invitations.tenantId, ctx.user.tenantId),
        eq(invitations.status, "pending"),
        sql`${invitations.expiresAt} < NOW()`,
      ));

    return db.select({
      id: invitations.id,
      email: invitations.email,
      roleKey: invitations.roleKey,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      acceptedAt: invitations.acceptedAt,
      createdAt: invitations.createdAt,
    })
      .from(invitations)
      .where(eq(invitations.tenantId, ctx.user.tenantId))
      .orderBy(desc(invitations.createdAt))
      .limit(200);
  }),

  /** Revoke a pending invitation */
  revokeInvitation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      requireRole(myRoles, "platform_super_admin", "tenant_admin", "hr_leader");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.update(invitations)
        .set({ status: "revoked" })
        .where(and(
          eq(invitations.id, input.id),
          eq(invitations.tenantId, ctx.user.tenantId),
          eq(invitations.status, "pending"),
        ));
      return { success: true };
    }),

  /** Resend an invitation (creates a new token, expires the old one) */
  resendInvitation: protectedProcedure
    .input(z.object({ id: z.string(), origin: z.string().url() }))
    .mutation(async ({ input, ctx }) => {
      const myRoles = await getUserRoleKeys(ctx.user.id, ctx.user.tenantId);
      requireRole(myRoles, "platform_super_admin", "tenant_admin", "hr_leader");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const inv = await db.select()
        .from(invitations)
        .where(and(eq(invitations.id, input.id), eq(invitations.tenantId, ctx.user.tenantId)))
        .limit(1);
      if (!inv[0]) throw new TRPCError({ code: "NOT_FOUND" });

      // Expire the old invitation
      await db.update(invitations)
        .set({ status: "expired" })
        .where(eq(invitations.id, input.id));

      // Create a new one
      const { randomBytes } = await import("crypto");
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const newId = nanoid();

      await db.insert(invitations).values({
        id: newId,
        tenantId: ctx.user.tenantId,
        email: inv[0].email,
        token,
        roleKey: inv[0].roleKey,
        invitedBy: ctx.user.id,
        status: "pending",
        expiresAt,
      });

      const inviterRow = await db.select({ firstName: users.firstName, lastName: users.lastName })
        .from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const inviterName = inviterRow[0] ? `${inviterRow[0].firstName} ${inviterRow[0].lastName}` : "Your colleague";
      const tenantRow = await db.select({ name: tenants.name })
        .from(tenants).where(eq(tenants.id, ctx.user.tenantId)).limit(1);
      const orgName = tenantRow[0]?.name ?? "your organisation";

      const acceptUrl = `${input.origin}/accept-invitation?token=${token}`;
      sendInvitationEmail({ to: inv[0].email, inviterName, orgName, acceptUrl, expiresHours: 72 })
        .catch(() => {});

      return { success: true, newId };
    }),

  /** Accept an invitation (public — no auth required) */
  acceptInvitation: publicProcedure
    .input(z.object({
      token: z.string(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      password: z.string().min(8),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Look up the invitation
      const inv = await db.select()
        .from(invitations)
        .where(and(eq(invitations.token, input.token), eq(invitations.status, "pending")))
        .limit(1);
      if (!inv[0]) throw new TRPCError({ code: "NOT_FOUND", message: "This invitation link is invalid or has expired." });
      if (new Date(inv[0].expiresAt) < new Date()) {
        await db.update(invitations).set({ status: "expired" }).where(eq(invitations.id, inv[0].id));
        throw new TRPCError({ code: "NOT_FOUND", message: "This invitation link has expired. Please ask your administrator to send a new one." });
      }

      // Check if user already exists (race condition guard)
      const existing = await db.select({ id: users.id })
        .from(users)
        .where(and(eq(users.tenantId, inv[0].tenantId), eq(users.email, inv[0].email)))
        .limit(1);
      if (existing[0]) {
        await db.update(invitations).set({ status: "accepted", acceptedAt: new Date(), createdUserId: existing[0].id }).where(eq(invitations.id, inv[0].id));
        throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists. Please sign in instead." });
      }

      // Create the user account
      const passwordHash = await hashPassword(input.password);
      const userId = nanoid();
      await db.insert(users).values({
        id: userId,
        tenantId: inv[0].tenantId,
        email: inv[0].email,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        passwordHash,
        status: "active",
      });

      // Assign role
      const allRoles = await db.select().from(roles);
      const roleMap = Object.fromEntries(allRoles.map(r => [r.key, r.id]));
      const roleId = roleMap[inv[0].roleKey] ?? roleMap["hr_professional"];
      if (roleId) {
        await db.insert(userRoles).values({
          id: nanoid(),
          tenantId: inv[0].tenantId,
          userId,
          roleId,
          assignedBy: inv[0].invitedBy,
        });
      }

      // Mark invitation as accepted
      await db.update(invitations)
        .set({ status: "accepted", acceptedAt: new Date(), createdUserId: userId })
        .where(eq(invitations.id, inv[0].id));

      return { success: true, email: inv[0].email };
    }),

  /** Validate an invitation token (public — used by the accept-invitation page) */
  validateInvitationToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const inv = await db.select({
        id: invitations.id,
        email: invitations.email,
        roleKey: invitations.roleKey,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        tenantId: invitations.tenantId,
      })
        .from(invitations)
        .where(and(eq(invitations.token, input.token), eq(invitations.status, "pending")))
        .limit(1);

      if (!inv[0]) return { valid: false, reason: "invalid" as const };
      if (new Date(inv[0].expiresAt) < new Date()) return { valid: false, reason: "expired" as const };

      // Get org name
      const tenantRow = await db.select({ name: tenants.name })
        .from(tenants).where(eq(tenants.id, inv[0].tenantId)).limit(1);

      return {
        valid: true,
        email: inv[0].email,
        roleKey: inv[0].roleKey,
        orgName: tenantRow[0]?.name ?? "your organisation",
      };
    }),
});
