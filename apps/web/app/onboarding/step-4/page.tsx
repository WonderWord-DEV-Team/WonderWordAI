"use client";

import { useRouter } from "next/navigation";
import { PartyPopper, AlertTriangle } from "lucide-react";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { useOnboarding } from "@/components/onboarding/OnboardingContext";

export default function OnboardingStepFour() {
  const router = useRouter();
  const { data, submissionResult, reset } = useOnboarding();

  const succeeded = submissionResult?.filter((c) => c.success) ?? [];
  const failed = submissionResult?.filter((c) => !c.success) ?? [];
  const childNames = succeeded.map((c) => c.nickname).join(", ");

  const handleStartReading = () => {
    reset();
    router.push("/child");
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
            : "Your reading adventure is ready to begin."}
        </p>

        {failed.length > 0 ? (
          <div className="mt-4 w-full max-w-sm rounded-xl border border-amber-300 bg-amber-50 p-4 text-left">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-semibold">
                {failed.length === 1
                  ? "One child profile couldn't be created"
                  : `${failed.length} child profiles couldn't be created`}
              </p>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-amber-800">
              {failed.map((child, i) => (
                <li key={i}>
                  {child.nickname}: {child.error}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-amber-700">
              You can add them again from the Parent Dashboard.
            </p>
          </div>
        ) : null}

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