import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/server";
import { getPriceId, type PlanId, type BillingInterval } from "@/lib/stripe/plans";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    const stripe = getStripeClient();
    const { plan, interval } = (await request.json()) as {
      plan: PlanId;
      interval: BillingInterval;
    };

    if (plan === "free") {
      return NextResponse.json(
        { error: "The free plan doesn't need a subscription." },
        { status: 400 }
      );
    }

    // 1. Identify the logged-in parent.
    const supabase = createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("id, email")
      .eq("auth_id", authUser.id)
      .single();

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const service = createServiceClient();

    // 2. Find or create the Stripe customer for this user.
    const { data: existingSub, error: existingSubError } = await service
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", dbUser.id)
      .maybeSingle();

    if (existingSubError) {
      console.error("Failed to read existing subscription:", existingSubError);
      return NextResponse.json(
        { error: `Database error: ${existingSubError.message}` },
        { status: 500 }
      );
    }

    let customerId = existingSub?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: dbUser.email,
        metadata: { supabase_user_id: dbUser.id },
      });
      customerId = customer.id;
    }

    // 3. Create the subscription in "incomplete" state — it only activates once
    // the customer confirms payment client-side with Stripe Elements.
    const priceId = getPriceId(plan, interval);

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_types: ["card"],
      },
      expand: ["latest_invoice.confirmation_secret"],
      metadata: { supabase_user_id: dbUser.id, plan, interval },
    });

    // 4. Upsert our local record. Status stays "incomplete" until the webhook
    // confirms payment succeeded (see app/api/stripe/webhook/route.ts).
    const { error: upsertError } = await service.from("subscriptions").upsert(
      {
        user_id: dbUser.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        plan,
        billing_interval: interval,
        status: subscription.status,
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      console.error("Failed to upsert subscription row:", upsertError);
      return NextResponse.json(
        { error: `Database error: ${upsertError.message}` },
        { status: 500 }
      );
    }

    // NOTE: as of the 2025-03-31 API version, Invoice no longer has a
    // `payment_intent` field — the client secret for confirming the initial
    // payment lives at `confirmation_secret.client_secret` instead.
    const invoice = subscription.latest_invoice;
    const clientSecret =
      typeof invoice !== "string" ? invoice?.confirmation_secret?.client_secret : null;

    if (!clientSecret) {
      return NextResponse.json(
        { error: "Could not create a payment intent for this subscription." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
    });
  } catch (err) {
    // Surface the real error server-side (check your `npm run dev` terminal)
    // and return it as JSON instead of letting Next.js render an HTML error
    // page, which is what was causing "Unexpected end of JSON input" client-side.
    console.error("create-subscription failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to create subscription",
      },
      { status: 500 }
    );
  }
}
