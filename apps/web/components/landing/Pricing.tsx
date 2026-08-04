"use client";

import { useState } from "react";

type BillingCycle = "monthly" | "yearly";

const plans = [
  {
    name: "FREE",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: ["1 child", "5 sessions/week", "Basic stats"],
    cta: "Start Free",
    cardStyle: "bg-white border border-gray-200",
    textStyle: "text-gray-900",
    ctaStyle: "border border-[#E8604F] text-[#E8604F] hover:bg-[#E8604F]/5",
    checkColor: "text-[#0F9C8E]",
  },
  {
    name: "PLAN 1",
    monthlyPrice: 9.99,
    yearlyPrice: 8.29, // ~17% off monthly, matches "SAVE 17%" badge
    badge: "MOST POPULAR",
    features: [
      "Unlimited scans",
      "Claude Sonnet correction stories",
      "Biweekly reports",
      "Activity recommendations",
      "SMS notifications",
      "1-year data retention",
    ],
    cta: "Start Free Trial",
    cardStyle: "bg-[#E8604F]",
    textStyle: "text-white",
    ctaStyle: "bg-white text-[#E8604F] hover:bg-gray-100",
    checkColor: "text-white",
  },
  {
    name: "PLAN 2",
    monthlyPrice: 17.99,
    yearlyPrice: 14.93,
    features: [
      "Plan 1 features",
      "Unlimited children",
      "Multi-child dashboard",
      "Side-by-side WCPM, accuracy, engagement",
      "Separate reports per child",
    ],
    cta: "Get Started",
    cardStyle: "bg-[#F5A623]",
    textStyle: "text-[#1A1A2E]",
    ctaStyle: "bg-[#E8604F] text-white hover:bg-[#d9543f]",
    checkColor: "text-[#1A1A2E]",
  },
];

export function Pricing() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <section id="pricing" className="px-6 sm:px-12 py-20">
      <h2 className="text-center text-[32px] font-black text-[#1A1A2E]">Simple, Honest Pricing</h2>
      <p className="mt-2 text-center text-[15px] text-gray-500">Start free. Upgrade when you&apos;re ready.</p>

      <div className="mt-6 flex justify-center">
        <div className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-full p-1">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            aria-pressed={cycle === "monthly"}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition ${
              cycle === "monthly" ? "bg-[#1A1A2E] text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle("yearly")}
            aria-pressed={cycle === "yearly"}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition ${
              cycle === "yearly" ? "bg-[#1A1A2E] text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Annual
          </button>
          <span className="ml-1 mr-1 bg-[#0F9C8E] text-white text-[10px] font-black px-2 py-1 rounded-full">
            SAVE 17%
          </span>
        </div>
      </div>

      <div className="mt-10 grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
        {plans.map((plan) => {
          const price = cycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
          return (
            <div key={plan.name} className={`relative rounded-3xl p-7 ${plan.cardStyle} ${plan.textStyle}`}>
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1A1A2E] text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full whitespace-nowrap">
                  {plan.badge}
                </span>
              )}
              <p className="font-black text-base">{plan.name}</p>
              <p className="mt-2 text-4xl font-black">
                ${price.toFixed(2)}
                <span className="text-sm font-bold">/mo</span>
              </p>
              {cycle === "yearly" && price > 0 && (
                <p className="mt-1 text-xs font-bold opacity-80">Billed annually</p>
              )}
              <ul className="mt-5 space-y-2.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className={plan.checkColor}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button className={`mt-7 w-full rounded-full py-3 font-black text-sm ${plan.ctaStyle}`}>
                {plan.cta}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}