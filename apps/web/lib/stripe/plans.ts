export type PlanId = "free" | "plan1" | "plan2";
export type BillingInterval = "monthly" | "annual";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  /** Display price in USD cents for the given interval. Free plan has no Stripe price. */
  monthlyPriceCents: number;
  annualPriceCents: number;
  /** Env var name holding the Stripe Price ID — resolved at runtime, never hardcoded here. */
  monthlyPriceEnvVar?: string;
  annualPriceEnvVar?: string;
  features: { label: string; included: boolean }[];
};

// NOTE: copy below is placeholder — swap in the real feature list once
// Marcus/product finalizes the Free tier limits.
export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    features: [
      { label: "5 scans / month", included: true },
      { label: "Basic correction stories", included: true },
      { label: "Monthly reports", included: true },
      { label: "Activity recommendations", included: false },
      { label: "SMS notifications", included: false },
      { label: "30-day data retention", included: false },
      { label: "1 child", included: false },
    ],
  },
  plan1: {
    id: "plan1",
    name: "Plan 1",
    monthlyPriceCents: 999,
    annualPriceCents: 9900,
    monthlyPriceEnvVar: "STRIPE_PRICE_PLAN1_MONTHLY",
    annualPriceEnvVar: "STRIPE_PRICE_PLAN1_ANNUAL",
    features: [
      { label: "Unlimited scans", included: true },
      { label: "Claude Sonnet correction stories", included: true },
      { label: "Biweekly reports", included: true },
      { label: "Activity recommendations", included: true },
      { label: "SMS notifications", included: true },
      { label: "1-year data retention", included: true },
      { label: "Multi-child dashboard", included: false },
    ],
  },
  plan2: {
    id: "plan2",
    name: "Plan 2",
    monthlyPriceCents: 1799,
    annualPriceCents: 17900,
    monthlyPriceEnvVar: "STRIPE_PRICE_PLAN2_MONTHLY",
    annualPriceEnvVar: "STRIPE_PRICE_PLAN2_ANNUAL",
    features: [
      { label: "Plan 1 features", included: true },
      { label: "Unlimited children", included: true },
      { label: "Multi-child dashboard", included: true },
      { label: "Side-by-side WCPM, accuracy, engagement", included: true },
      { label: "Separate reports per child", included: true },
    ],
  },
};

export function getPriceId(plan: PlanId, interval: BillingInterval): string {
  const def = PLANS[plan];
  const envVar =
    interval === "monthly" ? def.monthlyPriceEnvVar : def.annualPriceEnvVar;
  if (!envVar) {
    throw new Error(`Plan "${plan}" has no Stripe price for "${interval}"`);
  }
  const priceId = process.env[envVar];
  if (!priceId) {
    throw new Error(
      `Missing env var ${envVar} — create the Price in Stripe and set it in .env.local`
    );
  }
  return priceId;
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
