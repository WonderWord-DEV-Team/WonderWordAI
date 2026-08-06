import { PawPrint } from "lucide-react";
import OnboardingHeader from "./OnboardingHeader";

type OnboardingShellProps = {
  step: number;
  totalSteps?: number;
  eyebrow?: string;
  children: React.ReactNode;
  /** Set to false to render a wider card for content-heavy steps (e.g. step 3). */
  narrow?: boolean;
};

/**
 * Wraps every onboarding screen: status header, soft gradient background,
 * centered white card, and the shared progress bar.
 */
export default function OnboardingShell({
  step,
  totalSteps = 4,
  eyebrow = "Step",
  children,
  narrow = true,
}: OnboardingShellProps) {
  const percent = Math.round((step / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdf3d8] via-[#fdeee0] to-[#fbd9d2]">
      <OnboardingHeader status={step === totalSteps ? "Complete" : "In progress"} />

      <main className="flex justify-center px-4 py-14">
        <div
          className={`relative w-full ${
            narrow ? "max-w-xl" : "max-w-2xl"
          } rounded-3xl bg-white p-8 shadow-[0_20px_60px_-15px_rgba(163,53,43,0.25)] sm:p-10`}
        >
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-[#a3352b]">
                {eyebrow} {step} of {totalSteps}
              </span>
              <span className="text-[#8a8a8a]">{percent}% complete</span>
            </div>
            <div className="relative mt-2 h-2 w-full rounded-full bg-[#f2d9d5]">
              <div
                className="h-2 rounded-full bg-[#a3352b] transition-all"
                style={{ width: `${percent}%` }}
              />
              <PawPrint
                className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 text-[#2b2b2b]"
                style={{ left: `${percent}%` }}
              />
            </div>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}