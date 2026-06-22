/**
 * server/stripe/products.ts
 * Single source of truth for AiQ Stripe product and price configuration.
 *
 * Pricing (AiQ Bible §7):
 *   Individual:
 *     Monthly:  £50/month
 *     Annual:   £480/year (£40/month effective, 20% off)
 *
 *   Team (minimum 3 seats, volume repricing — whole team moves when crossing band):
 *     3–9 seats:   £42/seat/month
 *     10–24 seats: £38/seat/month
 *     25+ seats:   £34/seat/month
 *
 * Price IDs are populated from environment variables so they work across
 * Stripe test mode and live mode without code changes.
 * Set them in Settings → Payment.
 */

export const STRIPE_PRODUCTS = {
  /** Individual paid tier — monthly billing */
  individualMonthly: {
    priceId: process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY ?? "",
    label: "AiQ Individual — Monthly",
    amount: 5000, // £50.00 in pence
    currency: "gbp",
    interval: "month" as const,
    type: "individual" as const,
  },
  /** Individual paid tier — annual billing (20% discount) */
  individualAnnual: {
    priceId: process.env.STRIPE_PRICE_INDIVIDUAL_ANNUAL ?? "",
    label: "AiQ Individual — Annual",
    amount: 48000, // £480.00 in pence
    currency: "gbp",
    interval: "year" as const,
    type: "individual" as const,
  },
  /** Team tier — 3–9 seats — £42/seat/month */
  team3to9: {
    priceId: process.env.STRIPE_PRICE_TEAM_3_9 ?? "",
    label: "AiQ Team — 3–9 seats",
    perSeatAmount: 4200, // £42.00 per seat per month in pence
    currency: "gbp",
    interval: "month" as const,
    type: "team" as const,
    minSeats: 3,
    maxSeats: 9,
    bandKey: "team_3_9",
  },
  /** Team tier — 10–24 seats — £38/seat/month */
  team10to24: {
    priceId: process.env.STRIPE_PRICE_TEAM_10_24 ?? "",
    label: "AiQ Team — 10–24 seats",
    perSeatAmount: 3800, // £38.00 per seat per month in pence
    currency: "gbp",
    interval: "month" as const,
    type: "team" as const,
    minSeats: 10,
    maxSeats: 24,
    bandKey: "team_10_24",
  },
  /** Team tier — 25+ seats — £34/seat/month */
  team25plus: {
    priceId: process.env.STRIPE_PRICE_TEAM_25_PLUS ?? "",
    label: "AiQ Team — 25+ seats",
    perSeatAmount: 3400, // £34.00 per seat per month in pence
    currency: "gbp",
    interval: "month" as const,
    type: "team" as const,
    minSeats: 25,
    maxSeats: Infinity,
    bandKey: "team_25_plus",
  },
} as const;

export type StripePriceKey = keyof typeof STRIPE_PRODUCTS;

/** Resolve a price ID from the key — throws if not configured */
export function getPriceId(key: StripePriceKey): string {
  const priceId = STRIPE_PRODUCTS[key].priceId;
  if (!priceId) {
    throw new Error(
      `Stripe price ID for "${key}" is not configured. ` +
      `Set the corresponding env var in Settings → Payment.`
    );
  }
  return priceId;
}

/**
 * Determine the correct team price band for a given seat count.
 * When a team crosses a band boundary, the WHOLE team reprices.
 */
export function getTeamPriceBand(seatCount: number): "team3to9" | "team10to24" | "team25plus" {
  if (seatCount >= 25) return "team25plus";
  if (seatCount >= 10) return "team10to24";
  return "team3to9";
}

/** Calculate the total monthly amount for a team in pence (GBP) */
export function getTeamMonthlyTotal(seatCount: number): number {
  const bandKey = getTeamPriceBand(seatCount);
  return STRIPE_PRODUCTS[bandKey].perSeatAmount * seatCount;
}

/** Get per-seat monthly amount in pence for a given seat count */
export function getPerSeatAmount(seatCount: number): number {
  const bandKey = getTeamPriceBand(seatCount);
  return STRIPE_PRODUCTS[bandKey].perSeatAmount;
}
