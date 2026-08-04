"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings } from "lucide-react";
import PlanCard from "@/components/billing/PlanCard";
import { PLANS, type PlanId, type BillingInterval } from "@/lib/stripe/plans";

type BillingPageClientProps = {
  currentPlan: PlanId;
  currentInterval: BillingInterval;
};

export default function BillingPageClient({
  currentPlan,
  currentInterval,
}: BillingPageClientProps) {
  const router = useRouter();
  const [interval, setInterval] = useState<BillingInterval>(currentInterval);
  const [loadingPortal, setLoadingPortal] = useState(false);

  const handleSelectPlan = (plan: PlanId) => {
    if (plan === "free") {
      // Downgrading to free = cancel the paid subscription — send them to
      // the Customer Portal, which already has a "Cancel plan" flow built in.
      handleManageBilling();
      return;
    }
    router.push(`/billing/subscribe?plan=${plan}&interval=${interval}`);
  };

  const handleManageBilling = async () => {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error(data.error);
        setLoadingPortal(false);
      }
    } catch (err) {
      console.error(err);
      setLoadingPortal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFAF5]">
      <main className="mx-auto max-w-5xl px-6 py-12">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-[#5a5a5a] hover:text-[#2b2b2b]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </button>

        <h1 className="mt-4 font-serif text-4xl font-bold text-[#2b2b2b]">
          Billing
        </h1>
        <p className="mt-2 text-[#6b6b6b]">
          Manage your plan, payment method, and billing history
        </p>

        {/* Monthly / Annual toggle */}
        <div className="mt-10 flex items-center justify-center gap-4">
          <span
            className={`text-sm font-semibold ${
              interval === "monthly" ? "text-[#2b2b2b]" : "text-[#a8a8a8]"
            }`}
          >
            Monthly
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={interval === "annual"}
            onClick={() =>
              setInterval((prev) => (prev === "monthly" ? "annual" : "monthly"))
            }
            className={`relative h-7 w-12 rounded-full transition ${
              interval === "annual" ? "bg-[#a3352b]" : "bg-[#ece6da]"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                interval === "annual" ? "left-6" : "left-1"
              }`}
            />
          </button>
          <span
            className={`text-sm font-semibold ${
              interval === "annual" ? "text-[#2b2b2b]" : "text-[#a8a8a8]"
            }`}
          >
            Annual
          </span>
          <span className="rounded-full bg-[#0f766e] px-2.5 py-1 text-xs font-semibold text-white">
            Save 17%
          </span>
        </div>

        {/* Plan cards */}
        <div className="mt-10 flex flex-col items-center gap-6 sm:flex-row sm:items-stretch sm:justify-center">
          <PlanCard
            plan={PLANS.free}
            interval={interval}
            isCurrentPlan={currentPlan === "free"}
            onSelect={() => handleSelectPlan("free")}
          />
          <PlanCard
            plan={PLANS.plan1}
            interval={interval}
            isCurrentPlan={currentPlan === "plan1" && currentInterval === interval}
            badge="current"
            onSelect={() => handleSelectPlan("plan1")}
          />
          <PlanCard
            plan={PLANS.plan2}
            interval={interval}
            isCurrentPlan={currentPlan === "plan2" && currentInterval === interval}
            badge="popular"
            onSelect={() => handleSelectPlan("plan2")}
          />
        </div>

        {/* Everything below — payment method, invoices, cancellation — is
            handled by the Stripe Customer Portal instead of custom UI. */}
        {currentPlan !== "free" && (
          <div className="mt-14 flex flex-col items-center gap-3 rounded-2xl border border-[#ece6da] bg-[#faf7f2] p-8 text-center">
            <h2 className="text-lg font-bold text-[#2b2b2b]">
              Payment method &amp; billing history
            </h2>
            <p className="max-w-md text-sm text-[#6b6b6b]">
              Update your card, download invoices, or cancel your
              subscription — securely managed by Stripe.
            </p>
            <button
              type="button"
              onClick={handleManageBilling}
              disabled={loadingPortal}
              className="mt-2 flex items-center gap-2 rounded-full bg-[#a3352b] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#8c2c23] disabled:opacity-60"
            >
              <Settings className="h-4 w-4" />
              {loadingPortal ? "Opening..." : "Manage Billing"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
