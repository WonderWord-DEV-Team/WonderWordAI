import { createClient } from "@/lib/supabase/server";
import BillingPageClient from "@/components/billing/BillingPageClient";
import type { PlanId, BillingInterval } from "@/lib/stripe/plans";

export default async function BillingPage() {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let currentPlan: PlanId = "free";
  let currentInterval: BillingInterval = "monthly";

  if (authUser) {
    const { data: dbUser } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", authUser.id)
      .single();

    if (dbUser) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, billing_interval, status")
        .eq("user_id", dbUser.id)
        .maybeSingle();

      if (sub && sub.status !== "canceled") {
        currentPlan = sub.plan as PlanId;
        currentInterval = (sub.billing_interval as BillingInterval) ?? "monthly";
      }
    }
  }

  return (
    <BillingPageClient
      currentPlan={currentPlan}
      currentInterval={currentInterval}
    />
  );
}
