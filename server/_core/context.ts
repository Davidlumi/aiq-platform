import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "../../shared/const";
import { verifySessionToken } from "../auth";
import { getUserById, getTenantById } from "../db";
import { parse as parseCookies } from "cookie";

// Tenant entitlements — loaded once per request from the tenants table
export type TenantEntitlements = {
  strategyCompany: boolean;
  strategyReward: boolean;
  assessment: boolean;
  // Paid assessment tier — flipped by Stripe webhook only, never by redirect
  assessmentPaid: boolean;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  entitlements: TenantEntitlements | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let entitlements: TenantEntitlements | null = null;
  try {
    const rawCookies = opts.req.headers.cookie ?? "";
    const cookies = parseCookies(rawCookies);
    const sessionToken = cookies[COOKIE_NAME];
    if (sessionToken) {
      const payload = await verifySessionToken(sessionToken);
      if (payload) {
        user = (await getUserById(payload.userId)) ?? null;
        if (user?.tenantId) {
          const tenant = await getTenantById(user.tenantId);
          if (tenant) {
            entitlements = {
              strategyCompany: tenant.entitlementStrategyCompany,
              strategyReward: tenant.entitlementStrategyReward,
              assessment: tenant.entitlementAssessment,
              assessmentPaid: tenant.entitlementAssessmentPaid,
            };
          }
        }
      }
    }
  } catch {
    user = null;
    entitlements = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user,
    entitlements,
  };
}
