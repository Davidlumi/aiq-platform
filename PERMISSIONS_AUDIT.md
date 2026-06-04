# AiQ Permissions & Back-Office — Part 1 Audit Report

**Date:** June 2026  
**Scope:** Auth flow, roles/permissions, tenant model, back-office code, backend vs UI-only enforcement, privilege-escalation paths, My Team status.

---

## 1. Authentication Flow

**How login works (server-side):**

1. `auth.login` (`server/routers/auth.ts`) receives `{email, password, tenantSlug}` via a public tRPC procedure.
2. The tenant is resolved from `tenantSlug` via a DB lookup on the `tenants` table (case-insensitive slug match). If the tenant is not found, the request is rejected.
3. The user is looked up by `(tenantId, email)`. If `status === 'suspended'` or `'deactivated'`, the request is rejected with `FORBIDDEN`.
4. `bcrypt.compare` verifies the password against `users.passwordHash`.
5. On success, a JWT is signed with `{userId, tenantId, email}` using `HS256` and `JWT_SECRET`. It is set as an `httpOnly` cookie (secure + sameSite=none in production).
6. The JWT has a **1-year expiry** and no server-side revocation mechanism (no token table, no blacklist).

**How the session is resolved per-request (server-side):**

`server/_core/context.ts` runs on every tRPC request:
1. Reads the session cookie.
2. Calls `verifySessionToken()` — verifies the JWT signature and expiry.
3. Calls `getUserById(payload.userId)` — fetches the full `User` row from the DB.
4. Attaches `user` to `ctx`. If any step fails, `ctx.user = null`.

**What `ctx.user` contains:** The raw `User` row from the `users` table — `id`, `tenantId`, `email`, `status`, `aiqRole`, etc. It does **not** include roles; roles are fetched separately via `getUserRoleKeys(userId, tenantId)` inside each procedure.

**`auth.me` endpoint:** Returns `{id, email, firstName, lastName, tenantId, status, roles[], onboardingCompleted, aiqRole, tenantMode}`. Roles are fetched from `user_roles` + `roles` join. `tenantMode` is fetched from the `tenants` table.

---

## 2. Role and Permission Values

### Roles in the `roles` table (live DB)

| role_id | key | label |
|---------|-----|-------|
| role-admin | `admin` | Admin |
| role-aud-001 | `auditor` | Auditor |
| role-hl-001 | `hr_leader` | HR Leader |
| role-lrn-001 | `learner` | Learner |
| role-mgr-001 | `manager` | Manager |
| role-psa-001 | `platform_super_admin` | Platform Super Admin |
| role-super-admin | `super_admin` | Super Admin |
| role-ta-001 | `tenant_admin` | Tenant Admin |

### Additional role keys referenced in code but **not in the roles table**

The following keys appear in server-side checks but have no corresponding row in the `roles` table:
- `content_admin` (referenced in `content.ts` and `assessment.ts`)
- `hr_professional` (used as default in `bulkInvite` and `sendInvitation`)

These keys can never be assigned because `getUserRoleKeys` joins on `roles.id`, but they create dead code paths.

### `users.aiqRole` field

Separate from the `user_roles` table. An enum on the `users` row: `"cpo"` | `"reward_leader"`. Used only in `cpoProcedure` (blocks `reward_leader` from CPO-mode routes) and in `auth.me`. It is **not** used for any other RBAC decision.

### Where roles are checked

`getUserRoleKeys(userId, tenantId)` in `server/db.ts` is the canonical role-fetching function. It queries `user_roles JOIN roles` filtered by `(userId, tenantId)`. All meaningful role checks call this function first, then test the returned array.

---

## 3. `tenants.mode` and Tenant/Company Model

**Schema:** `tenants.mode` is a MySQL enum: `"cpo"` | `"reward"`. Default: `"cpo"`.

**How it is read:** `auth.me` fetches `tenants.mode` for the current user's `tenantId` and returns it as `tenantMode`. The gate router (`server/routers/gate.ts`) also reads it. The frontend `GateContext` and `AppShell` use it to control which nav sections and domain children are shown.

**How it is scoped:** Every query in the codebase that reads tenant data uses `ctx.user.tenantId` as the filter. There is no cross-tenant read in any non-back-office route.

**Current tenants in the DB:**

| slug | name | mode | status | plan |
|------|------|------|--------|------|
| dunder | Dunder Mifflin | reward | active | enterprise |
| mifflin | Mifflin | cpo | active | enterprise |

There is no "platform" or "lumi" tenant in the live DB. The `backoffice.ts` router references a `lumi` slug as a guard against deletion, but that tenant does not exist.

---

## 4. Existing Back-Office Code

**File:** `server/routers/backoffice.ts`

A cross-tenant back-office router already exists. It is guarded by `assertSuperAdmin()` at the top of every procedure. The guard checks whether the calling user has the role key `"super_admin"` in their `user_roles` for their own `tenantId`.

**Procedures:**

| Procedure | Action |
|-----------|--------|
| `listOrgs` | List all tenants with user counts |
| `createOrg` | Create a new tenant (name, slug, domain, status, mode) |
| `updateOrg` | Update tenant name, domain, status |
| `deleteOrg` | Archive a tenant (soft delete; blocks `lumi` slug) |
| `listUsers` | List users across all tenants (cross-tenant) |
| `createUser` | Create a user in any tenant with any `roleKey` |
| `updateUser` | Update user name/status/jobFunction |
| `assignRole` | Assign (or replace) any role in any tenant |
| `resetPassword` | Reset any user's password |
| `listRoles` | List all roles |

**Also:** `server/routers/initiativeDiscovery.ts` has a separate `assertSuperAdmin` guard using the same `"super_admin"` key for staff-only initiative procedures.

---

## 5. Backend vs Frontend-Only Enforcement

### Backend-enforced (correct)

| Route / Procedure | Enforcement Point | Notes |
|---|---|---|
| All `backoffice.*` | `assertSuperAdmin()` in `backoffice.ts` — DB role check | Correct |
| `people.listMembers`, `people.getMemberReport` | `resolveAccessibleUserIds()` in `people.ts` — DB role + team check | Correct |
| `users.create`, `users.changeRole`, `users.bulkInvite` | `requireRole()` + `getUserRoleKeys()` in `users.ts` | Correct |
| `users.updateStatus` | `requireRole()` + `getUserRoleKeys()` | Correct |
| `dashboard.*` (team/org views) | Inline `myRoles.some(...)` checks | Correct |
| `cpoProcedure` (strategy routes) | Middleware in `server/_core/trpc.ts` | Correct |
| `tenant.updateSettings` | `requireRole()` | Correct |
| `assessment.contentAdmin` | Inline role check | Correct |

### Frontend-only gating (security defect — not backend-enforced)

| Route / Procedure | Problem |
|---|---|
| `companyProfile.save` | `protectedProcedure` only — **any authenticated user** in the tenant can save the company profile. No role check. |
| `companyProfile.complete` | Same — no role check. |
| `companyProfile.resolveFlag` | Same — no role check. |
| `companyProfile.flagField` | Intentionally open (any user can flag), but `resolveFlag` should be admin-only. |
| `backgroundInputs.getInputs` | Uses `(ctx.user as any).role === "platform_super_admin"` — this checks `users.role` which **does not exist** on the User type. The check always evaluates to `false`. Facilitator notes are therefore never returned. |
| `backgroundInputs.completeSession` | Same broken pattern — `(ctx.user as any).role !== "platform_super_admin"` always throws `FORBIDDEN` because `ctx.user.role` is always `undefined`. This procedure is permanently locked for everyone. |
| `backgroundInputs.saveFacilitatorNote` | Same broken pattern. |
| `backgroundInputs.updateDraftState` | Same broken pattern. |

---

## 6. Privilege-Escalation Audit

**Every path that can assign or edit a user's role:**

| Path | File | Who can call it | Can it grant Super User? |
|------|------|-----------------|--------------------------|
| `backoffice.assignRole` | `backoffice.ts:280` | Any user with `super_admin` role | **Yes** — takes arbitrary `roleKey`, no exclusion list. A `super_admin` can grant `super_admin` to any user in any tenant. |
| `backoffice.createUser` | `backoffice.ts:207` | Any user with `super_admin` role | **Yes** — takes arbitrary `roleKey`. Can create a user with `super_admin`. |
| `users.create` | `users.ts:95` | `platform_super_admin`, `tenant_admin`, `hr_leader` | **Yes** — takes arbitrary `roleKey`, no exclusion list. An `hr_leader` could create a user with `super_admin` or `platform_super_admin` role. |
| `users.changeRole` | `users.ts:180` | `platform_super_admin`, `tenant_admin`, `hr_leader` | **Yes** — takes arbitrary `roleKey`. An `hr_leader` could promote any tenant user to `super_admin`. |
| `users.bulkInvite` | `users.ts:212` | `platform_super_admin`, `tenant_admin`, `hr_leader` | **Yes** — `roleKey` is a free string, defaults to `hr_professional`. |
| `users.sendInvitation` | `users.ts:297` | `platform_super_admin`, `tenant_admin`, `hr_leader` | **Yes** — `roleKey` is stored on the invitation and assigned on acceptance. |
| `users.acceptInvitation` | `users.ts:462` | **Public** (no auth required) | Inherits the `roleKey` from the invitation row — so yes, if a malicious invitation was created. |

**Summary of escalation risk:**

The most critical finding is that **`users.create` and `users.changeRole` accept arbitrary role keys with no exclusion list**. An `hr_leader` (a company-level role) can currently promote any user to `super_admin` or `platform_super_admin` via these procedures. This is a direct privilege-escalation path that bypasses the back-office guard entirely.

**`backoffice.assignRole`** has the same problem at the platform level: a `super_admin` can grant `super_admin` to any user in any tenant, including creating additional super admins. There is no "only one super admin" constraint.

---

## 7. Naming Inconsistency: `super_admin` vs `platform_super_admin`

Two different role keys are used for platform-level access:

- **`super_admin`** — used by `backoffice.ts` and `initiativeDiscovery.ts` as the back-office guard. Has a row in the `roles` table (`role-super-admin`).
- **`platform_super_admin`** — used by most other routers (`users.ts`, `dashboard.ts`, `people.ts`, `audit.ts`, etc.) as the highest tenant-level role. Has a row in the `roles` table (`role-psa-001`).

These are **two separate roles with different scopes**. `super_admin` is the cross-tenant platform role; `platform_super_admin` is the highest within-tenant role. The naming is confusing and the distinction is not documented anywhere in the codebase.

**No user currently has either role** in the live DB. Both `reward@dunder.com` and `cpo@mifflin.com` have `role_keys: null` (no entries in `user_roles`).

---

## 8. My Team — Real Feature or Stub?

**Verdict: Real, backend-enforced feature.**

`server/routers/people.ts` implements `listMembers` and `getMemberReport` with genuine server-side enforcement:
- Leaders (`platform_super_admin`, `tenant_admin`, `hr_leader`) see all users in their tenant.
- Managers see only their direct reports via the `managerTeamMembers` table.
- Any other role receives `FORBIDDEN`.
- All queries are scoped to `ctx.user.tenantId`.

The `managerTeamMembers` table exists in the schema and is populated during manager onboarding. The frontend `PeopleReportsPage` calls `trpc.people.listMembers.useQuery` and renders based on the server-returned `isLeader` flag.

**Conclusion:** The Manager tier is a real feature and permission scaffolding around it is justified.

---

## 9. Summary of Issues to Fix Before Building

| # | Issue | Severity |
|---|-------|----------|
| 1 | `users.create` / `users.changeRole` / `users.bulkInvite` / `users.sendInvitation` accept arbitrary `roleKey` — any `hr_leader` can grant `super_admin` | **Critical** |
| 2 | `backoffice.assignRole` / `backoffice.createUser` accept arbitrary `roleKey` — a `super_admin` can grant `super_admin` to anyone | **High** |
| 3 | `companyProfile.save` / `complete` / `resolveFlag` have no role check — any authenticated user can modify the company profile | **Medium** |
| 4 | `backgroundInputs` facilitator procedures use `(ctx.user as any).role` which is always `undefined` — permanently broken | **Medium** |
| 5 | No user currently has `super_admin` or `platform_super_admin` — the back-office is inaccessible | **Blocker** |
| 6 | Naming inconsistency: `super_admin` (back-office) vs `platform_super_admin` (everything else) | **Medium** |
| 7 | JWT has 1-year expiry with no revocation mechanism | **Low (noted)** |

---

## 10. Migration Mapping (Part 3 Preview)

Current live users and their mapping to the new 5-tier model:

| User | Current State | New Type | Rationale |
|------|--------------|----------|-----------|
| `reward@dunder.com` | `aiqRole=reward_leader`, `tenantMode=reward`, no `user_roles` | **Strategy Builder** | Has the tenant's active strategy domain (Reward). No team management needed. |
| `cpo@mifflin.com` | `aiqRole=cpo`, `tenantMode=cpo`, no `user_roles` | **Strategy Builder** (+ **Company Admin** pending confirmation) | Has the tenant's active strategy domain (Company-wide). May also need Company Admin to manage users. |

Neither user loses access under this mapping. Both currently have no `user_roles` entries, so migration means **adding** the correct role row rather than changing anything.

---

*End of Part 1 Audit. Ready to proceed to Parts 2–6 on confirmation.*
