import Stripe from "stripe";

/**
 * Server-only Stripe client. Never import this file from a "use client"
 * component — the secret key must never reach the browser bundle.
 */
let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  }

  stripeClient ??= new Stripe(secretKey, {
    apiVersion: "2026-06-24.dahlia",
    typescript: true,
  });

  return stripeClient;
}
