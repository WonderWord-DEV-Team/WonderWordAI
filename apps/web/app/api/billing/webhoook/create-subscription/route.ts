import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { getPriceId, type PlanId, type BillingInterval } from "@/lib/stripe/plans";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
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
  const { data: existingSub } = await service
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", dbUser.id)
    .maybeSingle();

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
  let priceId: string;
  try {
    priceId = getPriceId(plan, interval);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid plan" },
      { status: 400 }
    );
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: "default_incomplete",
    payment_settings: {
      save_default_payment_method: "on_subscription",
      payment_method_types: ["card"],
    },
    expand: ["latest_invoice.payment_intent"],
    metadata: { supabase_user_id: dbUser.id, plan, interval },
  });

  // 4. Upsert our local record. Status stays "incomplete" until the webhook
  // confirms payment succeeded (see app/api/stripe/webhook/route.ts).
  await service.from("subscriptions").upsert(
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

  const invoice = subscription.latest_invoice;
  const paymentIntent =
    typeof invoice !== "string" ? invoice?.payment_intent : null;

  if (!paymentIntent || typeof paymentIntent === "string") {
    return NextResponse.json(
      { error: "Could not create a payment intent for this subscription." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    subscriptionId: subscription.id,
  });
}
