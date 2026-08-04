"use client";

import { useRouter } from "next/navigation";
import { PartyPopper } from "lucide-react";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { useOnboarding } from "@/components/onboarding/OnboardingContext";

export default function OnboardingStepFour() {
  const router = useRouter();
  const { data, reset } = useOnboarding();

  const childNames = data.children
    .map((c) => c.nickname)
    .filter(Boolean)
    .join(", ");

  const handleStartReading = () => {
    reset();
    router.push("/");
  };

  return (
    <OnboardingShell step={4} eyebrow="Step">
      <div className="flex flex-col items-center py-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#fbeceb] text-[#a3352b]">
          <PartyPopper className="h-8 w-8" />
        </div>

        <h1 className="mt-6 font-serif text-4xl font-bold text-[#a3352b] md:text-3xl">
          You&apos;re All Set{data.parentName ? `, ${data.parentName}` : ""}!
        </h1>
        <p className="mt-3 max-w-sm text-[#6b6b6b]">
          {childNames
            ? `${childNames}'s reading adventure is ready to begin. We've picked a few stories to match their interests and reading level.`
            : "Your child's reading adventure is ready to begin. We've picked a few stories to match their interests and reading level."}
        </p>

        <button
          type="button"
          onClick={handleStartReading}
          className="mt-8 w-full max-w-xs rounded-full bg-[#a3352b] py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#8c2c23]"
        >
          Start Reading →
        </button>
        <a
          href="/parent/dashboard"
          className="mt-4 text-sm font-medium text-[#5a5a5a] hover:text-[#2b2b2b]"
        >
          Go to Parent Dashboard
        </a>
      </div>
    </OnboardingShell>
  );
}