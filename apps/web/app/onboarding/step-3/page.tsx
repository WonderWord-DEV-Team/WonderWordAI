"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, EyeOff, UserCheck, Lock } from "lucide-react";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import MascotBubble from "@/components/onboarding/MascotBubble";
import { useOnboarding } from "@/components/onboarding/OnboardingContext";
import { completeOnboarding } from "@/app/onboarding/actions";

const GUARDRAILS = [
  {
    icon: ShieldCheck,
    title: "Content moderation",
    body: "Every AI-generated story passes through age-appropriate content checks before your child ever sees it.",
  },
  {
    icon: EyeOff,
    title: "Privacy by design",
    body: "No personal identifiers — names, photos, locations — are ever shared with the language models that write the stories.",
  },
  {
    icon: UserCheck,
    title: "Parent oversight",
    body: "You can review, edit, or remove any story from the Parent Dashboard at any time.",
  },
  {
    icon: Lock,
    title: "COPPA compliant",
    body: "Accounts for children under 13 are created and verified by a parent or legal guardian, never by the child.",
  },
];

export default function OnboardingStepThree() {
  const router = useRouter();
  const { data, setSubmissionResult } = useOnboarding();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setIsSubmitting(true);
    setError(null);

    const result = await completeOnboarding(data);

    if (!result.success) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setSubmissionResult(result.children);
    router.push("/onboarding/step-4");
  };

  return (
    <OnboardingShell step={3} narrow={false}>
      <h1 className="font-serif text-4xl font-bold text-[#a3352b] md:text-3xl">
        How WonderWord AI Keeps Reading Safe
      </h1>

      <div className="mt-6">
        <MascotBubble
          quote="Safety first, always."
          caption="Here's what happens behind the scenes before a story ever reaches your child."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {GUARDRAILS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-[#e8c84a] bg-[#fdf3d8] p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8a6d1d]/15 text-[#8a6d1d]">
              <Icon className="h-4 w-4" />
            </div>
            <h3 className="mt-3 font-bold text-[#2b2b2b]">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[#6b5d33]">{body}</p>
          </div>
        ))}
      </div>

      {error ? (
        <p className="mt-6 rounded-xl border border-[#f2b8b8] bg-[#fbeceb] px-4 py-3 text-sm font-medium text-[#a3352b]">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/onboarding/step-2")}
          disabled={isSubmitting}
          className="rounded-full border border-[#ece6da] px-6 py-3 text-sm font-semibold text-[#5a5a5a] transition hover:bg-[#faf7f2] disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={isSubmitting}
          className="rounded-full bg-[#a3352b] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#8c2c23] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creating your account..." : "Continue →"}
        </button>
      </div>
    </OnboardingShell>
  );
}