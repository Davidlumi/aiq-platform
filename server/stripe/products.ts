/**
 * server/stripe/products.ts
 * Single source of truth for AiQ Stripe product and price configuration.
 *
 * Pricing (confirmed by David, Phase 1 Skills Checker Launch):
 *   Individual paid tier:
 *     - Monthly:  £50 / month
 *     - Annual:   £480 / year (£40/month effective, 20% discount)
 *
 * Team bands (coming post-launch):
 *   2–5 seats:   £40/seat/month (20% off individual)
 *   6–10 seats:  £35/seat/month (30% off)
 *   11–25 seats: £30/seat/month (40% off)
 *   26+ seats:   contact sales
 *
 * These IDs are populated from environment variables so they work across
 * Stripe test mode and live mode without code changes.
 * Set them in Settings → Payment or via webdev_request_secrets.
 */

export const STRIPE_PRODUCTS = {
  /** Individual paid tier — monthly billing */
  individualMonthly: {
    priceId: process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY ?? "",
    label: "AiQ Individual — Monthly",
    amount: 5000, // £50.00 in pence
    currency: "gbp",
    interval: "month" as const,
  },
  /** Individual paid tier — annual billing (20% discount) */
  individualAnnual: {
    priceId: process.env.STRIPE_PRICE_INDIVIDUAL_ANNUAL ?? "",
    label: "AiQ Individual — Annual",
    amount: 48000, // £480.00 in pence
    currency: "gbp",
    interval: "year" as const,
  },
} as const;

export type StripePriceKey = keyof typeof STRIPE_PRODUCTS;

/** Resolve a price ID from the key — throws if not configured */
export function getPriceId(key: StripePriceKey): string {
  const priceId = STRIPE_PRODUCTS[key].priceId;
  if (!priceId) {
    throw new Error(
      `Stripe price ID for "${key}" is not configured. ` +
      `Set STRIPE_PRICE_${key.toUpperCase().replace(/([A-Z])/g, "_$1")} in Settings → Payment.`
    );
  }
  return priceId;
}
