"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Baby,
  BookOpenCheck,
  Users,
  BookOpen,
  Plus,
  X,
} from "lucide-react";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import MascotBubble from "@/components/onboarding/MascotBubble";
import { useOnboarding } from "@/components/onboarding/OnboardingContext";

const READING_LEVELS = [
  { id: "starting", label: "Just starting", icon: Baby },
  { id: "simple", label: "Simple words", icon: BookOpen },
  { id: "help", label: "With help", icon: Users },
  { id: "independent", label: "Independent", icon: BookOpenCheck },
];

function targetChildCount(childCount: string) {
  if (childCount === "4+") return 4;
  const parsed = parseInt(childCount, 10);
  return Number.isNaN(parsed) ? 1 : parsed;
}

export default function OnboardingStepTwo() {
  const router = useRouter();
  const { data, updateChild, addChild, removeChild } = useOnboarding();

  // Seed the right number of blank child cards based on what was picked in step 1.
  useEffect(() => {
    const target = targetChildCount(data.childCount);
    if (data.children.length < target) {
      for (let i = data.children.length; i < target; i++) addChild();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canContinue = data.children.every(
    (child) => child.nickname.trim() !== "" && child.age !== ""
  );

  const handleContinue = () => {
    if (!canContinue) return;
    router.push("/onboarding/step-3");
  };

  return (
    <OnboardingShell step={2}>
      <h1 className="font-serif text-4xl font-bold text-[#a3352b] md:text-3xl">
        Tell Us About Your Young Reader 📖
      </h1>

      <div className="mt-6">
        <MascotBubble
          quote="Getting to know you..."
          caption="This helps me pick the perfect stories for your little explorers!"
        />
      </div>

      <div className="space-y-5">
        {data.children.map((child, index) => (
          <div
            key={index}
            className="relative rounded-2xl border border-[#f0e6d8] p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#2b2b2b]">
                Reader Profile
              </h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#fdf3d8] px-3 py-1 text-xs font-semibold text-[#8a6d1d]">
                  Child {index + 1}
                </span>
                {data.children.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeChild(index)}
                    className="text-[#a8a8a8] hover:text-[#a3352b]"
                    aria-label={`Remove Child ${index + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={`nickname-${index}`}
                  className="mb-1.5 block text-sm font-medium text-[#2b2b2b]"
                >
                  Nickname
                </label>
                <input
                  id={`nickname-${index}`}
                  type="text"
                  placeholder="e.g. Leo"
                  value={child.nickname}
                  onChange={(e) =>
                    updateChild(index, { nickname: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#ece6da] bg-[#faf7f2] px-4 py-3 text-sm text-[#2b2b2b] placeholder:text-[#a8a8a8] focus:border-[#a3352b] focus:outline-none focus:ring-2 focus:ring-[#a3352b]/20"
                />
              </div>
              <div>
                <label
                  htmlFor={`age-${index}`}
                  className="mb-1.5 block text-sm font-medium text-[#2b2b2b]"
                >
                  Age
                </label>
                <select
                  id={`age-${index}`}
                  value={child.age}
                  onChange={(e) => updateChild(index, { age: e.target.value })}
                  className="w-full rounded-xl border border-[#ece6da] bg-[#faf7f2] px-4 py-3 text-sm text-[#2b2b2b] focus:border-[#a3352b] focus:outline-none focus:ring-2 focus:ring-[#a3352b]/20"
                >
                  <option value="" disabled>
                    Select age
                  </option>
                  {Array.from({ length: 9 }, (_, i) => i + 4).map((age) => (
                    <option key={age} value={age}>
                      {age} years old
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-[#2b2b2b]">
                Reading Level
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {READING_LEVELS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => updateChild(index, { readingLevel: id })}
                    className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center text-xs font-semibold transition ${
                      child.readingLevel === id
                        ? "border-[#a3352b] bg-[#fbeceb] text-[#a3352b]"
                        : "border-[#ece6da] text-[#5a5a5a] hover:border-[#e0c9c6]"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addChild}
        className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#a3352b] hover:text-[#8c2c23]"
      >
        <Plus className="h-4 w-4" />
        Add another child
      </button>

      <div className="mt-8 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/onboarding/step-1")}
          className="rounded-full border border-[#ece6da] px-6 py-3 text-sm font-semibold text-[#5a5a5a] transition hover:bg-[#faf7f2]"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className="rounded-full bg-[#a3352b] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#8c2c23] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue →
        </button>
      </div>
    </OnboardingShell>
  );
}