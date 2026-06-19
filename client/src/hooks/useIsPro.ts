/**
 * useIsPro — returns true when the current user has an active PRO subscription.
 *
 * PRO is determined by entitlementAssessmentPaid on the user object.
 * Free tier: entitlementAssessment = true, entitlementAssessmentPaid = false
 * PRO tier:  entitlementAssessment = true, entitlementAssessmentPaid = true
 *
 * Users with strategyCompany or strategyReward entitlements (enterprise tenants)
 * are also treated as PRO — they have a paid enterprise plan.
 */
import { useAuth } from "@/_core/hooks/useAuth";

export function useIsPro(): boolean {
  const { user } = useAuth();
  if (!user) return false;
  const e = (user as any)?.entitlements as {
    assessmentPaid?: boolean;
    strategyCompany?: boolean;
    strategyReward?: boolean;
  } | undefined;
  // Enterprise tenants with strategy entitlements are always PRO
  if (e?.strategyCompany || e?.strategyReward) return true;
  // Individual paid tier
  return e?.assessmentPaid === true;
}
