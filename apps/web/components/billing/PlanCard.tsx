import { Check, X } from "lucide-react";
import { formatCents, type BillingInterval, type PlanDefinition } from "@/lib/stripe/plans";

type PlanCardProps = {
  plan: PlanDefinition;
  interval: BillingInterval;
  isCurrentPlan: boolean;
  badge?: "current" | "popular";
  onSelect: () => void;
};

export default function PlanCard({
  plan,
  interval,
  isCurrentPlan,
  badge,
  onSelect,
}: PlanCardProps) {
  const priceCents =
    interval === "monthly" ? plan.monthlyPriceCents : plan.annualPriceCents;
  const monthlyEquivalent =
    interval === "annual" && priceCents > 0
      ? formatCents(priceCents / 12)
      : null;

  const borderColor =
    badge === "current"
      ? "border-[#a3352b]"
      : badge === "popular"
        ? "border-[#7ee0d6]"
        : "border-[#ece6da]";

  return (
    <div
      className={`relative flex w-full max-w-xs flex-col rounded-2xl border-2 bg-[#faf7f2] p-6 ${borderColor}`}
    >
      {badge === "current" && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#a3352b] px-3 py-1 text-xs font-semibold text-white">
          Current Plan
        </span>
      )}
      {badge === "popular" && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0f766e] px-3 py-1 text-xs font-semibold text-white">
          Most Popular
        </span>
      )}

      <div className="mt-2">
        <span className="font-serif text-4xl font-bold text-[#2b2b2b]">
          {interval === "annual" && monthlyEquivalent
            ? monthlyEquivalent
            : formatCents(priceCents)}
        </span>
        <span className="text-sm text-[#8a8a8a]">/month</span>
      </div>

      {interval === "annual" && priceCents > 0 && (
        <p className="mt-1 text-sm font-medium text-[#0f766e]">
          {formatCents(priceCents)} billed annually
        </p>
      )}

      <hr className="my-4 border-[#ece6da]" />

      <ul className="flex-1 space-y-2.5">
        {plan.features.map((feature) => (
          <li
            key={feature.label}
            className="flex items-start gap-2 text-sm text-[#4a4a4a]"
          >
            {feature.included ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]" />
            ) : (
              <X className="mt-0.5 h-4 w-4 shrink-0 text-[#c4b8a8]" />
            )}
            <span className={feature.included ? "" : "text-[#a8a8a8]"}>
              {feature.label}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onSelect}
        disabled={isCurrentPlan}
        className={`mt-6 w-full rounded-full py-3 text-sm font-semibold transition ${
          isCurrentPlan
            ? "cursor-default bg-[#ece6da] text-[#8a8a8a]"
            : "bg-[#a3352b] text-white hover:bg-[#8c2c23]"
        }`}
      >
        {isCurrentPlan
          ? "Current Plan"
          : plan.id === "free"
            ? "Downgrade"
            : "Choose Plan"}
      </button>
    </div>
  );
}
