"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getStripe } from "@/lib/stripe/client";
import { PLANS, formatCents, type PlanId, type BillingInterval } from "@/lib/stripe/plans";
import SubscribeForm from "@/components/billing/SubscribeForm";

function SubscribePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const plan = (searchParams.get("plan") as PlanId) ?? "plan1";
  const interval = (searchParams.get("interval") as BillingInterval) ?? "monthly";
  const planDef = PLANS[plan];

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/stripe/create-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, interval }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
        } else {
          setClientSecret(data.clientSecret);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [plan, interval]);

  const price =
    interval === "monthly" ? planDef.monthlyPriceCents : planDef.annualPriceCents;

  return (
    <div className="min-h-screen bg-[#FDFAF5]">
      <main className="mx-auto max-w-xl px-6 py-12">
        <button
          type="button"
          onClick={() => router.push("/billing")}
          className="flex items-center gap-1.5 text-sm text-[#5a5a5a] hover:text-[#2b2b2b]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Billing
        </button>

        <h1 className="mt-4 font-serif text-4xl font-bold text-[#a3352b] md:text-5xl">
          Payment
        </h1>
        <p className="mt-2 text-[#6b6b6b]">
          Your card details are encrypted and handled directly by Stripe —
          they never touch our servers.
        </p>

        <div className="mt-8 flex items-center justify-between rounded-2xl border border-[#ece6da] bg-[#faf7f2] p-5">
          <div>
            <p className="font-semibold text-[#2b2b2b]">
              {planDef.name} — {interval === "monthly" ? "Monthly" : "Annual"}
            </p>
            <p className="text-sm text-[#8a8a8a]">
              {interval === "annual"
                ? `${formatCents(price)} billed annually`
                : `${formatCents(price)} / month`}
            </p>
          </div>
          <ShieldCheck className="h-6 w-6 text-[#0f766e]" />
        </div>

        <div className="mt-6 rounded-2xl border border-[#a3352b]/30 bg-white p-6">
          {error && (
            <p className="mb-4 rounded-lg bg-[#fbeceb] p-3 text-sm text-[#a3352b]">
              {error}
            </p>
          )}

          {!clientSecret && !error && (
            <p className="text-sm text-[#8a8a8a]">Setting up payment…</p>
          )}

          {clientSecret && (
            <Elements
              stripe={getStripe()}
              options={{
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "#a3352b",
                    colorBackground: "#faf7f2",
                    colorText: "#2b2b2b",
                    borderRadius: "12px",
                    fontFamily: "inherit",
                  },
                },
              }}
            >
              <SubscribeForm planName={planDef.name} />
            </Elements>
          )}
        </div>
      </main>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={null}>
      <SubscribePageInner />
    </Suspense>
  );
}
