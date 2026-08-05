import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/server";
import { createServiceClient } from "@/lib/supabase/service";

// Route handlers don't parse the body by default — request.text() below
// gives us the raw payload, which is required for signature verification.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let service;
  try {
    service = createServiceClient();
  } catch (err) {
    console.error("Webhook: failed to create Supabase service client:", err);
    return NextResponse.json(
      { error: "Server misconfiguration — check SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const plan = subscription.metadata?.plan ?? undefined;
        const interval = subscription.metadata?.interval ?? undefined;
        const currentPeriodEnd = subscription.items.data[0]?.current_period_end;

        const { error: updateError } = await service
          .from("subscriptions")
          .update({
            status:
              event.type === "customer.subscription.deleted"
                ? "canceled"
                : subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_end: currentPeriodEnd
              ? new Date(currentPeriodEnd * 1000).toISOString()
              : null,
            ...(plan ? { plan } : {}),
            ...(interval ? { billing_interval: interval } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (updateError) {
          console.error(
            `Webhook: failed to update subscription row for ${subscription.id}:`,
            updateError
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.parent?.subscription_details?.subscription === "string"
            ? invoice.parent.subscription_details.subscription
            : invoice.parent?.subscription_details?.subscription?.id;

        if (subscriptionId) {
          await service
            .from("subscriptions")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", subscriptionId);
        }
        // TODO: notify the parent (email/SMS) that their payment failed.
        break;
      }

      default:
        // Unhandled event types are fine to ignore — Stripe sends many more
        // than we act on here.
        break;
    }
  } catch (err) {
    console.error(`Webhook: failed processing ${event.type}:`, err);
    return NextResponse.json(
      { error: `Failed to process ${event.type}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}