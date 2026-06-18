/**
 * server/stripe/checkout.ts
 * tRPC router for Stripe checkout session creation and subscription management.
 */
import Stripe from "stripe";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tenants } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { STRIPE_PRODUCTS, getPriceId, type StripePriceKey } from "./products";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe is not configured." });
  return new Stripe(key, { apiVersion: "2026-05-27.dahlia" });
}

export const stripeRouter = router({
  /**
   * Create a Stripe Checkout Session for the individual paid tier.
   * Returns a URL that the frontend opens in a new tab.
   */
  createCheckoutSession: protectedProcedure
    .input(z.object({
      priceKey: z.enum(["individualMonthly", "individualAnnual"]),
      origin: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const tenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, ctx.user.tenantId))
        .limit(1);
      const tenantRow = tenant[0];
      if (!tenantRow) throw new TRPCError({ code: "NOT_FOUND" });

      // Reuse existing Stripe customer if available
      let customerId = tenantRow.stripeCustomerId ?? undefined;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: ctx.user.email,
          name: `${ctx.user.firstName} ${ctx.user.lastName}`,
          metadata: {
            tenant_id: ctx.user.tenantId,
            user_id: ctx.user.id,
          },
        });
        customerId = customer.id;
        // Persist immediately so concurrent requests don't create duplicate customers
        await db
          .update(tenants)
          .set({ stripeCustomerId: customerId })
          .where(eq(tenants.id, ctx.user.tenantId));
      }

      let priceId: string;
      try {
        priceId = getPriceId(input.priceKey as StripePriceKey);
      } catch {
        // Price IDs not yet configured — return a helpful error
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Stripe prices are not yet configured. Please contact support.",
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        client_reference_id: ctx.user.id,
        metadata: {
          tenant_id: ctx.user.tenantId,
          user_id: ctx.user.id,
          price_key: input.priceKey,
          customer_email: ctx.user.email,
          customer_name: `${ctx.user.firstName} ${ctx.user.lastName}`,
        },
        success_url: `${input.origin}/billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
        cancel_url: `${input.origin}/billing?status=cancelled`,
      });

      return { url: session.url };
    }),

  /**
   * Create a Stripe Customer Portal session so the user can manage their subscription.
   */
  createPortalSession: protectedProcedure
    .input(z.object({ origin: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const tenant = await db
        .select({ stripeCustomerId: tenants.stripeCustomerId })
        .from(tenants)
        .where(eq(tenants.id, ctx.user.tenantId))
        .limit(1);
      const customerId = tenant[0]?.stripeCustomerId;
      if (!customerId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No billing account found. Please subscribe first.",
        });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${input.origin}/billing`,
      });

      return { url: session.url };
    }),

  /**
   * Get the current subscription status for the tenant.
   * Used by the billing page to show the correct state.
   */
  getSubscriptionStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const tenant = await db
      .select({
        stripeSubscriptionId: tenants.stripeSubscriptionId,
        stripeSubscriptionStatus: tenants.stripeSubscriptionStatus,
        stripePriceKey: tenants.stripePriceKey,
        stripeCurrentPeriodEnd: tenants.stripeCurrentPeriodEnd,
        stripeCancelAtPeriodEnd: tenants.stripeCancelAtPeriodEnd,
        entitlementAssessmentPaid: tenants.entitlementAssessmentPaid,
        paidAccessGraceUntil: tenants.paidAccessGraceUntil,
      })
      .from(tenants)
      .where(eq(tenants.id, ctx.user.tenantId))
      .limit(1);

    const t = tenant[0];
    if (!t) throw new TRPCError({ code: "NOT_FOUND" });

    // Determine the display plan
    const priceKey = t.stripePriceKey as StripePriceKey | null;
    const planLabel = priceKey ? STRIPE_PRODUCTS[priceKey]?.label ?? null : null;

    return {
      isActive: t.entitlementAssessmentPaid,
      subscriptionId: t.stripeSubscriptionId,
      status: t.stripeSubscriptionStatus,
      planLabel,
      priceKey,
      currentPeriodEnd: t.stripeCurrentPeriodEnd,
      cancelAtPeriodEnd: t.stripeCancelAtPeriodEnd,
      inGracePeriod: !t.entitlementAssessmentPaid && t.paidAccessGraceUntil != null && t.paidAccessGraceUntil > new Date(),
    };
  }),
});
