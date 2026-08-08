"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { useOnboarding } from "@/components/onboarding/OnboardingContext";
import { checkParentEmailAvailable } from "@/app/onboarding/actions";

const CHILD_COUNT_OPTIONS = ["1", "2", "3", "4+"];

export default function OnboardingStepOne() {
  const router = useRouter();
  const { data, updateParentInfo, setChildCount } = useOnboarding();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const canContinue =
    data.parentName.trim() !== "" &&
    data.parentEmail.trim() !== "" &&
    data.password.trim() !== "";

  const handleContinue = async () => {
    if (!canContinue || isChecking) return;

    setIsChecking(true);
    setEmailError(null);

    const { available } = await checkParentEmailAvailable(data.parentEmail);

    if (!available) {
      setEmailError("An account with this email already exists. Try logging in instead.");
      setIsChecking(false);
      return;
    }

    setIsChecking(false);
    router.push("/onboarding/step-2");
  };

  return (
    <OnboardingShell step={1}>
      <div className="text-center">
        <h1 className="font-serif text-4xl font-bold text-[#a3352b] md:text-3xl">
          Let&apos;s set up your child&apos;s reading adventure!
        </h1>
      </div>

      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          handleContinue();
        }}
      >
        <div>
          <label htmlFor="parentName" className="mb-1.5 block text-sm font-medium text-[#2b2b2b]">
            Parent&apos;s Full Name
          </label>
          <input
            id="parentName"
            type="text"
            placeholder="e.g. Nazi"
            value={data.parentName}
            onChange={(e) => updateParentInfo({ parentName: e.target.value })}
            className="w-full rounded-xl border border-[#ece6da] bg-[#faf7f2] px-4 py-3 text-sm text-[#2b2b2b] placeholder:text-[#a8a8a8] focus:border-[#a3352b] focus:outline-none focus:ring-2 focus:ring-[#a3352b]/20"
          />
        </div>

        <div>
          <label htmlFor="parentEmail" className="mb-1.5 block text-sm font-medium text-[#2b2b2b]">
            Parent&apos;s Email
          </label>
          <input
            id="parentEmail"
            type="email"
            placeholder="nazi@example.com"
            value={data.parentEmail}
            onChange={(e) => {
              updateParentInfo({ parentEmail: e.target.value });
              if (emailError) setEmailError(null);
            }}
            className="w-full rounded-xl border border-[#ece6da] bg-[#faf7f2] px-4 py-3 text-sm text-[#2b2b2b] placeholder:text-[#a8a8a8] focus:border-[#a3352b] focus:outline-none focus:ring-2 focus:ring-[#a3352b]/20"
          />
          {emailError ? (
            <p className="mt-1.5 text-sm font-medium text-[#a3352b]">{emailError}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#2b2b2b]">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={data.password}
              onChange={(e) => updateParentInfo({ password: e.target.value })}
              className="w-full rounded-xl border border-[#ece6da] bg-[#faf7f2] px-4 py-3 pr-11 text-sm text-[#2b2b2b] placeholder:text-[#a8a8a8] focus:border-[#a3352b] focus:outline-none focus:ring-2 focus:ring-[#a3352b]/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a8a8a8] hover:text-[#5a5a5a]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-[#2b2b2b]">
            How many children will use WonderWord AI?
          </p>
          <div className="grid grid-cols-4 gap-3">
            {CHILD_COUNT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setChildCount(option)}
                className={`rounded-xl border py-3 text-center text-sm font-semibold transition ${
                  data.childCount === option
                    ? "border-[#a3352b] bg-[#fbeceb] text-[#a3352b]"
                    : "border-[#ece6da] text-[#5a5a5a] hover:border-[#e0c9c6]"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!canContinue || isChecking}
          className="mt-2 w-full rounded-full bg-[#a3352b] py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#8c2c23] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isChecking ? "Checking..." : "Continue →"}
        </button>

        <p className="text-center text-sm text-[#8a8a8a]">
          Already have an account?{" "}
          <a href="/auth/login" className="font-medium text-[#a3352b] hover:underline">
            Log in
          </a>
        </p>
      </form>
    </OnboardingShell>
  );
}