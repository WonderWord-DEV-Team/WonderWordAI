import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null>;

/**
 * Loads Stripe.js once and reuses the same promise across the app.
 * Safe to import from client components.
 */
export function getStripe() {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      throw new Error(
        "Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable"
      );
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}
