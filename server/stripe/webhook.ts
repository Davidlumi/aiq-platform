/**
 * server/stripe/webhook.ts
 * Stripe webhook handler — signature-verified, idempotent.
 *
 * Handled events:
 *   checkout.session.completed   → provision paid entitlement
 *   customer.subscription.updated → sync status, detect cancel/reactivate
 *   customer.subscription.deleted → revoke entitlement (with grace period)
 *   invoice.payment_failed        → send failed-payment email, start grace countdown
 *   invoice.payment_succeeded     → clear grace period, ensure entitlement is active
 *
 * Grace policy (confirmed by David):
 *   Stripe smart retry: 3 retries over ~7 days
 *   Grace window after last retry: 3 days
 *   Total exposure: ~10 days
 *   paidAccessGraceUntil is set on first failure and cleared on payment success.
 */
import type { Request, Response } from "express";
import Stripe from "stripe";
import { getDb } from "../db";
import { tenants, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { STRIPE_PRODUCTS, type StripePriceKey } from "./products";

const GRACE_DAYS = 3;

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2026-05-27.dahlia" });
}

/** Resolve a Stripe price ID back to our internal key */
function priceIdToKey(priceId: string): StripePriceKey | null {
  for (const [key, config] of Object.entries(STRIPE_PRODUCTS)) {
    if (config.priceId === priceId) return key as StripePriceKey;
  }
  return null;
}

/** Provision paid entitlement for a tenant */
async function provisionPaidAccess(tenantId: string, opts: {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripeSubscriptionStatus: string;
  stripePriceKey: string | null;
  stripeCurrentPeriodEnd: Date | null;
  stripeCancelAtPeriodEnd: boolean;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(tenants).set({
    entitlementAssessmentPaid: true,
    stripeCustomerId: opts.stripeCustomerId,
    stripeSubscriptionId: opts.stripeSubscriptionId,
    stripeSubscriptionStatus: opts.stripeSubscriptionStatus,
    stripePriceKey: opts.stripePriceKey,
    stripeCurrentPeriodEnd: opts.stripeCurrentPeriodEnd,
    stripeCancelAtPeriodEnd: opts.stripeCancelAtPeriodEnd,
    paidAccessGraceUntil: null, // clear any existing grace period
  }).where(eq(tenants.id, tenantId));
}

/** Revoke paid entitlement with grace period */
async function revokeWithGrace(tenantId: string, graceUntil: Date) {
  const db = await getDb();
  if (!db) return;
  await db.update(tenants).set({
    entitlementAssessmentPaid: false,
    paidAccessGraceUntil: graceUntil,
    stripeSubscriptionStatus: "canceled",
  }).where(eq(tenants.id, tenantId));
}

/** Hard revoke — no grace */
async function hardRevoke(tenantId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(tenants).set({
    entitlementAssessmentPaid: false,
    paidAccessGraceUntil: null,
    stripeSubscriptionStatus: "canceled",
    stripeSubscriptionId: null,
  }).where(eq(tenants.id, tenantId));
}

/** Find tenant by Stripe customer ID */
async function getTenantByCustomerId(customerId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(tenants)
    .where(eq(tenants.stripeCustomerId, customerId))
    .limit(1);
  return rows[0] ?? null;
}

/** Get the primary user email for a tenant (for notification emails) */
async function getPrimaryUserEmail(tenantId: string): Promise<{ email: string; firstName: string } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ email: users.email, firstName: users.firstName })
    .from(users)
    .where(eq(users.tenantId, tenantId))
    .limit(1);
  return rows[0] ?? null;
}

export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const stripe = getStripe();
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[Webhook] STRIPE_WEBHOOK_SECRET not configured");
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Webhook] Signature verification failed:", msg);
    res.status(400).json({ error: `Webhook signature verification failed: ${msg}` });
    return;
  }

  // ── Test event passthrough ────────────────────────────────────────────────
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    res.json({ verified: true });
    return;
  }

  console.log(`[Webhook] Processing event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {

      // ── checkout.session.completed ────────────────────────────────────────
      // Fired when a user completes checkout. This is the primary provisioning trigger.
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenant_id;
        if (!tenantId) { console.warn("[Webhook] checkout.session.completed: no tenant_id in metadata"); break; }

        const subscriptionId = session.subscription as string | null;
        if (!subscriptionId) { console.warn("[Webhook] checkout.session.completed: no subscription ID"); break; }

        // Fetch full subscription to get price and period
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const item = subscription.items.data[0];
        const priceId = item?.price?.id ?? null;
        const priceKey = priceId ? priceIdToKey(priceId) : null;
        const periodEnd = item?.current_period_end
          ? new Date(item.current_period_end * 1000)
          : null;

        await provisionPaidAccess(tenantId, {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscriptionId,
          stripeSubscriptionStatus: subscription.status,
          stripePriceKey: priceKey,
          stripeCurrentPeriodEnd: periodEnd,
          stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
        });

        console.log(`[Webhook] Provisioned paid access for tenant ${tenantId}`);
        await notifyOwner({
          title: "New AiQ subscription",
          content: `Tenant ${tenantId} subscribed (${priceKey ?? "unknown plan"}).`,
        }).catch(() => {});
        break;
      }

      // ── customer.subscription.updated ────────────────────────────────────
      // Fired on plan changes, cancellation scheduling, renewals, etc.
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const tenant = await getTenantByCustomerId(sub.customer as string);
        if (!tenant) { console.warn("[Webhook] subscription.updated: tenant not found for customer", sub.customer); break; }

        const item = sub.items.data[0];
        const priceId = item?.price?.id ?? null;
        const priceKey = priceId ? priceIdToKey(priceId) : null;
        const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000) : null;

        const isActive = ["active", "trialing"].includes(sub.status);

        if (isActive) {
          await provisionPaidAccess(tenant.id, {
            stripeCustomerId: sub.customer as string,
            stripeSubscriptionId: sub.id,
            stripeSubscriptionStatus: sub.status,
            stripePriceKey: priceKey,
            stripeCurrentPeriodEnd: periodEnd,
            stripeCancelAtPeriodEnd: sub.cancel_at_period_end,
          });
        } else {
          // Status is past_due, unpaid, paused — do NOT revoke yet; let invoice.payment_failed handle grace
          const db = await getDb();
          if (db) {
            await db.update(tenants).set({
              stripeSubscriptionStatus: sub.status,
              stripePriceKey: priceKey,
              stripeCurrentPeriodEnd: periodEnd,
              stripeCancelAtPeriodEnd: sub.cancel_at_period_end,
            }).where(eq(tenants.id, tenant.id));
          }
        }
        break;
      }

      // ── customer.subscription.deleted ────────────────────────────────────
      // Fired when a subscription is fully cancelled (not just scheduled).
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const tenant = await getTenantByCustomerId(sub.customer as string);
        if (!tenant) break;

        // Apply 3-day grace window
        const graceUntil = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000);
        await revokeWithGrace(tenant.id, graceUntil);

        // Notify owner
        await notifyOwner({
          title: "AiQ subscription cancelled",
          content: `Tenant ${tenant.id} subscription deleted. Grace until ${graceUntil.toISOString()}.`,
        }).catch(() => {});

        // TODO: send pre-access-drop email to user (requires email helper)
        console.log(`[Webhook] Subscription deleted for tenant ${tenant.id}. Grace until ${graceUntil.toISOString()}`);
        break;
      }

      // ── invoice.payment_failed ────────────────────────────────────────────
      // Fired on each failed renewal attempt. Start grace countdown on first failure.
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const tenant = await getTenantByCustomerId(invoice.customer as string);
        if (!tenant) break;

        // Only set grace if not already in grace
        const now = new Date();
        const alreadyInGrace = tenant.paidAccessGraceUntil != null && tenant.paidAccessGraceUntil > now;
        if (!alreadyInGrace) {
          // Grace starts from today + 3 days (Stripe will retry for ~7 days before deleting)
          const graceUntil = new Date(now.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);
          const db = await getDb();
          if (db) {
            await db.update(tenants).set({
              paidAccessGraceUntil: graceUntil,
              stripeSubscriptionStatus: "past_due",
            }).where(eq(tenants.id, tenant.id));
          }
          console.log(`[Webhook] Payment failed for tenant ${tenant.id}. Grace until ${graceUntil.toISOString()}`);
        }

        // TODO: send failed-payment email to user
        await notifyOwner({
          title: "AiQ payment failed",
          content: `Invoice payment failed for tenant ${tenant.id}. Invoice: ${invoice.id}.`,
        }).catch(() => {});
        break;
      }

      // ── invoice.payment_succeeded ─────────────────────────────────────────
      // Fired on successful renewal. Clear grace period and ensure entitlement is active.
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason === "subscription_create") break; // handled by checkout.session.completed
        const tenant = await getTenantByCustomerId(invoice.customer as string);
        if (!tenant) break;

        const db = await getDb();
        if (db) {
          await db.update(tenants).set({
            entitlementAssessmentPaid: true,
            paidAccessGraceUntil: null,
            stripeSubscriptionStatus: "active",
          }).where(eq(tenants.id, tenant.id));
        }
        console.log(`[Webhook] Payment succeeded for tenant ${tenant.id}. Entitlement confirmed.`);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Webhook] Error processing event ${event.type}:`, msg);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}
