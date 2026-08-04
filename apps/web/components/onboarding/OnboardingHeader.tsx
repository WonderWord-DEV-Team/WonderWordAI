type OnboardingHeaderProps = {
  status?: string;
};

/**
 * Slim top bar shown across the onboarding flow (and anywhere else that
 * needs to surface "you still have onboarding to finish").
 * Visual only — swap `status` for real state once wired up.
 */
export default function OnboardingHeader({
  status = "Finalizing",
}: OnboardingHeaderProps) {
  return (
    <header className="border-b border-[#ecdfc9] bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="WonderWord AI" className="h-8 w-auto" />
        <p className="text-sm text-[#8a8a8a]">
          Onboarding Status:{" "}
          <span className="font-semibold text-[#2b2b2b]">{status}</span>
        </p>
      </div>
    </header>
  );
}